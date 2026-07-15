# preview/ – Preview-Integration

Bindet alle Editor-Effekte an die Preview-Seite (`preview.html` /
`preview.js`). Der Generator rendert zuerst; der Editor übernimmt danach.

| Datei | Aufgabe |
|-------|---------|
| `PreviewToolHost.js` | Effekt-Pipeline, Panel-Anbindung, alle Symbole gleichzeitig |
| `TweakPanel.js` | Illustrator-Panel – meldet Parameter per `onChange` |
| `fitViewBox.js` | Erweitert Symbol-viewBox bei Bedarf (nach allen Effekten) |
| `applySize.js` (size/) | Skaliert mm-Größe; 35 % = Generator-Stand |
| `normalizeShapes.js` | Wandelt Formen (rect, polygon …) im Grid zu Pfaden |
| `serializeGrid.js` | Gesamt-SVG aus bearbeitetem DOM für Save/Print |
| `layoutConstants.js` | Abstände für Serialisierung (getrennt vom Generator) |

## Ablauf

1. Generator rendert Symbole ins Grid (`preview.js` → `renderSymbols`).
2. `normalizeShapes` macht alle Formen zu `<path>`.
3. `PreviewToolHost` erfasst Original-Pfade, verbindet das Panel.
4. Jede Regleränderung:
   - Tweak → Abrunden → Fill/Outline → Stroke → ViewBox-Fit → **Größe**
5. `onEdit()` serialisiert die Gesamt-SVG neu (Save/Print).

## ViewBox vs. Größe

- **viewBox-Fit:** verhindert Abschneiden *innerhalb* eines Symbol-SVG
  (Tweak/Stroke). Speichert `fittedMmWidth/Height`.
- **Größe:** `transform: scale()` am `<svg>` — Wörter aus der Mitte,
  Satzzeichen vom linken/rechten Rand. Layout-Box (mm) = ViewBox-Fit-Baseline.

## Serialisierung / Druck

`serializeGrid.js` baut die Gesamt-SVG mit **fester Breite 72,2 mm**
(512 dots). Layout aus der Preview (`getBoundingClientRect`). Alles
außerhalb wird durch die viewBox abgeschnitten – kein Scale-to-fit.

## Weitere Effekte

Der **Randomize**-Button (`#tweak-randomize`) setzt alle Regler zufällig
und erzeugt ein neues Tweak-Muster (`random/randomize.js`,
`TweakEffect.regenerateRandoms`).
