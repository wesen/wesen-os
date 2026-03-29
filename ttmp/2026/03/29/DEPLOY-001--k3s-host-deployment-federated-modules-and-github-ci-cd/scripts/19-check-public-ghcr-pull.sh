#!/usr/bin/env bash

set -euo pipefail

image_ref="${1:-ghcr.io/wesen/wesen-os@sha256:751929d27806403965bc7998ed1e4dfec168b1ee81723535dd695b04b8e8fbf2}"

echo "# Public GHCR Pull Check"
echo
echo "- image_ref: \`${image_ref}\`"
echo
echo "## Anonymous docker manifest inspect"
echo
tmpdir="$(mktemp -d)"
DOCKER_CONFIG="${tmpdir}" docker manifest inspect "${image_ref}"
rm -rf "${tmpdir}"
echo
echo "## Anonymous docker pull"
echo
tmpdir="$(mktemp -d)"
DOCKER_CONFIG="${tmpdir}" docker pull "${image_ref}"
rm -rf "${tmpdir}"
