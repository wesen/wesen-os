#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_PATH="${LAUNCHER_BIN:-${ROOT_DIR}/build/wesen-os-launcher}"
PORT="${LAUNCHER_PORT:-18091}"
BASE_URL="http://127.0.0.1:${PORT}"
MAX_STARTUP_MS="${MAX_STARTUP_MS:-20000}"
SKIP_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --port)
      PORT="$2"
      BASE_URL="http://127.0.0.1:${PORT}"
      shift 2
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/wesen-os-launcher-smoke.XXXXXX")"
LOG_FILE="${WORK_DIR}/launcher.log"
MISSING_LOG_FILE="${WORK_DIR}/missing-required.log"
HOME_DIR="${WORK_DIR}/home"
XDG_CONFIG_DIR="${WORK_DIR}/xdg-config"
PROFILE_REGISTRY_FILE="${WORK_DIR}/profiles.runtime.yaml"
PID=""

mkdir -p "${HOME_DIR}" "${XDG_CONFIG_DIR}"

cat >"${PROFILE_REGISTRY_FILE}" <<'YAML'
slug: smoke
profiles:
  default:
    slug: default
    runtime:
      step_settings_patch:
        ai-chat:
          ai-engine: gpt-4.1-mini
YAML

cleanup() {
  if [[ -n "${PID}" ]] && kill -0 "${PID}" >/dev/null 2>&1; then
    kill "${PID}" >/dev/null 2>&1 || true
    wait "${PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

fail() {
  local message="$1"
  echo "FAIL: ${message}" >&2
  if [[ -f "${LOG_FILE}" ]]; then
    echo "--- launcher log tail ---" >&2
    tail -n 80 "${LOG_FILE}" >&2 || true
  fi
  if [[ -f "${MISSING_LOG_FILE}" ]]; then
    echo "--- missing-required log ---" >&2
    cat "${MISSING_LOG_FILE}" >&2 || true
  fi
  exit 1
}

if [[ "${SKIP_BUILD}" -eq 0 ]]; then
  echo "[smoke] building launcher binary"
  (cd "${ROOT_DIR}" && npm run launcher:binary:build)
fi

if [[ ! -x "${BIN_PATH}" ]]; then
  fail "launcher binary is missing: ${BIN_PATH}"
fi

echo "[smoke] launching ${BIN_PATH}"
START_MS="$(date +%s%3N)"
HOME="${HOME_DIR}" XDG_CONFIG_HOME="${XDG_CONFIG_DIR}" "${BIN_PATH}" wesen-os-launcher \
  --addr "127.0.0.1:${PORT}" \
  --profile default \
  --profile-registries "${PROFILE_REGISTRY_FILE}" \
  --inventory-db "${WORK_DIR}/inventory.db" \
  --timeline-dsn "file:${WORK_DIR}/timeline.db?_foreign_keys=on" \
  --turns-dsn "file:${WORK_DIR}/turns.db?_foreign_keys=on" \
  --inventory-seed-on-start=true \
  --inventory-reset-on-start=true \
  >"${LOG_FILE}" 2>&1 &
PID=$!

READY=0
for _ in $(seq 1 200); do
  if curl -fsS "${BASE_URL}/api/os/apps" >"${WORK_DIR}/apps.json" 2>/dev/null; then
    READY=1
    break
  fi
  if ! kill -0 "${PID}" >/dev/null 2>&1; then
    fail "launcher process exited before readiness"
  fi
  sleep 0.1
done

if [[ "${READY}" -ne 1 ]]; then
  fail "launcher did not become ready at ${BASE_URL}"
fi

STARTUP_MS="$(( $(date +%s%3N) - START_MS ))"
echo "[smoke] startup_ms=${STARTUP_MS}"
if (( STARTUP_MS > MAX_STARTUP_MS )); then
  fail "startup exceeded threshold (${STARTUP_MS}ms > ${MAX_STARTUP_MS}ms)"
fi

curl -fsS "${BASE_URL}/" >"${WORK_DIR}/root.html" || fail "launcher root route is not reachable"
grep -qi '<div id="root"' "${WORK_DIR}/root.html" || fail "launcher root HTML missing root mount"

grep -q '"app_id":"inventory"' "${WORK_DIR}/apps.json" || fail "/api/os/apps missing inventory app"
grep -q '"healthy":true' "${WORK_DIR}/apps.json" || fail "/api/os/apps does not report healthy modules"

PROFILE_STATUS="$(curl -sS -o "${WORK_DIR}/profiles.json" -w "%{http_code}" "${BASE_URL}/api/apps/inventory/api/chat/profiles")"
if [[ "${PROFILE_STATUS}" != "200" ]]; then
  fail "namespaced backend endpoint returned ${PROFILE_STATUS}"
fi
grep -q '"slug"' "${WORK_DIR}/profiles.json" || fail "namespaced profile payload missing slug field"

for route in "/chat" "/ws?conv_id=legacy-smoke" "/api/timeline?conv_id=legacy-smoke"; do
  LEGACY_STATUS="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}${route}")"
  if [[ "${LEGACY_STATUS}" != "404" ]]; then
    fail "legacy alias still reachable (${route} -> ${LEGACY_STATUS})"
  fi
done

if HOME="${HOME_DIR}" XDG_CONFIG_HOME="${XDG_CONFIG_DIR}" "${BIN_PATH}" wesen-os-launcher \
  --addr "127.0.0.1:0" \
  --profile default \
  --profile-registries "${PROFILE_REGISTRY_FILE}" \
  --required-apps "inventory,missing" \
  --inventory-db "${WORK_DIR}/inventory-missing.db" \
  >"${MISSING_LOG_FILE}" 2>&1; then
  fail "missing required app check unexpectedly passed"
fi
grep -q 'required backend module "missing" is not registered' "${MISSING_LOG_FILE}" || fail "missing required app failure message mismatch"

echo "[smoke] PASS"
echo "[smoke] logs: ${LOG_FILE}"
