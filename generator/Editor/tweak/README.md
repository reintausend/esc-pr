# tweak/ – Tweak-Effekt (regler-gesteuert)

Vereinfachte Version des Illustrator-„Tweak"-Effekts: Ankerpunkte und
Bézier-Griffe **aller Pfade aller Symbole** werden über die Regler des
Panels verzerrt (nicht mit der Maus).

## Dateien

| Datei | Aufgabe |
|-------|---------|
| `Brush.js` | Parameter: Stärke H/V (%), Modus (relativ/absolut), Punktarten |
| `TweakEffect.js` | Verzerrung aus Original; `regenerateRandoms()` für Randomize |
| `pathData.js` | SVG-Pfad-d parsen/serialisieren (M, L, H, V, C, Z) |

## Prinzip

- `capture(paths)` speichert je Pfad: Originalform, Zufallsrichtung pro
  Punkt, Original-Bounding-Box.
- `apply(entries, brush)` baut jeden Pfad **aus dem Original** neu und
  verschiebt jeden aktiven Punkt um `zufallsrichtung × reglerstärke`.
  Dadurch ist der Effekt stufenlos und nicht kumulativ.

Preview-Anbindung: `Editor/preview/PreviewToolHost.js`
