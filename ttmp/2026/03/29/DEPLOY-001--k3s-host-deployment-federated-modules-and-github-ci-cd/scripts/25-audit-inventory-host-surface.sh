#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$ROOT_DIR"

echo "# Inventory Host Surface Audit"
echo
echo "## Host imports"
rg -n "@go-go-golems/inventory(?:/launcher|/reducers|\\b)" apps/os-launcher/src
echo
echo "## Inventory public exports"
sed -n '1,220p' workspace-links/go-go-app-inventory/apps/inventory/package.json
echo
echo "## Inventory launcher public surface"
sed -n '1,220p' workspace-links/go-go-app-inventory/apps/inventory/src/launcher/public.ts
