#!/bin/bash
# Startet den lokalen Druckserver für die Preview-Seite.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt
python print_server.py
