#!/usr/bin/env bash
set -euo pipefail

REPO="go-go-golems/go-go-app-inventory"
RUN_ID="${1:-23851610070}"
JOB_ID="${2:-69533013866}"

gh run view "$RUN_ID" --repo "$REPO" --job "$JOB_ID" --log | rg -n "Open GitOps PR via infra-tooling|Permission to|fatal: unable to access|manifestUrl|git push origin"
