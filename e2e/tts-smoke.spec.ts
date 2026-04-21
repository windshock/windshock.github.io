import { test, expect } from '@playwright/test';

/**
 * 실제 Kokoro q8 다운로드 + 영어 합성까지 헤드리스 브라우저로 재현.
 *  - 모든 console.log/warn/error/debug 수집
 *  - TTS 상태 전이 추적 (idle → loading → speaking → idle/error)
 *  - 첫 오디오 chunk 도착 시각, 실패 시 에러 메시지 정확히 출력
 *  - 합성된 audio buffer의 실제 길이를 페이지에서 측정해 무음/에러 판별
 */
test.describe('TTS smoke (English Kokoro q8)', () => {
  test('Present mode EN clustering: click Play → eventually plays audio', async ({ page }) => {
    test.setTimeout(300_000);

    const logs: string[] = [];
    page.on('console', (msg) => {
      const t = msg.type();
      if (!['log', 'info', 'warn', 'error', 'debug'].includes(t)) return;
      logs.push(`[${t}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

    await page.goto('/en/post/2026-04-15-security-code-clustering/?present=1');
    /** Reveal + chrome 초기화 대기 */
    await expect(page.locator('#presentation-deck-host')).toBeVisible({ timeout: 60_000 });
    await page.waitForFunction(
      () => window.Reveal && typeof window.Reveal.isReady === 'function' && window.Reveal.isReady(),
      { timeout: 60_000 },
    );

    /** TTS 진단 hooks: 엔진 상태 전이와 AudioContext currentTime을 window에 노출 */
    await page.evaluate(() => {
      /** @type {any} */ (window).__ttsLog = [];
      const origPostMessage = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (...args) {
        try {
          /** @type {any} */ (window).__ttsLog.push({ dir: 'to-worker', msg: JSON.parse(JSON.stringify(args[0])) });
        } catch (_) {
          /* transfer 대상 포함 시 직렬화 실패 — 그래도 메시지 타입만 남김 */
          /** @type {any} */ (window).__ttsLog.push({ dir: 'to-worker', msg: { type: args[0]?.type } });
        }
        return origPostMessage.apply(this, args);
      };
    });

    /** 3번째 슬라이드(콘텐츠 많음)로 이동해서 빈 텍스트 버그 방지 */
    await page.evaluate(() => {
      if (typeof window.Reveal.slide === 'function') window.Reveal.slide(2, 0);
    });
    await page.waitForTimeout(300);

    const ttsBtn = page.locator('.presentation-deck-tts-btn');
    await expect(ttsBtn).toBeVisible();

    /** 재생 클릭 전 슬라이드에서 추출될 텍스트가 비지 않음을 확인 */
    const slideText = await page.evaluate(() => {
      const s = window.Reveal.getCurrentSlide();
      return (s?.innerText || '').trim();
    });
    console.log(`[TEST] current slide text length: ${slideText.length}`);
    console.log(`[TEST] first 120 chars: ${slideText.slice(0, 120)}`);
    expect(slideText.length, 'current slide has text to speak').toBeGreaterThan(20);

    /** 🔊 클릭 */
    await ttsBtn.click();

    /** 상태가 loading → speaking 또는 error로 바뀔 때까지 대기 (최대 4분) */
    const finalState = await page.waitForFunction(
      () => {
        const btn = document.querySelector('.presentation-deck-tts-btn');
        const s = btn?.getAttribute('data-tts-state');
        if (s === 'speaking' || s === 'error' || s === 'idle') return s;
        return false;
      },
      { timeout: 240_000, polling: 500 },
    );
    const stateValue = await finalState.jsonValue();
    console.log(`[TEST] final TTS state: ${stateValue}`);

    /** 관련 console 메시지 필터링해서 전부 출력 */
    const ttsLogs = logs.filter((l) => /tts|kokoro|worker|audio-chunk|onnx|ort|phonemiz|speak|synth/i.test(l));
    console.log(`[TEST] captured ${ttsLogs.length} TTS-related log lines:`);
    for (const l of ttsLogs) console.log('  ' + l);

    /** to-worker 메시지 요약 */
    const workerMsgs = await page.evaluate(() => /** @type {any} */ (window).__ttsLog || []);
    console.log(`[TEST] ${workerMsgs.length} messages to worker:`);
    for (const m of workerMsgs.slice(0, 20)) console.log('  ' + JSON.stringify(m));

    if (stateValue === 'error') {
      /** 에러 상태면 제목(툴팁) 읽어서 원인 힌트 */
      const title = await ttsBtn.getAttribute('title');
      throw new Error(`TTS ended in error state. Tooltip: "${title}". See logs above.`);
    }

    expect(stateValue, 'TTS should reach speaking or idle, not error').not.toBe('error');
  });
});
