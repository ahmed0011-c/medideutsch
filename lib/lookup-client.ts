import {
  assembleLookup,
  chooseGermanPage,
  normalizeQuery,
  parseMyMemory,
  queryCandidates,
  readRevisionPages,
  type LookupCard,
} from "@/lib/lookup";

export type LookupResponse =
  | { ok: true; card: LookupCard }
  | { ok: false; error: "empty" | "offline" | "missing" | "aborted" };

const DE_API = "https://de.wiktionary.org/w/api.php";
const EN_API = "https://en.wiktionary.org/w/api.php";
const EN_REST = "https://en.wiktionary.org/api/rest_v1/page/definition/";
const MYMEMORY = "https://api.mymemory.translated.net/get";

type FetchResult = { network: true } | { network: false; ok: boolean; body: unknown };

/**
 * Look up a German word from the browser. Wiktionary (no key, CORS via origin=*)
 * supplies the entry; MyMemory is used only when that entry has no English sense.
 */
export async function lookupGerman(raw: string, signal?: AbortSignal): Promise<LookupResponse> {
  const query = normalizeQuery(raw);
  if (!query) return { ok: false, error: "empty" };
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 15_000);
  const onAbort = () => timeout.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    return await lookupGermanInner(query, timeout.signal, signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function lookupGermanInner(query: string, signal: AbortSignal, parent?: AbortSignal): Promise<LookupResponse> {
  const titles = queryCandidates(query);
  let attempts = 0;
  let networkFailures = 0;

  const deResult = getJson(wikiUrl(DE_API, titles), signal);
  const enResult = getJson(wikiUrl(EN_API, titles), signal);
  const restResults = titles.map((title) => getJson(`${EN_REST}${encodeURIComponent(title)}`, signal));
  const [deSettled, enSettled, ...restSettled] = await Promise.all([deResult, enResult, ...restResults]);
  if (parent?.aborted) return { ok: false, error: "aborted" };

  for (const result of [deSettled, enSettled, ...restSettled]) {
    attempts += 1;
    if (result.network) networkFailures += 1;
  }

  const dePage = deSettled.network ? null : chooseGermanPage(readRevisionPages(deSettled.body), query, "de");
  const enPage = enSettled.network ? null : chooseGermanPage(readRevisionPages(enSettled.body), query, "en");
  const title = dePage?.title || enPage?.title || query;
  const restBody = restBodyFor(titles, restSettled, title);

  let card = assembleLookup({
    title,
    deWikitext: dePage?.wikitext ?? null,
    enWikitext: enPage?.wikitext ?? null,
    restDefinition: restBody,
  });

  const needsEnglish = !card || card.senses.every((sense) => sense.meanings.length === 0);
  if (needsEnglish) {
    const memory = await getJson(`${MYMEMORY}?${new URLSearchParams({ q: title, langpair: "de|en" })}`, signal);
    if (parent?.aborted) return { ok: false, error: "aborted" };
    attempts += 1;
    if (memory.network) networkFailures += 1;
    const translation = memory.network ? null : parseMyMemory(memory.body);
    card = assembleLookup({
      title,
      deWikitext: dePage?.wikitext ?? null,
      enWikitext: enPage?.wikitext ?? null,
      restDefinition: restBody,
      translation,
    });
  }

  if (card) return { ok: true, card };
  if (attempts > 0 && networkFailures === attempts) return { ok: false, error: "offline" };
  return { ok: false, error: "missing" };
}

function restBodyFor(titles: string[], results: FetchResult[], title: string): unknown {
  const preferred = titles.indexOf(title);
  const ordered = preferred >= 0 ? [results[preferred], ...results] : results;
  for (const result of ordered) {
    if (!result || result.network || !result.ok) continue;
    if (hasGermanRest(result.body)) return result.body;
  }
  return null;
}

function hasGermanRest(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const german = (body as { de?: unknown }).de;
  return Array.isArray(german) && german.some((block) => {
    if (!block || typeof block !== "object") return false;
    const language = (block as { language?: unknown }).language;
    return language === undefined || language === "German";
  });
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
