export type GlossaryLike = Record<string, unknown>;

export type TextToken =
  | { type: "text"; value: string }
  | { type: "word"; surface: string; key: string | null };

/** Same rule as the prototypes: [[Surface|glossaryKey]] or a word/number token. */
export const TOKEN_RE = /\[\[[^\]]+\]\]|[A-Za-zÄÖÜäöüß0-9]+/g;

export function lookupKey(surface: string, glossary: GlossaryLike): string | null {
  if (Object.prototype.hasOwnProperty.call(glossary, surface)) return surface;
  const lower = surface.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(glossary, lower)) return lower;
  return null;
}

export function tokenize(text: string, glossary: GlossaryLike): TextToken[] {
  const tokens: TextToken[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
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
      key = lookupKey(raw, glossary);
    }
    tokens.push({ type: "word", surface, key });
    last = idx + raw.length;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
}

export function plainText(text: string): string {
  return text.replace(/\[\[([^|\]]+)\|[^\]]+\]\]/g, "$1");
}

export function unresolvedTokens(text: string, glossary: GlossaryLike): string[] {
  const missing: string[] = [];
  for (const token of tokenize(text, glossary)) {
    if (token.type === "word" && !token.key) missing.push(token.surface);
  }
  return missing;
}

/** [N:der Arzt] case marks used in grammar examples. */
export function caseSegments(text: string): Array<{ caseId?: string; text: string }> {
  const parts: Array<{ caseId?: string; text: string }> = [];
  const re = /\[([NADG]):([^\]]+)\]/g;
  let last = 0;
  for (const match of text.matchAll(re)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push({ text: text.slice(last, idx) });
    parts.push({ caseId: match[1], text: match[2] });
    last = idx + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export function stripCaseMarks(text: string): string {
  return text.replace(/\[([NADG]):([^\]]+)\]/g, "$2");
}
