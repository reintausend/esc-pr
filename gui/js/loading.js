/*
  Shared encrypting overlay helpers (entry → editor).

  The overlay is a full-width black panel pinned to the top. On Create it
  expands downward from the current black-bar height; on the editor it
  stays at 100% until generation finishes (see html.is-encrypting).
*/

import {
  BLACK_BAR_DURATION_MS,
  BLACK_BAR_EASING,
} from "./black-bar.js";

export const ENCRYPT_FLAG = "fr-encrypting";
const TOTAL_ROWS = 24;

export function markEncrypting() {
  try {
    sessionStorage.setItem(ENCRYPT_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function peekEncrypting() {
  try {
    return sessionStorage.getItem(ENCRYPT_FLAG) === "1";
  } catch {
    return false;
  }
}

export function consumeEncrypting() {
  try {
    const on = sessionStorage.getItem(ENCRYPT_FLAG) === "1";
    sessionStorage.removeItem(ENCRYPT_FLAG);
    return on;
  } catch {
    return false;
  }
}

function restartPulse(el) {
  const label = el.querySelector(".loading-overlay__label");
  if (!label) return;
  label.style.animation = "none";
  void label.offsetWidth;
  label.style.animation = "";
}

/** Show overlay already covering the stage (no expand animation). */
export function showLoadingOverlay(el, { restartPulse: pulse = true } = {}) {
  if (!el) return;
  el.hidden = false;
  el.style.transition = "none";
  el.style.height = "100%";
  el.classList.add("is-visible");
  if (pulse) restartPulse(el);
}

/**
 * Expand overlay from `fromRows` down to full stage height.
 * @returns {Promise<void>}
 */
export function expandLoadingOverlay(el, fromRows = 6) {
  return new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    el.hidden = false;
    el.classList.add("is-visible");
    restartPulse(el);

    const fromPct = (fromRows / TOTAL_ROWS) * 100;
    el.style.transition = "none";
    el.style.height = `${fromPct}%`;

    if (reduceMotion) {
      el.style.height = "100%";
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
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
        el.style.height = "100%";
      });
    });

    el.addEventListener("transitionend", onEnd);
    setTimeout(finish, BLACK_BAR_DURATION_MS + 120);
  });
}

/** Instant hide — used when the black bar already covers the stage. */
export function hideLoadingOverlayInstant(el) {
  if (!el) return;
  el.classList.remove("is-visible");
  el.style.transition = "none";
  el.style.height = "";
  el.hidden = true;
}

export function hideLoadingOverlay(el) {
  hideLoadingOverlayInstant(el);
}
