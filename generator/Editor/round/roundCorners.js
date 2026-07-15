/*
  Zweck dieser Datei:
  Rundet die Ecken eines SVG-Pfads (Fillet) für den Regler „Kanten abrunden".

  - Arbeitet nur an echten Ecken zwischen zwei GERADEN Segmenten (L–L).
    Kurven (C) bleiben unangetastet; Ecken an Kurven werden nicht gerundet.
  - Pro Ecke wird ein Stück der beiden angrenzenden Geraden zurückgeschnitten
    (max. halbe Segmentlänge) und durch eine Bézier-Rundung ersetzt.
  - fraction 0 = keine Rundung, 1 = maximal (Schnitt = halbe kürzere Kante).
  - Rein funktional, kein DOM. Immer aus dem übergebenen d neu berechnet.
*/

import { parsePathData, pathDataToString } from "../tweak/pathData.js";

const EPS = 1e-4;

function len(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/*
  Zerlegt geparste (absolute) Befehle in Subpfade.
  Jeder Subpfad: { closed, V:[{x,y}...], S:[{type, c1?, c2?}...] }
  V = Ankerpunkte in Reihenfolge, S[i] = Segment von V[i] nach V[i+1]
  (bei geschlossenen Pfaden zyklisch, S.length === V.length).
*/
function toSubpaths(commands) {
  const subs = [];
  let cur = null;

  for (const cmd of commands) {
    if (cmd.type === "M") {
      cur = { closed: false, V: [{ x: cmd.values[0], y: cmd.values[1] }], S: [] };
      subs.push(cur);
    } else if (cmd.type === "L" && cur) {
      cur.S.push({ type: "L" });
      cur.V.push({ x: cmd.values[0], y: cmd.values[1] });
    } else if (cmd.type === "C" && cur) {
      cur.S.push({
        type: "C",
        c1: { x: cmd.values[0], y: cmd.values[1] },
        c2: { x: cmd.values[2], y: cmd.values[3] },
      });
      cur.V.push({ x: cmd.values[4], y: cmd.values[5] });
    } else if (cmd.type === "Z" && cur) {
      cur.closed = true;
    }
  }

  for (const sub of subs) normalizeClosed(sub);
  return subs;
}

/*
  Geschlossene Subpfade so aufbereiten, dass S zyklisch ist (S.length === V.length):
  - endet der letzte Punkt auf dem Startpunkt, wird der doppelte Punkt entfernt.
  - sonst wird das implizite Schließsegment (Gerade zurück zum Start) ergänzt.
*/
function normalizeClosed(sub) {
  if (!sub.closed) return;
  const first = sub.V[0];
  const last = sub.V[sub.V.length - 1];
  if (len(first.x, first.y, last.x, last.y) < EPS && sub.V.length > 1) {
    sub.V.pop();
  } else {
    sub.S.push({ type: "L" });
  }
}

function fmt(n) {
  return Number(n.toFixed(4)).toString();
}

// Kubische Ecke: quadratische Rundung (Kontrollpunkt V) als Cubic serialisiert.
function cornerCurve(p1, v, p2) {
  const c1x = p1.x + (v.x - p1.x) * (2 / 3);
  const c1y = p1.y + (v.y - p1.y) * (2 / 3);
  const c2x = p2.x + (v.x - p2.x) * (2 / 3);
  const c2y = p2.y + (v.y - p2.y) * (2 / 3);
  return `C${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(p2.x)},${fmt(p2.y)}`;
}

/*
  Berechnet für jede Ecke die Ein-/Austrittspunkte der Rundung.
  Nur wenn beide angrenzenden Segmente Geraden sind, wird gerundet.
  @returns Array pro Vertex: { rounded, p1, p2 }
*/
function computeCorners(sub, fraction) {
  const n = sub.V.length;
  const closed = sub.closed && sub.S.length === n;
  const corners = new Array(n);

  for (let i = 0; i < n; i++) {
    corners[i] = { rounded: false, p1: sub.V[i], p2: sub.V[i] };

    const hasPrev = closed || i > 0;
    const hasNext = closed || i < n - 1;
    if (!hasPrev || !hasNext) continue;

    const segIn = sub.S[(i - 1 + sub.S.length) % sub.S.length];
    const segOut = sub.S[i % sub.S.length];
    if (!segIn || !segOut) continue;
    if (segIn.type !== "L" || segOut.type !== "L") continue;

    const a = sub.V[(i - 1 + n) % n];
    const v = sub.V[i];
    const b = sub.V[(i + 1) % n];

    const lenIn = len(a.x, a.y, v.x, v.y);
    const lenOut = len(v.x, v.y, b.x, b.y);
    if (lenIn < EPS || lenOut < EPS) continue;

    const inx = (v.x - a.x) / lenIn;
    const iny = (v.y - a.y) / lenIn;
    const outx = (b.x - v.x) / lenOut;
    const outy = (b.y - v.y) / lenOut;

    // Kollineare „Ecken" (keine echte Richtungsänderung) überspringen.
    const cross = inx * outy - iny * outx;
    const dot = inx * outx + iny * outy;
    if (Math.abs(cross) < EPS && dot > 0) continue;

    const cut = fraction * 0.5 * Math.min(lenIn, lenOut);
    if (cut < EPS) continue;

    corners[i] = {
      rounded: true,
      p1: { x: v.x - inx * cut, y: v.y - iny * cut },
      p2: { x: v.x + outx * cut, y: v.y + outy * cut },
    };
  }

  return corners;
}

function segmentToString(sub, i, targetPoint) {
  const seg = sub.S[i];
  if (seg.type === "C") {
    const end = sub.V[(i + 1) % sub.V.length];
    return (
      `C${fmt(seg.c1.x)},${fmt(seg.c1.y)} ` +
      `${fmt(seg.c2.x)},${fmt(seg.c2.y)} ${fmt(end.x)},${fmt(end.y)}`
    );
  }
  return `L${fmt(targetPoint.x)},${fmt(targetPoint.y)}`;
}

function buildSubpath(sub, corners) {
  const n = sub.V.length;
  const closed = sub.closed && sub.S.length === n;

  if (closed) {
    let d = `M${fmt(corners[0].p2.x)},${fmt(corners[0].p2.y)}`;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      d += segmentToString(sub, i, corners[next].p1);
      if (corners[next].rounded) {
        d += cornerCurve(corners[next].p1, sub.V[next], corners[next].p2);
      }
    }
    return d + "Z";
  }

  let d = `M${fmt(sub.V[0].x)},${fmt(sub.V[0].y)}`;
  for (let i = 0; i < sub.S.length; i++) {
    const next = i + 1;
    const target = corners[next] && corners[next].rounded ? corners[next].p1 : sub.V[next];
    d += segmentToString(sub, i, target);
    if (corners[next] && corners[next].rounded) {
      d += cornerCurve(corners[next].p1, sub.V[next], corners[next].p2);
    }
  }
  return d;
}

/**
 * Rundet alle geraden Ecken eines Pfads.
 * @param {string} d         Original-d (absolut oder relativ)
 * @param {number} fraction  0..1 (0 = keine Rundung, 1 = maximal)
 * @returns {string} neues d, bei fraction<=0 oder Fehler unverändert
 */
export function roundPathData(d, fraction) {
  if (!d || fraction <= 0) return d;

  let commands;
  try {
    commands = parsePathData(d);
  } catch {
    return d;
  }

  const subs = toSubpaths(commands);
  if (!subs.length) return d;

  const out = subs
    .map((sub) => {
      if (sub.V.length < 2) return pathDataToString(rawSubpathCommands(sub));
      const corners = computeCorners(sub, fraction);
      return buildSubpath(sub, corners);
    })
    .join("");

  return out || d;
}

// Fallback: Subpfad ohne Rundung wieder als Befehle ausgeben (sehr kurze Pfade).
function rawSubpathCommands(sub) {
  const cmds = [{ type: "M", values: [sub.V[0].x, sub.V[0].y], relative: false }];
  for (let i = 0; i < sub.S.length; i++) {
    const seg = sub.S[i];
    const end = sub.V[(i + 1) % sub.V.length];
    if (seg.type === "C") {
      cmds.push({
        type: "C",
        values: [seg.c1.x, seg.c1.y, seg.c2.x, seg.c2.y, end.x, end.y],
        relative: false,
      });
    } else {
      cmds.push({ type: "L", values: [end.x, end.y], relative: false });
    }
  }
  if (sub.closed) cmds.push({ type: "Z", values: [], relative: false });
  return cmds;
}
