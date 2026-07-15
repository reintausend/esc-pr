/*
  Zweck dieser Datei:
  Konstruktion eines einzelnen Symbols (Kapitel 4 + 5).

  Verbindliche Reihenfolge (Kapitel 5.3):
  1. Hauptstruktur platzieren (erster Buchstabe, *_full.svg)
  2. Alle Fragmente laden (gemeinsame Fragmentliste)
  3. Fragmente einzeln an vorhandene Strukturen anbinden
  4. Wiederholen, bis alle Fragmente verwendet wurden
  5. Akzente ergänzen
  (6. Negativräume prüfen und 7. Symbol ausgeben übernehmen die
   Ordner kontrolle/ und ausgabe/.)

  Anbindung (Kapitel 4 – Definition einer Anbindung):
  Das Platzierungsverfahren legt einen Konturpunkt des neuen Fragments
  exakt auf einen Konturpunkt der bestehenden Struktur. Damit ist der
  geometrische Kontakt (Berührung/Überlappung) konstruktiv garantiert
  und wird vor der Platzierung zusätzlich geprüft (Kapitel 8.5 –
  ungültige Platzierungen werden verworfen).

  Sonderregeln (Kapitel 2 – Satzzeichen):
  - "." und "," erzeugen ein eigenständiges, nicht zerlegtes Symbol.
  - "!" und "?" erzeugen ein eigenständiges Symbol aus ihren
    Fragmenten; die Position der Fragmente ist zufällig.
*/

import { CONFIG } from "../config.js";
import { getCharacterEntry } from "../material/zeichensatz.js";
import { loadSvg } from "../material/lader.js";
import {
  samplePaths,
  makePlacementMatrix,
  transformPoints,
  bboxOfPoints,
  bboxCenter,
  mergeBBoxes,
  minDistance,
} from "./geometrie.js";
import {
  randomRotation,
  randomMirror,
  randomAttachType,
  randomDirection,
  randomBetween,
  randomPick,
  DIRECTION_VECTORS,
} from "../zufall/wahrscheinlichkeit.js";
import { directionDensityWeights } from "../komposition/platzierung.js";

/* ---- Element-Erzeugung ---- */

// Lädt eine SVG-Datei und bereitet sie als (noch unplatziertes)
// Element vor. Die Pfadgeometrie bleibt unverändert.
async function createElement(url, role, char) {
  const svg = await loadSvg(url);
  const { points, bbox } = samplePaths(svg.paths);
  return {
    role,                    // "main" | "fragment" | "accent"
    char,
    sourceUrl: url,
    paths: svg.paths,
    localPoints: points,
    localBBox: bbox,
    localCenter: bboxCenter(bbox),
    // Platzierungsdaten (werden bei der Platzierung gesetzt):
    rotation: 0,
    mirrorX: false,
    mirrorY: false,
    matrix: null,
    placedPoints: null,
    placedBBox: null,
  };
}

// Wendet Rotation/Spiegelung/Verschiebung an und berechnet die
// platzierten Konturpunkte. Einzige erlaubte Transformationen
// (Kapitel 4.4) – die Pfadgeometrie selbst bleibt unverändert.
function placeElement(element, rotation, mirror, tx, ty) {
  element.rotation = rotation;
  element.mirrorX = mirror.mirrorX;
  element.mirrorY = mirror.mirrorY;
  element.matrix = makePlacementMatrix(
    element.localCenter, rotation, mirror.mirrorX, mirror.mirrorY, tx, ty
  );
  element.placedPoints = transformPoints(element.matrix, element.localPoints);
  element.placedBBox = bboxOfPoints(element.placedPoints);
}

/* ---- Hilfsfunktionen für die Anbindung ---- */

// Wählt einen zufälligen Konturpunkt, der in der gewünschten Richtung
// liegt (unter den 30 % am weitesten in Richtung dirVec liegenden
// Punkten wird zufällig gewählt).
function pickContactPoint(points, center, dirVec) {
  const scored = points
    .map((p) => ({
      p,
      score: (p.x - center.x) * dirVec.x + (p.y - center.y) * dirVec.y,
    }))
    .sort((a, b) => b.score - a.score);
  const topCount = Math.max(1, Math.floor(scored.length * 0.3));
  return randomPick(scored.slice(0, topCount)).p;
}

// Mischen der Fragmentliste – die Reihenfolge der übrigen Fragmente
// ist frei wählbar (Kapitel 8.4).
function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ---- Wort-Symbol (Normalfall) ---- */

/*
  Konstruiert ein Symbol aus einem Wort/Zahlenblock.
  chars: Zeichenliste, z. B. ["H","A","U","S"]
  Rückgabe: { type: "word", elements, stats }
*/
export async function buildWordSymbol(chars) {
  /* Schritt 1 – Hauptstruktur (Kapitel 4.1, 5.1):
     Erster Buchstabe, ausschließlich *_full.svg, wird nie
     fragmentiert, nicht verändert, nicht ersetzt.
     Die Hauptstruktur darf weder rotiert noch gespiegelt werden
     (Kapitel 1, Kapitel 4.1). */
  const mainEntry = getCharacterEntry(chars[0]);
  const main = await createElement(mainEntry.fullUrl, "main", chars[0]);
  // Hauptstruktur im Ursprung des Arbeitsbereichs platzieren
  // (Kapitel 6.1 – Hauptstruktur zuerst), ohne Rotation/Spiegelung.
  placeElement(main, 0, { mirrorX: false, mirrorY: false },
    -main.localCenter.x, -main.localCenter.y);

  /* Schritt 2 – Alle Fragmente laden (Kapitel 4.2):
     Für jeden weiteren Buchstaben sämtliche Fragmentdateien.
     Jede Zeichen-Instanz liefert eigene Fragmente – bei "OTTO"
     werden die T-Fragmente also zweimal geladen und zweimal
     verwendet (Kapitel 5.4 – keine Mehrfachverwendung desselben
     Fragments, aber eindeutiger Ursprung jedes Fragments). */
  const fragments = [];
  for (let i = 1; i < chars.length; i++) {
    const entry = getCharacterEntry(chars[i]);
    for (const url of entry.fragmentUrls) {
      fragments.push(await createElement(url, "fragment", chars[i]));
    }
  }

  /* Akzent-Auswahl (Kapitel 5 – Definition von Akzenten):
     Punkte und kleine Fragmente kommen als Akzente infrage.
     Welche tatsächlich Akzente werden, entscheidet der Generator. */
  const mainArea = main.localBBox.width * main.localBBox.height;
  for (const fragment of fragments) {
    const area = fragment.localBBox.width * fragment.localBBox.height;
    if (
      area <= mainArea * CONFIG.ACCENT_MAX_AREA_RATIO &&
      Math.random() < CONFIG.ACCENT_PROBABILITY
    ) {
      fragment.role = "accent";
    }
  }
  const structureFragments = shuffle(fragments.filter((f) => f.role === "fragment"));
  const accents = fragments.filter((f) => f.role === "accent");

  /* Schritt 3 + 4 – Fragmente einzeln anbinden (Kapitel 4.3, 4.5):
     Genau ein Fragment pro Schritt, Anbindung an die Hauptstruktur
     oder ein bereits platziertes Fragment. */
  const placed = [];
  for (const fragment of structureFragments) {
    let success = false;

    for (let attempt = 0; attempt < 12 && !success; attempt++) {
      // Anbindungsart (Kapitel 8.3 – Anbindungsarten gewichtet).
      const attachType = randomAttachType(placed.length > 0);
      const target = attachType === "main" ? main : randomPick(placed);

      // Positionierungsrichtung: freie Bereiche werden bevorzugt
      // (Kapitel 6.3, probabilistisch).
      const weights = directionDensityWeights(main, placed);
      const direction = randomDirection(weights);
      const dirVec = DIRECTION_VECTORS[direction];

      // Transformation des Fragments (Kapitel 4.4, 8.1, 8.2).
      const rotation = randomRotation();
      const mirror = randomMirror();
      placeElement(fragment, rotation, mirror, 0, 0);

      // Kontaktpunkte: auf der Zielstruktur in Ausbreitungsrichtung,
      // am Fragment auf der entgegengesetzten Seite – so wächst das
      // Symbol nach außen und der Kontakt ist garantiert.
      const targetCenter = bboxCenter(target.placedBBox);
      const targetPoint = pickContactPoint(target.placedPoints, targetCenter, dirVec);
      const fragCenter = bboxCenter(fragment.placedBBox);
      const inverseDir = { x: -dirVec.x, y: -dirVec.y };
      const fragPoint = pickContactPoint(fragment.placedPoints, fragCenter, inverseDir);

      // Verschiebung, sodass die Kontaktpunkte aufeinanderliegen.
      const tx = targetPoint.x - fragPoint.x;
      const ty = targetPoint.y - fragPoint.y;
      placeElement(fragment, rotation, mirror, tx, ty);

      // Regelprüfung vor der Platzierung (Kapitel 8.5):
      // Verbindungsregel – Fragment muss angebunden sein
      // (berühren oder überlappen, Kapitel 4 – Definition).
      const contact = minDistance(fragment.placedPoints, target.placedPoints);
      if (contact <= CONFIG.CONTACT_TOLERANCE) {
        success = true;
      }
      // Ungültige Platzierungen werden verworfen, der Generator
      // wählt eine neue Position (Kapitel 8.5). Überlappung (7.8)
      // prüft kontrolle/ nach der Konstruktion.
    }

    if (!success) {
      // Konstruktiver Rückfall: direkte Anbindung an die Hauptstruktur.
      // Materialvollständigkeit hat Vorrang – kein Fragment darf
      // ungenutzt bleiben (Kapitel 4.3, 5.4).
      for (let fallback = 0; fallback < 8 && !success; fallback++) {
        const rotation = randomRotation();
        const mirror = randomMirror();
        placeElement(fragment, rotation, mirror, 0, 0);
        const targetPoint = randomPick(main.placedPoints);
        const fragPoint = randomPick(fragment.placedPoints);
        placeElement(fragment, rotation, mirror,
          targetPoint.x - fragPoint.x, targetPoint.y - fragPoint.y);
        const contact = minDistance(fragment.placedPoints, main.placedPoints);
        if (contact <= CONFIG.CONTACT_TOLERANCE) {
          success = true;
        }
      }
      if (!success) {
        const rotation = randomRotation();
        const mirror = randomMirror();
        placeElement(fragment, rotation, mirror, 0, 0);
        const targetPoint = randomPick(main.placedPoints);
        const fragPoint = randomPick(fragment.placedPoints);
        placeElement(fragment, rotation, mirror,
          targetPoint.x - fragPoint.x, targetPoint.y - fragPoint.y);
      }
    }

    placed.push(fragment);
  }

  /* Schritt 5 – Akzente ergänzen (Kapitel 5.3):
     Akzente sind die einzigen freistehenden Elemente. Sie werden
     außerhalb der Haupt- und Sekundärstruktur platziert und dürfen
     sie NICHT berühren (sonst wären sie angebunden). */
  const structureElements = [main, ...placed];
  for (const accent of accents) {
    const structureBBox = mergeBBoxes(structureElements.map((e) => e.placedBBox));
    const center = bboxCenter(structureBBox);
    const radius = Math.hypot(structureBBox.width, structureBBox.height) / 2;

    let placedOk = false;
    for (let attempt = 0; attempt < 20 && !placedOk; attempt++) {
      const direction = randomDirection();
      const dirVec = DIRECTION_VECTORS[direction];
      const rotation = randomRotation();
      const mirror = randomMirror();
      const gap = randomBetween(CONFIG.ACCENT_MIN_GAP, CONFIG.ACCENT_MAX_GAP);

      placeElement(accent, rotation, mirror, 0, 0);
      const accentRadius =
        Math.hypot(accent.placedBBox.width, accent.placedBBox.height) / 2;
      const dist = radius + gap + accentRadius;
      const targetCenter = {
        x: center.x + dirVec.x * dist,
        y: center.y + dirVec.y * dist,
      };
      const accentCenter = bboxCenter(accent.placedBBox);
      placeElement(accent, rotation, mirror,
        targetCenter.x - accentCenter.x, targetCenter.y - accentCenter.y);

      // Akzent darf die Struktur nicht berühren (freistehend).
      let minDist = Infinity;
      for (const el of structureElements) {
        const d = minDistance(accent.placedPoints, el.placedPoints);
        if (d < minDist) minDist = d;
      }
      if (minDist > CONFIG.CONTACT_TOLERANCE) placedOk = true;
    }
    structureElements.push(accent);
  }

  return {
    type: "word",
    chars,
    elements: [main, ...placed, ...accents],
    stats: {
      charCount: chars.length,
      fragmentCount: fragments.length,
      accentCount: accents.length,
    },
  };
}

/* ---- Satzzeichen-Symbole (Sonderregeln, Kapitel 2) ---- */

/*
  Punkt (.) oder Komma (,): eigenständiges Symbol, wird nicht zerlegt,
  keine Transformation. Die rechtsbündige Anordnung übernimmt die
  Ausgabe (Kapitel 2 – Satzzeichen).
*/
export async function buildPlainPunctuationSymbol(char) {
  const entry = getCharacterEntry(char);
  const element = await createElement(entry.fullUrl, "main", char);
  placeElement(element, 0, { mirrorX: false, mirrorY: false },
    -element.localCenter.x, -element.localCenter.y);
  return {
    type: "punctuation-plain",
    chars: [char],
    elements: [element],
    stats: { charCount: 1, fragmentCount: 0, accentCount: 0 },
  };
}

/*
  Ausrufezeichen (!) oder Fragezeichen (?): eigenständiges Symbol aus
  seinen Fragmenten. "Die Position der beiden Fragmente wird zufällig
  entschieden" – dieses Symbol hat regelkonform keine Hauptstruktur.
*/
export async function buildFragmentedPunctuationSymbol(char) {
  const entry = getCharacterEntry(char);
  const elements = [];

  // Streubereich aus der Originalgröße des Zeichens ableiten.
  const firstSvg = await loadSvg(entry.fragmentUrls[0]);
  const range = Math.max(firstSvg.viewBox.width, firstSvg.viewBox.height) * 0.6;

  for (const url of entry.fragmentUrls) {
    const element = await createElement(url, "fragment", char);
    const tx = randomBetween(-range, range) - element.localCenter.x;
    const ty = randomBetween(-range, range) - element.localCenter.y;
    placeElement(element, 0, { mirrorX: false, mirrorY: false }, tx, ty);
    elements.push(element);
  }

  return {
    type: "punctuation-fragmented",
    chars: [char],
    elements,
    stats: {
      charCount: 1,
      fragmentCount: elements.length,
      accentCount: 0,
    },
  };
}
