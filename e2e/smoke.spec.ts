import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

type LessonFile = { id: string; level: string; steps: Array<{ id: string; type: string }> };
type ComicFile = { id: string; chapters: Array<{ n: number }>; panels: unknown[] };

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith(".json") ? [full] : [];
  });
}

function lessons(): LessonFile[] {
  return walk(path.join(process.cwd(), "content/lessons"))
    .map((file) => readJson<LessonFile>(file))
    .filter((lesson) => lesson.id !== "_template" && !lesson.id.startsWith("_"));
}

function comics(): ComicFile[] {
  return walk(path.join(process.cwd(), "content/comics")).map((file) => readJson<ComicFile>(file));
}

function attach(page: Page, bag: string[]) {
  page.on("pageerror", (error) => bag.push(`pageerror ${error.message}`));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") bag.push(`console ${text}`);
    if (/hydration|did not match/i.test(text)) bag.push(`hydration ${text}`);
  });
}

async function assertSurface(page: Page, bag: string[]) {
  await expect(page.locator("main, .lesson-shell, .comic").first()).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text.length).toBeGreaterThan(40);
  expect(text).not.toContain("Application error");
  expect(text).not.toContain("This page could not be found");
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2);
  await assertPictures(page);
  expect(bag, bag.join("\n")).toEqual([]);
}

/** Pictures the learner can see. Hidden tabs and display:contents wrappers are not pictures. */
async function assertPictures(page: Page) {
  const selector = "svg.art, svg.lineup, svg.brand-logo, .qpic svg, .art-box svg, .b-head .av svg, .ctx .av svg, .sprite svg, .wb-picture-svg";
  await page
    .waitForFunction(
      (sel) => {
        const visible = [...document.querySelectorAll(sel)].filter((node) => {
          let element: Element | null = node;
          while (element) {
            const style = getComputedStyle(element);
            if (style.display === "none" || style.visibility === "hidden") return false;
            element = element.parentElement;
          }
          return true;
        });
        if (!visible.length) return true;
        return visible.every((node) => {
          const box = node.getBoundingClientRect();
          return box.width >= 8 && box.height >= 8;
        });
      },
      selector,
      { timeout: 8_000 },
    )
    .catch(() => undefined);
  const zeros = await page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].flatMap((node) => {
      let element: Element | null = node;
      while (element) {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return [];
        element = element.parentElement;
      }
      const box = node.getBoundingClientRect();
      if (box.width >= 8 && box.height >= 8) return [];
      const label = node.getAttribute("class") || node.getAttribute("aria-label") || node.tagName;
      return [`${label} ${Math.round(box.width)}×${Math.round(box.height)}`];
    });
  }, selector);
  expect(zeros, zeros.join("\n")).toEqual([]);
}

test("opens every grammar step and both comics", async ({ page }) => {
  test.setTimeout(600_000);
  const bag: string[] = [];
  attach(page, bag);

  for (const lesson of lessons()) {
    const level = lesson.level.toLowerCase().startsWith("a") ? lesson.level.toLowerCase().slice(0, 2) : lesson.level.toLowerCase();
    for (let index = 0; index < lesson.steps.length; index++) {
      const response = await page.goto(`/learn/${level}/${lesson.id}?step=${index}`, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), lesson.id).toBeTruthy();
      await expect(page.getByText("Opening the lesson")).toHaveCount(0, { timeout: 15_000 });
      await assertSurface(page, bag);
    }
  }

  for (const comic of comics()) {
    const response = await page.goto(`/wortschatz/${comic.id}`, { waitUntil: "domcontentloaded" });
    expect(response?.ok(), comic.id).toBeTruthy();
    for (const chapter of comic.chapters) {
      await page.goto(`/wortschatz/${comic.id}#ch=${chapter.n}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".panel, .chap").first()).toBeVisible();
      const panels = page.locator(`.panel[data-ch="${chapter.n}"]`);
      expect(await panels.count()).toBeGreaterThan(0);
      const box = await panels.first().boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(20);
      expect(box?.height ?? 0).toBeGreaterThan(20);
      await expect(panels.first().locator("svg.art")).toBeVisible();
      await assertSurface(page, bag);
    }
    for (const tab of ["Wortschatz", "Quiz", "Karteikarten"]) {
      await page.getByRole("tab", { name: new RegExp(tab) }).click();
      await expect(page.locator(".view.active")).toBeVisible();
      await assertSurface(page, bag);
    }
  }
});

test("course map unlocks A1 and a mastered lesson shows on the summary", async ({ page }) => {
  const bag: string[] = [];
  attach(page, bag);
  await page.goto("/learn", { waitUntil: "domcontentloaded" });
  const a1 = page.locator("section.level-band").first();
  await expect(a1.locator("h2")).toHaveText("A1");
  expect(await a1.locator(".soon-pill").count()).toBe(0);
  expect(await a1.locator("a.lesson-card").count()).toBeGreaterThan(20);
  await assertSurface(page, bag);

  await page.addInitScript(() => {
    const id = "a1-09-fragewort";
    const mc: Record<string, { wrong: number[]; solved: boolean }> = {};
    for (let index = 0; index < 10; index++) mc[`gq:lernkontrolle:${index}`] = { wrong: [], solved: true };
    const saved = {
      lessonId: id,
      stepIndex: 12,
      pts: {},
      seen: {},
      hints: {},
      mc,
      tips: {},
      gapDone: {},
      gapTries: {},
      lines: {},
      built: {},
      buildTries: {},
      matched: {},
      matchTries: {},
      marks: {},
      coloured: {},
      colourTries: {},
      pen: "navy",
      showEn: true,
      showCases: false,
      highlight: false,
      anim: {},
      writing: {},
      solved: {},
      wrong: {},
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem(`medideutsch:v1:${id}`, JSON.stringify(saved));
    localStorage.setItem("medideutsch:v1:index", JSON.stringify([id]));
  });
  await page.goto("/learn/a1/a1-09-fragewort?step=13", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Mastered")).toBeVisible();
  await page.goto("/account", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Mastered").first()).toBeVisible();
  await assertSurface(page, bag);
});

test("Wortbank saves, marks Schwer, and opens practice", async ({ page }) => {
  const bag: string[] = [];
  attach(page, bag);
  await page.goto("/learn/a1/a1-09-fragewort?step=0", { waitUntil: "domcontentloaded" });
  await page.locator("button.w", { hasText: "Patient" }).first().click();
  await page.getByTestId("wortbank-save").click();
  await expect(page.getByTestId("wortbank-save")).toContainText("Gespeichert");
  await page.getByTestId("wortbank-hard").click();
  await expect(page.getByTestId("wortbank-hard")).toHaveAttribute("aria-pressed", "true");

  await page.goto("/wortbank", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Wortbank" })).toBeVisible();
  await expect(page.getByText("Patient").first()).toBeVisible();
  await page.getByRole("tab", { name: /Schwere Wörter/ }).click();
  await expect(page.getByText("Patient").first()).toBeVisible();
  await page.locator("button.wb-word").first().click();
  await expect(page.getByTestId("word-detail")).toBeVisible();

  await page.goto("/wortbank", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Trennbare Verben" }).click();
  await expect(page.getByTestId("satzklammer")).toBeVisible();
  await page.getByTestId("prefix-chip").click();
  await expect(page.getByText("Stimmt.")).toBeVisible();

  await page.getByRole("tab", { name: "Wiederholen" }).click();
  await expect(page.getByTestId("flashcard-review")).toBeVisible();
  await page.locator(".wb-card").click();
  await page.getByTestId("grade-good").click();
  await assertSurface(page, bag);
});

test("mobile course map, lesson, and Wortbank stay on screen", async ({ page }) => {
  const bag: string[] = [];
  attach(page, bag);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ["/learn", "/learn/a1/a1-33-wechsel-dativ?step=0", "/wortbank", "/wortschatz/wortschatz-aufnahmegespraech"]) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Opening the lesson")).toHaveCount(0);
    await assertSurface(page, bag);
  }
});
