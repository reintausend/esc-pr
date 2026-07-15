# material/ – Kapitel 2 (Material) und Kapitel 3 (Fragmentierung)

Dieser Ordner setzt die Materialregeln des Regelwerks um:

- Die Grundlage jedes Symbols sind ausschließlich die Zeichen des
  eingegebenen Wortes (Kapitel 2, Grundprinzip).
- Die Fragmentierung wird **nicht** zur Laufzeit berechnet. Der Generator
  verwendet ausschließlich die im Materialordner
  (`Assets/Myriad Pro_SVGs_for Generator/`) hinterlegten,
  manuell vorbereiteten SVG-Dateien (Kapitel 3, Fragmentierung der
  Buchstaben).
- Für den ersten Buchstaben wird ausschließlich `*_full.svg` verwendet
  (Kapitel 3, Verwendung des vollständigen Buchstabens).
- Es werden keine neuen Formen erzeugt, keine Fragmente geteilt und
  keine zusätzlichen Fragmente konstruiert (Kapitel 3,
  Materialvollständigkeit).

## Dateien

- `zeichensatz.js` – Register aller im Materialordner vorhandenen
  Zeichen (Großbuchstaben, Umlaute, Ziffern, Sonderzeichen) mit
  Ordnernamen und Fragmentanzahl. Enthält auch die Sonderfälle
  `Punkt.svg` und `Komma.svg`, die als Einzeldateien ohne Fragmente
  vorliegen (Kapitel 2, Satzzeichen: werden nicht zerlegt).
- `lader.js` – lädt die SVG-Dateien per `fetch`, parst `viewBox` und
  Pfaddaten und stellt sie als unveränderte Geometrie bereit
  (Kapitel 2, Erhaltung der Form).
