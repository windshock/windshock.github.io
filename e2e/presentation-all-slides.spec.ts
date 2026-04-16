import { test, expect } from '@playwright/test';

/**
 * Walk the entire deck with Reveal.next() until isLastSlide(),
 * and assert visit count matches Reveal.getTotalSlides() / getSlides().length.
 */
test('KO clustering: traverse entire slide deck with Reveal.next', async ({ page }) => {
  await page.goto('/ko/post/2026-04-15-security-code-clustering/');
  await page.locator('#presentation-btn-present').click();
  await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('#presentation-deck-host .slides section').first()).toBeVisible({
    timeout: 90_000,
  });

  await page.waitForFunction(
    () => {
      const R = window.Reveal;
      return !!(R && typeof R.isReady === 'function' && R.isReady() && typeof R.next === 'function');
    },
    { timeout: 90_000 }
  );

  const result = await page.evaluate(() => {
    const R = window.Reveal;
    if (!R || typeof R.next !== 'function' || typeof R.isLastSlide !== 'function') {
      throw new Error('Reveal API missing on window');
    }
    const getTotalSlides = typeof R.getTotalSlides === 'function' ? R.getTotalSlides() : null;
    const slidesLen = typeof R.getSlides === 'function' ? R.getSlides().length : null;

    if (typeof R.slide === 'function') {
      R.slide(0, 0);
    }

    const indicesPath: string[] = [];
    let moves = 0;
    while (true) {
      indicesPath.push(JSON.stringify(R.getIndices()));
      if (R.isLastSlide()) break;
      R.next();
      moves++;
      if (moves > 300) {
        throw new Error(`Too many moves (>${300}), possible loop`);
      }
    }

    return {
      moves,
      positionsVisited: indicesPath.length,
      getTotalSlides,
      slidesLen,
      lastIndices: R.getIndices(),
    };
  });

  expect(result.getTotalSlides).not.toBeNull();
  expect(result.slidesLen).not.toBeNull();
  expect(result.positionsVisited).toBe(result.getTotalSlides);
  expect(result.positionsVisited).toBe(result.slidesLen);
  expect(result.lastIndices).toBeTruthy();
});
