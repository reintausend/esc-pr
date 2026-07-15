import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:8000";
const shots = "./shots";
fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

function check(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) process.exitCode = 1;
}

// ---- 1. start screen ----
await page.goto(`${BASE}/gui/index.html`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${shots}/01-start.png` });
check("start screen has Start button", await page.locator('[data-action="start"]').count() === 1);
await page.click('[data-action="start"]');
await page.waitForURL("**/entry.html");

// ---- 2. entry page: charset filtering ----
await page.fill("#message-input", "");
await page.type("#message-input", "Hallo % Welt$ 42!");
const filtered = await page.inputValue("#message-input");
check(`entry filters invalid chars ("${filtered}")`, filtered === "HALLO  WELT 42!");
await page.screenshot({ path: `${shots}/02-entry.png` });

// ---- 3. submit -> editor generates ----
await page.click('.region-entry-create button[type="submit"]');
await page.waitForURL("**/editor.html?*");
await page.waitForSelector("#grid-content .symbol-row svg", { timeout: 30000 });
const symbolCount = await page.locator("#grid-content .symbol-row").count();
check(`editor rendered symbols (${symbolCount} rows)`, symbolCount > 0);
check("word count updated", (await page.textContent("#word-count")) === "3");
const charCountVal = await page.textContent("#char-count");
check(`char count updated (${charCountVal})`, Number(charCountVal) > 0);
const tickerText = await page.textContent(".ticker__text");
check(`ticker shows message ("${tickerText}")`, tickerText.includes("HALLO"));
await page.waitForTimeout(500);
await page.screenshot({ path: `${shots}/03-editor.png` });

const svgBefore = await page.evaluate(() =>
  document.querySelector("#grid-content svg path").getAttribute("d")
);

// ---- 4. slider drag (rounded edges) changes geometry ----
const slider = page.locator('[data-id="rounded-edges"]');
const box = await slider.boundingBox();
await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(400);
const svgAfterRound = await page.evaluate(() =>
  document.querySelector("#grid-content svg path").getAttribute("d")
);
check("rounded-edges slider changes geometry", svgAfterRound !== svgBefore);

// ---- 5. outline switch ----
await page.click('#fill-outline-switch [data-value="outline"]');
await page.waitForTimeout(400);
const mergedVisible = await page.evaluate(() => {
  const m = document.querySelector("#grid-content svg path.glyph-merged");
  return m && m.style.display !== "none" && (m.getAttribute("d") || "").length > 0;
});
check("outline mode shows merged path", Boolean(mergedVisible));
await page.screenshot({ path: `${shots}/04-editor-outline.png` });
await page.click('#fill-outline-switch [data-value="fill"]');

// ---- 6. randomize syncs GUI ----
const sizeBefore = await page.getAttribute('[data-id="size"]', "data-value");
await page.click('[data-action="randomize"]');
await page.waitForTimeout(500);
const sizeAfter = await page.getAttribute('[data-id="size"]', "data-value");
const anyChanged = await page.evaluate(() =>
  ["rounded-edges", "stroke", "tweak-horizontal", "tweak-vertical", "size"]
    .map((id) => document.querySelector(`[data-id="${id}"]`).dataset.value)
    .join(",")
);
console.log(`  randomize slider values: ${anyChanged} (size ${sizeBefore} -> ${sizeAfter})`);
await page.screenshot({ path: `${shots}/05-editor-random.png` });

// ---- 7. print (server offline): stores entry, reports print failure ----
await page.click('[data-action="print"]');
await page.waitForFunction(
  () => /Gespeichert|Fehler|Gedruckt/.test(document.querySelector("#status-line").textContent),
  { timeout: 20000 }
);
const status = await page.textContent("#status-line");
console.log(`  status after print: ${status}`);
check("print stored entry despite offline server", /Gespeichert als #\d+/.test(status));

const stored = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("secret-receipts-db") || "[]")
);
check(`store has entry (code ${stored[0]?.code})`, stored.length === 1 && stored[0].code >= 1);
check("stored text matches message", stored[0]?.text === "HALLO  WELT 42!");
check("stored image is a PNG data url", (stored[0]?.image_url || "").startsWith("data:image/png"));

if (stored[0]?.image_url) {
  const b64 = stored[0].image_url.split(",")[1];
  fs.writeFileSync(`${shots}/06-part1-receipt.png`, Buffer.from(b64, "base64"));
}

// ---- 8. store lookup via getByCode (what the scan page does after decode) ----
const lookedUp = await page.evaluate(async (code) => {
  const { createStore } = await import("/barcode_system/site/shared/store.js");
  const entry = await createStore().getByCode(code);
  return entry?.text || null;
}, stored[0].code);
check("getByCode resolves message (scan-page path)", lookedUp === "HALLO  WELT 42!");

// ---- 9. scan page loads without errors ----
await page.goto(`${BASE}/barcode_system/site/scan/index.html`);
await page.waitForTimeout(800);
check("scan page loads", (await page.title()) !== "");

// ---- 10. back button preserves message ----
await page.goto(`${BASE}/gui/editor.html?message=TEST`);
await page.waitForSelector("#grid-content .symbol-row svg", { timeout: 30000 });
await page.click('[data-action="back"]');
await page.waitForURL("**/entry.html?*");
check("back returns to entry with message", (await page.inputValue("#message-input")) === "TEST");

const realErrors = errors.filter(
  (e) => !e.includes("net::ERR_CONNECTION_REFUSED") && !e.includes("Failed to load resource")
);
check(`no unexpected page errors (${realErrors.length})`, realErrors.length === 0);
if (realErrors.length) console.log(realErrors.join("\n"));

await browser.close();
console.log("done");
