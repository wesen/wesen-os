#!/usr/bin/env bash

set -euo pipefail

gitops_root="${1:-/home/manuel/code/wesen/2026-03-27--hetzner-k3s}"

echo "# K3s wesen-os Image Pin Check"
echo
echo "- gitops_root: \`${gitops_root}\`"
echo
echo "## Deployment Image Line"
echo
rg -n "image:" "${gitops_root}/gitops/kustomize/wesen-os/deployment.yaml"
echo
echo "## Kustomize Render Validation"
echo
kubectl kustomize "${gitops_root}/gitops/kustomize/wesen-os" >/dev/null
echo "kubectl kustomize succeeded"
