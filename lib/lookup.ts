import {
  entryId,
  posBucket,
  type Article,
  type WortbankDraft,
  type WortbankEntry,
} from "@/lib/wortbank";

export type LookupExample = { de: string; en?: string };

export type LookupSense = {
  lemma: string;
  pos: string;
  posLabel: string;
  meanings: string[];
  articles: Article[];
  plural?: string;
  ipa?: string;
  /** Commons file name, before it is turned into a URL. */
  audioFile?: string;
  audio?: string;
  examples: LookupExample[];
  related: string[];
  /** True, false, or omitted when the dictionary did not say. */
  separable?: boolean;
  inseparable?: boolean;
  prefix?: string;
  praeteritum?: string;
  partizip?: string;
  aux?: "haben" | "sein";
  /** Short German definition, shown only when no English sense was found. */
  germanGloss?: string;
  enSource?: "wiktionary" | "mymemory";
};

export type LookupCard = {
  title: string;
  /** Wiktionary had no German entry; only a translation is available. */
  partial: boolean;
  senses: LookupSense[];
};

const ARTICLE: Record<"m" | "f" | "n", Article> = { m: "der", f: "die", n: "das" };

const POS_LABEL: Record<string, string> = {
  noun: "Noun",
  verb: "Verb",
  adjective: "Adjective",
  adverb: "Adverb",
  pronoun: "Pronoun",
  preposition: "Preposition",
  conjunction: "Conjunction",
  article: "Article",
  numeral: "Numeral",
  interjection: "Interjection",
  participle: "Participle",
  phrase: "Phrase",
  word: "Word",
};

const DE_POS: Record<string, string> = {
  substantiv: "noun",
  verb: "verb",
  adjektiv: "adjective",
  adverb: "adverb",
  pronomen: "pronoun",
  präposition: "preposition",
  praeposition: "preposition",
  konjunktion: "conjunction",
  artikel: "article",
  numerale: "numeral",
  interjektion: "interjection",
  partizip: "participle",
  nachname: "noun",
  toponym: "noun",
};

const EN_POS: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  pronoun: "pronoun",
  preposition: "preposition",
  conjunction: "conjunction",
  article: "article",
  determiner: "article",
  numeral: "numeral",
  interjection: "interjection",
  participle: "participle",
  phrase: "phrase",
};

const INSEPARABLE_PREFIXES = ["miss", "emp", "ent", "ver", "zer", "be", "er"];

export function normalizeQuery(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, " ").replace(/[.?!,;:]+$/g, "");
  const stripped = trimmed.replace(/^(?:der|die|das|ein|eine|einen|einem|einer|dem|den)\s+/i, "");
  if (!stripped || stripped.length > 80) return null;
  if (!/[a-zA-ZäöüÄÖÜß]/.test(stripped)) return null;
  if (/[<>{}|\\/]/.test(stripped)) return null;
  return stripped;
}

export function queryCandidates(query: string): string[] {
  const out: string[] = [];
  const push = (value: string) => {
    if (value && !out.includes(value)) out.push(value);
  };
  push(query);
  push(query.charAt(0).toLocaleUpperCase("de") + query.slice(1));
  push(query.charAt(0).toLocaleLowerCase("de") + query.slice(1));
  return out;
}

export function normalizeLemma(value: string): string {
  return value
    .trim()
    .replace(/^(?:der|die|das|ein|eine)\s+/i, "")
    .replace(/\|/g, "")
    .toLocaleLowerCase("de");
}

export function commonsAudioUrl(file: string): string {
  const name = file.trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}`;
}

type WikiPage = { title: string; missing: boolean; wikitext: string | null };

/** MediaWiki `action=query&prop=revisions` payload (formatversion=2). */
export function readRevisionPages(payload: unknown): WikiPage[] {
  if (!payload || typeof payload !== "object") return [];
  const pages = (payload as { query?: { pages?: unknown } }).query?.pages;
  if (!Array.isArray(pages)) return [];
  const out: WikiPage[] = [];
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const row = page as {
      title?: unknown;
      missing?: unknown;
      revisions?: Array<{ slots?: { main?: { content?: unknown } } }>;
    };
    const title = typeof row.title === "string" ? row.title : "";
    if (!title) continue;
    const content = row.revisions?.[0]?.slots?.main?.content;
    const wikitext = typeof content === "string" ? content : null;
    out.push({ title, missing: Boolean(row.missing) || !wikitext, wikitext });
  }
  return out;
}

export function parseMyMemory(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as {
    responseStatus?: unknown;
    responseData?: { translatedText?: unknown };
    responseDetails?: unknown;
  };
  if (row.responseStatus !== 200) return null;
  const details = typeof row.responseDetails === "string" ? row.responseDetails : "";
  if (/invalid|error|quota/i.test(details)) return null;
  const text = typeof row.responseData?.translatedText === "string" ? row.responseData.translatedText.trim() : "";
  if (!text || /MYMEMORY WARNING|QUERY LENGTH LIMIT|EXAMPLE REQUEST/i.test(text)) return null;
  return text;
}

/**
 * Pick the German entry. An exact case match wins when it really is German
 * (`hund` is Danish; `Hund` is the noun the learner wants).
 */
export function chooseGermanPage(
  pages: WikiPage[],
  query: string,
  source: "de" | "en",
): { title: string; wikitext: string } | null {
  const usable = pages.filter((page): page is { title: string; missing: boolean; wikitext: string } => {
    if (!page.wikitext) return false;
    return source === "de" ? germanSectionDe(page.wikitext) !== null : germanSectionEn(page.wikitext) !== null;
  });
  if (!usable.length) return null;
  const exact = usable.find((page) => page.title === query);
  if (exact) return { title: exact.title, wikitext: exact.wikitext };
  const folded = query.toLocaleLowerCase("de");
  const insensitive = usable.find((page) => page.title.toLocaleLowerCase("de") === folded);
  const chosen = insensitive ?? usable[0];
  return { title: chosen.title, wikitext: chosen.wikitext };
}

export function assembleLookup(parts: {
  title?: string;
  deWikitext?: string | null;
  enWikitext?: string | null;
  restDefinition?: unknown;
  translation?: string | null;
}): LookupCard | null {
  const deTitle = parts.deWikitext ? headingLemma(parts.deWikitext) : undefined;
  const title = (deTitle || parts.title || "").trim();
  const deSenses = parts.deWikitext && title ? parseDeWikitext(parts.deWikitext, title) : [];
  const enTitle = title || parts.title || "";
  const enSenses = parts.enWikitext && enTitle ? parseEnWikitext(parts.enWikitext, enTitle) : [];
  const restSenses = parseRestDefinition(parts.restDefinition, enTitle || title);
  const merged = mergeSenses(deSenses, enSenses, restSenses);
  const translation = parts.translation?.trim() || "";

  if (!merged.length) {
    if (!translation || !enTitle) return null;
    return {
      title: enTitle,
      partial: true,
      senses: [applyTranslation(emptySense(enTitle, "word"), translation)],
    };
  }

  const cleaned = dropNoiseSenses(merged.map((sense) => finalizeVerb(cleanSense(sense))));
  const senses = cleaned.map((sense) => (sense.meanings.length || !translation ? sense : applyTranslation(sense, translation)));
  if (!senses.length) {
    if (!translation || !enTitle) return null;
    return { title: enTitle, partial: true, senses: [applyTranslation(emptySense(enTitle, "word"), translation)] };
  }
  return { title: senses[0]?.lemma || enTitle, partial: false, senses };
}

export function findSavedEntry(entries: WortbankEntry[], sense: Pick<LookupSense, "lemma" | "pos">): WortbankEntry | undefined {
  const lemma = normalizeLemma(sense.lemma);
  const bucket = bucketOf(sense.pos);
  return entries.find((entry) => normalizeLemma(entry.lemma) === lemma && bucketOf(entry.pos) === bucket);
}

export function lookupToDraft(sense: LookupSense): WortbankDraft {
  const articles = sense.articles;
  const article = articles.length === 1 ? articles[0] : undefined;
  const head = headword(sense);
  const meanings = sense.meanings.slice(0, 4);
  const draft: WortbankDraft = {
    lessonId: "lookup",
    lessonTitle: "Lookup",
    lessonKind: "lookup",
    key: `${normalizeLemma(sense.lemma)}:${bucketOf(sense.pos)}`,
    surface: head,
    lemma: sense.lemma,
    pos: sense.pos,
    de: head,
    en: meanings.slice(0, 2).join("; "),
    emoji: emojiFor(sense.pos),
    sentence: sense.examples[0]?.de ?? "",
    href: "/nachschlagen",
    source: "Lookup",
  };
  return assignDefined(draft, {
    article,
    articles: articles.length ? articles : undefined,
    plural: sense.plural,
    ipa: sense.ipa,
    audio: sense.audio,
    meanings: meanings.length ? meanings : undefined,
    examples: sense.examples.length ? sense.examples.slice(0, 2) : undefined,
    related: sense.related.length ? sense.related.slice(0, 6) : undefined,
    separable: sense.separable,
    inseparable: sense.inseparable,
    prefix: sense.prefix,
    praeteritum: sense.praeteritum,
    partizip: sense.partizip,
    aux: sense.aux,
    enSource: sense.enSource,
  });
}

export function lookupEntryId(sense: LookupSense): string {
  const draft = lookupToDraft(sense);
  return entryId(draft.lessonId, draft.key);
}

export function headword(sense: Pick<LookupSense, "lemma" | "articles" | "separable" | "prefix">): string {
  if (sense.separable && sense.prefix) {
    const lemma = sense.lemma;
    const prefix = sense.prefix;
    if (lemma.toLocaleLowerCase("de").startsWith(prefix.toLocaleLowerCase("de"))) {
      return `${lemma.slice(0, prefix.length)}|${lemma.slice(prefix.length)}`;
    }
  }
  if (sense.articles.length === 1) return `${sense.articles[0]} ${sense.lemma}`;
  if (sense.articles.length > 1) return `${sense.articles.join("/")} ${sense.lemma}`;
  return sense.lemma;
}

function bucketOf(pos: string): string {
  if (/compound/i.test(pos)) return "noun";
  return posBucket(pos);
}

function emojiFor(pos: string): string {
  if (pos === "noun") return "📗";
  if (pos === "verb") return "🔹";
  if (pos === "adjective") return "✨";
  return "🔤";
}

function assignDefined<T extends object>(base: T, extra: Record<string, unknown>): T {
  const next = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) next[key] = value;
  }
  return next as T;
}

function emptySense(lemma: string, pos: string): LookupSense {
  return {
    lemma,
    pos,
    posLabel: POS_LABEL[pos] ?? "Word",
    meanings: [],
    articles: [],
    examples: [],
    related: [],
  };
}

function applyTranslation(sense: LookupSense, translation: string): LookupSense {
  if (sense.meanings.length) return { ...sense, enSource: sense.enSource ?? "wiktionary" };
  return { ...sense, meanings: [translation], enSource: "mymemory" };
}

function cleanSense(sense: LookupSense): LookupSense {
  return {
    ...sense,
    meanings: uniq(sense.meanings.map(tidyMeaning).filter((item): item is string => Boolean(item))).slice(0, 4),
    examples: sense.examples
      .map((example) => ({ de: tidyMeaning(example.de) ?? "", en: example.en ? tidyMeaning(example.en) ?? undefined : undefined }))
      .filter((example) => example.de.length > 1),
    related: sense.related.filter((word) => !isGrammarLabel(word)),
  };
}

function dropNoiseSenses(senses: LookupSense[]): LookupSense[] {
  const meaningful = senses.filter((sense) => sense.pos !== "word" || senses.length === 1);
  const kept = meaningful.filter((sense) => senseHasContent(sense) && (sense.pos !== "word" || sense.meanings.length || sense.germanGloss));
  return kept.length ? kept : meaningful.filter((sense) => senseHasContent(sense));
}

function tidyMeaning(value: string): string | null {
  const text = value
    .replace(/\.mw-parser-output[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[([{]\s*$/g, "")
    .trim();
  if (!text || text.length < 2) return null;
  if (/^(nominative|accusative|genitive|dative|singular|plural)\b/i.test(text)) return null;
  if (/\b(plural|inflection) of\b/i.test(text)) return null;
  if (/[{}]/.test(text) || /\.mw-parser-output/i.test(text)) return null;
  return text;
}

function isGrammarLabel(word: string): boolean {
  return /^(adjektiv|substantiv|verb|adverb|nomen|partizip|pronomen|artikel|konjunktion|präposition|praeposition|interjektion|plural|singular|wortart|eigenname)$/i.test(
    word.trim(),
  );
}

function finalizeVerb(sense: LookupSense): LookupSense {
  if (sense.pos !== "verb") return sense;
  if (sense.separable) return { ...sense, separable: true, inseparable: false };
  if (sense.partizip && looksInseparable(sense.lemma, sense.partizip)) {
    return { ...sense, separable: false, inseparable: true };
  }
  if (sense.partizip || sense.praeteritum || sense.separable === false) {
    return { ...sense, separable: false, inseparable: false };
  }
  return sense;
}

function looksInseparable(lemma: string, partizip: string): boolean {
  const word = lemma.toLocaleLowerCase("de");
  const prefix = INSEPARABLE_PREFIXES.find((item) => word.startsWith(item) && word.length > item.length + 2);
  if (!prefix) return false;
  const form = partizip.toLocaleLowerCase("de");
  if (form.startsWith("ge") && !word.startsWith("ge")) return false;
  return true;
}

function cloneSense(sense: LookupSense): LookupSense {
  return {
    ...sense,
    meanings: [...sense.meanings],
    examples: [...sense.examples],
    related: [...sense.related],
    articles: [...sense.articles],
  };
}

function mergeSenses(deSenses: LookupSense[], enSenses: LookupSense[], restSenses: LookupSense[]): LookupSense[] {
  const base = (deSenses.length ? deSenses : enSenses.length ? enSenses : restSenses).map(cloneSense);
  const extras = deSenses.length ? [...enSenses, ...restSenses] : enSenses.length ? restSenses : [];
  for (const extra of extras) {
    const matches = base.filter((sense) => sense.pos === extra.pos);
    if (!matches.length) {
      base.push(cloneSense(extra));
      continue;
    }
    const target = matches.find((sense) => !sense.meanings.length) ?? matches[0];
    const index = base.indexOf(target);
    base[index] = overlay(target, extra);
  }
  return base.filter((sense) => senseHasContent(sense));
}

function senseHasContent(sense: LookupSense): boolean {
  return Boolean(
    sense.meanings.length ||
      sense.articles.length ||
      sense.plural ||
      sense.ipa ||
      sense.examples.length ||
      sense.praeteritum ||
      sense.partizip ||
      sense.germanGloss ||
      sense.separable,
  );
}

function overlay(base: LookupSense, extra: LookupSense): LookupSense {
  const meanings = uniq([...extra.meanings, ...base.meanings]);
  const separable = base.separable === true || extra.separable === true ? true : (base.separable ?? extra.separable);
  const examples = [...extra.examples, ...base.examples].filter((example, index, all) => {
    const key = example.de.toLocaleLowerCase("de");
    return all.findIndex((item) => item.de.toLocaleLowerCase("de") === key) === index;
  });
  examples.sort((a, b) => Number(Boolean(b.en)) - Number(Boolean(a.en)));
  return {
    ...base,
    lemma: base.lemma || extra.lemma,
    posLabel: base.posLabel || extra.posLabel,
    meanings: meanings.slice(0, 4),
    articles: base.articles.length ? base.articles : extra.articles,
    plural: base.plural || extra.plural,
    ipa: preferIpa(base.ipa, extra.ipa),
    audioFile: base.audioFile || extra.audioFile,
    audio: base.audio || extra.audio,
    examples: examples.slice(0, 2),
    related: uniq([...base.related, ...extra.related]).slice(0, 6),
    separable,
    prefix: base.prefix || extra.prefix,
    praeteritum: base.praeteritum || extra.praeteritum,
    partizip: base.partizip || extra.partizip,
    aux: base.aux || extra.aux,
    germanGloss: base.germanGloss || extra.germanGloss,
    enSource: meanings.length ? "wiktionary" : base.enSource,
  };
}

function preferIpa(primary?: string, secondary?: string): string | undefined {
  const ranked = [primary, secondary].filter((item): item is string => Boolean(item));
  return ranked.find((item) => item.startsWith("/")) ?? ranked[0];
}

function parseDeWikitext(wikitext: string, title: string): LookupSense[] {
  const section = germanSectionDe(wikitext);
  if (!section) return [];
  const lemma = headingLemma(wikitext) || title;
  const blocks = level3Blocks(section).filter((block) => /Wortart\|/i.test(block.title));
  const senses = (blocks.length ? blocks : [{ title: "", body: section }]).map((block) =>
    parseDeBlock(block.title, block.body, lemma),
  );
  if (senses.length === 1 && senses[0] && !senses[0].meanings.length) {
    senses[0].meanings = englishGlosses(section).slice(0, 4);
    if (senses[0].meanings.length) senses[0].enSource = "wiktionary";
  }
  return senses.filter(Boolean) as LookupSense[];
}

function parseDeBlock(heading: string, body: string, lemma: string): LookupSense {
  const wortarten = [...heading.matchAll(/\{\{Wortart\|([^|}]+)/gi)].map((match) => match[1].trim().toLocaleLowerCase("de"));
  const pos = DE_POS[wortarten[0] ?? ""] ?? "word";
  const qualifier = wortarten.slice(1).map(qualifierLabel).filter(Boolean);
  const sense = emptySense(lemma, pos);
  sense.posLabel = qualifier.length ? `${POS_LABEL[pos] ?? "Word"} · ${qualifier.join(", ")}` : POS_LABEL[pos] ?? "Word";

  const noun = extractTemplate(body, "{{Deutsch Substantiv Übersicht");
  const verb = extractTemplate(body, "{{Deutsch Verb Übersicht");
  const articles = articlesFromDe(noun ?? "", heading);
  sense.articles = pos === "noun" ? articles : [];
  if (noun) {
    const params = namedParams(noun);
    const plural = cleanInline(params["nominativ plural"] ?? "");
    if (plural && !/^[-–—]$/.test(plural) && !/^(kein|ohne)\b/i.test(plural)) sense.plural = plural;
  }
  if (verb || pos === "verb") {
    const params = verb ? namedParams(verb) : {};
    const present = params["präsens_ich"] || params["praesens_ich"] || "";
    const past = params["präteritum_ich"] || params["praeteritum_ich"] || "";
    const partizip = params["partizip ii"] || "";
    const aux = (params["hilfsverb"] || "").toLocaleLowerCase("de");
    const split = present.trim().split(/\s+/);
    if (split.length >= 2 && lemma.toLocaleLowerCase("de").startsWith(split[split.length - 1].toLocaleLowerCase("de"))) {
      sense.separable = true;
      sense.prefix = split[split.length - 1].toLocaleLowerCase("de");
    }
    if (past) sense.praeteritum = cleanInline(past);
    if (partizip) sense.partizip = cleanInline(partizip);
    if (aux.startsWith("sein")) sense.aux = "sein";
    else if (aux.startsWith("haben")) sense.aux = "haben";
    if (verb) sense.separable = sense.separable ?? false;
  }

  const ipa = firstMatch(body, /\{\{Lautschrift\|([^|}]+)/i);
  if (ipa) sense.ipa = wrapIpa(ipa);
  const audio = bestAudioFile([...body.matchAll(/\{\{Audio\|([^|}]+)/gi)].map((match) => match[1]));
  if (audio) {
    sense.audioFile = audio;
    sense.audio = commonsAudioUrl(audio);
  }
  sense.meanings = englishGlosses(body).slice(0, 4);
  if (sense.meanings.length) sense.enSource = "wiktionary";
  sense.examples = deExamples(body).slice(0, 2);
  sense.related = deRelated(body, lemma);
  const gloss = deGloss(body);
  if (gloss) sense.germanGloss = gloss;
  return sense;
}

function parseEnWikitext(wikitext: string, title: string): LookupSense[] {
  const section = germanSectionEn(wikitext);
  if (!section) return [];
  const blocks = level3Blocks(section);
  let pronunciation = "";
  const senses: LookupSense[] = [];
  for (const block of blocks) {
    const titleText = block.title.replace(/\{\{[^}]+\}\}/g, "").trim();
    if (/^pronunciation$/i.test(titleText)) {
      pronunciation = block.body;
      continue;
    }
    const pos = EN_POS[titleText.toLocaleLowerCase("en")];
    if (!pos) continue;
    senses.push(parseEnBlock(pos, titleText, block.body, pronunciation, title));
  }
  return senses;
}

function parseEnBlock(pos: string, label: string, body: string, pronunciation: string, lemma: string): LookupSense {
  const sense = emptySense(lemma, pos);
  sense.posLabel = POS_LABEL[pos] ?? label;
  const sound = `${pronunciation}\n${body}`;
  const ipa = firstIpa(sound);
  if (ipa) sense.ipa = ipa;
  const audio = bestAudioFile([...sound.matchAll(/\{\{audio\|de\|([^|}]+)/gi)].map((match) => match[1]));
  if (audio) {
    sense.audioFile = audio;
    sense.audio = commonsAudioUrl(audio);
  }
  if (pos === "noun") {
    const noun = extractTemplate(body, "{{de-noun");
    if (noun) {
      const arg = templateArgs(noun).positional[0] ?? "";
      const parsed = parseDeNounArg(arg, lemma);
      sense.articles = parsed.articles;
      sense.plural = parsed.plural;
    }
  }
  if (pos === "verb") {
    const verb = extractTemplate(body, "{{de-verb");
    if (verb) {
      const arg = templateArgs(verb).positional[0] ?? "";
      const parsed = parseDeVerbArg(arg, lemma);
      Object.assign(sense, parsed);
    }
  }
  sense.meanings = glossLines(body).slice(0, 4);
  if (sense.meanings.length) sense.enSource = "wiktionary";
  sense.examples = enExamples(body).slice(0, 2);
  sense.related = enRelated(body, lemma);
  return sense;
}

function parseDeNounArg(arg: string, lemma: string): { articles: Article[]; plural?: string } {
  const pieces = splitDelim(arg, ",");
  const articles = genderLetters(pieces[0] ?? "").map((letter) => ARTICLE[letter]);
  const code = pieces[2];
  const plural = code !== undefined && code.trim() ? applyPlural(lemma, code.trim()) : undefined;
  return { articles, plural };
}

function parseDeVerbArg(arg: string, lemma: string): Pick<LookupSense, "separable" | "prefix" | "praeteritum" | "partizip" | "aux"> {
  const angled = arg.match(/^(.*?)<([^<>]+)>\s*$/);
  const base = (angled ? angled[1] : arg).trim();
  const forms = angled ? angled[2] : "";
  let separable = false;
  let prefix: string | undefined;
  if (base.includes(".")) {
    prefix = base.slice(0, base.indexOf(".")).toLocaleLowerCase("de");
    if (lemma.toLocaleLowerCase("de").startsWith(prefix)) separable = true;
    else prefix = undefined;
  }
  const formParts = forms ? splitDelim(forms, ",").map((item) => item.trim()).filter(Boolean) : [];
  const pastRaw = formParts[0]?.split(":")[0]?.trim();
  let partizip = formParts[1]?.trim();
  let aux: "haben" | "sein" | undefined;
  if (partizip && /\.sein\b/.test(partizip)) aux = "sein";
  else if (partizip) aux = "haben";
  if (partizip) partizip = partizip.replace(/\.sein$/, "").replace(/\.haben$/, "").split(":")[0].trim();
  let praeteritum = pastRaw;
  if (separable && praeteritum && prefix && !praeteritum.split(/\s+/).some((token) => token.toLocaleLowerCase("de") === prefix)) {
    praeteritum = `${praeteritum} ${prefix}`;
  }
  return {
    separable,
    prefix: separable ? prefix : undefined,
    praeteritum: praeteritum || undefined,
    partizip: partizip || undefined,
    aux,
  };
}

/** English Wiktionary `de-noun` plural code, applied to the lemma. */
export function applyPlural(lemma: string, raw: string): string | undefined {
  const code = raw.replace(/\[[^\]]*\]/g, "").trim();
  const primary = splitDelim(code, ":")[0]?.trim() ?? "";
  if (!primary || primary === "?") return undefined;
  if (primary === "-" || primary === "–" || primary === "—") return lemma;
  const umlauted = primary.startsWith("^");
  const ending = umlauted ? primary.slice(1) : primary;
  const stem = umlauted ? umlautStem(lemma) : lemma;
  return applyEnding(stem, ending);
}

function applyEnding(stem: string, ending: string): string | undefined {
  if (ending === "") return stem;
  if (ending === "(e)n") return /e$/i.test(stem) ? `${stem}n` : `${stem}en`;
  if (/^(?:e|er|n|en|s|se)$/.test(ending)) return stem + ending;
  return undefined;
}

function umlautStem(word: string): string {
  const chars = [...word];
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    const prev = chars[i - 1] ?? "";
    if (prev.toLocaleLowerCase("de") === "a" && chars[i].toLocaleLowerCase("de") === "u") {
      chars.splice(i - 1, 2, prev === "A" ? "Äu" : "äu");
      return chars.join("");
    }
    const lower = chars[i].toLocaleLowerCase("de");
    if (lower === "a" || lower === "o" || lower === "u") {
      const mapped = lower === "a" ? "ä" : lower === "o" ? "ö" : "ü";
      chars[i] = chars[i] === lower ? mapped : mapped.toLocaleUpperCase("de");
      return chars.join("");
    }
  }
  return word;
}

function genderLetters(code: string): Array<"m" | "f" | "n"> {
  const head = code.trim().toLocaleLowerCase("de");
  const out: Array<"m" | "f" | "n"> = [];
  for (const letter of head) {
    if ((letter === "m" || letter === "f" || letter === "n") && !out.includes(letter)) out.push(letter);
    if (/[^mfn]/.test(letter)) break;
  }
  return out;
}

function articlesFromDe(nounTemplate: string, heading: string): Article[] {
  const params = nounTemplate ? namedParams(nounTemplate) : {};
  const genus = params.genus ?? "";
  const fromGenus = genderLetters(genus);
  if (fromGenus.length) return fromGenus.map((letter) => ARTICLE[letter]);
  const letters: Array<"m" | "f" | "n"> = [];
  for (const match of heading.matchAll(/\{\{([mfn]{1,3})\}\}/gi)) {
    for (const letter of genderLetters(match[1])) {
      if (!letters.includes(letter)) letters.push(letter);
    }
  }
  return letters.map((letter) => ARTICLE[letter]);
}

function parseRestDefinition(payload: unknown, lemma: string): LookupSense[] {
  if (!payload || typeof payload !== "object") return [];
  const german = (payload as { de?: unknown }).de;
  if (!Array.isArray(german)) return [];
  const senses: LookupSense[] = [];
  for (const block of german) {
    if (!block || typeof block !== "object") continue;
    const row = block as { partOfSpeech?: unknown; language?: unknown; definitions?: unknown };
    if (typeof row.language === "string" && row.language !== "German") continue;
    const posName = typeof row.partOfSpeech === "string" ? row.partOfSpeech : "Word";
    const pos = EN_POS[posName.toLocaleLowerCase("en")] ?? "word";
    const sense = emptySense(lemma, pos);
    sense.posLabel = POS_LABEL[pos] ?? posName;
    const definitions = Array.isArray(row.definitions) ? row.definitions : [];
    for (const definition of definitions) {
      if (!definition || typeof definition !== "object") continue;
      const item = definition as { definition?: unknown; parsedExamples?: unknown; examples?: unknown };
      const meaning = typeof item.definition === "string" ? stripHtml(item.definition) : "";
      if (meaning) sense.meanings.push(meaning);
      const parsed = Array.isArray(item.parsedExamples) ? item.parsedExamples : [];
      for (const example of parsed) {
        if (!example || typeof example !== "object") continue;
        const ex = example as { example?: unknown; translation?: unknown };
        const de = typeof ex.example === "string" ? stripHtml(ex.example) : "";
        const en = typeof ex.translation === "string" ? stripHtml(ex.translation) : "";
        if (de) sense.examples.push({ de, en: en || undefined });
      }
    }
    sense.meanings = uniq(sense.meanings).slice(0, 4);
    sense.examples = sense.examples.slice(0, 2);
    if (sense.meanings.length) sense.enSource = "wiktionary";
    if (sense.meanings.length || sense.examples.length) senses.push(sense);
  }
  return senses;
}

export function germanSectionDe(wikitext: string): string | null {
  const match = /(?:^|\n)==[^\n]*\(\{\{Sprache\|Deutsch\}\}\)[^\n]*==[ \t]*\n/.exec(wikitext);
  if (!match) return null;
  return untilNextLanguage(wikitext.slice(match.index + match[0].length));
}

export function germanSectionEn(wikitext: string): string | null {
  const match = /(?:^|\n)==German==[ \t]*\n/.exec(wikitext);
  if (!match) return null;
  return untilNextLanguage(wikitext.slice(match.index + match[0].length));
}

function untilNextLanguage(section: string): string {
  const next = section.search(/\n==[^=]/);
  return next >= 0 ? section.slice(0, next) : section;
}

function headingLemma(wikitext: string): string | undefined {
  const match = /(?:^|\n)==\s*([^=\n(]+?)\s*\(\{\{Sprache\|Deutsch\}\}\)/.exec(wikitext);
  return match?.[1]?.trim() || undefined;
}

function level3Blocks(section: string): Array<{ title: string; body: string }> {
  const re = /(?:^|\n)===\s*([^=\n][^\n]*?)\s*===\s*\n/g;
  const matches = [...section.matchAll(re)];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? section.length) : section.length;
    return { title: match[1].trim(), body: section.slice(start, end) };
  });
}

function englishGlosses(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\{\{Üt?\|en\|([^|}]+)/g)) {
    const gloss = cleanInline(match[1].replace(/\[\[|\]\]/g, ""));
    if (gloss) out.push(gloss);
  }
  return uniq(out);
}

function deExamples(body: string): LookupExample[] {
  const block = bracedSection(body, "Beispiele");
  const out: LookupExample[] = [];
  for (const line of block.split("\n")) {
    if (!line.trim().startsWith(":")) continue;
    const text = cleanInline(line.replace(/^:\s*(?:\[\d+(?:\s*,\s*\d+)*\])?\s*/, ""));
    if (text.length < 8 || text.length > 160 || /[{}]/.test(text) || /^[„"«]/.test(text)) continue;
    out.push({ de: text });
    if (out.length >= 2) break;
  }
  return out;
}

function deGloss(body: string): string | undefined {
  const block = bracedSection(body, "Bedeutungen");
  for (const line of block.split("\n")) {
    if (!line.trim().startsWith(":")) continue;
    const text = cleanInline(line.replace(/^:\s*(?:\[\d+(?:\s*,\s*\d+)*\])?\s*/, "").replace(/^\*\s*/, ""));
    if (text.length > 12 && text.length < 220 && !/[{}]/.test(text)) return text;
  }
  return undefined;
}

function deRelated(body: string, lemma: string): string[] {
  const chunks = [bracedSection(body, "Wortbildungen"), bracedSection(body, "Synonyme")];
  return uniq(chunks.flatMap(wikiLinks))
    .filter((word) => normalizeLemma(word) !== normalizeLemma(lemma) && !isGrammarLabel(word))
    .slice(0, 6);
}

function enExamples(body: string): LookupExample[] {
  const out: LookupExample[] = [];
  for (const template of collectTemplates(body, ["ux", "uxi"])) {
    const args = templateArgs(template);
    if ((args.positional[0] ?? "").trim() !== "de") continue;
    const de = cleanInline(args.positional[1] ?? "");
    const en = cleanInline(args.named.t || args.positional[2] || "");
    if (!de || de.length > 240) continue;
    out.push({ de, en: en || undefined });
    if (out.length >= 2) break;
  }
  return out;
}

function enRelated(body: string, lemma: string): string[] {
  const chunks = [subsection(body, "Derived terms"), subsection(body, "Related terms")];
  const words: string[] = [];
  for (const chunk of chunks) {
    for (const match of chunk.matchAll(/\{\{[lm]\|de\|([^|}]+)/gi)) {
      const word = cleanInline(match[1]);
      if (word) words.push(word);
    }
    words.push(...wikiLinks(chunk));
  }
  return uniq(words)
    .filter((word) => normalizeLemma(word) !== normalizeLemma(lemma) && !isGrammarLabel(word))
    .slice(0, 6);
}

function glossLines(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split("\n")) {
    if (!line.startsWith("# ") && !line.startsWith("#\t")) continue;
    const text = cleanInline(line.replace(/^#\s*/, ""));
    if (!text || text.length < 2 || text.length > 280) continue;
    out.push(text);
  }
  return uniq(out);
}

function firstIpa(text: string): string | undefined {
  for (const match of text.matchAll(/\{\{IPA\|de\|([^{}]+)\}\}/gi)) {
    for (const part of splitDelim(match[1], "|")) {
      const value = part.trim();
      if (!value.startsWith("/") && !value.startsWith("[")) continue;
      if (/[-–][/\]]/.test(value) || /[/\[][-–]/.test(value)) continue;
      if (value.length < 4) continue;
      return value.startsWith("[") ? value : value;
    }
  }
  return undefined;
}

function bestAudioFile(files: string[]): string | undefined {
  const cleaned = files.map((file) => file.trim()).filter((file) => /\.(ogg|oga|mp3|wav)$/i.test(file));
  if (!cleaned.length) return undefined;
  return [...cleaned].sort((a, b) => audioRank(a) - audioRank(b))[0];
}

function audioRank(file: string): number {
  const name = file.toLocaleLowerCase("de");
  let rank = 10;
  if (name.startsWith("de-")) rank -= 5;
  if (name.includes("-at-") || name.includes("austria") || name.includes("swiss") || name.includes("-ch-")) rank += 6;
  return rank;
}

function wrapIpa(value: string): string {
  const text = value.trim();
  if (text.startsWith("/") || text.startsWith("[")) return text;
  return `/${text}/`;
}

function firstMatch(text: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(text);
  return match?.[1]?.trim() || undefined;
}

function qualifierLabel(wortart: string): string {
  if (wortart === "nachname") return "surname";
  if (wortart === "eigenname") return "name";
  if (wortart === "toponym") return "place name";
  if (wortart === "substantiv" || wortart === "verb" || wortart === "adjektiv") return "";
  return wortart;
}

function bracedSection(text: string, name: string): string {
  const token = `{{${name}}}`;
  const index = text.indexOf(token);
  if (index < 0) return "";
  const rest = text.slice(index + token.length);
  const end = rest.search(/\n\{\{/);
  return end >= 0 ? rest.slice(0, end) : rest;
}

function subsection(text: string, name: string): string {
  const match = new RegExp(`(?:^|\\n)====\\s*${name}\\s*====\\s*\\n`, "i").exec(text);
  if (!match) return "";
  const rest = text.slice(match.index + match[0].length);
  const end = rest.search(/\n====[^=]/);
  return end >= 0 ? rest.slice(0, end) : rest;
}

function wikiLinks(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g)) {
    const shown = cleanInline(match[2] || match[1]);
    if (!shown || shown.includes(":") || shown.length > 40) continue;
    if (shown.split(/\s+/).length > 3) continue;
    out.push(shown);
  }
  return out;
}

function namedParams(template: string): Record<string, string> {
  const args = templateArgs(template);
  return args.named;
}

function templateArgs(template: string): { positional: string[]; named: Record<string, string> } {
  const inner = template.replace(/^\{\{/, "").replace(/\}\}$/, "");
  const parts = splitDelim(inner, "|");
  const positional: string[] = [];
  const named: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    const key = eq > 0 ? part.slice(0, eq).trim() : "";
    if (eq > 0 && /^[A-Za-z0-9_ äöüÄÖÜß*-]+$/.test(key)) named[key.toLocaleLowerCase("de")] = part.slice(eq + 1).trim();
    else positional.push(part.trim());
  }
  return { positional, named };
}

function extractTemplate(text: string, startNeedle: string): string | null {
  const start = text.indexOf(startNeedle);
  if (start < 0) return null;
  return extractTemplateAt(text, start);
}

function collectTemplates(text: string, names: string[]): string[] {
  const wanted = new Set(names.map((name) => name.toLocaleLowerCase("en")));
  const found: string[] = [];
  for (let i = 0; i < text.length - 1; i += 1) {
    if (!text.startsWith("{{", i)) continue;
    const template = extractTemplateAt(text, i);
    if (!template) continue;
    const name = template.slice(2, template.indexOf("|") > 0 ? template.indexOf("|") : template.indexOf("}}")).trim().toLocaleLowerCase("en");
    if (wanted.has(name)) found.push(template);
    i += template.length - 1;
  }
  return found;
}

function extractTemplateAt(text: string, start: number): string | null {
  if (!text.startsWith("{{", start)) return null;
  let depth = 0;
  for (let i = start; i < text.length - 1; i += 1) {
    if (text.startsWith("{{", i)) {
      depth += 1;
      i += 1;
      continue;
    }
    if (text.startsWith("}}", i)) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 2);
      i += 1;
    }
  }
  return null;
}

function splitDelim(input: string, delim: string): string[] {
  const out: string[] = [];
  let buf = "";
  let curly = 0;
  let square = 0;
  let paren = 0;
  let bracket = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (input.startsWith("{{", i)) {
      curly += 1;
      buf += "{{";
      i += 1;
      continue;
    }
    if (input.startsWith("}}", i)) {
      curly = Math.max(0, curly - 1);
      buf += "}}";
      i += 1;
      continue;
    }
    if (input.startsWith("[[", i)) {
      square += 1;
      buf += "[[";
      i += 1;
      continue;
    }
    if (input.startsWith("]]", i)) {
      square = Math.max(0, square - 1);
      buf += "]]";
      i += 1;
      continue;
    }
    if (ch === "(") paren += 1;
    else if (ch === ")") paren = Math.max(0, paren - 1);
    else if (ch === "[") bracket += 1;
    else if (ch === "]") bracket = Math.max(0, bracket - 1);
    if (ch === delim && curly === 0 && square === 0 && paren === 0 && bracket === 0) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  out.push(buf);
  return out;
}

function cleanInline(value: string): string {
  let text = value.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "").replace(/<ref\b[^>]*\/?>/gi, "");
  let prev = "";
  while (text !== prev) {
    prev = text;
    text = text.replace(/\{\{[^{}]*\}\}/g, "");
  }
  text = text.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1");
  text = text.replace(/'{2,3}/g, "");
  text = stripHtml(text);
  return text.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string): string {
  const text = value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
  return text.replace(/\s+/g, " ").trim();
}

function uniq(items: string[]): string[] {
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
