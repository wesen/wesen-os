#!/usr/bin/env bash
set -euo pipefail

inventory_root="${1:-/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory}"
infra_root="${2:-/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling}"
gitops_root="${3:-/home/manuel/code/wesen/2026-03-27--hetzner-k3s}"

pushd "${inventory_root}" >/dev/null
npm run build:federation -w apps/inventory >/dev/null

tmp_output="$(mktemp)"
python3 scripts/publish_federation_remote.py \
  --source-dir apps/inventory/dist-federation \
  --remote-id inventory \
  --version sha-ticket-dryrun \
  --bucket scapegoat-federation-assets \
  --endpoint https://fsn1.your-objectstorage.com \
  --region fsn1 \
  --public-base-url https://scapegoat-federation-assets.fsn1.your-objectstorage.com \
  --dry-run \
  --github-output "${tmp_output}" >/dev/null
popd >/dev/null

manifest_url="$(grep '^manifest_url=' "${tmp_output}" | cut -d= -f2-)"
rm -f "${tmp_output}"

python3 "${infra_root}/scripts/federation/update_federation_gitops_target.py" \
  --config "${inventory_root}/deploy/federation-gitops-targets.json" \
  --target wesen-os-inventory-prod \
  --manifest-url "${manifest_url}" \
  --gitops-repo-dir "${gitops_root}" | sed -n '1,20p'
