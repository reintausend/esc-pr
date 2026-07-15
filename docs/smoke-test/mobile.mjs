import { chromium } from "playwright";
import fs from "node:fs";

fs.mkdirSync("./shots", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
// iPhone-ish viewport
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

function check(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) process.exitCode = 1;
}

// Seed the offline store with two fake entries (1x1 px PNGs)
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
await page.goto("http://localhost:8000/mobile/index.html");
await page.evaluate((png) => {
  localStorage.setItem(
    "secret-receipts-db",
    JSON.stringify([
      { id: "a", code: 11, text: "FIRST", image_url: png },
      { id: "b", code: 22, text: "SECOND", image_url: png },
    ])
  );
}, png);
await page.reload();
await page.waitForTimeout(600);

check("title header present", (await page.textContent(".topbar__title")).includes("Vector Decryption"));
check("scan view active by default", await page.locator("#view-scan.is-active").count() === 1);
check("store mode shown", ["offline", "cloud"].includes((await page.textContent("#storeMode")).trim()));
check("start button enabled", await page.locator("#startBtn:not([disabled])").count() === 1);
await page.screenshot({ path: "shots/m1-scan.png" });

// switch to feed
await page.click('.tabbar__tab[data-view="feed"]');
await page.waitForTimeout(400);
check("feed view active after tab", await page.locator("#view-feed.is-active").count() === 1);
check("feed shows 2 graphics", (await page.locator(".feed__item img").count()) === 2);
const feedText = await page.textContent("#view-feed");
check("feed never shows message text", !feedText.includes("FIRST") && !feedText.includes("SECOND"));
await page.screenshot({ path: "shots/m2-feed.png" });

// back to scan
await page.click('.tabbar__tab[data-view="scan"]');
check("back to scan works", await page.locator("#view-scan.is-active").count() === 1);

const real = errors.filter((e) => !e.includes("Failed to load resource"));
check(`no page errors (${real.length})`, real.length === 0);
if (real.length) console.log(real.join("\n"));

await browser.close();
console.log("done");
