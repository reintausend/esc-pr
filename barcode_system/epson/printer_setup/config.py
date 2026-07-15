"""Load printer settings from settings.yaml."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

PACKAGE_DIR = Path(__file__).resolve().parent
DEFAULT_SETTINGS_PATH = PACKAGE_DIR / "settings.yaml"


@dataclass(frozen=True)
class PaperSettings:
    width_mm: float
    printable_width_mm: float
    dpi: int

    @property
    def width_dots(self) -> int:
        return round(self.printable_width_mm / 25.4 * self.dpi)


@dataclass(frozen=True)
class CanvasSettings:
    width_dots: int
    height_dots: int | None
    background: str


@dataclass(frozen=True)
class PrintSettings:
    cut: bool
    cut_mode: str
    feed_lines: int


@dataclass(frozen=True)
class ImageSettings:
    resize: bool
    keep_aspect_ratio: bool
    fit: str
    max_width_dots: int | None
    max_height_dots: int | None
    grayscale: bool


@dataclass(frozen=True)
class UsbSettings:
    vendor_id: int
    product_id: int
    in_ep: int
    out_ep: int
    profile: str


@dataclass(frozen=True)
class Settings:
    paper: PaperSettings
    canvas: CanvasSettings
    print: PrintSettings
    image: ImageSettings
    usb: UsbSettings
    path: Path

    @classmethod
    def from_dict(cls, data: dict[str, Any], path: Path) -> Settings:
        paper_raw = data.get("paper", {})
        canvas_raw = data.get("canvas", {})
        print_raw = data.get("print", {})
        image_raw = data.get("image", {})
        usb_raw = data.get("usb", {})

        paper = PaperSettings(
            width_mm=float(paper_raw.get("width_mm", 80)),
            printable_width_mm=float(paper_raw.get("printable_width_mm", 72)),
            dpi=int(paper_raw.get("dpi", 180)),
        )

        width_dots = canvas_raw.get("width_dots")
        canvas = CanvasSettings(
            width_dots=int(width_dots) if width_dots is not None else paper.width_dots,
            height_dots=canvas_raw.get("height_dots"),
            background=str(canvas_raw.get("background", "white")).lower(),
        )

        print_settings = PrintSettings(
            cut=bool(print_raw.get("cut", True)),
            cut_mode=str(print_raw.get("cut_mode", "PART")).upper(),
            feed_lines=int(print_raw.get("feed_lines", 3)),
        )

        max_width = image_raw.get("max_width_dots")
        max_height = image_raw.get("max_height_dots")
        image_settings = ImageSettings(
            resize=bool(image_raw.get("resize", True)),
            keep_aspect_ratio=bool(image_raw.get("keep_aspect_ratio", True)),
            fit=str(image_raw.get("fit", "width")).lower(),
            max_width_dots=int(max_width) if max_width is not None else None,
            max_height_dots=int(max_height) if max_height is not None else None,
            grayscale=bool(image_raw.get("grayscale", True)),
        )

        usb = UsbSettings(
            vendor_id=_parse_int(usb_raw.get("vendor_id", 0x04B8)),
            product_id=_parse_int(usb_raw.get("product_id", 0x0202)),
            in_ep=_parse_int(usb_raw.get("in_ep", 0x82)),
            out_ep=_parse_int(usb_raw.get("out_ep", 0x01)),
            profile=str(usb_raw.get("profile", "TM-T88IV")),
        )

        return cls(
            paper=paper,
            canvas=canvas,
            print=print_settings,
            image=image_settings,
            usb=usb,
            path=path,
        )


def _parse_int(value: int | str) -> int:
    if isinstance(value, str):
        return int(value, 0)
    return int(value)


def load_settings(path: Path | str | None = None) -> Settings:
    """Load settings from YAML. Defaults to settings.yaml in this folder."""
    settings_path = Path(path) if path else DEFAULT_SETTINGS_PATH
    if not settings_path.exists():
        raise FileNotFoundError(f"Settings file not found: {settings_path}")

    with settings_path.open(encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}

    return Settings.from_dict(data, settings_path)
