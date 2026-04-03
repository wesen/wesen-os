#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$ROOT_DIR"

echo "# Validate Inventory Host Contract"
echo
echo "## Host imports after collapse"
rg -n "@go-go-golems/inventory(?:/host|/launcher|/reducers|\\b)" apps/os-launcher/src apps/os-launcher/src/__tests__
echo
echo "## Launcher typecheck"
npm run typecheck -w apps/os-launcher
echo
echo "## Inventory typecheck"
npm run typecheck -w workspace-links/go-go-app-inventory/apps/inventory
echo
echo "## Focused launcher tests"
npm run test -w apps/os-launcher -- --run runtimeDebugModule registerAppsBrowserDocs launcherHost
