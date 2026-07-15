# epson – Epson TM-T88IV Druckserver

Lokaler Python-Server, der den **Epson TM-T88IV** über USB (ESC/POS) ansteuert.
Der Browser kann nicht direkt auf USB zugreifen – deshalb läuft dieser
Flask-Server als Brücke zwischen der Website (`site/station/`) und dem
Drucker. Er bedient zwei unabhängige Teile jedes Ausdrucks:

- **Teil 1 – geheime Nachricht**: die im Browser generierte Grafik samt
  Tick-Strip, als PNG von `site/station/main.js` gesendet.
- **Teil 2 – Info-Beleg**: ein normal aussehender Kassenbeleg (Datum,
  Belegnummer, Öffnungszeiten, Decode-Link), serverseitig von
  `info_receipt.py` erzeugt. Trägt denselben Code wie Teil 1, damit beide
  Belege zur gleichen Nachricht decodieren.

## Aufbau

```
site/station/main.js  →  POST /print (PNG)          →  print_server.py  →  printer_setup/  →  TM-T88IV
site/station/main.js  →  POST /print-receipt (code)  →  info_receipt.py  ┘
```

| Pfad | Zweck |
|---|---|
| `print_server.py` | Flask-Server (Port 8740): `/health`, `/print`, `/print-receipt` |
| `info_receipt.py` | Baut den Info-Beleg (Teil 2): Text + Tick-Strip, 512 dots breit |
| `tickcode.py` | Python-Port des Tick-Codes (gleiches Format wie `site/shared/tickcode.js`) |
| `print_info_receipt.py` | CLI: Info-Beleg als PNG-Vorschau speichern oder direkt drucken |
| `verify_tickcode.py` | Testet Rendern+Decodieren des Tick-Codes unter Störungen (Unschärfe, Rauschen, Verblassen) |
| `start_print_server.sh` | Virtualenv anlegen, Abhängigkeiten installieren, Server starten |
| `requirements.txt` | Python-Abhängigkeiten (Drucker + Server) |
| `printer_setup/` | Portables ESC/POS-Modul (USB, Bildvorbereitung, Cut) |
| `printer_setup/PRINTER_SETUP.md` | Detaillierte Dokumentation des Druckermoduls |

## Installation (einmalig)

1. Drucker per USB verbinden und einschalten, Papier einlegen.

2. Abhängigkeiten installieren und Server starten:

```bash
cd epson
chmod +x start_print_server.sh
./start_print_server.sh
```

Alternativ manuell:

```bash
cd epson
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python print_server.py
```

Das venv muss zur Prozessor-Architektur passen (Apple Silicon → arm64
Python); ein x86_64-venv unter Rosetta führt zu einem `ImportError` bei
Pillow.

3. Verbindung prüfen (zweites Terminal):

```bash
curl http://127.0.0.1:8740/health
```

Erwartete Antwort bei verbundenem Drucker:

```json
{"ok": true, "printer_connected": true, "error": null, "canvas_width_dots": 512}
```

4. Die Website (`site/station/index.html`) öffnen und **Print & store**
   klicken – das druckt automatisch beide Teile als zwei separate Belege.

## Info-Beleg (Teil 2) einzeln testen

Ohne Browser, direkt per CLI:

```bash
cd epson
.venv/bin/python print_info_receipt.py --code 1234                 # nur Vorschau (out/info_receipt.png)
.venv/bin/python print_info_receipt.py --code 1234 --print         # tatsächlich drucken
.venv/bin/python print_info_receipt.py --code 1234 --link "https://..." --print
```

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| Print-Button meldet Verbindungsfehler | `./start_print_server.sh` läuft? |
| `printer_connected: false` | USB-Kabel, Strom, `python printer_setup/discover_usb.py` |
| Kein USB-Backend | `pip install libusb-package pyusb` |
| Falscher Endpoint | `usb.in_ep` / `usb.out_ep` in `printer_setup/settings.yaml` anpassen |
| `ImportError` bei Pillow (`incompatible architecture`) | venv neu mit nativer arm64-Python anlegen (siehe oben) |

Details zum Druckermodul: [printer_setup/PRINTER_SETUP.md](printer_setup/PRINTER_SETUP.md)
