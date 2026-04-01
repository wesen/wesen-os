#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:-/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory}"
infra_root="${2:-/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling}"

echo "Checking inventory workflow for infra-tooling consumption"
echo "- repo_root: ${repo_root}"
echo "- infra_root: ${infra_root}"

yq eval '.' "${repo_root}/.github/workflows/publish-federation-remote.yml" >/dev/null

grep -n "repository: go-go-golems/infra-tooling" "${repo_root}/.github/workflows/publish-federation-remote.yml"
grep -n "path: .infra-tooling" "${repo_root}/.github/workflows/publish-federation-remote.yml"
grep -n "update_federation_gitops_target.py" "${repo_root}/.github/workflows/publish-federation-remote.yml"

python3 -m py_compile \
  "${infra_root}/scripts/federation/patch_federation_registry_target.py" \
  "${infra_root}/scripts/federation/update_federation_gitops_target.py"

echo "inventory workflow consumes infra-tooling updater path"
