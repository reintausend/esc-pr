/*
  Zweck dieser Datei:
  Skaliert die Anzeige-Größe aller Symbol-<svg> nach dem Größen-Regler.
  35 % = Generator-Stand (Faktor 1).

  - Wörter (mittig): transform-origin center → wächst aus der Mitte.
  - ! ? (links): transform-origin left → linker Rand bleibt fix.
  - . , (rechts): transform-origin right → rechter Rand bleibt fix.

  Die mm-Größe des <svg> bleibt auf der ViewBox-Fit-Baseline; nur transform
  skaliert sichtbar (Überstand über Grid erlaubt, 2-cm-Abstand darf brechen).
*/

import { SIZE_NEUTRAL } from "./sizeConstants.js";

/** @param {number} percent  Regler 0–100 */
export function sizeScaleFromPercent(percent) {
  const p = Math.min(100, Math.max(0, Number(percent) || 0));
  return p / SIZE_NEUTRAL;
}

function transformOriginForRow(row) {
  if (row.classList.contains("symbol-row--right")) return "right center";
  if (row.classList.contains("symbol-row--left")) return "left center";
  return "center center";
}

/**
 * @param {HTMLElement} gridContent  #grid-content
 * @param {number} sizePercent     Regler 0–100 (35 = Generator-Stand)
 */
export function applySymbolSize(gridContent, sizePercent) {
  const scale = sizeScaleFromPercent(sizePercent);

  for (const row of gridContent.querySelectorAll(".symbol-row")) {
    const svg = row.querySelector("svg");
    if (!svg) continue;

    const fittedW = parseFloat(svg.dataset.fittedMmWidth);
    const fittedH = parseFloat(svg.dataset.fittedMmHeight);
    if (!Number.isFinite(fittedW) || !Number.isFinite(fittedH)) continue;

    svg.style.width = `${fittedW}mm`;
    svg.style.height = `${fittedH}mm`;

    if (Math.abs(scale - 1) < 1e-6) {
      svg.style.transform = "";
      svg.style.transformOrigin = "";
    } else {
      svg.style.transformOrigin = transformOriginForRow(row);
      svg.style.transform = `scale(${scale})`;
    }
  }
}
