/*
  Zweck dieser Datei:
  Mappt den Stroke-Regler (0–100 %) auf Render-Parameter.
  0 % = Generator-Stand; nur Verdickung bis 100 %.
*/

import {
  OUTLINE_STROKE_BASE,
  OUTLINE_STROKE_MAX,
  FILL_STROKE_MAX,
} from "./strokeConstants.js";

/**
 * @param {number} percent  Reglerwert 0–100
 * @returns {{ kind: "neutral" | "thick", t?: number,
 *             fillStrokeWidth?: number, outlineStrokeWidth?: number }}
 */
export function strokeEffectFromPercent(percent) {
  const p = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));

  if (p === 0) {
    return { kind: "neutral" };
  }

  const t = p / 100;
  return {
    kind: "thick",
    t,
    fillStrokeWidth: t * FILL_STROKE_MAX,
    outlineStrokeWidth:
      OUTLINE_STROKE_BASE + t * (OUTLINE_STROKE_MAX - OUTLINE_STROKE_BASE),
  };
}
