# analyse/ – Kapitel 2 (Zeichenklassen, Satzzeichen) + Globale Definitionen

Dieser Ordner zerlegt die Eingabe des Nutzers in Symbol-Aufträge für
den Generator. Umgesetzte Regeln:

- Pro Wort bzw. Zahlenblock entsteht genau ein Symbol
  (Kapitel 9.6 – Ausgabe mehrerer Symbole).
- Der Begriff "Buchstabe" meint jedes verarbeitbare Zeichen:
  Großbuchstaben, Ziffern, Sonderzeichen (Globale Definitionen).
- Punkte (.), Kommas (,), Ausrufezeichen (!) und Fragezeichen (?)
  werden **nie** Bestandteil eines benachbarten Symbols. Sie erzeugen
  immer ein eigenständiges Symbol (Kapitel 2 – Satzzeichen/Sonderzeichen):
  - `.` und `,` werden nicht zerlegt und rechtsbündig angeordnet.
  - `!` und `?` werden in ihre Fragmente zerlegt, linksbündig
    angeordnet, die Position der Fragmente ist zufällig.
- Alle übrigen Sonderzeichen (z. B. `&`, `(`, `)`) werden innerhalb
  eines Wortes Bestandteil des Wortsymbols; stehen sie allein,
  erzeugen sie ein eigenes Symbol (Kapitel 2 – Übrige Sonderzeichen).
- Das System arbeitet ausschließlich mit Versalien – Kleinbuchstaben
  werden bereits bei der Eingabe in Großbuchstaben umgewandelt.
- Es sind nur Zeichen zulässig, die im Materialordner existieren
  (Kapitel 2 – Zeichenklassen).

## Dateien

- `eingabe.js` – Tokenizer: zerlegt den Eingabetext in eine geordnete
  Liste von Symbol-Aufträgen (Wort-Symbole und Satzzeichen-Symbole).
