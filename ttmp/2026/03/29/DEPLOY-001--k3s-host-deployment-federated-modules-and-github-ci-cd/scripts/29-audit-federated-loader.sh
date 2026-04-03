#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$ROOT_DIR"

echo "# Federated Loader Audit"
echo
echo "## Registry model"
sed -n '1,220p' apps/os-launcher/src/app/federationRegistry.ts
echo
echo "## Loader implementation"
sed -n '1,320p' apps/os-launcher/src/app/loadFederatedAppContracts.ts
echo
echo "## Loader tests"
sed -n '1,260p' apps/os-launcher/src/app/loadFederatedAppContracts.test.ts
