#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TICKET_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../../../../../" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/output"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUTPUT_DIR}/workspace-topology-scan-${STAMP}.log"

mkdir -p "${OUTPUT_DIR}"

{
  echo "# Workspace Topology Scan"
  echo
  echo "timestamp=$(date --iso-8601=seconds)"
  echo "repo_root=${REPO_ROOT}"
  echo
  echo "## Top-level repos"
  find "${REPO_ROOT}" -maxdepth 1 -mindepth 1 -type d | sort
  echo
  echo "## go.work"
  sed -n '1,120p' "${REPO_ROOT}/go.work"
  echo
  echo "## docmgr config"
  sed -n '1,120p' "${REPO_ROOT}/.ttmp.yaml"
  echo
  echo "## wesen-os workspace files"
  sed -n '1,120p' "${REPO_ROOT}/wesen-os/package.json"
  echo
  sed -n '1,80p' "${REPO_ROOT}/wesen-os/pnpm-workspace.yaml"
  echo
  echo "## go-go-os-frontend workspace files"
  sed -n '1,120p' "${REPO_ROOT}/go-go-os-frontend/package.json"
  echo
  sed -n '1,80p' "${REPO_ROOT}/go-go-os-frontend/pnpm-workspace.yaml"
  echo
  echo "## sibling app repos present"
  ls -d "${REPO_ROOT}"/go-go-app-* 2>/dev/null | sort || true
  echo
  echo "## startup playbook prerequisites"
  sed -n '1,140p' "${REPO_ROOT}/wesen-os/docs/startup-playbook.md"
} >"${OUT}"

echo "${OUT}"
