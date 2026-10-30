/** Normalise a typed German sentence for comparison. */
export function normaliseTyped(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[„“”«»]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?…]+$/u, "")
    .trim()
    .toLowerCase();
}

export function sentenceAccepted(input: string, answers: string[]): boolean {
  const got = normaliseTyped(input);
  if (!got) return false;
  return answers.some((answer) => normaliseTyped(answer) === got);
}

export type TokenMark = { wrong: string; right: string; reason: string };

export type TokenFeedback =
  | { kind: "ok"; text: string }
  | { kind: "bad"; text: string; reason: string }
  | { kind: "missing"; text: string; reason: string };

/** Compare learner input to the primary answer; apply optional mark rules. */
export function diagnoseSentence(
  input: string,
  primary: string,
  marks: TokenMark[] = [],
): TokenFeedback[] {
  const strip = (w: string) => w.replace(/^[,.;:!?„“”"']+|[,.;:!?„“”"']+$/g, "");
  const got = input
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?…]+$/u, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const want = primary
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?…]+$/u, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const markFor = (surface: string): TokenMark | undefined => {
    const core = strip(surface).toLowerCase();
    return marks.find((m) => strip(m.wrong).toLowerCase() === core);
  };

  const out: TokenFeedback[] = [];
  const max = Math.max(got.length, want.length);
  for (let i = 0; i < max; i++) {
    const g = got[i];
    const w = want[i];
    if (g && w && strip(g).toLowerCase() === strip(w).toLowerCase()) {
      out.push({ kind: "ok", text: g });
      continue;
    }
    if (g && w) {
      const mark = markFor(g) ?? {
        wrong: g,
        right: w,
        reason: `„${strip(g)}“ → „${strip(w)}“`,
      };
      out.push({ kind: "bad", text: g, reason: mark.reason });
      continue;
    }
    if (g && !w) {
      out.push({ kind: "bad", text: g, reason: "Dieses Wort gehört nicht in den Satz." });
      continue;
    }
    if (!g && w) {
      out.push({ kind: "missing", text: w, reason: `Fehlt: „${strip(w)}“` });
    }
  }
  return out;
}
