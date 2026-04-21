/**
 * 현재 활성 Reveal 슬라이드에서 TTS가 읽을 텍스트만 추출.
 *
 * 규칙:
 *  - 제목(h1-h4), 문단(p), 인용(blockquote), 리스트 항목(li)은 읽는다.
 *  - 코드 블록(pre)·표(table)·이미지·embed는 v1에서 생략.
 *  - "→ continued" 힌트, watermark, aria-hidden 요소는 제외.
 *  - 인라인 <code>는 placeholder "코드"/"code"로 축약해 robotic하게 읽히는 것을 막는다.
 *  - pretext의 `\n`(white-space: pre-line으로 보이는 줄 경계)은 공백으로 정규화.
 */

const SKIP_SELECTORS = [
  '.presentation-continued',
  '.presentation-deck-credit-watermark',
  '.presentation-deck-chrome',
  '[aria-hidden="true"]',
];

const SKIP_TAGS = new Set(['PRE', 'TABLE', 'FIGURE', 'IFRAME']);
const READ_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'DL', 'DT', 'DD']);

function isSkipped(el) {
  if (!el || el.nodeType !== 1) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  for (const sel of SKIP_SELECTORS) {
    if (el.matches?.(sel)) return true;
  }
  return false;
}

/**
 * 인라인 <code>는 그대로 읽으면 산만하다. 한글 문맥에선 "코드", 영문에선 "code"로 치환.
 * @param {Element} root — 복제본 대상
 * @param {'ko'|'en'} lang
 */
function collapseInlineCode(root, lang) {
  const placeholder = lang === 'ko' ? '코드' : 'code';
  for (const codeEl of root.querySelectorAll('code')) {
    if (codeEl.closest('pre')) continue;
    codeEl.textContent = ` ${placeholder} `;
  }
}

/**
 * 슬라이드 안에서 읽을 블록 요소만 순서대로 뽑아 텍스트로 조립.
 * @param {HTMLElement} slideEl — Reveal의 현재 `<section class="presentation-slide">`
 * @param {'ko'|'en'} [lang='ko']
 * @returns {string}
 */
export function extractSlideText(slideEl, lang = 'ko') {
  if (!slideEl) return '';

  /** 커버·인포그래픽은 이미지 중심 슬라이드라 v1에선 생략한다. */
  if (
    slideEl.classList?.contains('presentation-slide--cover') ||
    slideEl.classList?.contains('presentation-slide--infographic')
  ) {
    const heading = slideEl.querySelector('h1, h2, h3');
    return heading ? normalize(heading.textContent || '') : '';
  }

  /** 원본 DOM을 건드리지 않도록 복제본에서 작업. */
  const clone = slideEl.cloneNode(true);
  for (const sel of SKIP_SELECTORS) {
    for (const x of clone.querySelectorAll(sel)) x.remove();
  }
  for (const tag of SKIP_TAGS) {
    for (const x of clone.querySelectorAll(tag.toLowerCase())) x.remove();
  }
  collapseInlineCode(clone, lang);

  const parts = [];
  collectText(clone, parts);
  return parts
    .map(normalize)
    .map(unhyphenateIdentifierTokens)
    .filter(Boolean)
    .join('\n\n');
}

function collectText(root, parts) {
  for (const el of root.children) {
    if (isSkipped(el)) continue;
    const tag = el.tagName;
    if (tag === 'UL' || tag === 'OL') {
      for (const li of el.querySelectorAll(':scope > li')) {
        const t = li.innerText || li.textContent || '';
        if (t.trim()) parts.push(t);
      }
      continue;
    }
    if (READ_TAGS.has(tag)) {
      const t = el.innerText || el.textContent || '';
      if (t.trim()) parts.push(t);
      continue;
    }
    /** 다른 래퍼 div 등은 내부로 한 단계 더 내려간다. */
    if (el.children.length) collectText(el, parts);
  }
}

/* TTS가 못 읽는 장식용 기호. 발음 사전에 없어 misaki phonemizer가 빈 phoneme 또는 글자
 * 단위 fallback을 시도하다 음성이 깨져 들린다. 슬라이드 본문에서 미리 제거. */
const DECORATIVE_SYMBOLS_RE = /[←→↑↓↔⇐⇒⇑⇓⬅➡⬆⬇•·✓✔✗✘★☆※⌘◆◇■□●○♦♥♠♣]/g;

/* "oh-my-secuaudit" 같은 하이픈 합성어는 Kokoro가 단어 사전 lookup에 실패해 글자 단위로
 * 발음한다 → 영어처럼 안 들리는 핵심 원인. 영문/숫자 토큰 사이의 하이픈만 공백으로 바꿔
 * 사전 매칭이 단어별로 일어나게 한다. (em-dash·en-dash·일반 한글 영역은 건드리지 않음) */
function unhyphenateIdentifierTokens(text) {
  return text.replace(/([A-Za-z0-9])-(?=[A-Za-z0-9])/g, '$1 ');
}

function normalize(text) {
  return String(text)
    .replace(DECORATIVE_SYMBOLS_RE, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*→\s*continued\s*$/i, '')
    .replace(/\s*continued\s*$/i, '')
    .trim();
}

/** 외부에서도 쓸 수 있게 export — 합성 직전 한 번 더 적용해도 무해 */
export function normalizeForTTS(text) {
  return unhyphenateIdentifierTokens(normalize(text));
}
