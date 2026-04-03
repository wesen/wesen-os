#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os"

echo "== kustomization.yaml =="
sed -n '1,200p' "$ROOT/kustomization.yaml"
echo

echo "== configmap.yaml =="
sed -n '1,240p' "$ROOT/configmap.yaml"
echo

echo "== deployment.yaml =="
sed -n '1,260p' "$ROOT/deployment.yaml"
echo

echo "== rendered package =="
kubectl kustomize "$ROOT"
