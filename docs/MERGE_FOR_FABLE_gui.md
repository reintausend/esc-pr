# Merge brief for Fable — GUI (`fr-interface`)

This document prepares **this folder** to be merged with two other project
parts into one installation. Hand this file (and [`PLAN.md`](PLAN.md)) to
Fable when merging.

**Rename rule (recommended):** treat this entire tree as one package named
**`gui`**. In the merged monorepo, every path below becomes a child of
`gui/` (for example `css/` → `gui/css/`). Do not keep the working name
`fr-interface` in the merged layout unless the other parts already depend
on that path — if so, keep the folder name and update imports accordingly.

**Design authority:** this package is the **overall visual design** of the
installation UI (layout, typography, components, 16:9 stage). Other parts
must adapt to this shell — do not restyle this GUI to match temporary
station chrome from `barcode_system`.

Companion brief (barcode package):  
`../QR-Code-Gen_01/MERGE_FOR_FABLE.md` → after rename: `barcode_system/MERGE_FOR_FABLE.md`

---

## What the three parts are

| Part | Role | This folder? |
|---|---|---|
| **`gui`** | Installation UI shell: 16:9 layout, controls, preview panels, print/randomize actions | **Yes — this folder** |
| **Graphics generator** | Turns typed words + parameters into the illegible SVG/artwork printed as receipt part 1 | Separate (to merge) |
| **`barcode_system`** | Tick-code encode/decode, storage, two-part thermal print, phone scan page | Separate (currently `QR-Code-Gen_01/`) |

After merge, one product should: type a message → tweak params in this GUI →
live-preview artwork on the canvas → Randomize / Print → graphics generator
produces SVG → barcode system stores + prints part 1 (artwork) and part 2
(info receipt with scannable tick strip) → phone scans part 2 and reveals
the message.

---

## Target layout after merge

```
<merged-project>/
  gui/                       ← THIS folder, renamed from fr-interface
    index.html               ← primary station entry (or re-homed under site/)
    css/
    js/
    assets/fonts/            ← Roobert + Typestar (UI fonts)
    PLAN.md
    MERGE_FOR_FABLE.md       ← this file
  barcode_system/            ← QR-Code-Gen_01 renamed
    site/
      station/               ← thin glue only (or deleted once GUI owns chrome)
      scan/                  ← phone decoder page (keep; not restyled by GUI)
      shared/                ← tickcode, render, store, config
    epson/
    …
  <graphics-generator>/      ← SVG/artwork engine (name as provided)
```

Deployment tip: either serve `gui/index.html` as the station page and import
modules from `barcode_system/site/shared/`, **or** move `gui/` assets under
`barcode_system/site/station/` while keeping this CSS/JS structure intact.
Pick one strategy; keep `/scan/` on HTTPS for phones.

---

## What `gui` owns (do not invent a second UI)

### Core responsibilities

1. **Visual system** — 16×24 CSS grid on a responsive 16:9 `.stage`, design
   tokens in `css/variables.css`, fonts (Roobert / Typestar), component look
   (button, label, switch, slider, ticker, panels). See [`PLAN.md`](PLAN.md).
2. **Station chrome** — Back, Fill-In/Outline switch, param labels + sliders
   (Rounded Edges, Stroke, Tweak Horizontal/Vertical, Size), Randomize,
   Print, purple ticker, canvas panel, word/char stats.
3. **Interaction surface** — bubbled custom events (`fr:*`) so glue code can
   listen without rewriting the DOM. Labels are **not** buttons; only
   sliders / switch / filled actions are interactive.

### DOM hooks other parts must use

| Hook | Purpose |
|---|---|
| `#canvas-panel` | Mount live artwork preview (SVG or canvas from generator + `composeReceipt`) |
| `#word-count` / `#char-count` | Update from the real message text |
| `.ticker__source` | Optional: set status / mission message text (JS builds `+++` marquee) |
| `[data-action="back"]` | Navigate / leave editor (wire to text-entry or previous screen) |
| `[data-action="randomize"]` | New seed / re-roll generator params |
| `[data-action="print"]` | Kick off store + two-part print pipeline |
| `#fill-outline-switch` | Mode: `fill` \| `outline` via `fr:switch-change` |
| Sliders `data-id` | `rounded-edges`, `stroke`, `tweak-horizontal`, `tweak-vertical`, `size` |

### Event contract (listen on `document`)

| Event | Detail | Meaning |
|---|---|---|
| `fr:action` | `{ action }` | `back` \| `randomize` \| `print` |
| `fr:switch-change` | `{ id, value }` | Fill-In / Outline (`fill` \| `outline`) |
| `fr:slider-start` | `{ id, value }` | Pointer down on a slider |
| `fr:slider-input` | `{ id, value }` | Dragging (also drives label % reveal) |
| `fr:slider-change` | `{ id, value }` | Release — good place to commit a redraw |

Slider values: Rounded Edges / Stroke / Size default `0…100`; Tweak H/V
default `-100…100` centered at `0`. Remap in an adapter if the graphics
generator uses different ranges/names.

Full component notes: [`PLAN.md`](PLAN.md) §§3–4.

### Temporary placeholders to replace

| Placeholder | Replace with |
|---|---|
| Empty `#canvas-panel` | Live preview from graphics generator (+ optional `composeReceipt` bitmap) |
| Hardcoded `#word-count` / `#char-count` (`5` / `52`) | Counts from the real message string |
| No text-input screen in this folder yet | Message entry (own view or panel); **Back** should connect to it |
| Events logged nowhere | Glue module: map `fr:*` → generator params + print/store orchestration |

This package intentionally has **no** tick encoding, print server, or
storage logic — import those from `barcode_system`.

---

## Integration contracts for Fable

### A. GUI → graphics generator

| Expectation | Detail |
|---|---|
| Call shape | Prefer `generateArtwork(text, params, seed) → SVG string` (same contract as barcode brief) |
| `params` | Built from this GUI: at least switch mode + the five slider ids; adapter may rename keys (`roundedEdges`, `density`, …) |
| Preview | On `fr:slider-input` / `fr:slider-change` / `fr:switch-change` / `fr:action` (`randomize`), regenerate and paint into `#canvas-panel` |
| Determinism | Same `(text, params, seed)` → same SVG; Randomize changes `seed` (and/or randomizes slider values if product requires) |
| Must not | Put tick strip / barcode into the preview artwork (part 1 stays aesthetic only) |

### B. GUI → `barcode_system`

| Expectation | Detail |
|---|---|
| Owns UI | This shell replaces temporary `barcode_system/site/station/` chrome |
| Keeps pipeline | Print/store/scan orchestration from station `main.js` (or extract to a shared module the GUI imports) |
| Print flow | Same as barcode brief: validate → `pickCode` → `generateArtwork` → `composeReceipt` → `store.add` → `POST /print` → `POST /print-receipt` |
| Must not | Re-implement tickcode, or draw the scannable strip on part 1 |
| Scan | Leave `barcode_system/site/scan/` as the phone URL; GUI may only surface the link |

Critical print flow (preserve identical `code` for store + part 2):

1. Validate text  
2. `code = pickCode(existing)`  
3. `svg = generateArtwork(text, params, seed)`  
4. `canvas = composeReceipt(svg)`  
5. `store.add({ id, code, text }, pngBlob)`  
6. `POST /print` with PNG (part 1)  
7. `POST /print-receipt` with `{ code }` (part 2)

Config lives in `barcode_system/site/shared/config.js` (`printHelperUrl`,
`decodeUrl`, Supabase keys, print width 512).

### C. Paths and rename

1. Rename this tree → **`gui/`** (recommended).
2. Rename `QR-Code-Gen_01` → **`barcode_system/`** (see its merge brief).
3. Wire imports with relative ES-module paths (no bundler required today).
4. Keep UI fonts under `gui/assets/fonts/`; keep `fakerece.ttf` under
   `barcode_system/assets/fonts/` for the info receipt — do not conflate them.

### D. Design rules (do not break)

- **16:9 stage** with 16 cols × 24 rows; scale via `cqw` / `--dw: 2560`.
- Left-edge controls have **no left border** (flush to stage).
- Sliders have **no left border** (share edge with labels).
- Labels are captions only; percentage reveal while dragging is already built.
- Ticker uses `.ticker__source` + JS-built `+++` dividers; length-independent.
- Prefer extending existing components over inventing parallel controls.

### E. Do not break (from `barcode_system`)

- Tick-code JS/Python identity; part 1 artwork-only; part 2 has the strip.
- Print server port **8740**; PNG body on `/print`.
- Offline + Supabase store modes via `CONFIG`.

---

## Suggested merge order

1. Rename packages: `fr-interface` → `gui/`, `QR-Code-Gen_01` → `barcode_system/`.
2. Drop in **graphics generator**; satisfy `generateArtwork(text, params, seed)`.
3. Add a thin **glue module** in `gui/js/` (e.g. `app.js`) that:
   - holds `text`, `params`, `seed`
   - listens for `fr:*` events
   - updates `#canvas-panel`, word/char counts
   - on Print, runs the barcode print/store pipeline
4. Replace / delete temporary `barcode_system/site/station` chrome; keep scan page.
5. Smoke-test offline, then point `decodeUrl` + Supabase when ready.

---

## Smoke-test checklist for Fable after merge

- [ ] Folder name is `gui` (or documented alias of `fr-interface`).
- [ ] Opening the station URL shows **this** 16:9 design, not the old station UI.
- [ ] Sliders / switch update live preview from the real generator.
- [ ] Word/char counts track the real message.
- [ ] Randomize changes the preview (new seed and/or params).
- [ ] Print triggers two cuts; part 1 has no tick strip; part 2 decodes to stored `code`.
- [ ] Label % reveal still works while dragging; `%` stays stable within digit count.
- [ ] Ticker still loops continuously for short and long messages.
- [ ] `barcode_system` tickcode tests still pass.
- [ ] Phone scan page still works over HTTPS when configured.

---

## Quick reference — important files today

| Path (pre-rename) | After rename | Why it matters |
|---|---|---|
| `index.html` | `gui/index.html` | Station shell markup + region hooks |
| `css/variables.css` | `gui/css/variables.css` | Design tokens (`--dw`, colors, fonts) |
| `css/grid.css` / `layout.css` | `gui/css/…` | 16:9 stage + region placement |
| `css/components/*` | `gui/css/components/*` | Visual language |
| `js/main.js` | `gui/js/main.js` | Component init only (add glue beside it) |
| `js/components/*.js` | `gui/js/components/*` | Event emitters (`fr:*`) |
| `assets/fonts/` | `gui/assets/fonts/` | Roobert + Typestar UI fonts |
| `PLAN.md` | keep | Detailed layout + component docs |
| `MERGE_FOR_FABLE.md` | keep | This brief |

---

## Out of scope for this package

- Letter / glyph / SVG generation algorithms (graphics generator).
- Tick-code codec, Epson print server, Supabase schema, phone scan page
  (`barcode_system`).
- Filling production API keys / GitHub Pages URL (ops).

---

## One-sentence instruction for Fable

**Rename this folder to `gui`, keep it as the installation’s visual shell and design system, wire its `fr:*` events and `#canvas-panel` to the graphics generator’s `generateArtwork`, and call into `barcode_system` for store + two-part print + scan — without re-implementing tick codes or replacing this layout with the old station UI.**
