/*
  Zweck dieser Datei:
  Regler-gesteuerter Tweak-Effekt (wie der Illustrator-Dialog).

  Nicht die Maus, sondern die Stärke-Regler verzerren die Zeichen:
  Jeder bearbeitbare Punkt (Ankerpunkt / Griff) bekommt beim Erfassen
  eine feste zufällige Richtung. Die Regler skalieren diese Richtung –
  0 % = Originalform, höhere Werte = stärkere Verzerrung. Dadurch wirkt
  das Ziehen am Regler stufenlos und stabil (kein Zufalls-Flackern).

  Arbeitet ausschließlich auf <path>-Elementen; die Preview wandelt alle
  Formen vorher zu Pfaden um (Editor/preview/normalizeShapes.js).
*/

import {
  parsePathData,
  pathDataToString,
  extractEditablePoints,
  applyPointDelta,
} from "./pathData.js";

const ALL_ROLES = {
  affectAnchors: true,
  affectInHandles: true,
  affectOutHandles: true,
};

function pointKey(point) {
  return `${point.commandIndex}:${point.valueIndex}`;
}

function bboxOfPoints(points) {
  if (!points.length) return { w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { w: maxX - minX, h: maxY - minY };
}

export class TweakEffect {
  /*
    Erfasst pro Pfad die Originalform, eine feste Zufallsrichtung je
    Punkt und die Original-Bounding-Box (für den Relativ-Modus).
    @param {SVGPathElement[]} paths
  */
  capture(paths) {
    const entries = [];
    for (const element of paths) {
      const originalD = element.getAttribute("d") || "";
      let commands;
      try {
        commands = parsePathData(originalD);
      } catch {
        continue;
      }
      const points = extractEditablePoints(commands, ALL_ROLES);
      const randoms = new Map();
      for (const p of points) {
        randoms.set(pointKey(p), {
          rx: Math.random() * 2 - 1,
          ry: Math.random() * 2 - 1,
        });
      }
      entries.push({ element, originalD, randoms, bbox: bboxOfPoints(points) });
    }
    return entries;
  }

  /*
    Neue Zufallsrichtungen je Punkt – Originalform bleibt erhalten.
    Für den Randomize-Button (neues Verzerrungsmuster pro Klick).
    @param {Array} entries  Rückgabe von capture()
  */
  regenerateRandoms(entries) {
    for (const entry of entries) {
      let commands;
      try {
        commands = parsePathData(entry.originalD);
      } catch {
        continue;
      }

      const points = extractEditablePoints(commands, ALL_ROLES);
      const randoms = new Map();
      for (const p of points) {
        randoms.set(pointKey(p), {
          rx: Math.random() * 2 - 1,
          ry: Math.random() * 2 - 1,
        });
      }
      entry.randoms = randoms;
    }
  }

  /*
    Wendet die aktuelle Reglerstärke auf alle erfassten Pfade an –
    immer ausgehend von der Originalform (nicht kumulativ).
    @param {Array} entries  Rückgabe von capture()
    @param {import("./Brush.js").Brush} brush
  */
  apply(entries, brush) {
    const relative = brush.mode === "relative";
    const options = brush.strengthOptions;

    for (const entry of entries) {
      let commands;
      try {
        commands = parsePathData(entry.originalD);
      } catch {
        continue;
      }

      const maxH = relative
        ? (brush.horizontalStrength / 100) * entry.bbox.w
        : brush.horizontalStrength;
      const maxV = relative
        ? (brush.verticalStrength / 100) * entry.bbox.h
        : brush.verticalStrength;

      const points = extractEditablePoints(commands, options);
      for (const p of points) {
        const r = entry.randoms.get(pointKey(p));
        if (!r) continue;
        applyPointDelta(commands, p, r.rx * maxH, r.ry * maxV);
      }

      entry.element.setAttribute("d", pathDataToString(commands));
    }
  }
}
