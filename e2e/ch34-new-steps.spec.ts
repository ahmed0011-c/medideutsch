import { expect, test } from "@playwright/test";
import path from "path";

const LESSON = "/learn/a2/a2-34-wechselpraepositionen";

test.describe("ch34 sentencewrite + dialogfill", () => {
  test("Schreiben: wrong highlight, alt order, audio", async ({ page }) => {
    await page.goto(`${LESSON}?step=7`);
    await expect(page.locator(".sw-cue").first()).toBeVisible();

    const first = page.locator(".sw-card").first();
    const input = first.locator("input.sw-input");
    // first: Herr Braun • Wo? • im Bett → Herr Braun liegt im Bett
    await input.fill("Herr Braun liegt ins Bett");
    await first.locator("button:has-text('Prüfen')").click();
    await expect(first.locator(".sw-tok.bad").first()).toBeVisible();

    await input.fill("Herr Braun liegt im Bett");
    await first.locator("button:has-text('Prüfen')").click();
    await expect(first.locator(".ok-chip")).toContainText("Richtig");
    await expect(first.locator("button[aria-label='Satz anhören']")).toBeVisible();

    await page.screenshot({ path: path.join("/workspace", "ch34-schreiben.png"), fullPage: true });
  });

  test("Dialog: wrong then right, listen button", async ({ page }) => {
    await page.goto(`${LESSON}?step=6`);
    await expect(page.locator(".df-dialog")).toBeVisible();

    const firstGap = page.locator(".df-gap-opts").first();
    const opts = firstGap.locator("button.df-opt");
    expect(await opts.count()).toBe(2);
    // first gap correct is index 1 (Sie liegt im Bett at pos 1)
    await opts.nth(0).click();
    const wrongVisible = await firstGap.locator("button.df-opt.wrong").count();
    if (wrongVisible === 0) {
      await page.goto(`${LESSON}?step=6`);
      await page.locator(".df-gap-opts").first().locator("button.df-opt").nth(1).click();
      await expect(page.locator(".df-gap-opts").first().locator("button.df-opt.wrong")).toBeVisible();
      await page.locator(".df-gap-opts").first().locator("button.df-opt:not(.wrong)").click();
    } else {
      await expect(firstGap.locator(".df-why")).toBeVisible();
      await firstGap.locator("button.df-opt:not(.wrong)").click();
    }
    await expect(page.locator(".df-gap.filled").first()).toBeVisible();

    while ((await page.locator(".df-gap-opts").count()) > 0) {
      const gap = page.locator(".df-gap-opts").first();
      await gap.locator("button.df-opt:not(.wrong)").first().click();
      if ((await gap.count()) > 0 && (await gap.locator("button.df-opt.wrong").count()) > 0) {
        await gap.locator("button.df-opt:not(.wrong)").click();
      }
    }

    const listen = page.locator("button:has-text('Dialog anhören')");
    await expect(listen).toBeEnabled();
    await page.screenshot({ path: path.join("/workspace", "ch34-dialog.png"), fullPage: true });
  });
});
