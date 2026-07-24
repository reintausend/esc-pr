#!/bin/bash
# Start the local print server (Epson TM-T88IV bridge on http://127.0.0.1:8740).
set -euo pipefail
cd "$(dirname "$0")"

PORT=8740
HEALTH="http://127.0.0.1:${PORT}/health"

if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Print server is already running on http://127.0.0.1:${PORT}/"
  echo "Health:"
  curl -sf "${HEALTH}" 2>/dev/null || echo "(could not reach ${HEALTH})"
  echo
  echo "Leave that terminal open, or stop it with:"
  echo "  lsof -ti :${PORT} | xargs kill"
  exit 0
fi

echo "Starting ESC-PR print server..."

if [ ! -d ".venv" ]; then
  echo "Creating Python virtualenv (.venv)..."
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

MARKER=".venv/.deps_installed"
if [ ! -f "$MARKER" ] || [ requirements.txt -nt "$MARKER" ]; then
  echo "Installing dependencies (first run can take a minute)..."
  pip install -r requirements.txt
  touch "$MARKER"
fi

echo
echo "Glyphs Print Server: http://127.0.0.1:${PORT}"
echo "Endpoints: GET /health, POST /print, POST /print-receipt"
echo "Leave this terminal open while using Print in the GUI."
echo

exec python print_server.py
