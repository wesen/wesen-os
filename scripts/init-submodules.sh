#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LINK_DIR="${ROOT_DIR}/workspace-links"

if [[ ! -d "${ROOT_DIR}/.git" ]]; then
  echo "[workspace:submodules] expected git repo at ${ROOT_DIR}" >&2
  exit 1
fi

mkdir -p "${LINK_DIR}"

echo "[workspace:submodules] syncing git submodule config"
git -C "${ROOT_DIR}" submodule sync --recursive

echo "[workspace:submodules] initializing tracked workspace repos"
git -C "${ROOT_DIR}" submodule update --init --recursive
