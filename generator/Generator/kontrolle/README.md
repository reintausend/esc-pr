# kontrolle/ – Kapitel 7 (Kompositionskontrolle)

Dieser Ordner prüft das vollständig konstruierte Symbol. Die
Prüfungen verändern das Symbol nicht. Wird mindestens eine Prüfung
nicht bestanden, wird das Symbol vollständig verworfen und neu
konstruiert – mit neuen Zufallsentscheidungen, niemals durch
nachträgliche Korrektur (Kapitel 7 – Rekonstruktion).

## Umgesetzte Prüfungen

1. **Prüfung der Hauptstruktur (7.1)**: Die Hauptstruktur darf nicht
   vollständig von anderen Fragmenten verdeckt werden. Mindestens ein
   zusammenhängender Bereich muss sichtbar bleiben. Umsetzung über
   Abtastpunkte der Hauptstruktur-Kontur und Punkt-in-Fläche-Tests
   gegen alle Sekundärfragmente.
2. **Prüfung der Fragmentverteilung (7.2)**: Die Bounding Box des
   gesamten Symbols wird in vier gleich große Quadranten unterteilt.
   Jeder Quadrant muss mindestens ein Fragment oder einen Teil eines
   Fragments enthalten. (Implementierungsentscheidung: Die
   Hauptstruktur zählt dabei als Teil des Symbols mit – sonst wäre
   die Prüfung für Ein-Zeichen-Wörter ohne Fragmente unerfüllbar.)
3. **Prüfung der Fragmentdichte (7.3)**: Nachbarabstände aller
   Fragmente werden bestimmt; starke Cluster und Leerbereiche führen
   zum Nichtbestehen. Bewertungsparameter: `DENSITY_MAX_VARIATION`
   in `config.js`.
4. **Prüfung der Negativräume (7.4)**: Alle geschlossenen Negativräume
   innerhalb der äußeren Begrenzungskontur werden per Rasterisierung
   und Flood-Fill bestimmt. Der größte Negativraum darf maximal
   `NEGATIVE_SPACE_FACTOR = 3.0` mal so groß sein wie der
   durchschnittliche Negativraum (Kapitel 7 – Bewertungsparameter).
5. **Prüfung der Materialvollständigkeit (7.5)**: Alle Fragmente des
   Eingabeworts müssen im Symbol vorhanden sein, jedes genau einmal.
6. **Regelprüfung (7.6)**: Verbindungsregeln (jedes Nicht-Akzent-
   Fragment ist angebunden), Akzente sind freistehend, nur erlaubte
   Transformationen wurden verwendet.
7. **Prüfung der Überlappung (7.8)**: Orientierungsabhängige Grenze
   für Flächenüberlappungen zwischen Hauptstruktur und Fragmenten.
   Parallele schwarze Cluster werden verhindert; Kreuzungen und
   punktuelle Anbindungen bleiben zulässig. Bewertungsparameter in
   `config.js` (`MAX_PARALLEL_OVERLAP_RATIO` u. a.).

## Rekonstruktion

Besteht ein Symbol eine Prüfung nicht, wird es verworfen und komplett
neu konstruiert (`MAX_CONSTRUCTION_ATTEMPTS` in `config.js` als
technische Obergrenze, damit der Browser nie einfriert – wird die
Obergrenze erreicht, wird der letzte Versuch mit Kennzeichnung
"nicht bestanden" ausgegeben).

Die Satzzeichen-Symbole (`.` `,` `!` `?`) unterliegen laut Sonderregel
(Kapitel 2) eigenen Anordnungsregeln und keiner Kompositionskontrolle –
Sonderregeln haben Vorrang (Globale Definitionen).

## Dateien

- `pruefung.js` – alle sechs Prüfungen und die Gesamtauswertung.
