/**
 * Korean TTS worker — `gnyong/melotts-kr-onnx` int8 (≈53MB) + 브라우저 G2P.
 *
 *  - onnxruntime-web을 CDN에서 import (메인 스레드 kokoro-js와 동일 패턴)
 *  - BERT 텐서는 zero-fill (원 MeloTTS는 `kykim/bert-kor-base` 400MB 요구하지만
 *    prosody 약간 단조해지는 trade-off만 있고 한국어 발음 자체는 나온다)
 *  - g2pkk는 JS 포팅 블로커라 스킵 — Hangul→Jamo 분해만 수행 (MVP 품질 타협)
 *  - 전체 텍스트를 한 번에 합성 (MeloTTS는 Kokoro처럼 stream API가 없음)
 */

const MODEL_BASE = 'https://huggingface.co/gnyong/melotts-kr-onnx/resolve/main';
/** int8(53MB)은 `ConvInteger` opset을 써서 onnxruntime-web이 거부한다
 * (ORT WebGPU/WASM EP 모두 미지원). fp16(85MB)으로 fallback. */
const MODEL_URL = `${MODEL_BASE}/melotts_kr_fp16.onnx`;
const SYMBOLS_URL = `${MODEL_BASE}/symbols.json`;
const CONFIG_URL = `${MODEL_BASE}/melotts_kr_config.json`;

/** ORT WASM/WebGPU assets 경로 — jsdelivr CDN에 동일 버전 정적 호스팅 */
const ORT_VERSION = '1.20.1';
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

import { textToKoreanPhonemes, phonemesToTensorInputs } from './tts-korean-g2p.js';

let sessionPromise = null;
let symbolsData = null;
let hpsData = null;
let activeReqId = null;

async function loadOrt() {
  /** WASM-only 번들. WebGPU는 MeloTTS와 호환 불가(`Split` op 버그)라 현재 disabled. */
  const ort = await import(`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/+esm`);
  ort.env.wasm.wasmPaths = ORT_BASE;
  /** crossOriginIsolated 없이는 multi-thread WASM 불가 (SharedArrayBuffer 필요).
   * Hugo 정적 호스팅에 COOP/COEP 헤더 없으므로 single-thread. */
  ort.env.wasm.numThreads = 1;
  return ort;
}

async function detectEP() {
  /** WebGPU EP의 Split operator가 MeloTTS SDP flows 노드에서 실패한다
   * (`axis=1 size=1`를 `split=[1,1]`로 분할 요청 → shape mismatch).
   * WASM EP는 동일 노드를 정상 처리하므로 당분간 WASM 고정.
   * TODO: onnxruntime-web이 이 버그 수정하면 WebGPU 재활성 */
  return ['wasm'];
}

async function init() {
  console.info('[TTS-KR] loading onnxruntime-web…');
  const ort = await loadOrt();
  console.info('[TTS-KR] ort loaded; fetching symbols + config…');
  const [symbolsRes, configRes] = await Promise.all([
    fetch(SYMBOLS_URL).then((r) => r.json()),
    fetch(CONFIG_URL).then((r) => r.json()),
  ]);
  symbolsData = symbolsRes;
  hpsData = configRes;

  const executionProviders = await detectEP();
  console.info(`[TTS-KR] creating session with EP: ${executionProviders.join(',')}`);
  console.info(`[TTS-KR] fetching model (${MODEL_URL.split('/').pop()})…`);
  const session = await ort.InferenceSession.create(MODEL_URL, {
    executionProviders,
    graphOptimizationLevel: 'all',
  });
  console.info('[TTS-KR] session ready; input names:', session.inputNames);
  return { ort, session };
}

function ensureSession() {
  if (!sessionPromise) sessionPromise = init();
  return sessionPromise;
}

/**
 * MeloTTS KR 추론.
 * @param {string} text
 * @returns {Promise<{samples: Float32Array, sampleRate: number}>}
 */
async function synthesize(text) {
  const { ort, session } = await ensureSession();

  const koreanSymbols = new Set((symbolsData.per_language_symbols?.KR) || []);
  /** pu_symbols도 포함 (구두점) */
  for (const s of symbolsData.pu_symbols || []) koreanSymbols.add(s);

  const phones = textToKoreanPhonemes(text, koreanSymbols);
  if (phones.length === 0) throw new Error('No phonemes produced from text');

  /** 앞뒤에 pad phoneme '_' 삽입 (Python 구현 관례) */
  const padded = ['_', ...phones, '_'];
  const langId = symbolsData.language_id_map?.KR ?? 4;
  const toneStart = symbolsData.language_tone_start_map?.KR ?? 11;

  const { x, tones, language } = phonemesToTensorInputs(
    padded,
    symbolsData.symbol_to_id,
    toneStart,
    langId,
  );

  const T = x.length;
  console.info(`[TTS-KR] input phonemes=${phones.length}, T(after add_blank)=${T}`);

  /** ONNX 텐서 구성. 이름은 session.inputNames에서 확인 가능. */
  const xArr = BigInt64Array.from(x.map((v) => BigInt(v)));
  const lengths = BigInt64Array.from([BigInt(T)]);
  const sid = BigInt64Array.from([0n]);
  const toneArr = BigInt64Array.from(tones.map((v) => BigInt(v)));
  const langArr = BigInt64Array.from(language.map((v) => BigInt(v)));
  const bert = new Float32Array(1 * 1024 * T); // zero-fill
  const jaBert = new Float32Array(1 * 768 * T); // zero-fill

  const scales = (v) => new ort.Tensor('float32', Float32Array.from([v]), []);

  const feeds = {
    x: new ort.Tensor('int64', xArr, [1, T]),
    x_lengths: new ort.Tensor('int64', lengths, [1]),
    sid: new ort.Tensor('int64', sid, [1]),
    tone: new ort.Tensor('int64', toneArr, [1, T]),
    language: new ort.Tensor('int64', langArr, [1, T]),
    bert: new ort.Tensor('float32', bert, [1, 1024, T]),
    ja_bert: new ort.Tensor('float32', jaBert, [1, 768, T]),
    noise_scale: scales(0.6),
    length_scale: scales(1.0),
    noise_scale_w: scales(0.8),
    sdp_ratio: scales(0.2),
  };

  /** session.inputNames와 다른 이름을 모델이 요구할 수도 있다 — 교차 체크 */
  const inputNames = session.inputNames;
  for (const n of Object.keys(feeds)) {
    if (!inputNames.includes(n)) {
      console.warn(`[TTS-KR] model does not list input "${n}"; skipping`);
      delete feeds[n];
    }
  }

  console.info('[TTS-KR] running inference…');
  const t0 = performance.now();
  const out = await session.run(feeds);
  const t1 = performance.now();
  console.info(`[TTS-KR] inference done in ${((t1 - t0) / 1000).toFixed(2)}s`);

  /** 출력 이름은 session.outputNames에서 확인. 보통 "output" 또는 단일 텐서. */
  const outName = session.outputNames[0];
  const audioTensor = out[outName];
  const samples = audioTensor.data instanceof Float32Array
    ? audioTensor.data
    : new Float32Array(audioTensor.data);
  const sampleRate = hpsData?.data?.sampling_rate || 44100;
  return { samples, sampleRate };
}

self.addEventListener('message', async (e) => {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'init') {
    try {
      await ensureSession();
      self.postMessage({ type: 'ready', engine: 'melotts-kr' });
    } catch (err) {
      sessionPromise = null;
      self.postMessage({ type: 'init-error', message: String(err?.message || err) });
    }
    return;
  }

  if (msg.type === 'synth') {
    const { reqId, text } = msg;
    activeReqId = reqId;
    try {
      self.postMessage({ type: 'synth-started', reqId, voice: 'melotts-kr' });
      const { samples, sampleRate } = await synthesize(text);
      if (activeReqId !== reqId) return;
      self.postMessage(
        { type: 'audio-chunk', reqId, index: 0, samples, sampleRate },
        [samples.buffer],
      );
      self.postMessage({ type: 'audio-done', reqId });
    } catch (err) {
      console.error('[TTS-KR] synth failed', err);
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
