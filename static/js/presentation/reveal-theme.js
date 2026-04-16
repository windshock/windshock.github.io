/** Reveal 내장 테마 — `static/reveal/theme/*.css` 와 동일 이름 */
export const REVEAL_THEME_IDS = /** @type {const} */ (['black', 'league', 'night', 'dracula']);

/** 사이트 전역(글 경로와 무관) */
export const THEME_PREF_STORAGE_KEY = 'presentation-reveal-theme-pref';

/**
 * `reveal.css` 링크 기준 `/…/reveal` 베이스.
 * @returns {string}
 */
export function getRevealStaticBase() {
  const el = document.querySelector('link[href*="reveal.css"]');
  if (!(el instanceof HTMLLinkElement)) return '';
  try {
    const u = new URL(el.href, window.location.href);
    if (!/\/reveal\.css$/i.test(u.pathname)) return '';
    return u.href.replace(/\/reveal\.css(\?.*)?$/i, '');
  } catch (_) {
    return '';
  }
}

/**
 * @param {string} themeId
 */
export function revealThemeStylesheetUrl(themeId) {
  const base = getRevealStaticBase();
  return base ? `${base}/theme/${themeId}.css` : '';
}

/**
 * `#presentation-reveal-theme-css` href 교체 후 로드 대기.
 * @param {string} themeId
 */
export function applyRevealThemeStylesheet(themeId) {
  const link = document.getElementById('presentation-reveal-theme-css');
  const url = revealThemeStylesheetUrl(themeId);
  if (!(link instanceof HTMLLinkElement) || !url) return Promise.resolve();

  try {
    const nextU = new URL(url, window.location.href);
    const curU = new URL(link.href, window.location.href);
    if (curU.pathname === nextU.pathname) return Promise.resolve();
  } catch (_) {
    /* ignore */
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2000);
    const done = () => {
      clearTimeout(timeout);
      link.removeEventListener('load', done);
      link.removeEventListener('error', done);
      resolve();
    };
    link.addEventListener('load', done);
    link.addEventListener('error', done);
    link.href = url;
  });
}

export function getStoredThemePreference() {
  try {
    const v = localStorage.getItem(THEME_PREF_STORAGE_KEY);
    if (v === 'random' || REVEAL_THEME_IDS.includes(/** @type {any} */ (v))) return v;
  } catch (_) {
    /* ignore */
  }
  return 'random';
}

/**
 * @param {string} value
 */
export function setStoredThemePreference(value) {
  try {
    localStorage.setItem(THEME_PREF_STORAGE_KEY, value);
  } catch (_) {
    /* ignore */
  }
}

/**
 * @param {string} pref — `random` 또는 테마 id
 * @returns {string}
 */
export function resolveThemeIdForSession(pref) {
  if (pref !== 'random' && REVEAL_THEME_IDS.includes(/** @type {any} */ (pref))) return pref;
  return REVEAL_THEME_IDS[Math.floor(Math.random() * REVEAL_THEME_IDS.length)];
}
