# stroke/ – Strichstärke (Verdickung)

Regler-gesteuerte **Verdickung** der Zeichen in Fill- und Outline-Modus.
0 % = Generator-Stand, höhere Werte = fetter.

| Datei | Aufgabe |
|-------|---------|
| `strokeConstants.js` | Neutralpunkt (0 %), Basis-/Max-Strichstärken |
| `strokeMapping.js` | Mappt Regler 0–100 % auf Render-Parameter |

## Verhalten

- **Fill-Modus:** Fragmente erhalten einen Stroke in Füllfarbe
  (`paint-order: stroke fill`), überlappende Striche verschmelzen optisch.
- **Outline-Modus:** `stroke-width` der verschmolzenen Kontur wird erhöht.
- Kein Verdünnen – nur Verdickung ab Generator-Stand.

Angebunden in `Editor/preview/PreviewToolHost.js` (Regler „Strichstärke").
