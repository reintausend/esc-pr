"""Tick code for the receipt info-part - Python port of site/shared/tickcode.js.

The DATA layout is byte-for-byte identical to the JavaScript version
(12-bit id + CRC-8 = 20 payload bits, same start/stop, narrow=1 / wide=2.5
module widths), so a strip drawn here is read by the same browser scanner.

- pack_payload / module_sequence: encoding
- draw_tickcode: render onto a PIL ImageDraw (clean full-height bars)
- decode_line / decode_image: a faithful decoder, used only for verification
  (verify_tickcode.py) to prove that what we print actually scans.
"""

from __future__ import annotations

ID_BITS = 12
PAYLOAD_BITS = 20  # id + crc8
WIDE = 2.5

CODE_MIN = 1
CODE_MAX = (1 << ID_BITS) - 1  # 4095


# --- payload ----------------------------------------------------------------

def crc8(byte_values) -> int:
    c = 0
    for b in byte_values:
        c ^= b
        for _ in range(8):
            c = ((c << 1) ^ 0x07) & 0xFF if c & 0x80 else (c << 1) & 0xFF
    return c


def pack_payload(code: int) -> int:
    if code < CODE_MIN or code > CODE_MAX:
        raise ValueError(f"code out of range 1..{CODE_MAX}: {code}")
    return (code << 8) | crc8([(code >> 8) & 0xFF, code & 0xFF])


def unpack_payload(payload: int):
    code = (payload >> 8) & CODE_MAX
    check = payload & 0xFF
    if code < CODE_MIN or crc8([(code >> 8) & 0xFF, code & 0xFF]) != check:
        return None
    return code


def module_sequence(payload: int):
    """[(width_units, is_black)] excluding quiet zones."""
    seq = [
        (WIDE, True),
        (WIDE, False),  # asymmetry marker: the only wide gap
        (1, True),
        (1, False),
    ]
    for k in range(PAYLOAD_BITS - 1, -1, -1):
        seq.append((WIDE if (payload >> k) & 1 else 1, True))
        seq.append((1, False))
    seq.extend([(1, True), (1, False), (WIDE, True)])
    return seq


# --- rendering --------------------------------------------------------------

def tickcode_layout(code: int, max_width: int):
    """Return (unit, total_px, bars) where bars is a list of (x_offset, width)."""
    seq = module_sequence(pack_payload(code))
    total_units = sum(w for w, _ in seq)
    unit = max(3, int(max_width // total_units))
    widths = [round(w * unit) for w, _ in seq]
    total_px = sum(widths)
    bars = []
    x = 0
    for (w, is_black), pw in zip(seq, widths):
        if is_black:
            bars.append((x, pw))
        x += pw
    return unit, total_px, bars


def draw_tickcode(draw, code: int, x: int, y: int, max_width: int, height: int) -> int:
    """
    Draw the tick strip (clean full-height black bars) horizontally centered
    within max_width. Returns the pixel width actually used.

    The caller must leave a quiet zone (>= 2.5 * unit, ~white margin) on both
    sides; info_receipt.py handles that by centering the strip in the page.
    """
    unit, total_px, bars = tickcode_layout(code, max_width)
    start_x = x + (max_width - total_px) // 2
    for (bx, bw) in bars:
        draw.rectangle([start_x + bx, y, start_x + bx + bw - 1, y + height - 1], fill=0)
    return total_px


# --- decoding (verification only; mirrors the JS algorithm) ------------------

_BAR_COUNT = 2 + PAYLOAD_BITS + 2
_RUNS_NEEDED = _BAR_COUNT * 2 - 1


def decode_line(line):
    lo = min(line)
    hi = max(line)
    if hi - lo < 50:
        return []
    ids = []
    for f in (0.5, 0.35, 0.65):
        thr = lo + (hi - lo) * f
        runs = []
        cur = line[0] < thr
        length = 0
        for v in line:
            black = v < thr
            if black == cur:
                length += 1
            else:
                runs.append((length, cur))
                cur = black
                length = 1
        runs.append((length, cur))
        _scan_runs(runs, ids)
        runs.reverse()
        _scan_runs(runs, ids)
        if ids:
            break
    return ids


def _scan_runs(runs, out):
    i = 1
    while i + _RUNS_NEEDED - 1 < len(runs):
        if runs[i][1]:
            code = _try_decode_at(runs, i)
            if code is not None:
                out.append(code)
        i += 1


def _try_decode_at(runs, i):
    b1 = runs[i + 2][0]
    g1 = runs[i + 3][0]
    unit = (b1 + g1) / 2
    if unit < 1:
        return None
    if not (1.7 <= runs[i][0] / unit <= 3.8):
        return None
    if not (1.7 <= runs[i + 1][0] / unit <= 3.8):
        return None
    if not (0.5 <= b1 / unit <= 1.5):
        return None
    if runs[i - 1][1] or runs[i - 1][0] < 2.5 * unit:
        return None

    payload = 0
    for k in range(PAYLOAD_BITS):
        bar = runs[i + 4 + 2 * k][0]
        gap = runs[i + 5 + 2 * k][0]
        r = bar / unit
        if r > 3.8 or r < 0.4:
            return None
        payload = (payload << 1) | (1 if r > 1.6 else 0)
        if gap < 0.4 * unit or gap > 1.9 * unit:
            return None
        unit = 0.75 * unit + 0.25 * gap

    base = i + 4 + 2 * PAYLOAD_BITS
    sb = runs[base][0] / unit
    sg = runs[base + 1][0] / unit
    sw = runs[base + 2][0] / unit
    if not (0.4 <= sb <= 1.6):
        return None
    if not (0.4 <= sg <= 1.9):
        return None
    if not (1.7 <= sw <= 3.8):
        return None
    if base + 3 < len(runs):
        after = runs[base + 3]
        if after[1] or after[0] < 2.5 * unit:
            return None
    return unpack_payload(payload)


def decode_image(gray, width, height):
    """Scan horizontal rows of a grayscale buffer (row-major list/bytes)."""
    counts = {}
    step = max(1, height // 40)
    for row in range(0, height, step):
        line = gray[row * width:(row + 1) * width]
        for code in decode_line(line):
            counts[code] = counts.get(code, 0) + 1
    if not counts:
        return None
    best = max(counts.items(), key=lambda kv: kv[1])
    return {"code": best[0], "hits": best[1]}
