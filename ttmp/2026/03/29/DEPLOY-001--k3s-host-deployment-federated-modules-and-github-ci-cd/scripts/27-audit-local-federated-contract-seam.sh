#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$ROOT_DIR"

echo "# Local Federated Contract Seam Audit"
echo
echo "## Inventory imports inside launcher"
rg -n "@go-go-golems/inventory(?:/host|/launcher|/reducers|\\b)" apps/os-launcher/src apps/os-launcher/src/__tests__
echo
echo "## Local seam source"
sed -n '1,220p' apps/os-launcher/src/app/localFederatedAppContracts.ts
