#!/usr/bin/env bash
set -euo pipefail

KUBECONFIG_PATH="${KUBECONFIG:-/home/manuel/code/wesen/2026-03-27--hetzner-k3s/.cache/kubeconfig-tailnet.yaml}"
APP_NAMESPACE="${APP_NAMESPACE:-wesen-os}"
APP_NAME="${APP_NAME:-wesen-os}"
APP_URL="${APP_URL:-https://wesen-os.yolo.scapegoat.dev}"

export KUBECONFIG="$KUBECONFIG_PATH"

echo "== Argo application status =="
kubectl -n argocd get application "$APP_NAME" \
  -o jsonpath='{.status.sync.status}{"\n"}{.status.health.status}{"\n"}{.status.operationState.phase}{"\n"}'

echo
echo "== Rollout status =="
kubectl -n "$APP_NAMESPACE" rollout status "deploy/$APP_NAME"

echo
echo "== In-pod federation registry =="
kubectl -n "$APP_NAMESPACE" exec "deploy/$APP_NAME" -- cat /config/federation.registry.json

echo
echo "== Live API federation registry =="
curl -fsSL "$APP_URL/api/os/federation-registry"
echo
