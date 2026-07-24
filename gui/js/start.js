/*
  Start screen: navigation + 8 falling graphic double-columns.

  The stage is 16 grid columns wide; each graphics lane spans 2
  (= 320 design-px). Between MIN_ACTIVE and MAX_ACTIVE lanes are live;
  the active set is re-rolled periodically toward a sparse random subset.

  Per active column:
    - One SVG file, rendered as TWO stacked copies of that same file.
    - They scroll as a seamless marquee (classic dual-tile loop): when
      the lower copy exits below the bottom, it is reattached above the
      upper one — no teleport gap, continuous motion.
    - On page load, phases are staggered so strips are already visible
      and not synchronized.

  Positions stay in Figma design units (2560 x 1440) and scale to
  pixels only when rendering.
*/

import { initBlackBar, rememberBlackBar } from "./black-bar.js";

const STRIP_COUNT = 8;
const STRIP_BASE = "assets/graphics_startscreen/";

const DESIGN_W = 2560;
const DESIGN_H = 1440;
const LANE_COUNT = 8;
const LANE_W = DESIGN_W / LANE_COUNT;

const SIDE_PAD = 36;

const MIN_SCALE = 0.75;
const MAX_SCALE = 0.95;
/* Natural receipt aspect is ~6–9× width; allow tall strips so the
   dual-tile seam sits at the real artwork ends, not a cropped mid-cut. */
const MAX_HEIGHT = DESIGN_H * 2.4;

const MIN_SPEED = 70;
const MAX_SPEED = 210;

const MIN_ACTIVE = 4;
const MAX_ACTIVE = 6;

const STREAM_MIN_S = 5;
const STREAM_MAX_S = 20;

const COOLDOWN_MIN_S = 1.2;
const COOLDOWN_MAX_S = 3.5;

/* How often to re-roll which columns should be live */
const RETARGET_MIN_S = 4;
const RETARGET_MAX_S = 9;

const stage = document.querySelector(".stage");
const lanesRoot = document.getElementById("graphics-lanes");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const randRange = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(randRange(min, max + 1));

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

initBlackBar(document.getElementById("black-bar"), 6);

/* Re-paint SVG mask text after Funnel Display finishes loading */
function refreshStartTitleMask() {
  const svg = document.querySelector(".start-header__svg");
  if (!svg) return;
  /* Force a reflow so mask text picks up the webfont */
  svg.style.display = "none";
  void svg.getBoundingClientRect();
  svg.style.display = "block";
}

if (document.fonts?.ready) {
  document.fonts.ready.then(refreshStartTitleMask);
}

/* ---------- navigation ---------- */

document.addEventListener("fr:action", (event) => {
  if (event.detail.action === "start") {
    rememberBlackBar(6);
    window.location.href = "entry.html";
  }
});

/* ---------- strip preload ---------- */

function loadAspects() {
  const jobs = Array.from({ length: STRIP_COUNT }, (_, i) => {
    const src = `${STRIP_BASE}${i + 1}.svg`;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({ src, aspect: img.naturalHeight / img.naturalWidth });
      img.onerror = () => resolve(null);
      img.src = src;
    });
  });
  return Promise.all(jobs).then((list) => list.filter(Boolean));
}

/* ---------- random active-set picker (prefer gaps) ---------- */

function sparseness(sortedIndices) {
  if (sortedIndices.length <= 1) return 0;
  let score = 0;
  for (let i = 1; i < sortedIndices.length; i += 1) {
    const gap = sortedIndices[i] - sortedIndices[i - 1];
    score += gap * gap; // reward larger gaps
    if (gap === 1) score -= 8; // penalize adjacency
  }
  // wrap-around gap (lane 7 next to 0)
  const wrap = sortedIndices[0] + LANE_COUNT - sortedIndices[sortedIndices.length - 1];
  score += wrap * wrap;
  if (wrap === 1) score -= 8;
  return score;
}

function pickSparseSubset(count) {
  const pool = Array.from({ length: LANE_COUNT }, (_, i) => i);
  let best = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    shuffleInPlace(pool);
    const set = pool.slice(0, count).sort((a, b) => a - b);
    const score = sparseness(set) + Math.random() * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = set;
    }
  }
  return best;
}

/* ---------- lanes ---------- */

function createLane(index, el, sources) {
  return {
    index,
    el,
    sources,
    copies: null, // [img, img] while active
    sourceIndex: -1,
    w: 0,
    h: 0,
    x: 0,
    offset: 0, // y of the lower tile; upper tile at offset - h
    speed: 0,
    looping: false,
    draining: false,
    streamEndsAt: 0,
    cooldownUntil: 0,
  };
}

function contentWidth() {
  return LANE_W - SIDE_PAD * 2;
}

function usedSourceIndices(lanes) {
  const used = new Set();
  for (const lane of lanes) {
    if (lane.copies && lane.sourceIndex >= 0) used.add(lane.sourceIndex);
  }
  return used;
}

function pickSourceIndex(lane, lanes) {
  const used = usedSourceIndices(lanes);
  const free = [];
  for (let i = 0; i < lane.sources.length; i += 1) {
    if (!used.has(i) || i === lane.sourceIndex) free.push(i);
  }
  const pool = free.length > 0 ? free : lane.sources.map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}

function measureStrip(source, scale) {
  const maxW = contentWidth();
  let width = maxW * scale;
  let height = width * source.aspect;
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT;
    width = height / source.aspect;
  }
  return {
    w: width,
    h: height,
    x: SIDE_PAD + randRange(0, Math.max(0, maxW - width)),
  };
}

function makeImg(src) {
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.draggable = false;
  return img;
}

/**
 * @param {"visible"|"above"} placement
 */
function startStream(lane, lanes, now, placement = "above") {
  if (lane.copies) endStream(lane, now, { immediate: true });

  const sourceIndex = pickSourceIndex(lane, lanes);
  const source = lane.sources[sourceIndex];
  const size = measureStrip(source, randRange(MIN_SCALE, MAX_SCALE));

  const a = makeImg(source.src);
  const b = makeImg(source.src);
  lane.el.append(a, b);

  lane.copies = [a, b];
  lane.sourceIndex = sourceIndex;
  lane.w = size.w;
  lane.h = size.h;
  lane.x = size.x;
  lane.speed = randRange(MIN_SPEED, MAX_SPEED);
  lane.looping = true;
  lane.draining = false;
  lane.streamEndsAt = now + randRange(STREAM_MIN_S, STREAM_MAX_S);

  if (placement === "visible") {
    // Random phase across one full tile period so columns aren't synced.
    lane.offset = randRange(-size.h, DESIGN_H);
  } else {
    // First tile just above the top; second further above.
    lane.offset = -size.h;
  }
}

function endStream(lane, now, { immediate = false } = {}) {
  if (immediate && lane.copies) {
    for (const img of lane.copies) img.remove();
    lane.copies = null;
  }
  lane.looping = false;
  lane.draining = !immediate && lane.copies !== null;
  if (immediate) {
    lane.sourceIndex = -1;
    lane.draining = false;
    lane.cooldownUntil = now + randRange(COOLDOWN_MIN_S, COOLDOWN_MAX_S);
  }
}

function finishDrain(lane, now) {
  if (lane.copies) {
    for (const img of lane.copies) img.remove();
    lane.copies = null;
  }
  lane.sourceIndex = -1;
  lane.draining = false;
  lane.looping = false;
  lane.cooldownUntil = now + randRange(COOLDOWN_MIN_S, COOLDOWN_MAX_S);
}

function isBusy(lane) {
  return lane.looping || lane.draining || lane.copies !== null;
}

function renderLane(lane, scale) {
  if (!lane.copies) return;
  const [a, b] = lane.copies;
  const w = `${lane.w * scale}px`;
  a.style.width = w;
  b.style.width = w;
  a.style.transform =
    `translate3d(${lane.x * scale}px, ${lane.offset * scale}px, 0)`;
  b.style.transform =
    `translate3d(${lane.x * scale}px, ${(lane.offset - lane.h) * scale}px, 0)`;
}

function stepLane(lane, dt, now) {
  if (!lane.copies) return;

  lane.offset += lane.speed * dt;

  if (lane.looping) {
    // Dual-tile wrap: when the lower tile fully exits, shift the period
    // back by one height so the upper tile becomes the new lower one.
    while (lane.offset >= DESIGN_H) {
      lane.offset -= lane.h;
    }

    if (now >= lane.streamEndsAt) {
      lane.looping = false;
      lane.draining = true;
    }
  } else if (lane.draining) {
    // Keep scrolling — remove only once BOTH tiles have left below the
    // stage (upper tile top = offset - h). Never snap-hide mid-frame.
    if (lane.offset - lane.h > DESIGN_H) {
      finishDrain(lane, now);
    }
  }
}

function activeCount(lanes) {
  return lanes.filter((l) => l.looping || l.draining).length;
}

let desiredSet = new Set();
let nextRetargetAt = 0;

function retarget(now) {
  const count = randInt(MIN_ACTIVE, MAX_ACTIVE);
  desiredSet = new Set(pickSparseSubset(count));
  nextRetargetAt = now + randRange(RETARGET_MIN_S, RETARGET_MAX_S);
}

function syncToDesired(lanes, now) {
  for (const lane of lanes) {
    const shouldRun = desiredSet.has(lane.index);

    if (shouldRun && !isBusy(lane) && now >= lane.cooldownUntil) {
      startStream(lane, lanes, now, "above");
    } else if (!shouldRun && lane.looping) {
      // Soft-stop: finish current scroll off-screen, don't wrap again.
      lane.looping = false;
      lane.draining = true;
    }
  }

  // If desired slots are free but we're under the minimum after drains,
  // force-start on desired idle lanes.
  let live = lanes.filter((l) => l.looping).length;
  if (live < MIN_ACTIVE) {
    const wanted = [...desiredSet].filter((i) => {
      const l = lanes[i];
      return !isBusy(l) && now >= l.cooldownUntil;
    });
    shuffleInPlace(wanted);
    for (const i of wanted) {
      if (live >= MIN_ACTIVE) break;
      startStream(lanes[i], lanes, now, "above");
      live += 1;
    }
  }
}

/* ---------- boot ---------- */

async function run() {
  if (!stage || !lanesRoot) return;

  const sources = await loadAspects();
  if (sources.length === 0) return;

  lanesRoot.replaceChildren();
  const lanes = [];
  for (let i = 0; i < LANE_COUNT; i += 1) {
    const el = document.createElement("div");
    el.className = "graphics-lane";
    el.dataset.lane = String(i);
    lanesRoot.appendChild(el);
    lanes.push(createLane(i, el, sources));
  }

  const scaleNow = () => stage.clientWidth / DESIGN_W;
  const renderAll = () => {
    const scale = scaleNow();
    for (const lane of lanes) renderLane(lane, scale);
  };

  const bootTime = performance.now() / 1000;
  retarget(bootTime);

  // Seed the desired columns already visible, staggered phases.
  for (const index of desiredSet) {
    startStream(lanes[index], lanes, bootTime, "visible");
  }

  renderAll();
  new ResizeObserver(renderAll).observe(stage);

  if (reduceMotion) return;

  let lastTime = null;
  const tick = (time) => {
    if (lastTime === null) lastTime = time;
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    const now = time / 1000;

    if (now >= nextRetargetAt) retarget(now);

    for (const lane of lanes) stepLane(lane, dt, now);
    syncToDesired(lanes, now);
    renderAll();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

run();
