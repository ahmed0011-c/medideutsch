import { describe, expect, it } from "vitest";
import { getAllHoeren, getHoerenBySlug, validateHoerenLesson } from "@/lib/hoeren";

describe("hoeren pilot", () => {
  it("loads the Angekommen pilot lesson", () => {
    const lessons = getAllHoeren();
    expect(lessons.length).toBeGreaterThanOrEqual(1);
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
