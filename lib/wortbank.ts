export type LessonKind = "grammar" | "comic" | "hoeren" | "lookup";
export type ReviewGrade = "again" | "good" | "easy";
/** Flashcards rating. Absent on words saved before a learner rates the card. */
export type FlashRating = "easy" | "medium" | "hard";
export type Article = "der" | "die" | "das";

/**
 * Optional learner fields. Lesson saves from before lookup omit every one of
 * these, and loading them still works.
 */
export type LearnerFields = {
  /** Where the card came from, e.g. "Lookup". */
  source?: string;
  /** Set when the noun has a single article. */
  article?: Article;
  /** Every article when a noun can be more than one gender. */
  articles?: Article[];
  plural?: string;
  ipa?: string;
  /** Direct audio URL, when Wiktionary has a recording. */
  audio?: string;
  meanings?: string[];
  examples?: Array<{ de: string; en?: string }>;
  related?: string[];
  /** True when the verb splits, false when we know it does not. */
  separable?: boolean;
  inseparable?: boolean;
  /** Separable prefix, so abholen can be shown as ab|holen. */
  prefix?: string;
  praeteritum?: string;
  partizip?: string;
  aux?: "haben" | "sein";
  /** "mymemory" when Wiktionary had no English sense. */
  enSource?: "wiktionary" | "mymemory";
};

export type WortbankEntry = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  lessonKind: LessonKind;
  key: string;
  surface: string;
  lemma: string;
  pos: string;
  de: string;
  en: string;
  emoji: string;
  /** Sprite id, when the lesson drew this word. */
  image?: string;
  sentence: string;
  href: string;
  hard: boolean;
  story: string;
  savedAt: string;
  due: string;
  intervalDays: number;
  ease: number;
  reps: number;
  /** Last Easy / Medium / Hard flashcard rating. Omitted until the card is rated. */
  rating?: FlashRating;
} & LearnerFields;

export type WortbankDoc = {
  version: 1;
  entries: WortbankEntry[];
};

export type WortbankDraft = {
  lessonId: string;
  lessonTitle: string;
  lessonKind: LessonKind;
  key: string;
  surface: string;
  lemma: string;
  pos: string;
  de: string;
  en: string;
  emoji: string;
  image?: string;
  sentence: string;
  href: string;
} & LearnerFields;

export const WORTBANK_EVENT = "wortbank:changed";

export function notifyWortbank(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WORTBANK_EVENT));
}

export function entryId(lessonId: string, key: string): string {
  return `${lessonId}:${key}`;
}

export function emptyWortbank(): WortbankDoc {
  return { version: 1, entries: [] };
}

export function isWortbankDoc(value: unknown): value is WortbankDoc {
  if (!value || typeof value !== "object") return false;
  const doc = value as WortbankDoc;
  return doc.version === 1 && Array.isArray(doc.entries);
}

/** Review progress stays put when the same word is saved again. */
function withDraft(entry: WortbankEntry, draft: WortbankDraft): WortbankEntry {
  const next: WortbankEntry = {
    ...entry,
    ...draft,
    id: entry.id,
    hard: entry.hard,
    story: entry.story,
    savedAt: entry.savedAt,
    due: entry.due,
    intervalDays: entry.intervalDays,
    ease: entry.ease,
    reps: entry.reps,
    rating: entry.rating,
  };
  return next;
}

/** Insert or refresh the source sentence. Hard flag, personal story, and review schedule stay. */
export function upsertWortbank(doc: WortbankDoc, draft: WortbankDraft, now = new Date()): WortbankDoc {
  const id = entryId(draft.lessonId, draft.key);
  const existing = doc.entries.find((entry) => entry.id === id);
  if (!existing) {
    const created: WortbankEntry = {
      ...draft,
      id,
      hard: false,
      story: "",
      savedAt: now.toISOString(),
      due: now.toISOString(),
      intervalDays: 0,
      ease: 2.5,
      reps: 0,
    };
    return { version: 1, entries: [...doc.entries, created] };
  }
  return {
    version: 1,
    entries: doc.entries.map((entry) => (entry.id === id ? withDraft(entry, draft) : entry)),
  };
}

export function toggleHard(doc: WortbankDoc, id: string): WortbankDoc {
  return {
    version: 1,
    entries: doc.entries.map((entry) => (entry.id === id ? { ...entry, hard: !entry.hard } : entry)),
  };
}

export function setStory(doc: WortbankDoc, id: string, story: string): WortbankDoc {
  return {
    version: 1,
    entries: doc.entries.map((entry) => (entry.id === id ? { ...entry, story } : entry)),
  };
}

export function removeEntry(doc: WortbankDoc, id: string): WortbankDoc {
  return { version: 1, entries: doc.entries.filter((entry) => entry.id !== id) };
}

export type LessonGroup = {
  lessonId: string;
  lessonTitle: string;
  lessonKind: LessonKind;
  entries: WortbankEntry[];
};

export function groupByLesson(entries: WortbankEntry[]): LessonGroup[] {
  const groups: LessonGroup[] = [];
  for (const entry of entries) {
    let group = groups.find((item) => item.lessonId === entry.lessonId);
    if (!group) {
      group = {
        lessonId: entry.lessonId,
        lessonTitle: entry.lessonTitle,
        lessonKind: entry.lessonKind,
        entries: [],
      };
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
}

export function posBucket(pos: string): "verb" | "noun" | "other" {
  if (/^verb/i.test(pos)) return "verb";
  if (/noun/i.test(pos)) return "noun";
  return "other";
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Again clears the interval. Good doubles it, Easy triples it.
 * A Schwer word grows more slowly (×1.3) so it returns sooner.
 */
export function reviewResult(entry: WortbankEntry, grade: ReviewGrade, now = new Date()): WortbankEntry {
  let interval = entry.intervalDays;
  let ease = entry.ease;
  if (grade === "again") {
    interval = 0;
    ease = Math.max(1.3, round1(ease - 0.2));
  } else {
    const base = interval < 1 ? 1 : interval;
    const factor = entry.hard ? 1.3 : grade === "easy" ? 3 : 2;
    interval = round1(base * factor);
    if (grade === "easy") ease = round1(ease + 0.15);
  }
  const due = new Date(now.getTime() + interval * 86_400_000);
  return { ...entry, intervalDays: interval, ease, due: due.toISOString(), reps: entry.reps + 1 };
}

/** Due cards first. Schwer cards sort ahead of the others and are dealt twice. */
export function reviewQueue(
  entries: WortbankEntry[],
  opts: { lessonId?: string; hardOnly?: boolean; now?: Date; includeLater?: boolean } = {},
): WortbankEntry[] {
  const now = opts.now ?? new Date();
  let list = entries.filter((entry) => !opts.lessonId || entry.lessonId === opts.lessonId);
  if (opts.hardOnly) list = list.filter((entry) => entry.hard);
  const due = list.filter((entry) => new Date(entry.due).getTime() <= now.getTime());
  const pool = due.length || !opts.includeLater ? due : list;
  const ranked = [...pool].sort((a, b) => {
    if (a.hard !== b.hard) return a.hard ? -1 : 1;
    return new Date(a.due).getTime() - new Date(b.due).getTime() || a.id.localeCompare(b.id);
  });
  return ranked.flatMap((entry) => (entry.hard ? [entry, entry] : [entry]));
}

export function grammarHref(level: string, lessonId: string, step: number): string {
  const value = level.toLowerCase();
  const slug = value.startsWith("b1") ? "b1" : value.startsWith("a2") ? "a2" : "a1";
  return `/learn/${slug}/${lessonId}?step=${step}`;
}
