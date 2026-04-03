#!/usr/bin/env bash
set -euo pipefail

manifest_url="${1:-https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/inventory/versions/sha-1a32286/mf-manifest.json}"

echo "manifest_url=${manifest_url}"
curl -fsSL "${manifest_url}"
