#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TICKET_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../../../../../" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/output"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUTPUT_DIR}/launcher-coupling-scan-${STAMP}.log"

mkdir -p "${OUTPUT_DIR}"

{
  echo "# Launcher Coupling Scan"
  echo
  echo "timestamp=$(date --iso-8601=seconds)"
  echo "repo_root=${REPO_ROOT}"
  echo
  echo "## manual alias usage"
  rg -n "go-go-os-frontend|go-go-app-arc-agi-3|go-go-app-sqlite|go-go-app-inventory" \
    "${REPO_ROOT}/wesen-os/apps/os-launcher" \
    "${REPO_ROOT}/wesen-os/scripts" \
    "${REPO_ROOT}/wesen-os/docs" \
    "${REPO_ROOT}/wesen-os/go.mod"
  echo
  echo "## launcher module imports"
  nl -ba "${REPO_ROOT}/wesen-os/apps/os-launcher/src/app/modules.tsx" | sed -n '1,120p'
  echo
  echo "## launcher store imports"
  nl -ba "${REPO_ROOT}/wesen-os/apps/os-launcher/src/app/store.ts" | sed -n '1,160p'
  echo
  echo "## package export comparison"
  nl -ba "${REPO_ROOT}/go-go-app-inventory/apps/inventory/package.json" | sed -n '1,80p'
  echo
  nl -ba "${REPO_ROOT}/go-go-os-frontend/apps/todo/package.json" | sed -n '1,60p'
  echo
  nl -ba "${REPO_ROOT}/go-go-os-frontend/apps/crm/package.json" | sed -n '1,60p'
  echo
  nl -ba "${REPO_ROOT}/go-go-os-frontend/apps/book-tracker-debug/package.json" | sed -n '1,60p'
  echo
  nl -ba "${REPO_ROOT}/go-go-os-frontend/apps/apps-browser/package.json" | sed -n '1,80p'
  echo
  nl -ba "${REPO_ROOT}/go-go-os-frontend/apps/hypercard-tools/package.json" | sed -n '1,80p'
  echo
  echo "## desktop-os contracts"
  nl -ba "${REPO_ROOT}/go-go-os-frontend/packages/desktop-os/src/contracts/appManifest.ts" | sed -n '1,200p'
  echo
  nl -ba "${REPO_ROOT}/go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts" | sed -n '1,160p'
  echo
  nl -ba "${REPO_ROOT}/go-go-os-frontend/packages/desktop-os/src/registry/createAppRegistry.ts" | sed -n '1,160p'
  echo
  nl -ba "${REPO_ROOT}/go-go-os-frontend/packages/desktop-os/src/store/createLauncherStore.ts" | sed -n '1,180p'
  echo
  echo "## backend manifest contract"
  nl -ba "${REPO_ROOT}/go-go-os-backend/pkg/backendhost/module.go" | sed -n '1,200p'
  echo
  nl -ba "${REPO_ROOT}/go-go-os-backend/pkg/backendhost/manifest_endpoint.go" | sed -n '1,200p'
  echo
  echo "## composition mount in wesen-os"
  nl -ba "${REPO_ROOT}/wesen-os/cmd/wesen-os-launcher/main.go" | sed -n '314,342p'
} >"${OUT}"

echo "${OUT}"
