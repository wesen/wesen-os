#!/usr/bin/env bash

set -euo pipefail

repo="${1:-wesen/wesen-os}"
run_id="${2:-23721065473}"

echo "# Missing GitOps PR Token Run Capture"
echo
echo "- repo: \`${repo}\`"
echo "- run_id: \`${run_id}\`"
echo
echo "## Run Summary"
echo
gh run view "${run_id}" --repo "${repo}" --json status,conclusion,url,jobs 2>&1
echo
echo "## Matching Log Lines"
echo
gh run view "${run_id}" --repo "${repo}" --log | \
  rg -n "GITOPS_PR_TOKEN|skipping GitOps PR creation|failing because GitOps PR creation" -S 2>&1 | \
  sed -n '1,120p'
