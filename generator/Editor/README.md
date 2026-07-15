# Editor – Interaktive SVG-Werkzeuge

Dieser Ordner enthält Werkzeuge zur nachträglichen Bearbeitung von SVG-
Geometrie in der Preview. Er ist **bewusst getrennt** vom Generator
(`Generator/`), der regelbasiert Symbole erzeugt.

## Unterordner

| Ordner | Zweck | README |
|--------|--------|--------|
| `preview/` | Preview-Anbindung, Panel, Serialisierung, ViewBox-Fit | [preview/README.md](preview/README.md) |
| `tweak/` | Regler-Verzerrung (Illustrator-Tweak) | [tweak/README.md](tweak/README.md) |
| `round/` | Kanten abrunden | [round/README.md](round/README.md) |
| `stroke/` | Strichstärke (Verdickung) | [stroke/README.md](stroke/README.md) |
| `outline/` | Fill/Outline, Boolean-Union | [outline/README.md](outline/README.md) |
| `random/` | Randomize-Button | [random/README.md](random/README.md) |
| `size/` | Größen-Regler | [size/README.md](size/README.md) |
| `tools/` | Paper.js (Extern) | [tools/README.md](tools/README.md) |

## Effekt-Pipeline

Alle Regler sind unabhängig kombinierbar (Reihenfolge der Bedienung egal).
Bei jeder Änderung wird **aus dem Original** neu gerechnet:

```
Panel (Regler/Checkboxen)
        │  onChange
        ▼
   PreviewToolHost
        │
        ├─► TweakEffect        (Verzerrung)
        ├─► roundCorners       (Kanten abrunden)
        ├─► Fill / Outline     (Darstellung)
        ├─► strokeMapping      (Verdickung)
        ├─► fitViewBox         (ViewBox nur bei Bedarf erweitern)
        └─► applySymbolSize    (Größe; 35 % = Generator-Stand)
        │
   Randomize-Button → regenerateRandoms + randomBrushOptions → applyOptions
        │
        ▼
   serializeGrid (Save / Print)
```

Voraussetzung: Alle Formen werden vor dem Effekt zu Pfaden umgewandelt
(`preview/normalizeShapes.js`).

## Dateien (Übersicht)

| Pfad | Zweck |
|------|--------|
| `preview/PreviewToolHost.js` | Zentrale Pipeline, alle Symbole gleichzeitig |
| `preview/TweakPanel.js` | Illustrator-Panel (Regler, Checkboxen) |
| `preview/fitViewBox.js` | Dynamische ViewBox-Erweiterung nach Effekten |
| `preview/normalizeShapes.js` | Formen → Pfade im gerenderten Grid |
| `preview/serializeGrid.js` | Gesamt-SVG aus bearbeitetem DOM |
| `preview/layoutConstants.js` | Abstände für Serialisierung |
| `tweak/Brush.js` | Parameter-Datenmodell |
| `tweak/TweakEffect.js` | Regler-gesteuerte Verzerrung |
| `tweak/pathData.js` | SVG-Pfad-d parsen/serialisieren |
| `round/roundCorners.js` | Fillet an L–L-Ecken |
| `stroke/strokeMapping.js` | Regler → Strichstärke |
| `outline/mergeSymbol.js` | Union pro Zeichen (Paper.js) |
| `random/randomize.js` | Zufällige Reglerwerte für Randomize |
| `size/applySize.js` | Größen-Skalierung (mm) |

**Randomize:** Button im Panel → neues Verzerrungsmuster + zufällige Regler.
