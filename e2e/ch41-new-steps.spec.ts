import { expect, test } from "@playwright/test";
import path from "path";

const LESSON = "/learn/a2/a2-41-konnektoren-pos1";

test.describe("ch41 sentencewrite + dialogfill", () => {
  test("Schreiben: wrong highlight, alt order, audio", async ({ page }) => {
    await page.goto(`${LESSON}?step=7`);
    await expect(page.locator(".sw-cue").first()).toBeVisible();

    const first = page.locator(".sw-card").first();
    const input = first.locator("input.sw-input");
    // first: Schwindel • Deshalb • setzt sich → Deshalb setzt er sich
    await input.fill("Er hat Schwindel. Deshalb er setzt sich");
    await first.locator("button:has-text('Prüfen')").click();
    await expect(first.locator(".sw-tok.bad").first()).toBeVisible();

    await input.fill("Deshalb setzt er sich");
    await first.locator("button:has-text('Prüfen')").click();
    await expect(first.locator(".ok-chip")).toContainText("Richtig");
    await expect(first.locator("button[aria-label='Satz anhören']")).toBeVisible();

    await page.screenshot({ path: path.join("/workspace", "ch41-schreiben.png"), fullPage: true });
  });

  test("Dialog: wrong then right, listen button", async ({ page }) => {
    await page.goto(`${LESSON}?step=6`);
    await expect(page.locator(".df-dialog")).toBeVisible();

    const firstGap = page.locator(".df-gap-opts").first();
    const opts = firstGap.locator("button.df-opt");
    expect(await opts.count()).toBe(2);
    await opts.nth(1).click();
    const wrongVisible = await firstGap.locator("button.df-opt.wrong").count();
    if (wrongVisible === 0) {
      await page.goto(`${LESSON}?step=6`);
      await page.locator(".df-gap-opts").first().locator("button.df-opt").nth(0).click();
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
    await page.screenshot({ path: path.join("/workspace", "ch41-dialog.png"), fullPage: true });
  });
});
