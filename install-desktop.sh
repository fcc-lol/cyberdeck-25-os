#!/usr/bin/env bash
set -e

REPO="$(cd "$(dirname "$0")" && pwd)"
TARGET="$HOME/Desktop/cyberdeck.desktop"

mkdir -p "$HOME/Desktop"
sed "s|__REPO__|$REPO|g" "$REPO/cyberdeck.desktop" > "$TARGET"
chmod +x "$TARGET"

echo "Installed: $TARGET"
echo "On first double-click the Pi may prompt 'Execute / Execute in Terminal / Open'."
echo "Choose 'Execute in Terminal' so you can see the dev-server output."
