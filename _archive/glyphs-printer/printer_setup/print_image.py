#!/usr/bin/env python3
"""Print an image file with configurable resize behavior from settings.yaml."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from printer_setup import T88IVPrinter, load_settings, prepare_image


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Print an image on the Epson TM-T88IV.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python printer_setup/print_image.py logo.png
  python printer_setup/print_image.py photo.jpg --no-resize
  python printer_setup/print_image.py photo.jpg --fit contain --max-height 800
  python printer_setup/print_image.py banner.png --fit cover --max-width 512 --max-height 400

Resize behavior defaults to settings.yaml (image section).
CLI flags override settings for this print job only.
        """.strip(),
    )
    parser.add_argument("image", help="Path to PNG, JPG, GIF, or other Pillow-supported image")
    parser.add_argument(
        "--no-resize",
        action="store_true",
        help="Print at original size (overrides image.resize in settings.yaml)",
    )
    parser.add_argument(
        "--resize",
        action="store_true",
        help="Force resize on (overrides image.resize: false in settings.yaml)",
    )
    parser.add_argument(
        "--fit",
        choices=["width", "height", "contain", "cover", "none"],
        help="How to fit the image (default: from settings.yaml)",
    )
    parser.add_argument(
        "--no-aspect-ratio",
        action="store_true",
        help="Stretch to target size without preserving proportions",
    )
    parser.add_argument(
        "--max-width",
        type=int,
        metavar="DOTS",
        help="Max width in dots (default: canvas.width_dots from settings.yaml)",
    )
    parser.add_argument(
        "--max-height",
        type=int,
        metavar="DOTS",
        help="Max height in dots (required for fit: height/contain/cover)",
    )
    parser.add_argument(
        "--no-grayscale",
        action="store_true",
        help="Skip grayscale conversion (overrides image.grayscale in settings.yaml)",
    )
    parser.add_argument(
        "--no-cut",
        action="store_true",
        help="Do not cut paper after printing (overrides print.cut for this job)",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.resize and args.no_resize:
        parser.error("Use either --resize or --no-resize, not both.")

    resize: bool | None = None
    if args.no_resize:
        resize = False
    elif args.resize:
        resize = True

    settings = load_settings()

    try:
        image = prepare_image(
            args.image,
            settings,
            resize=resize,
            keep_aspect_ratio=False if args.no_aspect_ratio else None,
            fit=args.fit,
            max_width_dots=args.max_width,
            max_height_dots=args.max_height,
            grayscale=False if args.no_grayscale else None,
        )
    except (FileNotFoundError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"Source: {args.image}")
    print(f"Print size: {image.size[0]} x {image.size[1]} dots ({image.mode})")

    try:
        with T88IVPrinter(auto_finish=False) as printer:
            printer.image(image)
            printer.finish(cut=not args.no_cut)
    except (ConnectionError, RuntimeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print("Image sent to printer.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())   