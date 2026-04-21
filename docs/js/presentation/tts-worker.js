/**
 * TTS worker — Kokoro-82M lazy-load 후 텍스트를 오디오 chunk 스트림으로 합성.
 *  - `engine.stream()`으로 문장 단위 점진 합성 → 첫 소리까지 지연 감소
 *  - WebGPU 우선, 실패 시 WASM fallback
 *  - cancel 시 진행 중 스트림 중단
 */

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
/** kokoro-js v1.2.x 유효 dtype: auto|fp32|fp16|q8|int8|uint8|q4|bnb4|q4f16.
 * q8(≈92MB)이 크기/품질 균형 최적. q4 계열은 한국어 warbling 보고. */
const DTYPE = 'q8';

let ttsPromise = null;
let activeReqId = null;

async function detectDevice() {
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch (_) {
      /* ignore */
    }
  }
  return 'wasm';
}

async function loadTTS() {
  console.info('[TTS-Worker] importing kokoro-js from CDN…');
  const { KokoroTTS } = await import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm');
  console.info('[TTS-Worker] kokoro-js imported OK');
  const device = await detectDevice();
  console.info(`[TTS-Worker] detected device: ${device}`);
  console.info(`[TTS-Worker] loading model ${MODEL_ID} (dtype=${DTYPE})…`);
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: DTYPE, device });
  console.info('[TTS-Worker] model loaded OK');
  /** 진단용: 실제 모델이 내장한 보이스 목록을 메인 스레드에 알림. */
  const voiceIds = tts.voices ? Object.keys(tts.voices) : [];
  self.postMessage({ type: 'voices-available', voices: voiceIds, device });
  return tts;
}

function ensureTTS() {
  if (!ttsPromise) ttsPromise = loadTTS();
  return ttsPromise;
}

/**
 * @param {'ko'|'en'} lang
 * @param {any} engine
 * @returns {{ voice: string, fallbackFromKorean: boolean }}
 */
function pickVoice(lang, engine) {
  const voiceMap = engine.voices || {};
  const ids = Object.keys(voiceMap);
  const prefersKorean = lang && String(lang).toLowerCase().startsWith('ko');

  if (prefersKorean) {
    const ko = ids.find((v) => /^(kf|km)_/i.test(v));
    if (ko) return { voice: ko, fallbackFromKorean: false };
  }
  const en =
    ids.find((v) => /^af_heart$/i.test(v)) ||
    ids.find((v) => /^(af|am)_/i.test(v));
  const voice = en || ids[0] || 'af_heart';
  return { voice, fallbackFromKorean: prefersKorean };
}

self.addEventListener('message', async (e) => {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'init') {
    try {
      await ensureTTS();
      self.postMessage({ type: 'ready' });
    } catch (err) {
      ttsPromise = null;
      self.postMessage({ type: 'init-error', message: String(err?.message || err) });
    }
    return;
  }

  if (msg.type === 'synth') {
    const { reqId, text, lang } = msg;
    activeReqId = reqId;
    try {
      const engine = await ensureTTS();
      const { voice, fallbackFromKorean } = pickVoice(lang, engine);

      /** Kokoro 워커는 이제 영어 전용. lang=ko는 엔진에서 다른 워커로 라우팅됨. */
      if (fallbackFromKorean) {
        self.postMessage({
          type: 'synth-error',
          reqId,
          message: 'Korean not supported by Kokoro worker — route to melotts-kr worker',
          code: 'wrong-engine',
        });
        return;
      }

      self.postMessage({ type: 'synth-started', reqId, voice });

      /** kokoro-js의 stream은 async generator. 문장 단위 chunk를 yield.
       *  각 chunk: { text: string, phonemes: string, audio: RawAudio }
       *  RawAudio: { audio: Float32Array, sampling_rate: number } */
      const stream = engine.stream(text, { voice, speed: 1.0 });
      let index = 0;
      for await (const chunk of stream) {
        if (activeReqId !== reqId) break; // cancelled

        /** chunk.audio는 RawAudio 래퍼 객체(Float32Array가 아님).
         *  RawAudio.audio = Float32Array, RawAudio.sampling_rate = number.
         *  이전 코드는 chunk.audio.length를 검사했으나 RawAudio에는 .length가 없어
         *  모든 chunk가 skip 되는 무음 버그가 있었음. */
        const rawAudio = chunk.audio;
        if (!rawAudio) continue;

        const samples =
          rawAudio.audio instanceof Float32Array
            ? rawAudio.audio
            : rawAudio instanceof Float32Array
              ? rawAudio
              : null;
        if (!samples || samples.length === 0) {
          console.debug('[TTS-Worker] skip empty chunk at index', index);
          continue;
        }

        const sampleRate =
          rawAudio.sampling_rate || rawAudio.samplingRate ||
          chunk.sampling_rate || chunk.samplingRate || 24000;

        console.debug(
          `[TTS-Worker] audio-chunk #${index}: ${samples.length} samples @ ${sampleRate}Hz`,
        );
        self.postMessage(
          { type: 'audio-chunk', reqId, index, samples, sampleRate },
          [samples.buffer],
        );
        index += 1;
      }
      console.info(`[TTS-Worker] stream done, ${index} chunks sent`);
      if (activeReqId === reqId) {
        self.postMessage({ type: 'audio-done', reqId });
      }
    } catch (err) {
      self.postMessage({
        type: 'synth-error',
        reqId,
        message: String(err?.message || err),
      });
    }
    return;
  }

  if (msg.type === 'cancel') {
    activeReqId = null;
    return;
  }
});
