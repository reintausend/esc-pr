# Merge Log — Secret Receipts Installation

Tracking document for merging the three project parts into one monorepo.
Companion briefs live in [`docs/`](docs/).

| Package | Was | Role |
|---|---|---|
| `generator/` | `Glyphs_Project` | Behavioral core: glyph generation (`Generator/`), transform pipeline (`Editor/`), SVG material (`Assets/`) |
| `gui/` | `fr-interface` | Design authority: 16:9 station UI, design tokens, `fr:*` event components |
| `barcode_system/` | `QR-Code-Gen_01` | Tick-code codec, storage, two-part Epson print server, phone scan page |

## Agreed decisions

- **Data flow:** plaintext goes to the generator. The tick strip on receipt part 2 carries only a lookup code (1–4095 + CRC-8), never the message itself. Message + image are resolved via storage lookup.
- **No word/character limits.** Only the generator charset restricts input (A–Z, Ä/Ö/Ü, 0–9, `! ? & ( ) . ,`, space). Long messages mean long receipts.
- **One print server:** `barcode_system/epson/` (port 8740, `POST /print`, `POST /print-receipt`, `GET /health`). The duplicate Glyphs Flask server is archived.
- **GUI is the design authority.** The old Glyphs shell pages and the barcode station chrome are replaced by `gui/` pages; effect math and codec logic stay in their packages.
- **Printed artwork = the live edited grid.** The deterministic `generateArtwork(text, params, seed)` contract from the barcode brief is dropped; what you see in the editor is exactly what prints (serialize grid → compose → PNG).
- **Entry flow:** new start screen → message entry page (ported from Glyphs `index.html`, restyled) → editor stage. Back returns to entry.

## Phase status

| Phase | What | Status |
|---|---|---|
| 1 | Restructure: renames, `_archive/`, `docs/`, junk cleanup, this log + root README | done |
| 2 | Generator asset paths resolve via `import.meta.url` (work from any page) | done |
| 3 | GUI pages: start screen, restyled entry, `editor.html` | done |
| 4 | Glue module `gui/js/app.js`: generate into `#canvas-panel`, map `fr:*` events to Editor effects | done |
| 5 | Print/store pipeline: serializeGrid → composeReceipt → store.add → two-part print; drop length limits | done |
| 6 | Smoke test end-to-end, tickcode tests | done |

## Phase 1 notes (done)

- Renamed: `Glyphs_Project` → `generator/`, `fr-interface` → `gui/`, `QR-Code-Gen_01` → `barcode_system/`.
- Archived (kept, not deleted):
  - `_archive/glyphs-printer/` — the duplicate Glyphs print server (`.venv` deleted; machine-specific).
  - `_archive/barcode-station/` — old station UI (`main.js` kept as reference for the print/store orchestration).
  - `_archive/paperjs-v0-extras/` — vendored Paper.js docs/examples/node build; runtime keeps only `dist/paper-core.min.js` (+ siblings) and `LICENSE.txt`.
- Deleted junk: `.DS_Store`, `epson/__pycache__/`, `epson/out/`, `Printer/.venv`.
- Merge briefs and the GUI layout doc moved to `docs/`.
- The nested git repo inside `barcode_system/` (`.git`, `.github/`, `.gitignore`) moved along untouched.

## Phase 2 notes (done)

- `generator/Generator/config.js`: `MATERIAL_PATH` now resolves relative to the
  config module itself (`import.meta.url`), so any page — including `gui/` pages —
  can import the generator and the SVG material still loads. The workspace root is
  served by one static server (`python3 -m http.server 8000`).

## Phase 3 notes (done)

- `gui/index.html` — new start screen (title, subtitle, Start button, ticker), minimal content pending final copy.
- `gui/entry.html` + `gui/js/entry.js` — message entry ported from the old Glyphs start page, rebuilt with GUI tokens: uppercase forcing, live charset filtering, allowed-characters hint, prefill when returning from the editor via Back.
- `gui/editor.html` — the 16:9 stage (renamed from `index.html`); `#canvas-panel` now hosts the glyph grid at true 72.2 mm printable width; stats panel gained a status line (region extended to fit in `css/editor.css`).
- New CSS: `gui/css/pages.css` (start/entry regions, incl. shared ticker placement since `layout.css` is editor-only) and `gui/css/editor.css` (grid + symbol rows, ported from the old preview).
- Old Glyphs shell pages archived to `_archive/glyphs-shell/`.

## Phase 4 notes (done)

- `gui/js/app.js` is the only glue module: runs `generate(message)`, renders symbol rows into the grid, drives the Editor pipeline headless, updates ticker + word/char stats.
- `generator/Editor/preview/PreviewToolHost.js`: panel is now optional; new public `setOptions(options)`; `randomize()` works headless and returns the applied options (GUI sliders/switch are synced from them). Effect math untouched.
- Slider mapping: `rounded-edges`→rounding, `stroke`→stroke width, `size`→size (GUI markup defaults win), `tweak-horizontal`/`-vertical` (−100…100) → strength via absolute value, switch → fill/outline. Tweak mode/point flags keep old panel defaults (relative, anchors + in-handles).
- `editor.html` loads Paper.js (`paper-core.min.js`) for the outline merge, as the old preview did.

## Phase 5 notes (done)

- Print flow in `app.js`, ported from the archived station `main.js`: serialize live grid → `composeReceipt` (part 1, artwork only, 1-bit, 512 dots) → `pickCode` → `store.add({ id, code, text }, png)` → `POST /print` → `POST /print-receipt { code, link }`. Same `code` for store and part 2.
- `maxWords` / `maxChars` removed from `barcode_system/site/shared/config.js`; input is restricted only by the generator charset (in `entry.js`).
- Print failures (server offline) do not lose data: the entry is stored first, status line reports the print error.

## Phase 6 notes (done) — smoke test results

Automated browser run (Playwright + Chrome, offline localStorage mode; script and screenshots in `docs/smoke-test/`):

- Start → entry → editor flow works; invalid characters filtered while typing.
- Editor: generation renders symbol rows; rounded-edges slider changes geometry; outline switch shows merged contour; randomize re-rolls effects and syncs the GUI controls; word/char counts and ticker show the real message.
- Print (print server not running): entry stored with fresh code, part-1 PNG saved to store, status reports the unreachable printer. `getByCode` (the scan-page lookup) resolves the stored message.
- Back from editor returns to entry with the message prefilled. No console/page errors.
- `node barcode_system/tests/tickcode.test.mjs` — all clean, zero false decodes.
- `epson/verify_tickcode.py` (in fresh `epson/.venv`) — all rendered receipts scan, zero false decodes; JS/Python codec identity intact.
- Not testable without hardware: actual TM-T88IV output (both cuts) and the phone camera scan. To verify on the installation machine: start `epson/print_server.py`, print, scan part 2.

## Mobile client + deployment (done)

- **`mobile/` — "ESC-PR Vector Decryption Client":** new phone page replacing the old `barcode_system/site/scan/` (archived to `_archive/barcode-scan/`, old site index to `_archive/barcode-site-index.html`). One page, two views with bottom-tab navigation:
  - **Scan** — camera → tick-strip decode → store lookup → reveal message (decode logic ported unchanged; photo fallback kept).
  - **Feed** — all created graphics from the store, newest first, images only; message text is never rendered in the feed.
  - Uses GUI design tokens (`gui/css/variables.css`, `fonts.css`, purple accent, black 2 px borders) in a portrait scroll layout; overrides the stage-specific body reset.
- **Git:** repo initialized at the workspace root; nested `barcode_system/.git` + `.gitignore` + `.github` removed (old history remains on the original GitHub remote). Root `.gitignore` covers venvs, `__pycache__`, `.DS_Store`, print output, local test scratch.
- **Deploy:** workflow at `.github/workflows/deploy.yml` assembles a phone-only
  artifact (`mobile/` + `barcode_system/site/shared/` + `gui/css` + fonts). The
  terminal (`gui` HTML, generator, epson) is **not** published. Root
  `index.html` redirects to `/mobile/`.
- Feed: continuous full-width vertical stream, newest → oldest, no grid/cards;
  hint hides once graphics exist; message text never shown in the feed.
- Verified in a 390×844 viewport: tabs switch (camera stops when leaving Scan),
  feed renders seeded store entries without exposing text, no page errors
  (script in `docs/smoke-test/mobile.mjs`).

## Open items / deferred

- **Deployment (user steps):** create the GitHub repo, push `main`, enable Pages
  (Settings → Pages → Source: GitHub Actions). Then set `decodeUrl` in
  `barcode_system/site/shared/config.js` to the live `/mobile/` URL so it
  prints on the info receipt.
- **Supabase (user steps):** create a Supabase project, run
  `barcode_system/supabase/schema.sql` in the SQL editor, then fill
  `supabaseUrl` + `supabaseAnonKey` in `barcode_system/site/shared/config.js`.
  Planned later: also store the SVGs.
- **Start screen content:** built minimal; final copy/visuals to be decided.
- **Tweak slider direction:** Resolved — tweak sliders are now 0…100 (same as the Editor effect). Defaults: rounded/stroke/tweak = 0, size = 35.
