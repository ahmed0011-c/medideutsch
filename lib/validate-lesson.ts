import fs from "fs";
import path from "path";
import { lessonSchema, type Lesson } from "@/lib/lesson-schema";
import { practiceIssues } from "@/lib/practice";
import { tilesMatchAnswer } from "@/lib/scoring";
import { unresolvedTokens } from "@/lib/tokens";
import { illustrationMarkup } from "@/components/illustrations/sprites";

export type LessonIssue = { lessonId: string; message: string };

function pictureIssue(
  image: { type: "svg"; id: string } | { type: "url"; src: string } | undefined,
  where: string,
): string | null {
  if (!image) return null;
  if (image.type === "url") return `${where} uses a picture URL. Draw it as an inline SVG.`;
  if (!illustrationMarkup(image.id)) return `${where} references a missing picture “${image.id}”`;
  return null;
}

function germanExerciseTexts(lesson: Lesson): string[] {
  if (lesson.exerciseLanguage !== "de") return [];
  const texts: string[] = [];
  const push = (...values: Array<string | undefined>) => {
    for (const value of values) if (value) texts.push(value);
  };
  for (const step of lesson.steps) {
    push(step.title);
    if (step.type === "grammar") {
      push(step.quizTitle, step.heroTitle);
      for (const question of step.quiz) push(question.q, ...question.options);
      for (const meaning of step.meanings ?? []) push(meaning.de);
      for (const item of step.warning?.items ?? []) push(item.de);
    }
    if (step.type === "cases") {
      for (const question of step.quiz) push(question.q, ...question.options);
    }
    if (step.type === "gapfill") {
      for (const chip of step.chips) push(chip.w);
      for (const item of step.items) push(item.before, item.after, item.answer);
    }
    if (step.type === "builder") {
      for (const item of step.items) push(item.task, ...item.tiles, ...item.answers);
    }
    if (step.type === "picturematch") {
      for (const item of step.items) push(item.article, item.de);
    }
    if (step.type === "quickreact") {
      push(step.cue);
      for (const item of step.items) push(item.prompt, item.speaker, item.speakerLine, ...item.options);
    }
    if (step.type === "riddle") {
      for (const item of step.items) push(...item.clues, ...item.options, item.reveal);
    }
    if (step.type === "writing") {
      push(step.prompt, step.model, ...step.bullets);
      for (const item of step.checklist) push(item.label);
    }
    if (step.type === "reading") {
      for (const question of step.questions) push(question.q, ...question.options);
    }
    if (step.type === "summary") {
      for (const line of step.redemittel) push(line.de);
    }
  }
  return texts;
}

function textsToCheck(lesson: Lesson): string[] {
  const texts: string[] = [];
  for (const step of lesson.steps) {
    if (step.type === "overview") {
      texts.push(step.text.title, step.text.de);
    }
    if (step.type === "dialogue") {
      for (const line of step.lines) texts.push(line.de);
    }
    if (step.type === "reading") {
      texts.push(step.document.title, step.document.signature, ...step.document.paragraphs);
    }
  }
  return texts;
}

export function validateLessonData(raw: unknown, lessonId = "?"): LessonIssue[] {
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.slice(0, 12).map((issue) => ({
      lessonId,
      message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    }));
  }
  return validateLesson(parsed.data);
}

export function validateLesson(lesson: Lesson): LessonIssue[] {
  const issues: LessonIssue[] = [];
  const id = lesson.id;
  const fail = (message: string) => issues.push({ lessonId: id, message });

  if (lesson.scenarios?.length) {
    const bankFile = path.join(process.cwd(), "content/scenario-bank.json");
    const bank = JSON.parse(fs.readFileSync(bankFile, "utf8")) as { situations: { id: string }[] };
    const known = new Set(bank.situations.map((item) => item.id));
    for (const scenarioId of lesson.scenarios) {
      if (!known.has(scenarioId)) fail(`Unknown scenario “${scenarioId}”`);
    }
    if (new Set(lesson.scenarios).size < 4) {
      fail("A chapter should draw on at least four scenario-bank situations");
    }
  }

  for (const [key, entry] of Object.entries(lesson.glossary)) {
    const picture = pictureIssue(entry.image, `Glossary “${key}”`);
    if (picture) fail(picture);
  }

  for (const text of [...textsToCheck(lesson), ...germanExerciseTexts(lesson)]) {
    for (const missing of unresolvedTokens(text, lesson.glossary)) {
      fail(`No glossary entry for “${missing}” in: ${text.slice(0, 80)}`);
    }
  }

  for (const step of lesson.steps) {
    if (step.type === "overview") {
      for (const card of step.vocab) {
        if (card.glossaryKey && !(card.glossaryKey in lesson.glossary)) {
          fail(`Overview vocab glossaryKey “${card.glossaryKey}” is missing`);
        }
        const picture = pictureIssue(card.image, `Overview card “${card.de}”`);
        if (picture) fail(picture);
      }
    }
    if (step.type === "dialogue") {
      for (const line of step.lines) {
        if (!step.speakers[line.who]) fail(`Dialogue line speaker “${line.who}” is not defined`);
      }
    }
    if (step.type === "gapfill") {
      const words = new Set(step.chips.map((chip) => chip.w));
      step.items.forEach((item, i) => {
        if (!words.has(item.answer)) fail(`Gap ${i + 1} answer “${item.answer}” is not in chips`);
      });
    }
    if (step.type === "gapcase") {
      const words = new Set(step.chips);
      step.items.forEach((item, i) => {
        if (!words.has(item.answer)) fail(`Article gap ${i + 1} answer “${item.answer}” is not in chips`);
      });
    }
    if (step.type === "builder") {
      step.items.forEach((item, i) => {
        item.answers.forEach((answer) => {
          if (!tilesMatchAnswer(item.tiles, answer)) {
            fail(`Builder item ${i + 1} answer “${answer}” does not use exactly the tiles`);
          }
        });
      });
    }
    if (step.type === "grammar" || step.type === "cases") {
      step.quiz.forEach((q, i) => {
        if (q.answer >= q.options.length) fail(`Quiz ${i + 1} answer index is out of range`);
      });
    }
    if (step.type === "reading") {
      step.questions.forEach((q, i) => {
        if (q.answer >= q.options.length) fail(`Reading question ${i + 1} answer index is out of range`);
      });
    }
    if (step.type === "grammar" && step.heroImage && !illustrationMarkup(step.heroImage)) {
      fail(`Grammar hero references a missing picture “${step.heroImage}”`);
    }
    if (step.type === "picturematch") {
      step.items.forEach((item) => {
        const picture = pictureIssue(item.image, `Picture “${item.de}”`);
        if (picture) fail(picture);
      });
    }
    if (step.type === "compare") {
      step.items.forEach((item, i) => {
        if (item.answer >= item.options.length) fail(`Compare item ${i + 1} answer is out of range`);
        item.options.forEach((option) => {
          const picture = pictureIssue(option.image, `Compare option “${option.label}”`);
          if (picture) fail(picture);
        });
      });
    }
    if (step.type === "quickreact") {
      step.items.forEach((item, i) => {
        if (item.answer >= item.options.length) fail(`Quick react ${i + 1} answer is out of range`);
      });
    }
    if (step.type === "riddle") {
      step.items.forEach((item, i) => {
        if (item.answer >= item.options.length) fail(`Riddle item ${i + 1} answer is out of range`);
      });
    }
    if (step.type === "cases" && !lesson.cases) {
      fail("Cases step requires a lesson-level cases map");
    }
    if (step.type === "colour" && !lesson.cases) {
      fail("Colour step requires a lesson-level cases map");
    }
  }

  if (!lesson.steps.some((step) => step.type === "overview")) {
    fail("Every lesson needs an overview step");
  }
  for (const message of practiceIssues(lesson)) fail(message);
  return issues;
}
