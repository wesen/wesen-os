#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${SCRIPT_DIR}"
while [[ "${ROOT}" != "/" ]]; do
  if [[ -f "${ROOT}/go.work" && -d "${ROOT}/wesen-os" && -d "${ROOT}/go-go-os-frontend" ]]; then
    break
  fi
  ROOT="$(dirname "${ROOT}")"
done

if [[ "${ROOT}" == "/" ]]; then
  echo "Could not locate workspace root from ${SCRIPT_DIR}" >&2
  exit 1
fi

OUT_DIR="${SCRIPT_DIR}/output"
mkdir -p "${OUT_DIR}"
LOG_FILE="${OUT_DIR}/packaging-composition-experiments-$(date +%Y%m%d-%H%M%S).log"
export GOCACHE="${OUT_DIR}/.gocache"
export GOTMPDIR="${OUT_DIR}/.gotmp"
mkdir -p "${GOCACHE}" "${GOTMPDIR}"

{
  echo "Packaging/Composition Experiments"
  echo "workspace_root=${ROOT}"
  echo "started_at=$(date -Iseconds)"

  echo ""
  echo "=== workspace modules (go.work) ==="
  sed -n '1,120p' "${ROOT}/go.work"

  echo ""
  echo "=== wesen-os module replaces ==="
  sed -n '1,220p' "${ROOT}/wesen-os/go.mod"

  echo ""
  echo "=== launcher frontend scripts ==="
  sed -n '1,140p' "${ROOT}/wesen-os/package.json"

  echo ""
  echo "=== launcher build/sync scripts ==="
  sed -n '1,140p' "${ROOT}/wesen-os/scripts/launcher-ui-sync.sh"
  sed -n '1,140p' "${ROOT}/wesen-os/scripts/build-wesen-os-launcher.sh"
  sed -n '1,220p' "${ROOT}/wesen-os/scripts/smoke-wesen-os-launcher.sh"

  echo ""
  echo "=== launcher embed handler ==="
  sed -n '1,140p' "${ROOT}/wesen-os/pkg/launcherui/handler.go"

  echo ""
  echo "=== launcher Vite proxy map ==="
  sed -n '1,220p' "${ROOT}/wesen-os/apps/os-launcher/vite.config.ts"

  echo ""
  echo "=== run targeted tests for packaging/route assumptions ==="
  (cd "${ROOT}/wesen-os" && go test ./pkg/launcherui -run 'TestSPAHandler_FallsBackToIndexForClientRoutes' -v)
  (cd "${ROOT}/go-go-os-backend" && go test ./pkg/backendhost -run 'TestMountNamespacedRoutes_PrefixRootRedirectStaysNamespaced' -v)

  echo ""
  echo "completed_at=$(date -Iseconds)"
  echo "status=ok"
} >"${LOG_FILE}"

echo "wrote ${LOG_FILE}"
