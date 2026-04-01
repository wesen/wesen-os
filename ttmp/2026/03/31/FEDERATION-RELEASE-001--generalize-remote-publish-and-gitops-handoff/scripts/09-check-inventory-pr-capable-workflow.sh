#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml"

yq eval '.' "$WORKFLOW" >/dev/null

echo "Validated YAML parse for: $WORKFLOW"
echo
echo "Relevant workflow steps:"
rg -n "Checkout infra-tooling|Checkout GitOps repo for dry-run validation|Dry-run GitOps federation target update via infra-tooling|Open GitOps PR via infra-tooling|ref: task/os-openai-app-server" "$WORKFLOW"
