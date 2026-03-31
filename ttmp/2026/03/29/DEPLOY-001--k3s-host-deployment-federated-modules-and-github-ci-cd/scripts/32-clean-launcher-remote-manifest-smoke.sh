#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"
TARGET="$ROOT/apps/os-launcher/public/__federation-smoke"

rm -rf "$TARGET"
echo "Removed $TARGET"
