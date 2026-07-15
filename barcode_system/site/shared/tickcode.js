// Tick code: a custom 1D symbology that carries a short number (the id of
// a stored message) on the receipt without looking like a barcode or QR.
//
// Appearance: a strip of small vertical ticks with varying heights, like a
// rhythm notation or skyline. The HEIGHTS are decorative randomness; only
// the WIDTHS carry data (narrow = 0, wide = 1), so the decoration costs
// nothing in robustness.
//
// Payload: 12-bit id (1..4095) + CRC-8 = 20 bits.
// Structure (widths in units, narrow = 1, wide = 2.5):
//   quiet | bar W, gap W, bar 1, gap 1 | 20 x (data bar, gap 1) |
//   bar 1, gap 1, bar W | quiet
// The wide gap after the first bar makes the code asymmetric, so a strip
// read backwards fails structurally instead of decoding to a wrong id.
// All other gaps are narrow, letting the decoder re-estimate the module
// size continuously along the strip (tolerates perspective).
//
// This module is dependency-free and runs in the browser and in Node
// (decode operates on a plain grayscale array).

const ID_BITS = 12;
const PAYLOAD_BITS = 20; // id + crc8
const WIDE = 2.5;

export const CODE_MIN = 1;
export const CODE_MAX = (1 << ID_BITS) - 1; // 4095

// --- payload --------------------------------------------------------------

function crc8(bytes) {
  let c = 0;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) {
      c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
    }
  }
  return c;
}

export function packPayload(id) {
  if (id < CODE_MIN || id > CODE_MAX) throw new Error(`id out of range: ${id}`);
  return (id << 8) | crc8([(id >> 8) & 0xff, id & 0xff]);
}

export function unpackPayload(payload) {
  const id = (payload >> 8) & CODE_MAX;
  const check = payload & 0xff;
  if (id < CODE_MIN || crc8([(id >> 8) & 0xff, id & 0xff]) !== check) return null;
  return id;
}

// --- encoding ---------------------------------------------------------------

/**
 * Full module sequence for a payload as [widthUnits, isBlack] pairs,
 * excluding quiet zones.
 */
export function moduleSequence(payload) {
  const seq = [
    [WIDE, true],
    [WIDE, false], // asymmetry marker: the only wide gap
    [1, true],
    [1, false],
  ];
  for (let k = PAYLOAD_BITS - 1; k >= 0; k--) {
    seq.push([(payload >> k) & 1 ? WIDE : 1, true]);
    seq.push([1, false]);
  }
  seq.push([1, true], [1, false], [WIDE, true]);
  return seq;
}

/**
 * Draw the tick strip onto a canvas 2d context. Ticks are bottom-anchored
 * with pseudo-random heights (seeded by the id, so reprints look the same).
 * Returns the pixel width actually used.
 */
export function drawTickCode(ctx, id, x, y, maxWidth, height) {
  const seq = moduleSequence(packPayload(id));
  const totalUnits = seq.reduce((a, [w]) => a + w, 0);
  const unit = Math.max(3, Math.floor(maxWidth / totalUnits));

  const widths = seq.map(([w]) => Math.round(w * unit));
  const totalPx = widths.reduce((a, b) => a + b, 0);

  const rng = mulberry32(id * 2654435761);
  let cx = x + Math.floor((maxWidth - totalPx) / 2);
  ctx.fillStyle = "#000";
  for (let i = 0; i < seq.length; i++) {
    if (seq[i][1]) {
      // heights vary 72%..100%: decorative, and keeps a wide horizontal
      // band in which a scanline still crosses every tick
      const h = Math.round(height * (0.72 + rng() * 0.28));
      ctx.fillRect(cx, y + height - h, widths[i], h);
    }
    cx += widths[i];
  }
  return totalPx;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- decoding ---------------------------------------------------------------

const BAR_COUNT = 2 + PAYLOAD_BITS + 2; // 24 bars
const RUNS_NEEDED = BAR_COUNT * 2 - 1; // 47 runs (bars + gaps)

/**
 * Decode from a grayscale image { data: Uint8Array/Uint8ClampedArray,
 * width, height }. Scans straight and tilted lines in horizontal and
 * vertical orientation, both reading directions, so the receipt may be
 * held rotated roughly +-20 degrees, sideways, or upside down.
 *
 * Returns { id, hits } for the strongest candidate or null.
 */
export function decodeGray(img, opts = {}) {
  const spacing = opts.spacing ?? 4;
  const angles = opts.angles ?? [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];
  const counts = new Map();

  for (const base of [0, Math.PI / 2]) {
    for (const a of angles) {
      for (const line of sampleLines(img, base + a, spacing)) {
        for (const id of decodeLine(line)) {
          counts.set(id, (counts.get(id) || 0) + 1);
        }
      }
    }
  }

  let best = null;
  for (const [id, hits] of counts) {
    if (!best || hits > best.hits) best = { id, hits };
  }
  return best;
}

/** Sample gray values along parallel lines at the given angle. */
function* sampleLines(img, angle, spacing) {
  const { data, width: w, height: h } = img;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const nx = -dy;
  const ny = dx;

  const corners = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];
  const offs = corners.map(([cx, cy]) => cx * nx + cy * ny);
  const minO = Math.min(...offs);
  const maxO = Math.max(...offs);

  for (let o = minO + spacing / 2; o < maxO; o += spacing) {
    // clip line { (o*nx + t*dx, o*ny + t*dy) } against the image rect
    let tMin = -Infinity;
    let tMax = Infinity;
    const px = o * nx;
    const py = o * ny;
    if (Math.abs(dx) > 1e-9) {
      const t1 = (0 - px) / dx;
      const t2 = (w - 1 - px) / dx;
      tMin = Math.max(tMin, Math.min(t1, t2));
      tMax = Math.min(tMax, Math.max(t1, t2));
    } else if (px < 0 || px > w - 1) continue;
    if (Math.abs(dy) > 1e-9) {
      const t1 = (0 - py) / dy;
      const t2 = (h - 1 - py) / dy;
      tMin = Math.max(tMin, Math.min(t1, t2));
      tMax = Math.min(tMax, Math.max(t1, t2));
    } else if (py < 0 || py > h - 1) continue;

    const len = Math.floor(tMax - tMin);
    if (len < 100) continue;

    const line = new Uint8Array(len);
    for (let k = 0; k < len; k++) {
      const t = tMin + k;
      const xi = Math.round(px + t * dx);
      const yi = Math.round(py + t * dy);
      line[k] = data[yi * w + xi];
    }
    yield line;
  }
}

/** Decode all valid payloads found on one scanline (both directions). */
export function decodeLine(line) {
  let min = 255;
  let max = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] < min) min = line[i];
    if (line[i] > max) max = line[i];
  }
  if (max - min < 50) return []; // no contrast, no code here

  // Faded thermal prints and glare shift the ideal threshold, so try a few.
  const ids = [];
  for (const f of [0.5, 0.35, 0.65]) {
    const thr = min + (max - min) * f;
    const runs = [];
    let cur = line[0] < thr;
    let len = 0;
    for (let i = 0; i < line.length; i++) {
      const black = line[i] < thr;
      if (black === cur) {
        len++;
      } else {
        runs.push({ len, black: cur });
        cur = black;
        len = 1;
      }
    }
    runs.push({ len, black: cur });

    scanRuns(runs, ids);
    runs.reverse();
    scanRuns(runs, ids);
    if (ids.length) break; // good threshold found
  }
  return ids;
}

function scanRuns(runs, out) {
  for (let i = 1; i + RUNS_NEEDED - 1 < runs.length; i++) {
    if (!runs[i].black) continue;
    const id = tryDecodeAt(runs, i);
    if (id !== null) out.push(id);
  }
}

function tryDecodeAt(runs, i) {
  // start: wide bar, wide gap, narrow bar, narrow gap
  const b1 = runs[i + 2].len;
  const g1 = runs[i + 3].len;
  let unit = (b1 + g1) / 2;
  if (unit < 1) return null;

  const b0 = runs[i].len / unit;
  const g0 = runs[i + 1].len / unit;
  if (b0 < 1.7 || b0 > 3.8) return null;
  if (g0 < 1.7 || g0 > 3.8) return null;
  if (b1 / unit > 1.5 || b1 / unit < 0.5) return null;

  // quiet zone before
  if (runs[i - 1].black || runs[i - 1].len < 2.5 * unit) return null;

  // 20 data bars with narrow gaps; re-estimate unit from each gap
  let payload = 0;
  for (let k = 0; k < PAYLOAD_BITS; k++) {
    const bar = runs[i + 4 + 2 * k];
    const gap = runs[i + 5 + 2 * k];
    const r = bar.len / unit;
    if (r > 3.8 || r < 0.4) return null;
    payload = (payload << 1) | (r > 1.6 ? 1 : 0);
    if (gap.len < 0.4 * unit || gap.len > 1.9 * unit) return null;
    unit = 0.75 * unit + 0.25 * gap.len;
  }

  // stop: narrow bar, narrow gap, wide bar
  const base = i + 4 + 2 * PAYLOAD_BITS;
  const sb = runs[base].len / unit;
  const sg = runs[base + 1].len / unit;
  const sw = runs[base + 2].len / unit;
  if (sb > 1.6 || sb < 0.4) return null;
  if (sg > 1.9 || sg < 0.4) return null;
  if (sw < 1.7 || sw > 3.8) return null;

  // quiet zone after (or end of line)
  const after = runs[base + 3];
  if (after && (after.black || after.len < 2.5 * unit)) return null;

  return unpackPayload(payload);
}
