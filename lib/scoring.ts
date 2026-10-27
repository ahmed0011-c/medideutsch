export type Scoring = {
  firstTry: number;
  afterRetry: number;
  wordExplorePoints: number;
  hintCost: number;
  tipPoints: number;
  stars: { "3": number; "2": number; "1": number };
};

export function starsFor(ratio: number, stars: Scoring["stars"]): 0 | 1 | 2 | 3 {
  if (ratio >= stars["3"]) return 3;
  if (ratio >= stars["2"]) return 2;
  if (ratio >= stars["1"]) return 1;
  return 0;
}

/** Points for one scored item. A hint and a retry each reduce the award; never below 0. */
export function pointsForAttempt(
  scoring: Pick<Scoring, "firstTry" | "afterRetry" | "hintCost">,
  opts: { wrongBefore: boolean; hintUsed: boolean },
): number {
  const base = opts.wrongBefore ? scoring.afterRetry : scoring.firstTry;
  const cost = opts.hintUsed ? scoring.hintCost : 0;
  return Math.max(0, base - cost);
}

export type BuilderItem = {
  tiles: string[];
  answers: string[];
  modal: string;
  inf: string;
  question: boolean;
  feedback?: { end?: string; first?: string; fallback?: string };
};

export function normaliseSentence(words: string[]): string {
  return words.join(" ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function builderAccepts(item: Pick<BuilderItem, "answers">, words: string[]): boolean {
  const got = normaliseSentence(words);
  return item.answers.some((answer) => normaliseSentence(answer.split(/\s+/)) === got);
}

export function diagnoseBuilder(item: BuilderItem, words: string[]): string | null {
  if (builderAccepts(item, words)) return null;
  if (words[words.length - 1] !== item.inf) {
    return (
      item.feedback?.end ??
      `The infinitive „${item.inf}“ goes to the very end. Back of the queue!`
    );
  }
  if (item.question && words[0] !== item.modal) {
    return (
      item.feedback?.first ??
      `In a yes/no question the modal verb („${item.modal}“) comes first.`
    );
  }
  return (
    item.feedback?.fallback ??
    `Remember: the modal („${item.modal}“) stands in position 2, after ONE sentence part.`
  );
}

export function tilesMatchAnswer(tiles: string[], answer: string): boolean {
  const words = answer.trim().split(/\s+/);
  if (words.length !== tiles.length) return false;
  const norm = (list: string[]) =>
    list.map((w) => w.toLowerCase()).sort().join("\u0000");
  return norm(words) === norm(tiles);
}

export type ScoreSection = { key: string; label: string; max: number };

type StepLike = {
  id: string;
  type: string;
  label: string;
  scoreLabel?: string;
  quiz?: unknown[];
  tips?: unknown[];
  items?: unknown[];
  questions?: unknown[];
  sentences?: unknown[];
  checklist?: unknown[];
  rounds?: unknown[];
};

/** Section maxima derived from the lesson, so a new JSON file scores itself. */
export function scoreSections(
  steps: StepLike[],
  scoring: Scoring,
): ScoreSection[] {
  const sections: ScoreSection[] = [];
  const explores = steps.some((s) => s.type === "overview" || s.type === "dialogue");
  if (explores && scoring.wordExplorePoints > 0) {
    sections.push({
      key: "w:",
      label: "Words explored",
      max: scoring.wordExplorePoints,
    });
  }
  for (const step of steps) {
    const label = step.scoreLabel ?? step.label;
    switch (step.type) {
      case "grammar":
      case "cases":
        if (step.quiz?.length) {
          sections.push({
            key: `gq:${step.id}:`,
            label,
            max: step.quiz.length * scoring.firstTry,
          });
        }
        break;
      case "tips":
        if (step.tips?.length) {
          sections.push({
            key: `t:${step.id}:`,
            label,
            max: step.tips.length * scoring.tipPoints,
          });
        }
        break;
      case "gapfill":
      case "gapcase":
      case "builder":
      case "picturematch":
        if (step.items?.length) {
          sections.push({
            key: `${step.type}:${step.id}:`,
            label,
            max: step.items.length * scoring.firstTry,
          });
        }
        break;
      case "reading":
        if (step.questions?.length) {
          sections.push({
            key: `r:${step.id}:`,
            label,
            max: step.questions.length * scoring.firstTry,
          });
        }
        break;
      case "colour":
        if (step.sentences?.length) {
          sections.push({
            key: `c:${step.id}:`,
            label,
            max: step.sentences.length * scoring.firstTry,
          });
        }
        break;
      case "compare":
      case "riddle":
        if (step.items?.length) {
          sections.push({
            key: `${step.type}:${step.id}:`,
            label,
            max: step.items.length * scoring.firstTry,
          });
        }
        break;
      case "writing":
        if (step.checklist?.length) {
          sections.push({
            key: `write:${step.id}:`,
            label,
            max: step.checklist.length * scoring.firstTry,
          });
        }
        break;
      default:
        break;
    }
  }
  return sections;
}

export function sectionPoints(pts: Record<string, number>, key: string): number {
  return Object.entries(pts)
    .filter(([k, v]) => k.startsWith(key) && v > 0)
    .reduce((sum, [, v]) => sum + v, 0);
}

export function totalPoints(pts: Record<string, number>): number {
  return Object.values(pts).reduce((sum, n) => sum + n, 0);
}
