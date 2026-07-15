# Glyphs Project

Regelbasierte Symbol-Generierung (Regelwerk V2) mit Preview-Editor und
Thermodruck (Epson TM-T88IV).

## Ordner

| Ordner | Zweck |
|--------|--------|
| [`Generator/`](Generator/README.md) | Symbole erzeugen (Regelwerk, SVG-Ausgabe) |
| [`Editor/`](Editor/README.md) | Preview bearbeiten (Tweak, Abrunden, Stroke, Outline) |
| [`Assets/`](Assets/README.md) | Fragment-SVGs und Web-Material |
| [`Printer/`](Printer/README.md) | Druckserver und Drucker-Setup |

## Ablauf

1. **index.html** – Eingabe
2. **Generator** – Symbole konstruieren und als SVG ausgeben
3. **preview.html** – Anzeige im 72,2-mm-Grid, Bearbeitung, Save SVG, Print

## Starten

Lokalen Webserver starten (z. B. `python3 -m http.server 8000`), dann
`http://localhost:8000` öffnen. Für Druck zusätzlich den Print-Server
siehe `Printer/README.md`.

## Trennung Generator / Editor

Der Generator erzeugt Symbole; der Editor verändert nur die **Darstellung**
im Preview-DOM. Kein Editor-Code greift in die Generator-Logik ein.
