#!/bin/bash
# Start the local Epson print server (TM-T88IV bridge on port 8740).
# Run from anywhere; resolves paths relative to this repo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/barcode_system/epson/start_print_server.sh"
