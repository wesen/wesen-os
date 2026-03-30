#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$ROOT_DIR"

MANIFEST_PATH="$ROOT_DIR/workspace-links/go-go-app-inventory/apps/inventory/dist-federation/mf-manifest.json"

echo "# Real Inventory Federation Smoke"
echo
echo "## Build inventory federation artifact"
npm run build:federation -w workspace-links/go-go-app-inventory/apps/inventory
echo
echo "## Manifest file"
echo "$MANIFEST_PATH"
echo
echo "## Loader smoke"
INVENTORY_FEDERATION_MANIFEST_FILE="$MANIFEST_PATH" \
  npm run test -w apps/os-launcher -- --run src/app/loadFederatedAppContracts.real.test.ts
