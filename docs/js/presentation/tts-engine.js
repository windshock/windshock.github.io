/**
 * 메인 스레드 TTS 상태 머신.
 *  - Worker를 lazy-init (첫 speak() 호출 시 Kokoro q8 다운로드 시작)
 *  - AudioContext는 사용자 제스처(버튼 클릭) 컨텍스트에서 생성
 *  - 오디오 chunk를 스트림으로 받아 큐에 쌓고 순차 재생 → 첫 소리까지 지연 감소
 *  - stop()은 재생 중 source.stop() + 대기 큐 비우기 + 워커에 cancel 통지
 *
 * 상태: 'idle' | 'loading' | 'speaking' | 'error'
 */

const WORKER_URLS = {
  en: '/js/presentation/tts-worker.js', // Kokoro-82M (English)
  ko: '/js/presentation/tts-korean-worker.js', // MeloTTS Korean int8
};

export class PresentationTTS {
  #state = 'idle';
  /** 언어별 워커 (필요 시 lazy-init). @type {Record<string, Worker|null>} */
  #workers = { en: null, ko: null };
  /** 언어별 init promise. @type {Record<string, Promise<Worker>|null>} */
  #workerInits = { en: null, ko: null };
  #audioCtx = null;
  #currentSource = null;
  #currentReqSeq = 0;
  #listeners = new Set();
  #lastError = null;
  #availableVoices = null;

  getState() {
    return this.#state;
  }

  getLastError() {
    return this.#lastError;
  }

  getAvailableVoices() {
    return this.#availableVoices;
  }

  onStateChange(cb) {
    this.#listeners.add(cb);
    return () => this.#listeners.delete(cb);
  }

  #setState(s, err) {
    if (this.#state === s) return;
    this.#state = s;
    this.#lastError = err || null;
    for (const cb of this.#listeners) {
      try {
        cb(s, err);
      } catch (_) {
        /* ignore */
      }
    }
  }

  /**
   * @param {string} text
   * @param {{ lang?: 'ko'|'en' }} [opts]
   */
  async speak(text, opts = {}) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;

    this.stop();

    const reqSeq = ++this.#currentReqSeq;
    const reqId = `req-${reqSeq}`;
    this.#setState('loading');

    try {
      if (!this.#audioCtx) {
        const Ctor = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
        this.#audioCtx = new Ctor();
      }
      if (this.#audioCtx.state === 'suspended') {
        await this.#audioCtx.resume();
      }

      const lang = opts.lang || 'ko';
      const worker = await this.#ensureWorker(lang);
      if (reqSeq !== this.#currentReqSeq) return;

      await this.#streamSynthAndPlay(worker, reqId, reqSeq, trimmed, lang);

      if (reqSeq === this.#currentReqSeq) this.#setState('idle');
    } catch (err) {
      if (reqSeq !== this.#currentReqSeq) return;
      console.error('[TTS]', err);
      this.#setState('error', err);
    }
  }

  stop() {
    this.#currentReqSeq++;
    if (this.#currentSource) {
      try {
        this.#currentSource.stop();
      } catch (_) {
        /* already ended */
      }
      this.#currentSource = null;
    }
    for (const w of Object.values(this.#workers)) {
      if (!w) continue;
      try {
        w.postMessage({ type: 'cancel' });
      } catch (_) {
        /* ignore */
      }
    }
    if (this.#state !== 'idle') this.#setState('idle');
  }

  destroy() {
    this.stop();
    for (const key of Object.keys(this.#workers)) {
      const w = this.#workers[key];
      if (w) {
        try {
          w.terminate();
        } catch (_) {
          /* ignore */
        }
      }
      this.#workers[key] = null;
      this.#workerInits[key] = null;
    }
    if (this.#audioCtx) {
      try {
        this.#audioCtx.close();
      } catch (_) {
        /* ignore */
      }
      this.#audioCtx = null;
    }
    this.#listeners.clear();
  }

  /**
   * 언어별로 다른 워커를 띄워 Kokoro(영어) / MeloTTS(한국어)를 각각 lazy-init.
   * @param {'ko'|'en'} lang
   */
  async #ensureWorker(lang) {
    const key = lang === 'ko' ? 'ko' : 'en';
    const url = WORKER_URLS[key];
    if (this.#workers[key]) return this.#workers[key];
    if (this.#workerInits[key]) return this.#workerInits[key];

    const initPromise = new Promise((resolve, reject) => {
      const w = new Worker(url, { type: 'module' });
      const onInit = (e) => {
        const data = e.data;
        if (!data) return;
        if (data.type === 'voices-available') {
          this.#availableVoices = { voices: data.voices, device: data.device };
          console.info(
            `[TTS] ${key} engine ready on ${data.device}; ${data.voices.length} voices:`,
            data.voices,
          );
          return;
        }
        if (data.type === 'ready') {
          w.removeEventListener('message', onInit);
          this.#workers[key] = w;
          console.info(`[TTS] ${key} worker ready`, data.engine ? `(${data.engine})` : '');
          resolve(w);
        } else if (data.type === 'init-error') {
          w.removeEventListener('message', onInit);
          w.terminate();
          this.#workerInits[key] = null;
          reject(new Error(data.message || `${key} TTS worker init failed`));
        }
      };
      w.addEventListener('message', onInit);
      w.addEventListener('error', (err) => {
        this.#workerInits[key] = null;
        reject(new Error(`${key} TTS worker script error: ${err.message || err.type}`));
      });
      w.postMessage({ type: 'init' });
    });
    this.#workerInits[key] = initPromise;
    return initPromise;
  }

  /**
   * 워커에 synth 요청을 보내고 audio-chunk를 받는 대로 큐에 쌓아 순차 재생.
   * @param {Worker} worker
   * @param {string} reqId
   * @param {number} reqSeq
   * @param {string} text
   * @param {'ko'|'en'} lang
   */
  #streamSynthAndPlay(worker, reqId, reqSeq, text, lang) {
    return new Promise((resolve, reject) => {
      /** @type {Array<{samples: Float32Array, sampleRate: number}>} */
      const queue = [];
      let streamDone = false;
      let playing = false;
      let startedSpeaking = false;

      const isActive = () => reqSeq === this.#currentReqSeq;

      const maybeResolve = () => {
        if (streamDone && queue.length === 0 && !playing) {
          worker.removeEventListener('message', onMsg);
          resolve();
        }
      };

      const drainQueue = async () => {
        if (playing) return;
        playing = true;
        try {
          while (queue.length > 0 && isActive()) {
            const chunk = queue.shift();
            if (!chunk || !chunk.samples || chunk.samples.length === 0) continue;
            if (!startedSpeaking) {
              startedSpeaking = true;
              this.#setState('speaking');
            }
            try {
              await this.#play(chunk.samples, chunk.sampleRate);
            } catch (err) {
              console.error('[TTS] playback error', err);
              /** 이 chunk는 건너뛰고 다음 chunk 재생 시도 — 스트림 전체 중단 방지 */
            }
          }
        } finally {
          playing = false;
          maybeResolve();
        }
      };

      const onMsg = (e) => {
        const d = e.data;
        if (!d || d.reqId !== reqId) return;

        if (d.type === 'synth-started') {
          /** 워커가 선택한 실제 보이스 확인용 로그 — Korean 여부 진단에 유용 */
          console.info('[TTS] synth started with voice:', d.voice);
          return;
        }

        if (d.type === 'audio-chunk') {
          if (!isActive()) return;
          /** 이중 가드: 워커가 혹시라도 빈 Float32Array를 보내도 큐에 넣지 않는다.
           * createBuffer(1, 0, rate)가 NotSupportedError를 던져 재생 파이프라인이 깨진다. */
          if (!d.samples || d.samples.length === 0) {
            console.debug('[TTS] skip empty audio chunk');
            return;
          }
          queue.push({ samples: d.samples, sampleRate: d.sampleRate });
          drainQueue();
          return;
        }

        if (d.type === 'audio-done') {
          streamDone = true;
          maybeResolve();
          return;
        }

        if (d.type === 'synth-error') {
          streamDone = true;
          worker.removeEventListener('message', onMsg);
          const err = new Error(d.message || 'TTS synth failed');
          /** @type {any} */ (err).code = d.code;
          reject(err);
          return;
        }
      };

      worker.addEventListener('message', onMsg);
      worker.postMessage({ type: 'synth', reqId, text, lang });
    });
  }

  /**
   * @param {Float32Array} samples
   * @param {number} sampleRate
   */
  async #play(samples, sampleRate) {
    if (!this.#audioCtx) return;
    /** kokoro-js stream이 메타데이터 chunk로 빈 버퍼를 보낼 수 있다. 재생 스킵. */
    if (!samples || samples.length === 0) return;
    const rate = sampleRate || 24000;
    const buf = this.#audioCtx.createBuffer(1, samples.length, rate);
    buf.getChannelData(0).set(samples);
    const src = this.#audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(this.#audioCtx.destination);
    this.#currentSource = src;
    await new Promise((resolve) => {
      let done = false;
      src.onended = () => {
        if (done) return;
        done = true;
        resolve();
      };
      try {
        src.start();
      } catch (_) {
        done = true;
        resolve();
      }
    });
    this.#currentSource = null;
  }
}
