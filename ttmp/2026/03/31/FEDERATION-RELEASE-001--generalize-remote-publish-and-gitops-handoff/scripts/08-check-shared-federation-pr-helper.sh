#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"
INFRA="/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling"
GITOPS="/home/manuel/code/wesen/2026-03-27--hetzner-k3s"

cd "$INFRA"

python3 -m py_compile \
  scripts/federation/open_federation_gitops_pr.py \
  scripts/federation/update_federation_gitops_target.py \
  scripts/federation/patch_federation_registry_target.py \
  scripts/gitops/open_gitops_pr.py

python3 scripts/federation/open_federation_gitops_pr.py \
  --config "$ROOT/workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json" \
  --target wesen-os-inventory-prod \
  --manifest-url "https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/inventory/versions/sha-example/mf-manifest.json" \
  --gitops-repo-dir "$GITOPS" \
  --dry-run
