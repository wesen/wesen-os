#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$ROOT_DIR"

echo "# Federation Registry Shape Audit"
echo
echo "## Registry source"
sed -n '1,220p' apps/os-launcher/src/app/federationRegistry.ts
echo
echo "## Local contract resolver"
sed -n '1,260p' apps/os-launcher/src/app/localFederatedAppContracts.ts
