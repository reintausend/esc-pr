/*
  Zweck dieser Datei:
  Anordnung mehrerer Symbole und Erzeugung der Gesamt-SVG-Datei
  (Kapitel 9.6 – Ausgabe mehrerer Symbole).

  Regeln:
  - Die Symbole werden in der Reihenfolge der Wörter der Eingabe
    angeordnet (hier: untereinander im Ausgabefeld).
  - Zwischen zwei benachbarten Symbolen liegt ein konstanter Abstand
    von 2 cm, gemessen zwischen den äußeren Begrenzungskonturen
    (inkl. freistehender Akzente).
  - Der Abstand ist unabhängig von der Symbolgröße und für alle
    Symbole identisch; auch Satzzeichen-Symbole halten 2 cm Abstand.
  - Punkte und Kommas werden rechtsbündig angeordnet (Kapitel 2).
  - Ausrufezeichen und Fragezeichen werden linksbündig angeordnet
    (Kapitel 2).
  - Wort-Symbole werden mittig angeordnet.
  - Die Anordnung verändert weder Geometrie noch Konstruktion der
    Symbole – sie dient ausschließlich der Darstellung.
*/

import { CONFIG } from "../config.js";
import { symbolToSvg } from "./svg.js";

const SPACING_UNITS = CONFIG.SYMBOL_SPACING_MM * CONFIG.UNITS_PER_MM;

/*
  Horizontale Ausrichtung je Symboltyp (Kapitel 2 – Satzzeichen):
  - Wort-Symbole: mittig
  - Punkt/Komma: rechtsbündig
  - Ausrufezeichen/Fragezeichen: linksbündig
*/
function symbolAlignment(symbol) {
  if (symbol.type === "punctuation-plain") return "right";
  if (symbol.type === "punctuation-fragmented") return "left";
  return "center";
}

function horizontalOffset(alignment, maxWidth, bboxWidth) {
  if (alignment === "left") return 0;
  if (alignment === "right") return maxWidth - bboxWidth;
  return (maxWidth - bboxWidth) / 2;
}

/*
  Ordnet die fertigen Symbole vertikal an.
  Rückgabe:
  {
    items: [{ symbol, svg, mmWidth, mmHeight, alignment }],
    totalSvg: Gesamt-SVG-Datei (String) für den Download
  }
*/
export function arrangeSymbols(symbols) {
  const items = symbols.map((symbol) => {
    const svg = symbolToSvg(symbol);
    return {
      symbol,
      svg,
      mmWidth: svg.widthUnits / CONFIG.UNITS_PER_MM,
      mmHeight: svg.heightUnits / CONFIG.UNITS_PER_MM,
      alignment: symbolAlignment(symbol),
    };
  });

  const totalSvg = buildCombinedSvg(items);
  return { items, totalSvg };
}

/*
  Erzeugt eine einzelne SVG-Datei mit allen Symbolen untereinander,
  2 cm Abstand zwischen den Begrenzungskonturen (für den Download,
  Kapitel 9 – Ausgabe der SVG-Datei).
*/
function buildCombinedSvg(items) {
  const maxWidth = Math.max(...items.map((i) => i.svg.widthUnits), 1);

  let y = 0;
  const parts = [];
  for (const item of items) {
    const { bbox } = item.svg;
    const x = horizontalOffset(item.alignment, maxWidth, bbox.width);
    const tx = x - bbox.x;
    const ty = y - bbox.y;

    const inner = item.svg.markup
      .replace(/^<svg[^>]*>/, "")
      .replace(/<\/svg>$/, "");
    parts.push(`<g transform="translate(${tx} ${ty})">${inner}</g>`);

    // Konstanter Abstand von 2 cm zwischen den Begrenzungskonturen.
    y += bbox.height + SPACING_UNITS;
  }
  const totalHeight = Math.max(1, y - SPACING_UNITS);

  const widthMm = maxWidth / CONFIG.UNITS_PER_MM;
  const heightMm = totalHeight / CONFIG.UNITS_PER_MM;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${widthMm.toFixed(3)}mm" height="${heightMm.toFixed(3)}mm" ` +
    `viewBox="0 0 ${maxWidth} ${totalHeight}" fill="#1d1d1b">\n` +
    parts.join("\n") +
    `\n</svg>`
  );
}

/*
  Löst den Download der Gesamt-SVG-Datei aus (Kapitel 9.5 – der
  Generator beendet seine Aufgabe mit der Ausgabe der SVG-Datei).
*/
export function downloadSvg(svgString, filename = "symbol.svg") {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
