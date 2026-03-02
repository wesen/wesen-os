#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_PATH="${LAUNCHER_BIN:-${ROOT_DIR}/build/wesen-os-launcher}"

mkdir -p "$(dirname "${BIN_PATH}")"

echo "[launcher:binary:build] building ${BIN_PATH}"
(cd "${ROOT_DIR}" && go build -o "${BIN_PATH}" ./cmd/wesen-os-launcher)

echo "[launcher:binary:build] built ${BIN_PATH}"
