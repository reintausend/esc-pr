/*
  Zweck dieser Datei:
  Passt die viewBox jedes Symbol-<svg> dynamisch an, wenn Editor-Effekte
  (Tweak, Stroke, Outline) über die Generator-Grenzen hinausragen.

  - Basis (Baseline) = viewBox und mm-Größe beim ersten Laden (Generator).
  - Pro Render: sichtbare Inhalte messen (Geometrie + Stroke), nur bei Bedarf
    erweitern (Union aus Baseline und benötigtem Bereich).
  - mm-Breite/-Höhe werden mit skaliert, damit die Zeichen nicht kleiner wirken.
  - Rein Editor-Logik; der Generator bleibt unverändert.
*/

/** Zusätzlicher Rand in SVG-Einheiten um den gemessenen Inhalt. */
const FIT_PADDING = 2;

function parseViewBox(raw) {
  if (!raw) return null;
  const p = raw.trim().split(/[\s,]+/).map(Number);
  if (p.length < 4 || p.some((n) => Number.isNaN(n))) return null;
  return { x: p[0], y: p[1], width: p[2], height: p[3] };
}

function parseMm(value) {
  if (!value) return NaN;
  return parseFloat(String(value).replace(/mm$/i, "").trim());
}

function unionViewBox(a, b) {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(ax2, bx2) - x,
    height: Math.max(ay2, by2) - y,
  };
}

function viewBoxString(box) {
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

function isShown(el) {
  if (!el || el.style.display === "none") return false;
  let node = el;
  while (node && node.nodeType === 1) {
    if (node.style && node.style.display === "none") return false;
    node = node.parentElement;
  }
  return true;
}

function collectVisibleGraphics(svg) {
  const merged = svg.querySelector(":scope > path.glyph-merged");
  if (merged && isShown(merged) && merged.getAttribute("d")) {
    return [merged];
  }
  return [...svg.querySelectorAll(":scope path:not(.glyph-merged)")].filter(isShown);
}

/*
  Misst die Bounding-Box aller sichtbaren Grafiken im Koordinatensystem
  des Symbol-<svg> (Transforms und Stroke einbezogen).
*/
function measureContentBounds(svg, elements) {
  const svgScreen = svg.getScreenCTM();
  if (!svgScreen || !elements.length) return null;

  const toSvg = svgScreen.inverse();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (typeof el.getBBox !== "function") continue;

    let bb;
    try {
      bb = el.getBBox();
    } catch {
      continue;
    }
    if (!bb.width && !bb.height) continue;

    const stroke = parseFloat(el.getAttribute("stroke-width") || "0") || 0;
    const pad = stroke / 2;

    const elScreen = el.getScreenCTM();
    if (!elScreen) continue;

    const localToSvg = toSvg.multiply(elScreen);
    const corners = [
      [bb.x - pad, bb.y - pad],
      [bb.x + bb.width + pad, bb.y - pad],
      [bb.x + bb.width + pad, bb.y + bb.height + pad],
      [bb.x - pad, bb.y + bb.height + pad],
    ];

    for (const [x, y] of corners) {
      const p = new DOMPoint(x, y).matrixTransform(localToSvg);
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  if (!Number.isFinite(minX)) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function storeBaseline(svg) {
  if (svg.dataset.baselineViewbox) return;

  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) svg.dataset.baselineViewbox = viewBox;

  const mmW = parseMm(svg.style.width);
  const mmH = parseMm(svg.style.height);
  if (Number.isFinite(mmW)) svg.dataset.baselineMmWidth = String(mmW);
  if (Number.isFinite(mmH)) svg.dataset.baselineMmHeight = String(mmH);
}

/**
 * Passt viewBox und mm-Größe eines Symbol-<svg> an (nur Vergrößerung über Baseline).
 * @param {SVGSVGElement} svg
 */
export function fitViewBox(svg) {
  storeBaseline(svg);

  const baseline = parseViewBox(svg.dataset.baselineViewbox || svg.getAttribute("viewBox"));
  if (!baseline) return;

  const baseMmW = parseFloat(svg.dataset.baselineMmWidth);
  if (!Number.isFinite(baseMmW) || baseline.width <= 0) return;

  const unitToMm = baseMmW / baseline.width;
  const elements = collectVisibleGraphics(svg);
  const measured = measureContentBounds(svg, elements);

  let fitted = baseline;
  if (measured) {
    const needed = {
      x: measured.x - FIT_PADDING,
      y: measured.y - FIT_PADDING,
      width: measured.width + 2 * FIT_PADDING,
      height: measured.height + 2 * FIT_PADDING,
    };
    fitted = unionViewBox(baseline, needed);
  }

  const next = viewBoxString(fitted);
  if (svg.getAttribute("viewBox") !== next) {
    svg.setAttribute("viewBox", next);
  }

  const mmW = fitted.width * unitToMm;
  const mmH = fitted.height * unitToMm;
  svg.dataset.fittedMmWidth = String(mmW);
  svg.dataset.fittedMmHeight = String(mmH);
}

/**
 * @param {HTMLElement} gridContent  #grid-content
 */
export function fitAllSymbolViewBoxes(gridContent) {
  for (const svg of gridContent.querySelectorAll(".symbol-row svg")) {
    fitViewBox(svg);
  }
}
