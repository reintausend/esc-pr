// Round-trip test for the tick code under simulated print + camera
// degradation: perspective (module width drifting along the strip), blur,
// sensor noise, thermal fade, and rotation (via the 2D angled-scan path).
//
// Run: node tests/tickcode.test.mjs

import {
  packPayload,
  moduleSequence,
  decodeLine,
  decodeGray,
  CODE_MAX,
} from "../site/shared/tickcode.js";

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Render one scanline of the code as grayscale, unit width drifting by `skew`. */
function renderLine(id, unitPx, skew, rng, { black = 30, white = 220 } = {}) {
  const seq = moduleSequence(packPayload(id)); // [widthUnits, isBlack]
  const totalUnits = seq.reduce((a, [w]) => a + w, 0);
  const quiet = 10;
  const px = [];
  for (let q = 0; q < quiet * unitPx; q++) px.push(white);
  let consumed = 0;
  for (const [w, isBlack] of seq) {
    const scale = 1 + skew * (consumed / totalUnits - 0.5); // perspective drift
    consumed += w;
    const n = Math.max(1, Math.round(w * unitPx * scale));
    for (let k = 0; k < n; k++) px.push(isBlack ? black : white);
  }
  for (let q = 0; q < quiet * unitPx; q++) px.push(white);
  return Float64Array.from(px);
}

function boxBlur(line, radius) {
  if (radius <= 0) return line;
  const out = new Float64Array(line.length);
  for (let i = 0; i < line.length; i++) {
    let sum = 0;
    let n = 0;
    for (let k = -radius; k <= radius; k++) {
      const j = i + k;
      if (j >= 0 && j < line.length) {
        sum += line[j];
        n++;
      }
    }
    out[i] = sum / n;
  }
  return out;
}

function addNoise(line, sigma, rng) {
  return Float64Array.from(line, (v) => {
    const g = (rng() + rng() + rng() + rng() - 2) * sigma * 1.7;
    return Math.max(0, Math.min(255, v + g));
  });
}

function toU8(line) {
  return Uint8Array.from(line, (v) => Math.round(v));
}

// --- experiment 1: scanline robustness ------------------------------------

const rng = mulberry32(42);
const scenarios = [
  { name: "clean            ", unit: 6, skew: 0.0, blur: 0, noise: 0, black: 20 },
  { name: "mild             ", unit: 5, skew: 0.15, blur: 1, noise: 6, black: 40 },
  { name: "perspective+blur ", unit: 4, skew: 0.35, blur: 2, noise: 8, black: 60 },
  { name: "faded+noisy      ", unit: 4, skew: 0.25, blur: 2, noise: 12, black: 110 },
  { name: "harsh            ", unit: 3, skew: 0.4, blur: 2, noise: 14, black: 120 },
];

console.log("[scanline] 400 random ids per scenario");
let anyFail = false;
for (const sc of scenarios) {
  let ok = 0;
  let wrong = 0;
  for (let t = 0; t < 400; t++) {
    const id = 1 + Math.floor(rng() * CODE_MAX);
    let line = renderLine(id, sc.unit, sc.skew, rng, { black: sc.black });
    line = boxBlur(line, sc.blur);
    line = addNoise(line, sc.noise, rng);
    const ids = decodeLine(toU8(line));
    if (ids.includes(id)) ok++;
    if (ids.some((x) => x !== id)) wrong++;
  }
  const status = wrong === 0 ? "" : "  <-- FALSE DECODES!";
  if (wrong > 0) anyFail = true;
  console.log(`  ${sc.name} decoded ${(ok / 4).toFixed(1)}%  wrong ${wrong}${status}`);
}

// --- experiment 2: full-frame angled scan ----------------------------------

function renderFrame(id, angleDeg, unitPx) {
  const w = 900;
  const h = 700;
  const img = new Uint8Array(w * h).fill(200);
  const line = toU8(boxBlur(renderLine(id, unitPx, 0.1, rng, { black: 50 }), 1));
  const strip = 26; // strip height in px
  const rad = (angleDeg * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 3;
  // 0.5 px steps to avoid rotation aliasing holes in the synthetic render
  for (let s = 0; s < line.length; s += 0.5) {
    for (let t = 0; t < strip; t += 0.5) {
      const lx = s - line.length / 2;
      const ly = t - strip / 2;
      const x = Math.round(cx + lx * Math.cos(rad) - ly * Math.sin(rad));
      const y = Math.round(cy + lx * Math.sin(rad) + ly * Math.cos(rad));
      if (x >= 0 && x < w && y >= 0 && y < h) img[y * w + x] = line[Math.floor(s)];
    }
  }
  return { data: img, width: w, height: h };
}

console.log("\n[frame] rotated strip in a 900x700 frame, 40 ids per angle");
for (const angle of [0, 8, 15, -12, 90, 97, 180]) {
  let ok = 0;
  let wrong = 0;
  for (let t = 0; t < 40; t++) {
    const id = 1 + Math.floor(rng() * CODE_MAX);
    const res = decodeGray(renderFrame(id, angle, 5));
    if (res && res.id === id) ok++;
    else if (res) wrong++;
  }
  const status = wrong === 0 ? "" : "  <-- FALSE DECODES!";
  if (wrong > 0) anyFail = true;
  console.log(`  angle ${String(angle).padStart(4)}deg: decoded ${ok}/40  wrong ${wrong}${status}`);
}

// --- experiment 3: false-positive hunt on noise ----------------------------

console.log("\n[false positives] 300 pure-noise frames");
let fp = 0;
for (let t = 0; t < 300; t++) {
  const w = 600;
  const h = 400;
  const img = new Uint8Array(w * h);
  for (let i = 0; i < img.length; i++) img[i] = Math.floor(rng() * 256);
  const res = decodeGray(img.length ? { data: img, width: w, height: h } : null);
  if (res) fp++;
}
console.log(`  false decodes: ${fp}/300${fp > 0 ? "  <-- FALSE DECODES!" : ""}`);
if (fp > 0) anyFail = true;

console.log(anyFail ? "\nRESULT: FAILURES PRESENT" : "\nRESULT: all clean");
process.exit(anyFail ? 1 : 0);
