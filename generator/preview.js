/*
  Zweck dieser Datei:
  Interaktionslogik der Preview-Seite.

  - Startet den Generator (Generator/generator.js) mit dem über die
    URL übergebenen Eingabetext.
  - Rendert die erzeugten Symbole auf dem 72,2-mm-Grid (512 dots @ 180 dpi):
    untereinander in Eingabereihenfolge, 2 cm Abstand zwischen den
    Begrenzungskonturen. Punkte/Kommas rechtsbündig, !/? linksbündig,
    Wörter mittig (Regelwerk Kapitel 2 – Satzzeichen).
  - Füllt den Infokasten mit den Generator-Daten.
  - Tweak-Panel links (Editor/preview/TweakPanel.js): alle Symbole im
    Grid werden gleichzeitig bearbeitet.
  - "Save SVG" / "Print" serialisieren das bearbeitete Grid.
  - "Back" führt zur Startseite zurück.
*/

import { generate, downloadSvg } from "./Generator/generator.js";
import { CONFIG } from "./Generator/config.js";

let editorHost = null;

async function loadEditorModules() {
  const [{ PreviewToolHost }, { rebuildTotalSvgFromGrid }, { normalizeShapesToPaths }] =
    await Promise.all([
      import("./Editor/preview/PreviewToolHost.js"),
      import("./Editor/preview/serializeGrid.js"),
      import("./Editor/preview/normalizeShapes.js"),
    ]);
  return { PreviewToolHost, rebuildTotalSvgFromGrid, normalizeShapesToPaths };
}

const PRINT_SERVER = "http://127.0.0.1:8740";

const backButton = document.getElementById("back-button");
const downloadButton = document.getElementById("download-button");
const printButton = document.getElementById("print-button");
const gridContent = document.getElementById("grid-content");
const tweakPanel = document.getElementById("tweak-panel");
const infoBox = document.getElementById("info-box");

let currentTotalSvg = null;

async function syncTotalSvgFromGrid() {
  const { rebuildTotalSvgFromGrid } = await loadEditorModules();
  const rebuilt = rebuildTotalSvgFromGrid(gridContent);
  if (rebuilt) currentTotalSvg = rebuilt;
}

async function initEditor() {
  if (editorHost) {
    editorHost.destroy();
    editorHost = null;
  }

  const { PreviewToolHost, normalizeShapesToPaths } = await loadEditorModules();
  // Weg 1: alle Formen (rect, polygon, …) im gerenderten Grid zu Pfaden
  // machen, damit das Tweak-Werkzeug wirklich ALLE Symbolteile erfasst.
  normalizeShapesToPaths(gridContent);

  editorHost = new PreviewToolHost({
    gridContent,
    panelRoot: tweakPanel,
    onEdit: () => {
      syncTotalSvgFromGrid();
    },
  });
}

backButton.addEventListener("click", () => {
  window.location.href = "index.html";
});

const query = new URLSearchParams(window.location.search);
const message = (query.get("message") || "").trim();

downloadButton.addEventListener("click", async () => {
  await syncTotalSvgFromGrid();
  if (currentTotalSvg) {
    downloadSvg(currentTotalSvg, "glyph-symbole.svg");
  }
});

async function svgToPngBlob(svgString, targetWidthDots) {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("SVG konnte nicht gerendert werden."));
      image.src = url;
    });

    const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
    const svgElement = doc.documentElement;
    const viewBox = (svgElement.getAttribute("viewBox") || "0 0 100 100")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    const vbWidth = viewBox[2] || 100;
    const vbHeight = viewBox[3] || 100;

    // Feste Druckbreite (512 dots): viewBox-Breite = druckbare Fläche, kein Scale-to-fit.
    const targetHeight = Math.max(1, Math.round(targetWidthDots * (vbHeight / vbWidth)));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidthDots;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, targetWidthDots, targetHeight);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob);
        else reject(new Error("PNG-Konvertierung fehlgeschlagen."));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

printButton.addEventListener("click", async () => {
  if (!currentTotalSvg) return;

  printButton.disabled = true;
  const originalLabel = printButton.textContent;
  printButton.textContent = "Printing ...";

  try {
    await syncTotalSvgFromGrid();
    const healthResponse = await fetch(`${PRINT_SERVER}/health`);
    if (!healthResponse.ok) {
      throw new Error("Druckserver nicht erreichbar. Bitte start_print_server.sh ausfuehren.");
    }
    const health = await healthResponse.json();
    if (!health.printer_connected) {
      throw new Error(health.error || "Drucker nicht verbunden.");
    }

    const pngBlob = await svgToPngBlob(currentTotalSvg, health.canvas_width_dots);
    const printResponse = await fetch(`${PRINT_SERVER}/print`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: pngBlob,
    });
    const result = await printResponse.json();
    if (!printResponse.ok || !result.ok) {
      throw new Error(result.error || "Druck fehlgeschlagen.");
    }

    printButton.textContent = "Printed";
    window.setTimeout(() => {
      printButton.textContent = originalLabel;
    }, 1800);
  } catch (error) {
    infoBox.textContent =
      (infoBox.textContent ? infoBox.textContent + "\n\n" : "") +
      "Druckfehler: " + error.message;
    printButton.textContent = originalLabel;
  } finally {
    printButton.disabled = false;
  }
});

function renderSymbols(arrangement) {
  gridContent.innerHTML = "";
  arrangement.items.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `symbol-row symbol-row--${item.alignment}`;
    if (index > 0) {
      wrapper.style.marginTop = `${CONFIG.SYMBOL_SPACING_MM}mm`;
    }
    wrapper.innerHTML = item.svg.markup;

    const svgElement = wrapper.querySelector("svg");
    svgElement.style.width = `${item.mmWidth}mm`;
    svgElement.style.height = `${item.mmHeight}mm`;

    gridContent.appendChild(wrapper);
  });
}

function renderInfo(result) {
  const { stats, results } = result;
  const lines = [
    `Eingabe: ${message}`,
    `Symbole: ${stats.symbolCount}`,
    `Zeichen: ${stats.charCount}`,
    `Fragmente: ${stats.fragmentCount}`,
    `Akzente: ${stats.accentCount}`,
    `Konstruktionsversuche: ${stats.totalAttempts}`,
    `Kompositionskontrolle: ${stats.allPassed ? "bestanden" : "NICHT bestanden"}`,
  ];
  if (!stats.allPassed) {
    lines.push(`Fehlgeschlagene Pruefungen: ${[...new Set(stats.failures)].join(", ")}`);
  }
  const perSymbol = results
    .map((r, i) => `${i + 1}. "${r.symbol.chars.join("")}" – ${r.attempts} Versuch(e)${r.passed ? "" : " (nicht bestanden)"}`)
    .join("\n");
  infoBox.textContent = lines.join("\n") + "\n\n" + perSymbol;
}

async function run() {
  if (!message) {
    infoBox.textContent = "Keine Eingabe uebergeben. Bitte zurueck zur Startseite.";
    return;
  }

  infoBox.textContent = "Symbole werden generiert ...";
  try {
    const result = await generate(message);
    if (!result.ok) {
      infoBox.textContent = result.invalidChars && result.invalidChars.length
        ? `Unzulaessige Zeichen in der Eingabe: ${result.invalidChars.join(" ")}`
        : "Die Eingabe enthaelt keine verwertbaren Zeichen.";
      return;
    }
    currentTotalSvg = result.arrangement.totalSvg;
    renderSymbols(result.arrangement);
    renderInfo(result);
    await initEditor();
  } catch (error) {
    infoBox.textContent =
      "Fehler beim Generieren: " + error.message +
      "\n\nHinweis: Die Seite muss ueber einen lokalen Webserver laufen " +
      "(z. B. python3 -m http.server), damit die SVG-Dateien geladen werden koennen.";
  }
}

run();
