#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"

echo "# Runtime Federation Registry Path Check"
echo
echo "## Go endpoint tests"
(cd "$ROOT" && go test ./cmd/wesen-os-launcher/...)
echo
echo "## Launcher typecheck"
(cd "$ROOT" && npm run typecheck -w apps/os-launcher)
echo
echo "## Launcher federation tests"
(cd "$ROOT" && npm run test -w apps/os-launcher -- --run federationRegistry bootstrapLauncherApp loadFederatedAppContracts)
