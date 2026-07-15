# size/ – Größe

Regler-gesteuerte Skalierung der Zeichen in der Preview.

| Datei | Aufgabe |
|-------|---------|
| `sizeConstants.js` | Neutralpunkt (35 % = Generator-Stand) |
| `applySize.js` | `transform: scale()` mit ankerabhängigem `transform-origin` |

## Skalierungs-Anker

| Symboltyp | Zeile | transform-origin |
|-----------|--------|------------------|
| Wörter | `symbol-row--center` | `center center` |
| `! ?` | `symbol-row--left` | `left center` |
| `. ,` | `symbol-row--right` | `right center` |

Die **mm-Größe** des `<svg>` bleibt auf der ViewBox-Fit-Baseline (Layout-Box).
Nur `transform: scale()` vergrößert/verkleinert sichtbar.

## Abstände

Der Generator-Abstand (2 cm zwischen Konturen bei Auslieferung) **darf**
beim Vergrößern brechen — bewusst keine Neuberechnung im Editor.

Angebunden in `Editor/preview/PreviewToolHost.js` (Regler „Skalierung").
