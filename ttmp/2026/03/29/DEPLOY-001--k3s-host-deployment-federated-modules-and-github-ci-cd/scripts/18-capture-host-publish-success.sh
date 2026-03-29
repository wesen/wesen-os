#!/usr/bin/env bash

set -euo pipefail

repo="${1:-wesen/wesen-os}"
run_id="${2:-23718834950}"

echo "# Host Publish Success Capture"
echo
echo "- repo: \`${repo}\`"
echo "- run_id: \`${run_id}\`"
echo
echo "## Run Summary"
echo
gh run view "${run_id}" --repo "${repo}" --json status,conclusion,url,jobs 2>&1
echo
echo "## Digest Lines"
echo
gh run view "${run_id}" --repo "${repo}" --log | \
  rg -n "digest:|containerimage.digest|sha256:" -n -S 2>&1 | \
  sed -n '1,80p'

