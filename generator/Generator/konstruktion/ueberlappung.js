/*
  Zweck dieser Datei:
  Orientierungsabhängige Überlappungsprüfung (Regelwerk Kapitel 7.8).

  Verhindert flächige parallele Überlagerungen (schwarze Cluster), erlaubt
  punktuelle Anbindungen und Kreuzungen. Läuft ausschließlich in der
  Kompositionskontrolle (Kapitel 7.8) – nicht während der Platzierung.
*/

import { CONFIG } from "../config.js";
import { bboxOfPoints, bboxesIntersect, mergeBBoxes } from "./geometrie.js";

function elementPath2D(element) {
  const m = element.matrix;
  const domMatrix = new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]);
  const combined = new Path2D();
  for (const d of element.paths) {
    combined.addPath(new Path2D(d), domMatrix);
  }
  return combined;
}

/*
  Dominante Strichrichtung aus platzierten Konturpunkten (PCA).
  Rückgabe in Radiant, undirected: [-π/2, π/2].
*/
export function dominantAngle(points) {
  if (!points.length) return 0;

  const bbox = bboxOfPoints(points);
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (const p of points) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    cxx += dx * dx;
    cyy += dy * dy;
    cxy += dx * dy;
  }

  return 0.5 * Math.atan2(2 * cxy, cxx - cyy);
}

/*
  Undirected Winkelabstand zweier Richtungen in Radiant (0 … π/2).
  0 = parallel, π/2 = senkrecht.
*/
export function angleDelta(angleA, angleB) {
  let delta = Math.abs(angleA - angleB) % Math.PI;
  if (delta > Math.PI / 2) delta = Math.PI - delta;
  return delta;
}

/*
  Orientierungsabhängige Obergrenze für das Überlappungsverhältnis.
  parallel (0°) → MAX_PARALLEL_OVERLAP_RATIO
  senkrecht (90°) → MAX_PERPENDICULAR_OVERLAP_RATIO
*/
export function allowedOverlapRatio(angleDeltaRad) {
  const parallelness = Math.cos(angleDeltaRad) ** 2;
  return (
    CONFIG.MAX_PERPENDICULAR_OVERLAP_RATIO +
    (CONFIG.MAX_PARALLEL_OVERLAP_RATIO - CONFIG.MAX_PERPENDICULAR_OVERLAP_RATIO) *
      parallelness
  );
}

function rasterMask(element, bbox, rasterSize) {
  const PAD = 2;
  const scale = Math.min(
    (rasterSize - 2 * PAD) / Math.max(bbox.width, 1),
    (rasterSize - 2 * PAD) / Math.max(bbox.height, 1)
  );
  const w = Math.max(4, Math.ceil(bbox.width * scale) + 2 * PAD);
  const h = Math.max(4, Math.ceil(bbox.height * scale) + 2 * PAD);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.setTransform(scale, 0, 0, scale, PAD - bbox.x * scale, PAD - bbox.y * scale);
  ctx.fillStyle = "#000";
  ctx.fill(elementPath2D(element), "nonzero");

  const data = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] > 32) mask[i] = 1;
  }
  return { mask, w, h };
}

/*
  Misst Überlappungsverhältnis zweier platzierten Elemente:
  Schnittfläche ÷ kleinere Elementfläche (Kapitel 7.8).
*/
export function measurePairOverlap(elementA, elementB) {
  if (!bboxesIntersect(elementA.placedBBox, elementB.placedBBox)) {
    return { ratio: 0, areaA: 0, areaB: 0, intersection: 0 };
  }

  const bbox = mergeBBoxes([elementA.placedBBox, elementB.placedBBox]);
  if (bbox.width <= 0 || bbox.height <= 0) {
    return { ratio: 0, areaA: 0, areaB: 0, intersection: 0 };
  }

  const rasterSize = CONFIG.OVERLAP_RASTER_SIZE;
  const maskA = rasterMask(elementA, bbox, rasterSize);
  const maskB = rasterMask(elementB, bbox, rasterSize);

  if (maskA.w !== maskB.w || maskA.h !== maskB.h) {
    return { ratio: 0, areaA: 0, areaB: 0, intersection: 0 };
  }

  let areaA = 0;
  let areaB = 0;
  let intersection = 0;
  const len = maskA.mask.length;
  for (let i = 0; i < len; i++) {
    const a = maskA.mask[i];
    const b = maskB.mask[i];
    if (a) areaA++;
    if (b) areaB++;
    if (a && b) intersection++;
  }

  const smaller = Math.min(areaA, areaB);
  const ratio = smaller > 0 ? intersection / smaller : 0;
  return { ratio, areaA, areaB, intersection };
}

function pairOverlapAllowed(elementA, elementB) {
  const { ratio } = measurePairOverlap(elementA, elementB);
  if (ratio < CONFIG.OVERLAP_CHECK_MIN_RATIO) return { allowed: true, ratio };

  const delta = angleDelta(
    dominantAngle(elementA.placedPoints),
    dominantAngle(elementB.placedPoints)
  );
  const allowed = allowedOverlapRatio(delta);

  if (ratio > CONFIG.MAX_PAIR_OVERLAP_RATIO) {
    return { allowed: false, ratio, allowedLimit: allowed, angleDeg: (delta * 180) / Math.PI };
  }
  if (ratio > allowed) {
    return { allowed: false, ratio, allowedLimit: allowed, angleDeg: (delta * 180) / Math.PI };
  }
  return { allowed: true, ratio, allowedLimit: allowed, angleDeg: (delta * 180) / Math.PI };
}

/*
  Kapitel 7.8: Prüft alle Paare angebundener Strukturelemente.
*/
export function checkSymbolOverlap(structureElements) {
  let worst = null;

  for (let i = 0; i < structureElements.length; i++) {
    for (let j = i + 1; j < structureElements.length; j++) {
      const a = structureElements[i];
      const b = structureElements[j];
      if (!bboxesIntersect(a.placedBBox, b.placedBBox)) continue;

      const result = pairOverlapAllowed(a, b);
      if (!result.allowed) {
        return {
          passed: false,
          ratio: result.ratio,
          allowedLimit: result.allowedLimit,
          angleDeg: result.angleDeg,
        };
      }
      if (!worst || result.ratio > worst.ratio) {
        worst = result;
      }
    }
  }

  return {
    passed: true,
    ratio: worst?.ratio ?? 0,
    allowedLimit: worst?.allowedLimit ?? null,
    angleDeg: worst?.angleDeg ?? null,
  };
}
