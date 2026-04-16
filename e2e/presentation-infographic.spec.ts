import { test, expect } from '@playwright/test';

test('KO clustering Present: slide 1 cover, slide 2 infographic', async ({ page }) => {
  await page.goto('/ko/post/2026-04-15-security-code-clustering/');
  await page.locator('#presentation-btn-present').click();
  await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 90_000 });

  await page.waitForFunction(
    () =>
      window.Reveal &&
      typeof window.Reveal.isReady === 'function' &&
      window.Reveal.isReady(),
    { timeout: 90_000 }
  );

  const roots = page.locator('#presentation-deck-host .reveal .slides > section');
  await expect(roots.nth(0)).toHaveClass(/presentation-slide--cover/);
  await expect(roots.nth(1)).toHaveClass(/presentation-slide--infographic/);
  await expect(roots.nth(1).locator('img.presentation-slide-infographic-img')).toBeVisible();
  await expect(roots.nth(1).locator('img.presentation-slide-infographic-img')).toHaveAttribute(
    'src',
    /Precision_Security_Clustering_infographic/
  );
});
