#!/usr/bin/env bash

set -euo pipefail

repo_root="${1:-/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os}"
reference_root="${2:-/home/manuel/code/wesen/2026-03-24--draft-review}"

echo "# Draft Review Workflow Comparison"
echo
echo "- repo_root: \`${repo_root}\`"
echo "- reference_root: \`${reference_root}\`"
echo
echo "## Unified Diff"
echo
diff -u \
  "${reference_root}/.github/workflows/publish-image.yaml" \
  "${repo_root}/.github/workflows/publish-host-image.yml" || true
