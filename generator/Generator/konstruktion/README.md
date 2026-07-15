# konstruktion/ – Kapitel 4 + 5 (Konstruktion des Symbols)

Dieser Ordner enthält den eigentlichen Konstruktionsablauf:

- **Hauptstruktur (4.1, 5.1)**: Der erste Buchstabe eines Wortes wird
  ausschließlich als `*_full.svg` geladen. Er wird nie fragmentiert,
  nie verändert, nie ersetzt. Er darf weder rotiert noch gespiegelt
  werden (Kapitel 1, Kapitel 4.1). Seine Geometrie bleibt unverändert.
- **Fragmente laden (4.2, 5.2)**: Für jeden weiteren Buchstaben werden
  sämtliche Fragmentdateien geladen und in einer gemeinsamen
  Fragmentliste gesammelt. Nach dem Laden verlieren Fragmente ihre
  Herkunft und sind reine Geometrie-Elemente (5.6).
- **Schrittweise Platzierung (4.3, 4.4)**: Der Generator verarbeitet
  jeweils genau ein Fragment. Erlaubte Transformationen sind
  ausschließlich Verschieben, Rotation, horizontale und vertikale
  Spiegelung – die ursprüngliche Geometrie bleibt unverändert.
- **Anbindung (4.5 + Definition einer Anbindung)**: Ein Fragment gilt
  als angebunden, wenn es die bestehende Struktur berührt oder
  überlappt. Fragmente mit sichtbarem Abstand gelten nicht als
  angebunden. Das Platzierungsverfahren setzt Kontaktpunkte auf den
  Konturen beider Elemente aufeinander und garantiert so den
  geometrischen Kontakt. Vor jeder Platzierung wird die Anbindung
  geprüft, ungültige Platzierungen werden verworfen (Kapitel 8.5).
- **Überlappung (7.8)**: Parallele flächige Überlagerungen werden
  bei der Platzierung (8.5) und in der Kompositionskontrolle
  abgelehnt; Kreuzungen und punktuelle Anbindungen bleiben erlaubt
  (`konstruktion/ueberlappung.js`).
- **Akzente (Definition von Akzenten, 5.3 Schritt 5, 5.5)**:
  Punkt-Fragmente und kleine Fragmente können vom Generator als
  Akzente ausgewählt werden. Akzente sind die einzigen freistehenden
  Elemente – sie werden außerhalb der Haupt- und Sekundärstruktur
  platziert und berühren diese nicht.
- **Materialvollständigkeit (5.4)**: Jedes Fragment wird genau einmal
  verwendet, keines wird entfernt, keines mehrfach verwendet, keines
  neu erzeugt.
- **Reihenfolge (5.3)**: Hauptstruktur → Fragmente laden → einzeln
  anbinden → wiederholen bis alle verwendet → Akzente ergänzen →
  Negativräume prüfen (Ordner kontrolle/) → Symbol ausgeben
  (Ordner ausgabe/).

## Dateien

- `geometrie.js` – Geometrie-Werkzeuge: Abtastung der SVG-Pfade
  (Konturpunkte), Bounding-Boxen, Transformationsmatrizen,
  Abstandsberechnung. Verändert niemals die Pfadgeometrie selbst.
- `symbol.js` – Konstruktionsablauf für ein einzelnes Symbol
  (Wort-Symbole und Satzzeichen-Symbole nach Sonderregel).
- `ueberlappung.js` – Orientierungsabhängige Überlappungsprüfung
  (Kapitel 7.8 / Kapitel 8.5).
