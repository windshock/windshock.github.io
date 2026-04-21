/**
 * Hangul → Jamo(자모) 분해기 + MeloTTS symbol ID 매퍼.
 *
 * MVP 전략:
 *  - g2pkk(mecab 기반 발음 변환)는 JS 포팅 블로커라 스킵.
 *  - 한글 음절(0xAC00-0xD7A3)을 유니코드 규칙으로 초성/중성/종성 자모로 분해.
 *  - 구두점과 공백은 MeloTTS가 알아듣는 형태로 매핑.
 *  - 품질 타협은 있지만 "인식 가능한 한국어 발음"은 나옴.
 *
 * Ref: melo/text/korean.py의 `korean_text_to_phonemes`
 *      melo/text/symbols.py의 `kr_symbols` + `cleaned_text_to_sequence`
 */

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;

/** 초성 19개 (Unicode Jamo: 0x1100–0x1112) */
const CHOSEONG = [
  0x1100, 0x1101, 0x1102, 0x1103, 0x1104, 0x1105, 0x1106, 0x1107, 0x1108,
  0x1109, 0x110a, 0x110b, 0x110c, 0x110d, 0x110e, 0x110f, 0x1110, 0x1111, 0x1112,
];

/** 중성 21개 (Unicode Jamo: 0x1161–0x1175) */
const JUNGSEONG = [
  0x1161, 0x1162, 0x1163, 0x1164, 0x1165, 0x1166, 0x1167, 0x1168, 0x1169, 0x116a, 0x116b,
  0x116c, 0x116d, 0x116e, 0x116f, 0x1170, 0x1171, 0x1172, 0x1173, 0x1174, 0x1175,
];

/** 종성 28개 (첫 인덱스 0은 종성 없음, 나머지 0x11A8–0x11C2) */
const JONGSEONG = [
  0, 0x11a8, 0x11a9, 0x11aa, 0x11ab, 0x11ac, 0x11ad, 0x11ae, 0x11af, 0x11b0, 0x11b1,
  0x11b2, 0x11b3, 0x11b4, 0x11b5, 0x11b6, 0x11b7, 0x11b8, 0x11b9, 0x11ba, 0x11bb, 0x11bc,
  0x11bd, 0x11be, 0x11bf, 0x11c0, 0x11c1, 0x11c2,
];

/**
 * "하늘" → ["ᄒ","ᅡ","ᄂ","ᅳ","ᆯ"]
 * 비한글 문자는 그대로 반환 (개별 글자).
 */
export function hangulToJamo(text) {
  const out = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      const idx = code - HANGUL_BASE;
      const cho = Math.floor(idx / (21 * 28));
      const jung = Math.floor((idx % (21 * 28)) / 28);
      const jong = idx % 28;
      out.push(String.fromCodePoint(CHOSEONG[cho]));
      out.push(String.fromCodePoint(JUNGSEONG[jung]));
      if (jong !== 0) out.push(String.fromCodePoint(JONGSEONG[jong]));
    } else {
      out.push(ch);
    }
  }
  return out;
}

/**
 * MeloTTS 한국어 normalize의 최소 구현.
 * - 한자·특수기호 일부 제거
 * - 영문자는 MVP에서 그대로 둠 (한국어 음소에 없으니 UNK로 fallback)
 * - 숫자는 그대로 (한글 변환은 v2)
 */
export function normalizeKorean(text) {
  return String(text || '')
    .replace(/[\u2E80-\u2FDF\u3000-\u303F\u31C0-\u31EF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g, ' ')
    .replace(/[""'']/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * 텍스트 → phoneme 배열 (MeloTTS symbol 사전에 있는 기호들).
 * symbols: symbols.json에서 받은 per_language_symbols.KR + pu_symbols.
 */
export function textToKoreanPhonemes(text, symbolSet) {
  const norm = normalizeKorean(text);
  const jamo = hangulToJamo(norm);
  /** 한국어 symbol 후보에 없는 토큰은 UNK 또는 구두점으로 대체 */
  const phones = [];
  for (const ch of jamo) {
    if (symbolSet.has(ch)) {
      phones.push(ch);
    } else if (ch === ' ') {
      phones.push('SP');
    } else if ('!?,.-'.includes(ch)) {
      phones.push(ch);
    } else if (ch === '…') {
      phones.push('…');
    } else {
      phones.push('UNK');
    }
  }
  return phones;
}

/**
 * MeloTTS cleaned_text_to_sequence 동등 동작:
 *  - phones → phone_ids (symbol_to_id 매핑)
 *  - tones: KR은 num_kr_tones=1이라 local=0 → 전체 = tone_start_map.KR = 11
 *  - language: 각 phoneme에 lang_id(KR=4) 부여
 *  - add_blank=true: 각 phoneme 사이에 pad(0) 삽입
 */
export function phonemesToTensorInputs(phones, symbolToId, toneStart, langId) {
  /** phone → id */
  const rawIds = phones.map((p) => {
    const id = symbolToId[p];
    return typeof id === 'number' ? id : symbolToId['UNK'];
  });

  /** add_blank: 사이사이에 0 삽입 → [0, p0, 0, p1, 0, p2, 0] */
  const x = intersperseZeros(rawIds);
  const tones = x.map((id) => (id === 0 ? 0 : toneStart));
  const language = x.map(() => langId);
  return { x, tones, language };
}

function intersperseZeros(arr) {
  const out = new Array(arr.length * 2 + 1).fill(0);
  for (let i = 0; i < arr.length; i++) out[i * 2 + 1] = arr[i];
  return out;
}
