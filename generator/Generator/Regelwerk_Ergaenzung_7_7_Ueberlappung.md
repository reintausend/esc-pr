# Regelwerk V2 – Ergänzung: Kapitel 7.7

Dieser Text ist PDF-tauglich formuliert und kann direkt in den Katalog
übernommen werden. Bestehende Kapitel (Konstruktion, Anbindung, Material,
Akzente, Ausgabe) bleiben unverändert.

Hinweis zur Nummerierung: Falls in eurer Fassung des Regelwerks
**7.7 bereits „Rekonstruktion“** bezeichnet, diesen Abschnitt als
**7.7** einfügen und „Rekonstruktion“ nach **7.8** verschieben.

---

## Kapitel 7 – Kompositionskontrolle

*(bestehende Prüfungen 7.1 bis 7.6 unverändert)*

### 7.7 Prüfung der Überlappung (orientierungsabhängig)

#### Zweck

Die Anbindung von Fragmenten erfordert Berührung oder Überlappung
(Kapitel 4 – Definition einer Anbindung). Diese Voraussetzung bleibt
unverändert.

Die Prüfung der Überlappung verhindert ausschließlich **flächige
Verdichtungen**, bei denen mehrere Strukturelemente in **ähnlicher
Richtung** übereinanderliegen und dadurch undifferenzierte schwarze
Bereiche entstehen, in denen einzelne Elemente nicht mehr
unterscheidbar sind.

Kreuzungen, punktuelle Berührungen und schmale Anbindungsüberlappungen
bleiben ausdrücklich zulässig.

#### Geltungsbereich

Die Prüfung gilt für alle **angebundenen Strukturelemente** eines
Wort-Symbols:

- die Hauptstruktur und
- alle Sekundärfragmente.

**Nicht geprüft werden:**

- **Akzente** (freistehende Elemente, Kapitel 5 – Definition von Akzenten)
- **Satzzeichen-Symbole** (`.` `,` `!` `?`; Sonderregel Kapitel 2 –
  Sonderregeln haben Vorrang, vgl. Globale Definitionen)

#### Definitionen

**Dominante Strichrichtung**
: Die Richtung, in der ein Element überwiegend verläuft. Sie wird aus
der platzierten Geometrie des Elements abgeleitet (nicht aus der
Zufallsrotation allein).

**Orientierungsähnlichkeit**
: Zwei Elemente gelten als orientierungsähnlich, wenn der Winkel
zwischen ihren dominanten Strichrichtungen kleiner ist als der
Bewertungsparameter **PARALLEL_ANGLE**.

**Überlappungsfläche**
: Der Anteil der Gesamtfläche beider Elemente, der von beiden gleichzeitig
bedeckt wird.

**Überlappungsverhältnis**
: Das Verhältnis

> Überlappungsfläche ÷ Fläche des kleineren Elements

wobei die Fläche jeweils aus der platzierten Elementgeometrie bestimmt
wird.

#### Prüfverfahren

1. Für jedes Paar angebundener Strukturelemente wird das
   Überlappungsverhältnis bestimmt.

2. Für dasselbe Paar wird der Winkel zwischen den dominanten
   Strichrichtungen bestimmt.

3. Aus dem Winkel wird die **zulässige Obergrenze** für das
   Überlappungsverhältnis abgeleitet:

   - bei **paralleler** Ausrichtung (0°): strengste Grenze
     → Bewertungsparameter **MAX_PARALLEL_OVERLAP**
   - bei **senkrechter** Ausrichtung (90°): großzügigste Grenze
     → Bewertungsparameter **MAX_PERPENDICULAR_OVERLAP**
   - bei Winkeln dazwischen: stufenlose Übergangsgrenze zwischen
     beiden Werten

4. Liegt das gemessene Überlappungsverhältnis über der zulässigen
   Obergrenze, ist die Prüfung **nicht bestanden**.

5. Unabhängig vom Winkel gilt zusätzlich die absolute Obergrenze
   **MAX_PAIR_OVERLAP** pro Elementpaar.

#### Ziel der Prüfung

| Situation | Erwartetes Ergebnis |
|-----------|---------------------|
| Kreuzung (~90°) | Geringe Überlappung → zulässig |
| Punktuelle Anbindung | Geringe Überlappung → zulässig |
| Parallele Überlagerung (~0°) | Große Überlappung → nicht zulässig |
| Ähnliche Richtung (< PARALLEL_ANGLE) | Flächige Verdichtung → nicht zulässig |

#### Folge bei Nichtbestehen

Besteht die Prüfung nicht, wird das Symbol **vollständig verworfen**
und gemäß Kapitel 7 (Rekonstruktion) **neu konstruiert**.

Es erfolgt **keine nachträgliche Korrektur** einzelner Fragmente.
Alle Zufallsentscheidungen (Rotation, Spiegelung, Anbindung,
Positionierung) werden neu getroffen.

Dies entspricht dem bestehenden Prinzip der Kompositionskontrolle:
Prüfung → Verwerfung → Neukonstruktion.

#### Verhältnis zu anderen Prüfungen

Die Prüfung der Überlappung ergänzt die bestehenden Prüfungen
(7.1–7.6). Sie ersetzt keine andere Prüfung und verändert keine
Konstruktionsregeln aus Kapitel 4 und 5.

Insbesondere unverändert bleiben:

- die Definition der Anbindung (Berührung oder Überlappung),
- die erlaubten Transformationen (Verschieben, Rotation, Spiegelung),
- die Materialvollständigkeit,
- die Regeln für Akzente und Satzzeichen,
- die Ausgaberegeln (Kapitel 9).

---

## Kapitel 7 – Bewertungsparameter (Ergänzung)

Die folgenden Parameter ergänzen die bestehenden Bewertungsparameter
(z. B. **NEGATIVE_SPACE_FACTOR**). Sie dürfen angepasst werden, ohne
die übrigen Regeln zu verändern.

| Parameter | Bedeutung | Standardwert |
|-----------|-----------|--------------|
| **PARALLEL_ANGLE** | Winkelgrenze, unterhalb derer zwei Elemente als orientierungsähnlich gelten | 35° |
| **MAX_PARALLEL_OVERLAP** | Maximal zulässiges Überlappungsverhältnis bei paralleler Ausrichtung (0°) | 0,15 (15 %) |
| **MAX_PERPENDICULAR_OVERLAP** | Maximal zulässiges Überlappungsverhältnis bei senkrechter Ausrichtung (90°) | 0,50 (50 %) |
| **MAX_PAIR_OVERLAP** | Absolute Obergrenze pro Elementpaar, unabhängig vom Winkel | 0,45 (45 %) |

---

## Kapitel 8.5 – Ungültige Platzierungen (Ergänzung)

*(bestehender Text unverändert; folgender Satz ergänzen)*

Eine Platzierung gilt zusätzlich als ungültig, wenn sie die Prüfung
der orientierungsabhängigen Überlappung (Kapitel 7.7) nicht erfüllen
würde. Der Generator verwirft solche Platzierungen und trifft neue
Zufallsentscheidungen für Position, Rotation, Spiegelung und Anbindung.

---

## Kapitel 7 – Rekonstruktion (Präzisierung, optional)

*(falls als eigener Abschnitt vorhanden; kein inhaltlicher Wandel,
nur Verweis auf die neue Prüfung)*

Wird eine der Prüfungen 7.1 bis **7.7** nicht bestanden, erfolgt eine
vollständige Neukonstruktion des Symbols. Einzelne Fragmente werden
weder verschoben noch ersetzt noch nachträglich korrigiert.

---

## Zusammenfassung (für Kapitelübersicht oder Vorwort)

> Die Anbindung erfordert weiterhin Berührung oder punktuelle
> Überlappung. Neu ist ausschließlich die Begrenzung flächiger
> paralleler Überlagerungen zwischen Strukturelementen. Bei Verstoß
> wird das gesamte Symbol verworfen und neu konstruiert.
