import raw from "@/content/verbs.json";

export type VerbAux = "haben" | "sein";

export type VerbRecord = {
  en: string;
  aux: VerbAux;
  irregular: boolean;
  separable: string | null;
  inseparable: string | null;
  partizip: string;
  praesens: string[];
  praeteritum: string[];
  imperativ: string[];
  examples: {
    praesens: string;
    perfekt: string;
    praeteritum: string;
    futur: string;
    imperativ: string;
  };
  note?: string;
};

/** Curated forms. Irregulars are stored in full; nothing here guesses a stem. */
export const VERBS = raw as Record<string, VerbRecord>;

export const PERSONS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"] as const;

export type TenseId = "praesens" | "perfekt" | "praeteritum" | "futur" | "imperativ";

export type TenseTable = {
  id: TenseId;
  label: string;
  persons: string[];
  cells: string[];
  example: string;
};

/**
 * Infinitive from a glossary line such as "verstehen → ich verstehe" or "Blut abnehmen".
 * Shared with the verb-file check so a new lesson verb cannot slip through unnamed.
 */
export function verbLemmaFromGloss(de: string): string | null {
  const head = String(de).split("→")[0].trim();
  if (/konjunktiv/i.test(head) || /^es gibt$/i.test(head)) return null;
  const cleaned = head.replace(/[()]/g, " ").replace(/\s*\+.*/, "");
  const tokens = cleaned
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => /^[a-zäöüß]+$/.test(token));
  const skip = new Set(["sich", "um", "blut", "es", "nicht", "bitte", "der", "die", "das", "ein", "eine"]);
  const verbs = tokens.filter(
    (token) => !skip.has(token) && (/(?:eln|ern|en)$/.test(token) || token.endsWith("tun") || token === "sein"),
  );
  return verbs.at(-1) ?? null;
}

export function lemmaFromGloss(de: string, pos: string): string {
  if (/^verb/i.test(pos)) return verbLemmaFromGloss(de) ?? de.split("→")[0].trim().toLowerCase();
  return de.split("→")[0].replace(/\s*\(.*\)\s*$/, "").trim();
}

export function lookupVerb(lemma: string): VerbRecord | null {
  return VERBS[lemma.toLowerCase()] ?? null;
}

function finite(form: string, prefix: string | null): string {
  if (!prefix || form === "—") return form;
  return `${form} … ${prefix}`;
}

/** Präsens, Perfekt, Präteritum, Futur I, and Imperativ. Separable prefixes stay parked at the end. */
export function tenseRows(infinitive: string, verb: VerbRecord): TenseTable[] {
  const prefix = verb.separable;
  const aux = verb.aux === "sein" ? VERBS.sein.praesens : VERBS.haben.praesens;
  return [
    {
      id: "praesens",
      label: "Präsens",
      persons: [...PERSONS],
      cells: verb.praesens.map((form) => finite(form, prefix)),
      example: verb.examples.praesens,
    },
    {
      id: "perfekt",
      label: "Perfekt",
      persons: [...PERSONS],
      cells: aux.map((form) => `${form} ${verb.partizip}`),
      example: verb.examples.perfekt,
    },
    {
      id: "praeteritum",
      label: "Präteritum",
      persons: [...PERSONS],
      cells: verb.praeteritum.map((form) => finite(form, prefix)),
      example: verb.examples.praeteritum,
    },
    {
      id: "futur",
      label: "Futur I",
      persons: [...PERSONS],
      cells: VERBS.werden.praesens.map((form) => `${form} ${infinitive}`),
      example: verb.examples.futur,
    },
    {
      id: "imperativ",
      label: "Imperativ",
      persons: ["du", "ihr", "Sie"],
      cells: verb.imperativ.map((form) => finite(form, prefix)),
      example: verb.examples.imperativ,
    },
  ];
}

export function splitTrailingPrefix(sentence: string, prefix: string): { before: string } | null {
  const pattern = new RegExp(`\\s+${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[.!?]?$`, "i");
  if (!pattern.test(sentence)) return null;
  return { before: sentence.replace(pattern, "").trim() };
}
