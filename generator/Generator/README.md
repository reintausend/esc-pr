# Generator – Umsetzung des Regelwerks V2

Dieser Ordner enthält die vollständige Code-Umsetzung des Regelwerks
(`Regelwerk_V2.pdf`). Jedes Kapitel des Regelwerks ist einem eigenen
Unterordner zugeordnet. Jeder Unterordner besitzt eine eigene README.md,
die erklärt, welche Regeln dort umgesetzt sind. Jede Code-Datei beginnt
zusätzlich mit einem Erklärungskommentar.

## Zuordnung Regelwerk-Kapitel → Ordner

| Ordner            | Regelwerk-Kapitel                                          |
|-------------------|------------------------------------------------------------|
| `material/`       | Kapitel 2 (Material) + Kapitel 3 (Fragmentierung)          |
| `analyse/`        | Kapitel 2 (Zeichenklassen, Satzzeichen) + Globale Definitionen |
| `zufall/`         | Kapitel 8 (Generatorregeln: Zufall und Wahrscheinlichkeiten) |
| `konstruktion/`   | Kapitel 4 + 5 (Konstruktion, Anbindung, Akzente)           |
| `komposition/`    | Kapitel 6 (Komposition: gleichmäßige Ausbreitung)          |
| `kontrolle/`      | Kapitel 7 (Kompositionskontrolle mit allen Prüfungen)      |
| `ausgabe/`        | Kapitel 9 (SVG-Ausgabe und Anordnung mehrerer Symbole)     |

Zentrale Dateien:

- `config.js` – alle Bewertungsparameter an einer Stelle
  (u. a. `NEGATIVE_SPACE_FACTOR = 3.0` aus Kapitel 7).
- `generator.js` – Einstiegspunkt: nimmt die Eingabe entgegen und
  führt den kompletten Ablauf aus (Analyse → Konstruktion →
  Kontrolle → Ausgabe).

## Ablauf (Kapitel 5.3, verbindliche Reihenfolge)

1. Hauptstruktur platzieren (erster Buchstabe, `*_full.svg`)
2. Alle Fragmente laden
3. Fragmente einzeln an vorhandene Strukturen anbinden
4. Wiederholen, bis alle Fragmente verwendet wurden
5. Akzente ergänzen
6. Negativräume prüfen (Kompositionskontrolle)
7. Symbol ausgeben (SVG)

## Starten

Die SVG-Dateien werden zur Laufzeit per `fetch` geladen. Dafür muss das
Projekt über einen lokalen Webserver laufen (nicht per Doppelklick auf
die HTML-Datei öffnen):

```bash
cd /Users/julianflorchinger/Desktop/Glyphs_Project
python3 -m http.server 8000
```

Danach im Browser öffnen: `http://localhost:8000/index.html`
