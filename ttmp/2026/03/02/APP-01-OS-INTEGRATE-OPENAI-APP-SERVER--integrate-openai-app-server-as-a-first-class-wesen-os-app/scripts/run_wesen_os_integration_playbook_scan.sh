#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/home/manuel/workspaces/2026-03-02/os-openai-app-server}"

printf '== wesen-os / go-go-os Integration Playbook Scan ==\n'
printf 'root=%s\n' "$ROOT"
printf 'timestamp=%s\n\n' "$(date -Iseconds)"

printf '%s\n' '-- canonical playbooks and guides --'
ls -1 \
  "$ROOT/wesen-os/docs/startup-playbook.md" \
  "$ROOT/wesen-os/pkg/doc/topics/01-wesen-os-guide.md" \
  "$ROOT/wesen-os/pkg/doc/topics/02-backend-developer-guide.md" \
  "$ROOT/wesen-os/pkg/doc/topics/03-frontend-developer-guide.md" \
  "$ROOT/wesen-os/pkg/doc/tutorials/01-building-a-full-app.md"
printf '\n'

printf '%s\n' '-- inventory integration exemplars --'
ls -1 \
  "$ROOT/go-go-app-inventory/pkg/backendmodule/module.go" \
  "$ROOT/go-go-app-inventory/pkg/backendmodule/reflection.go" \
  "$ROOT/go-go-app-inventory/apps/inventory/src/launcher/module.tsx" \
  "$ROOT/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx"
printf '\n'

printf '%s\n' '-- backendhost integration contract anchors --'
rg -n "type AppBackendModule interface|ValidateAppID\(|MountNamespacedRoutes|GuardNoLegacyAliases|RegisterAppsManifestEndpoint|DocumentableAppBackendModule|ReflectiveAppBackendModule" \
  "$ROOT/go-go-os-backend/pkg/backendhost"
printf '\n'

printf '%s\n' '-- wesen-os launcher composition anchors --'
rg -n "NewModuleRegistry|Startup\(|RegisterAppsManifestEndpoint|registerOSHelpEndpoint|registerOSDocsEndpoint|MountNamespacedRoutes|registerLegacyAliasNotFoundHandlers" \
  "$ROOT/wesen-os/cmd/wesen-os-launcher/main.go" "$ROOT/wesen-os/cmd/wesen-os-launcher/docs_endpoint.go"
printf '\n'

printf '%s\n' '-- frontend launcher contract + host resolver anchors --'
rg -n "interface LaunchableAppModule|createAppRegistry|createLauncherStore|buildLauncherContributions|resolveApiBase|resolveWsBase" \
  "$ROOT/go-go-os-frontend/packages/desktop-os/src" "$ROOT/wesen-os/apps/os-launcher/src"
printf '\n'

printf '%s\n' '-- chat/timeline event-system anchors --'
rg -n "WsManager|timeline\.upsert|mergeSnapshot|useConversation\(|conversationManager|EventViewerWindow|TimelineDebugWindow" \
  "$ROOT/go-go-os-frontend/packages/chat-runtime/src" "$ROOT/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx"
