#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/home/manuel/workspaces/2026-03-02/os-openai-app-server}"
OAS="$ROOT/openai-app-server"

printf '== OpenAI App Server Gap Scan ==\n'
printf 'root=%s\n' "$ROOT"
printf 'timestamp=%s\n\n' "$(date -Iseconds)"

printf '%s\n' '-- codexrpc transport implementations --'
rg --files "$OAS/pkg/codexrpc" | sort
printf '\n'

printf '%s\n' '-- websocket mentions in codexrpc package (should be empty if no ws transport exists) --'
rg -n "websocket|ws" "$OAS/pkg/codexrpc" || true
printf '\n'

printf '%s\n' '-- command flags advertising stdio|websocket --'
rg -n "Transport backend: stdio\|websocket" "$OAS/cmd/openai-app-server"
printf '\n'

printf '%s\n' '-- command constructors enforcing stdio only --'
rg -n "if s\.Transport != \"stdio\"|unsupported transport" "$OAS/cmd/openai-app-server"
printf '\n'

printf '%s\n' '-- handshake and request methods currently wired --'
rg -n "Connect\(|initialize|initialized|thread/list|thread/read|thread/start|turn/start" "$OAS/pkg/codexrpc" "$OAS/pkg/js" "$OAS/cmd/openai-app-server"
printf '\n'

printf '%s\n' '-- basic go test smoke (codexrpc + command package) --'
(
  cd "$OAS"
  go test ./pkg/codexrpc ./cmd/openai-app-server -count=1
)
