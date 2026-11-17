import { lookupVerb } from "@/lib/verbs";
import type { Article, FlashRating, WortbankEntry } from "@/lib/wortbank";

export type FlashFilter = "all" | "due" | "easy" | "medium" | "hard" | "unrated";

export const FLASH_FILTERS: Array<{ id: FlashFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "due", label: "Due" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "unrated", label: "Unrated" },
];

/** Repeated Easy ratings climb this ladder, then stay at the last step. */
export const EASY_LADDER = [7, 14, 30, 60] as const;

const DAY_MS = 86_400_000;

export function isFlashFilter(value: string | null | undefined): value is FlashFilter {
  return FLASH_FILTERS.some((item) => item.id === value);
}

export function parseArticles(value: string | undefined): Article[] {
  if (!value) return [];
  const found: Article[] = [];
  for (const part of value.split("/")) {
    const token = part.trim().toLowerCase();
    if ((token === "der" || token === "die" || token === "das") && !found.includes(token)) found.push(token);
  }
  return found;
}

function isNounLike(pos: string | undefined): boolean {
  if (!pos) return true;
  return /noun|substantiv|compound/i.test(pos);
}

/** Articles to colour on the card. Stored fields win; older saves often only have "der Patient" in `de`. */
export function nounArticles(entry: Pick<WortbankEntry, "article" | "articles" | "de" | "lemma" | "pos">): Article[] {
  if (entry.articles?.length) return entry.articles.filter((article) => parseArticles(article).length === 1);
  if (entry.article && parseArticles(entry.article).length === 1) return [entry.article];
  if (!isNounLike(entry.pos)) return [];
  const source = entry.de || entry.lemma || "";
  return parseArticles(source.trim().split(/\s+/)[0]);
}

/** German headword without a leading article and without a separable pipe. */
export function frontWord(entry: Pick<WortbankEntry, "article" | "articles" | "de" | "lemma" | "pos">): string {
  const articles = nounArticles(entry);
  const raw = (entry.lemma || entry.de || "").replace(/\|/g, "").trim();
  if (!articles.length) return raw;
  const tokens = raw.split(/\s+/).filter(Boolean);
  const leading = parseArticles(tokens[0]);
  if (leading.length && leading.every((article) => articles.includes(article))) {
    return tokens.slice(1).join(" ") || raw;
  }
  return raw;
}

export function isDue(entry: WortbankEntry, now = new Date()): boolean {
  const time = Date.parse(entry.due);
  if (Number.isNaN(time)) return true;
  return time <= now.getTime();
}

export function countDue(entries: WortbankEntry[], now = new Date()): number {
  return entries.filter((entry) => isDue(entry, now)).length;
}

export function matchesFlashFilter(entry: WortbankEntry, filter: FlashFilter, now = new Date()): boolean {
  if (filter === "all") return true;
  if (filter === "due") return isDue(entry, now);
  if (filter === "unrated") return entry.rating === undefined;
  return entry.rating === filter;
}

export function flashFilterCounts(entries: WortbankEntry[], now = new Date()): Record<FlashFilter, number> {
  const counts: Record<FlashFilter, number> = { all: entries.length, due: 0, easy: 0, medium: 0, hard: 0, unrated: 0 };
  for (const entry of entries) {
    if (isDue(entry, now)) counts.due += 1;
    counts[entry.rating ?? "unrated"] += 1;
  }
  return counts;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function nextEasyInterval(entry: WortbankEntry): number {
  const current = entry.rating === "easy" && Number.isFinite(entry.intervalDays) ? entry.intervalDays : 0;
  return EASY_LADDER.find((step) => step > current) ?? EASY_LADDER[EASY_LADDER.length - 1];
}

/**
 * Hard is due tomorrow and the session shows it again.
 * Medium is due in 3 days.
 * Easy climbs 7 → 14 → 30 → 60 days, and stays at 60.
 * Words with no `rating` stay valid; the first Easy starts at 7 days.
 */
export function scheduleFlashcard(entry: WortbankEntry, rating: FlashRating, now = new Date()): WortbankEntry {
  const easeBase = Number.isFinite(entry.ease) ? entry.ease : 2.5;
  const reps = Number.isFinite(entry.reps) ? entry.reps : 0;
  let intervalDays: number;
  let ease = easeBase;
  if (rating === "hard") {
    intervalDays = 1;
    ease = Math.max(1.3, round1(ease - 0.2));
  } else if (rating === "medium") {
    intervalDays = 3;
  } else {
    intervalDays = nextEasyInterval(entry);
    ease = round1(ease + 0.15);
  }
  return {
    ...entry,
    rating,
    intervalDays,
    ease,
    due: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
    reps: reps + 1,
  };
}

/** Due cards first, then the rest. Lesson words and Lookup words share one queue. */
export function startSession(entries: WortbankEntry[], filter: FlashFilter, now = new Date()): string[] {
  return entries
    .filter((entry) => matchesFlashFilter(entry, filter, now))
    .sort((a, b) => {
      const due = dueTime(a) - dueTime(b);
      return due || a.id.localeCompare(b.id);
    })
    .map((entry) => entry.id);
}

function dueTime(entry: WortbankEntry): number {
  const time = Date.parse(entry.due);
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Drop the card that was just rated.
 * Hard is inserted two cards later so it returns in this session, or immediately when nothing else is left.
 */
export function advanceSession(ids: string[], index: number, rating: FlashRating): { ids: string[]; index: number } {
  if (index < 0 || index >= ids.length) return { ids, index };
  const id = ids[index];
  const next = ids.slice();
  next.splice(index, 1);
  if (rating === "hard") {
    const at = Math.min(next.length, index + 2);
    next.splice(at, 0, id);
  }
  return { ids: next, index: Math.min(index, next.length) };
}

export function sessionDone(ids: string[], index: number): boolean {
  return index >= ids.length;
}

export type SessionTally = Record<FlashRating, number>;

export function emptyTally(): SessionTally {
  return { easy: 0, medium: 0, hard: 0 };
}

function parked(form: string | undefined, prefix?: string): string | undefined {
  if (!form) return undefined;
  if (!prefix) return form;
  const lower = form.toLocaleLowerCase("de");
  const mark = prefix.toLocaleLowerCase("de");
  if (lower.startsWith(mark) || lower.endsWith(` ${mark}`) || lower.includes(` ${mark}`)) return form;
  return `${form} … ${prefix}`;
}

export type CardFace = {
  articles: Article[];
  word: string;
  meanings: string[];
  plural?: string;
  prefix?: string;
  praeteritum?: string;
  partizip?: string;
  aux?: "haben" | "sein";
  exampleDe?: string;
  exampleEn?: string;
  audio?: string;
  speak: string;
};

/** Facts for the back of a card. Verb forms fall back to the curated verb table. */
export function cardFace(entry: WortbankEntry): CardFace {
  const articles = nounArticles(entry);
  const word = frontWord(entry);
  const verb = /verb/i.test(entry.pos) ? lookupVerb(word) : null;
  const prefixSource = entry.prefix || verb?.separable || undefined;
  const prefix =
    prefixSource && word.toLocaleLowerCase("de").startsWith(prefixSource.toLocaleLowerCase("de")) ? prefixSource : undefined;
  const showVerb = /verb/i.test(entry.pos) || Boolean(entry.praeteritum || entry.partizip || entry.aux || entry.prefix);
  const example = entry.examples?.find((item) => item.de.trim());
  const sentence = entry.sentence?.trim() ?? "";
  const english = entry.en?.trim() ?? "";
  const exampleDe = example?.de || (sentence && sentence !== entry.de && sentence !== word ? sentence : undefined) || (showVerb ? verb?.examples.praesens : undefined);
  const meanings = (entry.meanings?.map((item) => item.trim()).filter(Boolean) ?? []).slice(0, 4);
  return {
    articles,
    word,
    meanings: meanings.length ? meanings : english ? [english] : [],
    plural: entry.plural?.trim() || undefined,
    prefix: showVerb ? prefix : undefined,
    praeteritum: showVerb ? entry.praeteritum || parked(verb?.praeteritum[0], prefix) : undefined,
    partizip: showVerb ? entry.partizip || verb?.partizip : undefined,
    aux: showVerb ? entry.aux || verb?.aux : undefined,
    exampleDe,
    exampleEn: example?.en,
    audio: entry.audio,
    speak: [articles.length === 1 ? articles[0] : "", word].filter(Boolean).join(" "),
  };
}
