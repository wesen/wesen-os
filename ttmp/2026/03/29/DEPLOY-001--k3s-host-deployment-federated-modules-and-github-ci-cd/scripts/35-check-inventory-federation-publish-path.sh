#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory"

echo "# Inventory Federation Publish Path Check"
echo
echo "## Workflow"
yq eval '.' "$ROOT/.github/workflows/publish-federation-remote.yml"
echo
echo "## Python Syntax"
python3 -m py_compile "$ROOT/scripts/publish_federation_remote.py"
echo
echo "## Dry Run Plan"
(
  cd "$ROOT"
  python3 scripts/publish_federation_remote.py \
    --source-dir apps/inventory/dist-federation \
    --remote-id inventory \
    --version sha-localproof \
    --bucket demo-bucket \
    --endpoint https://example.invalid \
    --region eu-central \
    --public-base-url https://assets.example.invalid \
    --dry-run
)
