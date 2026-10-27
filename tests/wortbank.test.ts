import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllComics } from "@/lib/comics";
import { getAllLessons } from "@/lib/lessons";
import { LocalProgressStore } from "@/lib/storage";
import { tenseRows, verbLemmaFromGloss, VERBS } from "@/lib/verbs";
import {
  emptyWortbank,
  groupByLesson,
  reviewQueue,
  reviewResult,
  toggleHard,
  upsertWortbank,
  type WortbankDraft,
  type WortbankEntry,
} from "@/lib/wortbank";

function lessonLemmas(): string[] {
  const found = new Set<string>();
  const glossaries = [
    ...getAllLessons().map((lesson) => lesson.glossary),
    ...getAllComics().map((lesson) => lesson.glossary),
  ];
  for (const glossary of glossaries) {
    for (const entry of Object.values(glossary)) {
      if (!/^verb/i.test(entry.pos)) continue;
      const lemma = verbLemmaFromGloss(entry.de);
      if (lemma) found.add(lemma);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b, "de"));
}

describe("curated verbs", () => {
  it("covers every verb used in the lessons, with full forms", () => {
    const lemmas = lessonLemmas();
    expect(lemmas.length).toBeGreaterThan(100);
    const missing = lemmas.filter((lemma) => !VERBS[lemma]);
    expect(missing).toEqual([]);
    for (const lemma of lemmas) {
      const verb = VERBS[lemma];
      expect(verb.praesens).toHaveLength(6);
      expect(verb.praeteritum).toHaveLength(6);
      expect(verb.imperativ).toHaveLength(3);
      expect(verb.aux === "haben" || verb.aux === "sein").toBe(true);
      expect(verb.partizip.length).toBeGreaterThan(2);
      for (const form of [...verb.praesens, ...verb.praeteritum, ...verb.imperativ, verb.partizip]) {
        expect(form.length).toBeGreaterThan(0);
      }
      for (const sentence of Object.values(verb.examples)) expect(sentence.length).toBeGreaterThan(8);
      const rows = tenseRows(lemma, verb);
      expect(rows.map((row) => row.id)).toEqual(["praesens", "perfekt", "praeteritum", "futur", "imperativ"]);
      expect(rows[3].cells[0]).toBe(`${VERBS.werden.praesens[0]} ${lemma}`);
      if (verb.separable) {
        expect(lemma.startsWith(verb.separable)).toBe(true);
        expect(verb.partizip.startsWith(verb.separable)).toBe(true);
        expect(verb.praesens.every((form) => !form.startsWith(verb.separable!))).toBe(true);
        expect(rows[0].cells[2]).toBe(`${verb.praesens[2]} … ${verb.separable}`);
        expect(rows[3].cells[0].endsWith(lemma)).toBe(true);
      }
    }
  });

  it("keeps the irregular and separable forms that a rule would get wrong", () => {
    expect(VERBS.sein.praesens[0]).toBe("bin");
    expect(VERBS.nehmen.praesens[1]).toBe("nimmst");
    expect(VERBS.aufstehen.separable).toBe("auf");
    expect(VERBS.aufstehen.praesens[2]).toBe("steht");
    expect(VERBS.aufstehen.partizip).toBe("aufgestanden");
    expect(VERBS.aufstehen.aux).toBe("sein");
    expect(VERBS.aufstehen.examples.praesens).toBe("Ich stehe um 6 Uhr auf.");
    expect(VERBS.stehen.aux).toBe("haben");
    expect(VERBS.stehen.partizip).toBe("gestanden");
    expect(VERBS.anziehen.partizip).toBe("angezogen");
    expect(VERBS.anziehen.praeteritum[0]).toBe("zog");
    expect(VERBS.verstehen.inseparable).toBe("ver");
    expect(VERBS.verstehen.separable).toBeNull();
    expect(VERBS.wiederholen.separable).toBeNull();
    expect(VERBS.wiederholen.partizip).toBe("wiederholt");
    expect(VERBS.wiederkommen.separable).toBe("wieder");
    expect(VERBS.wiederkommen.partizip).toBe("wiedergekommen");
    expect(VERBS.klingeln.praesens[0]).toBe("klingle");
    expect(tenseRows("aufstehen", VERBS.aufstehen)[1].cells[0]).toBe("bin aufgestanden");
    expect(tenseRows("aufstehen", VERBS.aufstehen)[4].cells[2]).toBe("stehen Sie … auf");
  });
});

function draft(over: Partial<WortbankDraft> = {}): WortbankDraft {
  return {
    lessonId: "a1-07-trennbar",
    lessonTitle: "Separable verbs",
    lessonKind: "grammar",
    key: "aufstehen",
    surface: "aufstehen",
    lemma: "aufstehen",
    pos: "verb",
    de: "aufstehen",
    en: "to get up",
    emoji: "🛏️",
    sentence: "Ich stehe um 6 Uhr auf.",
    href: "/learn/a1/a1-07-trennbar?step=0",
    ...over,
  };
}

function entry(over: Partial<WortbankEntry>): WortbankEntry {
  const base = upsertWortbank(emptyWortbank(), draft({ key: over.id ?? "a", lessonId: "lesson-a" })).entries[0];
  return { ...base, ...over, id: over.id ?? base.id };
}

describe("wortbank storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("groups saved words by the lesson they were saved in", () => {
    let doc = emptyWortbank();
    doc = upsertWortbank(doc, draft());
    doc = upsertWortbank(doc, draft({ lessonId: "wortschatz-aufnahmegespraech", lessonTitle: "Das Aufnahmegespräch", lessonKind: "comic", key: "anziehen", lemma: "anziehen", de: "anziehen" }));
    doc = upsertWortbank(doc, draft({ key: "tablette", lemma: "Tablette", pos: "noun", de: "die Tablette" }));
    const groups = groupByLesson(doc.entries);
    expect(groups).toHaveLength(2);
    expect(groups[0].entries.map((item) => item.key)).toEqual(["aufstehen", "tablette"]);
    expect(groups[1].lessonId).toBe("wortschatz-aufnahmegespraech");
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].entries).toHaveLength(1);
  });

  it("toggles Schwer without resetting the other word, and keeps it after save", () => {
    const mem = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => mem.get(key) ?? null,
        setItem: (key: string, value: string) => {
          mem.set(key, value);
        },
        removeItem: (key: string) => {
          mem.delete(key);
        },
      },
    });
    const store = new LocalProgressStore();
    let doc = upsertWortbank(emptyWortbank(), draft());
    doc = upsertWortbank(doc, draft({ key: "tablette", lemma: "Tablette", pos: "noun", de: "die Tablette" }));
    const verbId = doc.entries[0].id;
    doc = toggleHard(doc, verbId);
    expect(doc.entries.find((item) => item.id === verbId)?.hard).toBe(true);
    expect(doc.entries.find((item) => item.key === "tablette")?.hard).toBe(false);
    doc = upsertWortbank(doc, draft({ sentence: "Er steht um sieben Uhr auf." }));
    expect(doc.entries.find((item) => item.id === verbId)?.hard).toBe(true);
    expect(doc.entries.find((item) => item.id === verbId)?.sentence).toBe("Er steht um sieben Uhr auf.");
    expect(doc.entries.find((item) => item.id === verbId)?.story).toBe("");
    store.saveWortbank(doc);
    const loaded = store.loadWortbank();
    expect(loaded?.entries.find((item) => item.id === verbId)?.hard).toBe(true);
    expect(loaded?.entries.find((item) => item.key === "tablette")?.hard).toBe(false);
    const flipped = toggleHard(loaded!, verbId);
    store.saveWortbank(flipped);
    expect(store.loadWortbank()?.entries.find((item) => item.id === verbId)?.hard).toBe(false);
  });

  it("schedules Again immediately, grows Easy, and reviews Schwer words first", () => {
    const now = new Date("2026-04-01T08:00:00.000Z");
    const fresh = entry({ id: "lesson:aufstehen", hard: false, intervalDays: 2, ease: 2.5, due: now.toISOString() });
    const again = reviewResult(fresh, "again", now);
    expect(again.intervalDays).toBe(0);
    expect(again.due).toBe(now.toISOString());
    const easy = reviewResult(fresh, "easy", now);
    expect(easy.intervalDays).toBe(6);
    const hardCard = entry({
      id: "lesson:tablette",
      hard: true,
      intervalDays: 4,
      due: "2026-03-20T00:00:00.000Z",
    });
    const dueEasy = entry({
      id: "lesson:stehen",
      hard: false,
      intervalDays: 1,
      due: "2026-01-01T00:00:00.000Z",
    });
    const queue = reviewQueue([dueEasy, hardCard], { now });
    expect(queue[0].id).toBe(hardCard.id);
    expect(queue.filter((item) => item.id === hardCard.id)).toHaveLength(2);
    expect(reviewResult({ ...fresh, hard: true, intervalDays: 10 }, "good", now).intervalDays).toBe(13);
  });
});
