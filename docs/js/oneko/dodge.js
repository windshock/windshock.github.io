/* dodge.js — 고양이가 지나가면 글자(단어 span)가 비켜주는 효과.
 *
 * 설계:
 *   - 대상 텍스트(.post-content, Present 슬라이드 안)를 단어 단위 `<span class="oneko-word">`로 wrap.
 *     공백·인라인 자식(<a>, <code> …)은 보존. 코드/이미지 등은 건너뜀.
 *   - IntersectionObserver로 viewport 안 span만 활성으로 둔다.
 *   - oneko가 매 프레임 update(x, y)를 호출하면 활성 span 중 cat 좌표 반경 R 안의 것만
 *     translate transform을 준다(반경 밖은 transform 제거).
 *   - 모든 span은 `pointer-events: inherit` — 본문 클릭/선택 영향 없음. transform-only(reflow X).
 *
 * pretext는 정적 줄바꿈 계산만 하므로 “이 효과”를 직접 해주지 않는다. 대신 본 모듈을 쓴다.
 */
(function dodge() {
  if (window.__onekoDodge) return;

  const reducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** dodge 영향 반경(px) */
  const RADIUS = 90;
  /** push 강도 — (R - d)에 곱해지는 비율 */
  const PUSH_GAIN = 0.45;
  /** 한 번에 줄 수 있는 최대 변위(px) — 너무 멀리 튀지 않게 */
  const MAX_PUSH = 28;

  /** 텍스트 wrap 대상 셀렉터(루트가 명시되지 않을 때 기본 검색 범위) */
  const ROOT_SELECTORS = [
    '.post-content',
    '#presentation-deck-host .reveal .slides',
  ];

  /** 자손까지 모두 wrap 제외 — 코드·미디어·UI 컨트롤·말풍선 자체 */
  const SKIP_SUBTREE = new Set([
    'CODE',
    'PRE',
    'SCRIPT',
    'STYLE',
    'IFRAME',
    'IMG',
    'SVG',
    'CANVAS',
    'VIDEO',
    'AUDIO',
    'BUTTON',
    'INPUT',
    'TEXTAREA',
    'SELECT',
    'NOSCRIPT',
  ]);

  /** wrap 한 번 이상 처리한 root — 중복 wrap 방지 */
  const wrappedRoots = new WeakSet();
  /** 모든 단어 span (중앙 좌표 캐시용) */
  /** @type {Set<HTMLSpanElement>} */
  const allSpans = new Set();
  /** viewport 안에 있는 span (각 프레임 거리 계산 대상) */
  /** @type {Set<HTMLSpanElement>} */
  const visibleSpans = new Set();
  /** 캐시: span → {cx, cy} (중심 좌표, viewport 기준) */
  /** @type {WeakMap<HTMLSpanElement, {cx:number, cy:number}>} */
  const spanCenters = new WeakMap();
  /** 현재 transform이 적용 중인 span (반경 밖이면 해제할 후보) */
  /** @type {Set<HTMLSpanElement>} */
  const appliedSpans = new Set();

  let centersDirty = true;

  function markCentersDirty() {
    centersDirty = true;
  }

  function recomputeCenters() {
    /* 보이는 span만 좌표 갱신 — Intersection으로 visibleSpans 유지 */
    visibleSpans.forEach((sp) => {
      const r = sp.getBoundingClientRect();
      spanCenters.set(sp, { cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
    });
    centersDirty = false;
  }

  /** IntersectionObserver — 화면 안 span만 활성 */
  const io =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              const sp = /** @type {HTMLSpanElement} */ (e.target);
              if (e.isIntersecting) {
                visibleSpans.add(sp);
                /* 새로 보이게 됐으면 좌표 갱신 필요 */
                centersDirty = true;
              } else {
                visibleSpans.delete(sp);
                /* 사라지면 transform도 정리 */
                if (appliedSpans.has(sp)) {
                  sp.style.transform = '';
                  appliedSpans.delete(sp);
                }
              }
            }
          },
          { rootMargin: '120px' },
        )
      : null;

  function isInsideSkipped(node, root) {
    let p = node.parentNode;
    while (p && p !== root) {
      if (p.nodeType === 1 && SKIP_SUBTREE.has(p.tagName)) return true;
      p = p.parentNode;
    }
    return false;
  }

  function wrapTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!text || !/\S/.test(text)) return [];
    const frag = document.createDocumentFragment();
    const spans = [];
    /* 공백을 별도 텍스트 노드로 보존 — 줄바꿈/들여쓰기 그대로 */
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
      } else {
        const sp = document.createElement('span');
        sp.className = 'oneko-word';
        sp.textContent = part;
        /* 변형은 transform-only — reflow를 일으키지 않음 */
        sp.style.display = 'inline-block';
        sp.style.willChange = 'transform';
        frag.appendChild(sp);
        spans.push(sp);
      }
    }
    textNode.parentNode.replaceChild(frag, textNode);
    return spans;
  }

  function wrap(root) {
    if (!root || wrappedRoots.has(root)) return 0;
    wrappedRoots.add(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !/\S/.test(node.nodeValue)) return NodeFilter.FILTER_SKIP;
        if (isInsideSkipped(node, root)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    /* 먼저 노드를 모은 다음 변경한다 (DOM 변경하면 walker 무효화) */
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    let count = 0;
    for (const tn of nodes) {
      const spans = wrapTextNode(tn);
      for (const sp of spans) {
        allSpans.add(sp);
        if (io) io.observe(sp);
        else visibleSpans.add(sp); // IO 미지원 시 모두 활성
        count += 1;
      }
    }
    centersDirty = true;
    return count;
  }

  function wrapSelectorsUnder(parent) {
    let total = 0;
    for (const sel of ROOT_SELECTORS) {
      parent.querySelectorAll(sel).forEach((root) => {
        total += wrap(root);
      });
    }
    return total;
  }

  function update(catX, catY) {
    if (reducedMotion) return;
    if (visibleSpans.size === 0) return;
    if (centersDirty) recomputeCenters();

    const r2 = RADIUS * RADIUS;

    visibleSpans.forEach((sp) => {
      const c = spanCenters.get(sp);
      if (!c) return;
      const dx = c.cx - catX;
      const dy = c.cy - catY;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) {
        if (appliedSpans.has(sp)) {
          sp.style.transform = '';
          appliedSpans.delete(sp);
        }
        return;
      }
      const d = Math.sqrt(d2) || 1;
      /* 거리 0에 가까울수록 크게, 반경 끝에선 0 — 자연스러운 push */
      const force = Math.min(MAX_PUSH, (RADIUS - d) * PUSH_GAIN);
      const tx = (dx / d) * force;
      const ty = (dy / d) * force;
      sp.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
      appliedSpans.add(sp);
    });
  }

  /* 좌표 캐시 무효화 트리거 */
  window.addEventListener('scroll', markCentersDirty, { passive: true });
  window.addEventListener('resize', markCentersDirty);
  /* 글꼴 로드 후 줄 높이/폭이 바뀌면 좌표도 다시 잡아야 함 */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(markCentersDirty).catch(() => {});
  }

  /* mode-switcher가 Present 슬라이드를 새로 만들 때 호출 */
  window.addEventListener('oneko:rewrap', (ev) => {
    const detail = (ev && ev.detail) || {};
    if (detail.root) {
      wrap(detail.root);
    } else {
      wrapSelectorsUnder(document);
    }
  });

  /* DOMContentLoaded 시 기본 영역 wrap */
  function initialWrap() {
    wrapSelectorsUnder(document);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialWrap, { once: true });
  } else {
    initialWrap();
  }

  window.__onekoDodge = { wrap, update, markCentersDirty };
})();
