/**
 * Scene extract → paginate → Reveal <section> DOM (Read tree is never mutated; works on clones).
 */

const PRETEXT_MODULE = 'https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.5/+esm';

const SLIDE_INNER_WIDTH = 1040;
/** 논리 슬라이드 높이에서 남기는 상·하 여유(진행바·컨트롤·안전선) */
const VIEWPORT_HEIGHT_RESERVE = 80;
/**
 * `startNewSlide(true)` 슬라이드 끝에 붙는 `.presentation-continued`(→ continued)가
 * pagination 이후에 추가되므로, 측정 시 이 높이를 빼지 않으면 하단 글자가 잘린다.
 */
const CONTINUED_FOOTER_RESERVE = 72;
const DEFAULT_SLIDE_HEIGHT = 720;

function isElement(n) {
  return n && n.nodeType === 1;
}

function isSlideBreak(el) {
  return el.hasAttribute && el.hasAttribute('data-slide-break');
}

function isSlideAside(el) {
  return el.hasAttribute && el.hasAttribute('data-slide-aside');
}

function isSlideVertical(el) {
  return el.hasAttribute && el.hasAttribute('data-slide-vertical');
}

function isH2(el) {
  return el.tagName === 'H2';
}

function isH3(el) {
  return el.tagName === 'H3';
}

/**
 * 같은 `##` 씬 안에서 `###`(항)마다 가로 슬라이드 묶음을 끊기 위한 블록 그룹.
 * @param {Element[]} blocks
 * @returns {Element[][]}
 */
function splitSceneBlocksByH3(blocks) {
  if (!blocks || blocks.length === 0) return [];
  const groups = [];
  let cur = [];
  for (const el of blocks) {
    if (isH3(el) && cur.length > 0) {
      groups.push(cur);
      cur = [el];
    } else {
      cur.push(el);
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}

/**
 * @param {Element[]} blocks
 */
function paginateSceneBlocks(blocks, pretext, options) {
  const groups = splitSceneBlocksByH3(blocks);
  const out = [];
  for (const g of groups) {
    const part = paginateBlocks(g, pretext, options);
    for (const s of part) out.push(s);
  }
  return out;
}

/** Split top-level children into scene units (main flow). */
function extractTopLevelUnits(root) {
  const units = [];
  let buf = [];
  let asideBuf = [];

  function flushScene() {
    if (buf.length === 0 && asideBuf.length === 0) return;
    units.push({ type: 'scene', blocks: buf, asides: asideBuf });
    buf = [];
    asideBuf = [];
  }

  const children = Array.from(root.childNodes).filter((n) => {
    if (n.nodeType === 3) return String(n.textContent).trim().length > 0;
    return isElement(n);
  });

  for (const node of children) {
    if (!isElement(node)) continue;
    const el = /** @type {Element} */ (node);
    if (isSlideVertical(el)) {
      flushScene();
      units.push({ type: 'vertical', el });
      continue;
    }
    if (isSlideAside(el)) {
      asideBuf.push(el);
      continue;
    }
    if (isSlideBreak(el)) {
      flushScene();
      continue;
    }
    if (isH2(el)) {
      flushScene();
      buf.push(el);
      continue;
    }
    buf.push(el);
  }
  flushScene();
  return units;
}

/** Inside [data-slide-vertical], split by H2 / slidebreak into scenes. */
function extractVerticalInnerScenes(verticalEl) {
  const scenes = [];
  let buf = [];
  const inner = Array.from(verticalEl.children);
  for (const el of inner) {
    if (isSlideBreak(el)) {
      if (buf.length) scenes.push(buf);
      buf = [];
      continue;
    }
    if (isH2(el)) {
      if (buf.length) scenes.push(buf);
      buf = [el];
      continue;
    }
    buf.push(el);
  }
  if (buf.length) scenes.push(buf);
  return scenes;
}

function sentenceSplit(text) {
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return parts && parts.length ? parts.map((s) => s.trim()).filter(Boolean) : [text];
}

function getFontSpecFromElement(el) {
  const st = window.getComputedStyle(el);
  return `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
}

function measureBlockHeight(blockEl, measurer, slideInnerWidth) {
  const slot = document.createElement('div');
  slot.className = 'presentation-slide presentation-slide--measure';
  slot.style.width = `${slideInnerWidth}px`;
  slot.style.boxSizing = 'border-box';
  const clone = blockEl.cloneNode(true);
  slot.appendChild(clone);
  measurer.appendChild(slot);
  const h = slot.getBoundingClientRect().height;
  measurer.removeChild(slot);
  return h;
}

function tagNameBlockType(el) {
  const t = el.tagName;
  if (t === 'H1' || t === 'H2' || t === 'H3' || t === 'H4' || t === 'H5' || t === 'H6') return 'heading';
  if (t === 'PRE') return 'code';
  if (t === 'TABLE') return 'table';
  if (t === 'UL' || t === 'OL') return 'list';
  if (t === 'P') return 'paragraph';
  if (t === 'BLOCKQUOTE') return 'note';
  if (t === 'DIV' && el.querySelector('iframe')) return 'embed';
  if (t === 'FIGURE' || (t === 'P' && el.querySelector('img:only-child'))) return 'image';
  if (t === 'IMG') return 'image';
  return 'block';
}

function applyOversizedPolicy(blockEl, type, ratio, slideMaxH) {
  const wrap = document.createElement('div');
  wrap.className = 'presentation-slide-content-block';
  const inner = blockEl.cloneNode(true);
  wrap.appendChild(inner);
  if (type === 'code') {
    if (ratio <= 2) {
      wrap.style.maxHeight = `${slideMaxH}px`;
      wrap.style.overflowY = 'auto';
    } else {
      wrap.classList.add('presentation-slide--oversized');
    }
    return wrap;
  }
  if (type === 'table' || type === 'image') {
    /** 프레젠테이션에서 슬라이드 내부 스크롤 지양 — 아주 큰 표도 축소만 사용 */
    const s = Math.max(0.12, Math.min(1, (1 / Math.max(ratio, 0.01)) * 0.97));
    wrap.style.transform = `scale(${s})`;
    wrap.style.transformOrigin = 'top left';
    return wrap;
  }
  if (type === 'embed') {
    wrap.classList.add('presentation-slide--oversized');
    return wrap;
  }
  wrap.classList.add('presentation-slide--oversized');
  return wrap;
}

/**
 * Paginate one scene's block elements into slide DOM nodes.
 * @param {Element[]} blocks
 * @param {*} pretext module exports
 */
/** 표 직전 슬라이드에 이미 본문(문단·목록 등)이 있으면 표 전용 장으로 분리 */
function slideHasProseBeforeTable(sec) {
  return !!sec.querySelector('p, ul, ol, blockquote, pre');
}

function slideContentBudget(sec, slideMaxHeight) {
  if (sec && sec.dataset && sec.dataset.continued === 'true') {
    return Math.max(200, slideMaxHeight - CONTINUED_FOOTER_RESERVE);
  }
  return slideMaxHeight;
}

function paginateBlocks(blocks, pretext, options) {
  const { slideInnerWidth, slideMaxHeight } = options;
  const slides = [];
  const measurer = options.measurer;

  function makeSlideShell() {
    const sec = document.createElement('section');
    sec.className = 'presentation-slide';
    sec.style.width = '100%';
    sec.style.height = '100%';
    sec.style.boxSizing = 'border-box';
    return sec;
  }

  function currentSlide() {
    if (slides.length === 0) slides.push(makeSlideShell());
    return slides[slides.length - 1];
  }

  function startNewSlide(continued) {
    const sec = makeSlideShell();
    if (continued) sec.dataset.continued = 'true';
    slides.push(sec);
    return sec;
  }

  function fits(sec, extraEl) {
    sec.appendChild(extraEl);
    measurer.appendChild(sec);
    const h = sec.getBoundingClientRect().height;
    measurer.removeChild(sec);
    sec.removeChild(extraEl);
    const budget = slideContentBudget(sec, slideMaxHeight);
    return h <= budget + 2;
  }

  /** @type {Element[]} */
  const pendingHeadings = [];

  for (const block of blocks) {
    const type = tagNameBlockType(block);
    const rawH = measureBlockHeight(block, measurer, slideInnerWidth);

    if (type === 'heading') {
      pendingHeadings.push(block);
      continue;
    }

    const placeHeadingIfAny = (sec) => {
      while (pendingHeadings.length) {
        const h = pendingHeadings.shift();
        sec.appendChild(h.cloneNode(true));
      }
    };

    const indivisible = type === 'code' || type === 'table' || type === 'image' || type === 'embed' || type === 'list';

    if (indivisible) {
      let sec = currentSlide();
      placeHeadingIfAny(sec);
      if (type === 'table' && slideHasProseBeforeTable(sec)) {
        sec = startNewSlide(true);
        placeHeadingIfAny(sec);
      }

      function wrapIndivisibleFor(targetSec) {
        const b = slideContentBudget(targetSec, slideMaxHeight);
        return rawH > b
          ? applyOversizedPolicy(block, type, rawH / b, b)
          : block.cloneNode(true);
      }

      let elWrap = wrapIndivisibleFor(sec);
      if (!fits(sec, elWrap)) {
        sec = startNewSlide(true);
        placeHeadingIfAny(sec);
        elWrap = wrapIndivisibleFor(sec);
      }
      sec.appendChild(elWrap);
      continue;
    }

    if (type === 'paragraph') {
      const p = /** @type {HTMLParagraphElement} */ (block);
      const text = (p.textContent || '').trim();
      if (!text) continue;
      const font = getFontSpecFromElement(p);
      const cs = window.getComputedStyle(p);
      const lineHeightPx = Number.parseFloat(cs.lineHeight) || Number.parseFloat(cs.fontSize) * 1.4 || 22;

      const tryWhole = () => {
        const clone = p.cloneNode(true);
        const s = currentSlide();
        placeHeadingIfAny(s);
        if (fits(s, clone)) {
          s.appendChild(clone);
          return true;
        }
        return false;
      };

      if (tryWhole()) continue;

      let remainder = text;
      const sentences = sentenceSplit(text);
      if (sentences.length > 1) {
        let si = 0;
        while (si < sentences.length) {
          const ssec = currentSlide();
          placeHeadingIfAny(ssec);
          let placed = false;
          for (let j = sentences.length; j > si; j--) {
            const chunk = sentences.slice(si, j).join(' ');
            const p2 = p.cloneNode(false);
            p2.textContent = chunk;
            if (fits(ssec, p2)) {
              ssec.appendChild(p2);
              si = j;
              placed = true;
              break;
            }
          }
          if (placed) continue;
          break;
        }
        remainder = si < sentences.length ? sentences.slice(si).join(' ') : '';
        if (!remainder) continue;
      }

      const prepared = pretext.prepareWithSegments(remainder, font, {
        whiteSpace: 'normal',
        wordBreak: 'keep-all',
      });
      const laid = pretext.layoutWithLines(prepared, slideInnerWidth, lineHeightPx);
      const lines = laid.lines;
      let li = 0;
      let firstSlide = true;
      while (li < lines.length) {
        const sec4 = firstSlide ? currentSlide() : startNewSlide(true);
        firstSlide = false;
        placeHeadingIfAny(sec4);
        let acc = '';
        let lastK = li - 1;
        for (let k = li; k < lines.length; k++) {
          const trialText = acc ? `${acc}\n${lines[k].text}` : lines[k].text;
          const p4 = p.cloneNode(false);
          p4.textContent = trialText;
          if (!fits(sec4, p4)) break;
          acc = trialText;
          lastK = k;
        }
        if (lastK < li) {
          const pOne = p.cloneNode(false);
          pOne.textContent = lines[li].text;
          sec4.appendChild(pOne);
          li += 1;
        } else {
          const p4 = p.cloneNode(false);
          p4.textContent = acc;
          sec4.appendChild(p4);
          li = lastK + 1;
        }
      }
      continue;
    }

    const clone = block.cloneNode(true);
    let sec = currentSlide();
    placeHeadingIfAny(sec);
    if (!fits(sec, clone)) {
      sec = startNewSlide(true);
      placeHeadingIfAny(sec);
    }
    sec.appendChild(clone);
  }

  if (pendingHeadings.length) {
    const sec = currentSlide();
    while (pendingHeadings.length) {
      const h = pendingHeadings.shift();
      sec.appendChild(h.cloneNode(true));
    }
  }

  /*
   * `data-continued`는 "이전 슬라이드와 같은 소절"을 뜻하지만, 푸터 문구(→ continued)는
   * 마지막 조각에도 붙어 다음 가로 슬라이드가 이미 새 `###`인데도 오해를 부른다.
   * 같은 블록 묶음의 꼬리 슬라이드에서는 힌트를 붙이지 않는다.
   */
  if (slides.length) {
    const tail = slides[slides.length - 1];
    delete tail.dataset.continued;
  }

  for (const s of slides) {
    if (s.dataset.continued === 'true') {
      const hint = document.createElement('div');
      hint.className = 'presentation-continued';
      hint.textContent = '→ continued';
      s.appendChild(hint);
    }
  }

  return slides;
}

function nestAsides(lastSlideSection, asides) {
  for (const root of asides) {
    const nested = document.createElement('section');
    nested.className = 'presentation-slide presentation-slide--aside';
    nested.appendChild(root.cloneNode(true));
    lastSlideSection.appendChild(nested);
  }
}

/**
 * Present 첫 장 — 글 `image`가 `data-presentation-cover`로 전달될 때 사용(루트 상대 `/…` 또는 http(s) URL; `absURL` 금지로 dev 포트 고정 방지).
 * @param {string | null | undefined} coverUrl
 * @param {string} [titlePlain] — 표지 아래 제목(선택), 접근성 alt와 동일
 * @returns {HTMLElement | null}
 */
export function buildPresentationCoverSlide(coverUrl, titlePlain) {
  const u = (coverUrl || '').trim();
  if (!u) return null;

  const sec = document.createElement('section');
  sec.className = 'presentation-slide presentation-slide--cover';
  sec.style.width = '100%';
  sec.style.height = '100%';
  sec.style.boxSizing = 'border-box';
  const t = (titlePlain || '').replace(/\s+/g, ' ').trim();
  if (t) sec.setAttribute('aria-label', t);

  const inner = document.createElement('div');
  inner.className = 'presentation-slide-cover-inner';

  const frame = document.createElement('div');
  frame.className = 'presentation-slide-cover-frame';
  const img = document.createElement('img');
  img.className = 'presentation-slide-cover-img';
  img.src = u;
  img.alt = t || '';
  img.decoding = 'async';
  frame.appendChild(img);
  inner.appendChild(frame);

  if (t) {
    const cap = document.createElement('p');
    cap.className = 'presentation-slide-cover-title';
    cap.textContent = t;
    inner.appendChild(cap);
  }

  sec.appendChild(inner);
  return sec;
}

/**
 * Present 둘째 장 — 인포그래픽 등 전면 이미지 한 장.
 * @param {string | null | undefined} imageUrl
 * @param {string} [altPlain]
 * @returns {HTMLElement | null}
 */
export function buildPresentationInfographicSlide(imageUrl, altPlain) {
  const u = (imageUrl || '').trim();
  if (!u) return null;

  const sec = document.createElement('section');
  sec.className = 'presentation-slide presentation-slide--infographic';
  sec.style.width = '100%';
  sec.style.height = '100%';
  sec.style.boxSizing = 'border-box';
  const alt = (altPlain || '').replace(/\s+/g, ' ').trim() || 'Infographic';
  sec.setAttribute('aria-label', alt);

  const inner = document.createElement('div');
  inner.className = 'presentation-slide-infographic-inner';

  const frame = document.createElement('div');
  frame.className = 'presentation-slide-infographic-frame';

  const img = document.createElement('img');
  img.className = 'presentation-slide-infographic-img';
  img.src = u;
  img.alt = alt;
  img.decoding = 'async';
  frame.appendChild(img);
  inner.appendChild(frame);
  sec.appendChild(inner);
  return sec;
}

/**
 * @param {HTMLElement} postContent
 * @param {{ viewportWidth?: number; viewportHeight?: number; revealMargin?: number; deckHost?: HTMLElement }} [layout] — Reveal과 동일한 논리 크기; `deckHost`가 있으면 그 안에서 타이포 일치 측정
 * @returns {Promise<HTMLElement[]>} horizontal section nodes (some may be vertical stacks)
 */
export async function buildRevealSections(postContent, layout = {}) {
  const pretext = await import(/* @vite-ignore */ PRETEXT_MODULE);
  const clone = /** @type {HTMLElement} */ (postContent.cloneNode(true));

  const measurer = document.createElement('div');
  measurer.setAttribute('aria-hidden', 'true');
  measurer.style.top = '0';
  measurer.style.visibility = 'hidden';
  measurer.style.pointerEvents = 'none';

  /** 측정 트리를 실제 Present와 같은 글꼴·크기로 두기 위한 셸(`.reveal` 클래스는 쓰지 않음 — Reveal이 잘못 붙는 것 방지) */
  let measureShell = null;
  const { deckHost } = layout;
  if (deckHost) {
    measurer.style.position = 'relative';
    measurer.style.left = '0';
    measureShell = document.createElement('div');
    measureShell.className = 'presentation-measure-shell';
    measureShell.setAttribute('aria-hidden', 'true');
    deckHost.insertBefore(measureShell, deckHost.firstChild);
    measureShell.appendChild(measurer);
  } else {
    measurer.style.position = 'absolute';
    measurer.style.left = '-20000px';
    document.body.appendChild(measurer);
  }

  const vh = Math.max(400, layout.viewportHeight ?? DEFAULT_SLIDE_HEIGHT);
  const vw = Math.max(360, layout.viewportWidth ?? SLIDE_INNER_WIDTH);
  const slideInnerWidth = Math.min(SLIDE_INNER_WIDTH, vw);
  measurer.style.width = `${slideInnerWidth}px`;

  const margin = typeof layout.revealMargin === 'number' ? layout.revealMargin : 0.02;
  const slideMaxHeight = Math.max(240, Math.floor(vh * (1 - 2 * margin)) - VIEWPORT_HEIGHT_RESERVE);

  const options = { slideInnerWidth, slideMaxHeight, measurer };

  try {
    measurer.appendChild(clone);
    const units = extractTopLevelUnits(clone);
    const horizontal = [];

    for (const u of units) {
      if (u.type === 'vertical') {
        const innerScenes = extractVerticalInnerScenes(u.el);
        const vWrap = document.createElement('section');
        vWrap.className = 'presentation-vertical-stack';
        for (const sceneBlocks of innerScenes) {
          const slides = paginateSceneBlocks(sceneBlocks, pretext, options);
          for (const s of slides) vWrap.appendChild(s);
        }
        horizontal.push(vWrap);
        continue;
      }
      if (u.type === 'scene') {
        const slides = paginateSceneBlocks(u.blocks, pretext, options);
        if (slides.length === 0) continue;
        for (let i = 0; i < slides.length; i++) {
          const s = slides[i];
          horizontal.push(s);
        }
        if (u.asides.length && slides.length) {
          const last = slides[slides.length - 1];
          nestAsides(last, u.asides);
        }
      }
    }

    return horizontal;
  } finally {
    if (measureShell) {
      measureShell.remove();
    } else if (measurer.parentNode) {
      measurer.parentNode.removeChild(measurer);
    }
  }
}
