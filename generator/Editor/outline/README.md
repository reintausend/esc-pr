# outline/ – Verschmelzen zu einer Kontur

Für den **Outline-Modus** der Preview: alle Fragmentpfade eines Zeichens
werden zu **einer** Silhouette vereinigt (Boolean-Union), damit die inneren
Konstruktionsnähte verschwinden.

| Datei | Aufgabe |
|-------|---------|
| `mergeSymbol.js` | Vereinigt alle `<path>` eines Symbol-`<svg>` mit Paper.js zu einem d-String |

- Nutzt **Paper.js** (`Editor/tools/paperjs-v0/dist/paper-core.min.js`),
  global geladen über ein `<script>`-Tag in `preview.html`.
- Backt die `transform`-Matrizen der Fragmente ein (viewBox-Koordinaten).
- Akzente werden mit einbezogen (Option A) – sie bleiben freistehende
  Teilkonturen im selben zusammengesetzten Pfad.
- Rein für die Darstellung; die Fragmentgeometrie bleibt unangetastet.

Angebunden in `Editor/preview/PreviewToolHost.js` (Umschalter „Outline").
