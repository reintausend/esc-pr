/*
  Zweck dieser Datei:
  Zentraler Einstiegspunkt des Generators. Führt den vollständigen
  Ablauf des Regelwerks aus:

  Eingabe → Analyse (analyse/) → pro Wort:
    Konstruktion (konstruktion/, komposition/, zufall/)
    → Kompositionskontrolle (kontrolle/)
    → bei Nichtbestehen: vollständige Neukonstruktion mit neuen
      Zufallsentscheidungen (Kapitel 7 – Rekonstruktion)
  → Ausgabe (ausgabe/): SVG pro Symbol + Gesamtanordnung mit 2 cm
    Abstand (Kapitel 9).

  Rückgabe enthält zusätzlich Statistikdaten für den Infokasten der
  Preview-Seite (Anzahl Zeichen, Fragmente, Akzente, Versuche,
  Prüfstatus) – als Rückmeldung, wie gut der Generator funktioniert.
*/

import { CONFIG } from "./config.js";
import { normalizeInput, tokenize } from "./analyse/eingabe.js";
import {
  buildWordSymbol,
  buildPlainPunctuationSymbol,
  buildFragmentedPunctuationSymbol,
} from "./konstruktion/symbol.js";
import { runChecks } from "./kontrolle/pruefung.js";
import { arrangeSymbols, downloadSvg } from "./ausgabe/anordnung.js";

export { downloadSvg };

/*
  Konstruiert ein einzelnes Symbol inklusive Kompositionskontrolle
  und Rekonstruktion.
*/
async function generateSymbol(token) {
  // Sonderregeln (Kapitel 2 – Satzzeichen): eigenständige Symbole,
  // keine Kompositionskontrolle (Sonderregel-Vorrang).
  if (token.type === "punctuation-plain") {
    const symbol = await buildPlainPunctuationSymbol(token.char);
    return { symbol, attempts: 1, passed: true, failures: [] };
  }
  if (token.type === "punctuation-fragmented") {
    const symbol = await buildFragmentedPunctuationSymbol(token.char);
    return { symbol, attempts: 1, passed: true, failures: [] };
  }

  // Wort-Symbol: Konstruktion + Kontrolle + Rekonstruktion.
  let lastSymbol = null;
  let lastCheck = null;

  for (let attempt = 1; attempt <= CONFIG.MAX_CONSTRUCTION_ATTEMPTS; attempt++) {
    // Jeder Versuch ist eine vollständige Neukonstruktion mit neuen
    // Zufallsentscheidungen. Die Nutzungshistorie (Kapitel 8.3) sorgt
    // dafür, dass bereits verwendete Lösungen unwahrscheinlicher
    // werden, aber möglich bleiben.
    const symbol = await buildWordSymbol(token.chars);
    const check = runChecks(symbol);

    if (check.passed) {
      return { symbol, attempts: attempt, passed: true, failures: [] };
    }
    lastSymbol = symbol;
    lastCheck = check;
  }

  // Technische Obergrenze erreicht (siehe config.js): Der letzte
  // Versuch wird ausgegeben und als nicht bestanden gekennzeichnet.
  return {
    symbol: lastSymbol,
    attempts: CONFIG.MAX_CONSTRUCTION_ATTEMPTS,
    passed: false,
    failures: lastCheck.failures,
  };
}

/*
  Vollständiger Generatorlauf für einen Eingabetext.
  Rückgabe:
  {
    ok:      false bei ungültigen Zeichen (invalidChars gefüllt)
    results: [{ symbol, attempts, passed, failures }] in Eingabereihenfolge
    arrangement: { items, totalSvg } aus ausgabe/anordnung.js
    stats:   Gesamtstatistik für den Infokasten
  }
*/
export async function generate(rawText) {
  const normalized = normalizeInput(rawText);
  if (!normalized.ok) {
    return { ok: false, invalidChars: normalized.invalidChars };
  }

  const tokens = tokenize(normalized.text);
  if (tokens.length === 0) {
    return { ok: false, invalidChars: [] };
  }

  const results = [];
  for (const token of tokens) {
    results.push(await generateSymbol(token));
  }

  const arrangement = arrangeSymbols(results.map((r) => r.symbol));

  const stats = {
    symbolCount: results.length,
    charCount: results.reduce((s, r) => s + r.symbol.stats.charCount, 0),
    fragmentCount: results.reduce((s, r) => s + r.symbol.stats.fragmentCount, 0),
    accentCount: results.reduce((s, r) => s + r.symbol.stats.accentCount, 0),
    totalAttempts: results.reduce((s, r) => s + r.attempts, 0),
    allPassed: results.every((r) => r.passed),
    failures: results.flatMap((r) => r.failures),
  };

  return { ok: true, results, arrangement, stats };
}
