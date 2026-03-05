# wesen-os Startup Playbook

This playbook is the canonical local startup flow for the split-repo workspace.

## Prerequisites

Expected sibling layout:

```text
wesen-os/
  workspace-links/
    go-go-os-frontend/
    go-go-app-inventory/
    go-go-app-arc-agi-3/
    go-go-os-backend/
    go-go-app-sqlite/
    go-go-gepa/
```

Install dependencies once:

```bash
cd wesen-os
pnpm run workspace:init-submodules
pnpm install
go work sync
```

Why the workspace now works from the `wesen-os` repo root:

- `workspace-links/*` are tracked git submodules inside the `wesen-os` repo.
- `pnpm-workspace.yaml` includes the frontend packages from those submodules directly.
- `go.work` includes the Go module repos from those submodules directly.

Expected tracked layout inside `wesen-os` after running `pnpm run workspace:init-submodules`:

```text
wesen-os/
  workspace-links/
    go-go-os-frontend/
    go-go-app-inventory/
    go-go-app-sqlite/
    go-go-app-arc-agi-3/
    go-go-os-backend/
    go-go-gepa/
```

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
  - submodules are not initialized yet;
  - run `cd wesen-os && pnpm run workspace:init-submodules`
  - run `cd wesen-os && pnpm install`
- missing `workspace-links/...` package path:
  - the submodules were not initialized or checked out;
  - run `cd wesen-os && pnpm run workspace:init-submodules`
  - inspect `wesen-os/workspace-links/`
- backend appears stuck at startup:
  - retry with ARC disabled:
  - `go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:<backend-port>`
- stale listener on selected backend port:
  - `lsof-who -p <backend-port> -k`
