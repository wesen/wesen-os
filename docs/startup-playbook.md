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

cd ../go-go-os-frontend
pnpm install
```

Why both installs are required:

- `apps/os-launcher/vite.config.ts` aliases React and shared frontend packages to paths under `../go-go-os-frontend/...`.
- If `go-go-os-frontend` dependencies are not installed, Vite can fail with errors like `Could not load .../go-go-os-frontend/.../node_modules/react`.

## One-Time Backend Embed Bootstrap

`go run ./cmd/wesen-os-launcher ...` uses `go:embed all:dist` in `pkg/launcherui/handler.go`.
That means `wesen-os/pkg/launcherui/dist` must exist before backend startup.

Do one of the following once per clean checkout:

1. Full frontend build + sync (recommended):

```bash
cd wesen-os
pnpm --dir apps/os-launcher build
bash ./scripts/launcher-ui-sync.sh
```

2. Minimal placeholder (API-only backend startup):

```bash
cd wesen-os
mkdir -p pkg/launcherui/dist
cat > pkg/launcherui/dist/index.html <<'HTML'
<!doctype html><html><body>launcher placeholder</body></html>
HTML
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
pnpm run launcher:binary:build
./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091
```

## Common Issues

- `connection refused` on backend port:
  - backend is not running or still starting;
  - check backend pane output with `tmux capture-pane`.
- `pattern all:dist: no matching files found`:
  - `pkg/launcherui/dist` is missing for `go:embed`;
  - run the "One-Time Backend Embed Bootstrap" step above.
- `vite: not found` or missing `.../go-go-os-frontend/.../node_modules/react`:
  - dependencies are not installed in one or both repos;
  - run `cd wesen-os && pnpm install`
  - run `cd ../go-go-os-frontend && pnpm install`
- backend appears stuck at startup:
  - retry with ARC disabled:
  - `go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:<backend-port>`
- stale listener on selected backend port:
  - `lsof-who -p <backend-port> -k`
