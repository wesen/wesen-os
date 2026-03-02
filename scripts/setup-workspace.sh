#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_DIR="$(cd "${ROOT_DIR}/.." && pwd)"

require_dir() {
  local path="$1"
  local name="$2"
  if [[ ! -d "${path}" ]]; then
    echo "missing required workspace repo: ${name} (${path})" >&2
    exit 1
  fi
}

require_dir "${ROOT_DIR}" "wesen-os"
require_dir "${WORKSPACE_DIR}/go-go-os-frontend" "go-go-os-frontend"

if [[ ! -d "${WORKSPACE_DIR}/go-go-gepa" ]]; then
  echo "[workspace:setup] cloning go-go-gepa into ${WORKSPACE_DIR}"
  git clone https://github.com/go-go-golems/go-go-gepa.git "${WORKSPACE_DIR}/go-go-gepa"
fi

echo "[workspace:setup] installing frontend workspace deps"
(cd "${WORKSPACE_DIR}/go-go-os-frontend" && pnpm install)


echo "[workspace:setup] installing wesen-os deps"
(cd "${ROOT_DIR}" && pnpm install)

echo "[workspace:setup] syncing go module graph"
(cd "${ROOT_DIR}" && go mod tidy)

echo "[workspace:setup] done"
