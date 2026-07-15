# Secret Receipts

An installation: type a short secret message, it becomes an abstract
illegible artwork, printed on a thermal receipt. Whoever receives the
receipt photographs it with their phone in the browser, and the system
reveals the message.

The carrier of the data is not the artwork itself but a discreet **tick
strip** at the top of the receipt - a row of small vertical ticks with
varying heights that reads as a decorative rhythm, not as a barcode. Only
the tick *widths* carry data: a short number (1..4095) plus a checksum.
That number is looked up in the cloud database, which returns the original
text and image. The artwork stays purely aesthetic and can be anything.

Consequences: if the database is lost the prints become unreadable, and
decoding requires internet. The "secrecy" is that nobody recognizes the
strip as a code.

## Repository layout

| Path | What it is |
|---|---|
| `site/` | Static website, deployable to GitHub Pages |
| `site/station/` | Installation page: type, preview, print, store |
| `site/scan/` | Phone page: camera, decode strip, reveal message |
| `site/shared/tickcode.js` | The custom symbology: encoder, renderer, decoder |
| `site/shared/` | Config, receipt rendering, storage backends |
| `epson/` | Local Python print server: drives the receipt printer, builds part 2 (info receipt) |
| `supabase/schema.sql` | One-time cloud database setup |
| `tests/tickcode.test.mjs` | Decoder robustness test (Node, no dependencies) |

No frameworks, no build step, no heavy libraries - both pages are plain
ES modules and load instantly.

## Setup

### 1. Cloud (Supabase, free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor, paste and run `supabase/schema.sql`.
3. In project settings copy the **Project URL** and **anon public key**
   into `site/shared/config.js` (`supabaseUrl`, `supabaseAnonKey`).

Until you do this the site runs in **offline mode**: entries live in the
browser's localStorage, so station and scan page only work together in the
same browser on the same machine. Good for development.

### 2. Website (GitHub Pages)

1. Push this repository to GitHub (branch `main`).
2. Repository settings -> Pages -> Source: **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) publishes `site/`
   on every push. The scan page must be served over HTTPS for the iPhone
   camera - GitHub Pages does this automatically.

The pages: `/station/` for the installation computer, `/scan/` for phones.
Note for visitors: the scan page must be opened in Safari itself, not in
an in-app browser (Instagram etc.), or the camera will not start.

Once the pages are live, set `decodeUrl` in `site/shared/config.js` to the
scan page's URL - it's printed on the info receipt (part 2).

### 3. Receipt printer (Epson TM-T88IV)

Every print produces **two separate cut receipts carrying the same code**,
so scanning either one resolves to the same message:

- **Part 1** - the hidden-message artwork (with its own tick strip), composed
  in the browser and sent as a PNG.
- **Part 2** - a normal-looking info receipt (date, receipt number, opening
  hours, decode link) with a matching tick strip, composed server-side by
  `epson/info_receipt.py`.

On the installation computer:

```bash
cd epson
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python print_server.py
```

The station page sends part 1 to `POST http://localhost:8740/print` and
part 2 to `POST http://localhost:8740/print-receipt` (same `code`). The
TM-T88IV prints 512 dots per line at 180 dpi; all images are rendered at
exactly that width. USB ids, cut mode, and feed lines are configured in
`epson/printer_setup/settings.yaml`.

To print part 2 by itself (e.g. while testing), use
`epson/print_info_receipt.py` - see `epson/README.md`.

### 4. Replacing the placeholder artwork

The letter-transformation is intentionally NOT part of this repo. The
contract is one function in `site/station/placeholder-art.js`:

```js
generateArtwork(text, params, seed) -> SVG string (black shapes)
```

Swap its internals for the real transformation; everything downstream
(tick strip, margins, corner marks, 1-bit raster, upload, print) stays
unchanged. Since the artwork carries no data, it can look like anything.

## How the tick code works

- **Payload**: 12-bit id + 8-bit CRC = 20 bits, drawn as 24 ticks
  (start/stop patterns included). Narrow tick = 0, wide tick = 1; the
  varying tick heights are decorative randomness seeded by the id.
- **Printing**: the strip sits at the top between the corner marks,
  ~4.5 mm tall, narrow ticks >= 3 dots wide (safe at 180 dpi).
- **Scanning**: each camera frame is converted to grayscale and sampled
  along straight and tilted scanlines (horizontal and vertical, both
  reading directions, several thresholds), so the receipt may be held
  rotated roughly +-20 degrees, sideways, or upside down. A decode is
  accepted on two scanline hits in one frame or the same id in two
  consecutive frames; the CRC makes accidental wrong decodes practically
  impossible. All of this is ~100 lines of plain JS - no OpenCV.

Verified by `node tests/tickcode.test.mjs` (simulated perspective, blur,
fading, noise, rotation): 100% decode on clean and mildly degraded
scanlines, graceful failure (no decode rather than wrong decode) on heavily
degraded ones, zero false decodes on 300 noise frames.

## Known limitations

- **Lookup, not self-contained**: prints are unreadable without the
  database and an internet connection. Export/backup the Supabase table if
  the prints should outlive the project.
- **Thermal fade**: receipts fade over weeks/months. The strip tolerates
  moderate fading (multiple binarization thresholds), but a fully faded
  print is gone.
- **Capacity**: 4095 receipts per database. Plenty for an installation;
  raise `ID_BITS` in `tickcode.js` if ever needed.
- **Trust model**: the anon key can read all messages and insert new ones.
  Fine for an installation; not a private messaging system. Anyone with a
  receipt and the URL can decode it.
