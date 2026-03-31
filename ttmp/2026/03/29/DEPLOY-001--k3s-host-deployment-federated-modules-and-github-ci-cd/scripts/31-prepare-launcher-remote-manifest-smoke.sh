#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"
INVENTORY_APP="$ROOT/workspace-links/go-go-app-inventory/apps/inventory"
LAUNCHER_PUBLIC="$ROOT/apps/os-launcher/public/__federation-smoke/inventory"

echo "[1/3] Building inventory federation artifact"
(
  cd "$ROOT"
  npm run build:federation -w workspace-links/go-go-app-inventory/apps/inventory
)

echo "[2/3] Syncing artifact into launcher same-origin static path"
rm -rf "$LAUNCHER_PUBLIC"
mkdir -p "$LAUNCHER_PUBLIC"
rsync -a "$INVENTORY_APP/dist-federation/" "$LAUNCHER_PUBLIC/"

echo "[3/3] Ready to boot launcher against the manifest-backed inventory remote"
cat <<'EOF'
Run:

  cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os
  VITE_INVENTORY_REMOTE_MANIFEST_URL=/__federation-smoke/inventory/mf-manifest.json \
    npm run dev-public -w apps/os-launcher -- --port 4175

Then open:

  http://127.0.0.1:4175/
EOF
