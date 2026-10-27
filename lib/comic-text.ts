import type { GlossEntry } from "@/lib/comic-schema";

/** Comic tokenizer: keeps Dr., i.v., and hyphenated forms, plus [[Surface|key]]. */
export const COMIC_TOKEN_RE =
  /\[\[[^\]]+\]\]|i\.v\.|Dr\.|[0-9]+[A-Za-z]+|[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9]*(?:-[A-Za-zÄÖÜäöüß0-9]+)*/g;

export type ComicToken =
  | { type: "text"; value: string }
  | { type: "word"; surface: string; key: string | null };

export function lookupComic(surface: string, glossary: Record<string, unknown>): string | null {
  if (Object.prototype.hasOwnProperty.call(glossary, surface)) return surface;
  const lower = surface.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(glossary, lower)) return lower;
  return null;
}

export function tokenizeComic(text: string, glossary: Record<string, unknown>): ComicToken[] {
  const tokens: ComicToken[] = [];
  let last = 0;
  for (const match of text.matchAll(COMIC_TOKEN_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) tokens.push({ type: "text", value: text.slice(last, idx) });
    const raw = match[0];
    let surface = raw;
    let key: string | null;
    if (raw.startsWith("[[")) {
      const inner = raw.slice(2, -2);
      const bar = inner.indexOf("|");
      surface = bar >= 0 ? inner.slice(0, bar) : inner;
      const wanted = bar >= 0 ? inner.slice(bar + 1) : "";
      key = wanted && Object.prototype.hasOwnProperty.call(glossary, wanted) ? wanted : null;
    } else {
      key = lookupComic(raw, glossary);
    }
    tokens.push({ type: "word", surface, key });
    last = idx + raw.length;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
}

export function unresolvedComicTokens(text: string, glossary: Record<string, unknown>): string[] {
  return tokenizeComic(text, glossary)
    .filter((token): token is Extract<ComicToken, { type: "word" }> => token.type === "word" && !token.key)
    .map((token) => token.surface);
}

export function plainComic(text: string): string {
  return text.replace(/\[\[([^|\]]+)\|[^\]]+\]\]/g, "$1");
}

export const CASE_NAME: Record<string, string> = {
  Nom: "Nominativ",
  Akk: "Akkusativ",
  Dat: "Dativ",
  Gen: "Genitiv",
};

export function nounLabel(entry: GlossEntry): { art: string; cls: string; word: string; note?: string } | null {
  if (!entry.art || (entry.pos !== "noun" && !/abbreviation/.test(entry.pos))) return null;
  if (entry.plOnly) return { art: "die", cls: "pl", word: entry.de, note: "Pl." };
  return { art: entry.art, cls: entry.art.split("/")[0], word: entry.de.replace(/ \(.*\)$/, "") };
}

export function lemmaOf(entry: GlossEntry): string {
  return entry.de.split("→")[0].trim();
}

export function sayWord(entry: GlossEntry, surface: string): string {
  const noun = nounLabel(entry);
  if (noun) return `${noun.art.split("/")[0]} ${noun.word}`;
  if (/verb/.test(entry.pos) && entry.de && !/→/.test(entry.de)) return entry.de;
  return surface;
}
