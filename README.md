# Secret Receipts

An installation: type a short secret message, it becomes an abstract,
illegible glyph artwork printed on a thermal receipt (part 1), together
with a normal-looking info receipt (part 2) that carries a discreet
scannable tick strip. A phone photographs part 2 in the browser and the
system looks up and reveals the original message.

## Packages

| Folder | Role |
|---|---|
| `gui/` | Station UI: start screen, message entry, 16:9 editor stage (design authority) |
| `generator/` | Glyph generation (`Generator/`) and transform effects (`Editor/`), SVG material in `Assets/` |
| `barcode_system/` | Tick-code codec, storage (localStorage/Supabase), Epson print server |
| `mobile/` | Phone page ("ESC-PR Vector Decryption Client"): scan + decode receipts, graphics feed |
| `docs/` | Merge briefs and layout documentation |
| `_archive/` | Superseded pieces kept for reference (old station UI, old scan page, duplicate print server) |

Progress and decisions are tracked in [`MERGE_LOG.md`](MERGE_LOG.md).

## Run locally

```bash
# Static server from the repo root
python3 -m http.server 8000
# Station: http://localhost:8000/gui/
# Phone client (same browser in offline mode): http://localhost:8000/mobile/

# Print server (required for printing, Epson TM-T88IV over USB)
cd barcode_system/epson
./start_print_server.sh   # http://localhost:8740
```

Without Supabase keys in `barcode_system/site/shared/config.js` the system
runs in offline mode: messages live in the browser's localStorage, so
station and phone client must share the same browser.

## Deployment (phones need HTTPS)

The terminal computer runs everything locally (`gui/` + print server).
Personal phones need the `mobile/` page over **HTTPS** (camera requirement)
plus Supabase as shared storage.

GitHub Pages publishes **only the phone client** (not the terminal):

- `mobile/`
- `barcode_system/site/shared/` (config, store, tickcode)
- `gui/css/` + `gui/assets/fonts/` (design tokens)

1. Supabase: create a project, run `barcode_system/supabase/schema.sql` in
   the SQL editor, copy Project URL + anon key into
   `barcode_system/site/shared/config.js`.
2. Push this repo to GitHub (`main`), enable Settings → Pages → Source:
   **GitHub Actions**. Phone page:
   `https://<user>.github.io/<repo>/mobile/`
   (root URL redirects there).
3. Put that URL into `decodeUrl` in `config.js` — it gets printed on the
   info receipt (part 2).

## Flow

1. Start screen → message entry (allowed characters: A–Z, Ä/Ö/Ü, 0–9, `! ? & ( ) . ,`, space).
2. Editor stage: the message is rendered as glyph symbols; sliders tweak
   the geometry (rounding, stroke, tweak, size, fill/outline, randomize).
3. Print: the edited artwork is stored under a fresh code, printed as
   part 1, and the matching info receipt (part 2) is printed with the
   scannable tick strip.
4. Scan part 2 with a phone → code lookup → message revealed.
