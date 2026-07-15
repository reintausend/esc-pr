#!/usr/bin/env python3
"""Prove that the tick code as rendered by info_receipt actually scans.

Renders full receipts for many random codes, extracts the printed strip as a
grayscale buffer, applies mild print/scan degradation (blur, noise, fade) and
decodes it with the faithful decoder in tickcode.py. Also checks a batch of
pure-noise images to confirm there are no false decodes.

Run:  python verify_tickcode.py
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

from PIL import Image, ImageFilter

PACKAGE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(PACKAGE_DIR))

from info_receipt import ReceiptData, render_info_receipt  # noqa: E402
from tickcode import CODE_MAX, CODE_MIN, decode_image  # noqa: E402


def to_gray_buffer(img: Image.Image):
    g = img.convert("L")
    return list(g.getdata()), g.size[0], g.size[1]


def degrade(img: Image.Image, blur: float, noise: int, fade: float, rng: random.Random) -> Image.Image:
    g = img.convert("L")
    if blur > 0:
        g = g.filter(ImageFilter.GaussianBlur(blur))
    px = list(g.getdata())
    out = []
    for v in px:
        v = 255 - (255 - v) * fade  # thermal fade: black -> gray
        v += (rng.random() * 2 - 1) * noise
        out.append(max(0, min(255, int(v))))
    g.putdata(out)
    return g


SCENARIOS = [
    ("clean      ", 0.0, 0, 1.0),
    ("mild       ", 0.6, 6, 0.85),
    ("blur+fade  ", 1.2, 10, 0.6),
    ("harsh      ", 1.6, 14, 0.45),
]
N = 60


def main() -> int:
    rng = random.Random(7)
    any_fail = False
    print(f"Verifying rendered receipts: {N} random codes x {len(SCENARIOS)} scenarios\n")

    # cache one render per code (rendering is the slow part)
    for name, blur, noise, fade in SCENARIOS:
        ok = 0
        wrong = 0
        for _ in range(N):
            code = rng.randint(CODE_MIN, CODE_MAX)
            img = render_info_receipt(ReceiptData(code=code))
            deg = degrade(img, blur, noise, fade, rng)
            data, w, h = to_gray_buffer(deg)
            res = decode_image(data, w, h)
            if res and res["code"] == code:
                ok += 1
            elif res:
                wrong += 1
        flag = "  <-- FALSE DECODE" if wrong else ""
        if wrong:
            any_fail = True
        print(f"  {name} decoded {ok / N * 100:5.1f}%   wrong {wrong}{flag}")

    # false-positive check on noise
    fp = 0
    for _ in range(120):
        w, h = 512, 200
        noise_img = Image.frombytes(
            "L", (w, h), bytes(rng.randint(0, 255) for _ in range(w * h))
        )
        data, w2, h2 = to_gray_buffer(noise_img)
        if decode_image(data, w2, h2):
            fp += 1
    print(f"\n  pure-noise false decodes: {fp}/120{'  <-- FALSE DECODE' if fp else ''}")
    if fp:
        any_fail = True

    print("\nRESULT:", "FAILURES" if any_fail else "all rendered receipts scan, zero false decodes")
    return 1 if any_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
