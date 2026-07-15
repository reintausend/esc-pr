# printer_setup

Portable printing module for the **Epson TM-T88IV** over USB on macOS. Copy this entire folder into any Python project to print without POS software or an Epson macOS driver.

## Why this folder exists

Epson does not provide a usable macOS driver for the TM-T88IV on modern macOS (including Sonoma). The ePOS JavaScript SDK in the parent project only works over **network (LAN)** — not USB — and targets newer printer models.

This folder solves that by speaking **ESC/POS** directly to the printer over USB:

```
Your app  →  printer_setup  →  python-escpos  →  USB  →  TM-T88IV
```

Everything needed to print lives here: driver code, USB configuration, canvas sizing, cut behavior, and dependencies list. No other files from `drucker_test` are required.

## Folder contents

| File | Purpose |
|------|---------|
| `settings.yaml` | **Your configuration** — canvas size, cut behavior, USB IDs |
| `config.py` | Loads and validates `settings.yaml` |
| `t88iv.py` | Printer driver (USB connection, text, images, barcodes, cut) |
| `canvas.py` | Create correctly sized bitmaps for custom layouts |
| `__init__.py` | Public API exports |
| `requirements.txt` | Python dependencies to install in your project |
| `discover_usb.py` | Verify the printer is connected |
| `print_test.py` | Send a test page |
| `print_image.py` | Print an image file with resize options |
| `PRINTER_SETUP.md` | This file |

## Setup in a new project

1. Copy the `printer_setup/` folder into your project root.

2. Install dependencies:

   ```bash
   pip install -r printer_setup/requirements.txt
   ```

3. Connect the TM-T88IV via USB and power it on.

4. Verify connection:

   ```bash
   python printer_setup/discover_usb.py
   ```

5. Print a test page:

   ```bash
   python printer_setup/print_test.py
   ```

## Configuration (`settings.yaml`)

All printer behavior is controlled in one place.

### Paper and canvas

```yaml
paper:
  width_mm: 80              # physical paper width
  printable_width_mm: 72.2  # standard TM-T88IV printable area
  dpi: 180                  # standard TM-T88IV (ReStick uses 203 dpi / 576 dots)

canvas:
  width_dots: 512           # max raster width for standard TM-T88IV + python-escpos profile
  height_dots: null         # null = continuous receipt; set e.g. 600 for labels
  background: white
```

**Canvas width:** Standard TM-T88IV = **512 dots** (72.2 mm @ 180 dpi). ReStick models use 576 dots @ 203 dpi — adjust `settings.yaml` accordingly.

**Canvas height**:
- `null` — receipt mode (paper length depends on content)
- a number — fixed height in dots for labels, tickets, or pre-designed layouts

### Cut behavior

```yaml
print:
  cut: true         # false = no cut after job (paper stays attached)
  cut_mode: PART    # PART (partial tab) or FULL (complete cut)
  feed_lines: 3     # blank lines before cutting
```

When `cut: false`, the printer feeds paper but does not cut — useful for multi-part prints or tear-off by hand.

### Image resize

```yaml
image:
  resize: true              # auto-resize before printing
  keep_aspect_ratio: true   # preserve proportions
  fit: width                # width | height | contain | cover | none
  max_width_dots: null      # null = canvas width (512 dots)
  max_height_dots: null     # required for height/contain/cover
  grayscale: true           # convert color to grayscale (recommended)
```

| `fit` mode | Behavior |
|------------|----------|
| `width` | Scale to canvas width, height follows aspect ratio |
| `height` | Scale to `max_height_dots`, width follows aspect ratio |
| `contain` | Fit inside width×height box, no cropping |
| `cover` | Fill width×height box, crop overflow (centered) |
| `none` | Original size (same as `resize: false`) |

### USB connection

```yaml
usb:
  vendor_id: 0x04b8
  product_id: 0x0202
  in_ep: 0x82
  out_ep: 0x01
  profile: TM-T88IV
```

These values were verified on macOS Sonoma. Run `discover_usb.py` if your endpoints differ.

## How it works

1. **`settings.yaml`** defines paper size, canvas dimensions, and whether to cut.

2. **`config.py`** reads the YAML into typed settings objects.

3. **`t88iv.py`** opens a USB connection via libusb and sends ESC/POS commands through `python-escpos`.

4. When you exit a `with T88IVPrinter()` block (or call `finish()`), the module feeds blank lines and cuts — **only if `print.cut` is `true`**.

5. **`canvas.py`** creates PIL images at the configured width/height so your layouts match the physical paper.

## Usage examples

### Text print (respects cut setting)

```python
from printer_setup import T88IVPrinter

with T88IVPrinter() as printer:
    printer.align("center")
    printer.line("Event Ticket")
    printer.align("left")
    printer.line("Row 5, Seat 12")
# Automatically feeds and cuts if print.cut is true in settings.yaml
```

### Override cut for one job

```python
with T88IVPrinter(auto_finish=False) as printer:
    printer.line("Part 1 of 2")
    printer.finish(cut=False)   # feed only, no cut

with T88IVPrinter() as printer:
    printer.line("Part 2 of 2")
    # cuts based on settings.yaml
```

### Custom bitmap at configured canvas size

```python
from printer_setup import T88IVPrinter, create_draw_context

image, draw, settings = create_draw_context(height_dots=400)
draw.text((20, 20), "Custom label", fill=0)
draw.rectangle([0, 0, settings.canvas.width_dots - 1, 399], outline=0)

with T88IVPrinter() as printer:
    printer.image(image)
```

### Print an image file

```bash
python printer_setup/print_image.py logo.png
python printer_setup/print_image.py photo.jpg --no-resize
python printer_setup/print_image.py photo.jpg --fit contain --max-height 800
python printer_setup/print_image.py banner.png --fit cover --max-width 512 --max-height 400 --no-cut
```

In code (uses `settings.yaml` image section):

```python
from printer_setup import T88IVPrinter, prepare_image

image = prepare_image("logo.png")  # resized per settings.yaml

with T88IVPrinter() as printer:
    printer.image(image)
```

Override resize for one job:

```python
image = prepare_image("photo.jpg", fit="contain", max_height_dots=600)
```

### Barcode and QR

```python
with T88IVPrinter() as printer:
    printer.barcode("123456789012", "EAN13")
    printer.qr("https://example.com/ticket/42")
```

### Raw ESC/POS bytes

```python
with T88IVPrinter(auto_finish=False) as printer:
    printer.raw(b"\x1b\x40")       # initialize
    printer.raw(b"Hello\x0a")
    printer.finish()
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Printer not found | Check USB cable/power; run `discover_usb.py` |
| No USB backend | `pip install libusb-package pyusb` |
| Invalid endpoint | Update `usb.in_ep` / `usb.out_ep` in `settings.yaml` |
| Wrong image width | Set `canvas.width_dots` explicitly in `settings.yaml` |
| Paper cuts when you don't want it | Set `print.cut: false` |

## What you do NOT need

- Epson macOS driver
- POS / receipt software
- The ePOS JavaScript SDK (LAN only)
- CUPS printer setup

The TM-T88IV must be connected via **USB**. For network printing in the future, a different approach (ePOS SDK or raw TCP) would be needed.
