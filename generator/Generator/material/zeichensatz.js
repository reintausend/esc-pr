/*
  Zweck dieser Datei:
  Register aller verarbeitbaren Zeichen (Kapitel 2 – Zeichenklassen).

  Für jedes Zeichen ist hinterlegt, in welchem Ordner des
  Materialordners seine SVG-Dateien liegen und wie viele
  Fragmentdateien existieren. Die Fragmentierung ist manuell erstellt
  und dauerhaft festgelegt (Kapitel 3) – deshalb ist die Fragmentanzahl
  hier fest eingetragen und wird nicht zur Laufzeit ermittelt.

  Sonderfälle laut Regelwerk (Kapitel 2 – Satzzeichen):
  - Punkt (.) und Komma (,) liegen als Einzeldateien vor und werden
    niemals zerlegt.
  - Ausrufezeichen (!) und Fragezeichen (?) besitzen Fragmentdateien
    und werden als eigenständige Symbole immer zerlegt.

  Es können ausschließlich die hier registrierten Zeichen in den
  Eingabedialog eingetippt werden (Kapitel 2 – Zeichenklassen).
*/

import { CONFIG } from "../config.js";

// Zeichen mit eigenem Ordner "<ZEICHEN>_SVGS", Datei "<ZEICHEN>_full.svg"
// und Fragmentdateien "<ZEICHEN>_frag1.svg" ... "<ZEICHEN>_fragN.svg".
const FOLDER_CHARACTERS = {
  A: 3, B: 3, C: 2, D: 2, E: 3, F: 3, G: 3, H: 2, I: 2, J: 2,
  K: 3, L: 2, M: 3, N: 3, O: 2, P: 2, Q: 2, R: 3, S: 2, T: 2,
  U: 2, V: 2, W: 3, X: 2, Y: 2, Z: 3,
  "Ä": 5, "Ö": 4, "Ü": 4,
  0: 2, 1: 2, 2: 2, 3: 2, 4: 3, 5: 2, 6: 2, 7: 2, 8: 2, 9: 3,
  "!": 2, "?": 2, "&": 2, "(": 2, ")": 2,
};

// Satzzeichen als Einzeldateien direkt im Materialordner,
// ohne Fragmente (werden laut Regelwerk nicht zerlegt).
const SINGLE_FILE_CHARACTERS = {
  ".": "Punkt.svg",
  ",": "Komma.svg",
};

/*
  Liefert die Registerdaten eines Zeichens oder null, wenn das Zeichen
  nicht im Materialordner existiert.
  Rückgabeformat:
  {
    char:        das Zeichen selbst
    fullUrl:     URL der vollständigen SVG-Datei (*_full.svg)
    fragmentUrls: Liste der Fragment-SVG-URLs (leer bei . und ,)
  }
*/
export function getCharacterEntry(char) {
  if (char in SINGLE_FILE_CHARACTERS) {
    return {
      char,
      fullUrl: `${CONFIG.MATERIAL_PATH}/${SINGLE_FILE_CHARACTERS[char]}`,
      fragmentUrls: [],
    };
  }

  if (char in FOLDER_CHARACTERS) {
    const folder = `${CONFIG.MATERIAL_PATH}/${char}_SVGS`;
    const count = FOLDER_CHARACTERS[char];
    const fragmentUrls = [];
    for (let i = 1; i <= count; i++) {
      fragmentUrls.push(`${folder}/${char}_frag${i}.svg`);
    }
    return {
      char,
      fullUrl: `${folder}/${char}_full.svg`,
      fragmentUrls,
    };
  }

  return null;
}

// Prüft, ob ein Zeichen verarbeitet werden kann (Leerzeichen trennt
// Wörter und ist deshalb ebenfalls zulässig).
export function isAllowedCharacter(char) {
  return char === " " || getCharacterEntry(char) !== null;
}

// Alle zulässigen Zeichen als Liste (für die Eingabevalidierung).
export function allAllowedCharacters() {
  return [
    ...Object.keys(FOLDER_CHARACTERS),
    ...Object.keys(SINGLE_FILE_CHARACTERS),
    " ",
  ];
}
