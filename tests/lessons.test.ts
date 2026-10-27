import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CHAPTERS, LEVEL_PATH } from "@/content/curriculum";
import { illustrationMarkup } from "@/components/illustrations/sprites";
import { comicFiles, readComicFile } from "@/lib/comics";
import { lessonFiles, readLessonFile } from "@/lib/lessons";
import { unresolvedComicTokens } from "@/lib/comic-text";
import { COMIC_PROPS, COMIC_SCENES, validateComic } from "@/lib/validate-comic";
import { MASTERY_RATIO, masteryRatio, practiceIssues } from "@/lib/practice";
import { validateLesson } from "@/lib/validate-lesson";
import {
  builderAccepts,
  diagnoseBuilder,
  pointsForAttempt,
  scoreSections,
  starsFor,
  tilesMatchAnswer,
} from "@/lib/scoring";
import { lookupKey, tokenize, unresolvedTokens } from "@/lib/tokens";

const stars = { "3": 0.9, "2": 0.7, "1": 0.4 };
const scoring = { firstTry: 2, afterRetry: 1, wordExplorePoints: 10, hintCost: 1, tipPoints: 1, stars };

describe("tokens", () => {
  const glossary = { Morgen: { de: "Morgen" }, morgen: { de: "morgen" }, ich: { de: "ich" } };

  it("matches exact, then lowercase", () => {
    expect(lookupKey("ich", glossary)).toBe("ich");
    expect(lookupKey("Ich", glossary)).toBe("ich");
    expect(lookupKey("Morgen", glossary)).toBe("Morgen");
  });

  it("honours an explicit override", () => {
    const tokens = tokenize("[[Morgen|morgen]] ist da.", glossary);
    const word = tokens.find((token) => token.type === "word" && token.surface === "Morgen");
    expect(word).toMatchObject({ key: "morgen" });
  });

  it("reports a word with no entry", () => {
    expect(unresolvedTokens("Hallo ich", glossary)).toEqual(["Hallo"]);
  });
});

describe("scoring", () => {
  it("charges a hint and a retry once each", () => {
    expect(pointsForAttempt(scoring, { wrongBefore: false, hintUsed: false })).toBe(2);
    expect(pointsForAttempt(scoring, { wrongBefore: false, hintUsed: true })).toBe(1);
    expect(pointsForAttempt(scoring, { wrongBefore: true, hintUsed: false })).toBe(1);
    expect(pointsForAttempt(scoring, { wrongBefore: true, hintUsed: true })).toBe(0);
  });

  it("maps ratios to stars", () => {
    expect(starsFor(0.9, stars)).toBe(3);
    expect(starsFor(0.7, stars)).toBe(2);
    expect(starsFor(0.4, stars)).toBe(1);
    expect(starsFor(0.2, stars)).toBe(0);
  });

  it("checks builder tiles and word order", () => {
    const item = {
      tiles: ["Sie", "dürfen", "heute", "nicht", "aufstehen"],
      answers: ["Sie dürfen heute nicht aufstehen"],
      modal: "dürfen",
      inf: "aufstehen",
      question: false,
    };
    expect(tilesMatchAnswer(item.tiles, item.answers[0])).toBe(true);
    expect(builderAccepts(item, ["Sie", "dürfen", "heute", "nicht", "aufstehen"])).toBe(true);
    expect(diagnoseBuilder(item, ["Sie", "dürfen", "heute", "aufstehen", "nicht"])).toMatch(/aufstehen/);
    expect(
      diagnoseBuilder(
        { ...item, question: true, modal: "Darf", inf: "gehen", answers: ["Darf ich gehen"] },
        ["ich", "Darf", "gehen"],
      ),
    ).toMatch(/first/);
  });

  it("scores the modal lesson above the old 50-point set", () => {
    const lesson = readLessonFile(
      path.join(process.cwd(), "content/lessons/a1/a1-modalverben-station.json"),
    );
    const max = scoreSections(lesson.steps, lesson.scoring).reduce((sum, section) => sum + section.max, 0);
    expect(max).toBeGreaterThan(100);
  });

  it("scores the cases lesson from its own steps", () => {
    const lesson = readLessonFile(
      path.join(process.cwd(), "content/lessons/a1/a1a2-faelle-krankenhaus.json"),
    );
    const sections = scoreSections(lesson.steps, lesson.scoring);
    expect(sections.some((section) => section.key.startsWith("c:"))).toBe(true);
    expect(sections.some((section) => section.key.startsWith("t:"))).toBe(true);
    expect(sections.reduce((sum, section) => sum + section.max, 0)).toBeGreaterThan(40);
  });
});

describe("catalog", () => {
  it("lists 80 chapters on the level path", () => {
    expect(CHAPTERS).toHaveLength(80);
    expect(LEVEL_PATH.A1).toHaveLength(29);
    expect(LEVEL_PATH.A2).toHaveLength(18);
    expect(LEVEL_PATH.B1).toHaveLength(33);
    const numbers = new Set(CHAPTERS.map((chapter) => chapter.number));
    expect(numbers.size).toBe(80);
  });

  it("authors the required chapters", () => {
    const byNumber = new Map(CHAPTERS.map((chapter) => [chapter.number, chapter.lessonId]));
    for (const number of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 45, 47, 48]) {
      expect(byNumber.get(number), `chapter ${number}`).toBeTruthy();
    }
    expect(byNumber.get(9)).toBe("a1-09-fragewort");
    expect(byNumber.get(10)).toBe("a1-10-janein");
    expect(byNumber.get(11)).toBe("a1-11-wortstellung");
    expect(byNumber.get(12)).toBe("a1-12-satzklammer");
    expect(byNumber.get(13)).toBe("a1-13-plural");
    expect(byNumber.get(14)).toBe("a1-14-artikel");
    expect(byNumber.get(15)).toBe("a1-15-negation");
    expect(byNumber.get(18)).toBe("a1-18-possessiv");
    expect(byNumber.get(19)).toBe("a1-19-welcher");
    expect(byNumber.get(20)).toBe("a1-20-pronomen");
    expect(byNumber.get(21)).toBe("a2-21-dativ-akkusativ");
    expect(byNumber.get(22)).toBe("a2-22-dativverben");
    expect(byNumber.get(25)).toBe("a2-25-perfekt-sein");
    expect(byNumber.get(26)).toBe("a2-26-partizipien");
    expect(byNumber.get(27)).toBe("a2-27-modal-praeteritum");
    expect(byNumber.get(28)).toBe("a2-28-tempuswahl");
    expect(byNumber.get(29)).toBe("a2-29-reflexiv");
    expect(byNumber.get(23)).toBe("a1-23-praeteritum");
    expect(byNumber.get(24)).toBe("a1-24-perfekt");
    expect(byNumber.get(30)).toBe("a1-30-temporal");
    expect(byNumber.get(31)).toBe("a1-31-dativpraepositionen");
    expect(byNumber.get(32)).toBe("a1-32-akkusativpraep");
    expect(byNumber.get(33)).toBe("a1-33-wechsel-dativ");
    expect(byNumber.get(45)).toBe("a1-45-komposita");
    expect(byNumber.get(47)).toBe("a1-47-zusammengesetzte-verben");
    expect(byNumber.get(48)).toBe("a1-48-genusregeln");
    expect(byNumber.get(34)).toBe("a2-34-wechselpraepositionen");
    expect(byNumber.get(35)).toBe("a2-35-lokal");
    expect(byNumber.get(36)).toBe("a2-36-adjektive");
    expect(byNumber.get(37)).toBe("a2-37-adjektive-dativ");
    expect(byNumber.get(38)).toBe("a2-38-komparativ");
    expect(byNumber.get(39)).toBe("b1-39-superlativ");
    expect(byNumber.get(49)).toBe("b1-49-praeteritum");
    expect(byNumber.get(50)).toBe("b1-50-plusquamperfekt");
    expect(byNumber.get(51)).toBe("b1-51-reflexiv-dativ");
    expect(byNumber.get(52)).toBe("b1-52-trennbar-untrennbar");
    expect(byNumber.get(41)).toBe("a2-41-konnektoren-pos1");
    expect(byNumber.get(42)).toBe("a2-42-weil-dass-wenn");
    expect(byNumber.get(43)).toBe("a2-43-da-dahin-daher");
    expect(byNumber.get(44)).toBe("a2-44-partikeln");
    expect(byNumber.get(46)).toBe("a2-46-wortbildung");
    expect(byNumber.get(5)).toBe(byNumber.get(6));
    expect(byNumber.get(16)).toBe(byNumber.get(17));
  });

  it("marks 80 percent of a Lernkontrolle as mastery from solved items", () => {
    const mc: Record<string, { solved: boolean }> = {};
    for (let index = 0; index < 8; index++) mc[`gq:lk:${index}`] = { solved: true };
    expect(masteryRatio(mc, "lk", 10)).toBe(0.8);
    expect(masteryRatio(mc, "lk", 10) >= MASTERY_RATIO).toBe(true);
    expect(masteryRatio(mc, "lk", 12) >= MASTERY_RATIO).toBe(false);
  });

  it("rejects a picture that is not drawn", () => {
    const file = lessonFiles().find((item) => item.includes("a1-31-dativpraepositionen"));
    expect(file).toBeTruthy();
    if (!file) return;
    const lesson = readLessonFile(file);
    const copy = structuredClone(lesson);
    const step = copy.steps.find((item) => item.type === "picturematch");
    expect(step?.type).toBe("picturematch");
    if (!step || step.type !== "picturematch") return;
    step.items[0].image = { type: "svg", id: "not-a-real-sprite" };
    expect(validateLesson(copy).some((issue) => issue.message.includes("not-a-real-sprite"))).toBe(true);

    const comic = readComicFile(comicFiles()[0]);
    const comicCopy = structuredClone(comic);
    const pic = comicCopy.quiz.find((item) => item.type === "pic");
    expect(pic?.type).toBe("pic");
    if (pic?.type === "pic") pic.pic = "not-a-real-sprite";
    expect(validateComic(comicCopy).some((issue) => issue.message.includes("not-a-real-sprite"))).toBe(true);
  });

  it("draws every shipped illustration", () => {
    const lesson = readLessonFile(lessonFiles().find((item) => item.includes("a1-01-pronomen"))!);
    for (const step of lesson.steps) {
      if (step.type !== "picturematch") continue;
      for (const item of step.items) {
        expect(item.image.type).toBe("svg");
        if (item.image.type === "svg") expect(illustrationMarkup(item.image.id)).toContain("<svg");
      }
    }
  });

  it("validates every lesson file, including the template", () => {
    const files = [
      ...lessonFiles(),
      path.join(process.cwd(), "content/lessons/_template.json"),
    ];
    expect(files.length).toBeGreaterThanOrEqual(10);
    for (const file of files) {
      expect(fs.existsSync(file)).toBe(true);
      const lesson = readLessonFile(file);
      expect(validateLesson(lesson), lesson.id).toEqual([]);
      expect(practiceIssues(lesson), lesson.id).toEqual([]);
    }
  });

  it("validates the handover comic", () => {
    const lesson = comicFiles().map(readComicFile).find((item) => item.id.includes("uebergabe"));
    expect(lesson).toBeTruthy();
    if (!lesson) return;
    expect(lesson.chapters).toHaveLength(8);
    expect(lesson.panels).toHaveLength(36);
    expect(lesson.panels.reduce((sum, panel) => sum + panel.bubbles.length, 0)).toBe(92);
    expect(lesson.vocab).toHaveLength(62);
    expect(lesson.redemittel.reduce((sum, group) => sum + group.items.length, 0)).toBe(33);
    expect(lesson.quiz).toHaveLength(14);
    expect(Object.keys(lesson.glossary).length).toBeGreaterThan(400);
    expect(validateComic(lesson)).toEqual([]);
    expect(unresolvedComicTokens("Dieses Wort fehlt", lesson.glossary)).toEqual(["Dieses", "Wort", "fehlt"]);
  });

  it("validates the admission interview comic", () => {
    const lesson = comicFiles().map(readComicFile).find((item) => item.id.includes("aufnahme"));
    expect(lesson).toBeTruthy();
    if (!lesson) return;
    expect(lesson.level).toBe("B1/B2");
    expect(lesson.chapters).toHaveLength(8);
    expect(lesson.chapters.every((chapter) => (chapter.examTip ?? "").length > 40)).toBe(true);
    expect(lesson.panels).toHaveLength(36);
    const bubbles = lesson.panels.reduce((sum, panel) => sum + panel.bubbles.length, 0);
    expect(bubbles).toBeGreaterThanOrEqual(80);
    expect(bubbles).toBeLessThanOrEqual(90);
    expect(lesson.vocab.length).toBeGreaterThanOrEqual(58);
    expect(lesson.vocab.length).toBeLessThanOrEqual(65);
    const phrases = lesson.redemittel.reduce((sum, group) => sum + group.items.length, 0);
    expect(phrases).toBeGreaterThanOrEqual(30);
    expect(phrases).toBeLessThanOrEqual(36);
    expect(lesson.quiz).toHaveLength(14);
    expect(lesson.cheatsheet?.steps).toHaveLength(6);
    expect(Object.keys(lesson.glossary).length).toBeGreaterThan(400);
    expect(validateComic(lesson)).toEqual([]);
  });

  it("gives every comic chapter at least one panel and a known scene", () => {
    const files = comicFiles();
    expect(files.length).toBeGreaterThanOrEqual(2);
    for (const file of files) {
      const lesson = readComicFile(file);
      expect(validateComic(lesson), lesson.id).toEqual([]);
      for (const chapter of lesson.chapters) {
        const panels = lesson.panels.filter((panel) => panel.ch === chapter.n);
        expect(panels.length, `${lesson.id} chapter ${chapter.n} (${chapter.title})`).toBeGreaterThan(0);
        expect(chapter.id.length, `${lesson.id} chapter ${chapter.n} anchor`).toBeGreaterThan(0);
      }
      for (const panel of lesson.panels) {
        expect(COMIC_SCENES.has(panel.scene), `${lesson.id} ${panel.id} scene ${panel.scene}`).toBe(true);
        for (const figure of panel.chars) {
          if (figure.prop) {
            expect(COMIC_PROPS.has(figure.prop), `${lesson.id} ${panel.id} prop ${figure.prop}`).toBe(true);
          }
        }
      }
    }
  });
});
