# random/ – Randomize

Zufällige Bearbeitung aller Preview-Regler per Button.

| Datei | Aufgabe |
|-------|---------|
| `randomize.js` | `randomBrushOptions()` – zufällige Werte für alle Regler |

## Was randomisiert wird

- Tweak: Horizontal, Vertikal, Modus (relativ/absolut), Punktarten
- Kanten: Abrunden
- Darstellung: Fill / Outline, Strichstärke, **Größe**

## Ablauf (Randomize-Button)

1. `TweakEffect.regenerateRandoms()` – **neue Zufallsrichtungen** je Punkt
   (neues Verzerrungsmuster; Originalform bleibt erhalten).
2. `randomBrushOptions()` – zufällige Reglerwerte 0–100 %.
3. `TweakPanel.applyOptions()` – UI aktualisieren → `render()`.

Angebunden in `Editor/preview/PreviewToolHost.js` und `TweakPanel.js`.
