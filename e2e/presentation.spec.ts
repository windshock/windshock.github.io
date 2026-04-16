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

    await expect(deck.locator('a.presentation-deck-lang-btn[href*="/en/post/2026-04-15-security-code-clustering"]')).toHaveCount(1);

    if (capture) {
      await deck.screenshot({ path: 'test-results/presentation-02-deck.png' });
    }

    await page.keyboard.press('Escape');
    await expect(deck).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('#presentation-post-content')).toBeVisible();

    if (capture) {
      await page.screenshot({ path: 'test-results/presentation-03-after-escape.png', fullPage: true });
    }

    await page.locator('#presentation-btn-present').click();
    const deckAgain = page.locator('#presentation-deck-host');
    await expect(deckAgain).toBeVisible({ timeout: 90_000 });
    const slidesAgain = deckAgain.locator('.reveal .slides section');
    await expect(slidesAgain.first()).toBeVisible({ timeout: 15_000 });
    expect(await slidesAgain.count()).toBeGreaterThan(0);
  });

  test('EN clustering post: Present opens deck', async ({ page }) => {
    await page.goto('/en/post/2026-04-15-security-code-clustering/');
    await page.locator('#presentation-btn-present').click();
    const deck = page.locator('#presentation-deck-host');
    await expect(deck).toBeVisible({ timeout: 90_000 });
    await expect(deck.locator('.reveal .slides section').first()).toBeVisible();
    await expect(deck.locator('a.presentation-deck-lang-btn[href*="/ko/post/2026-04-15-security-code-clustering"]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#presentation-deck-host')).toHaveCount(0);
  });

  test('EN clustering post: Back to article button closes deck', async ({ page }) => {
    await page.goto('/en/post/2026-04-15-security-code-clustering/');
    await page.locator('#presentation-btn-present').click();
    await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Back to article' }).click();
    await expect(page.locator('#presentation-deck-host')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('#presentation-post-content')).toBeVisible();
  });

  test('post without presentation: no Present control', async ({ page }) => {
    await page.goto('/ko/post/2026-04-07-dismantling-ato-supply-chain/');
    await expect(page.locator('#presentation-btn-present')).toHaveCount(0);
  });

  test('KO clustering post: ?present=1 opens deck on first load', async ({ page }) => {
    await page.goto('/ko/post/2026-04-15-security-code-clustering/?present=1');
    await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('#presentation-deck-host .reveal .slides section').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe('Presentation mode (narrow portrait)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('KO clustering: Present opens on phone-sized viewport', async ({ page }) => {
    await page.goto('/ko/post/2026-04-15-security-code-clustering/');
    await page.locator('#presentation-btn-present').click();
    await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('#presentation-deck-host .reveal .slides section').first()).toBeVisible({
      timeout: 15_000,
    });
    const scrollActivationWidth = await page.evaluate(() => {
      const R = /** @type {any} */ (window).Reveal;
      return R && typeof R.getConfig === 'function' ? R.getConfig().scrollActivationWidth : null;
    });
    expect(scrollActivationWidth).toBe(false);
    const scrollView = await page.evaluate(() => {
      const R = /** @type {any} */ (window).Reveal;
      return R && typeof R.isScrollView === 'function' ? R.isScrollView() : null;
    });
    expect(scrollView).toBe(false);
    await page.getByRole('button', { name: '글로 돌아가기' }).click();
    await expect(page.locator('#presentation-deck-host')).toHaveCount(0, { timeout: 15_000 });
  });
});
