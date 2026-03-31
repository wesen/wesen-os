#!/usr/bin/env bash
set -euo pipefail

root="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"
ticket="${root}/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff"
gitops_repo="/home/manuel/code/wesen/2026-03-27--hetzner-k3s"

python3 "${ticket}/scripts/04-dry-run-federation-gitops-target-update.py" \
  --config "${ticket}/examples/01-federation-gitops-targets.example.json" \
  --target wesen-os-inventory-prod \
  --manifest-url "https://assets.example.invalid/remotes/inventory/versions/sha-dry-run/mf-manifest.json" \
  --gitops-repo-dir "${gitops_repo}"
