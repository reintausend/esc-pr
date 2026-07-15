/*
  Zweck dieser Datei:
  Datenmodell des Tweak-Effekts (Stärke, Modus, betroffene Punktarten).
  Speichert nur Parameter – keine Berechnung. Gesteuert vom Panel.
*/

export class Brush {
  constructor(options = {}) {
    /** Stärke horizontal in Prozent (0–100), wie Illustrator. */
    this.horizontalStrength = options.horizontalStrength ?? 0;
    /** Stärke vertikal in Prozent (0–100). */
    this.verticalStrength = options.verticalStrength ?? 0;
    /** "relative" (Anteil der Zeichengröße) oder "absolute" (Einheiten). */
    this.mode = options.mode ?? "relative";
    this.affectAnchors = options.affectAnchors ?? true;
    this.affectInHandles = options.affectInHandles ?? true;
    this.affectOutHandles = options.affectOutHandles ?? false;
    /** Kanten abrunden in Prozent (0 = keine Rundung, 100 = maximal). */
    this.cornerRounding = options.cornerRounding ?? 0;
    /** Strichstärke 0–100; 0 = Generator-Stand, nur Verdickung. */
    this.strokeWidth = options.strokeWidth ?? 0;
    /** Größe 0–100; 35 = Generator-Stand. */
    this.sizePercent = options.sizePercent ?? 35;
  }

  get strengthOptions() {
    return {
      affectAnchors: this.affectAnchors,
      affectInHandles: this.affectInHandles,
      affectOutHandles: this.affectOutHandles,
    };
  }
}
