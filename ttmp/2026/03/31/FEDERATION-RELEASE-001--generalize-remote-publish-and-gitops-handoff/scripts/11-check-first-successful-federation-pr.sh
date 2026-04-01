#!/usr/bin/env bash
set -euo pipefail

RUN_ID="${1:-23852417685}"
SOURCE_REPO="${2:-go-go-golems/go-go-app-inventory}"
GITOPS_REPO="${3:-wesen/2026-03-27--hetzner-k3s}"
BRANCH="${4:-automation/federation-inventory-wesen-os-inventory-prod-sha-8bee502}"

echo "== Successful source workflow run =="
gh run view "$RUN_ID" --repo "$SOURCE_REPO" --json databaseId,headSha,workflowName,status,conclusion,url
echo
echo "== Open GitOps PR =="
gh pr list --repo "$GITOPS_REPO" --head "$BRANCH" --state open --json number,title,url,headRefName
