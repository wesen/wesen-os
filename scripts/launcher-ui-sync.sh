#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIST="${ROOT_DIR}/apps/os-launcher/dist"
DST_DIST="${ROOT_DIR}/pkg/launcherui/dist"

if [[ ! -d "${SRC_DIST}" ]]; then
  echo "missing launcher frontend dist: ${SRC_DIST}" >&2
  echo "run: npm run launcher:frontend:build" >&2
  exit 1
fi

mkdir -p "${DST_DIST}"

find "${DST_DIST}" -mindepth 1 -maxdepth 1 ! -name '.embedkeep' -exec rm -rf {} +
cp -R "${SRC_DIST}/." "${DST_DIST}/"

echo "[launcher:ui:sync] synced ${SRC_DIST} -> ${DST_DIST}"
