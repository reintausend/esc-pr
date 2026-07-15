#!/usr/bin/env python3
"""Discover the Epson TM-T88IV on USB and show connection details."""

import sys
from pathlib import Path

import usb.core

# Allow running as: python printer_setup/discover_usb.py
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from printer_setup import find_printer, list_endpoints, load_settings


def main() -> int:
    settings = load_settings()

    try:
        device = find_printer(settings)
    except ConnectionError as exc:
        print(exc, file=sys.stderr)
        return 1

    usb_cfg = settings.usb
    print(f"Found: {device.manufacturer} {device.product}")
    print(f"  Vendor ID:  {usb_cfg.vendor_id:#06x}")
    print(f"  Product ID: {usb_cfg.product_id:#06x}")
    print(f"  Serial:     {_serial(device)}")
    print(f"\nCanvas: {settings.canvas.width_dots} x "
          f"{settings.canvas.height_dots or 'continuous'} dots")
    print(f"Cut after job: {settings.print.cut} ({settings.print.cut_mode})")
    print("\nEndpoints:")
    for ep in list_endpoints(device):
        print(
            f"  interface {ep['interface']}: "
            f"0x{ep['address']:02x} {ep['direction']}"
        )
    print("\nUpdate printer_setup/settings.yaml if printing fails.")
    return 0


def _serial(device: usb.core.Device) -> str:
    try:
        return device.serial_number or "(unknown)"
    except (ValueError, usb.core.USBError):
        return "(unavailable)"


if __name__ == "__main__":
    raise SystemExit(main())
