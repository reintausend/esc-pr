# komposition/ – Kapitel 6 (Komposition)

Dieser Ordner steuert die räumliche Anordnung der Fragmente:

- **Hauptstruktur zuerst (6.1)**: Die Hauptstruktur ist der
  Ausgangspunkt, alle Fragmente orientieren sich an ihr.
- **Gleichmäßige Ausbreitung (6.3)**: Das Symbol soll sich möglichst
  gleichmäßig um die Hauptstruktur entwickeln. Der Generator bevorzugt
  freie Bereiche gegenüber bereits stark verdichteten Bereichen.
  Diese Regel ist ausdrücklich **probabilistisch** – sie wird hier als
  Wahrscheinlichkeitsgewichtung der 8 Positionierungsrichtungen
  umgesetzt: Richtungen mit vielen bereits platzierten Fragmenten
  erhalten ein geringeres Gewicht, bleiben aber immer möglich.
- **Hierarchie (6.4)**: Die Hauptstruktur bleibt dominant – die
  endgültige Prüfung übernimmt die Kompositionskontrolle
  (Ordner kontrolle/).
- **Verzweigungen (6.5)**: entstehen ausschließlich durch das Anfügen
  von Fragmenten – im Code gibt es keinerlei künstliche Verzweigungslogik.
- **Negativräume (6.6)**: werden nicht konstruiert, sie entstehen
  automatisch. Ihre zulässige Größe prüft die Kompositionskontrolle.

## Dateien

- `platzierung.js` – berechnet die Dichtegewichtung der 8 Richtungen
  um das Zentrum der Hauptstruktur.
