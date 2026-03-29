#!/usr/bin/env bash

set -euo pipefail

repo="${1:-wesen/wesen-os}"
workflow_name="${2:-publish-host-image}"
workflow_file="${3:-publish-host-image.yml}"

echo "# Host Workflow Registration Check"
echo
echo "- repo: \`${repo}\`"
echo "- workflow_name: \`${workflow_name}\`"
echo "- workflow_file: \`${workflow_file}\`"
echo

echo "## gh workflow list"
echo
if ! gh workflow list --repo "${repo}" 2>&1; then
  echo
  echo "gh workflow list failed"
fi

echo
echo "## grep for workflow name"
echo
if gh workflow list --repo "${repo}" 2>&1 | grep -F "${workflow_name}"; then
  echo
  echo "workflow name found in registered workflow list"
else
  echo
  echo "workflow name NOT found in registered workflow list"
fi

echo
echo "## gh run list by workflow file"
echo
if ! gh run list --repo "${repo}" --workflow "${workflow_file}" --limit 5 2>&1; then
  echo
  echo "gh run list could not resolve the workflow file"
fi
