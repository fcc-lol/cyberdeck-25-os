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

URL="http://localhost:5173"

open_chromium() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open -na "Chromium" --args --kiosk "$URL" 2>/dev/null \
      || open -na "Google Chrome" --args --kiosk "$URL" 2>/dev/null \
      || open "$URL"
  elif command -v chromium-browser >/dev/null 2>&1; then
    chromium-browser --kiosk "$URL" >/dev/null 2>&1 &
  elif command -v chromium >/dev/null 2>&1; then
    chromium --kiosk "$URL" >/dev/null 2>&1 &
  else
    echo "Could not find Chromium. Open $URL in your browser."
  fi
}

(
  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null "$URL"; then
      open_chromium
      exit 0
    fi
    sleep 0.3
  done
  echo "Timed out waiting for $URL"
) &

exec npm run dev
