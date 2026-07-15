# Printer – Epson TM-T88IV für Glyphs Project

Druckt die generierten Symbole aus der Preview-Seite auf den **Epson TM-T88IV**
über USB (ESC/POS). Der Browser kann nicht direkt auf USB zugreifen – deshalb
läuft ein kleiner lokaler Python-Server als Brücke.

## Aufbau

```
preview.js  →  POST /print (PNG)  →  print_server.py  →  printer_setup/  →  TM-T88IV
```

| Pfad | Zweck |
|---|---|
| `print_server.py` | Flask-Server (Port 8740): `/health`, `/print` |
| `start_print_server.sh` | Virtualenv anlegen, Abhängigkeiten installieren, Server starten |
| `requirements.txt` | Python-Abhängigkeiten (Drucker + Server) |
| `printer_setup/` | Portables ESC/POS-Modul (USB, Bildvorbereitung, Cut) |
| `printer_setup/PRINTER_SETUP.md` | Detaillierte Dokumentation des Druckermoduls |

## Installation (einmalig)

1. Drucker per USB verbinden und einschalten, Papier einlegen.

2. Abhängigkeiten installieren und Server starten:

```bash
cd /Users/julianflorchinger/Desktop/Glyphs_Project/Printer
chmod +x start_print_server.sh
./start_print_server.sh
```

Alternativ manuell:

```bash
cd Printer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python print_server.py
```

3. Verbindung prüfen (zweites Terminal):

```bash
curl http://127.0.0.1:8740/health
```

Erwartete Antwort bei verbundenem Drucker:

```json
{"ok": true, "printer_connected": true, "error": null, "canvas_width_dots": 512}
```

4. Webserver für die App (drittes Terminal):

```bash
cd /Users/julianflorchinger/Desktop/Glyphs_Project
python3 -m http.server 8000
```

5. Im Browser: `http://localhost:8000/index.html` → Create → Preview → **Print**

## Preview-Integration

- Button **Print** unten rechts auf der Preview-Seite
- Sendet die Gesamt-SVG als PNG an `http://127.0.0.1:8740/print`
- Bild wird auf die druckbare Breite (512 dots / 72,2 mm @ 180 dpi) skaliert (`settings.yaml`)

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| Print-Button meldet Verbindungsfehler | `./start_print_server.sh` läuft? |
| `printer_connected: false` | USB-Kabel, Strom, `python printer_setup/discover_usb.py` |
| Kein USB-Backend | `pip install libusb-package pyusb` |
| Falscher Endpoint | `usb.in_ep` / `usb.out_ep` in `printer_setup/settings.yaml` anpassen |

Details: [printer_setup/PRINTER_SETUP.md](printer_setup/PRINTER_SETUP.md)
