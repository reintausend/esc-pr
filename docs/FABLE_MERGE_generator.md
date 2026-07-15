# Fable Merge Brief — Graphics & Transform Part

This repository is **one of three parts** of the final Glyphs project. Use this document when merging it with the other two.

| Part | Role |
|------|------|
| **This repo (Graphics & Transform)** | Creates the printable symbol graphics and transforms them in the preview editor |
| **GUI** | Styles the editor / UI of this project (look & layout) |
| **Barcode** | Encryption and decryption tool (message ↔ barcode payload) |

---

## What this part owns

Do **not** rewrite or relocate these concerns into the GUI or barcode parts unless the merge explicitly requires a thin adapter.

### Generator — create printable graphics

- Entry: `Generator/generator.js` via `preview.js`
- Input: plaintext message string (currently from URL `?message=…`)
- Output: SVG symbols laid out on a **72.2 mm** print grid (Epson TM-T88IV, 512 dots @ 180 dpi)
- Material: `Assets/Myriad Pro_SVGs_for Generator/` (loaded at runtime; keep paths working)
- Rulebook-driven pipeline: analyse → construct → compose → control → SVG output

### Editor — transform graphics after generation

- Entry: `Editor/preview/PreviewToolHost.js` + panel wiring in `preview.html` / `preview.js`
- Effects (applied from original geometry on each change): tweak, round corners, fill/outline, stroke, size, randomize
- Serialization: `Editor/preview/serializeGrid.js` → Save SVG / Print PNG

### Printer — send transformed graphics to hardware

- Browser → `POST http://127.0.0.1:8740/print` (PNG) → `Printer/print_server.py` → TM-T88IV
- Printable width and canvas sizing live in `Printer/printer_setup/`

### Current app shell (temporary / merge touchpoints)

| File | Role today | Merge note |
|------|------------|------------|
| `index.html` / `index.js` / `index.css` | Message input → Create → preview | Likely restyled or replaced by GUI; keep input → generate contract |
| `preview.html` / `preview.js` / `preview.css` | Grid, tweak panel DOM, Save / Back / Print | GUI styles this editor; keep IDs/hooks and editor JS |

---

## How the three parts should connect

```
┌─────────────────┐     plaintext / payload      ┌──────────────────────────┐
│  Barcode tool   │ ───────────────────────────► │  This part (Generator)   │
│  encrypt/decrypt│ ◄─────────────────────────── │  → SVG symbols           │
└─────────────────┘     optional: scan/decode    │  Editor transforms       │
                                                 │  Printer / Save SVG      │
┌─────────────────┐     CSS / markup / theme     │                          │
│  GUI            │ ───────────────────────────► │  index + preview chrome  │
│  editor styling │     do not own Generator/    └──────────────────────────┘
└─────────────────┘     or Editor effect logic
```

### Integration with the GUI

- GUI owns **presentation**: layout, typography, colors, spacing, chrome around the editor.
- This part owns **behavior**: generation, tweak pipeline, serialize, print.
- Prefer: GUI supplies stylesheets / wrapper markup; keep existing element IDs that `preview.js` and `Editor/` bind to (`#tweak-panel`, `#grid-content`, `#print-button`, `#download-button`, `#back-button`, `#info-box`, `#message-input`, `#create-form`, etc.).
- If the GUI renames or restructures the panel, update **only** the DOM bindings in `preview.js` / `TweakPanel.js` — not the effect math.
- `index.css` and `preview.css` are the style merge surfaces; Generator/Editor logic must stay independent of visual theme.

### Integration with the barcode tool

- Today the flow is: user types message → `index.js` → `preview.html?message=…` → `generate(message)`.
- After merge, the barcode tool should sit on the **message boundary**:
  - **Encrypt path:** user plaintext → barcode tool encrypts → resulting string (or agreed payload) is what the Generator receives as `message`.
  - **Decrypt path:** scanned / entered barcode data → barcode tool decrypts → optional display or feed into the same create flow.
- Generator constraints still apply: characters must be allowed by `Generator/material/zeichensatz.js` (uppercase, material alphabet). If the encrypted payload uses a different alphabet, either:
  1. map/encode into allowed characters before `generate()`, or
  2. extend the allowed charset in one place (`zeichensatz.js` + Assets) — do not scatter checks.
- Keep Generator/Editor free of crypto logic; call barcode APIs from the shell (`index.js` / a small glue module), not from `Generator/` or `Editor/`.
- Print may later include a barcode on the receipt (`printer_setup` already supports barcode/QR APIs). That belongs at print-composition time, not inside symbol construction.

---

## Stable contracts (do not break)

1. **`generate(message: string)`** — returns SVG / layout result used by `preview.js`.
2. **Preview grid** — symbols rendered into `#grid-content`; editor normalizes shapes then applies effects.
3. **Save** — `serializeGrid` / `downloadSvg` of the edited grid.
4. **Print** — PNG of current total SVG to print server at fixed canvas width (512 dots).
5. **Separation** — Editor never mutates Generator rules; Generator never depends on Editor or GUI CSS.
6. **Assets path** — fragment SVGs must remain fetchable under the served project root.

---

## Suggested merge order for Fable

1. Keep this tree as the **behavioral core** (`Generator/`, `Editor/`, `Assets/`, `Printer/`).
2. Merge **GUI** styles/markup onto `index.*` and `preview.*` (and shared CSS), preserving IDs and JS entry points.
3. Wire **barcode** encrypt/decrypt at the create/input step (before `generate`) and optionally at decode/scan UI; leave symbol geometry and tweak pipeline untouched.
4. Smoke-test: allowed message → generate → tweak → Save SVG → Print (with print server running).

---

## Out of scope for this part

- Final visual design system (GUI)
- Cryptographic encrypt/decrypt implementation (barcode tool)
- Changing Regelwerk math unless required by a shared alphabet decision with the barcode tool

---

## Quick start (this part alone)

```bash
# App
python3 -m http.server 8000
# → http://localhost:8000/index.html

# Print (optional)
cd Printer && ./start_print_server.sh
```
