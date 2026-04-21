import { test, expect } from '@playwright/test';

/**
 * 한국어 MeloTTS(gnyong/melotts-kr-onnx int8) 브라우저 추론 smoke test.
 *  - 한국어 글에서 🔊 클릭 → ONNX 모델 다운로드(~53MB) + 합성 → audio-chunk 도달 확인.
 */
test.describe('TTS smoke (Korean MeloTTS)', () => {
  test('Present mode KO clustering: click Play → MeloTTS audio', async ({ page }) => {
    test.setTimeout(420_000);

    const logs: string[] = [];
    page.on('console', (msg) => {
      const t = msg.type();
      if (!['log', 'info', 'warn', 'error', 'debug'].includes(t)) return;
      logs.push(`[page:${t}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${err.stack || ''}`));

    page.on('worker', (worker) => {
      logs.push(`[worker-created] ${worker.url()}`);
      worker.on('close', () => logs.push(`[worker-closed] ${worker.url()}`));
    });
    page.on('requestfailed', (req) => {
      logs.push(`[reqfailed] ${req.url()} — ${req.failure()?.errorText || 'unknown'}`);
    });
    page.on('response', (res) => {
      if (!res.ok() && /presentation|tts|kokoro|melotts|\.onnx|\.wasm/i.test(res.url())) {
        logs.push(`[bad-response] ${res.status()} ${res.url()}`);
      }
    });

    /** Hugo livereload를 차단해서 외부 파일 변경이 테스트 페이지를 리로드하지 않도록. */
    await page.route('**/livereload.js*', (route) => route.abort());
    await page.route('**/livereload', (route) => route.abort());

    await page.goto('/ko/post/2026-04-15-security-code-clustering/?present=1');
    await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 60_000 });
    await page.waitForFunction(
      () => (window as any).Reveal && typeof (window as any).Reveal.isReady === 'function' && (window as any).Reveal.isReady(),
      { timeout: 60_000 },
    );

    /** 본문 슬라이드 찾을 때까지 next() 반복 (cover/infographic 스킵) */
    const extractResult = await page.evaluate(async () => {
      const mod = await import('/js/presentation/tts-text.js' as string);
      const R = (window as any).Reveal;
      for (let i = 0; i < 10; i++) {
        const cur = R.getCurrentSlide();
        const text = mod.extractSlideText(cur, 'ko');
        if (text && text.length > 50) {
          return {
            slideIdx: i,
            slideClasses: cur?.className || '',
            extracted: text.slice(0, 200),
            extractedLen: text.length,
          };
        }
        R.next();
        await new Promise((r) => setTimeout(r, 400));
      }
      return { slideIdx: -1, slideClasses: '', extracted: '', extractedLen: 0 };
    });
    console.log(`[TEST] found content slide at +${extractResult.slideIdx} next()s`);
    console.log(`[TEST] slide classes: ${extractResult.slideClasses}`);
    console.log(`[TEST] extracted (${extractResult.extractedLen} chars): ${extractResult.extracted}`);
    expect(extractResult.extractedLen, 'content slide text').toBeGreaterThan(50);

    const ttsBtn = page.locator('.presentation-deck-tts-btn');
    await ttsBtn.click();

    /** 클릭 직후 loading으로 전환됐는지 먼저 확인 (1초 내) */
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('.presentation-deck-tts-btn');
        const s = btn?.getAttribute('data-tts-state');
        return s === 'loading' || s === 'speaking' || s === 'error';
      },
      { timeout: 5_000 },
    ).catch(() => {
      console.log('[TEST] WARN: never transitioned out of idle within 5s — speak() may not have fired');
    });

    /** loading에서 speaking/error/idle로 최종 settle까지 모니터링 */
    const start = Date.now();
    let lastState = '';
    let settled = false;
    let stateValue = 'idle';
    while (Date.now() - start < 300_000) {
      const s = await page.evaluate(() => {
        const btn = document.querySelector('.presentation-deck-tts-btn');
        return btn?.getAttribute('data-tts-state') || '';
      });
      if (s !== lastState) {
        console.log(`[TEST] +${((Date.now() - start) / 1000).toFixed(1)}s state: "${s}"`);
        lastState = s;
      }
      if (s === 'speaking' || s === 'error') {
        stateValue = s;
        settled = true;
        break;
      }
      /** idle로 돌아오려면 한 번 loading을 거쳤어야 함 */
      if (s === 'idle' && lastState === 'speaking') {
        stateValue = 'idle';
        settled = true;
        break;
      }
      await page.waitForTimeout(1500);
    }

    /** case-insensitive 매칭 필수 (로그 prefix [TTS-KR]처럼 대문자) */
    const ttsLogs = logs.filter((l) =>
      /\btts\b|kokoro|melotts|worker|audio-chunk|onnx|\bort\b|g2p|phonem|synth|wasm|webgpu|\bTTS-KR\b/i.test(l),
    );
    console.log(`[TEST] captured ${ttsLogs.length} TTS-related log lines:`);
    for (const l of ttsLogs) console.log('  ' + l);

    if (!settled) {
      throw new Error(`Korean TTS did not settle within 5 minutes; last state: ${lastState}. See logs.`);
    }
    if (stateValue === 'error') {
      const title = await ttsBtn.getAttribute('title');
      throw new Error(`Korean TTS ended in error. Tooltip: "${title}". See logs above.`);
    }
    expect(stateValue).not.toBe('error');
  });
});
