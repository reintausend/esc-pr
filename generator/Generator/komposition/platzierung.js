/*
  Zweck dieser Datei:
  Umsetzung der Kompositionsregel "Gleichmäßige Ausbreitung"
  (Kapitel 6.3):

  "Das Symbol soll sich möglichst gleichmäßig um die Hauptstruktur
   entwickeln. [...] Der Generator bevorzugt freie Bereiche des Symbols
   gegenüber bereits stark verdichteten Bereichen.
   Diese Regel ist probabilistisch und stellt keine feste Vorschrift dar."

  Umsetzung: Der Raum um das Zentrum der Hauptstruktur wird in
  8 Richtungssektoren unterteilt. Für jeden Sektor wird gezählt, wie
  viele bereits platzierte Fragmente in ihm liegen. Das Gewicht eines
  Sektors ist 1 / (1 + Anzahl). Diese Gewichte fließen als Vorgewicht
  in die Zufallsauswahl der Positionierungsrichtung ein (Kapitel 8.3)
  – dichte Bereiche werden unwahrscheinlicher, nie unmöglich.
*/

import { DIRECTIONS } from "../zufall/wahrscheinlichkeit.js";
import { bboxCenter } from "../konstruktion/geometrie.js";

// Ordnet einen Winkel (Radiant) einem der 8 Richtungssektoren zu.
// 0 rad zeigt nach Osten, positive Winkel im Uhrzeigersinn (SVG-y nach unten).
function angleToDirection(angle) {
  const sectors = ["O", "SO", "S", "SW", "W", "NW", "N", "NO"];
  const normalized = (angle + 2 * Math.PI) % (2 * Math.PI);
  const index = Math.round(normalized / (Math.PI / 4)) % 8;
  return sectors[index];
}

/*
  Liefert für die 8 Richtungen (in der Reihenfolge von DIRECTIONS)
  die Dichtegewichte um das Zentrum der Hauptstruktur.

  mainElement:    das platzierte Hauptstruktur-Element
  placedElements: alle bereits platzierten Sekundär-Fragmente
*/
export function directionDensityWeights(mainElement, placedElements) {
  const center = bboxCenter(mainElement.placedBBox);
  const counts = Object.fromEntries(DIRECTIONS.map((d) => [d, 0]));

  for (const el of placedElements) {
    const c = bboxCenter(el.placedBBox);
    const angle = Math.atan2(c.y - center.y, c.x - center.x);
    counts[angleToDirection(angle)] += 1;
  }

  return DIRECTIONS.map((d) => 1 / (1 + counts[d]));
}
