#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"${ROOT_DIR}/scripts/setup-workspace.sh"

(cd "${ROOT_DIR}" && pnpm test)
(cd "${ROOT_DIR}" && pnpm run launcher:frontend:build)
(cd "${ROOT_DIR}" && pnpm run launcher:ui:sync)
(cd "${ROOT_DIR}" && go test ./...)
(cd "${ROOT_DIR}" && pnpm run launcher:smoke)
