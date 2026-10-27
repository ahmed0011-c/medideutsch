import type { Lesson, Step } from "@/lib/lesson-schema";

export const PRACTICE_ROLES = [
  "match",
  "gap",
  "choose",
  "build",
  "transform",
  "error",
  "picture",
  "dialogue",
  "reading",
  "writing",
  "lernkontrolle",
] as const;

export type PracticeRole = (typeof PRACTICE_ROLES)[number];

export const MIN_EXERCISES = 12;
export const MIN_ITEMS = 60;
export const MIN_LERNKONTROLLE = 10;
export const MASTERY_RATIO = 0.8;

const EXERCISE_TYPES = new Set([
  "gapfill",
  "gapcase",
  "builder",
  "picturematch",
  "colour",
  "compare",
  "riddle",
  "reading",
  "writing",
]);

type McMap = Record<string, { solved?: boolean } | undefined>;

export function isTemplateLesson(lesson: { id: string; chapter?: number }): boolean {
  return lesson.chapter === 0 || lesson.id.startsWith("_");
}

export function isExerciseStep(step: Step): boolean {
  if (step.practice) return true;
  return EXERCISE_TYPES.has(step.type);
}

export function countStepItems(step: Step): number {
  if (step.type === "overview" || step.type === "dialogue" || step.type === "summary") return 0;
  if (step.type === "tips" && !step.practice) return 0;
  let count = 0;
  if ("quiz" in step && step.quiz) count += step.quiz.length;
  if ("items" in step && step.items) count += step.items.length;
  if ("questions" in step && step.questions) count += step.questions.length;
  if ("sentences" in step && step.sentences) count += step.sentences.length;
  if ("checklist" in step && step.checklist) count += step.checklist.length;
  return count;
}

export function practiceIssues(lesson: Lesson): string[] {
  if (isTemplateLesson(lesson)) return [];
  const issues: string[] = [];
  const exercises = lesson.steps.filter(isExerciseStep).length;
  if (exercises < MIN_EXERCISES) {
    issues.push(`Needs at least ${MIN_EXERCISES} exercises (has ${exercises})`);
  }
  const items = lesson.steps.reduce((sum, step) => sum + countStepItems(step), 0);
  if (items < MIN_ITEMS) {
    issues.push(`Needs at least ${MIN_ITEMS} practice items (has ${items})`);
  }
  for (const role of PRACTICE_ROLES) {
    if (!lesson.steps.some((step) => step.practice === role)) {
      issues.push(`Missing practice role “${role}”`);
    }
  }
  const test = lesson.steps.find((step) => step.practice === "lernkontrolle");
  if (!test || test.type !== "grammar" || test.quiz.length < MIN_LERNKONTROLLE) {
    issues.push(`Lernkontrolle must be a grammar quiz with at least ${MIN_LERNKONTROLLE} items`);
  }
  return issues;
}

export function lernkontrolleStep(lesson: Lesson) {
  const step = lesson.steps.find((item) => item.practice === "lernkontrolle" && item.type === "grammar");
  return step && step.type === "grammar" ? step : null;
}

export function solvedQuizCount(mc: McMap, stepId: string, length: number): number {
  let solved = 0;
  for (let index = 0; index < length; index++) {
    if (mc[`gq:${stepId}:${index}`]?.solved) solved += 1;
  }
  return solved;
}

/** Share of Lernkontrolle questions marked solved. Hints and points do not count. */
export function masteryRatio(mc: McMap, stepId: string, length: number): number {
  if (!length) return 0;
  return solvedQuizCount(mc, stepId, length) / length;
}
