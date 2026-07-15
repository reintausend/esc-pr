#!/usr/bin/env python3
"""Build the receipt info-part and preview or print it.

By default this only SAVES a preview PNG (no printing, no wasted paper).
Add --print to send it to the TM-T88IV as its own cut receipt.

Examples:
  python print_info_receipt.py --code 1234
  python print_info_receipt.py --code 1234 --link https://foo/scan --print
  python print_info_receipt.py            # random code, preview only
"""

from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(PACKAGE_DIR))

from info_receipt import DEFAULT_LINK, ReceiptData, render_info_receipt  # noqa: E402
from tickcode import CODE_MAX, CODE_MIN  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--code", type=int, default=None, help="code number 1..4095 (default: random)")
    p.add_argument("--link", default=DEFAULT_LINK)
    p.add_argument("--timestamp", default=None, help="override the auto timestamp")
    p.add_argument("--out", default=str(PACKAGE_DIR / "out" / "info_receipt.png"))
    p.add_argument("--print", dest="do_print", action="store_true", help="send to the printer")
    p.add_argument("--no-cut", action="store_true", help="do not cut after printing")
    args = p.parse_args()

    code = args.code if args.code is not None else random.randint(CODE_MIN, CODE_MAX)
    if not (CODE_MIN <= code <= CODE_MAX):
        p.error(f"--code must be {CODE_MIN}..{CODE_MAX}")

    data = ReceiptData(code=code, link=args.link)
    if args.timestamp:
        data.timestamp = args.timestamp

    image = render_info_receipt(data)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(out_path)
    print(f"code #{code}")
    print(f"preview saved: {out_path}  ({image.size[0]}x{image.size[1]})")

    if not args.do_print:
        print("preview only - add --print to send to the printer")
        return 0

    from printer_setup import T88IVPrinter  # imported lazily so preview works without USB

    try:
        with T88IVPrinter(auto_finish=False) as printer:
            printer.image(image)
            printer.finish(cut=not args.no_cut)
    except (ConnectionError, RuntimeError) as exc:
        print(f"print error: {exc}", file=sys.stderr)
        return 1
    print("sent to printer")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
