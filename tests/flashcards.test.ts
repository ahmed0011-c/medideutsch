import { afterEach, describe, expect, it, vi } from "vitest";
import {
  advanceSession,
  cardFace,
  countDue,
  flashFilterCounts,
  frontWord,
  matchesFlashFilter,
  nounArticles,
  scheduleFlashcard,
  sessionDone,
  startSession,
} from "@/lib/flashcards";
import { LocalProgressStore } from "@/lib/storage";
import { emptyWortbank, isWortbankDoc, upsertWortbank, type WortbankDraft, type WortbankEntry } from "@/lib/wortbank";

function draft(over: Partial<WortbankDraft> = {}): WortbankDraft {
  return {
    lessonId: "a1-14-artikel",
    lessonTitle: "Articles",
    lessonKind: "grammar",
    key: "patient",
    surface: "Patient",
    lemma: "Patient",
    pos: "noun",
    de: "der Patient",
    en: "patient",
    emoji: "🛏️",
    sentence: "Der Patient schläft.",
    href: "/learn/a1/a1-14-artikel?step=0",
    ...over,
  };
}

function make(over: Partial<WortbankEntry> = {}): WortbankEntry {
  const base = upsertWortbank(emptyWortbank(), draft({ key: over.id ?? "patient", lessonId: "lesson" }), new Date("2026-04-01T08:00:00.000Z")).entries[0];
  return { ...base, ...over, id: over.id ?? base.id };
}

describe("flashcard scheduling", () => {
  const now = new Date("2026-04-01T08:00:00.000Z");

  it("keeps an unrated legacy word loadable and starts Easy at 7 days", () => {
    const legacy = make({ id: "lesson:patient", intervalDays: 20, ease: 2.5, reps: 4, hard: true, story: "ward" });
    delete legacy.rating;
    const doc = { version: 1 as const, entries: [legacy] };
    expect(isWortbankDoc(doc)).toBe(true);
    expect(legacy.rating).toBeUndefined();
    const easy = scheduleFlashcard(legacy, "easy", now);
    expect(easy.intervalDays).toBe(7);
    expect(easy.due).toBe("2026-04-08T08:00:00.000Z");
    expect(easy.rating).toBe("easy");
    expect(easy.ease).toBe(2.7);
    expect(easy.reps).toBe(5);
    expect(easy.hard).toBe(true);
    expect(easy.story).toBe("ward");
  });

  it("grows Easy through 7, 14, 30 and 60 days, then stays at 60", () => {
    let card = make({ id: "lesson:a", intervalDays: 0, ease: 2.5, reps: 0 });
    for (const days of [7, 14, 30, 60, 60]) {
      card = scheduleFlashcard(card, "easy", now);
      expect(card.intervalDays).toBe(days);
      expect(card.rating).toBe("easy");
    }
    expect(card.due).toBe("2026-05-31T08:00:00.000Z");
  });

  it("schedules Medium in 3 days and Hard tomorrow without dropping other fields", () => {
    const fresh = make({ id: "lookup:abholen", ease: 2.5, reps: 1, source: "Lookup", audio: "https://example.test/abholen.ogg" });
    const medium = scheduleFlashcard(fresh, "medium", now);
    expect(medium.intervalDays).toBe(3);
    expect(medium.due).toBe("2026-04-04T08:00:00.000Z");
    expect(medium.ease).toBe(2.5);
    expect(medium.rating).toBe("medium");
    expect(medium.audio).toBe(fresh.audio);
    const hard = scheduleFlashcard(medium, "hard", now);
    expect(hard.intervalDays).toBe(1);
    expect(hard.due).toBe("2026-04-02T08:00:00.000Z");
    expect(hard.ease).toBe(2.3);
    expect(hard.reps).toBe(3);
    expect(scheduleFlashcard(hard, "easy", now).intervalDays).toBe(7);
  });

  it("does not let a later save wipe the rating or the interval", () => {
    let doc = upsertWortbank(emptyWortbank(), draft(), now);
    const rated = scheduleFlashcard(doc.entries[0], "medium", now);
    doc = { version: 1, entries: [rated] };
    doc = upsertWortbank(doc, draft({ sentence: "Der Patient trinkt." }), now);
    expect(doc.entries[0].rating).toBe("medium");
    expect(doc.entries[0].intervalDays).toBe(3);
    expect(doc.entries[0].due).toBe("2026-04-04T08:00:00.000Z");
    expect(doc.entries[0].sentence).toBe("Der Patient trinkt.");
  });

  it("round-trips the rating through localStorage", () => {
    const mem = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => mem.get(key) ?? null,
        setItem: (key: string, value: string) => mem.set(key, value),
        removeItem: (key: string) => mem.delete(key),
      },
    });
    const store = new LocalProgressStore();
    const rated = scheduleFlashcard(make({ id: "lesson:patient" }), "hard", now);
    store.saveWortbank({ version: 1, entries: [rated] });
    const loaded = store.loadWortbank();
    expect(loaded?.entries[0].rating).toBe("hard");
    expect(loaded?.entries[0].intervalDays).toBe(1);
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

describe("flashcard session", () => {
  const now = new Date("2026-04-10T00:00:00.000Z");

  function saved(id: string, over: Partial<WortbankEntry> = {}): WortbankEntry {
    return make({ id, due: now.toISOString(), ...over });
  }

  it("filters due, rated and unrated words, with due cards first", () => {
    const due = saved("lesson:due", { due: "2026-04-01T00:00:00.000Z" });
    const later = saved("lesson:later", { due: "2026-05-01T00:00:00.000Z", rating: "easy" });
    const hard = saved("lookup:hard", { due: "2026-04-02T00:00:00.000Z", rating: "hard", lessonKind: "lookup" });
    const medium = saved("lesson:medium", { due: "2026-04-20T00:00:00.000Z", rating: "medium" });
    const entries = [later, hard, medium, due];
    expect(countDue(entries, now)).toBe(2);
    expect(flashFilterCounts(entries, now)).toEqual({ all: 4, due: 2, easy: 1, medium: 1, hard: 1, unrated: 1 });
    expect(matchesFlashFilter(due, "unrated", now)).toBe(true);
    expect(matchesFlashFilter(later, "due", now)).toBe(false);
    expect(matchesFlashFilter(hard, "hard", now)).toBe(true);
    expect(startSession(entries, "all", now)).toEqual([due.id, hard.id, medium.id, later.id]);
    expect(startSession(entries, "due", now)).toEqual([due.id, hard.id]);
    expect(startSession(entries, "easy", now)).toEqual([later.id]);
  });

  it("brings a Hard card back later in the same session", () => {
    let ids = ["a", "b", "c"];
    let index = 0;
    ({ ids, index } = advanceSession(ids, index, "hard"));
    expect(ids).toEqual(["b", "c", "a"]);
    expect(index).toBe(0);
    ({ ids, index } = advanceSession(ids, index, "easy"));
    expect(ids).toEqual(["c", "a"]);
    ({ ids, index } = advanceSession(ids, index, "medium"));
    expect(ids).toEqual(["a"]);
    expect(sessionDone(ids, index)).toBe(false);
    ({ ids, index } = advanceSession(ids, index, "easy"));
    expect(sessionDone(ids, index)).toBe(true);
    expect(ids).toEqual([]);
  });

  it("shows a lone Hard card again immediately", () => {
    const next = advanceSession(["only"], 0, "hard");
    expect(next).toEqual({ ids: ["only"], index: 0 });
    expect(sessionDone(next.ids, next.index)).toBe(false);
    const done = advanceSession(next.ids, next.index, "medium");
    expect(sessionDone(done.ids, done.index)).toBe(true);
  });
});

describe("flashcard faces", () => {
  it("colours an article stored on the word or only inside the German line", () => {
    const stored = make({ article: "das", de: "Fieber", lemma: "Fieber", pos: "noun", plural: "Fieber" });
    expect(nounArticles(stored)).toEqual(["das"]);
    expect(frontWord(stored)).toBe("Fieber");
    const legacy = make({ de: "die Tablette", lemma: "die Tablette", pos: "noun", plural: "die Tabletten" });
    expect(nounArticles(legacy)).toEqual(["die"]);
    expect(frontWord(legacy)).toBe("Tablette");
    expect(cardFace(legacy).plural).toBe("die Tabletten");
    expect(nounArticles(make({ de: "aufstehen", lemma: "aufstehen", pos: "verb" }))).toEqual([]);
  });

  it("shows a separable split and verb forms on the back", () => {
    const face = cardFace(
      make({
        id: "lesson:aufstehen",
        key: "aufstehen",
        lemma: "aufstehen",
        de: "aufstehen",
        pos: "verb",
        en: "to get up",
        sentence: "Ich stehe um 6 Uhr auf.",
      }),
    );
    expect(face.word).toBe("aufstehen");
    expect(face.prefix).toBe("auf");
    expect(face.praeteritum).toBe("stand … auf");
    expect(face.partizip).toBe("aufgestanden");
    expect(face.aux).toBe("sein");
    expect(face.exampleDe).toBe("Ich stehe um 6 Uhr auf.");
    expect(face.meanings).toEqual(["to get up"]);
  });

  it("keeps a Lookup recording and the ab|holen split", () => {
    const face = cardFace(
      make({
        id: "lookup:abholen",
        lemma: "abholen",
        de: "ab|holen",
        pos: "verb",
        en: "pick up",
        prefix: "ab",
        separable: true,
        praeteritum: "holte ab",
        partizip: "abgeholt",
        aux: "haben",
        audio: "https://commons.wikimedia.org/wiki/Special:FilePath/De-abholen.ogg",
        examples: [{ de: "Ich muss das Paket abholen.", en: "I have to pick up the parcel." }],
        sentence: "Ich muss das Paket abholen.",
        source: "Lookup",
        lessonKind: "lookup",
      }),
    );
    expect(face.word).toBe("abholen");
    expect(face.prefix).toBe("ab");
    expect(face.praeteritum).toBe("holte ab");
    expect(face.audio).toContain("De-abholen.ogg");
    expect(face.exampleDe).toBe("Ich muss das Paket abholen.");
    expect(face.exampleEn).toBe("I have to pick up the parcel.");
  });
});
