/*
  Zweck dieser Datei:
  Geometrie-Werkzeuge für die Konstruktion.

  Wichtig für das Regelwerk: Diese Werkzeuge verändern die
  Pfadgeometrie der Fragmente NIEMALS (Kapitel 2 – Erhaltung der Form).
  Sie berechnen ausschließlich:
  - Abtastpunkte auf den Konturen (für die Anbindungsprüfung:
    "berühren oder überlappen", Kapitel 4 – Definition einer Anbindung)
  - Bounding-Boxen
  - Transformationsmatrizen für die einzig erlaubten Transformationen:
    Verschieben, Rotation, horizontale/vertikale Spiegelung
    (Kapitel 4.4 – Platzierung der Fragmente)
*/

import { CONFIG } from "../config.js";

/* ---- Verstecktes Mess-SVG ----
   Wird nur zum Abtasten der Pfade benötigt (getPointAtLength ist nur
   auf gerenderten SVG-Elementen verfügbar). */

let measureSvg = null;

function getMeasureSvg() {
  if (!measureSvg) {
    measureSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    measureSvg.setAttribute("width", "0");
    measureSvg.setAttribute("height", "0");
    measureSvg.style.position = "absolute";
    measureSvg.style.left = "-99999px";
    document.body.appendChild(measureSvg);
  }
  return measureSvg;
}

/*
  Tastet alle Pfade eines geladenen SVGs ab und liefert:
  {
    points: [{x, y}, ...]   Konturpunkte in lokalen Koordinaten
    bbox:   {x, y, width, height}
  }
  Die Pfaddaten selbst bleiben unangetastet.
*/
export function samplePaths(pathDefinitions) {
  const svg = getMeasureSvg();
  const points = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const d of pathDefinitions) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);

    const total = path.getTotalLength();
    const n = CONFIG.SAMPLES_PER_PATH;
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength((total * i) / n);
      points.push({ x: p.x, y: p.y });
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    svg.removeChild(path);
  }

  return {
    points,
    bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  };
}

/* ---- Transformationsmatrizen ----
   Eine Platzierung besteht aus Rotation und Spiegelung um das lokale
   Zentrum des Elements sowie einer Verschiebung. Mehr ist laut
   Regelwerk nicht erlaubt. Matrix-Form: [a c e / b d f]. */

export function makePlacementMatrix(center, rotationDeg, mirrorX, mirrorY, tx, ty) {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = mirrorX ? -1 : 1;
  const sy = mirrorY ? -1 : 1;

  // M = T(tx,ty) * T(center) * R(rot) * S(sx,sy) * T(-center)
  const a = cos * sx;
  const b = sin * sx;
  const c = -sin * sy;
  const d = cos * sy;
  const e = tx + center.x - a * center.x - c * center.y;
  const f = ty + center.y - b * center.x - d * center.y;

  return { a, b, c, d, e, f };
}

export function applyMatrix(m, p) {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

export function transformPoints(m, points) {
  return points.map((p) => applyMatrix(m, p));
}

export function matrixToString(m) {
  return `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`;
}

/* ---- Bounding-Box- und Abstands-Berechnungen ---- */

export function bboxOfPoints(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function bboxCenter(bbox) {
  return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
}

export function bboxesIntersect(a, b, pad = 0) {
  return (
    a.x - pad < b.x + b.width + pad &&
    a.x + a.width + pad > b.x - pad &&
    a.y - pad < b.y + b.height + pad &&
    a.y + a.height + pad > b.y - pad
  );
}

export function mergeBBoxes(boxes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Kleinster Abstand zwischen zwei Punktmengen. Grundlage der
// Anbindungsprüfung: Abstand <= CONTACT_TOLERANCE bedeutet
// "berührt oder überlappt" (Kapitel 4 – Definition einer Anbindung).
export function minDistance(pointsA, pointsB) {
  let min = Infinity;
  for (const a of pointsA) {
    for (const b of pointsB) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = dx * dx + dy * dy;
      if (d < min) min = d;
    }
  }
  return Math.sqrt(min);
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
