/*
  Zweck dieser Datei:
  Zentrale Sammlung aller Parameter des Generators.

  Hier stehen ausschließlich Werte, die das Regelwerk entweder direkt
  vorgibt (z. B. NEGATIVE_SPACE_FACTOR aus Kapitel 7, 2 cm Symbolabstand
  aus Kapitel 9.6) oder die als klar gekennzeichnete Bewertungsparameter
  nötig sind, um qualitative Regeln messbar zu machen.
  Laut Regelwerk (Kapitel 7, "Bewertungsparameter") dürfen solche
  Parameter angepasst werden, ohne die übrigen Regeln zu verändern.
*/

export const CONFIG = {
  /* ---- Direkt aus dem Regelwerk übernommene Werte ---- */

  // Kapitel 7 – Bewertungsparameter:
  // Der größte zusammenhängende Negativraum darf maximal die dreifache
  // Fläche des durchschnittlichen Negativraums besitzen.
  NEGATIVE_SPACE_FACTOR: 3.0,

  // Kapitel 9.6 – Ausgabe mehrerer Symbole:
  // Konstanter Abstand von 2 cm zwischen den äußeren
  // Begrenzungskonturen benachbarter Symbole (2 cm = 20 mm).
  SYMBOL_SPACING_MM: 20,

  // Pfad zum Materialordner (Kapitel 2 – Verwendete Schrift / Material).
  // Wird relativ zu dieser Moduldatei aufgelöst (nicht zur Seite), damit
  // Seiten aus anderen Paketen (z. B. gui/) den Generator laden können.
  MATERIAL_PATH: decodeURIComponent(
    new URL("../Assets/Myriad Pro_SVGs_for Generator", import.meta.url).pathname
  ),

  // Umrechnung der SVG-Einheiten in Millimeter.
  // Die Material-SVGs sind in pt angelegt (A_full.svg: 111.5468 Einheiten
  // = 39.3512 mm). 1 mm = 72 / 25.4 = 2.8346 Einheiten.
  UNITS_PER_MM: 72 / 25.4,

  /* ---- Bewertungsparameter (Implementierungsentscheidungen) ----
     Diese Werte machen qualitative Regeln des Regelwerks messbar.
     Sie sind analog zum NEGATIVE_SPACE_FACTOR als anpassbare
     Bewertungsparameter zu verstehen. ---- */

  // Kapitel 4 – Definition einer Anbindung:
  // "Berühren oder Überlappen". Toleranz in SVG-Einheiten, unterhalb
  // derer zwei Konturen als "berührend" gelten (ca. 0.35 mm).
  CONTACT_TOLERANCE: 1.0,

  // Kapitel 7.1 – Prüfung der Hauptstruktur:
  // Mindestanteil der Konturpunkte der Hauptstruktur, der nicht von
  // Fragmenten überdeckt sein darf ("mindestens ein zusammenhängender
  // Bereich sichtbar"). Zusätzlich Mindestlänge der zusammenhängenden
  // sichtbaren Punktfolge.
  MAIN_VISIBLE_MIN_RATIO: 0.15,
  MAIN_VISIBLE_MIN_RUN: 8,

  // Kapitel 7.3 – Prüfung der Fragmentdichte:
  // Maximal erlaubter Variationskoeffizient (Streuung/Mittelwert) der
  // Nachbarabstände aller Fragmente. Höhere Werte bedeuten starke
  // Cluster bzw. Leerbereiche.
  DENSITY_MAX_VARIATION: 1.35,

  // Kapitel 7.8 – Prüfung der Überlappung (orientierungsabhängig):
  // Rasterauflösung für die Flächenmessung (analog Negativraum-Check).
  OVERLAP_RASTER_SIZE: 96,
  // Winkelgrenze für orientierungsähnliche Elemente (Dokumentation/Referenz).
  PARALLEL_ANGLE: 35,
  // Max. Überlappungsverhältnis bei paralleler Ausrichtung (0°).
  MAX_PARALLEL_OVERLAP_RATIO: 0.15,
  // Max. Überlappungsverhältnis bei senkrechter Ausrichtung (90°).
  MAX_PERPENDICULAR_OVERLAP_RATIO: 0.5,
  // Absolute Obergrenze pro Elementpaar, unabhängig vom Winkel.
  MAX_PAIR_OVERLAP_RATIO: 0.45,
  // Unterhalb dieses Verhältnisses wird ein Paar ignoriert (Rasterrauschen).
  OVERLAP_CHECK_MIN_RATIO: 0.02,

  // Kapitel 7 – Rekonstruktion:
  // Das Regelwerk verlangt bei fehlgeschlagener Prüfung eine komplette
  // Neukonstruktion. Diese technische Obergrenze verhindert, dass der
  // Browser bei unlösbaren Eingaben einfriert. Nach Erreichen der
  // Obergrenze wird der beste Versuch ausgegeben und im Interface
  // als "nicht bestanden" gekennzeichnet.
  MAX_CONSTRUCTION_ATTEMPTS: 40,

  // Kapitel 5 – Akzente:
  // Fragmente, deren Fläche (Bounding-Box) unterhalb dieses Anteils der
  // Hauptstruktur-Fläche liegt, kommen als Akzente infrage
  // ("Punkte und kleine Fragmente").
  ACCENT_MAX_AREA_RATIO: 0.05,

  // Wahrscheinlichkeit, mit der der Generator ein infrage kommendes
  // kleines Fragment tatsächlich als Akzent verwendet
  // ("Welche Fragmente als Akzente verwendet werden, entscheidet der
  // Generator").
  ACCENT_PROBABILITY: 0.5,

  // Abstand (in SVG-Einheiten), in dem Akzente außerhalb der
  // Struktur platziert werden (min/max, ca. 2–6 mm).
  ACCENT_MIN_GAP: 6,
  ACCENT_MAX_GAP: 17,

  // Anzahl der Abtastpunkte pro Pfad für die Geometrieberechnung
  // (Konturkontakt, Sichtbarkeit, Quadranten). Rein technischer Wert.
  SAMPLES_PER_PATH: 64,

  // Kapitel 8 – Wahrscheinlichkeiten:
  // Rotationswinkel werden für die Nutzungshistorie in Klassen
  // ("Bins") von 15 Grad gruppiert.
  ROTATION_BIN_SIZE: 15,

  // Schlüssel für die persistente Nutzungshistorie im localStorage.
  HISTORY_STORAGE_KEY: "glyphs_generator_history_v1",
};
