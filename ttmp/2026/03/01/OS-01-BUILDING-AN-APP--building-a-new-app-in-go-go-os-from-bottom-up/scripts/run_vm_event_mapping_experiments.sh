#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${SCRIPT_DIR}"
while [[ "${ROOT}" != "/" ]]; do
  if [[ -d "${ROOT}/go-go-os-frontend" && -d "${ROOT}/go-go-app-inventory" && -d "${ROOT}/go-go-app-arc-agi-3" ]]; then
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
LOG_FILE="${OUT_DIR}/vm-event-mapping-experiments-$(date +%Y%m%d-%H%M%S).log"

{
  echo "VM/Event Mapping Experiments"
  echo "workspace_root=${ROOT}"
  echo "started_at=$(date -Iseconds)"
  echo ""

  echo "=== Bootstrap dispatch primitives ==="
  rg -n "defineStackBundle|dispatchCardAction|dispatchSessionAction|dispatchDomainAction|dispatchSystemCommand|__stackHost\\.event" \
    "${ROOT}/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js" -S

  echo ""
  echo "=== Runtime intent routing ==="
  rg -n "dispatchRuntimeIntent|toDomainAction|toSystemAction|authorizeDomainIntent|authorizeSystemIntent|ingestRuntimeIntent" \
    "${ROOT}/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/pluginIntentRouting.ts" -S

  echo ""
  echo "=== Artifact projection to runtime cards ==="
  rg -n "runtimeCardId|runtimeCardCode|registerRuntimeCard|extractArtifactUpsertFromTimelineEntity|hypercard\\.card\\.v2|hypercard\\.widget\\.v1" \
    "${ROOT}/go-go-os-frontend/packages/hypercard-runtime/src/hypercard/artifacts/artifactRuntime.ts" \
    "${ROOT}/go-go-os-frontend/packages/hypercard-runtime/src/hypercard/artifacts/artifactProjectionMiddleware.ts" \
    "${ROOT}/go-go-os-frontend/packages/chat-runtime/src/chat/sem/timelineMapper.ts" -S

  echo ""
  echo "=== Inventory plugin bundle intent emissions ==="
  rg -n "dispatchDomainAction\\('inventory'|dispatchCardAction|dispatchSystemCommand|dispatchSessionAction" \
    "${ROOT}/go-go-app-inventory/apps/inventory/src/domain/pluginBundle.vm.js" -S

  echo ""
  echo "=== ARC plugin bundle intent emissions ==="
  rg -n "dispatchDomainAction\\('arc'|dispatchCardAction|dispatchSystemCommand|dispatchSessionAction|command\\.request" \
    "${ROOT}/go-go-app-arc-agi-3/apps/arc-agi-player/src/domain/pluginBundle.ts" -S

  echo ""
  echo "=== Inventory reducer action contracts (domain sink) ==="
  rg -n "updateQty|saveItem|deleteItem|createItem|receiveStock" \
    "${ROOT}/go-go-app-inventory/apps/inventory/src/features/inventory/inventorySlice.ts" -S

  echo ""
  echo "completed_at=$(date -Iseconds)"
  echo "status=ok"
} >"${LOG_FILE}"

echo "wrote ${LOG_FILE}"
