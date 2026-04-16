import { test, expect } from '@playwright/test';

test('Present: first slide is cover when post has image frontmatter', async ({ page }) => {
  await page.goto('/en/post/2026-04-16-presentation-mode-demo/');
  await page.locator('#presentation-btn-present').click();
  await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 90_000 });

  await page.waitForFunction(
    () =>
      window.Reveal &&
      typeof window.Reveal.isReady === 'function' &&
      window.Reveal.isReady() &&
      typeof window.Reveal.getCurrentSlide === 'function',
    { timeout: 90_000 }
  );

  const first = page.locator('#presentation-deck-host .reveal .slides > section').first();
  await expect(first).toHaveClass(/presentation-slide--cover/);
  await expect(first.locator('img.presentation-slide-cover-img')).toBeVisible();
  await expect(first.locator('img.presentation-slide-cover-img')).toHaveAttribute('src', /.+/);
  await expect(first.locator('p.presentation-slide-cover-title')).toContainText(/Presentation mode demo/i);
});
