#!/usr/bin/env bash
set -euo pipefail

root="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"
inventory_repo="${root}/workspace-links/go-go-app-inventory"
k3s_repo="/home/manuel/code/wesen/2026-03-27--hetzner-k3s"

echo "== Inventory workflow =="
sed -n '1,220p' "${inventory_repo}/.github/workflows/publish-federation-remote.yml"
echo
echo "== Inventory publish helper =="
sed -n '1,260p' "${inventory_repo}/scripts/publish_federation_remote.py"
echo
echo "== Existing host registry target =="
sed -n '1,120p' "${k3s_repo}/gitops/kustomize/wesen-os/configmap.yaml"
