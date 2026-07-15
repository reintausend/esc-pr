/*
  Zweck dieser Datei:
  Kompositionskontrolle (Kapitel 7). Prüft das vollständig
  konstruierte Symbol, ohne es zu verändern. Wird mindestens eine
  Prüfung nicht bestanden, verwirft der Generator das Symbol und
  konstruiert es vollständig neu (Rekonstruktion, Kapitel 7.7 –
  umgesetzt in generator.js).

  Enthaltene Prüfungen:
  1. Hauptstruktur sichtbar          (7.1)
  2. Fragmentverteilung / Quadranten (7.2)
  3. Fragmentdichte                  (7.3)
  4. Negativräume                    (7.4, NEGATIVE_SPACE_FACTOR = 3.0)
  5. Materialvollständigkeit         (7.5)
  6. Regelkonformität                (7.6)
  7. Überlappung (orientierungsabh.)  (7.8)
*/

import { CONFIG } from "../config.js";
import { mergeBBoxes, minDistance, bboxCenter } from "../konstruktion/geometrie.js";
import { checkSymbolOverlap } from "../konstruktion/ueberlappung.js";

/* ---- Hilfsmittel ---- */

// Baut aus einem platzierten Element einen Path2D mit angewandter
// Platzierungstransformation (nur für Treffer-Tests, verändert nichts).
function elementPath2D(element) {
  const m = element.matrix;
  const domMatrix = new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]);
  const combined = new Path2D();
  for (const d of element.paths) {
    combined.addPath(new Path2D(d), domMatrix);
  }
  return combined;
}

let hitTestCtx = null;
function getHitTestContext() {
  if (!hitTestCtx) {
    hitTestCtx = document.createElement("canvas").getContext("2d");
  }
  return hitTestCtx;
}

/* ---- Prüfung 1: Hauptstruktur (Kapitel 7.1) ----
   "Sie darf nicht vollständig von anderen Fragmenten verdeckt werden.
   Mindestens ein zusammenhängender Bereich der Hauptstruktur muss von
   außen sichtbar bleiben."
   Umsetzung: Konturpunkte der Hauptstruktur werden gegen die Flächen
   aller Sekundärfragmente getestet. Bewertungsparameter:
   MAIN_VISIBLE_MIN_RATIO und MAIN_VISIBLE_MIN_RUN (config.js). */
function checkMainStructure(symbol) {
  const main = symbol.elements.find((e) => e.role === "main");
  const fragments = symbol.elements.filter((e) => e.role === "fragment");
  if (!main || fragments.length === 0) return { passed: true };

  const ctx = getHitTestContext();
  const fragmentPaths = fragments.map(elementPath2D);

  const visible = main.placedPoints.map((p) => {
    for (const path of fragmentPaths) {
      if (ctx.isPointInPath(path, p.x, p.y, "nonzero")) return false;
    }
    return true;
  });

  const visibleCount = visible.filter(Boolean).length;
  const ratio = visibleCount / visible.length;

  // Längste zusammenhängende sichtbare Punktfolge.
  let run = 0;
  let bestRun = 0;
  for (const v of visible) {
    run = v ? run + 1 : 0;
    if (run > bestRun) bestRun = run;
  }

  const passed =
    ratio >= CONFIG.MAIN_VISIBLE_MIN_RATIO &&
    bestRun >= CONFIG.MAIN_VISIBLE_MIN_RUN;
  return { passed, ratio, bestRun };
}

/* ---- Prüfung 2: Fragmentverteilung (Kapitel 7.2) ----
   Bounding Box des gesamten Symbols in vier gleiche Quadranten
   unterteilen; jeder Quadrant muss mindestens einen Teil eines
   Fragments enthalten. Implementierungsentscheidung: Die
   Hauptstruktur zählt als Teil des Symbols mit, damit die Prüfung
   auch für Symbole mit wenigen Fragmenten erfüllbar bleibt. */
function checkDistribution(symbol) {
  const bbox = mergeBBoxes(symbol.elements.map((e) => e.placedBBox));
  const midX = bbox.x + bbox.width / 2;
  const midY = bbox.y + bbox.height / 2;

  const occupied = [false, false, false, false];
  for (const element of symbol.elements) {
    for (const p of element.placedPoints) {
      const qx = p.x <= midX ? 0 : 1;
      const qy = p.y <= midY ? 0 : 1;
      occupied[qy * 2 + qx] = true;
    }
  }
  return { passed: occupied.every(Boolean), occupied };
}

/* ---- Prüfung 3: Fragmentdichte (Kapitel 7.3) ----
   Für jedes Fragment wird der Abstand zum nächsten Nachbarn bestimmt.
   Starke Cluster (sehr unterschiedliche Nachbarabstände) führen zum
   Nichtbestehen. Bewertungsparameter: DENSITY_MAX_VARIATION. */
function checkDensity(symbol) {
  const fragments = symbol.elements.filter((e) => e.role === "fragment");
  if (fragments.length < 3) return { passed: true };

  const centers = fragments.map((f) => bboxCenter(f.placedBBox));
  const nearest = centers.map((c, i) => {
    let min = Infinity;
    centers.forEach((other, j) => {
      if (i === j) return;
      const d = Math.hypot(c.x - other.x, c.y - other.y);
      if (d < min) min = d;
    });
    return min;
  });

  const mean = nearest.reduce((a, b) => a + b, 0) / nearest.length;
  if (mean === 0) return { passed: false, variation: Infinity };
  const variance =
    nearest.reduce((sum, d) => sum + (d - mean) ** 2, 0) / nearest.length;
  const variation = Math.sqrt(variance) / mean;

  return { passed: variation <= CONFIG.DENSITY_MAX_VARIATION, variation };
}

/* ---- Prüfung 4: Negativräume (Kapitel 7.4 + Bewertungsparameter) ----
   Das Symbol wird auf ein Raster gezeichnet. Vom Rand aus wird der
   Außenraum markiert (Flood-Fill). Übrig bleibende leere Bereiche sind
   die geschlossenen Negativräume innerhalb der äußeren
   Begrenzungskontur. Der größte darf maximal
   NEGATIVE_SPACE_FACTOR (= 3.0) mal die durchschnittliche
   Negativraumfläche besitzen. */
function checkNegativeSpaces(symbol) {
  const bbox = mergeBBoxes(symbol.elements.map((e) => e.placedBBox));
  if (bbox.width <= 0 || bbox.height <= 0) return { passed: true };

  const RASTER = 160;
  const PAD = 2;
  const scale = Math.min(
    (RASTER - 2 * PAD) / bbox.width,
    (RASTER - 2 * PAD) / bbox.height
  );
  const w = Math.max(8, Math.ceil(bbox.width * scale) + 2 * PAD);
  const h = Math.max(8, Math.ceil(bbox.height * scale) + 2 * PAD);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.setTransform(scale, 0, 0, scale, PAD - bbox.x * scale, PAD - bbox.y * scale);
  ctx.fillStyle = "#000";
  for (const element of symbol.elements) {
    ctx.fill(elementPath2D(element), "nonzero");
  }

  const data = ctx.getImageData(0, 0, w, h).data;
  // 0 = leer, 1 = gefüllt, 2 = Außenraum
  const grid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] > 32) grid[i] = 1;
  }

  // Flood-Fill vom Rand: markiert den Außenraum.
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w, y * w + (w - 1)); }
  while (stack.length) {
    const idx = stack.pop();
    if (grid[idx] !== 0) continue;
    grid[idx] = 2;
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x > 0) stack.push(idx - 1);
    if (x < w - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - w);
    if (y < h - 1) stack.push(idx + w);
  }

  // Verbleibende leere Bereiche = geschlossene Negativräume.
  const areas = [];
  for (let start = 0; start < w * h; start++) {
    if (grid[start] !== 0) continue;
    let area = 0;
    const fill = [start];
    while (fill.length) {
      const idx = fill.pop();
      if (grid[idx] !== 0) continue;
      grid[idx] = 3;
      area++;
      const x = idx % w;
      const y = (idx / w) | 0;
      if (x > 0) fill.push(idx - 1);
      if (x < w - 1) fill.push(idx + 1);
      if (y > 0) fill.push(idx - w);
      if (y < h - 1) fill.push(idx + w);
    }
    if (area >= 4) areas.push(area); // Mini-Flächen sind Rasterrauschen
  }

  if (areas.length <= 1) return { passed: true, count: areas.length };

  const largest = Math.max(...areas);
  const average = areas.reduce((a, b) => a + b, 0) / areas.length;
  const passed = largest <= CONFIG.NEGATIVE_SPACE_FACTOR * average;
  return { passed, count: areas.length, largest, average };
}

/* ---- Prüfung 5: Materialvollständigkeit (Kapitel 7.5) ----
   Alle Fragmente des Eingabeworts müssen im Symbol vorhanden sein,
   jedes genau einmal, keines entfernt oder ignoriert. */
function checkMaterialCompleteness(symbol) {
  const used = symbol.elements.filter(
    (e) => e.role === "fragment" || e.role === "accent"
  );
  const allPlaced = symbol.elements.every((e) => e.matrix !== null);
  const passed = used.length === symbol.stats.fragmentCount && allPlaced;
  return { passed, used: used.length, expected: symbol.stats.fragmentCount };
}

/* ---- Prüfung 6: Regelkonformität (Kapitel 7.6) ----
   Verbindungsregeln: Jedes Nicht-Akzent-Fragment muss angebunden sein
   (Kontakt zur übrigen Struktur, Kapitel 4 – Definition einer
   Anbindung). Akzente müssen freistehend sein (Kapitel 5 –
   Definition von Akzenten). */
function checkRuleConformity(symbol) {
  const structure = symbol.elements.filter((e) => e.role !== "accent");
  const accents = symbol.elements.filter((e) => e.role === "accent");

  for (const element of structure) {
    if (element.role === "main") continue;
    const others = structure.filter((e) => e !== element);
    let min = Infinity;
    for (const other of others) {
      const d = minDistance(element.placedPoints, other.placedPoints);
      if (d < min) min = d;
    }
    if (min > CONFIG.CONTACT_TOLERANCE) {
      return { passed: false, reason: "Fragment ohne Anbindung" };
    }
  }

  for (const accent of accents) {
    let min = Infinity;
    for (const other of structure) {
      const d = minDistance(accent.placedPoints, other.placedPoints);
      if (d < min) min = d;
    }
    if (min <= CONFIG.CONTACT_TOLERANCE) {
      return { passed: false, reason: "Akzent nicht freistehend" };
    }
  }

  return { passed: true };
}

/* ---- Prüfung 7: Überlappung (Kapitel 7.8) ----
   Verhindert flächige parallele Überlagerungen zwischen
   Hauptstruktur und Sekundärfragmenten. Kreuzungen und punktuelle
   Anbindungen bleiben zulässig (orientierungsabhängige Grenze). */
function checkOverlap(symbol) {
  const structure = symbol.elements.filter((e) => e.role !== "accent");
  if (structure.length < 2) return { passed: true };

  const result = checkSymbolOverlap(structure);
  return {
    passed: result.passed,
    ratio: result.ratio,
    allowedLimit: result.allowedLimit,
    angleDeg: result.angleDeg,
  };
}

/* ---- Gesamtauswertung ----
   Satzzeichen-Symbole unterliegen laut Sonderregel eigenen
   Anordnungsregeln und keiner Kompositionskontrolle
   (Sonderregel-Vorrang, Globale Definitionen). */
export function runChecks(symbol) {
  if (symbol.type !== "word") {
    return { passed: true, failures: [], results: {} };
  }

  const results = {
    hauptstruktur: checkMainStructure(symbol),
    verteilung: checkDistribution(symbol),
    dichte: checkDensity(symbol),
    negativraeume: checkNegativeSpaces(symbol),
    material: checkMaterialCompleteness(symbol),
    regeln: checkRuleConformity(symbol),
    ueberlappung: checkOverlap(symbol),
  };

  const failures = Object.entries(results)
    .filter(([, r]) => !r.passed)
    .map(([name]) => name);

  return { passed: failures.length === 0, failures, results };
}
