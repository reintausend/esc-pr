/*
  Layout-Konstanten für die Preview-Nachbearbeitung (Download/Print).
  Bewusst getrennt vom Generator – Werte müssen der Preview-Anordnung
  entsprechen (2 cm Abstand, mm → SVG-Einheiten, druckbare Breite).
*/

/** Druckbare Breite TM-T88IV (512 dots @ 180 dpi). */
export const PRINTABLE_WIDTH_MM = 72.2;

export const LAYOUT = {
  SYMBOL_SPACING_MM: 20,
  UNITS_PER_MM: 72 / 25.4,
  PRINTABLE_WIDTH_MM,
};
