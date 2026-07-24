# ESC-PR — iMac station setup

Step-by-step guide to run the **desktop station** on the installation iMac
and print on the **Epson TM-T88IV** (USB).

**Target machine:** 27″ iMac (Intel / x86_64). Use the normal Intel build of
Python — nothing Rosetta- or Apple-Silicon-specific.

The browser cannot talk to USB. A small local Python server on the iMac
bridges the GUI and the printer.

---

## What you need

| Item | Notes |
|---|---|
| 27″ iMac (Intel) | Same machine the printer is plugged into |
| Epson TM-T88IV | USB cable, power on, 80 mm paper loaded |
| This repo | Cloned onto the iMac |
| Python 3 | macOS / Xcode CLT, or python.org **macOS 64-bit Intel** installer |
| Internet (first run) | To `pip install` dependencies; later optional if cloud storage is already set up |

You do **not** need Epson’s macOS driver or POS software.

**Supabase** (message storage for phones) and the phone decode URL are already
set in `barcode_system/site/shared/config.js`. You normally do not change them.

---

## One-time setup

### 1. Install developer tools (if `python3` is missing)

Open **Terminal** and run:

```bash
xcode-select --install
```

Confirm Python works:

```bash
python3 --version
python3 -c "import platform; print(platform.machine())"
```

You want Python 3.10+ (3.11 / 3.12 is fine). On this Intel iMac,
`platform.machine()` should print `x86_64`.

### 2. Clone the project

```bash
cd ~
git clone git@github.com:reintausend/esc-pr.git
cd esc-pr
```

If SSH keys are not set up on the iMac, use HTTPS instead:

```bash
git clone https://github.com/reintausend/esc-pr.git
cd esc-pr
```

### 3. Connect the printer

1. Plug the TM-T88IV into the iMac with USB  
2. Power the printer on  
3. Load paper  
4. Wait until it is ready (no error lights)

### 4. Create the print-server environment (first run only)

From the repo root:

```bash
cd ~/esc-pr
chmod +x start-print-server.sh barcode_system/epson/start_print_server.sh
./start-print-server.sh
```

On the first run this will:

- create `barcode_system/epson/.venv`
- install Python packages from `requirements.txt`
- start the server on `http://127.0.0.1:8740`

Leave that Terminal window open. You should see something like:

```text
Glyphs Print Server: http://127.0.0.1:8740
```

### 5. Verify the printer is seen

Open a **second** Terminal window:

```bash
curl http://127.0.0.1:8740/health
```

Expected when everything is fine:

```json
{"ok": true, "printer_connected": true, "error": null, "canvas_width_dots": 512}
```

If `"printer_connected": false`, see [Troubleshooting](#troubleshooting).

Optional USB discovery:

```bash
cd ~/esc-pr/barcode_system/epson
.venv/bin/python printer_setup/discover_usb.py
```

Optional test print:

```bash
cd ~/esc-pr/barcode_system/epson
.venv/bin/python printer_setup/print_test.py
```

---

## Every day (start the installation)

You need **two Terminal windows** (or tabs).

### Terminal A — print server

```bash
cd ~/esc-pr
./start-print-server.sh
```

Leave it running the whole time people use the station.

### Terminal B — desktop GUI (local web server)

```bash
cd ~/esc-pr
python3 -m http.server 8000
```

Leave it running too.

### Open the station in Safari (or Chrome)

```text
http://localhost:8000/gui/
```

Flow: **Start → enter message → Create → edit → Print**

Print sends two receipts:

1. Artwork (secret glyphs)  
2. Info receipt with the scannable tick strip  

Phones decode via:

```text
https://reintausend.github.io/esc-pr/mobile/
```

---

## After a git pull (updates from your MacBook)

```bash
cd ~/esc-pr
git pull
```

If print dependencies changed, restart the print server once; it reinstalls
when `requirements.txt` is newer than the last install marker.

```bash
cd ~/esc-pr
./start-print-server.sh
```

---

## Command cheat sheet

```bash
# Go to project
cd ~/esc-pr

# Update code
git pull

# Start print bridge (Terminal A) — keep open
./start-print-server.sh

# Start local website (Terminal B) — keep open
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/gui/

# Check printer bridge
curl http://127.0.0.1:8740/health

# Stop whatever is listening on a port (if stuck)
lsof -ti :8740 | xargs kill
lsof -ti :8000 | xargs kill

# USB discover / test print
cd ~/esc-pr/barcode_system/epson
.venv/bin/python printer_setup/discover_usb.py
.venv/bin/python printer_setup/print_test.py
```

---

## GitHub Pages vs local GUI

| How you open the UI | Print? |
|---|---|
| `http://localhost:8000/gui/` (recommended on the iMac) | Yes, if print server is running |
| `https://reintausend.github.io/esc-pr/gui/` | May work; some browsers block HTTPS → `localhost`. If Print fails, use local `http.server` instead |

The print server **must** always run on the iMac that has the USB printer.
Phones only need the GitHub Pages mobile URL (no print server).

---

## Troubleshooting

| Problem | What to do |
|---|---|
| `python3: command not found` | Run `xcode-select --install` |
| Print button: connection / Failed to fetch | Is `./start-print-server.sh` running? Check `curl http://127.0.0.1:8740/health` |
| `"printer_connected": false` | USB cable, power, paper; run `discover_usb.py` |
| Port 8740 already in use | `lsof -ti :8740 \| xargs kill` then start again |
| Pillow / architecture `ImportError` | Delete `barcode_system/epson/.venv` and recreate with Intel Python: `rm -rf barcode_system/epson/.venv` then `./start-print-server.sh` (do not copy a `.venv` from an Apple Silicon MacBook) |
| Phone cannot find the message | Supabase must be reachable; station and phone both use `config.js`. Offline/localStorage only works in the **same** browser |
| Nothing prints but health is OK | Try `print_test.py`; check paper and printer cover |

**Do not copy** `barcode_system/epson/.venv` from your Apple Silicon MacBook to this Intel iMac — always create the venv on the iMac itself.

---

## Quick mental model

```text
Safari  →  localhost:8000/gui/     (station UI)
               │
               │  Print click
               ▼
        localhost:8740             (Python print server)
               │
               ▼
        Epson TM-T88IV (USB)
```

Keep both servers running while the installation is open.
