import { expect, test } from "@playwright/test";
import path from "path";
import fs from "fs";

const LESSON = "/learn/a2/a2-34-wechselpraepositionen";
const OUT = "/workspace/ch34-inspect";

test.describe("ch34 full step render inspect", () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test("render every step and capture text", async ({ page }) => {
    const report: string[] = [];
    for (let step = 0; step <= 9; step++) {
      await page.goto(`${LESSON}?step=${step}`);
      await page.waitForTimeout(400);
      const title = (await page.locator("h1, h2, .step-title, .panel-title").first().textContent().catch(() => "")) || "";
      const body = (await page.locator("main, .lesson, .step, body").first().innerText()) || "";
      const clip = body.replace(/\s+/g, " ").trim().slice(0, 1200);
      report.push(`\n===== STEP ${step} title=${title.trim()} =====\n${clip}\n`);
      await page.screenshot({ path: path.join(OUT, `step-${step}.png`), fullPage: true });

      // Step-specific checks
      if (step === 2) {
        // Lücken: chips should be short; no full "im Bett" as chip label ideally
        const bank = page.locator(".bank, .chips, .sticky");
        await expect(bank.first()).toBeVisible();
        const chipText = await bank.first().innerText();
        report.push(`CHIPS:\n${chipText}\n`);
        // Should contain short forms
        expect(chipText).toMatch(/\bim\b/);
        expect(chipText).toMatch(/\bins\b/);
        // Should NOT offer whole phrases like "im Bett" as a chip
        expect(chipText).not.toMatch(/im Bett/);
        expect(chipText).not.toMatch(/ins Zimmer/);
        // Gaps show before/after context
        const gitems = page.locator(".gitem");
        await expect(gitems.first()).toBeVisible();
        const g0 = (await gitems.first().innerText()).replace(/\s+/g, ' ').trim();
        report.push(`GITEM0:\n${g0}\n`);
        expect(g0).toMatch(/Herr\s+Braun\s+liegt/);
        expect(g0).toMatch(/Bett/);
      }
      if (step === 5) {
        const cards = page.locator(".pm-card, .picture, .pitem, .match-card, img, svg");
        report.push(`BILDER count-ish visible: ${await page.locator("body").innerText().then(t => t.slice(0,400))}\n`);
      }
      if (step === 6) {
        await expect(page.locator(".df-dialog")).toBeVisible();
        await expect(page.locator("button:has-text('Dialog anhören')")).toBeVisible();
      }
      if (step === 7) {
        await expect(page.locator(".sw-cue").first()).toBeVisible();
        await expect(page.locator("input.sw-input").first()).toBeVisible();
      }
    }
    fs.writeFileSync(path.join(OUT, "report.txt"), report.join("\n"));
  });
});
