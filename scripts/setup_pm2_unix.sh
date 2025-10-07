#!/usr/bin/env bash
set -euo pipefail

# Simple setup script for macOS / Linux to run this project under PM2
# Usage:
#   chmod +x scripts/setup_pm2_unix.sh
#   ./scripts/setup_pm2_unix.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "Project root: $ROOT_DIR"
cd "$ROOT_DIR"

echo "1) Ensure Node and npm are installed"
if ! command -v node >/dev/null 2>&1; then
  echo "node not found — please install Node.js first: https://nodejs.org/"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found — please install npm (comes with Node.js)"
  exit 1
fi

echo "2) Install project Node dependencies"
npm install

echo "3) (Optional) Ensure Python deps for listener are installed"
if [ -f requirements.txt ]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 -m pip install --user -r requirements.txt || true
  else
    echo "python3 not found — skip Python dependencies step. Install python3 and run: python3 -m pip install -r requirements.txt"
  fi
fi

echo "4) Install pm2 globally if missing"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing pm2 globally (may ask for sudo)..."
  npm install -g pm2
fi

echo "5) Start processes via PM2 using ecosystem.config.js"
pm2 start ecosystem.config.js || {
  echo "pm2 start failed — try running the command manually to see errors"
  exit 1
}

echo "6) Save PM2 process list (so it can be resurrected)"
pm2 save

echo "7) Setup PM2 startup script (you may need to run the printed command)"
START_CMD=$(pm2 startup | sed -n 's/.*\(sudo .*pm2 startup.*\)/\1/p' | head -n1 || true)
if [ -n "$START_CMD" ]; then
  echo "Run the following command (copied from pm2 startup) as instructed by pm2:" 
  echo "$START_CMD"
  echo "Running it now..."
  eval $START_CMD || echo "Failed to run the startup helper automatically. Run the printed command yourself with sudo."
else
  echo "pm2 startup returned no special command — pm2 may have handled startup automatically."
fi

echo "8) Final: make sure pm2 save was run"
pm2 save

echo "Done. Use 'pm2 list' and 'pm2 logs' to verify."
