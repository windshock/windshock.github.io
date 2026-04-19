import {
  VIEWPORT_HEIGHT_RESERVE,
  buildRevealSections,
  buildPresentationCoverSlide,
  buildPresentationInfographicSlide,
} from './slide-splitter.js';
import {
  REVEAL_THEME_IDS,
  applyRevealThemeStylesheet,
  getStoredThemePreference,
  resolveThemeIdForSession,
  setStoredThemePreference,
} from './reveal-theme.js';

const STORAGE_PREFIX = 'presentation-mode:';

function storageKey() {
  return `${STORAGE_PREFIX}${window.location.pathname}`;
}

/** Prefer visual viewport so mobile browser chrome / dynamic toolbars are reflected. */
function readPresentationViewport() {
  const vv = window.visualViewport;
  if (vv && vv.width >= 80 && vv.height >= 80) {
    return { width: Math.round(vv.width), height: Math.round(vv.height) };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Read env(safe-area-inset-*) values exposed as CSS variables (see presentation.css). */
function readPresentationSafeAreaInsets() {
  const cs = window.getComputedStyle(document.documentElement);
  const px = (name) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  return {
    top: px('--presentation-safe-top'),
    right: px('--presentation-safe-right'),
    bottom: px('--presentation-safe-bottom'),
    left: px('--presentation-safe-left'),
  };
}

/**
 * Logical width/height for Reveal + slide pagination. Narrow / portrait gets a taller
 * logical canvas (up to 1200) and extra vertical reserve for controls & safe areas.
 */
function getPresentationConfiguredSize() {
  const { width: vwRaw, height: vhRaw } = readPresentationViewport();
  const safe = readPresentationSafeAreaInsets();
  // Subtract horizontal/vertical safe-area insets — the deck-host pads them out, so the
  // usable Reveal area is smaller than the raw visual viewport on notched phones.
  const vwUsable = Math.max(vwRaw - safe.left - safe.right, 280);
  const vhUsable = Math.max(vhRaw - safe.top - safe.bottom, 280);
  const configuredW = Math.min(vwUsable, 1280);
  const narrow = configuredW < 540;
  // In-flow chrome row (~48px) + padding: Reveal logical size must match the flex area
  // below it or scaling letterboxes and looks like “half the screen”.
  const chromeReservePx = narrow ? 56 : 0;
  const vhNet = Math.max(vhUsable - chromeReservePx, 320);
  const configuredH = narrow ? Math.min(vhNet, 1200) : Math.min(vhUsable, 720);
  const portrait = configuredH > configuredW * 1.04;
  let viewportHeightReserve = VIEWPORT_HEIGHT_RESERVE;
  if (narrow && portrait) {
    viewportHeightReserve = VIEWPORT_HEIGHT_RESERVE + 88;
  } else if (narrow) {
    viewportHeightReserve = VIEWPORT_HEIGHT_RESERVE + 44;
  }
  return { configuredW, configuredH, viewportHeightReserve, narrow, portrait };
}

function debouncePresentationLayout(fn, ms) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let t;
  return () => {
    window.clearTimeout(t);
    t = window.setTimeout(fn, ms);
  };
}

/** Shareable deep link: `?present`, `?present=1`, `?present=true` open Present on load. */
function wantsPresentQuery(url = new URL(window.location.href)) {
  if (!url.searchParams.has('present')) return false;
  const raw = (url.searchParams.get('present') || '').trim().toLowerCase();
  if (raw === '' || raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  return false;
}

/** Opt out when localStorage would otherwise restore Present. */
function explicitlyRefusesPresentQuery(url = new URL(window.location.href)) {
  if (!url.searchParams.has('present')) return false;
  const raw = (url.searchParams.get('present') || '').trim().toLowerCase();
  return raw === '0' || raw === 'false' || raw === 'no';
}

function stripPresentQueryParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('present')) return;
  url.searchParams.delete('present');
  const qs = url.searchParams.toString();
  const next = `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`;
  window.history.replaceState({}, '', next);
}

/** Keep `?present=…` when switching language via `<link rel="alternate" hreflang>`. */
function carryPresentSearchParam(href) {
  const u = new URL(href, window.location.origin);
  const cur = new URL(window.location.href);
  if (cur.searchParams.has('present')) {
    u.searchParams.set('present', cur.searchParams.get('present') || '1');
  }
  return u.toString();
}

/**
 * KO/EN toggles from `head` alternates (Hugo `.AllTranslations`). Current language is a span;
 * the other is a link. Omits missing translations.
 * @param {HTMLElement} container
 * @param {boolean} isKoUi — aria copy for the group (page UI language)
 */
function appendPresentationLangSwitch(container, isKoUi) {
  /** @type {Record<string, string>} */
  const byLang = {};
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => {
    if (link.getAttribute('type')) return;
    const hl = (link.getAttribute('hreflang') || '').trim().toLowerCase().split('-')[0];
    const href = link.getAttribute('href');
    if ((hl === 'ko' || hl === 'en') && href) byLang[hl] = href;
  });
  const path = window.location.pathname;
  const curLang = path.startsWith('/ko/') ? 'ko' : path.startsWith('/en/') ? 'en' : null;
  if (curLang !== 'ko' && curLang !== 'en') return;

  const rows = [
    { code: 'ko', label: '한글', ariaEn: 'Korean version', ariaKo: '한글 버전으로 이동' },
    { code: 'en', label: 'English', ariaEn: 'English version', ariaKo: '영문 버전으로 이동' },
  ];
  for (const { code, label, ariaEn, ariaKo } of rows) {
    const active = code === curLang;
    const target = byLang[code];
    if (active) {
      const span = document.createElement('span');
      span.className = 'presentation-deck-lang-btn presentation-deck-lang-btn--active';
      span.textContent = label;
      span.setAttribute('aria-current', 'true');
      span.title = isKoUi ? '현재 글' : 'Current article';
      container.appendChild(span);
      continue;
    }
    if (!target) continue;
    const a = document.createElement('a');
    a.className = 'presentation-deck-lang-btn';
    a.href = carryPresentSearchParam(target);
    a.textContent = label;
    a.setAttribute('aria-label', isKoUi ? ariaKo : ariaEn);
    container.appendChild(a);
  }
}

/** Reveal UMD replaces `initialize` after the first run; `destroy()` does not re-bind a new root, so we reload the script after exiting Present. */
function findRevealScriptUrl() {
  const scripts = Array.from(document.getElementsByTagName('script'));
  const match = scripts.find((s) => s.src && /\/reveal\/reveal\.js(\?|$)/i.test(s.src));
  return match?.src ? match.src.split('?')[0] : null;
}

async function reloadRevealRuntime() {
  const base = findRevealScriptUrl();
  if (!base) {
    console.warn('Presentation: reveal.js script URL not found; reload skipped');
    return;
  }
  for (const s of Array.from(document.querySelectorAll('script[src]'))) {
    if (s.src && /\/reveal\/reveal\.js(\?|$)/i.test(s.src)) {
      s.remove();
    }
  }
  try {
    delete window.Reveal;
  } catch (_) {
    window.Reveal = undefined;
  }
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${base}?presentation_reload=${Date.now()}`;
    s.async = false;
    s.onload = () => resolve(undefined);
    s.onerror = () => reject(new Error('Failed to reload reveal.js'));
    document.head.appendChild(s);
  });
}

/**
 * Wire Read / Present controls for posts with `data-presentation`.
 */
export function initPresentationMode() {
  const article = document.getElementById('presentation-article');
  const postContent = document.getElementById('presentation-post-content');
  const readBtn = document.getElementById('presentation-btn-read');
  const presentBtn = document.getElementById('presentation-btn-present');

  if (!article || !postContent || !readBtn || !presentBtn) return;

  let deckHost = null;
  let savedScrollY = 0;
  let needsRevealReload = false;

  function setToolbar(mode) {
    const isRead = mode === 'read';
    readBtn.classList.toggle('presentation-mode-btn--active', isRead);
    readBtn.setAttribute('aria-pressed', isRead ? 'true' : 'false');
    presentBtn.classList.toggle('presentation-mode-btn--active', !isRead);
    presentBtn.setAttribute('aria-pressed', isRead ? 'false' : 'true');
  }

  function enterRead() {
    const hadDeck = !!deckHost;
    const RevealApi = window.Reveal;
    if (RevealApi && typeof RevealApi.destroy === 'function') {
      try {
        RevealApi.destroy();
      } catch (_) {
        /* ignore */
      }
    }
    if (deckHost) {
      if (typeof deckHost._presentationDetachViewport === 'function') {
        try {
          deckHost._presentationDetachViewport();
        } catch (_) {
          /* ignore */
        }
        delete deckHost._presentationDetachViewport;
      }
      try {
        deckHost.remove();
      } catch (_) {
        /* ignore */
      }
      deckHost = null;
    }
    article.classList.remove('presentation-present-active');
    document.body.classList.remove('presentation-present-active');
    window.scrollTo(0, savedScrollY);
    setToolbar('read');
    try {
      localStorage.setItem(storageKey(), 'read');
    } catch (_) {
      /* ignore */
    }
    stripPresentQueryParam();
    if (hadDeck) {
      needsRevealReload = true;
    }
  }

  async function enterPresent() {
    if (deckHost && !deckHost.isConnected) {
      deckHost = null;
    }
    if (deckHost) return;
    savedScrollY = window.scrollY;
    await document.fonts.ready;

    if (needsRevealReload) {
      try {
        await reloadRevealRuntime();
        needsRevealReload = false;
      } catch (err) {
        console.error(err);
      }
    }

    deckHost = document.createElement('div');
    deckHost.id = 'presentation-deck-host';

    const revealRoot = document.createElement('div');
    revealRoot.className = 'reveal';

    const slidesEl = document.createElement('div');
    slidesEl.className = 'slides';

    revealRoot.appendChild(slidesEl);
    deckHost.appendChild(revealRoot);
    document.body.appendChild(deckHost);

    const loading = document.createElement('p');
    loading.className = 'presentation-deck-loading';
    loading.setAttribute('role', 'status');
    loading.textContent =
      document.documentElement.lang && document.documentElement.lang.toLowerCase().startsWith('ko')
        ? '슬라이드 준비 중…'
        : 'Preparing slides…';
    deckHost.appendChild(loading);

    article.classList.add('presentation-present-active');
    document.body.classList.add('presentation-present-active');
    setToolbar('present');

    const { configuredW, configuredH, viewportHeightReserve } = getPresentationConfiguredSize();
    const revealMargin = 0.02;

    let sections;
    try {
      sections = await buildRevealSections(postContent, {
        viewportWidth: configuredW,
        viewportHeight: configuredH,
        viewportHeightReserve,
        revealMargin,
        deckHost,
      });
    } finally {
      loading.remove();
    }

    const coverUrl = article.getAttribute('data-presentation-cover');
    let coverTitle = '';
    const titleEl = article.querySelector('h1.post-title');
    if (titleEl) {
      const tClone = /** @type {HTMLElement} */ (titleEl.cloneNode(true));
      tClone.querySelectorAll('.entry-hint, svg').forEach((n) => n.remove());
      coverTitle = (tClone.textContent || '').replace(/\s+/g, ' ').trim();
    }
    const coverSlide = buildPresentationCoverSlide(coverUrl, coverTitle);
    const infographicUrl = article.getAttribute('data-presentation-infographic');
    const infographicSlide = buildPresentationInfographicSlide(infographicUrl, coverTitle);

    const prefixSlides = [];
    if (coverSlide) prefixSlides.push(coverSlide);
    if (infographicSlide) prefixSlides.push(infographicSlide);
    if (prefixSlides.length) sections.unshift(...prefixSlides);

    for (const sec of sections) slidesEl.appendChild(sec);

    const isKo =
      document.documentElement.lang && document.documentElement.lang.toLowerCase().startsWith('ko');

    const themePref = getStoredThemePreference();
    const themeId = resolveThemeIdForSession(themePref);
    await applyRevealThemeStylesheet(themeId);

    const chrome = document.createElement('div');
    chrome.className = 'presentation-deck-chrome';

    const chromeStart = document.createElement('div');
    chromeStart.className = 'presentation-deck-chrome-start';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'presentation-deck-back-btn';
    const backLabel = isKo ? '글로 돌아가기' : 'Back to article';
    const backHint = isKo
      ? '블로그 읽기 화면으로 전환합니다. Esc 키로도 나갈 수 있습니다.'
      : 'Return to the article. You can also press Esc.';
    backBtn.textContent = backLabel;
    backBtn.title = backHint;
    backBtn.setAttribute('aria-label', backLabel);
    backBtn.addEventListener('click', () => {
      enterRead();
    });
    chromeStart.appendChild(backBtn);

    const langWrap = document.createElement('div');
    langWrap.className = 'presentation-deck-lang';
    langWrap.setAttribute('role', 'group');
    langWrap.setAttribute('aria-label', isKo ? '언어' : 'Language');
    appendPresentationLangSwitch(langWrap, isKo);
    if (langWrap.childElementCount > 0) {
      chromeStart.appendChild(langWrap);
    }

    const chromeEnd = document.createElement('div');
    chromeEnd.className = 'presentation-deck-chrome-end';

    const themeSelect = document.createElement('select');
    themeSelect.className = 'presentation-deck-theme-select';
    themeSelect.setAttribute('aria-label', isKo ? '슬라이드 테마' : 'Slide theme');
    themeSelect.title = isKo ? '슬라이드 테마 선택' : 'Select slide theme';

    const optRandom = document.createElement('option');
    optRandom.value = 'random';
    optRandom.textContent = isKo ? '랜덤' : 'Random';
    themeSelect.appendChild(optRandom);
    for (const id of REVEAL_THEME_IDS) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id.charAt(0).toUpperCase() + id.slice(1);
      themeSelect.appendChild(opt);
    }
    themeSelect.value = themePref;
    themeSelect.addEventListener('change', async () => {
      const v = /** @type {string} */ (themeSelect.value);
      setStoredThemePreference(v);
      const next = resolveThemeIdForSession(v);
      await applyRevealThemeStylesheet(next);
      const R = window.Reveal;
      if (R && typeof R.layout === 'function') R.layout();
    });

    chromeEnd.appendChild(themeSelect);

    chrome.appendChild(chromeStart);
    chrome.appendChild(chromeEnd);

    /* pretext 크레딧 — 상단 툴바에 두면 좁은 화면에서 줄이 길어져 혼잡해진다.
     * 대신 deck-host 좌하단에 작은 워터마크로 띄워 상단을 깨끗하게 유지한다. */
    const pretextCredit = document.createElement('a');
    pretextCredit.className = 'presentation-deck-credit-watermark';
    pretextCredit.href = 'https://github.com/chenglou/pretext';
    pretextCredit.target = '_blank';
    pretextCredit.rel = 'noopener noreferrer';
    pretextCredit.textContent = 'typeset with pretext';
    pretextCredit.title = isKo
      ? '이 슬라이드의 줄바꿈은 pretext로 계산되었습니다'
      : 'Line breaks computed with pretext';
    deckHost.appendChild(pretextCredit);
    /* Above slides in the tree so flex column lays chrome out first — avoids fixed overlap on content */
    deckHost.insertBefore(chrome, revealRoot);

    const RevealApi = window.Reveal;
    if (typeof RevealApi === 'undefined' || typeof RevealApi.initialize !== 'function') {
      console.error('Reveal.js did not load');
      enterRead();
      return;
    }

    const opts = {
      hash: false,
      embedded: true,
      controls: true,
      progress: true,
      center: false,
      width: configuredW,
      height: configuredH,
      margin: revealMargin,
      slideNumber: 'c/t',
      // Reveal 5 default scrollActivationWidth is 435 — below that it switches to scroll
      // view on phones, which looks like the deck only “uses half the screen”.
      scrollActivationWidth: false,
    };

    if (sections.length === 0) {
      console.warn('Presentation: no slides generated from post content');
    }

    await RevealApi.initialize(opts);
    if (typeof RevealApi.layout === 'function') {
      RevealApi.layout();
    }
    if (typeof RevealApi.slide === 'function') {
      RevealApi.slide(0, 0);
    }
    try {
      localStorage.setItem(storageKey(), 'present');
    } catch (_) {
      /* ignore */
    }

    const onViewportChange = debouncePresentationLayout(() => {
      if (!deckHost || !deckHost.isConnected) return;
      const next = getPresentationConfiguredSize();
      const R = window.Reveal;
      if (R && typeof R.configure === 'function' && typeof R.layout === 'function') {
        try {
          R.configure({ width: next.configuredW, height: next.configuredH });
          R.layout();
        } catch (_) {
          /* ignore */
        }
      }
    }, 160);

    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
    deckHost._presentationDetachViewport = () => {
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
    };
  }

  readBtn.addEventListener('click', () => {
    enterRead();
  });

  presentBtn.addEventListener('click', () => {
    enterPresent().catch((err) => {
      console.error(err);
      enterRead();
    });
  });

  // Capture phase: Reveal.js may stop Escape from bubbling, which would leave
  // `deckHost` set and make the next `enterPresent()` hit `if (deckHost) return`.
  document.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key !== 'Escape' || !deckHost) return;
      ev.preventDefault();
      ev.stopPropagation();
      enterRead();
    },
    true
  );

  let initial;
  try {
    initial = localStorage.getItem(storageKey());
  } catch (_) {
    initial = null;
  }
  const openPresentOnLoad =
    wantsPresentQuery() || (!explicitlyRefusesPresentQuery() && initial === 'present');
  if (openPresentOnLoad) {
    enterPresent().catch(() => {});
  }
}
