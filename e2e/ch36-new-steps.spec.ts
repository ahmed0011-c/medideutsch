import { expect, test } from "@playwright/test";
import path from "path";

const LESSON = "/learn/a2/a2-36-adjektive";

test.describe("ch36 sentencewrite + dialogfill", () => {
  test("Schreiben: wrong highlight, alt order, audio", async ({ page }) => {
    await page.goto(`${LESSON}?step=7`);
    await expect(page.locator(".sw-cue").first()).toBeVisible();

    const first = page.locator(".sw-card").first();
    const input = first.locator("input.sw-input");
    await input.fill("Der Patient hat einen starker Schmerz");
    await first.locator("button:has-text('Prüfen')").click();
    await expect(first.locator(".sw-tok.bad")).toBeVisible();
    await expect(first.locator(".sw-reasons li").first()).toContainText(/starken|Akkusativ/i);

    await input.fill("Einen starken Schmerz hat der Patient");
    await first.locator("button:has-text('Prüfen')").click();
    await expect(first.locator(".ok-chip")).toContainText("Richtig");
    await expect(first.locator("button[aria-label='Satz anhören']")).toBeVisible();

    await page.screenshot({ path: path.join("/workspace", "ch36-schreiben.png"), fullPage: true });
  });

  test("Dialog: wrong then right, listen button", async ({ page }) => {
    await page.goto(`${LESSON}?step=6`);
    await expect(page.locator(".df-dialog")).toBeVisible();

    const firstGap = page.locator(".df-gap-opts").first();
    // wrong option first (usually index 1 is wrong when answer is 0)
    const opts = firstGap.locator("button.df-opt");
    const count = await opts.count();
    expect(count).toBe(2);
    // click the option that is NOT the correct filled text later — try both carefully
    await opts.nth(1).click();
    // if answer was 1, nth(1) was correct; ensure we still exercise wrong path
    const wrongVisible = await firstGap.locator("button.df-opt.wrong").count();
    if (wrongVisible === 0) {
      // answer was 1; reopen by reloading and clicking 0
      await page.goto(`${LESSON}?step=6`);
      await page.locator(".df-gap-opts").first().locator("button.df-opt").nth(0).click();
      await expect(page.locator(".df-gap-opts").first().locator("button.df-opt.wrong")).toBeVisible();
      await page.locator(".df-gap-opts").first().locator("button.df-opt:not(.wrong)").click();
    } else {
      await expect(firstGap.locator(".df-why")).toBeVisible();
      await firstGap.locator("button.df-opt:not(.wrong)").click();
    }
    await expect(page.locator(".df-gap.filled").first()).toBeVisible();

    // solve remaining gaps with the correct option each time
    while ((await page.locator(".df-gap-opts").count()) > 0) {
      const gap = page.locator(".df-gap-opts").first();
      const buttons = gap.locator("button.df-opt:not(.wrong)");
      // try first remaining; if wrong, try second
      await buttons.first().click();
      if ((await gap.count()) > 0 && (await gap.locator("button.df-opt.wrong").count()) > 0) {
        await gap.locator("button.df-opt:not(.wrong)").click();
      }
    }

    const listen = page.locator("button:has-text('Dialog anhören')");
    await expect(listen).toBeEnabled();
    await page.screenshot({ path: path.join("/workspace", "ch36-dialog.png"), fullPage: true });
  });
});
