/*
  Zweck dieser Datei:
  Gewichtete Zufallsentscheidungen mit persistenter Nutzungshistorie
  (Kapitel 8 – Generatorregeln).

  Prinzip (Kapitel 8.3 – Wahrscheinlichkeiten):
  - Jede getroffene Entscheidung wird gezählt (z. B. "Rotationswinkel
    im Bereich 30–45 Grad wurde 4x verwendet").
  - Bei der nächsten Auswahl erhält jede Option das Gewicht
    1 / (1 + Anzahl bisheriger Verwendungen).
  - Häufig Verwendetes wird dadurch unwahrscheinlicher, bleibt aber
    immer möglich – es existieren keine Ausschlussregeln.

  Die Historie wird im localStorage gespeichert, damit die Gewichtung
  über einzelne Symbole und Sitzungen hinaus wirkt ("bei zukünftigen
  Symbolen", Kapitel 8.1).
*/

import { CONFIG } from "../config.js";

/* ---- Nutzungshistorie laden/speichern ---- */

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.HISTORY_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(CONFIG.HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage nicht verfügbar (z. B. file://) – Gewichtung wirkt
    // dann nur innerhalb der aktuellen Sitzung über den Cache unten.
  }
}

let history = loadHistory();

// Zählt eine getroffene Entscheidung in der Historie.
// category: z. B. "rotation", "mirror", "direction", "attachType"
// key:      die konkrete Entscheidung, z. B. "45", "hv", "NO"
export function recordDecision(category, key) {
  if (!history[category]) history[category] = {};
  history[category][key] = (history[category][key] || 0) + 1;
  saveHistory(history);
}

function usageCount(category, key) {
  return (history[category] && history[category][key]) || 0;
}

/* ---- Gewichtete Auswahl ---- */

// Wählt eine Option aus einer Liste. Jede Option erhält das Gewicht
// 1 / (1 + bisherige Verwendungen) – ggf. multipliziert mit einem
// zusätzlichen Vorgewicht (etwa der Dichtegewichtung aus Kapitel 6).
export function weightedChoice(category, options, extraWeights = null) {
  const weights = options.map((option, i) => {
    const base = 1 / (1 + usageCount(category, String(option)));
    const extra = extraWeights ? extraWeights[i] : 1;
    return base * extra;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      recordDecision(category, String(options[i]));
      return options[i];
    }
  }
  const last = options[options.length - 1];
  recordDecision(category, String(last));
  return last;
}

/* ---- Konkrete Entscheidungen des Regelwerks ---- */

// Kapitel 8.1 – Rotation: beliebiger Winkel, kein festes Raster.
// Für die Historie werden die Winkel in Klassen (Bins) gruppiert;
// innerhalb des gewählten Bins ist der exakte Winkel frei zufällig.
export function randomRotation() {
  const binSize = CONFIG.ROTATION_BIN_SIZE;
  const binCount = Math.round(360 / binSize);
  const bins = Array.from({ length: binCount }, (_, i) => i * binSize);
  const bin = weightedChoice("rotation", bins);
  return bin + Math.random() * binSize;
}

// Kapitel 8.2 – Spiegelung: keine, horizontal, vertikal oder beides.
export function randomMirror() {
  const option = weightedChoice("mirror", ["none", "h", "v", "hv"]);
  return {
    mirrorX: option === "h" || option === "hv",
    mirrorY: option === "v" || option === "hv",
  };
}

// Kapitel 8.3 – Anbindungsart: an die Hauptstruktur oder an ein
// bereits platziertes Fragment (Kapitel 4.5).
export function randomAttachType(hasPlacedFragments) {
  if (!hasPlacedFragments) return "main";
  return weightedChoice("attachType", ["main", "fragment"]);
}

// Kapitel 8.3 – Positionierungsrichtung (8 Himmelsrichtungen um die
// Struktur). extraWeights kommt aus der Komposition (Kapitel 6:
// freie Bereiche werden bevorzugt).
export const DIRECTIONS = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];

export function randomDirection(extraWeights = null) {
  return weightedChoice("direction", DIRECTIONS, extraWeights);
}

// Richtungs-Vektoren (Einheitsvektoren) zu den 8 Himmelsrichtungen.
export const DIRECTION_VECTORS = {
  N: { x: 0, y: -1 },
  NO: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  O: { x: 1, y: 0 },
  SO: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  S: { x: 0, y: 1 },
  SW: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  W: { x: -1, y: 0 },
  NW: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
};

// Einfacher ungewichteter Zufall für Entscheidungen, die das
// Regelwerk als rein zufällig definiert (z. B. Position der
// Fragmente von ! und ?).
export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}
