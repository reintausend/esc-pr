# round/ – Kanten abrunden

Regler-gesteuertes **Fillet** an Ecken zwischen zwei Geraden (L–L).
Kurven (C) und kollineare Ecken bleiben unverändert.

| Datei | Aufgabe |
|-------|---------|
| `roundCorners.js` | `roundPathData(d, fraction)` – rundet Pfad-d ausgehend vom übergebenen d |

## Prinzip

- `fraction` 0 = keine Rundung, 1 = maximal (Schnitt bis halbe kürzere Kante).
- Immer **nicht kumulativ**: wird in der Pipeline nach Tweak auf den
  bereits verzerrten Pfad angewendet; beim nächsten Frame startet Tweak
  wieder vom Original, danach erneut Abrunden.

Angebunden in `Editor/preview/PreviewToolHost.js` (Regler „Abrunden").
