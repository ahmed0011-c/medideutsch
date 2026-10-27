import { ART } from "@/components/comic/art";
import type { ComicLesson } from "@/lib/comic-schema";
import { comicLessonSchema } from "@/lib/comic-schema";
import { unresolvedComicTokens } from "@/lib/comic-text";

export type ComicIssue = { lessonId: string; message: string };

export const COMIC_SCENES = new Set([
  "station",
  "room",
  "monitor",
  "ekg",
  "meds",
  "phone",
  "scale",
  "lab",
  "cath",
  "desk",
  "corridor",
  "aufnahme",
  "leg",
  "sono",
]);

export const COMIC_PROPS = new Set([
  "coffee",
  "clipboard",
  "phone",
  "chest",
  "stetho",
  "cables",
  "tourniquet",
  "jacket",
  "probe",
]);

export const COMIC_QUIZ_PICS = new Set(
  Object.entries(ART.quizPic as Record<string, string>)
    .filter(([, markup]) => typeof markup === "string" && markup.includes("<svg"))
    .map(([id]) => id),
);

function strictTexts(lesson: ComicLesson): Array<{ where: string; text: string }> {
  const texts: Array<{ where: string; text: string }> = [];
  for (const panel of lesson.panels) {
    if (panel.caption) texts.push({ where: `${panel.id} caption`, text: panel.caption });
    panel.bubbles.forEach((bubble, index) => {
      texts.push({ where: `${panel.id} bubble ${index + 1}`, text: bubble.de });
    });
  }
  for (const item of lesson.vocab) {
    texts.push({ where: `vocab ${item.key}`, text: item.example });
  }
  for (const group of lesson.redemittel) {
    group.items.forEach((item, index) => {
      texts.push({ where: `redemittel ch ${group.ch} #${index + 1}`, text: item.de });
    });
  }
  return texts;
}

function missingOverrides(text: string, glossary: ComicLesson["glossary"]): string[] {
  const misses: string[] = [];
  for (const match of text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) {
    if (!Object.prototype.hasOwnProperty.call(glossary, match[2])) misses.push(match[1]);
  }
  return misses;
}

export function validateComic(lesson: ComicLesson): ComicIssue[] {
  const issues: ComicIssue[] = [];
  const id = lesson.id;
  const fail = (message: string) => issues.push({ lessonId: id, message });
  const chapterNums = new Set(lesson.chapters.map((chapter) => chapter.n));
  const panelIds = new Set<string>();

  for (const panel of lesson.panels) {
    if (panelIds.has(panel.id)) fail(`Duplicate panel id ${panel.id}`);
    panelIds.add(panel.id);
    if (!chapterNums.has(panel.ch)) fail(`${panel.id} points at missing chapter ${panel.ch}`);
    if (!COMIC_SCENES.has(panel.scene)) {
      fail(`${panel.id} uses unknown scene "${panel.scene}". Add it to the SVG scenes and COMIC_SCENES.`);
    }
    for (const figure of panel.chars) {
      if (!lesson.characters[figure.c]) fail(`${panel.id} draws unknown character "${figure.c}"`);
      if (figure.prop && !COMIC_PROPS.has(figure.prop)) {
        fail(`${panel.id} uses unknown prop "${figure.prop}". Add the prop in components/comic/art.ts.`);
      }
    }
    for (const bubble of panel.bubbles) {
      if (!lesson.characters[bubble.who]) fail(`${panel.id} bubble speaker "${bubble.who}" is not in characters`);
    }
  }

  for (const item of lesson.vocab) {
    if (!lesson.glossary[item.key]) fail(`Vocab key "${item.key}" has no glossary entry`);
    if (!chapterNums.has(item.ch)) fail(`Vocab "${item.key}" points at missing chapter ${item.ch}`);
    if (!panelIds.has(item.panel)) fail(`Vocab "${item.key}" points at missing panel ${item.panel}`);
  }

  for (const group of lesson.redemittel) {
    if (!chapterNums.has(group.ch)) fail(`Redemittel "${group.group}" points at missing chapter ${group.ch}`);
    for (const item of group.items) {
      if (item.panel && !panelIds.has(item.panel)) {
        fail(`Redemittel phrase points at missing panel ${item.panel}`);
      }
    }
  }

  lesson.quiz.forEach((item, index) => {
    if (!chapterNums.has(item.ch)) fail(`Quiz ${index + 1} points at missing chapter ${item.ch}`);
    if (!panelIds.has(item.panel)) fail(`Quiz ${index + 1} points at missing panel ${item.panel}`);
    if (item.answer >= item.options.length) fail(`Quiz ${index + 1} answer index is out of range`);
    if (item.type === "pic" && (!item.pic || !COMIC_QUIZ_PICS.has(item.pic))) {
      fail(`Quiz ${index + 1} references a missing picture "${item.pic ?? ""}"`);
    }
    if (item.type === "reply" && !item.ctx?.length) fail(`Quiz ${index + 1} reply is missing context lines`);
    if (item.type === "reply") {
      for (const line of item.ctx ?? []) {
        if (!lesson.characters[line.who]) fail(`Quiz ${index + 1} context speaker "${line.who}" is unknown`);
      }
    }
  });

  const covered = new Set<number>();
  for (const item of lesson.quiz) covered.add(item.ch);
  for (const chapter of lesson.chapters) {
    if (!covered.has(chapter.n)) fail(`Chapter ${chapter.n} has no quiz item`);
  }

  for (const { where, text } of strictTexts(lesson)) {
    for (const surface of unresolvedComicTokens(text, lesson.glossary)) {
      fail(`${where}: "${surface}" has no glossary entry`);
    }
  }
  for (const chapter of lesson.chapters) {
    for (const surface of missingOverrides(chapter.summary, lesson.glossary)) {
      fail(`chapter ${chapter.n} summary: [[${surface}]] has no glossary key`);
    }
  }

  return issues;
}

export function validateComicData(raw: unknown, lessonId = "?"): ComicIssue[] {
  const parsed = comicLessonSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.slice(0, 12).map((issue) => ({
      lessonId,
      message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    }));
  }
  return validateComic(parsed.data);
}
