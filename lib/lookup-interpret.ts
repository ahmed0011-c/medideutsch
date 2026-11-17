import { lookupAbbreviation, type ClinicalAbbreviation } from "@/lib/abbreviations";
import { segmentCompound, type CompoundSplit } from "@/lib/compounds";
import type { LookupSuggestion } from "@/lib/lookup";
import { VERBS } from "@/lib/verbs";

export type LookupKind =
  | "direct"
  | "verb"
  | "separable"
  | "noun"
  | "adjective"
  | "compound"
  | "abbreviation"
  | "phrase"
  | "spelling";

export type SpellingVariant = { lemma: string; label: string };

export type LookupPlan = {
  input: string;
  cacheKey: string;
  kind: LookupKind;
  /** High: show this lemma even when the typed string has its own entry. */
  priority: "high" | "low";
  lemma?: string;
  label?: string;
  note?: string;
  hints?: string[];
  variants: SpellingVariant[];
  keywords?: string[];
  compound?: CompoundSplit;
  abbreviation?: ClinicalAbbreviation;
  tryWikipedia: boolean;
  /** Titles to fetch, before case variants are added. */
  seeds: string[];
};

export type PickResult =
  | {
      type: "entry";
      key: string;
      interpretation?: string;
      hints?: string[];
      suggestions?: LookupSuggestion[];
    }
  | { type: "phrase"; keys: string[]; interpretation: string }
  | { type: "compound"; interpretation: string }
  | { type: "missing"; suggestions: LookupSuggestion[] };

const SEPARABLE_PREFIXES = [
  "zurück",
  "zusammen",
  "zurecht",
  "voraus",
  "vorüber",
  "vorbei",
  "hinunter",
  "herunter",
  "herauf",
  "heraus",
  "herein",
  "hinauf",
  "hinaus",
  "hinein",
  "wieder",
  "unter",
  "hinter",
  "nieder",
  "gegen",
  "durch",
  "empor",
  "fest",
  "fern",
  "frei",
  "hoch",
  "statt",
  "nach",
  "über",
  "los",
  "dar",
  "ein",
  "aus",
  "auf",
  "mit",
  "vor",
  "weg",
  "her",
  "hin",
  "bei",
  "auf",
  "an",
  "ab",
  "um",
  "zu",
].sort((a, b) => b.length - a.length);

/** Extra separable verbs to hint when a bare stem is typed. */
const EXTRA_SEPARABLE: Record<string, string[]> = {
  holen: ["einholen", "nachholen"],
  kommen: ["ankommen", "zurückkommen", "wegkommen"],
  rufen: ["aufrufen", "zurufen"],
  nehmen: ["annehmen", "aufnehmen", "mitnehmen", "teilnehmen"],
  gehen: ["ausgehen", "mitgehen", "weggehen"],
  sehen: ["aussehen", "nachsehen"],
  sprechen: ["aussprechen", "absprechen"],
  geben: ["abgeben", "aufgeben", "zugeben"],
  machen: ["aufmachen", "zumachen", "mitmachen"],
  stellen: ["bestellen"],
};

const ADJECTIVES = new Set(
  [
    "akut",
    "alt",
    "breit",
    "dumm",
    "dunkel",
    "eng",
    "fern",
    "fertig",
    "fest",
    "frei",
    "früh",
    "ganz",
    "gesund",
    "gleich",
    "groß",
    "gut",
    "hart",
    "hell",
    "hoch",
    "jung",
    "kalt",
    "klar",
    "klein",
    "krank",
    "kurz",
    "lang",
    "laut",
    "leicht",
    "leise",
    "müde",
    "nah",
    "nass",
    "neu",
    "nötig",
    "offen",
    "rot",
    "ruhig",
    "sauber",
    "scharf",
    "schlecht",
    "schmal",
    "schnell",
    "schwach",
    "schwer",
    "spät",
    "stark",
    "still",
    "tief",
    "warm",
    "weich",
    "wichtig",
    "wenig",
    "viel",
  ].map((word) => word.toLocaleLowerCase("de")),
);

const ARTICLES = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines"]);

const STOP = new Set([
  ...ARTICLES,
  "ich",
  "du",
  "er",
  "sie",
  "es",
  "wir",
  "ihr",
  "mir",
  "mich",
  "dir",
  "dich",
  "ihm",
  "ihn",
  "uns",
  "euch",
  "sich",
  "mein",
  "dein",
  "sein",
  "und",
  "oder",
  "aber",
  "nicht",
  "auch",
  "nur",
  "noch",
  "sehr",
  "zu",
  "zum",
  "zur",
  "am",
  "im",
  "in",
  "an",
  "auf",
  "aus",
  "mit",
  "von",
  "vom",
  "bei",
  "nach",
  "vor",
  "über",
  "uber",
  "für",
  "fur",
  "durch",
  "ohne",
  "um",
  "als",
  "wie",
  "dass",
  "wenn",
  "weil",
  "mal",
  "bitte",
  "herr",
  "frau",
]);

const NOUN_OVERRIDE: Record<string, { lemma: string; label: string }> = {
  patienten: { lemma: "Patient", label: "plural" },
  patientinnen: { lemma: "Patientin", label: "plural" },
  ärzten: { lemma: "Arzt", label: "dative plural" },
  aerzten: { lemma: "Arzt", label: "dative plural" },
  ärzte: { lemma: "Arzt", label: "plural" },
  arztes: { lemma: "Arzt", label: "genitive" },
  tabletten: { lemma: "Tablette", label: "plural" },
  spritzen: { lemma: "Spritze", label: "plural" },
};

const PARTICIPLE_REST: Record<string, string> = {
  gangen: "gehen",
  sprochen: "sprechen",
  nommen: "nehmen",
  kommen: "kommen",
  funden: "finden",
  trunken: "trinken",
  schrieben: "schreiben",
  lesen: "lesen",
  wesen: "sein",
  worden: "werden",
  bracht: "bringen",
  dacht: "denken",
  kannt: "kennen",
  wusst: "wissen",
  musst: "müssen",
  konnt: "können",
  sessen: "sitzen",
  standen: "stehen",
  hoben: "heben",
  troffen: "treffen",
  brochen: "brechen",
  holfen: "helfen",
  worfen: "werfen",
  storben: "sterben",
  schlafen: "schlafen",
  lassen: "lassen",
  rufen: "rufen",
  laufen: "laufen",
  stoßen: "stoßen",
  stossen: "stoßen",
  geben: "geben",
  sehen: "sehen",
  essen: "essen",
  fangen: "fangen",
  hangen: "hängen",
  zogen: "ziehen",
  flossen: "fließen",
  schlossen: "schließen",
  gossen: "gießen",
};

type VerbHit = { lemma: string; base: string; label: string; separable: boolean };

const VERB_INDEX = new Map<string, VerbHit[]>();

function addVerbForm(form: string, hit: VerbHit) {
  const key = form.trim().toLocaleLowerCase("de");
  if (!key || key === "—" || key.includes(" ")) return;
  const list = VERB_INDEX.get(key) ?? [];
  if (!list.some((item) => item.lemma === hit.lemma && item.label === hit.label)) list.push(hit);
  VERB_INDEX.set(key, list);
}

for (const [infinitive, verb] of Object.entries(VERBS)) {
  const separable = verb.separable;
  const base = separable ? infinitive.slice(separable.length) : infinitive;
  const hit = (label: string): VerbHit => ({ lemma: infinitive, base, label, separable: Boolean(separable) });
  addVerbForm(infinitive, hit("infinitive"));
  for (const form of verb.praesens) addVerbForm(form, hit("present"));
  for (const form of verb.praeteritum) addVerbForm(form, hit("preterite"));
  for (const form of verb.imperativ) addVerbForm(form, hit("imperative"));
  addVerbForm(verb.partizip, hit("past participle"));
  if (separable && base) addVerbForm(`${separable}zu${base}`, hit("zu-infinitive"));
}

function cleanInput(raw: string): string | null {
  let trimmed = raw.trim().replace(/\s+/g, " ").replace(/[?!,;:]+$/g, "").trim();
  if (!/\./.test(trimmed.slice(0, -1))) trimmed = trimmed.replace(/\.+$/g, "");
  if (!trimmed || trimmed.length > 80) return null;
  if (!/[a-zA-ZäöüÄÖÜß]/.test(trimmed)) return null;
  if (/[<>{}|\\]/.test(trimmed)) return null;
  return trimmed;
}

function tokensOf(input: string): string[] {
  return input
    .replace(/[.?!,;:]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function note(input: string, lemma: string, label: string): string {
  return `${input} → ${lemma}, ${label}`;
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLocaleLowerCase("de");
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function seedsOf(input: string, extra: Array<string | undefined>): string[] {
  return unique([input, ...extra.filter((item): item is string => Boolean(item))]).slice(0, 12);
}

function separableHints(base: string): string[] {
  const found: string[] = [];
  for (const [infinitive, verb] of Object.entries(VERBS)) {
    if (verb.separable && infinitive === `${verb.separable}${base}`) found.push(infinitive);
  }
  found.push(...(EXTRA_SEPARABLE[base] ?? []));
  return unique(found).slice(0, 6);
}

function verbReading(form: string): { lemma: string; label: string; hints: string[]; priority: "high" | "low" } | null {
  const key = form.toLocaleLowerCase("de");
  const hits = VERB_INDEX.get(key);
  if (!hits?.length) return null;
  if (hits.some((hit) => hit.lemma === key && hit.label === "infinitive")) return null;
  const plain = hits.filter((hit) => !hit.separable);
  const separable = hits.filter((hit) => hit.separable);
  const label = (plain[0] ?? separable[0]).label;
  if (plain.length) {
    const base = plain[0].lemma;
    const hints = label === "present" || label === "imperative" ? separableHints(base) : [];
    return { lemma: base, label, hints, priority: "high" };
  }
  const lemmas = unique(separable.map((hit) => hit.lemma));
  return { lemma: lemmas[0], label, hints: lemmas.slice(1), priority: "high" };
}

function matchingPrefix(lower: string, infix: "zu" | "ge"): { prefix: string; rest: string } | null {
  for (const prefix of SEPARABLE_PREFIXES) {
    const needle = prefix + infix;
    if (!lower.startsWith(needle)) continue;
    const rest = lower.slice(needle.length);
    if (rest.length < 3) continue;
    return { prefix, rest };
  }
  return null;
}

export function zuInfinitiveLemma(word: string): string | null {
  const found = matchingPrefix(word.toLocaleLowerCase("de"), "zu");
  if (!found) return null;
  if (!/(?:en|eln|ern)$/.test(found.rest)) return null;
  return found.prefix + found.rest;
}

export function participleLemma(word: string): string | null {
  const found = matchingPrefix(word.toLocaleLowerCase("de"), "ge");
  if (!found) return null;
  const mapped = PARTICIPLE_REST[found.rest];
  if (mapped) return found.prefix + mapped;
  if (found.rest.endsWith("et") && found.rest.length > 4) return found.prefix + found.rest.slice(0, -2) + "en";
  if (found.rest.endsWith("t") && !found.rest.endsWith("en")) return found.prefix + found.rest.slice(0, -1) + "en";
  if (found.rest.endsWith("en")) return found.prefix + found.rest;
  return null;
}

function reverseLastUmlaut(word: string): string {
  const chars = [...word];
  const map: Record<string, string> = { ä: "a", ö: "o", ü: "u", Ä: "A", Ö: "O", Ü: "U" };
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    const next = map[chars[i]];
    if (next) {
      chars[i] = next;
      return chars.join("");
    }
  }
  return word;
}

export function nounLemma(word: string): { lemma: string; label: string } | null {
  const trimmed = word.trim();
  const override = NOUN_OVERRIDE[trimmed.toLocaleLowerCase("de")];
  if (override && override.lemma.toLocaleLowerCase("de") !== trimmed.toLocaleLowerCase("de")) return override;
  if (trimmed.length < 4 || /\s/.test(trimmed)) return null;
  if (/[bcdfghjklmnpqrstvwxyzß]es$/i.test(trimmed) && trimmed.length >= 5) {
    return { lemma: trimmed.slice(0, -2), label: "genitive" };
  }
  if (trimmed.endsWith("n") && trimmed.length > 4) {
    const withoutN = trimmed.slice(0, -1);
    if (/(?:e|er|el)$/i.test(withoutN) && /[äöüÄÖÜ]/.test(withoutN)) {
      let stem = withoutN;
      if (stem.endsWith("er") && stem.length > 4) stem = stem.slice(0, -2);
      else if (stem.endsWith("e")) stem = stem.slice(0, -1);
      const lemma = reverseLastUmlaut(stem);
      if (lemma !== trimmed) return { lemma, label: "dative plural" };
    }
  }
  if (/en$/i.test(trimmed) && trimmed.length >= 6) {
    const stem = trimmed.slice(0, -2);
    if (stem.length >= 3 && stem.toLocaleLowerCase("de") !== trimmed.toLocaleLowerCase("de")) {
      return { lemma: stem, label: "plural" };
    }
  }
  return null;
}

function superlativeStem(surface: string): string | null {
  const match = surface.match(/^(.+?)(?:e?sten|e?ste)$/i);
  if (!match) return null;
  let stem = match[1];
  if (stem.length < 3) return null;
  if (stem.endsWith("ß")) stem = reverseLastUmlaut(stem);
  return stem;
}

export function adjectiveLemma(input: string): { lemma: string; label: string } | null {
  const am = input.match(/^am\s+(\p{L}+)$/u);
  if (am) {
    const stem = superlativeStem(am[1]);
    if (stem) return { lemma: stem.toLocaleLowerCase("de"), label: "superlative" };
  }
  if (/\s/.test(input)) return null;
  const word = input.toLocaleLowerCase("de");
  if (VERBS[word]) return null;
  const suffixes: Array<[string, string]> = [
    ["esten", "superlative"],
    ["esten", "superlative"],
    ["sten", "superlative"],
    ["este", "superlative"],
    ["ste", "superlative"],
    ["eren", "comparative"],
    ["erem", "comparative"],
    ["eres", "comparative"],
    ["erer", "comparative"],
    ["ere", "comparative"],
    ["er", "comparative"],
    ["en", "adjective ending"],
    ["em", "adjective ending"],
    ["es", "adjective ending"],
    ["e", "adjective ending"],
  ];
  for (const [suffix, label] of suffixes) {
    if (!word.endsWith(suffix) || word.length <= suffix.length + 2) continue;
    let stem = word.slice(0, -suffix.length);
    if (label === "superlative" && stem.endsWith("ß")) stem = reverseLastUmlaut(stem);
    if (stem.length < 3) continue;
    if (label === "comparative" && suffix === "er" && !ADJECTIVES.has(stem)) continue;
    if (label !== "comparative" && label !== "superlative" && !ADJECTIVES.has(stem)) continue;
    return { lemma: stem, label };
  }
  return null;
}

export function spellingVariants(input: string): SpellingVariant[] {
  const digraph = input
    .replace(/AE/g, "Ä")
    .replace(/OE/g, "Ö")
    .replace(/UE/g, "Ü")
    .replace(/Ae/g, "Ä")
    .replace(/Oe/g, "Ö")
    .replace(/Ue/g, "Ü")
    .replace(/ae/g, "ä")
    .replace(/oe/g, "ö")
    .replace(/ue/g, "ü")
    .replace(/ss/g, "ß");
  if (digraph !== input) return [{ lemma: digraph, label: "spelling" }];
  const first = input.charAt(0);
  const map: Record<string, string> = { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" };
  const next = map[first];
  if (!next) return [];
  return [{ lemma: next + input.slice(1), label: "missing umlaut" }];
}

function separablePhrase(words: string[]): { lemma: string; label: string } | null {
  if (words.length < 2) return null;
  const last = words[words.length - 1].toLocaleLowerCase("de");
  if (!SEPARABLE_PREFIXES.includes(last)) return null;
  for (const token of words.slice(0, -1)) {
    const reading = verbReading(token);
    if (!reading) continue;
    const base = reading.lemma;
    return { lemma: `${last}${base}`, label: "separable verb" };
  }
  return null;
}

function contentWords(words: string[]): { keywords: string[]; reflexive: boolean } {
  const reflexive = words.some((word) => word.toLocaleLowerCase("de") === "sich");
  const keywords = words.filter((word) => !STOP.has(word.toLocaleLowerCase("de")));
  return { keywords, reflexive };
}

function isCapital(word: string): boolean {
  const first = word.charAt(0);
  return first !== first.toLocaleLowerCase("de") && first === first.toLocaleUpperCase("de");
}

function directPlan(input: string, variants: SpellingVariant[]): LookupPlan {
  return {
    input,
    cacheKey: input.toLocaleLowerCase("de"),
    kind: "direct",
    priority: "low",
    variants,
    tryWikipedia: !input.includes(" "),
    seeds: seedsOf(input, variants.map((item) => item.lemma)),
  };
}

function singleWordPlan(input: string): LookupPlan {
  const variants = spellingVariants(input);
  if (VERBS[input.toLocaleLowerCase("de")]) return directPlan(input, variants);
  const variantLemmas = variants.map((item) => item.lemma);
  const verb = verbReading(input);
  if (verb) {
    return {
      input,
      cacheKey: input.toLocaleLowerCase("de"),
      kind: "verb",
      priority: verb.priority,
      lemma: verb.lemma,
      label: verb.label,
      note: note(input, verb.lemma, verb.label),
      hints: verb.hints,
      variants,
      tryWikipedia: false,
      seeds: seedsOf(input, [verb.lemma, ...variantLemmas, ...verb.hints]),
    };
  }
  const zu = zuInfinitiveLemma(input);
  if (zu) {
    return {
      input,
      cacheKey: input.toLocaleLowerCase("de"),
      kind: "verb",
      priority: "high",
      lemma: zu,
      label: "zu-infinitive",
      note: note(input, zu, "zu-infinitive"),
      variants,
      tryWikipedia: false,
      seeds: seedsOf(input, [zu, ...variantLemmas]),
    };
  }
  const participle = participleLemma(input);
  if (participle) {
    return {
      input,
      cacheKey: input.toLocaleLowerCase("de"),
      kind: "verb",
      priority: "low",
      lemma: participle,
      label: "past participle",
      note: note(input, participle, "past participle"),
      variants,
      tryWikipedia: false,
      seeds: seedsOf(input, [participle, ...variantLemmas]),
    };
  }
  if (isCapital(input)) {
    const noun = nounLemma(input);
    if (noun) {
      return {
        input,
        cacheKey: input.toLocaleLowerCase("de"),
        kind: "noun",
        priority: "high",
        lemma: noun.lemma,
        label: noun.label,
        note: note(input, noun.lemma, noun.label),
        variants,
        tryWikipedia: false,
        seeds: seedsOf(input, [noun.lemma, ...variantLemmas]),
      };
    }
  } else {
    const adjective = adjectiveLemma(input);
    const override = NOUN_OVERRIDE[input.toLocaleLowerCase("de")];
    const noun = override ? nounLemma(input.charAt(0).toLocaleUpperCase("de") + input.slice(1)) : null;
    if (adjective && ADJECTIVES.has(adjective.lemma.toLocaleLowerCase("de"))) {
      return {
        input,
        cacheKey: input.toLocaleLowerCase("de"),
        kind: "adjective",
        priority: "high",
        lemma: adjective.lemma,
        label: adjective.label,
        note: note(input, adjective.lemma, adjective.label),
        variants,
        tryWikipedia: false,
        seeds: seedsOf(input, [adjective.lemma, ...variantLemmas]),
      };
    }
    if (noun) {
      return {
        input,
        cacheKey: input.toLocaleLowerCase("de"),
        kind: "noun",
        priority: "high",
        lemma: noun.lemma,
        label: noun.label,
        note: note(input, noun.lemma, noun.label),
        variants,
        tryWikipedia: false,
        seeds: seedsOf(input, [noun.lemma, ...variantLemmas]),
      };
    }
    if (adjective) {
      return {
        input,
        cacheKey: input.toLocaleLowerCase("de"),
        kind: "adjective",
        priority: "high",
        lemma: adjective.lemma,
        label: adjective.label,
        note: note(input, adjective.lemma, adjective.label),
        variants,
        tryWikipedia: false,
        seeds: seedsOf(input, [adjective.lemma, ...variantLemmas]),
      };
    }
  }
  const compound = segmentCompound(input);
  if (compound) {
    return {
      input,
      cacheKey: input.toLocaleLowerCase("de"),
      kind: "compound",
      priority: "low",
      note: `${input} → ${compound.parts.map((part) => part.word).join(" + ")}, compound`,
      compound,
      variants,
      tryWikipedia: false,
      seeds: seedsOf(input, [...compound.parts.map((part) => part.word), ...variantLemmas]),
    };
  }
  if (variants.length) {
    const primary = variants[0];
    const through = nounLemma(primary.lemma) ?? adjectiveLemma(primary.lemma);
    return {
      input,
      cacheKey: input.toLocaleLowerCase("de"),
      kind: "spelling",
      priority: "low",
      lemma: through?.lemma ?? primary.lemma,
      label: through?.label ?? primary.label,
      note: note(input, through?.lemma ?? primary.lemma, through?.label ?? primary.label),
      variants,
      tryWikipedia: true,
      seeds: seedsOf(input, [primary.lemma, through?.lemma, ...variantLemmas]),
    };
  }
  return directPlan(input, variants);
}

export function interpretLookup(raw: string): LookupPlan | null {
  const input = cleanInput(raw);
  if (!input) return null;
  const abbreviation = lookupAbbreviation(input);
  if (abbreviation) {
    return {
      input,
      cacheKey: input.toLocaleLowerCase("de"),
      kind: "abbreviation",
      priority: "high",
      note: `${input} → ${abbreviation.expansion}, ${abbreviation.en}`,
      abbreviation,
      variants: [],
      tryWikipedia: false,
      seeds: [],
    };
  }
  const words = tokensOf(input);
  if (words.length >= 2) {
    const split = separablePhrase(words);
    if (split) {
      return {
        input,
        cacheKey: input.toLocaleLowerCase("de"),
        kind: "separable",
        priority: "high",
        lemma: split.lemma,
        label: split.label,
        note: note(input, split.lemma, split.label),
        variants: spellingVariants(split.lemma),
        tryWikipedia: false,
        seeds: seedsOf(input, [split.lemma]),
      };
    }
    const am = adjectiveLemma(input);
    if (am && /^am\s+/i.test(input)) {
      return {
        input,
        cacheKey: input.toLocaleLowerCase("de"),
        kind: "adjective",
        priority: "high",
        lemma: am.lemma,
        label: am.label,
        note: note(input, am.lemma, am.label),
        variants: [],
        tryWikipedia: false,
        seeds: seedsOf(input, [am.lemma]),
      };
    }
    if (words.length === 2 && words[0].toLocaleLowerCase("de") === "zu" && /(?:en|eln|ern)$/i.test(words[1])) {
      const lemma = words[1].toLocaleLowerCase("de");
      return {
        input,
        cacheKey: input.toLocaleLowerCase("de"),
        kind: "verb",
        priority: "high",
        lemma,
        label: "zu-infinitive",
        note: note(input, lemma, "zu-infinitive"),
        variants: [],
        tryWikipedia: false,
        seeds: seedsOf(input, [lemma]),
      };
    }
    if (words.length === 2 && ARTICLES.has(words[0].toLocaleLowerCase("de"))) {
      const noun = nounLemma(words[1]);
      if (noun) {
        return {
          input,
          cacheKey: input.toLocaleLowerCase("de"),
          kind: "noun",
          priority: "high",
          lemma: noun.lemma,
          label: noun.label,
          note: note(input, noun.lemma, noun.label),
          variants: spellingVariants(words[1]),
          tryWikipedia: false,
          seeds: seedsOf(words[1], [noun.lemma]),
        };
      }
    }
    const { keywords, reflexive } = contentWords(words);
    const shown = keywords.length ? keywords : words;
    const label = reflexive ? "reflexive" : "phrase";
    return {
      input,
      cacheKey: input.toLocaleLowerCase("de"),
      kind: "phrase",
      priority: "low",
      note: `${input} → ${shown.join(" + ")}, ${label}`,
      keywords: shown,
      variants: [],
      tryWikipedia: false,
      seeds: seedsOf(input, shown),
    };
  }
  return singleWordPlan(input);
}

function lexicalTitle(lexical: Map<string, string>, lemma: string | undefined): string | null {
  if (!lemma) return null;
  return lexical.get(lemma.toLocaleLowerCase("de")) ?? null;
}

/** Choose which fetched page to show. `lexical` maps a lowercase title to its display title. */
export function pickLookup(plan: LookupPlan, lexical: Map<string, string>): PickResult {
  const inputTitle = lexicalTitle(lexical, plan.input);
  if (plan.kind === "phrase") {
    const keys: string[] = [];
    const push = (title: string | null) => {
      if (!title) return;
      if (keys.some((key) => key.toLocaleLowerCase("de") === title.toLocaleLowerCase("de"))) return;
      keys.push(title);
    };
    push(inputTitle);
    for (const word of plan.keywords ?? []) push(lexicalTitle(lexical, word));
    if (keys.length) {
      return {
        type: "phrase",
        keys,
        interpretation: plan.note ?? plan.input,
      };
    }
  }
  if (plan.priority === "high" && plan.lemma) {
    const title = lexicalTitle(lexical, plan.lemma);
    if (title) {
      const same = title.toLocaleLowerCase("de") === plan.input.toLocaleLowerCase("de");
      return {
        type: "entry",
        key: title.toLocaleLowerCase("de"),
        interpretation: same || !plan.label ? undefined : note(plan.input, title, plan.label),
        hints: plan.hints,
      };
    }
  }
  if (inputTitle) {
    const spelling = plan.variants.find(
      (variant) =>
        lexicalTitle(lexical, variant.lemma) === inputTitle &&
        variant.lemma.toLocaleLowerCase("de") !== plan.input.toLocaleLowerCase("de"),
    );
    if (spelling && inputTitle.toLocaleLowerCase("de") !== plan.input.toLocaleLowerCase("de")) {
      return {
        type: "entry",
        key: inputTitle.toLocaleLowerCase("de"),
        interpretation: note(plan.input, inputTitle, spelling.label),
      };
    }
    const suggestions: LookupSuggestion[] = [];
    if (plan.lemma && plan.lemma.toLocaleLowerCase("de") !== inputTitle.toLocaleLowerCase("de")) {
      suggestions.push({ lemma: plan.lemma, label: plan.label });
    }
    return { type: "entry", key: inputTitle.toLocaleLowerCase("de"), hints: plan.hints, suggestions };
  }
  if (plan.lemma) {
    const title = lexicalTitle(lexical, plan.lemma);
    if (title && plan.label) {
      return {
        type: "entry",
        key: title.toLocaleLowerCase("de"),
        interpretation: note(plan.input, title, plan.label),
        hints: plan.hints,
      };
    }
  }
  for (const variant of plan.variants) {
    const title = lexicalTitle(lexical, variant.lemma);
    if (title) {
      return {
        type: "entry",
        key: title.toLocaleLowerCase("de"),
        interpretation: note(plan.input, title, variant.label),
      };
    }
  }
  if (plan.keywords?.length) {
    const keys = plan.keywords.map((word) => lexicalTitle(lexical, word)).filter((title): title is string => Boolean(title));
    if (keys.length) return { type: "phrase", keys: keys.map((title) => title.toLocaleLowerCase("de")), interpretation: plan.note ?? plan.input };
  }
  if (plan.compound && plan.compound.parts.length >= 2) {
    return { type: "compound", interpretation: plan.note ?? plan.input };
  }
  const suggestions: LookupSuggestion[] = [];
  if (plan.lemma && plan.label) suggestions.push({ lemma: plan.lemma, label: plan.label });
  for (const variant of plan.variants) suggestions.push({ lemma: variant.lemma, label: variant.label });
  return { type: "missing", suggestions };
}
