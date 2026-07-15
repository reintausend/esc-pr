/*
  Zweck dieser Datei:
  Erzeugt die SVG-Struktur eines einzelnen Symbols (Kapitel 9).

  - Alle Formen sind vollständig definierte Vektorpfade – exakt die
    Pfade aus den Material-SVGs, unverändert (9.1, 9.4).
  - Rotation, Spiegelung und Verschiebung stehen ausschließlich im
    transform-Attribut; die Pfaddaten werden nicht angefasst (9.4).
  - Hauptstruktur + angebundene Fragmente bilden eine gemeinsame
    Gruppe (9.2), Akzente bleiben eigenständige Formen in derselben
    Datei (9.3).
*/

import { mergeBBoxes, matrixToString } from "../konstruktion/geometrie.js";

// Innenabstand der Symbol-viewBox in SVG-Einheiten,
// damit keine Kontur exakt am Rand abgeschnitten wird.
const VIEWBOX_PADDING = 3;

function elementMarkup(element) {
  const transform = matrixToString(element.matrix);
  const paths = element.paths
    .map((d) => `      <path d="${d}"/>`)
    .join("\n");
  return `    <g transform="${transform}" data-zeichen="${element.char}">\n${paths}\n    </g>`;
}

/*
  Baut das SVG eines Symbols und liefert:
  {
    markup:  vollständiges <svg>-Element als String
    bbox:    Begrenzungskontur des Symbols (inkl. Akzente, 9.6)
    widthUnits/heightUnits: Größe in SVG-Einheiten
  }
*/
export function symbolToSvg(symbol) {
  // Äußere Begrenzungskontur: umschließt sämtliche Fragmente,
  // freistehende Akzente eingeschlossen (Kapitel 9.6).
  const bbox = mergeBBoxes(symbol.elements.map((e) => e.placedBBox));
  const viewBox = {
    x: bbox.x - VIEWBOX_PADDING,
    y: bbox.y - VIEWBOX_PADDING,
    width: bbox.width + 2 * VIEWBOX_PADDING,
    height: bbox.height + 2 * VIEWBOX_PADDING,
  };

  // Hauptstruktur und angebundene Fragmente = eine zusammenhängende
  // Gruppe (9.2); Akzente = eigenständige Formen (9.3).
  const structure = symbol.elements.filter((e) => e.role !== "accent");
  const accents = symbol.elements.filter((e) => e.role === "accent");

  const structureGroup =
    `  <g data-rolle="struktur">\n` +
    structure.map(elementMarkup).join("\n") +
    `\n  </g>`;

  const accentGroups = accents
    .map((a) => `  <g data-rolle="akzent">\n${elementMarkup(a)}\n  </g>`)
    .join("\n");

  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" ` +
    `fill="#1d1d1b">\n` +
    structureGroup +
    (accentGroups ? `\n${accentGroups}` : "") +
    `\n</svg>`;

  return {
    markup,
    bbox: viewBox,
    widthUnits: viewBox.width,
    heightUnits: viewBox.height,
  };
}
