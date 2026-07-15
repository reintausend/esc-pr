/*
  Zweck dieser Datei:
  Zerlegt den Eingabetext in eine geordnete Liste von Symbol-Aufträgen
  (Kapitel 2 – Zeichenklassen und Satzzeichen, Globale Definitionen).

  Ein Symbol-Auftrag hat eine dieser Formen:

  { type: "word", chars: ["H","A","U","S"] }
      → normales Wort-/Zahlenblock-Symbol: erster Buchstabe wird
        Hauptstruktur (*_full.svg), alle weiteren liefern Fragmente.

  { type: "punctuation-plain", char: "." }
      → Punkt oder Komma: eigenständiges Symbol, wird NICHT zerlegt,
        rechtsbündige Anordnung in der Ausgabe.

  { type: "punctuation-fragmented", char: "!" }
      → Ausrufezeichen oder Fragezeichen: eigenständiges Symbol aus
        seinen Fragmenten, Position der Fragmente zufällig,
        linksbündige Anordnung in der Ausgabe.

  Sonderregel-Vorrang (Globale Definitionen): . , ! ? werden auch dann
  als eigenständige Symbole abgetrennt, wenn sie direkt an einem Wort
  hängen ("HAUS!" → Symbol "HAUS" + Symbol "!").
*/

import { isAllowedCharacter } from "../material/zeichensatz.js";

// Satzzeichen laut Kapitel 2, die immer ein eigenständiges Symbol bilden.
const PLAIN_PUNCTUATION = new Set([".", ","]);
const FRAGMENTED_PUNCTUATION = new Set(["!", "?"]);

/*
  Wandelt den Eingabetext in Versalien um und prüft, dass nur Zeichen
  aus dem Materialordner enthalten sind. Liefert
  { ok: true, text } oder { ok: false, invalidChars: [...] }.
*/
export function normalizeInput(rawText) {
  const text = rawText.toUpperCase();
  const invalidChars = [...new Set(
    [...text].filter((c) => !isAllowedCharacter(c))
  )];
  if (invalidChars.length > 0) {
    return { ok: false, invalidChars };
  }
  return { ok: true, text };
}

/*
  Zerlegt den (bereits normalisierten) Text in Symbol-Aufträge in der
  Reihenfolge der Eingabe (Kapitel 9.6 – Anordnung entsprechend der
  Reihenfolge der Wörter).
*/
export function tokenize(text) {
  const tokens = [];
  let currentWord = [];

  const flushWord = () => {
    if (currentWord.length > 0) {
      tokens.push({ type: "word", chars: currentWord });
      currentWord = [];
    }
  };

  for (const char of text) {
    if (char === " ") {
      flushWord();
    } else if (PLAIN_PUNCTUATION.has(char)) {
      // Sonderregel: nie Bestandteil des benachbarten Symbols.
      flushWord();
      tokens.push({ type: "punctuation-plain", char });
    } else if (FRAGMENTED_PUNCTUATION.has(char)) {
      // Sonderregel: eigenständiges Symbol aus Fragmenten.
      flushWord();
      tokens.push({ type: "punctuation-fragmented", char });
    } else {
      // Buchstaben, Ziffern und übrige Sonderzeichen innerhalb eines
      // Wortes werden Bestandteil dieses Symbols
      // (Kapitel 2 – Übrige Sonderzeichen).
      currentWord.push(char);
    }
  }
  flushWord();

  return tokens;
}
