#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"
INVENTORY_REPO="$ROOT_DIR/workspace-links/go-go-app-inventory"

echo "== inventory go tool vmmeta check =="
echo "repo: $INVENTORY_REPO"

cd "$INVENTORY_REPO"

echo
echo "-- pinned tool declaration --"
sed -n '1,80p' tools/go.mod

echo
echo "-- tool help --"
GOWORK=off go tool -modfile=tools/go.mod go-go-os-backend --help | head -n 20

echo
echo "-- vmmeta generation --"
./scripts/generate_inventory_vmmeta.sh

echo
echo "-- federation build --"
npm run build:federation -w apps/inventory
