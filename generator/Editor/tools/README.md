# tools/ – Externe Bibliotheken

Drittanbieter-Werkzeuge für den Editor (nicht selbst geschrieben).

| Inhalt | Zweck |
|--------|--------|
| `paperjs-v0/` | Paper.js v0 – Boolean-Union für Outline-Modus |

## Paper.js

- Geladen wird nur **`paperjs-v0/dist/paper-core.min.js`** (global `paper`).
- Einbindung über `<script>` in `preview.html` (UMD, kein ES-Modul).
- Genutzt von `Editor/outline/mergeSymbol.js`.

Der Ordner `paperjs-v0/` enthält zusätzlich Docs, Beispiele und Quell-
dist-Dateien – für den Betrieb der App nicht erforderlich.
