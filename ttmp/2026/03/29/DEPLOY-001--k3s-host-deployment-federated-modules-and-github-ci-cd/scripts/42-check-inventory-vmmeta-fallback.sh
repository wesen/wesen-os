#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"
INVENTORY_REPO="$ROOT_DIR/workspace-links/go-go-app-inventory"

echo "== inventory vmmeta fallback check =="
echo "repo: $INVENTORY_REPO"

cd "$INVENTORY_REPO"

echo
echo "-- fallback without backend checkout --"
GO_GO_OS_BACKEND_CMD=/nonexistent ./scripts/generate_inventory_vmmeta.sh

echo
echo "-- federation build using CI-safe vmmeta step --"
npm run build:federation -w apps/inventory
