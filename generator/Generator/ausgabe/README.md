# ausgabe/ – Kapitel 9 (Ausgabe)

Dieser Ordner erzeugt aus den konstruierten Symbolen die finale
SVG-Ausgabe:

- **Vektorformat (9.1)**: Ausgabe ausschließlich als SVG mit
  vollständig definierten Vektorpfaden. Die Pfade stammen unverändert
  aus den Material-SVGs.
- **Hauptstruktur (9.2)**: Die Hauptstruktur und alle an sie
  angebundenen Fragmente werden als eine zusammenhängende Gruppe
  (`<g data-rolle="struktur">`) gespeichert.
- **Freistehende Fragmente (9.3)**: Akzente bleiben eigenständige
  Vektorformen innerhalb derselben SVG-Datei
  (`<g data-rolle="akzent">`).
- **Ursprüngliche Geometrie (9.4)**: Rotation und Spiegelung werden
  ausschließlich als Transformationsattribut geschrieben – die
  Pfaddaten selbst bleiben unverändert.
- **Weiterverarbeitung (9.5)**: Der Generator endet mit der Ausgabe
  der SVG-Datei (Download-Funktion). Nachgelagerte Bearbeitung ist
  nicht Teil des Generators.
- **Ausgabe mehrerer Symbole (9.6)**: Pro Wort entsteht genau ein
  Symbol. Die Symbole werden in Eingabereihenfolge untereinander
  angeordnet, mit konstant **2 cm** Abstand zwischen den äußeren
  Begrenzungskonturen (gemessen an den Bounding-Boxen aller
  Fragmente inkl. freistehender Akzente). Punkte und Kommas werden
  rechtsbündig angeordnet, Ausrufezeichen und Fragezeichen
  linksbündig, Wort-Symbole mittig (Kapitel 2 – Satzzeichen).

## Dateien

- `svg.js` – erzeugt die SVG-Struktur eines einzelnen Symbols.
- `anordnung.js` – ordnet mehrere Symbole mit 2 cm Abstand an und
  erzeugt die Gesamt-SVG-Datei für den Download.
