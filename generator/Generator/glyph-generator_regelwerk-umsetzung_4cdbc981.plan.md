---
name: Glyph-Generator Regelwerk-Umsetzung
overview: Das komplette Regelwerk V2 (Kapitel 1-9 + Globale Definitionen) wird als modularer JavaScript-Generator im Ordner Generator/ umgesetzt, mit einem Ordner pro Regelwerk-Bereich, README-Erklärung pro Ordner und Kommentar-Kopf pro Datei, und in index.html/preview.html integriert.
todos:
  - id: structure
    content: Generator-Ordnerstruktur mit READMEs und config.js anlegen
    status: completed
  - id: material
    content: "material/: Zeichenregister und SVG-Lader (Kap. 2+3)"
    status: completed
  - id: analyse
    content: "analyse/: Eingabe-Tokenizer inkl. Satzzeichenregeln (Kap. 2 + Globale Definitionen)"
    status: completed
  - id: zufall
    content: "zufall/: gewichteter Zufall mit persistenter Nutzungshistorie (Kap. 8)"
    status: completed
  - id: konstruktion
    content: "konstruktion/: Hauptstruktur, Fragmentplatzierung, Anbindung, Akzente (Kap. 4+5)"
    status: completed
  - id: komposition
    content: "komposition/: gleichmäßige Ausbreitung und Hierarchie (Kap. 6)"
    status: completed
  - id: kontrolle
    content: "kontrolle/: alle 6 Prüfungen + Rekonstruktion (Kap. 7)"
    status: completed
  - id: ausgabe
    content: "ausgabe/: SVG-Erzeugung und Mehrsymbol-Anordnung mit 2 cm Abstand (Kap. 9)"
    status: completed
  - id: integration
    content: Integration in index/preview (Versalien, Grid-Rendering, Infokasten, Download)
    status: completed
  - id: test
    content: Lokalen Server starten und Generator mit Testeingaben prüfen
    status: completed
isProject: false
---

# Glyph-Generator: Umsetzung Regelwerk V2

## Architektur

Der Generator läuft komplett im Browser (ES-Module, kein Framework), passend zur bestehenden Struktur (`index.html`, `preview.html`). Die SVGs werden per `fetch` aus [Assets/Myriad Pro_SVGs_for Generator/](Assets/Myriad Pro_SVGs_for Generator/) geladen – dafür ist ein lokaler Webserver nötig (z.B. `python3 -m http.server`), Hinweis kommt ins README.

## Ordnerstruktur (jeder Ordner mit eigener README.md, jede Datei mit Erklärungs-Kommentarkopf)

- `Generator/README.md` – Gesamtübersicht, Zuordnung Kapitel → Ordner, Startanleitung
- `Generator/config.js` – alle Bewertungsparameter zentral: `NEGATIVE_SPACE_FACTOR = 3.0` (Kap. 7), Symbolabstand 2 cm (Kap. 9.6), Kontakttoleranz der Anbindung, klar gekennzeichnete Zusatzparameter für Dichte-/Sichtbarkeitsprüfung
- `Generator/material/` – **Kapitel 2 + 3 (Material, Fragmentierung)**: Zeichenregister aller 44 Zeichenordner inkl. Fragmentanzahl, Sonderfälle `Punkt.svg`/`Komma.svg`; SVG-Lader (parst viewBox + Pfade, keine Laufzeit-Zerlegung)
- `Generator/analyse/` – **Kapitel 2 (Zeichenklassen, Satzzeichen) + Globale Definitionen**: Eingabe-Tokenizer: Wörter/Zahlenblöcke → je ein Symbol; `.` `,` `!` `?` immer eigenständige Symbole (`!`/`?` fragmentiert, Position zufällig, linksbündig); übrige Sonderzeichen im Wort = Wortbestandteil, allein = eigenes Symbol; Versalien-Erzwingung
- `Generator/zufall/` – **Kapitel 8 (Generatorregeln)**: gewichteter Zufall; Nutzungshistorie (Rotationswinkel-Bins, Spiegelkombinationen, Richtungen, Anbindungsarten) persistent in `localStorage` → häufig Verwendetes bekommt geringere Wahrscheinlichkeit, nichts wird ausgeschlossen
- `Generator/konstruktion/` – **Kapitel 4 + 5 (Konstruktion)**: Hauptstruktur aus `*_full.svg` (nie fragmentiert, darf rotiert/gespiegelt werden); Fragmentliste aller übrigen Zeichen (jede Instanz einzeln, keine Mehrfachverwendung); schrittweise Platzierung einzeln mit Transformation (Verschieben/Rotation/Spiegelung – Geometrie unverändert); **Anbindung** = Berührung oder Überlappung (Punkt-auf-Kontur-Verfahren garantiert Kontakt); **Akzente**: Generator wählt Punkt-/Kleinfragmente, platziert sie freistehend außerhalb der Struktur; Geometrie-Helfer (Pfad-Sampling, BBox, Transformationen)
- `Generator/komposition/` – **Kapitel 6 (Komposition)**: probabilistische Bevorzugung freier Bereiche (Richtungs-/Dichtegewichtung um die Hauptstruktur), Hierarchie-Erhalt, Verzweigungen nur durch Anfügen
- `Generator/kontrolle/` – **Kapitel 7 (Kompositionskontrolle)**: alle 6 Prüfungen: (1) Hauptstruktur sichtbar (Sampling), (2) Quadranten-Prüfung der Bounding Box, (3) Fragmentdichte (Nachbarabstände), (4) Negativräume per Offscreen-Canvas-Rasterisierung + Flood-Fill, größter ≤ 3.0 × Durchschnitt, (5) Materialvollständigkeit, (6) Regelkonformität; bei Fehlschlag komplette Neukonstruktion mit neuen Zufallsentscheidungen (mit Versuchs-Obergrenze als technischem Schutz, wird dokumentiert)
- `Generator/ausgabe/` – **Kapitel 9 (Ausgabe)**: SVG-Erzeugung (Hauptstruktur + angebundene Fragmente als zusammenhängende Gruppe, Akzente als eigenständige Formen in derselben Datei); Anordnung mehrerer Symbole in Eingabereihenfolge, vertikal, konstant 2 cm zwischen Begrenzungskonturen, Satzzeichen linksbündig; SVG-Download

## Integration in bestehende Seiten

- [index.js](index.js)/[index.css](index.css): Live-Umwandlung in Versalien, nur Zeichen aus dem Materialordner + Leerzeichen zulässig
- [preview.js](preview.js): startet Generator mit der Eingabe, rendert Symbole ins 8-cm-Grid (scrollbar nach unten), Download-Möglichkeit der SVG
- Infokasten der Preview zeigt Generator-Daten: Anzahl Zeichen, Anzahl Fragmente, Anzahl Akzente, Konstruktionsversuche, Prüfstatus

## Dokumentierte Implementierungsentscheidungen (im Code gekennzeichnet)

- Zusätzliche messbare Schwellwerte für Prüfung 7.1 (Sichtbarkeitsanteil) und 7.3 (Dichtestreuung), analog zum Bewertungsparameter-Prinzip der PDF, zentral in `config.js` anpassbar
- Standalone-`!`/`?` haben regelkonform keine Hauptstruktur (nur zufällig positionierte Fragmente)
- Versuchs-Obergrenze bei Rekonstruktion, damit der Browser nie einfriert