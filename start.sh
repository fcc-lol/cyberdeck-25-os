#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm not found in PATH."
  echo
  echo "Install Node.js (includes npm):"
  echo "  macOS:         brew install node"
  echo "  Raspberry Pi:  sudo apt install nodejs npm"
  echo "  Other:         https://nodejs.org/en/download"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

npm run dev
