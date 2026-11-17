import { lookupAbbreviation } from "@/lib/abbreviations";
import { interpretLookup, pickLookup, type LookupPlan, type PickResult } from "@/lib/lookup-interpret";
import {
  assembleLookup,
  extractFormReferences,
  extractRestFormReferences,
  germanSectionDe,
  germanSectionEn,
  isLexicalCard,
  parseMyMemory,
  pickCaseEntry,
  queryCandidates,
  readRedirects,
  readRevisionPages,
  selectPage,
  type FormReference,
  type LookupCard,
  type LookupSense,
  type LookupSuggestion,
} from "@/lib/lookup";

export type LookupResponse =
  | { ok: true; card: LookupCard; extras?: LookupCard[] }
  | { ok: false; error: "empty" | "offline" | "missing" | "aborted"; suggestions?: LookupSuggestion[] };

const DE_API = "https://de.wiktionary.org/w/api.php";
const EN_API = "https://en.wiktionary.org/w/api.php";
const EN_REST = "https://en.wiktionary.org/api/rest_v1/page/definition/";
const WIKI_SUMMARY = "https://de.wikipedia.org/api/rest_v1/page/summary/";
const MYMEMORY = "https://api.mymemory.translated.net/get";
const CACHE_STORE = "medideutsch.lookup.v1";
const CACHE_LIMIT = 60;

type FetchResult = { network: true } | { network: false; ok: boolean; body: unknown };
type StoredPage = { title: string; wikitext: string; aliases: string[] };
type RestHit = { title: string; body: unknown };
type Batch = {
  attempts: number;
  networkFailures: number;
  de: StoredPage[];
  en: StoredPage[];
  rest: RestHit[];
};

type WikiSummary = { title: string; extract: string; description?: string };

export function parseOpenSearch(payload: unknown): string[] {
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) return [];
  return payload[1].filter((item): item is string => typeof item === "string" && item.length > 1 && item.length < 80).slice(0, 5);
}

export function parseWikiSearch(payload: unknown): { title: string; snippet: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const hits = (payload as { query?: { search?: unknown } }).query?.search;
  if (!Array.isArray(hits) || !hits[0] || typeof hits[0] !== "object") return null;
  const hit = hits[0] as { title?: unknown; snippet?: unknown };
  if (typeof hit.title !== "string" || typeof hit.snippet !== "string") return null;
  const snippet = hit.snippet
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
  if (!snippet) return null;
  return { title: hit.title, snippet };
}

export function parseWikiSummary(payload: unknown): WikiSummary | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as { type?: unknown; title?: unknown; extract?: unknown; description?: unknown };
  if (row.type === "disambiguation") return null;
  if (typeof row.title !== "string" || typeof row.extract !== "string") return null;
  const extract = row.extract.replace(/\s+/g, " ").trim();
  if (!extract) return null;
  const description = typeof row.description === "string" ? row.description.replace(/\s+/g, " ").trim() : "";
  return { title: row.title, extract, description: description || undefined };
}

export function readLookupCache(storage: Pick<Storage, "getItem">, key: string): LookupResponse | null {
  try {
    const raw = storage.getItem(CACHE_STORE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, LookupResponse>;
    const hit = parsed[key];
    if (!hit || typeof hit !== "object" || !("ok" in hit)) return null;
    return hit;
  } catch {
    return null;
  }
}

export function writeLookupCache(storage: Pick<Storage, "getItem" | "setItem">, key: string, value: LookupResponse): void {
  try {
    const raw = storage.getItem(CACHE_STORE);
    const parsed = raw ? (JSON.parse(raw) as Record<string, LookupResponse>) : {};
    delete parsed[key];
    parsed[key] = value;
    const keys = Object.keys(parsed);
    while (keys.length > CACHE_LIMIT) {
      const oldest = keys.shift();
      if (oldest) delete parsed[oldest];
    }
    storage.setItem(CACHE_STORE, JSON.stringify(parsed));
  } catch {
    // Private mode or a full session store should not break lookup.
  }
}

/**
 * Look up a German word from the browser. Inflected forms resolve to the lemma.
 * A local abbreviation list is checked first. Wiktionary supplies the entry;
 * MyMemory is used only when that entry has no English sense.
 */
export async function lookupGerman(raw: string, signal?: AbortSignal): Promise<LookupResponse> {
  const plan = interpretLookup(raw);
  if (!plan) return { ok: false, error: "empty" };
  const storage = session();
  if (storage) {
    const cached = readLookupCache(storage, plan.cacheKey);
    if (cached) return cached;
  }
  if (plan.abbreviation || lookupAbbreviation(plan.input)) {
    const response: LookupResponse = { ok: true, card: abbreviationCard(plan) };
    if (storage) writeLookupCache(storage, plan.cacheKey, response);
    return response;
  }
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 15_000);
  const onAbort = () => timeout.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const response = await lookupInner(plan, timeout.signal, signal);
    if (storage && (response.ok || response.error === "missing")) writeLookupCache(storage, plan.cacheKey, response);
    return response;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function lookupInner(plan: LookupPlan, signal: AbortSignal, parent?: AbortSignal): Promise<LookupResponse> {
  const batch = await fetchBatch(expandTitles(plan.seeds.length ? plan.seeds : [plan.input]), signal);
  if (batch === "aborted" || parent?.aborted) return { ok: false, error: "aborted" };
  const offline = batch.attempts > 0 && batch.networkFailures === batch.attempts && batch.de.length === 0 && batch.en.length === 0;
  if (offline && plan.compound) return { ok: true, card: compoundCard(plan) };
  if (offline) return { ok: false, error: "offline" };

  let working = plan;
  working = await followForm(working, batch, signal);
  if (parent?.aborted) return { ok: false, error: "aborted" };

  const picked = pickLookup(working, lexicalTitles(batch));
  if (picked.type === "entry") {
    const card = await finishEntry(batch, picked, signal, parent);
    if (card) return { ok: true, card };
  }
  if (picked.type === "phrase") {
    const loaded = await Promise.all(picked.keys.map((key) => withEnglish(batch, key, signal, parent)));
    const cards = loaded
      .filter((card): card is LookupCard => isLexicalCard(card))
      .map((card) => preferKeywordCase(working, card));
    if (cards[0]) {
      return {
        ok: true,
        card: { ...cards[0], interpretation: picked.interpretation, source: cards[0].source ?? "wiktionary" },
        extras: cards.slice(1),
      };
    }
  }
  if (picked.type === "compound" && working.compound) {
    return { ok: true, card: compoundCard(working, picked.interpretation) };
  }
  if (working.kind === "phrase" && working.keywords?.length) {
    const translated = await phraseTranslations(working, signal, parent);
    if (parent?.aborted) return { ok: false, error: "aborted" };
    if (translated) return translated;
  }

  const [fuzzy, wiki] = await Promise.all([
    openSearch(working.input, signal),
    working.tryWikipedia ? wikiSummary(wikiTitle(working.input), signal) : Promise.resolve(null),
  ]);
  if (parent?.aborted) return { ok: false, error: "aborted" };
  const suggestions = mergeSuggestions(picked.type === "missing" ? picked.suggestions : [], fuzzy);
  const mention = wiki && wikiMatches(working.input, wiki) ? wiki : working.tryWikipedia ? await wikiMention(working.input, signal) : null;
  if (parent?.aborted) return { ok: false, error: "aborted" };
  if (mention) {
    const translation = await myMemory(mention.description || firstSentence(mention.extract), signal);
    if (parent?.aborted) return { ok: false, error: "aborted" };
    return { ok: true, card: wikiCard(working.input, mention, translation, suggestions) };
  }
  if (suggestions.length && !working.abbreviation) {
    return { ok: false, error: "missing", suggestions };
  }
  const translation = await myMemory(working.lemma || working.input, signal);
  if (parent?.aborted) return { ok: false, error: "aborted" };
  if (translation) {
    const card = assembleLookup({ title: working.lemma || working.input, translation });
    if (card) {
      return {
        ok: true,
        card: { ...card, interpretation: working.note, suggestions: suggestions.length ? suggestions : undefined },
      };
    }
  }
  if (suggestions.length) return { ok: false, error: "missing", suggestions };
  return { ok: false, error: "missing" };
}

async function followForm(plan: LookupPlan, batch: Batch, signal: AbortSignal): Promise<LookupPlan> {
  if (isLexicalCard(cardFor(batch, plan.input)) && plan.priority !== "high") return plan;
  if (plan.lemma && isLexicalCard(cardFor(batch, plan.lemma))) return plan;
  const form = formsFor(batch, plan.input)[0];
  if (!form) return plan;
  if (plan.lemma && plan.lemma.toLocaleLowerCase("de") === form.lemma.toLocaleLowerCase("de")) return plan;
  if (!cardFor(batch, form.lemma)) {
    const more = await fetchBatch(queryCandidates(form.lemma), signal);
    if (more !== "aborted") mergeBatch(batch, more);
  }
  if (!isLexicalCard(cardFor(batch, form.lemma))) return plan;
  if (plan.lemma && plan.priority === "high") return plan;
  return { ...plan, lemma: form.lemma, label: form.label || plan.label || "inflected form", priority: "high", kind: "verb" };
}

async function finishEntry(
  batch: Batch,
  picked: Extract<PickResult, { type: "entry" }>,
  signal: AbortSignal,
  parent?: AbortSignal,
): Promise<LookupCard | null> {
  const base = cardFor(batch, picked.key);
  if (!isLexicalCard(base) || !base) return null;
  const enriched = (await withEnglish(batch, picked.key, signal, parent)) ?? base;
  return decorate(enriched, picked);
}

function preferKeywordCase(plan: LookupPlan, card: LookupCard): LookupCard {
  const lemma = card.senses[0]?.lemma ?? card.title;
  const keyword = plan.keywords?.find((word) => word.toLocaleLowerCase("de") === lemma.toLocaleLowerCase("de"));
  if (!keyword || keyword === lemma) return card;
  return {
    ...card,
    title: keyword,
    senses: card.senses.map((sense, index) => (index === 0 ? { ...sense, lemma: keyword } : sense)),
  };
}

function alignInterpretation(interpretation: string | undefined, title: string): string | undefined {
  if (!interpretation) return undefined;
  return interpretation.replace(/→\s+([^,]+),/, (match, lemma: string) =>
    lemma.trim().toLocaleLowerCase("de") === title.toLocaleLowerCase("de") ? `→ ${title},` : match,
  );
}

function decorate(card: LookupCard, picked: { interpretation?: string; hints?: string[]; suggestions?: LookupSuggestion[] }): LookupCard {
  const interpretation = alignInterpretation(picked.interpretation ?? card.interpretation, card.title);
  return {
    ...card,
    interpretation,
    separableHints: picked.hints?.length ? picked.hints : card.separableHints,
    suggestions: picked.suggestions?.length ? picked.suggestions : card.suggestions,
    source: card.source ?? "wiktionary",
  };
}

function abbreviationCard(plan: LookupPlan): LookupCard {
  const abbr = plan.abbreviation;
  if (!abbr) {
    return { title: plan.input, partial: true, senses: [emptySense(plan.input, "abbreviation")] };
  }
  return {
    title: abbr.canonical,
    partial: false,
    source: "abbreviation",
    interpretation: plan.note,
    senses: [
      {
        ...emptySense(abbr.canonical, "abbreviation"),
        posLabel: "Abbreviation",
        meanings: [abbr.en],
        germanGloss: abbr.expansion,
      },
    ],
  };
}

function compoundCard(plan: LookupPlan, interpretation?: string): LookupCard {
  const compound = plan.compound;
  const guess = compound?.guess ?? plan.input;
  return {
    title: plan.input,
    partial: false,
    source: "compound",
    interpretation: interpretation ?? plan.note,
    compound,
    senses: [
      {
        ...emptySense(plan.input, "noun"),
        posLabel: "Compound",
        meanings: [guess],
        related: compound?.parts.map((part) => part.word) ?? [],
      },
    ],
  };
}

async function phraseTranslations(
  plan: LookupPlan,
  signal: AbortSignal,
  parent?: AbortSignal,
): Promise<LookupResponse | null> {
  const cards = (
    await Promise.all(
      (plan.keywords ?? []).map(async (word) => {
        const translation = await myMemory(word, signal);
        if (!translation) return null;
        return assembleLookup({ title: word, translation });
      }),
    )
  ).filter((card): card is LookupCard => Boolean(card));
  if (parent?.aborted || !cards.length) return null;
  return {
    ok: true,
    card: { ...cards[0], interpretation: plan.note },
    extras: cards.slice(1),
  };
}

function wikiCard(input: string, wiki: WikiSummary, translation: string | null, suggestions: LookupSuggestion[]): LookupCard {
  const same = wiki.title.toLocaleLowerCase("de") === input.trim().toLocaleLowerCase("de");
  const sense = emptySense(same ? wiki.title : input, "noun");
  sense.posLabel = "Wikipedia";
  sense.germanGloss = wiki.extract.length > 420 ? `${wiki.extract.slice(0, 417)}…` : wiki.extract;
  if (translation) {
    sense.meanings = [translation];
    sense.enSource = "mymemory";
  }
  return {
    title: same ? wiki.title : input,
    partial: true,
    source: "wikipedia",
    interpretation: same ? `${input} → ${wiki.title}, Wikipedia` : `${input} → mentioned in ${wiki.title}, Wikipedia`,
    suggestions: suggestions.length ? suggestions : undefined,
    senses: [sense],
  };
}

function emptySense(lemma: string, pos: string): LookupSense {
  return { lemma, pos, posLabel: pos, meanings: [], articles: [], examples: [], related: [] };
}

async function withEnglish(batch: Batch, key: string, signal: AbortSignal, parent?: AbortSignal): Promise<LookupCard | null> {
  const current = cardFor(batch, key);
  if (!current) return null;
  if (current.senses.some((sense) => sense.meanings.length > 0)) return current;
  const translation = await myMemory(current.title, signal);
  if (parent?.aborted || !translation) return current;
  const de = batch.de.find((page) => page.title === current.title);
  const en = batch.en.find((page) => page.title === current.title);
  const rest = batch.rest.find((page) => page.title === current.title);
  return (
    assembleLookup({
      title: current.title,
      deWikitext: de?.wikitext ?? null,
      enWikitext: en?.wikitext ?? null,
      restDefinition: rest?.body ?? null,
      translation,
    }) ?? current
  );
}

function lexicalTitles(batch: Batch): Map<string, string> {
  const map = new Map<string, string>();
  const pages = [...batch.de, ...batch.en];
  for (const page of pages) {
    const card = cardFor(batch, page.title);
    if (!isLexicalCard(card) || !card) continue;
    map.set(page.title, card.title);
    map.set(card.title, card.title);
    const folded = card.title.toLocaleLowerCase("de");
    const current = map.get(folded);
    if (!current || card.title !== folded && current === folded) map.set(folded, card.title);
  }
  return map;
}

function cardFor(batch: Batch, title: string): LookupCard | null {
  const folded = title.toLocaleLowerCase("de");
  const sameCase = (page: { title: string; aliases?: string[] }) =>
    page.title.toLocaleLowerCase("de") === folded || page.aliases?.some((alias) => alias.toLocaleLowerCase("de") === folded);
  const dePages = batch.de.filter(sameCase);
  const enPages = batch.en.filter(sameCase);
  const names = [...new Set([...dePages.map((page) => page.title), ...enPages.map((page) => page.title)])];
  if (!names.length && !batch.rest.some((item) => item.title.toLocaleLowerCase("de") === folded)) return null;
  const cards = (names.length ? names : [title]).map((pageTitle) => {
    const de = dePages.find((page) => page.title === pageTitle);
    const en = enPages.find((page) => page.title === pageTitle);
    const rest = batch.rest.find((item) => item.title === pageTitle);
    const card = assembleLookup({
      title: pageTitle,
      deWikitext: de?.wikitext ?? null,
      enWikitext: en?.wikitext ?? null,
      restDefinition: rest?.body ?? null,
    });
    return { title: pageTitle, card, lexical: isLexicalCard(card) };
  });
  const chosen = pickCaseEntry(
    title,
    cards.map((item) => ({ title: item.title, lexical: item.lexical })),
  );
  return cards.find((item) => item.title === chosen)?.card ?? cards.find((item) => item.card)?.card ?? null;
}

function formsFor(batch: Batch, title: string): FormReference[] {
  const de = selectPage(batch.de, title);
  const en = selectPage(batch.en, title);
  const rest = selectPage(batch.rest, title);
  const refs = [
    ...(de ? extractFormReferences(de.wikitext, "de") : []),
    ...(en ? extractFormReferences(en.wikitext, "en") : []),
    ...extractRestFormReferences(rest?.body),
  ];
  const seen = new Map<string, FormReference>();
  for (const ref of refs) {
    const id = ref.lemma.toLocaleLowerCase("de");
    if (!seen.has(id)) seen.set(id, ref);
  }
  return [...seen.values()];
}

function expandTitles(seeds: string[]): string[] {
  const out: string[] = [];
  for (const seed of seeds) {
    for (const candidate of queryCandidates(seed)) {
      if (!out.includes(candidate)) out.push(candidate);
    }
  }
  return out.slice(0, 40);
}

async function fetchBatch(titles: string[], signal: AbortSignal): Promise<Batch | "aborted"> {
  if (signal.aborted) return "aborted";
  const unique = titles.filter(Boolean).slice(0, 40);
  const restTitles = unique.slice(0, 6);
  const deResult = getJson(wikiUrl(DE_API, unique), signal);
  const enResult = getJson(wikiUrl(EN_API, unique), signal);
  const restResults = restTitles.map((title) => getJson(`${EN_REST}${encodeURIComponent(title)}`, signal));
  const [deSettled, enSettled, ...restSettled] = await Promise.all([deResult, enResult, ...restResults]);
  if (signal.aborted) return "aborted";
  let attempts = 0;
  let networkFailures = 0;
  for (const result of [deSettled, enSettled, ...restSettled]) {
    attempts += 1;
    if (result.network) networkFailures += 1;
  }
  const rest: RestHit[] = [];
  restTitles.forEach((title, index) => {
    const result = restSettled[index];
    if (!result || result.network || !result.ok || !hasGermanRest(result.body)) return;
    rest.push({ title, body: result.body });
  });
  return {
    attempts,
    networkFailures,
    de: deSettled.network ? [] : indexWiki(deSettled.body, "de"),
    en: enSettled.network ? [] : indexWiki(enSettled.body, "en"),
    rest,
  };
}

function mergeBatch(into: Batch, extra: Batch) {
  into.attempts += extra.attempts;
  into.networkFailures += extra.networkFailures;
  into.de.push(...extra.de);
  into.en.push(...extra.en);
  into.rest.push(...extra.rest);
}

function indexWiki(payload: unknown, source: "de" | "en"): StoredPage[] {
  const pages: StoredPage[] = [];
  for (const page of readRevisionPages(payload)) {
    if (!page.wikitext) continue;
    const german = source === "de" ? germanSectionDe(page.wikitext) : germanSectionEn(page.wikitext);
    if (!german) continue;
    pages.push({ title: page.title, wikitext: page.wikitext, aliases: [] });
  }
  for (const redirect of readRedirects(payload)) {
    const target = pages.find((page) => page.title === redirect.to) ?? selectPage(pages, redirect.to);
    if (target && !target.aliases.includes(redirect.from)) target.aliases.push(redirect.from);
  }
  return pages;
}

function mentionsWord(text: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}])${escaped}(?:$|[^\\p{L}])`, "iu").test(text);
}

function wikiMatches(query: string, wiki: WikiSummary): boolean {
  return mentionsWord(wiki.title, query.trim());
}

async function openSearch(query: string, signal: AbortSignal): Promise<LookupSuggestion[]> {
  const params = new URLSearchParams({
    action: "opensearch",
    search: query,
    limit: "5",
    namespace: "0",
    format: "json",
    origin: "*",
  });
  const result = await getJson(`${DE_API}?${params}`, signal);
  if (result.network || !result.ok) return [];
  const folded = query.toLocaleLowerCase("de");
  return parseOpenSearch(result.body)
    .filter((title) => title.toLocaleLowerCase("de") !== folded)
    .slice(0, 4)
    .map((lemma) => ({ lemma }));
}

async function wikiMention(query: string, signal: AbortSignal): Promise<WikiSummary | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "1",
    srnamespace: "0",
    format: "json",
    origin: "*",
  });
  const result = await getJson(`https://de.wikipedia.org/w/api.php?${params}`, signal);
  if (result.network || !result.ok) return null;
  const hit = parseWikiSearch(result.body);
  if (!hit) return null;
  const needle = query.trim().toLocaleLowerCase("de");
  if (!mentionsWord(hit.snippet, needle) && !mentionsWord(hit.title, needle)) return null;
  return { title: hit.title, extract: hit.snippet };
}

async function wikiSummary(title: string, signal: AbortSignal): Promise<WikiSummary | null> {
  const result = await getJson(`${WIKI_SUMMARY}${encodeURIComponent(title)}`, signal);
  if (result.network || !result.ok) return null;
  return parseWikiSummary(result.body);
}

async function myMemory(text: string, signal: AbortSignal): Promise<string | null> {
  const query = text.trim().slice(0, 180);
  if (!query) return null;
  const result = await getJson(`${MYMEMORY}?${new URLSearchParams({ q: query, langpair: "de|en" })}`, signal);
  if (result.network || !result.ok) return null;
  return parseMyMemory(result.body);
}

function mergeSuggestions(primary: LookupSuggestion[], extra: LookupSuggestion[]): LookupSuggestion[] {
  const out: LookupSuggestion[] = [];
  for (const item of [...primary, ...extra]) {
    if (out.some((existing) => existing.lemma.toLocaleLowerCase("de") === item.lemma.toLocaleLowerCase("de"))) continue;
    out.push(item);
  }
  return out.slice(0, 5);
}

function wikiTitle(input: string): string {
  const lower = input.toLocaleLowerCase("de");
  return lower.charAt(0).toLocaleUpperCase("de") + lower.slice(1);
}

function firstSentence(text: string): string {
  const match = /^.{1,140}?[.!?]/.exec(text);
  return (match?.[0] ?? text.slice(0, 140)).trim();
}

function hasGermanRest(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const german = (body as { de?: unknown }).de;
  return (
    Array.isArray(german) &&
    german.some((block) => {
      if (!block || typeof block !== "object") return false;
      const language = (block as { language?: unknown }).language;
      return language === undefined || language === "German";
    })
  );
}

function wikiUrl(api: string, titles: string[]): string {
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: titles.join("|"),
    redirects: "1",
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  return `${api}?${params.toString()}`;
}

async function getJson(url: string, signal?: AbortSignal): Promise<FetchResult> {
  try {
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    const body: unknown = await response.json().catch(() => null);
    return { network: false, ok: response.ok, body };
  } catch {
    return { network: true };
  }
}

function session(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}
