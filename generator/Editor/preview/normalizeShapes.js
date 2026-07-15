/*
  Zweck dieser Datei:
  Wandelt einfache SVG-Formen (rect, polygon, polyline, line) in
  <path>-Elemente um, damit das Tweak-Werkzeug ALLE Symbolteile
  bearbeiten kann (das Werkzeug arbeitet ausschließlich auf Pfaden).

  Die Umwandlung ist rein visuell verlustfrei: Aussehen, Füllung,
  Klassen und Stile bleiben erhalten – nur der Elementtyp ändert sich.
  Verändert NICHT die Generator-Geometrie, sondern nur das gerenderte
  DOM in der Preview.
*/

const SVG_NS = "http://www.w3.org/2000/svg";

function num(el, attr, fallback = 0) {
  const value = parseFloat(el.getAttribute(attr));
  return Number.isFinite(value) ? value : fallback;
}

function rectToPathData(el) {
  const x = num(el, "x");
  const y = num(el, "y");
  const w = num(el, "width");
  const h = num(el, "height");
  return `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
}

function pointsToPathData(el, close) {
  const raw = (el.getAttribute("points") || "").trim();
  if (!raw) return "";
  const nums = raw.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  if (nums.length < 4) return "";

  let d = `M${nums[0]},${nums[1]}`;
  for (let i = 2; i + 1 < nums.length; i += 2) {
    d += `L${nums[i]},${nums[i + 1]}`;
  }
  return close ? d + "Z" : d;
}

function lineToPathData(el) {
  const x1 = num(el, "x1");
  const y1 = num(el, "y1");
  const x2 = num(el, "x2");
  const y2 = num(el, "y2");
  return `M${x1},${y1}L${x2},${y2}`;
}

function shapeToPathData(el) {
  switch (el.tagName.toLowerCase()) {
    case "rect":
      return rectToPathData(el);
    case "polygon":
      return pointsToPathData(el, true);
    case "polyline":
      return pointsToPathData(el, false);
    case "line":
      return lineToPathData(el);
    default:
      return null;
  }
}

const SHAPE_ATTRS = new Set([
  "x", "y", "width", "height", "rx", "ry",
  "points", "x1", "y1", "x2", "y2", "cx", "cy", "r",
]);

function replaceShape(shape) {
  const d = shapeToPathData(shape);
  if (!d) return;

  const path = document.createElementNS(SVG_NS, "path");
  for (const attr of shape.attributes) {
    if (SHAPE_ATTRS.has(attr.name)) continue;
    path.setAttribute(attr.name, attr.value);
  }
  path.setAttribute("d", d);
  shape.replaceWith(path);
}

/**
 * Konvertiert alle unterstützten Formen innerhalb des Grids zu Pfaden.
 * @param {HTMLElement} gridContent  #grid-content
 */
export function normalizeShapesToPaths(gridContent) {
  const shapes = gridContent.querySelectorAll("rect, polygon, polyline, line");
  shapes.forEach(replaceShape);
}
