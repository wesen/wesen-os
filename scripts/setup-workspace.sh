#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_dir() {
  local path="$1"
  local name="$2"
  if [[ ! -d "${path}" ]]; then
    echo "missing required workspace repo: ${name} (${path})" >&2
    exit 1
  fi
}

require_dir "${ROOT_DIR}" "wesen-os"
echo "[workspace:setup] initializing git submodules into wesen-os/workspace-links"
(cd "${ROOT_DIR}" && bash ./scripts/init-submodules.sh)

echo "[workspace:setup] installing wesen-os deps"
(cd "${ROOT_DIR}" && pnpm install)

echo "[workspace:setup] syncing go workspace"
(cd "${ROOT_DIR}" && go work sync)

echo "[workspace:setup] syncing go module graph"
(cd "${ROOT_DIR}" && go mod tidy)

echo "[workspace:setup] done"
