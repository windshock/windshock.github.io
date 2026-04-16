import { test, expect } from '@playwright/test';

const capture = !!process.env.CAPTURE_PRESENTATION;

/**
 * DOM·치수·에러로 품질을 보고, CAPTURE_PRESENTATION=1이면 슬라이드별 스크린샷도 남김.
 */
test.describe('Presentation quality', () => {
  test('KO clustering: per-slide checks + optional screenshots', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (/ResizeObserver|favicon|Failed to load resource.*adsbygoogle|net::ERR_BLOCKED_BY_CLIENT/i.test(text)) {
        return;
      }
      consoleErrors.push(text);
    });

    await page.goto('/ko/post/2026-04-15-security-code-clustering/');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => {
      try {
        localStorage.setItem('presentation-reveal-theme-pref', 'black');
      } catch (_) {
        /* ignore */
      }
    });

    await page.locator('#presentation-btn-present').click();
    await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('#presentation-deck-host .slides section').first()).toBeVisible({
      timeout: 90_000,
    });

    await page.waitForFunction(
      () =>
        window.Reveal &&
        typeof window.Reveal.isReady === 'function' &&
        window.Reveal.isReady() &&
        typeof window.Reveal.next === 'function',
      { timeout: 90_000 }
    );

    const clippedHorizontalSlides = await page.evaluate(() => {
      const roots = Array.from(document.querySelectorAll('#presentation-deck-host .reveal .slides > section'));
      const bad: number[] = [];
      roots.forEach((el, i) => {
        if (el.classList.contains('presentation-vertical-stack')) return;
        if (el.scrollHeight > el.clientHeight + 32) bad.push(i);
      });
      return bad;
    });
    expect(
      clippedHorizontalSlides,
      `horizontal slides must not clip: indices ${clippedHorizontalSlides.join(',')}`
    ).toEqual([]);

    const hostFitsViewport = await page.evaluate(() => {
      const h = document.querySelector('#presentation-deck-host');
      if (!h) return false;
      const r = h.getBoundingClientRect();
      return (
        r.left >= -2 &&
        r.top >= -2 &&
        r.width <= window.innerWidth + 4 &&
        r.height <= window.innerHeight + 4
      );
    });
    expect(hostFitsViewport, 'presentation deck host should cover viewport without spilling').toBe(true);

    await page.evaluate(() => {
      if (typeof window.Reveal.slide === 'function') {
        window.Reveal.slide(0, 0);
      }
    });

    let step = 0;
    while (true) {
      const metrics = await page.evaluate(() => {
        const R = window.Reveal;
        const el = R.getCurrentSlide();
        if (!el) return null;
        const text = (el.innerText || '').trim();
        const hasBlock = !!el.querySelector(
          'p,pre,table,h1,h2,h3,h4,ul,ol,blockquote,figure,code,td,th,img'
        );
        const continuedOnly = !!el.querySelector('.presentation-continued');
        const isPrefixVisual =
          el.classList.contains('presentation-slide--cover') ||
          el.classList.contains('presentation-slide--infographic');
        return {
          textLen: text.length,
          hasBlock,
          continuedOnly,
          isPrefixVisual,
        };
      });

      expect(metrics, `slide step ${step}: current slide element`).not.toBeNull();
      expect(
        metrics!.textLen > 2 || metrics!.isPrefixVisual,
        `slide ${step}: empty text`
      ).toBe(true);
      const substantive =
        metrics!.hasBlock ||
        metrics!.textLen >= 28 ||
        (metrics!.continuedOnly && metrics!.textLen >= 8) ||
        metrics!.isPrefixVisual;
      expect(substantive, `slide ${step}: too little content`).toBe(true);

      if (capture) {
        const deck = page.locator('#presentation-deck-host .reveal');
        await deck.screenshot({
          path: `test-results/quality-slide-${String(step).padStart(2, '0')}.png`,
        });
      }

      const isLast = await page.evaluate(() => window.Reveal.isLastSlide());
      if (isLast) break;

      await page.evaluate(() => window.Reveal.next());
      step++;
      if (step > 300) {
        throw new Error('Too many slides — possible infinite loop');
      }
    }

    expect(pageErrors, `pageerror:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `console.error:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
