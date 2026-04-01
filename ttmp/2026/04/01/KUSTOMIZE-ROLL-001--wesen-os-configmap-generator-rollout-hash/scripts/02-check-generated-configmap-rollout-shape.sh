#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

kubectl kustomize "$ROOT" >"$TMP"

echo "== Generated configmap name =="
rg -n '^  name: wesen-os-config-[a-z0-9]+' "$TMP"
echo

echo "== Deployment still points at /config paths =="
rg -n -- '--profile-registries=/config/profiles.runtime.yaml|--federation-registry=/config/federation.registry.json' "$TMP"
echo

echo "== Deployment volume reference rewritten to generated name =="
rg -n '^          name: wesen-os-config-[a-z0-9]+' "$TMP"
echo

echo "== Whole-directory mount at /config =="
rg -n 'mountPath: /config$' "$TMP"
