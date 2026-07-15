3#!/usr/bin/env python3
"""
Zweck dieser Datei:
Lokaler Druckserver als Brücke zwischen der Preview-Seite (Browser)
und dem Epson TM-T88IV (USB/ESC/POS über printer_setup/).

Endpunkte:
  GET  /health  – Druckerstatus und Canvas-Breite in dots
  POST /print   – PNG-Daten im Request-Body an den Drucker senden

Start:
  python3 Printer/print_server.py
  (oder ./Printer/start_print_server.sh)
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


if __name__ == "__main__":
    print(f"Glyphs Print Server: http://{HOST}:{PORT}")
    print("Endpunkte: GET /health, POST /print")
    app.run(host=HOST, port=PORT, debug=False)
