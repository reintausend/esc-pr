/*
  Zweck dieser Datei:
  Verschmilzt alle Fragmentpfade eines Symbol-<svg> zu EINER Kontur
  (Boolean-Union) für den Outline-Modus der Preview.

  - Nutzt Paper.js (global geladen als window.paper, paper-core.min.js).
  - Backt die transform-Matrizen der Fragmente ein, sodass alle Konturen
    im viewBox-Koordinatensystem des Symbols liegen.
  - Überlappende Fragmente werden vereinigt → innere Konstruktionsnähte
    verschwinden, nur echte Außen-/Innenkonturen bleiben (Referenzbild).
  - Rein für die Darstellung; verändert die Fragmentgeometrie NICHT.
*/

let paperReady = false;

function ensurePaper() {
  if (typeof paper === "undefined") {
    throw new Error(
      "Paper.js ist nicht geladen. paper-core.min.js muss in preview.html eingebunden sein."
    );
  }
  if (!paperReady) {
    // Off-Screen-Canvas – wird nur für die Geometrie gebraucht, nie gezeichnet.
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    paper.setup(canvas);
    paperReady = true;
  }
}

/*
  Gesamtmatrix vom lokalen Koordinatensystem eines Pfads bis zum
  Symbol-<svg>. Liest ausschließlich die transform-Attribute (funktioniert
  auch, wenn die Fragmente per display:none ausgeblendet sind).
*/
function matrixPathToSvg(path, svg) {
  let matrix = new DOMMatrix();
  let node = path;
  while (node && node !== svg) {
    const base = node.transform && node.transform.baseVal;
    if (base && base.numberOfItems) {
      const consolidated = base.consolidate();
      if (consolidated) {
        const m = consolidated.matrix;
        matrix = new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]).multiply(matrix);
      }
    }
    node = node.parentNode;
  }
  return matrix;
}

/**
 * Verschmilzt alle <path> eines Symbols zu einem d-String (viewBox-Koordinaten).
 * @param {SVGSVGElement} svg  ein Symbol-<svg> im Grid
 * @returns {string|null} zusammengeführte Pfaddaten oder null
 */
export function mergeSvgToPathData(svg) {
  ensurePaper();

  const paths = svg.querySelectorAll("path:not(.glyph-merged)");
  if (!paths.length) return null;

  const layer = paper.project.activeLayer;
  layer.removeChildren();

  const items = [];
  for (const p of paths) {
    const d = p.getAttribute("d");
    if (!d) continue;
    let item;
    try {
      item = new paper.CompoundPath(d);
    } catch {
      continue;
    }
    const m = matrixPathToSvg(p, svg);
    item.transform(new paper.Matrix(m.a, m.b, m.c, m.d, m.e, m.f));
    items.push(item);
  }

  if (!items.length) {
    layer.removeChildren();
    return null;
  }

  let result = items[0];
  for (let i = 1; i < items.length; i++) {
    result = result.unite(items[i]);
  }

  const data = result.pathData;
  layer.removeChildren();
  return data || null;
}
