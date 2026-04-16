import { test, expect } from '@playwright/test';

const capture = !!process.env.CAPTURE_PRESENTATION;

test.describe('Presentation mode', () => {
  test('KO clustering post: Present opens Reveal deck, Escape closes', async ({ page }) => {
    await page.goto('/ko/post/2026-04-15-security-code-clustering/');

    await expect(page.locator('#presentation-btn-read')).toBeVisible();
    await expect(page.locator('#presentation-btn-present')).toBeVisible();

    if (capture) {
      await page.screenshot({ path: 'test-results/presentation-01-read.png', fullPage: true });
    }

    await page.locator('#presentation-btn-present').click();

    const deck = page.locator('#presentation-deck-host');
    await expect(deck).toBeVisible({ timeout: 90_000 });

    const slides = deck.locator('.reveal .slides section');
    await expect(slides.first()).toBeVisible({ timeout: 10_000 });
    expect(await slides.count()).toBeGreaterThan(0);

    if (capture) {
      await deck.screenshot({ path: 'test-results/presentation-02-deck.png' });
    }

    await page.keyboard.press('Escape');
    await expect(deck).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('#presentation-post-content')).toBeVisible();

    if (capture) {
      await page.screenshot({ path: 'test-results/presentation-03-after-escape.png', fullPage: true });
    }
  });

  test('EN clustering post: Present opens deck', async ({ page }) => {
    await page.goto('/en/post/2026-04-15-security-code-clustering/');
    await page.locator('#presentation-btn-present').click();
    await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('#presentation-deck-host .reveal .slides section').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#presentation-deck-host')).toHaveCount(0);
  });

  test('post without presentation: no Present control', async ({ page }) => {
    await page.goto('/ko/post/2026-04-07-dismantling-ato-supply-chain/');
    await expect(page.locator('#presentation-btn-present')).toHaveCount(0);
  });
});
