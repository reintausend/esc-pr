# Merge brief for Fable

This document prepares **this repository** to be merged with two other project parts into one installation.

**Rename rule (required):** treat this entire tree as one package named **`barcode_system`**. In the merged monorepo, every path below becomes a child of `barcode_system/` (for example `site/` → `barcode_system/site/`). Do not keep the old repo name `QR-Code-Gen_01` in the merged layout.

---

## What the three parts are

| Part | Role | This repo? |
|---|---|---|
| **`barcode_system`** | Tick-code encode/decode, storage lookup, two-part thermal print, phone scan page | **Yes — this repo** |
| **Graphics generator** | Turns typed words + parameters into the illegible SVG/artwork printed as receipt part 1 | Separate (to merge) |
| **GUI** | Shared installation UI: text input, sliders/params, preview, print/store controls | Separate (to merge) |

After merge, one product should: type a message in the GUI → generate artwork → assign a barcode id → store message → print part 1 (artwork only) + part 2 (info receipt with scannable tick code) → phone scans part 2 and reveals the message.

---

## Target layout after merge

Suggested monorepo shape (adjust sibling folder names to match the other parts’ real names):

```
<merged-project>/
  barcode_system/          ← THIS repo, renamed
    site/
      station/             ← thin glue: print/store/scan wiring (GUI may replace UI)
      scan/                ← phone decoder page (keep; usually not part of the GUI)
      shared/              ← tickcode, render, store, config
    epson/                 ← local print server (TM-T88IV)
    assets/fonts/          ← fakerece.ttf for info receipt
    supabase/
    tests/
    README.md
  <graphics-generator>/    ← SVG/artwork engine
  <gui>/                   ← installation UI shell
```

If the other parts already use different top-level names, keep those names — only this package must be called **`barcode_system`**.

---

## What `barcode_system` owns (do not invent replacements)

### Core responsibilities

1. **Tick code** — encode / draw / decode a short id `1..4095` (+ CRC-8). JS: `site/shared/tickcode.js`. Python twin for printing: `epson/tickcode.py` (must stay byte-compatible with the JS decoder).
2. **Part 1 receipt** — artwork only (no tick strip, no corner marks). `site/shared/render.js` → `composeReceipt(svgString)`.
3. **Part 2 receipt** — store-style info slip with the scannable tick strip. `epson/info_receipt.py` + `POST /print-receipt`.
4. **Print bridge** — `epson/print_server.py` on `http://localhost:8740`:
   - `POST /print` — raw PNG body (part 1)
   - `POST /print-receipt` — JSON `{ code, link?, timestamp?, cut? }` (part 2)
   - `GET /health`
5. **Storage** — `site/shared/store.js`: offline `localStorage` or Supabase (`code`, `text`, `image_url`). Schema: `supabase/schema.sql`.
6. **Scan page** — `site/scan/`: camera → decode tick strip → `getByCode(code)` → show message.

### Temporary placeholder to replace

`site/station/placeholder-art.js` is **not** the real generator. Contract the graphics part must satisfy:

```js
generateArtwork(text, params, seed) -> SVG string
```

- SVG: black shapes on transparent/white, fills its viewBox.
- Deterministic for the same `(text, params, seed)`.
- Downstream handles margins, 1-bit raster, print, storage.

### Temporary station UI to replace or absorb

`site/station/` currently embeds a minimal GUI (message input, density/chaos/weight sliders, preview canvas, Print & store). The real **GUI** part should own that surface. Keep the **print/store/scan orchestration** from `site/station/main.js` (or move it into a small module the GUI imports).

Critical print flow to preserve (same `code` for store + part 2):

1. Validate text  
2. `code = pickCode(existing)`  
3. `svg = generateArtwork(...)`  
4. `canvas = composeReceipt(svg)`  
5. `store.add({ id, code, text }, pngBlob)`  
6. `POST /print` with PNG  
7. `POST /print-receipt` with `{ code }` (and `CONFIG.decodeUrl` when set)

Config: `site/shared/config.js` (`printHelperUrl`, `decodeUrl`, Supabase keys, print width 512).

---

## Integration contracts for Fable

### A. Graphics generator → `barcode_system`

| Expectation | Detail |
|---|---|
| Export | One function matching `generateArtwork(text, params, seed)` (or a thin adapter) |
| Output | Self-contained SVG string suitable for `composeReceipt` |
| Params | May differ from `{ density, chaos, weight }`; GUI must pass the real param object; adapter maps if needed |
| Placement | Prefer `barcode_system/site/station/` replacement of `placeholder-art.js`, **or** import from `<graphics-generator>/` without breaking ES-module paths |

### B. GUI → `barcode_system` + generator

| Expectation | Detail |
|---|---|
| Owns | Text entry, parameter controls, live preview, print/store button, user-facing copy |
| Calls | Generator for SVG; `composeReceipt` for part-1 preview/print bitmap; store + print helpers for the two-part job |
| Must not | Re-implement tick encoding, or put a barcode on part 1 |
| Scan UX | Usually leave `barcode_system/site/scan/` as a separate phone URL; GUI may only link to it |

### C. Paths and rename

When copying this repo into the monorepo:

1. Rename the package folder to **`barcode_system`**.
2. Update any absolute docs/scripts that say `QR-Code-Gen_01`, `cd epson`, GitHub Pages `site/` roots, etc., so they point at `barcode_system/...`.
3. If GitHub Pages deploys only one `site/`, either:
   - deploy `barcode_system/site/` as the Pages root, or  
   - merge static assets into a shared `site/` and keep modules under `barcode_system/` imported by the GUI — pick one strategy and keep `/scan/` reachable over HTTPS.

### D. Do not break

- Tick-code payload identity between JS and Python (`ID_BITS=12`, CRC-8, module widths).
- Part 1 = artwork only; part 2 = only place with the scannable strip.
- Print server port **8740** and PNG-as-body `/print` (not the old base64 JSON helper).
- Offline + Supabase store modes via empty vs filled `CONFIG.supabaseUrl` / `supabaseAnonKey`.
- `assets/fonts/fakerece.ttf` path relative to repo root (info receipt loader assumes `barcode_system/assets/fonts/fakerece.ttf` after rename — update `epson/info_receipt.py` `REPO_ROOT` if the relative depth changes).

---

## Suggested merge order

1. **Rename** this tree → `barcode_system/`.
2. Drop in **graphics generator**; replace/wire `generateArtwork`.
3. Drop in **GUI**; replace `site/station` chrome; keep print/store/scan pipeline.
4. Smoke-test offline: generate → preview → print both cuts → scan part 2 in same browser.
5. Point `decodeUrl` + Supabase when cloud/GitHub Pages are ready.

---

## Smoke-test checklist for Fable after merge

- [ ] Folder name is `barcode_system` (not `QR-Code-Gen_01`).
- [ ] Placeholder art replaced or adapted; preview shows real generator output.
- [ ] GUI drives params + print; no duplicate barcode on part 1.
- [ ] `epson/.venv` + `print_server.py` running; `/health` sees printer when connected.
- [ ] Print produces two cuts; part 2 strip decodes to the stored `code`.
- [ ] `node barcode_system/tests/tickcode.test.mjs` (or moved path) still passes.
- [ ] `epson/verify_tickcode.py` still passes if Python path/fonts still resolve.
- [ ] Scan page hint still refers to the **info receipt** barcode, not artwork.

---

## Quick reference — important files today

| Path (pre-rename) | After rename | Why it matters |
|---|---|---|
| `site/shared/tickcode.js` | `barcode_system/site/shared/tickcode.js` | Codec used by scan page |
| `site/shared/render.js` | `…/render.js` | Part 1 composition |
| `site/shared/store.js` | `…/store.js` | Message + code persistence |
| `site/shared/config.js` | `…/config.js` | Print URL, cloud, limits |
| `site/station/placeholder-art.js` | replace | Graphics integration point |
| `site/station/main.js` | absorb into GUI | Print/store orchestration |
| `site/scan/` | keep | Phone decode |
| `epson/print_server.py` | keep | USB print bridge |
| `epson/info_receipt.py` | keep | Part 2 layout |
| `epson/tickcode.py` | keep | Must match JS codec |
| `assets/fonts/fakerece.ttf` | keep | Part 2 typeface |
| `supabase/schema.sql` | keep | Cloud schema |
| `tests/tickcode.test.mjs` | keep | Regression |

---

## Out of scope for this package

- Letter / glyph transformation algorithms (graphics generator).
- Final branded GUI styling and layout (GUI part).
- Filling production Supabase keys / GitHub Pages URL (ops; set `CONFIG` when ready).

---

## One-sentence instruction for Fable

**Rename this repository to `barcode_system`, merge the graphics generator behind `generateArtwork`, merge the GUI in place of the station chrome, and keep the tick-code + two-part print + scan pipeline intact so the printed info-receipt barcode always matches the stored message.**
