#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"

echo "== Host shared runtime installer =="
sed -n '1,220p' "$ROOT/apps/os-launcher/src/app/federationSharedRuntime.ts"

echo
echo "== Launcher bootstrap =="
sed -n '1,220p' "$ROOT/apps/os-launcher/src/app/bootstrapLauncherApp.ts"

echo
echo "== Inventory federation React shim =="
sed -n '1,220p' "$ROOT/workspace-links/go-go-app-inventory/apps/inventory/src/federation-shared/react.ts"

echo
echo "== Inventory federation React Redux shim =="
sed -n '1,220p' "$ROOT/workspace-links/go-go-app-inventory/apps/inventory/src/federation-shared/react-redux.ts"

echo
echo "== Inventory federation Vite config =="
sed -n '1,240p' "$ROOT/workspace-links/go-go-app-inventory/apps/inventory/vite.federation.config.ts"
