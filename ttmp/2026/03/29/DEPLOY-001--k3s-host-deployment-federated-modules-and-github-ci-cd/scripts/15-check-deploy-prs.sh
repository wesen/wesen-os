#!/usr/bin/env bash

set -euo pipefail

source_repo="${1:-wesen/wesen-os}"
source_pr="${2:-5}"
k3s_repo="${3:-wesen/2026-03-27--hetzner-k3s}"
k3s_pr="${4:-5}"

echo "# DEPLOY-001 PR Check"
echo
echo "## Source Repo PR"
echo
gh pr view "${source_pr}" --repo "${source_repo}" --json number,title,url,state,headRefName,baseRefName,mergeStateStatus,isDraft 2>&1
echo
echo "## Hetzner K3s Repo PR"
echo
gh pr view "${k3s_pr}" --repo "${k3s_repo}" --json number,title,url,state,headRefName,baseRefName,mergeStateStatus,isDraft 2>&1
