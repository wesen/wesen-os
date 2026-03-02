#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${SCRIPT_DIR}"
while [[ "${ROOT}" != "/" ]]; do
  if [[ -d "${ROOT}/go-go-os-backend" && -d "${ROOT}/go-go-app-inventory" && -d "${ROOT}/wesen-os" ]]; then
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
LOG_FILE="${OUT_DIR}/backend-contract-experiments-$(date +%Y%m%d-%H%M%S).log"
export GOCACHE="${OUT_DIR}/.gocache"
export GOTMPDIR="${OUT_DIR}/.gotmp"
mkdir -p "${GOCACHE}" "${GOTMPDIR}"

run_case() {
  local name="$1"
  shift
  {
    echo ""
    echo "=== ${name} ==="
    echo "COMMAND: $*"
    "$@"
  } >>"${LOG_FILE}" 2>&1
}

{
  echo "Backend Contract Experiments"
  echo "workspace_root=${ROOT}"
  echo "started_at=$(date -Iseconds)"
} >"${LOG_FILE}"

run_case "go-go-os-backend backendhost contract tests" \
  bash -lc "cd '${ROOT}/go-go-os-backend' && go test ./pkg/backendhost -run 'Test(NewModuleRegistry_RejectsDuplicateAppID|MountNamespacedRoutes_MountsUnderAppPrefix|RegisterAppsManifestEndpoint_ReturnsManifestAndHealth|RegisterAppsManifestEndpoint_ModuleReflectionRoute_ReturnsPayload)' -v"

run_case "inventory backendcomponent contract tests" \
  bash -lc "cd '${ROOT}/go-go-app-inventory' && go test ./pkg/backendcomponent -run 'Test(ManifestContract|LifecycleRequiresServer|MountRoutesValidatesRequiredDependencies)' -v"

run_case "arc backendmodule contract tests" \
  bash -lc "cd '${ROOT}/go-go-app-arc-agi-3' && go test ./pkg/backendmodule -run 'Test(Module_GameAndSessionFlow|Module_ActionRequiresResetGUID|Module_NormalizesFramePayloadsAtHTTPBoundary|Module_ReflectionAndSchemas)' -v"

run_case "gepa backendmodule contract tests" \
  bash -lc "cd '${ROOT}/go-go-gepa' && go test ./pkg/backendmodule -run 'Test(Module_ReflectionAndSchemas|Module_EventsAndTimelineEndpoints|Module_EnforcesMaxConcurrentRuns)' -v"

run_case "wesen-os launcher integration samples" \
  bash -lc "cd '${ROOT}/wesen-os' && go test ./cmd/wesen-os-launcher -run 'Test(WSHandler_EmitsHypercardLifecycleEvents|OSAppsEndpoint_ListsInventoryModuleCapabilities|OSAppsEndpoint_ListsGEPAModuleReflectionMetadata|OSAppsEndpoint_ListsARCModuleReflectionMetadata|ConfirmRoutes_CoexistWithChatAndTimelineRoutes)' -v"

{
  echo ""
  echo "completed_at=$(date -Iseconds)"
  echo "status=ok"
} >>"${LOG_FILE}"

echo "wrote ${LOG_FILE}"
