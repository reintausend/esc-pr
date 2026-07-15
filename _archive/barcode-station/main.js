import { CONFIG } from "../shared/config.js";
import { createStore } from "../shared/store.js";
import { composeReceipt, canvasToPngBlob } from "../shared/render.js";
import { CODE_MIN, CODE_MAX } from "../shared/tickcode.js";
import { generateArtwork } from "./placeholder-art.js";

const el = {
  message: document.getElementById("messageInput"),
  density: document.getElementById("density"),
  chaos: document.getElementById("chaos"),
  weight: document.getElementById("weight"),
  preview: document.getElementById("previewCanvas"),
  printBtn: document.getElementById("printBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  log: document.getElementById("log"),
  storeMode: document.getElementById("storeMode"),
  offlineNotice: document.getElementById("offlineNotice"),
};

let store = null;
let seed = 1;
let renderPending = false;

function log(msg, cls = "") {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = msg;
  el.log.appendChild(line);
  el.log.scrollTop = el.log.scrollHeight;
}

function clearLog() {
  el.log.textContent = "";
}

function params() {
  return {
    density: el.density.value / 100,
    chaos: el.chaos.value / 100,
    weight: el.weight.value / 100,
  };
}

function validateText(raw) {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return { error: "type a message first" };
  if (text.length > CONFIG.maxChars)
    return { error: `max ${CONFIG.maxChars} characters` };
  if (text.split(" ").length > CONFIG.maxWords)
    return { error: `max ${CONFIG.maxWords} words` };
  return { text };
}

async function renderPreview() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(async () => {
    renderPending = false;
    const { text } = validateText(el.message.value);
    el.printBtn.disabled = !text;
    const svg = generateArtwork(text || "?", params(), seed);
    const canvas = await composeReceipt(svg);
    el.preview.width = canvas.width;
    el.preview.height = canvas.height;
    el.preview.getContext("2d").drawImage(canvas, 0, 0);
  });
}

/** Pick a random id (1..4095) not used by any stored entry. */
function pickCode(entries) {
  const used = new Set(entries.map((e) => e.code));
  if (used.size >= CODE_MAX) throw new Error("all codes used up");
  let code;
  do {
    code = CODE_MIN + Math.floor(Math.random() * (CODE_MAX - CODE_MIN + 1));
  } while (used.has(code));
  return code;
}

async function sendToPrinter(blob) {
  const res = await fetch(`${CONFIG.printHelperUrl}/print`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: blob,
  });
  if (!res.ok) throw new Error(`print server responded ${res.status}`);
  return res.json();
}

/** Part 2: the info receipt, printed as its own cut, carrying the same code. */
async function sendInfoReceipt(code) {
  const res = await fetch(`${CONFIG.printHelperUrl}/print-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, link: CONFIG.decodeUrl || undefined }),
  });
  if (!res.ok) throw new Error(`print server responded ${res.status}`);
  return res.json();
}

async function onPrint() {
  const { text, error } = validateText(el.message.value);
  if (error) {
    clearLog();
    log(error, "err");
    return;
  }
  el.printBtn.disabled = true;
  clearLog();

  try {
    log(`encoding "${text}"`);
    const entries = await store.list();
    const code = pickCode(entries);

    const svg = generateArtwork(text, params(), seed);
    const canvas = await composeReceipt(svg);

    // preview shows the hidden-message print (part 1)
    el.preview.width = canvas.width;
    el.preview.height = canvas.height;
    el.preview.getContext("2d").drawImage(canvas, 0, 0);

    log(`storing as #${code} (${store.mode})...`);
    const blob = await canvasToPngBlob(canvas);
    await store.add({ id: crypto.randomUUID(), code, text }, blob);
    log("stored", "ok");

    log("printing part 1 (hidden message)...");
    try {
      await sendToPrinter(blob);
      log("printed part 1", "ok");

      log(`printing part 2 (info receipt, #${code})...`);
      await sendInfoReceipt(code);
      log("printed part 2", "ok");
    } catch (e) {
      log(`print server unreachable (${e.message}) - use Download PNG`, "err");
    }

    seed++; // next print gets a fresh artwork variant
    log("done - hand over the receipt", "ok");
  } catch (e) {
    console.error(e);
    log(`failed: ${e.message}`, "err");
  } finally {
    el.printBtn.disabled = false;
  }
}

function onDownload() {
  const a = document.createElement("a");
  a.download = "receipt.png";
  a.href = el.preview.toDataURL("image/png");
  a.click();
}

function init() {
  store = createStore();
  el.storeMode.textContent = store.mode === "supabase" ? "cloud: supabase" : "offline";
  el.offlineNotice.classList.toggle("hidden", store.mode === "supabase");

  el.message.maxLength = CONFIG.maxChars;
  [el.message, el.density, el.chaos, el.weight].forEach((i) =>
    i.addEventListener("input", renderPreview)
  );
  el.shuffleBtn.addEventListener("click", () => {
    seed++;
    renderPreview();
  });
  el.downloadBtn.addEventListener("click", onDownload);
  el.printBtn.addEventListener("click", onPrint);

  renderPreview();
  clearLog();
  log("ready - type a message", "ok");
}

init();
