import {
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

  function setToolbar(mode) {
    const isRead = mode === 'read';
    readBtn.classList.toggle('presentation-mode-btn--active', isRead);
    readBtn.setAttribute('aria-pressed', isRead ? 'true' : 'false');
    presentBtn.classList.toggle('presentation-mode-btn--active', !isRead);
    presentBtn.setAttribute('aria-pressed', isRead ? 'false' : 'true');
  }

  function enterRead() {
    const RevealApi = window.Reveal;
    if (RevealApi && typeof RevealApi.destroy === 'function') {
      try {
        RevealApi.destroy();
      } catch (_) {
        /* ignore */
      }
    }
    if (deckHost) {
      deckHost.remove();
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
  }

  async function enterPresent() {
    if (deckHost) return;
    savedScrollY = window.scrollY;
    await document.fonts.ready;

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

    const configuredW = Math.min(window.innerWidth, 1280);
    const configuredH = Math.min(window.innerHeight, 720);
    const revealMargin = 0.02;

    let sections;
    try {
      sections = await buildRevealSections(postContent, {
        viewportWidth: configuredW,
        viewportHeight: configuredH,
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
    const themeLabel = document.createElement('span');
    themeLabel.className = 'presentation-deck-chrome-label';
    themeLabel.textContent = isKo ? '테마' : 'Theme';
    const themeSelect = document.createElement('select');
    themeSelect.className = 'presentation-deck-theme-select';
    themeSelect.setAttribute('aria-label', isKo ? '슬라이드 테마' : 'Slide theme');

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

    chrome.appendChild(themeLabel);
    chrome.appendChild(themeSelect);
    deckHost.appendChild(chrome);

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
    };

    if (sections.length === 0) {
      console.warn('Presentation: no slides generated from post content');
    }

    await RevealApi.initialize(opts);
    if (typeof RevealApi.layout === 'function') {
      RevealApi.layout();
    }
    try {
      localStorage.setItem(storageKey(), 'present');
    } catch (_) {
      /* ignore */
    }
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

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && deckHost) {
      enterRead();
    }
  });

  let initial;
  try {
    initial = localStorage.getItem(storageKey());
  } catch (_) {
    initial = null;
  }
  if (initial === 'present') {
    enterPresent().catch(() => {});
  }
}
