/*
  Zweck dieser Datei:
  Baut aus dem bearbeiteten Grid die Gesamt-SVG für Download/Print neu.

  - Layout entspricht der Preview (getBoundingClientRect, inkl. Größen-Regler).
  - Feste Breite = druckbare 72,2 mm (512 dots); Inhalt darüber hinaus wird
    durch die viewBox abgeschnitten (Hard-Clip beim Druck).
*/

import { LAYOUT } from "./layoutConstants.js";

const { UNITS_PER_MM, PRINTABLE_WIDTH_MM } = LAYOUT;
const PRINTABLE_WIDTH_UNITS = PRINTABLE_WIDTH_MM * UNITS_PER_MM;

function parseViewBox(raw) {
  if (!raw) return null;
  const p = raw.trim().split(/[\s,]+/).map(Number);
  if (p.length < 4 || p.some((n) => Number.isNaN(n))) return null;
  return { x: p[0], y: p[1], width: p[2], height: p[3] };
}

function fmt(n) {
  return Number(n.toFixed(4)).toString();
}

/**
 * @param {HTMLElement} gridContent  #grid-content
 * @returns {string|null}
 */
export function rebuildTotalSvgFromGrid(gridContent) {
  const grid = gridContent.closest(".glyph-grid");
  if (!grid) return null;

  const rows = [...gridContent.querySelectorAll(".symbol-row")];
  if (!rows.length) return null;

  const gridRect = grid.getBoundingClientRect();
  if (!gridRect.width) return null;

  const mmPerPx = PRINTABLE_WIDTH_MM / gridRect.width;
  const parts = [];
  let maxBottomMm = 0;

  for (const row of rows) {
    const svg = row.querySelector("svg");
    if (!svg) continue;

    const svgRect = svg.getBoundingClientRect();
    const vb = parseViewBox(svg.getAttribute("viewBox"));
    if (!vb || !vb.width || !vb.height) continue;

    const xMm = (svgRect.left - gridRect.left) * mmPerPx;
    const yMm = (svgRect.top - gridRect.top) * mmPerPx;
    const displayWMm = svgRect.width * mmPerPx;
    const displayHMm = svgRect.height * mmPerPx;

    maxBottomMm = Math.max(maxBottomMm, yMm + displayHMm);

    const scaleX = (displayWMm * UNITS_PER_MM) / vb.width;
    const scaleY = (displayHMm * UNITS_PER_MM) / vb.height;
    const s = Math.min(scaleX, scaleY);

    const xUnits = xMm * UNITS_PER_MM;
    const yUnits = yMm * UNITS_PER_MM;

    parts.push(
      `<g transform="translate(${fmt(xUnits)} ${fmt(yUnits)}) ` +
        `scale(${fmt(s)}) translate(${fmt(-vb.x)} ${fmt(-vb.y)})">` +
        `${svg.innerHTML}</g>`
    );
  }

  if (!parts.length) return null;

  const totalHeightMm = Math.max(PRINTABLE_WIDTH_MM * 0.01, maxBottomMm);
  const totalHeightUnits = totalHeightMm * UNITS_PER_MM;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${PRINTABLE_WIDTH_MM}mm" height="${totalHeightMm.toFixed(3)}mm" ` +
    `viewBox="0 0 ${fmt(PRINTABLE_WIDTH_UNITS)} ${fmt(totalHeightUnits)}" ` +
    `fill="#1d1d1b">\n` +
    parts.join("\n") +
    `\n</svg>`
  );
}
