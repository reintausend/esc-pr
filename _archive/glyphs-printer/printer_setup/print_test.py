#!/usr/bin/env python3
"""Print a simple test page to verify USB connectivity."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from printer_setup import T88IVPrinter, load_settings


def main() -> int:
    settings = load_settings()
    message = " ".join(sys.argv[1:]) or "Hello from printer_setup!"

    try:
        with T88IVPrinter() as printer:
            printer.align("center")
            printer.line("=== TEST PRINT ===")
            printer.align("left")
            printer.line()
            printer.line(message)
            printer.line()
            printer.line(f"Canvas width: {settings.canvas.width_dots} dots")
            printer.line(f"Auto-cut: {settings.print.cut}")
    except (ConnectionError, RuntimeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print("Test page sent to printer.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
