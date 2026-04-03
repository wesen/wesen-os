#!/usr/bin/env bash
set -euo pipefail

root="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"
ticket="${root}/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff"
source_config="/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml"
tmp_file="$(mktemp)"
trap 'rm -f "${tmp_file}"' EXIT

cp "${source_config}" "${tmp_file}"

python3 "${ticket}/scripts/02-patch-federation-registry-target.py" \
  --target-file "${tmp_file}" \
  --remote-id inventory \
  --manifest-url "https://assets.example.invalid/remotes/inventory/versions/sha-template/mf-manifest.json" \
  --enabled true

echo "== patched file =="
sed -n '1,120p' "${tmp_file}"
