export type LessonKind = "grammar" | "comic";
export type ReviewGrade = "again" | "good" | "easy";

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
  sentence: string;
  href: string;
  hard: boolean;
  story: string;
  savedAt: string;
  due: string;
  intervalDays: number;
  ease: number;
  reps: number;
};

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
  sentence: string;
  href: string;
};

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
    entries: doc.entries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            lessonTitle: draft.lessonTitle,
            lessonKind: draft.lessonKind,
            surface: draft.surface,
            lemma: draft.lemma,
            pos: draft.pos,
            de: draft.de,
            en: draft.en,
            emoji: draft.emoji,
            sentence: draft.sentence,
            href: draft.href,
          }
        : entry,
    ),
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
