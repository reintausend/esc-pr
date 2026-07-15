/*
  Zweck dieser Datei:
  Erzeugt zufällige Werte für alle Bearbeitungs-Regler der Preview.
  Rein funktional – keine DOM-Logik.
*/

function randInt(max = 100) {
  return Math.floor(Math.random() * (max + 1));
}

function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

function randomPointAffects() {
  const affectAnchors = randomBool(0.85);
  const affectInHandles = randomBool(0.55);
  const affectOutHandles = randomBool(0.35);

  if (!affectAnchors && !affectInHandles && !affectOutHandles) {
    return { affectAnchors: true, affectInHandles: false, affectOutHandles: false };
  }

  return { affectAnchors, affectInHandles, affectOutHandles };
}

/**
 * Zufällige Parameter für alle Editor-Regler.
 * @returns {object}  kompatibel mit TweakPanel.applyOptions / Brush
 */
export function randomBrushOptions() {
  const affects = randomPointAffects();

  return {
    horizontalStrength: randInt(),
    verticalStrength: randInt(),
    cornerRounding: randInt(),
    strokeWidth: randInt(),
    sizePercent: randInt(),
    mode: randomBool() ? "relative" : "absolute",
    ...affects,
    display: randomBool() ? "outline" : "fill",
  };
}
