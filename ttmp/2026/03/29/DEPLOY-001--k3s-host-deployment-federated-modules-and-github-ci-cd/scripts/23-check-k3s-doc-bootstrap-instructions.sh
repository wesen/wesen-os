#!/usr/bin/env bash

set -euo pipefail

gitops_root="${1:-/home/manuel/code/wesen/2026-03-27--hetzner-k3s}"

echo "# K3s Doc Bootstrap Instruction Check"
echo
echo "- gitops_root: \`${gitops_root}\`"
echo
echo "## Matches"
echo
rg -n "brand-new app|one-time bootstrap|gitops/applications/<name>|ApplicationSet|app-of-apps|kubectl apply -f gitops/applications" \
  "${gitops_root}/README.md" \
  "${gitops_root}/docs/source-app-deployment-infrastructure-playbook.md" \
  "${gitops_root}/docs/app-packaging-and-gitops-pr-standard.md" \
  "${gitops_root}/docs/public-repo-ghcr-argocd-deployment-playbook.md"
