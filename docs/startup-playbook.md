# wesen-os Startup Playbook

This playbook is the canonical local startup flow for the split-repo workspace.

## Prerequisites

Expected sibling layout:

```text
<workspace>/
  go-go-os-frontend/
  go-go-app-inventory/
  go-go-app-arc-agi-3/
  go-go-os-backend/
  wesen-os/
```

Install dependencies once:

```bash
cd wesen-os
pnpm install
```

## Start Backend + Frontend In tmux

Use the dev manager script. It will:
- pick the next free backend/frontend ports (starting at `8091` and `5273`)
- set `INVENTORY_CHAT_BACKEND` so Vite proxy points at the chosen backend port
- start backend + frontend in one tmux window with two panes

```bash
cd wesen-os
pnpm run launcher:dev:start
```

Optional explicit overrides:

```bash
bash ./scripts/launcher-dev-tmux.sh start \
  --backend-port 18091 \
  --frontend-port 5274 \
  --session wesen-dev
```

## Restart / Stop / Status

```bash
pnpm run launcher:dev:restart
pnpm run launcher:dev:status
pnpm run launcher:dev:stop
```

## Health Checks

First print selected ports:

```bash
pnpm run launcher:dev:status
```

Then query backend directly and through frontend dev proxy:

```bash
curl -sS http://127.0.0.1:<backend-port>/api/os/apps
curl -sS http://127.0.0.1:<frontend-port>/api/os/apps
```

Both should return JSON with app entries (for example `inventory`, `gepa`).

## Build And Run Embedded Launcher

```bash
cd wesen-os
npm run launcher:binary:build
./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091
```

## Common Issues

- `connection refused` on backend port:
  - backend is not running or still starting;
  - check backend pane output with `tmux capture-pane`.
- backend appears stuck at startup:
  - retry with ARC disabled:
  - `go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:<backend-port>`
- stale listener on selected backend port:
  - `lsof-who -p <backend-port> -k`
