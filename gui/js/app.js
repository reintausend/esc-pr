/*
  Glue module for the editor stage (editor.html).

  Connects the three packages without owning any of their logic:
    generator/  — generate(message) + Editor effect pipeline (behavior)
    gui/        — this shell: fr:* events from sliders/switch/buttons
    barcode_system/ — store, receipt composition, two-part print

  Responsibilities:
    - read ?message=, run the generator, render symbols into #canvas-panel
    - map fr:* events onto the (headless) PreviewToolHost
    - keep word/char stats and ticker text in sync with the real message
    - Print: serialize the live grid -> composeReceipt (part 1, artwork
      only) -> store under a fresh code -> POST /print + /print-receipt
      (part 2 carries the scannable tick strip with the same code)
*/

import { generate } from "../../generator/Generator/generator.js";
import { CONFIG as GEN_CONFIG } from "../../generator/Generator/config.js";
import { PreviewToolHost } from "../../generator/Editor/preview/PreviewToolHost.js";
import { rebuildTotalSvgFromGrid } from "../../generator/Editor/preview/serializeGrid.js";
import { normalizeShapesToPaths } from "../../generator/Editor/preview/normalizeShapes.js";

import { CONFIG } from "../../barcode_system/site/shared/config.js";
import { createStore } from "../../barcode_system/site/shared/store.js";
import { composeReceipt, canvasToPngBlob } from "../../barcode_system/site/shared/render.js";
import { CODE_MIN, CODE_MAX } from "../../barcode_system/site/shared/tickcode.js";

const gridContent = document.getElementById("grid-content");
const wordCount = document.getElementById("word-count");
const charCount = document.getElementById("char-count");
const statusLine = document.getElementById("status-line");
const fillOutlineSwitch = document.getElementById("fill-outline-switch");
const tickerSource = document.querySelector(".ticker__source");

const query = new URLSearchParams(window.location.search);
const message = (query.get("message") || "").trim();

let host = null;
let store = null;
let printing = false;

/* ---------- status + stats ---------- */

function setStatus(text) {
  statusLine.textContent = text;
}

function updateStats(stats) {
  const words = message.split(/\s+/).filter(Boolean).length;
  wordCount.textContent = String(words);
  charCount.textContent = String(stats?.charCount ?? message.replace(/\s+/g, "").length);
}

function showGridMessage(text) {
  gridContent.innerHTML = "";
  const box = document.createElement("div");
  box.className = "grid-message";
  box.textContent = text;
  gridContent.appendChild(box);
}

/* ---------- GUI state -> editor options ---------- */

function sliderValue(id) {
  const el = document.querySelector(`[data-component="slider"][data-id="${id}"]`);
  return el ? Number(el.dataset.value) || 0 : 0;
}

function setSliderValue(id, value) {
  const el = document.querySelector(`[data-component="slider"][data-id="${id}"]`);
  if (!el) return;
  const min = Number(el.dataset.min ?? 0);
  const max = Number(el.dataset.max ?? 100);
  const clamped = Math.min(max, Math.max(min, value));
  el.dataset.value = String(clamped);
  el.style.setProperty("--value", (((clamped - min) / (max - min)) * 100).toFixed(2));
}

function switchValue() {
  return (
    fillOutlineSwitch?.querySelector(".switch__option.is-active")?.dataset.value ?? "fill"
  );
}

function setSwitchValue(value) {
  if (!fillOutlineSwitch) return;
  for (const option of fillOutlineSwitch.querySelectorAll(".switch__option")) {
    option.classList.toggle("is-active", option.dataset.value === value);
  }
}

/*
  Slider ranges match the Editor effect strengths (0..100). Mode and
  point-affect flags have no GUI controls and keep the old panel defaults
  (relative, anchors + in-handles).
*/
function optionsFromGui() {
  return {
    horizontalStrength: sliderValue("tweak-horizontal"),
    verticalStrength: sliderValue("tweak-vertical"),
    cornerRounding: sliderValue("rounded-edges"),
    strokeWidth: sliderValue("stroke"),
    sizePercent: sliderValue("size"),
    mode: "relative",
    affectAnchors: true,
    affectInHandles: true,
    affectOutHandles: false,
    display: switchValue(),
  };
}

function syncGuiFromOptions(options) {
  setSliderValue("tweak-horizontal", options.horizontalStrength ?? 0);
  setSliderValue("tweak-vertical", options.verticalStrength ?? 0);
  setSliderValue("rounded-edges", options.cornerRounding ?? 0);
  setSliderValue("stroke", options.strokeWidth ?? 0);
  setSliderValue("size", options.sizePercent ?? 35);
  setSwitchValue(options.display === "outline" ? "outline" : "fill");
}

/* ---------- rendering (ported from the old Glyphs preview.js) ---------- */

function renderSymbols(arrangement) {
  gridContent.innerHTML = "";
  arrangement.items.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `symbol-row symbol-row--${item.alignment}`;
    if (index > 0) {
      wrapper.style.marginTop = `${GEN_CONFIG.SYMBOL_SPACING_MM}mm`;
    }
    wrapper.innerHTML = item.svg.markup;

    const svgElement = wrapper.querySelector("svg");
    svgElement.style.width = `${item.mmWidth}mm`;
    svgElement.style.height = `${item.mmHeight}mm`;

    gridContent.appendChild(wrapper);
  });
}

/* ---------- print pipeline (ported from barcode station main.js) ---------- */

/** Pick a random id (1..4095) not used by any stored entry. */
function pickCode(entries) {
  const used = new Set(entries.map((e) => e.code));
  if (used.size >= CODE_MAX) throw new Error("Alle Codes aufgebraucht.");
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
  if (!res.ok) throw new Error(`Druckserver antwortet ${res.status}`);
  return res.json();
}

/** Part 2: the info receipt, printed as its own cut, carrying the same code. */
async function sendInfoReceipt(code) {
  const res = await fetch(`${CONFIG.printHelperUrl}/print-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, link: CONFIG.decodeUrl || undefined }),
  });
  if (!res.ok) throw new Error(`Druckserver antwortet ${res.status}`);
  return res.json();
}

async function onPrint() {
  if (printing || !host) return;
  printing = true;

  try {
    const svg = rebuildTotalSvgFromGrid(gridContent);
    if (!svg) throw new Error("Nichts zu drucken.");

    setStatus("Speichern …");
    const entries = await store.list();
    const code = pickCode(entries);

    const canvas = await composeReceipt(svg);
    const blob = await canvasToPngBlob(canvas);
    await store.add({ id: crypto.randomUUID(), code, text: message }, blob);
    setStatus(`Gespeichert als #${code} (${store.mode})`);

    try {
      setStatus(`Drucke Teil 1 (Kunstwerk) …`);
      await sendToPrinter(blob);
      setStatus(`Drucke Teil 2 (Info-Beleg #${code}) …`);
      await sendInfoReceipt(code);
      setStatus(`Gedruckt – Code #${code}`);
    } catch (printError) {
      const hint =
        /Failed to fetch|Load failed|NetworkError|ECONNREFUSED/i.test(String(printError.message))
          ? ` Druckserver nicht erreichbar – starte: cd barcode_system/epson && ./start_print_server.sh`
          : "";
      setStatus(`Gespeichert als #${code}, aber Druck fehlgeschlagen: ${printError.message}.${hint}`);
    }
  } catch (error) {
    setStatus(`Fehler: ${error.message}`);
  } finally {
    printing = false;
  }
}

/* ---------- event wiring ---------- */

function applyGuiOptions() {
  if (host) host.setOptions(optionsFromGui());
}

document.addEventListener("fr:slider-input", applyGuiOptions);
document.addEventListener("fr:slider-change", applyGuiOptions);
document.addEventListener("fr:switch-change", applyGuiOptions);

document.addEventListener("fr:action", (event) => {
  const { action } = event.detail;
  if (action === "back") {
    const target = new URL("entry.html", window.location.href);
    if (message) target.searchParams.set("message", message);
    window.location.href = target.toString();
  } else if (action === "randomize") {
    if (!host) return;
    const options = host.randomize();
    syncGuiFromOptions(options);
  } else if (action === "print") {
    onPrint();
  }
});

/* ---------- boot ---------- */

if (tickerSource && message) {
  tickerSource.textContent = message;
}

async function run() {
  store = createStore();
  updateStats(null);

  if (!message) {
    showGridMessage("Keine Nachricht übergeben.\nBitte zurück zur Eingabe.");
    setStatus("Keine Eingabe");
    return;
  }

  showGridMessage("Symbole werden generiert …");
  setStatus(`Generiere … (${store.mode === "supabase" ? "Cloud" : "Offline"})`);

  try {
    const result = await generate(message);
    if (!result.ok) {
      showGridMessage(
        result.invalidChars?.length
          ? `Unzulässige Zeichen in der Eingabe: ${result.invalidChars.join(" ")}`
          : "Die Eingabe enthält keine verwertbaren Zeichen."
      );
      setStatus("Ungültige Eingabe");
      return;
    }

    renderSymbols(result.arrangement);
    updateStats(result.stats);

    normalizeShapesToPaths(gridContent);
    host = new PreviewToolHost({ gridContent });
    host.setOptions(optionsFromGui());

    setStatus(store.mode === "supabase" ? "Bereit (Cloud)" : "Bereit (Offline)");
  } catch (error) {
    showGridMessage(
      `Fehler beim Generieren: ${error.message}\n\n` +
        "Hinweis: Die Seite muss über einen lokalen Webserver laufen, " +
        "damit die SVG-Dateien geladen werden können."
    );
    setStatus("Fehler");
  }
}

run();
