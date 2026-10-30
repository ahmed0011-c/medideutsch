import { describe, expect, it } from "vitest";
import {
  getAllHoeren,
  getHoerenBySlug,
  hoerenTokenHasExplanation,
  isHoerenClickable,
  validateHoerenLesson,
} from "@/lib/hoeren";

const BATCH2 = [
  {
    slug: "a2-plaene-machen",
    videoId: "A1k6ZjKFycM",
    title: "Pläne machen",
  },
  {
    slug: "a2-sprichst-du-deutsch",
    videoId: "J7j31w8UT2c",
    title: "Sprichst du Deutsch?",
  },
  {
    slug: "a2-geld-ist-fuer-mich",
    videoId: "dRga5jIMjBo",
    title: "Geld ist für mich …",
  },
] as const;

describe("hoeren pilot", () => {
  it("loads the Angekommen pilot lesson", () => {
    const lessons = getAllHoeren();
    expect(lessons.length).toBeGreaterThanOrEqual(9);
    const lesson = getHoerenBySlug("a2-angekommen");
    expect(lesson).toBeTruthy();
    expect(lesson!.videoId).toBe("WB4YmgiRULw");
    expect(lesson!.questions).toHaveLength(8);
    expect(validateHoerenLesson(lesson!)).toEqual([]);
  });

  it("tags verbs, nouns, preps and compounds", () => {
    const lesson = getHoerenBySlug("a2-angekommen")!;
    const pos = new Set(lesson.lines.flatMap((l) => l.tokens.map((t) => t.pos)));
    expect(pos.has("verb")).toBe(true);
    expect(pos.has("noun")).toBe(true);
    expect(pos.has("prep")).toBe(true);
    expect(pos.has("compound")).toBe(true);
  });
});

describe("hoeren A2 batch 2", () => {
  it("loads three lessons after Angekommen", () => {
    for (const meta of BATCH2) {
      const lesson = getHoerenBySlug(meta.slug);
      expect(lesson).toBeTruthy();
      expect(lesson!.videoId).toBe(meta.videoId);
      expect(lesson!.title).toBe(meta.title);
      expect(lesson!.level).toBe("A2");
      expect(lesson!.series).toBe("Nicos Weg");
      expect(lesson!.questions).toHaveLength(8);
      expect(validateHoerenLesson(lesson!)).toEqual([]);
      const pos = new Set(lesson!.lines.flatMap((l) => l.tokens.map((t) => t.pos)));
      expect(pos.has("verb")).toBe(true);
      expect(pos.has("noun")).toBe(true);
      expect(pos.has("prep")).toBe(true);
      expect(pos.has("compound")).toBe(true);
    }
  });

  it("does not tag infinitive zu as a preposition", () => {
    const infinitives = new Set([
      "sein",
      "haben",
      "werden",
      "tun",
      "bleiben",
      "gehen",
      "kommen",
      "lassen",
      "sehen",
      "hören",
      "helfen",
      "lernen",
      "studieren",
      "machen",
      "arbeiten",
      "wohnen",
      "leben",
      "verdienen",
      "warten",
      "zurückkommen",
      "weiterstudieren",
      "eröffnen",
      "kümmern",
      "belügen",
      "anrufen",
      "sprechen",
      "üben",
    ]);
    const strip = (w: string) => w.replace(/^[„"'([{]+|[.!?,;:…'")\]}?]+$/g, "");
    for (const meta of BATCH2) {
      const lesson = getHoerenBySlug(meta.slug)!;
      for (const line of lesson.lines) {
        for (let i = 0; i < line.tokens.length; i++) {
          const tok = line.tokens[i];
          const core = strip(tok.w).toLowerCase();
          if (core !== "zu") continue;
          const next = line.tokens[i + 1] ? strip(line.tokens[i + 1].w).toLowerCase() : "";
          const nextIsInf =
            infinitives.has(next) ||
            (/((en|eln|ern)$)/.test(next) &&
              next.length > 3 &&
              !["einen", "ihnen", "denen", "meinen", "deinen", "seinen"].includes(next));
          if (nextIsInf) {
            expect(tok.pos).toBe("other");
          } else {
            expect(tok.pos).toBe("prep");
          }
        }
      }
    }
  });
});


const BATCH3 = [
  {
    slug: "a2-mein-bankkonto",
    videoId: "geYuMJBnDSs",
    title: "Mein Bankkonto",
    episode: 6,
  },
  {
    slug: "a2-rechnungen",
    videoId: "tNY9TNnQC6E",
    title: "Rechnungen",
    episode: 7,
  },
  {
    slug: "a2-am-bankautomaten",
    videoId: "n_l-rfcG5Uo",
    title: "Am Bankautomaten",
    episode: 8,
  },
  {
    slug: "a2-familiengeschichten",
    videoId: "uOcZq9rS13Y",
    title: "Familiengeschichten",
    episode: 9,
  },
  {
    slug: "a2-personen-beschreiben",
    videoId: "Tor-mPRS3j4",
    title: "Personen beschreiben",
    episode: 10,
  },
] as const;

describe("hoeren A2 batch 3", () => {
  it("loads five lessons Folgen 6–10", () => {
    for (const meta of BATCH3) {
      const lesson = getHoerenBySlug(meta.slug);
      expect(lesson).toBeTruthy();
      expect(lesson!.videoId).toBe(meta.videoId);
      expect(lesson!.title).toBe(meta.title);
      expect(lesson!.episode).toBe(meta.episode);
      expect(lesson!.level).toBe("A2");
      expect(lesson!.series).toBe("Nicos Weg");
      expect(lesson!.questions).toHaveLength(8);
      expect(validateHoerenLesson(lesson!)).toEqual([]);
      const pos = new Set(lesson!.lines.flatMap((l) => l.tokens.map((t) => t.pos)));
      expect(pos.has("verb")).toBe(true);
      expect(pos.has("noun")).toBe(true);
      expect(pos.has("prep")).toBe(true);
      expect(pos.has("compound")).toBe(true);
    }
  });

  it("does not tag infinitive or zuhören zu as a preposition", () => {
    const infinitives = new Set([
      "sein",
      "haben",
      "werden",
      "tun",
      "bleiben",
      "gehen",
      "kommen",
      "lassen",
      "sehen",
      "hören",
      "helfen",
      "lernen",
      "studieren",
      "machen",
      "arbeiten",
      "wohnen",
      "leben",
      "verdienen",
      "warten",
      "zurückkommen",
      "weiterstudieren",
      "eröffnen",
      "kümmern",
      "belügen",
      "anrufen",
      "sprechen",
      "üben",
      "überweisen",
      "bezahlen",
      "beantworten",
      "aufgeben",
      "erledigen",
      "abheben",
      "eingeben",
      "absenden",
      "übersetzen",
      "beschreiben",
    ]);
    const strip = (w: string) => w.replace(/^[„"'([{]+|[.!?,;:…'")\]}?]+$/g, "");
    for (const meta of BATCH3) {
      const lesson = getHoerenBySlug(meta.slug)!;
      for (const line of lesson.lines) {
        for (let i = 0; i < line.tokens.length; i++) {
          const tok = line.tokens[i];
          const core = strip(tok.w).toLowerCase();
          if (core !== "zu") continue;
          const prevs = line.tokens
            .slice(Math.max(0, i - 5), i)
            .map((t) => strip(t.w).toLowerCase());
          const next = line.tokens[i + 1] ? strip(line.tokens[i + 1].w).toLowerCase() : "";
          const nextIsInf =
            infinitives.has(next) ||
            (/((en|eln|ern)$)/.test(next) &&
              next.length > 3 &&
              !["einen", "ihnen", "denen", "meinen", "deinen", "seinen"].includes(next));
          const zuhoeren = prevs.some((p) => p.startsWith("hör"));
          if (nextIsInf || zuhoeren) {
            expect(tok.pos).toBe("other");
          } else if (next) {
            expect(tok.pos).toBe("prep");
          }
        }
      }
    }
  });
});

describe("hoeren glosses", () => {
  it("gives every clickable token a German or English explanation", () => {
    for (const lesson of getAllHoeren()) {
      expect(validateHoerenLesson(lesson)).toEqual([]);
      for (const line of lesson.lines) {
        for (const token of line.tokens) {
          if (!isHoerenClickable(token)) continue;
          expect(
            hoerenTokenHasExplanation(token),
            `${lesson.slug} ${line.id} “${token.w}” (${token.pos})`,
          ).toBe(true);
        }
      }
    }
  });
});
