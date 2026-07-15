/*
  ESC-PR Vector Decryption Client.

  Two views with bottom-tab navigation:
    Scan — camera → decode tick strip → store lookup → reveal message
           (decode logic ported unchanged from the old barcode scan page)
    Feed — all created graphics from the store, images only, newest
           first; the message text is never shown here.

  Storage and codec come from barcode_system/site/shared/ — this page
  owns no tick-code or storage logic.
*/

import { CONFIG } from "../barcode_system/site/shared/config.js";
import { createStore } from "../barcode_system/site/shared/store.js";
import { decodeGray } from "../barcode_system/site/shared/tickcode.js";

const el = {
  startBtn: document.getElementById("startBtn"),
  againBtn: document.getElementById("againBtn"),
  fileBtn: document.getElementById("fileBtn"),
  fileInput: document.getElementById("fileInput"),
  scanner: document.getElementById("scanner"),
  video: document.getElementById("video"),
  status: document.getElementById("status"),
  result: document.getElementById("result"),
  decodedText: document.getElementById("decodedText"),
  decodedImage: document.getElementById("decodedImage"),
  log: document.getElementById("log"),
  storeMode: document.getElementById("storeMode"),
  hint: document.getElementById("hint"),
  feed: document.getElementById("feed"),
  feedEmpty: document.getElementById("feedEmpty"),
  tabs: [...document.querySelectorAll(".tabbar__tab")],
  views: {
    scan: document.getElementById("view-scan"),
    feed: document.getElementById("view-feed"),
  },
};

let store = null;
let stream = null;
let scanTimer = null;
let busy = false;
let lastSeen = null; // id seen in the previous frame (weak single-hit case)

const frameCanvas = document.createElement("canvas");

function log(msg, cls = "") {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = msg;
  el.log.appendChild(line);
  el.log.scrollTop = el.log.scrollHeight;
}

function setStatus(msg) {
  el.status.textContent = msg;
}

/* ---------- tabs ---------- */

function showView(name) {
  for (const tab of el.tabs) {
    tab.classList.toggle("is-active", tab.dataset.view === name);
  }
  for (const [key, view] of Object.entries(el.views)) {
    view.classList.toggle("is-active", key === name);
  }
  if (name !== "scan") stopCamera();
  if (name === "feed") loadFeed();
}

/* ---------- decoding core (ported from the old scan page) ---------- */

function grayFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
    gray[j] = (data[i] * 77 + data[i + 1] * 151 + data[i + 2] * 28) >> 8;
  }
  return { data: gray, width: canvas.width, height: canvas.height };
}

function decodeCanvas(canvas) {
  return decodeGray(grayFromCanvas(canvas));
}

async function scanTick() {
  if (busy) return;
  const vw = el.video.videoWidth;
  const vh = el.video.videoHeight;
  if (!vw || !vh) return;
  busy = true;
  try {
    const scale = Math.min(1, CONFIG.scan.maxFrameSize / Math.max(vw, vh));
    frameCanvas.width = Math.round(vw * scale);
    frameCanvas.height = Math.round(vh * scale);
    frameCanvas
      .getContext("2d", { willReadFrequently: true })
      .drawImage(el.video, 0, 0, frameCanvas.width, frameCanvas.height);

    const t0 = performance.now();
    const res = decodeCanvas(frameCanvas);
    const ms = Math.round(performance.now() - t0);

    if (!res) {
      setStatus(`searching… (${ms} ms)`);
      lastSeen = null;
      return;
    }

    // strong single-frame evidence, or the same id in two consecutive frames
    if (res.hits >= CONFIG.scan.minHitsInstant || res.id === lastSeen) {
      setStatus(`code ${res.id} — looking up…`);
      await resolveCode(res.id);
    } else {
      setStatus(`possible code ${res.id} — hold still`);
      lastSeen = res.id;
    }
  } finally {
    busy = false;
  }
}

async function resolveCode(code) {
  stopCamera();
  try {
    const entry = await store.getByCode(code);
    if (!entry) {
      log(`code ${code} is not in the database`, "err");
      startCamera();
      return;
    }
    showResult(entry);
  } catch (e) {
    log(`lookup failed: ${e.message}`, "err");
    startCamera();
  }
}

/* ---------- camera lifecycle ---------- */

async function startCamera() {
  el.result.classList.add("hidden");
  lastSeen = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
  } catch (e) {
    log(`camera unavailable: ${e.message}`, "err");
    el.fileBtn.classList.remove("hidden");
    return;
  }
  el.video.srcObject = stream;
  await el.video.play();
  el.scanner.classList.remove("hidden");
  el.startBtn.classList.add("hidden");
  setStatus("searching…");
  scanTimer = setInterval(scanTick, CONFIG.scan.frameIntervalMs);
}

function stopCamera() {
  if (scanTimer) clearInterval(scanTimer);
  scanTimer = null;
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  el.scanner.classList.add("hidden");
  el.startBtn.classList.remove("hidden");
}

function showResult(entry) {
  el.decodedText.textContent = entry.text;
  el.decodedImage.src = entry.image_url;
  el.result.classList.remove("hidden");
  el.hint.classList.add("hidden");
  log(`decoded #${entry.code}: "${entry.text}"`, "ok");
}

/* ---------- photo fallback (if getUserMedia fails) ---------- */

async function onFilePicked() {
  const file = el.fileInput.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = async () => {
    const scale = Math.min(
      1,
      CONFIG.scan.maxFrameSize / Math.max(img.width, img.height)
    );
    frameCanvas.width = Math.round(img.width * scale);
    frameCanvas.height = Math.round(img.height * scale);
    frameCanvas
      .getContext("2d", { willReadFrequently: true })
      .drawImage(img, 0, 0, frameCanvas.width, frameCanvas.height);
    const res = decodeCanvas(frameCanvas);
    if (res) {
      await resolveCode(res.id);
    } else {
      log("no code found in that photo — try closer and flatter", "err");
    }
  };
  img.src = URL.createObjectURL(file);
}

/* ---------- feed ---------- */

let feedLoading = false;

async function loadFeed() {
  if (feedLoading) return;
  feedLoading = true;
  try {
    const entries = await store.list();
    el.feed.innerHTML = "";
    el.feedEmpty.classList.toggle("hidden", entries.length > 0);

    // Graphics only — the message text is deliberately never rendered here.
    for (const entry of entries) {
      if (!entry.image_url) continue;
      const item = document.createElement("figure");
      item.className = "feed__item";
      const img = document.createElement("img");
      img.src = entry.image_url;
      img.alt = `graphic #${entry.code}`;
      img.loading = "lazy";
      item.appendChild(img);
      el.feed.appendChild(item);
    }
  } catch (e) {
    el.feedEmpty.classList.remove("hidden");
    el.feedEmpty.textContent = `Feed unavailable: ${e.message}`;
  } finally {
    feedLoading = false;
  }
}

/* ---------- init ---------- */

function init() {
  store = createStore();
  el.storeMode.textContent = store.mode === "supabase" ? "cloud" : "offline";

  el.startBtn.disabled = false;
  el.startBtn.addEventListener("click", startCamera);
  el.againBtn.addEventListener("click", () => {
    el.hint.classList.remove("hidden");
    startCamera();
  });
  el.fileBtn.addEventListener("click", () => el.fileInput.click());
  el.fileInput.addEventListener("change", onFilePicked);

  for (const tab of el.tabs) {
    tab.addEventListener("click", () => showView(tab.dataset.view));
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    el.startBtn.classList.add("hidden");
    el.fileBtn.classList.remove("hidden");
    log("no camera API — photo fallback enabled", "err");
  }

  el.log.textContent = "";
  log("ready — point the camera at a receipt", "ok");
}

init();
