#!/usr/bin/env bash
set -euo pipefail

manifest_url="${1:-https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/inventory/versions/sha-1a32286/mf-manifest.json}"
origin="${2:-https://wesen-os.yolo.scapegoat.dev}"

echo "manifest_url=${manifest_url}"
echo "origin=${origin}"
curl -I -s -H "Origin: ${origin}" "${manifest_url}" | sed -n '1,20p'
