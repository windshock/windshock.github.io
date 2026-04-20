import { test, expect } from '@playwright/test';

/**
 * 모바일 portrait(390x844)에서 전체 슬라이드 레이아웃을 검증한다:
 *   - 슬라이드별 clipping (scrollHeight > clientHeight + 32)
 *   - deck-host가 뷰포트에 정확히 수렴
 *   - chrome row가 너무 길어 두 줄로 랩되지 않는지
 *   - 각 슬라이드의 텍스트가 실제로 존재 (빈 슬라이드 없음)
 *
 * 스크린샷은 CAPTURE_PRESENTATION_MOBILE=1 일 때만 저장.
 */
const capture = !!process.env.CAPTURE_PRESENTATION_MOBILE;

test.describe('Presentation mobile portrait quality', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('KO clustering: per-slide + chrome + watermark on phone portrait', async ({ page }) => {
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

    // 1) deck-host가 뷰포트에 딱 맞는가
    const hostFits = await page.evaluate(() => {
      const h = document.querySelector('#presentation-deck-host');
      if (!h) return null;
      const r = h.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: window.innerWidth - (r.left + r.width),
        bottom: window.innerHeight - (r.top + r.height),
      };
    });
    expect(hostFits, 'deck-host fits viewport').not.toBeNull();
    expect(Math.abs(hostFits!.left), 'deck-host left aligned').toBeLessThan(4);
    expect(Math.abs(hostFits!.top), 'deck-host top aligned').toBeLessThan(4);

    // 2) chrome row가 너무 높아 내용을 많이 가리지 않는가 (한 줄로 수렴)
    const chromeHeight = await page.evaluate(() => {
      const c = document.querySelector('#presentation-deck-host .presentation-deck-chrome');
      return c ? c.getBoundingClientRect().height : -1;
    });
    expect(chromeHeight, 'chrome row height').toBeGreaterThan(0);
    // Tap target min-height=44px + padding pushes single row to ~54px; two-row wrap hits ~100px.
    // Keep under 80px: single row is fine, but wrap-to-two would fail.
    expect(chromeHeight, 'chrome row should not wrap on mobile (< 80px)').toBeLessThan(80);

    // 3) 워터마크 존재 여부 (390px는 표시 기준인 370px 초과이므로 보여야 함)
    const watermarkVisible = await page.evaluate(() => {
      const w = document.querySelector('#presentation-deck-host .presentation-deck-credit-watermark');
      if (!w) return false;
      const r = w.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    expect(watermarkVisible, 'watermark visible at 390px').toBe(true);

    // 4) 전체 horizontal 슬라이드 clipping 체크
    const clippedHorizontalSlides = await page.evaluate(() => {
      const roots = Array.from(
        document.querySelectorAll('#presentation-deck-host .reveal .slides > section'),
      );
      const bad: { idx: number; overflow: number }[] = [];
      roots.forEach((el, i) => {
        if (el.classList.contains('presentation-vertical-stack')) return;
        const overflow = el.scrollHeight - el.clientHeight;
        if (overflow > 32) bad.push({ idx: i, overflow });
      });
      return bad;
    });
    expect(
      clippedHorizontalSlides,
      `horizontal slides must not clip on phone portrait: ${JSON.stringify(clippedHorizontalSlides)}`,
    ).toEqual([]);

    // 5) 슬라이드 traversal: 각 슬라이드가 내용이 있고 viewport에 정확히 들어가는지
    await page.evaluate(() => {
      if (typeof window.Reveal.slide === 'function') {
        window.Reveal.slide(0, 0);
      }
    });

    let step = 0;
    const offenders: { step: number; reason: string }[] = [];
    while (true) {
      await page.waitForTimeout(350); // Reveal 전환이 끝난 뒤 측정
      const m = await page.evaluate(() => {
        const R = window.Reveal;
        const el = R.getCurrentSlide();
        if (!el) return null;
        const text = (el.innerText || '').trim();
        const hasBlock = !!el.querySelector(
          'p,pre,table,h1,h2,h3,h4,ul,ol,blockquote,figure,code,td,th,img',
        );
        const isPrefixVisual =
          el.classList.contains('presentation-slide--cover') ||
          el.classList.contains('presentation-slide--infographic');
        const r = el.getBoundingClientRect();
        return {
          textLen: text.length,
          hasBlock,
          isPrefixVisual,
          overflow: el.scrollHeight - el.clientHeight,
          offscreenBottom: r.top + r.height - window.innerHeight,
        };
      });
      if (!m) break;
      if (!(m.hasBlock || m.textLen >= 28 || m.isPrefixVisual)) {
        offenders.push({ step, reason: `empty/too-little (textLen=${m.textLen})` });
      }
      if (m.overflow > 32) {
        offenders.push({ step, reason: `clipping (overflow=${m.overflow}px)` });
      }
      if (m.offscreenBottom > 4) {
        offenders.push({ step, reason: `slide extends below viewport by ${m.offscreenBottom}px` });
      }

      if (capture) {
        await page.waitForTimeout(800); // Reveal 전환 완전 종료 및 이전 슬라이드 페이드아웃 대기
        const deck = page.locator('#presentation-deck-host');
        await deck.screenshot({
          path: `test-results/mobile-slide-${String(step).padStart(2, '0')}.png`,
        });
      }

      const isLast = await page.evaluate(() => window.Reveal.isLastSlide());
      if (isLast) break;
      await page.evaluate(() => window.Reveal.next());
      step++;
      if (step > 300) throw new Error('Too many slides');
    }

    expect(offenders, `mobile portrait offenders:\n${offenders.map((o) => `  #${o.step}: ${o.reason}`).join('\n')}`).toEqual([]);
    expect(pageErrors, `pageerror:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `console.error:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
