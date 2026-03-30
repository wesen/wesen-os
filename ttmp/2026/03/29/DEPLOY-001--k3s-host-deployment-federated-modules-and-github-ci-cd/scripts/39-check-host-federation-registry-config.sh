#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"
K3S="/home/manuel/code/wesen/2026-03-27--hetzner-k3s"

echo "== Local deploy package =="
kubectl kustomize "$ROOT/deploy/k8s/wesen-os" | rg -n "federation\\.registry\\.json|--federation-registry=/config/federation\\.registry\\.json|assets\\.example\\.invalid|enabled\": false"

echo
echo "== Hetzner GitOps package =="
kubectl kustomize "$K3S/gitops/kustomize/wesen-os" | rg -n "federation\\.registry\\.json|--federation-registry=/config/federation\\.registry\\.json|assets\\.example\\.invalid|enabled\": false"
