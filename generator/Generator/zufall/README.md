# zufall/ – Kapitel 8 (Generatorregeln)

Dieser Ordner setzt alle zufallsbasierten Entscheidungen des
Generators um:

- **Rotation**: Rotationswinkel werden zufällig gewählt, ohne festes
  Raster (Kapitel 8.1). Bereits häufig verwendete Winkel erhalten bei
  zukünftigen Symbolen eine geringere Auswahlwahrscheinlichkeit.
- **Spiegelung**: horizontal, vertikal oder beides gleichzeitig
  (Kapitel 8.2).
- **Wahrscheinlichkeiten**: Häufig verwendete Entscheidungen
  (Rotationswinkel, Spiegelungen, Positionierungsrichtungen,
  Anbindungsarten) erhalten eine geringere Auswahlwahrscheinlichkeit.
  Bereits verwendete Lösungen bleiben jederzeit möglich – es gibt
  keine Ausschlussregeln (Kapitel 8.3).
- Die Nutzungshistorie wird im `localStorage` des Browsers
  gespeichert, damit die Gewichtung auch für zukünftige Symbole gilt
  ("bei zukünftigen Symbolen", Kapitel 8.1).

## Dateien

- `wahrscheinlichkeit.js` – gewichtete Zufallsauswahl mit persistenter
  Nutzungshistorie (Rotations-Bins, Spiegelkombinationen, Richtungen,
  Anbindungsarten).
