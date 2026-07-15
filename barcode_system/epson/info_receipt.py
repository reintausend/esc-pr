"""Compose the receipt info-part (part 2) for the TM-T88IV.

A normal-looking store receipt: a thank-you line, a link, date, receipt number,
a fixed terminal id and opening hours, plus the scannable tick-code strip at the
bottom. Part 1 (the hidden-message artwork) is printed separately; this module
only builds the info-part, at the printer's 512-dot width.

All text uses assets/fonts/fakerece.ttf at a single size.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFont, ImageOps

PACKAGE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE_DIR.parent
sys.path.insert(0, str(PACKAGE_DIR))

from tickcode import draw_tickcode  # noqa: E402

_SETTINGS_PATH = PACKAGE_DIR / "printer_setup" / "settings.yaml"
FONT_PATH = REPO_ROOT / "assets" / "fonts" / "fakerece.ttf"

# Placeholder link until the real decode site is provided.
DEFAULT_LINK = "www.testlink.com"


def _canvas_width(default: int = 512) -> int:
    """Read the print width from settings.yaml without pulling in the USB stack."""
    try:
        with _SETTINGS_PATH.open(encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
        return int(data.get("canvas", {}).get("width_dots") or default)
    except (OSError, ValueError, TypeError):
        return default


def _load_font(size: int):
    try:
        return ImageFont.truetype(str(FONT_PATH), size)
    except OSError:
        return ImageFont.load_default()


@dataclass
class ReceiptData:
    code: int
    link: str = DEFAULT_LINK
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%d/%m/%Y  %H:%M"))
    thank_you: str = "Thank you for your visit!"
    terminal: str = "TERMINAL 001"
    hours: str = "We are open sat-sun 14:00-19:00"


def _line_height(font) -> int:
    asc, desc = font.getmetrics()
    return asc + desc


def _fit_font(draw: ImageDraw.ImageDraw, lines, max_w: int, max_size: int = 30, min_size: int = 14):
    """Largest single size at which every line fits the content width."""
    for size in range(max_size, min_size - 1, -1):
        font = _load_font(size)
        if all(draw.textlength(t, font=font) <= max_w for t in lines):
            return font, size
    return _load_font(min_size), min_size


def render_info_receipt(data: ReceiptData) -> Image.Image:
    width = _canvas_width()
    margin = 24
    content_w = width - 2 * margin

    canvas = Image.new("L", (width, 1600), 255)
    draw = ImageDraw.Draw(canvas)

    text_lines = [
        data.thank_you,
        f"find out more on {data.link}",
        f"DATE  {data.timestamp}",
        f"RECEIPT NO  {data.code}",
        data.terminal,
        data.hours,
    ]
    font, size = _fit_font(draw, text_lines, content_w)
    line_h = _line_height(font)
    spacing = max(2, round(size * 0.3))
    step = line_h + spacing

    def center(text: str, y: int) -> int:
        w = draw.textlength(text, font=font)
        draw.text(((width - w) / 2, y), text, font=font, fill=0)
        return y + step

    def left(text: str, y: int) -> int:
        draw.text((margin, y), text, font=font, fill=0)
        return y + step

    # a divider row of '*' sized to fill the content width
    star_w = draw.textlength("*", font=font) or 1
    stars = "*" * max(1, int(content_w // star_w))

    y = margin + step  # leading blank space
    y = center(stars, y)
    y = center(data.thank_you, y)
    y += step  # blank
    y = center(f"find out more on {data.link}", y)
    y += step  # blank
    y = left(f"DATE  {data.timestamp}", y)
    y = left(f"RECEIPT NO  {data.code}", y)
    y = left(data.terminal, y)
    y += 2 * step  # blank block
    y = center(data.hours, y)
    y += step  # blank

    # scannable tick code strip (centered, quiet zone left as page margin)
    strip_h = 66
    draw_tickcode(draw, data.code, margin, y, content_w, strip_h)
    y += strip_h

    # trim to the actual content with a small uniform vertical pad
    pad = 8
    bbox = ImageOps.invert(canvas).getbbox()
    if bbox:
        top = max(0, bbox[1] - pad)
        bottom = min(canvas.height, bbox[3] + pad)
    else:
        top, bottom = 0, y
    return canvas.crop((0, top, width, bottom))
