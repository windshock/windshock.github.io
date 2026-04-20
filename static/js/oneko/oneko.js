/* oneko.js — adryd325/oneko.js 기반 커스텀.
 *
 * 변경점:
 *   - 광고 영역(`ins.adsbygoogle`, `iframe[id^="aswift_"]` 등) + 패치 24px 안으로는
 *     이동 목표를 들이지 않는다 (회피 = avoid). 클릭 유도 금지(AdSense 정책).
 *   - Present 모드(`body.presentation-present-active`) 동안에는 숨김.
 *   - 마우스 입력이 없으면(터치/방치) 안전한 랜덤 산책 목표를 잡아 자연스레 움직임.
 *   - 가끔 작은 말풍선("냐...", "야옹"…) 띄움. 광고 위에서는 말풍선 안 띄움.
 *   - pointer-events: none, aria-hidden: true — 본문/광고 클릭 가로채지 않음.
 *   - prefers-reduced-motion: reduce — 자동 비활성화.
 *
 * 라이선스: 원본은 zlib (https://github.com/adryd325/oneko.js).
 */
(function oneko() {
  const reducedMotion =
    window.matchMedia &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  /* ---------- DOM ---------- */
  const nekoEl = document.createElement('div');
  const bubbleEl = document.createElement('div');

  /* 위치 — 화면 중앙 근처에서 시작 */
  let nekoPosX = Math.round(window.innerWidth / 2);
  let nekoPosY = Math.round(window.innerHeight / 2);

  let mousePosX = nekoPosX;
  let mousePosY = nekoPosY;
  let lastMouseMoveAt = 0;
  /** 마우스 입력 후 이 시간(ms)이 지나면 산책 모드로 전환 */
  const ROAM_AFTER_IDLE_MS = 6000;

  /** 산책 목표(터치/장시간 idle 시) */
  let roamX = nekoPosX;
  let roamY = nekoPosY;
  let roamUntil = 0;

  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation = null;
  let idleAnimationFrame = 0;

  const nekoSpeed = 10;
  const spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [
      [-5, 0],
      [-6, 0],
      [-7, 0],
    ],
    scratchWallN: [
      [0, 0],
      [0, -1],
    ],
    scratchWallS: [
      [-7, -1],
      [-6, -2],
    ],
    scratchWallE: [
      [-2, -2],
      [-2, -3],
    ],
    scratchWallW: [
      [-4, 0],
      [-4, -1],
    ],
    tired: [[-3, -2]],
    sleeping: [
      [-2, 0],
      [-2, -1],
    ],
    N: [
      [-1, -2],
      [-1, -3],
    ],
    NE: [
      [0, -2],
      [0, -3],
    ],
    E: [
      [-3, 0],
      [-3, -1],
    ],
    SE: [
      [-5, -1],
      [-5, -2],
    ],
    S: [
      [-6, -3],
      [-7, -2],
    ],
    SW: [
      [-5, -3],
      [-6, -1],
    ],
    W: [
      [-4, -2],
      [-4, -3],
    ],
    NW: [
      [-1, 0],
      [-1, -1],
    ],
  };

  /* ---------- 광고/금지 영역 ---------- */
  const AD_SELECTOR =
    'ins.adsbygoogle, .adsbygoogle, iframe[id^="aswift_"], iframe[id^="google_ads_"], iframe[src*="googlesyndication"], iframe[src*="doubleclick.net"], div[id^="google_ads_iframe_"]';
  const AD_PADDING_PX = 24;

  /** 캐시된 ad rect (200ms마다 새로) */
  let cachedAdRects = [];
  let cachedAdRectsAt = 0;

  function getAdRects() {
    const now = performance.now();
    if (now - cachedAdRectsAt < 200) return cachedAdRects;
    const out = [];
    document.querySelectorAll(AD_SELECTOR).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) return;
      out.push({
        left: r.left - AD_PADDING_PX,
        top: r.top - AD_PADDING_PX,
        right: r.right + AD_PADDING_PX,
        bottom: r.bottom + AD_PADDING_PX,
      });
    });
    cachedAdRects = out;
    cachedAdRectsAt = now;
    return out;
  }

  function pointInRect(px, py, r) {
    return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
  }

  function pointInAnyAd(px, py) {
    const rects = getAdRects();
    for (let i = 0; i < rects.length; i++) {
      if (pointInRect(px, py, rects[i])) return rects[i];
    }
    return null;
  }

  /** 점이 광고 안이면 가장 가까운 광고 바깥 가장자리로 밀어낸다 */
  function pushOutOfAds(px, py) {
    const hit = pointInAnyAd(px, py);
    if (!hit) return { x: px, y: py };
    const dLeft = px - hit.left;
    const dRight = hit.right - px;
    const dTop = py - hit.top;
    const dBottom = hit.bottom - py;
    const minD = Math.min(dLeft, dRight, dTop, dBottom);
    if (minD === dLeft) return { x: hit.left - 1, y: py };
    if (minD === dRight) return { x: hit.right + 1, y: py };
    if (minD === dTop) return { x: px, y: hit.top - 1 };
    return { x: px, y: hit.bottom + 1 };
  }

  /* Present 모드에서도 고양이는 보여야 한다(요청). 숨김 가드 없음. */

  /* ---------- 산책 모드 (마우스 없음) ---------- */
  function pickRoamTarget() {
    const margin = 48;
    for (let attempt = 0; attempt < 12; attempt++) {
      const tx = margin + Math.random() * (window.innerWidth - margin * 2);
      const ty = margin + Math.random() * (window.innerHeight - margin * 2);
      if (!pointInAnyAd(tx, ty)) {
        roamX = tx;
        roamY = ty;
        /* 0.8 ~ 3.5초 사이 머무름 */
        roamUntil = performance.now() + 800 + Math.random() * 2700;
        return;
      }
    }
    /* 마지막 시도까지 광고 안이면 그냥 화면 중앙 근처 */
    roamX = window.innerWidth / 2;
    roamY = window.innerHeight / 2;
    roamUntil = performance.now() + 1500;
  }

  /* ---------- 말풍선 ---------- */
  /* 페이지 언어로 말풍선 풀을 고른다 (`/ko/...` 페이지는 ko, `/en/...`은 en).
   * 동적 페이지 전환은 없으므로 init 시 한 번만 결정해도 충분. */
  const isKo = (document.documentElement.lang || '').toLowerCase().startsWith('ko');
  const PHRASES_KO = [
    '냐...',
    '야옹',
    '골골...',
    '...',
    '냥',
    '낮잠 잘래',
    '쓰담쓰담',
    '캣닢',
    '히익',
    '냥냥',
  ];
  const PHRASES_EN = [
    'mew...',
    'meow',
    'purr...',
    '...',
    'nyaa',
    'zzz',
    'hi',
    'pspsps?',
    'nap time',
    'blep',
  ];
  let bubbleHideTimer = null;

  function showBubble() {
    if (pointInAnyAd(nekoPosX, nekoPosY)) return; // 광고 위에서는 말풍선 X (정책)
    const pool = isKo ? PHRASES_KO : PHRASES_EN;
    const text = pool[Math.floor(Math.random() * pool.length)];
    bubbleEl.textContent = text;
    bubbleEl.style.opacity = '1';
    if (bubbleHideTimer) clearTimeout(bubbleHideTimer);
    bubbleHideTimer = window.setTimeout(() => {
      bubbleEl.style.opacity = '0';
    }, 1800);
  }

  function maybeShowBubble() {
    /* 평균 ~30초마다 한 번 (frame 호출 주기 ≈ 100ms) */
    if (Math.floor(Math.random() * 300) === 0) showBubble();
  }

  function positionBubble() {
    bubbleEl.style.left = `${Math.round(nekoPosX) + 16}px`;
    bubbleEl.style.top = `${Math.round(nekoPosY) - 28}px`;
  }

  /* ---------- 초기화 ---------- */
  function init() {
    const curScript = document.currentScript;
    const nekoFile =
      (curScript && curScript.dataset && curScript.dataset.cat) || '/images/oneko/oneko.gif';

    nekoEl.id = 'oneko';
    nekoEl.setAttribute('aria-hidden', 'true');
    nekoEl.style.cssText =
      'width:32px;height:32px;position:fixed;pointer-events:none;image-rendering:pixelated;z-index:2147483646;';
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
    nekoEl.style.backgroundImage = `url(${nekoFile})`;

    bubbleEl.id = 'oneko-bubble';
    bubbleEl.setAttribute('aria-hidden', 'true');
    bubbleEl.style.cssText =
      'position:fixed;pointer-events:none;z-index:2147483646;font:12px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#222;background:rgba(255,255,255,0.92);border:1px solid rgba(0,0,0,0.12);border-radius:10px;padding:2px 7px;box-shadow:0 1px 4px rgba(0,0,0,0.15);opacity:0;transition:opacity 240ms ease;white-space:nowrap;';

    document.body.appendChild(nekoEl);
    document.body.appendChild(bubbleEl);

    document.addEventListener(
      'mousemove',
      (event) => {
        mousePosX = event.clientX;
        mousePosY = event.clientY;
        lastMouseMoveAt = performance.now();
      },
      { passive: true },
    );

    /* viewport 변화 시 캐시된 ad rect 무효화 */
    window.addEventListener('scroll', () => (cachedAdRectsAt = 0), { passive: true });
    window.addEventListener('resize', () => (cachedAdRectsAt = 0));

    pickRoamTarget();
    window.requestAnimationFrame(onAnimationFrame);
  }

  let lastFrameTimestamp;

  function onAnimationFrame(timestamp) {
    if (!nekoEl.isConnected) return;
    if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
    if (timestamp - lastFrameTimestamp > 100) {
      lastFrameTimestamp = timestamp;
      frame();
    }
    window.requestAnimationFrame(onAnimationFrame);
  }

  function setSprite(name, frame) {
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function idle() {
    idleTime += 1;
    if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation === null) {
      const choices = ['sleeping', 'scratchSelf'];
      if (nekoPosX < 32) choices.push('scratchWallW');
      if (nekoPosY < 32) choices.push('scratchWallN');
      if (nekoPosX > window.innerWidth - 32) choices.push('scratchWallE');
      if (nekoPosY > window.innerHeight - 32) choices.push('scratchWallS');
      idleAnimation = choices[Math.floor(Math.random() * choices.length)];
    }
    switch (idleAnimation) {
      case 'sleeping':
        if (idleAnimationFrame < 8) {
          setSprite('tired', 0);
          break;
        }
        setSprite('sleeping', Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) resetIdleAnimation();
        break;
      case 'scratchWallN':
      case 'scratchWallS':
      case 'scratchWallE':
      case 'scratchWallW':
      case 'scratchSelf':
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) resetIdleAnimation();
        break;
      default:
        setSprite('idle', 0);
        return;
    }
    idleAnimationFrame += 1;
  }

  function chooseTarget() {
    /* 마우스 입력이 최근에 있으면 마우스 추적, 아니면 산책 */
    const now = performance.now();
    const recentMouse = now - lastMouseMoveAt < ROAM_AFTER_IDLE_MS;

    let tx;
    let ty;
    if (recentMouse) {
      tx = mousePosX;
      ty = mousePosY;
    } else {
      if (now > roamUntil) pickRoamTarget();
      tx = roamX;
      ty = roamY;
    }
    /* 광고 안으로 들어가는 목표는 가장 가까운 바깥으로 밀어냄 */
    return pushOutOfAds(tx, ty);
  }

  function frame() {
    frameCount += 1;
    const target = chooseTarget();
    const diffX = nekoPosX - target.x;
    const diffY = nekoPosY - target.y;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    positionBubble();
    maybeShowBubble();

    if (distance < nekoSpeed || distance < 48) {
      idle();
      /* roaming일 때는 도착하면 다음 목적지를 미리 잡아준다 */
      if (performance.now() - lastMouseMoveAt >= ROAM_AFTER_IDLE_MS) {
        if (performance.now() > roamUntil - 300 && Math.random() < 0.05) pickRoamTarget();
      }
      return;
    }

    idleAnimation = null;
    idleAnimationFrame = 0;
    if (idleTime > 1) {
      setSprite('alert', 0);
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return;
    }

    let direction = '';
    direction += diffY / distance > 0.5 ? 'N' : '';
    direction += diffY / distance < -0.5 ? 'S' : '';
    direction += diffX / distance > 0.5 ? 'W' : '';
    direction += diffX / distance < -0.5 ? 'E' : '';
    if (!direction) direction = 'idle';
    setSprite(direction, frameCount);

    nekoPosX -= (diffX / distance) * nekoSpeed;
    nekoPosY -= (diffY / distance) * nekoSpeed;

    /* 이동 후에도 광고 안으로 들어갔다면 즉시 밀어냄 (회피) */
    const safe = pushOutOfAds(nekoPosX, nekoPosY);
    nekoPosX = safe.x;
    nekoPosY = safe.y;

    nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
    nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;

    /* dodge 모듈에 현재 위치 전달 — 단어 span들이 비켜준다 */
    if (window.__onekoDodge && typeof window.__onekoDodge.update === 'function') {
      window.__onekoDodge.update(nekoPosX, nekoPosY);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
