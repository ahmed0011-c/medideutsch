import { describe, expect, it } from "vitest";
import { CHAPTERS, LEVEL_PATH } from "@/content/curriculum";
import { illustrationMarkup } from "@/components/illustrations/sprites";
import { getAllLessons } from "@/lib/lessons";
import { tilesMatchAnswer } from "@/lib/scoring";
import type { Lesson, Step } from "@/lib/lesson-schema";

const BAD = [/\bam der\b/i, /\bim das\b/i, /\bins dem\b/i, /\bzum die\b/i, /\bzur den\b/i, /\beuere\b/i];

function lessons(): Lesson[] {
  return getAllLessons().filter((lesson) => lesson.chapter !== 0);
}

function unique(values: string[], where: string) {
  const seen = new Set<string>();
  for (const value of values) {
    expect(seen.has(value), `${where} repeats “${value}”`).toBe(false);
    seen.add(value);
  }
}

function correctMc(options: string[], answer: number, where: string) {
  expect(answer, where).toBeGreaterThanOrEqual(0);
  expect(answer, where).toBeLessThan(options.length);
  unique(options, where);
  return options[answer];
}

function gapSentence(before: string, answer: string, after: string) {
  return `${before} ${answer} ${after}`.replace(/\s+/g, " ").trim();
}

function walkStep(lesson: Lesson, step: Step, hit: string[]) {
  if (step.type === "grammar" || step.type === "cases") {
    step.quiz.forEach((item, index) => {
      hit.push(correctMc(item.options, item.answer, `${lesson.id} ${step.id} quiz ${index + 1}`));
    });
  }
  if (step.type === "reading") {
    step.questions.forEach((item, index) => {
      hit.push(correctMc(item.options, item.answer, `${lesson.id} reading ${index + 1}`));
    });
  }
  if (step.type === "quickreact") {
    step.items.forEach((item, index) => {
      hit.push(correctMc(item.options, item.answer, `${lesson.id} ${step.id} quick ${index + 1}`));
    });
  }
  if (step.type === "compare") {
    unique(step.items.map((item) => item.prompt), `${lesson.id} ${step.id} prompts`);
    step.items.forEach((item, index) => {
      const where = `${lesson.id} ${step.id} match ${index + 1}`;
      expect(item.answer, where).toBeLessThan(item.options.length);
      unique(item.options.map((option) => option.label), where);
      hit.push(item.options[item.answer].label);
    });
  }
  if (step.type === "riddle") {
    step.items.forEach((item, index) => {
      const where = `${lesson.id} ${step.id} riddle ${index + 1}`;
      const correct = correctMc(item.options, item.answer, where);
      const wrong = item.clues[item.clues.length - 1];
      expect(correct, where).not.toBe(wrong);
      hit.push(correct);
    });
  }
  if (step.type === "gapfill") {
    const answers = step.items.map((item) => item.answer);
    const finished = step.items.map((item) => gapSentence(item.before, item.answer, item.after));
    unique(finished, `${lesson.id} ${step.id} gaps`);
    step.items.forEach((item, index) => {
      for (const chip of answers) {
        if (chip === item.answer) continue;
        const swapped = gapSentence(item.before, chip, item.after);
        expect(finished.includes(swapped), `${lesson.id} ${step.id} gap ${index + 1} also accepts “${chip}”`).toBe(false);
      }
      hit.push(finished[index]);
    });
  }
  if (step.type === "builder") {
    step.items.forEach((item, index) => {
      const where = `${lesson.id} ${step.id} builder ${index + 1}`;
      for (const answer of item.answers) {
        expect(tilesMatchAnswer(item.tiles, answer), where).toBe(true);
        hit.push(answer);
      }
    });
  }
  if (step.type === "picturematch") {
    step.items.forEach((item) => {
      expect(item.image.type, `${lesson.id} ${item.de}`).toBe("svg");
      if (item.image.type === "svg") {
        expect(illustrationMarkup(item.image.id), `${lesson.id} ${item.image.id}`).toBeTruthy();
      }
      hit.push(item.en);
    });
  }
  if (step.type === "writing") {
    const model = step.model.toLowerCase();
    for (const item of step.checklist) {
      expect(
        item.keywords.some((word) => model.includes(word.toLowerCase())),
        `${lesson.id} model misses ${item.keywords.join(", ")}`,
      ).toBe(true);
    }
    hit.push(step.model);
  }
  if (step.type === "overview") hit.push(step.text.de);
  if (step.type === "reading") hit.push(...step.document.paragraphs);
}

describe("lesson answers", () => {
  it("keeps one programmed answer, a real picture, and clean German in the correct line", () => {
    const bad: string[] = [];
    for (const lesson of lessons()) {
      for (const step of lesson.steps) {
        const correct: string[] = [];
        walkStep(lesson, step, correct);
        for (const line of correct) {
          for (const pattern of BAD) {
            if (pattern.test(line)) bad.push(`${lesson.id} ${pattern} :: ${line}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("unlocks every A1 chapter", () => {
    const byNumber = new Map(CHAPTERS.map((chapter) => [chapter.number, chapter.lessonId]));
    for (const number of LEVEL_PATH.A1) {
      expect(byNumber.get(number), `A1 chapter ${number}`).toBeTruthy();
    }
  });
});
