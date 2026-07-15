#!/usr/bin/env python3
"""
Zweck dieser Datei:
Lokaler Druckserver als Brücke zwischen der Preview-Seite (Browser)
und dem Epson TM-T88IV (USB/ESC/POS über printer_setup/).

Endpunkte:
  GET  /health         – Druckerstatus und Canvas-Breite in dots
  POST /print           – PNG-Daten im Request-Body drucken (Teil 1: geheime Nachricht)
  POST /print-receipt   – Info-Beleg aus {code, link?, timestamp?, cut?} bauen und drucken (Teil 2)

Start:
  python3 print_server.py
  (oder ./start_print_server.sh)
"""

from __future__ import annotations

import sys
from io import BytesIO
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

PRINTER_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PRINTER_ROOT))

from printer_setup import T88IVPrinter, find_printer, load_settings, prepare_image
from info_receipt import ReceiptData, render_info_receipt
from tickcode import CODE_MAX, CODE_MIN

HOST = "127.0.0.1"
PORT = 8740

app = Flask(__name__)
CORS(app)


@app.get("/health")
def health() -> tuple[dict, int]:
    settings = load_settings()
    connected = False
    error: str | None = None
    try:
        find_printer(settings)
        connected = True
    except Exception as exc:
        error = str(exc)

    return jsonify(
        {
            "ok": True,
            "printer_connected": connected,
            "error": error,
            "canvas_width_dots": settings.canvas.width_dots,
        }
    ), 200


@app.post("/print")
def print_png() -> tuple[dict, int]:
    if not request.data:
        return jsonify({"ok": False, "error": "Leerer Druckauftrag."}), 400

    try:
        source = Image.open(BytesIO(request.data))
        prepared = prepare_image(source)

        with T88IVPrinter(auto_finish=False) as printer:
            printer.image(prepared)
            printer.finish()

        return jsonify(
            {
                "ok": True,
                "width": prepared.size[0],
                "height": prepared.size[1],
            }
        ), 200
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.post("/print-receipt")
def print_receipt() -> tuple[dict, int]:
    """
    Build and print the receipt info-part (part 2).

    JSON body: { "code": 1..4095, "link"?: str, "timestamp"?: str, "cut"?: bool }
    """
    payload = request.get_json(silent=True) or {}
    code = payload.get("code")
    if not isinstance(code, int) or not (CODE_MIN <= code <= CODE_MAX):
        return jsonify({"ok": False, "error": f"code must be {CODE_MIN}..{CODE_MAX}"}), 400

    try:
        data = ReceiptData(code=code)
        if payload.get("link"):
            data.link = str(payload["link"])
        if payload.get("timestamp"):
            data.timestamp = str(payload["timestamp"])

        image = render_info_receipt(data)
        with T88IVPrinter(auto_finish=False) as printer:
            printer.image(image)
            printer.finish(cut=payload.get("cut", True))

        return jsonify({"ok": True, "code": code, "height": image.size[1]}), 200
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


if __name__ == "__main__":
    print(f"Glyphs Print Server: http://{HOST}:{PORT}")
    print("Endpunkte: GET /health, POST /print, POST /print-receipt")
    app.run(host=HOST, port=PORT, debug=False)
