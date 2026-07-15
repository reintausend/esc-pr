// PLACEHOLDER artwork generator.
//
// This module stands in for the real letter-transformation work and will be
// replaced by it. The contract downstream code relies on:
//
//   generateArtwork(text, params, seed) -> SVG string
//
//   - text:   the typed secret message (string)
//   - params: { density, chaos, weight } each in [0, 1] (from the sliders;
//             the real module may define its own parameter set - just keep
//             returning a single self-contained SVG string)
//   - seed:   integer; same inputs must yield the same SVG
//
// The SVG must be pure black shapes on transparent/white background and
// should fill its viewBox reasonably - everything else (margins, ticks,
// print raster, fingerprint) is handled by the pipeline.

export function generateArtwork(text, params, seed) {
  const rng = mulberry32(hashString(`${text}|${seed}`));
  const W = 400;
  const H = 300;
  const shapes = [];

  const count = Math.round(6 + params.density * 18);
  const spread = 0.25 + params.chaos * 0.75;
  const cx = W / 2;
  const cy = H / 2;

  for (let i = 0; i < count; i++) {
    const x = cx + (rng() * 2 - 1) * W * 0.5 * spread;
    const y = cy + (rng() * 2 - 1) * H * 0.5 * spread;
    const size = (12 + rng() * 70) * (0.5 + params.weight);
    const rot = (rng() * 2 - 1) * 180 * params.chaos;
    const kind = Math.floor(rng() * 4);

    if (kind === 0) {
      const w = size;
      const h = size * (0.15 + rng() * 0.5);
      shapes.push(
        `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`
      );
    } else if (kind === 1) {
      const p1 = `${f(x)},${f(y - size / 2)}`;
      const p2 = `${f(x - size / 2)},${f(y + size / 2)}`;
      const p3 = `${f(x + size * (rng() * 0.8))},${f(y + size * (0.2 + rng() * 0.4))}`;
      shapes.push(
        `<polygon points="${p1} ${p2} ${p3}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`
      );
    } else if (kind === 2) {
      const r = size / 2;
      const sweep = rng() > 0.5 ? 1 : 0;
      const ex = x + r * (0.4 + rng());
      const ey = y + r * (rng() * 2 - 1);
      const sw = (3 + rng() * 10) * (0.4 + params.weight);
      shapes.push(
        `<path d="M ${f(x)} ${f(y)} A ${f(r)} ${f(r)} 0 0 ${sweep} ${f(ex)} ${f(ey)}" fill="none" stroke="#000" stroke-width="${f(sw)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`
      );
    } else {
      const w = size * (0.1 + params.weight * 0.25);
      const len = size * (1 + rng());
      shapes.push(
        `<rect x="${f(x)}" y="${f(y - w / 2)}" width="${f(len)}" height="${f(w)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`
      );
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<g fill="#000">${shapes.join("")}</g></svg>`
  );
}

function f(n) {
  return n.toFixed(2);
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
