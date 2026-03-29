#!/usr/bin/env bash

set -euo pipefail

repo="${1:-wesen/wesen-os}"
run_id="${2:-23718753340}"

echo "# Host Publish Failure Capture"
echo
echo "- repo: \`${repo}\`"
echo "- run_id: \`${run_id}\`"
echo
echo "## Job Summary"
echo
gh run view "${run_id}" --repo "${repo}" --json status,conclusion,jobs,url 2>&1
echo
echo "## Failed Logs"
echo
gh run view "${run_id}" --repo "${repo}" --log-failed 2>&1
