/*
  Animates the top black block height between pages (up/down only).
  Previous height is read from sessionStorage; the new target is stored
  for the next navigation.
*/

const KEY = "fr-black-bar-rows";
const TOTAL_ROWS = 24;
export const BLACK_BAR_DURATION_MS = 900;
export const BLACK_BAR_EASING = "cubic-bezier(0.45, 0.05, 0.25, 1)";

export function rememberBlackBar(rows) {
  try {
    sessionStorage.setItem(KEY, String(rows));
  } catch {
    /* private mode / blocked storage — ignore */
  }
}

export function readBlackBarRows(fallback) {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function pinBar(el) {
  el.style.position = "absolute";
  el.style.top = "0";
  el.style.left = "0";
  el.style.right = "0";
  el.style.width = "100%";
  el.style.bottom = "auto";
  el.style.transform = "none";
}

function rowsToPct(rows) {
  return (rows / TOTAL_ROWS) * 100;
}

/**
 * Animate bar height to targetRows. Resolves when the transition ends.
 * @param {HTMLElement | null} el
 * @param {number} targetRows
 * @returns {Promise<void>}
 */
export function animateBlackBar(el, targetRows) {
  return new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    pinBar(el);
    el.style.setProperty("--bar-rows", String(targetRows));

    const prevStored = readBlackBarRows(targetRows);
    const fromPct = parseFloat(el.style.height) || rowsToPct(prevStored);
    const toPct = rowsToPct(targetRows);
    rememberBlackBar(targetRows);

    if (reduceMotion || Math.abs(fromPct - toPct) < 0.05) {
      el.style.transition = "none";
      el.style.height = `${toPct}%`;
      resolve();
      return;
    }

    el.style.transition = "none";
    el.style.willChange = "height";
    if (!el.style.height) el.style.height = `${fromPct}%`;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      el.style.willChange = "auto";
      el.removeEventListener("transitionend", onEnd);
      resolve();
    };
    const onEnd = (event) => {
      if (event.propertyName && event.propertyName !== "height") return;
      finish();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `height ${BLACK_BAR_DURATION_MS}ms ${BLACK_BAR_EASING}`;
        el.style.height = `${toPct}%`;
      });
    });

    el.addEventListener("transitionend", onEnd);
    setTimeout(finish, BLACK_BAR_DURATION_MS + 120);
  });
}

/**
 * @param {HTMLElement | null} el  Absolutely positioned full-width bar
 * @param {number} targetRows      Height in grid rows (out of 24)
 * @param {{ animate?: boolean }} [opts]
 */
export function initBlackBar(el, targetRows, { animate = true } = {}) {
  if (!el) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const fromRows = readBlackBarRows(targetRows);
  rememberBlackBar(targetRows);

  const fromPct = rowsToPct(fromRows);
  const toPct = rowsToPct(targetRows);

  pinBar(el);
  el.style.setProperty("--bar-rows", String(targetRows));
  el.style.height = `${fromPct}%`;

  if (!animate || reduceMotion || fromRows === targetRows) {
    el.style.transition = "none";
    el.style.height = `${toPct}%`;
    return;
  }

  el.style.transition = "none";
  el.style.willChange = "height";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = `height ${BLACK_BAR_DURATION_MS}ms ${BLACK_BAR_EASING}`;
      el.style.height = `${toPct}%`;
    });
  });

  const clearWillChange = () => {
    el.style.willChange = "auto";
    el.removeEventListener("transitionend", clearWillChange);
  };
  el.addEventListener("transitionend", clearWillChange);
}
