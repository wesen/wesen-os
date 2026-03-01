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

Use one tmux window with two panes so process restarts do not close panes.
Each pane starts a real login shell first, so stopping/restarting processes does not kill the pane.

```bash
ROOT=/home/manuel/workspaces/2026-03-01/add-os-doc-browser
SOCKET=/tmp/tmux-1000/default
SESSION=dev

tmux -S "$SOCKET" new-session -d -s "$SESSION" -c "$ROOT/wesen-os"
tmux -S "$SOCKET" split-window -h -t "$SESSION":0 -c "$ROOT/wesen-os"
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 "zsh -l" C-m
tmux -S "$SOCKET" send-keys -t "$SESSION":0.1 "zsh -l" C-m

# pane 0: backend
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 \
  "cd $ROOT/wesen-os && go run ./cmd/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091" C-m

# pane 1: frontend
tmux -S "$SOCKET" send-keys -t "$SESSION":0.1 \
  "cd $ROOT/wesen-os && pnpm --dir apps/os-launcher dev" C-m

tmux -S "$SOCKET" attach -t "$SESSION"
```

Notes:
- Backend URL: `http://127.0.0.1:8091`
- Frontend URL: `http://127.0.0.1:5173`

## Restart In The Same Panes

From any shell:

```bash
SOCKET=/tmp/tmux-1000/default
SESSION=dev
ROOT=/home/manuel/workspaces/2026-03-01/add-os-doc-browser

tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 C-c
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 \
  "cd $ROOT/wesen-os" C-m
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 \
  "go run ./cmd/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091" C-m

tmux -S "$SOCKET" send-keys -t "$SESSION":0.1 C-c
tmux -S "$SOCKET" send-keys -t "$SESSION":0.1 \
  "cd $ROOT/wesen-os" C-m
tmux -S "$SOCKET" send-keys -t "$SESSION":0.1 \
  "pnpm --dir apps/os-launcher dev" C-m
```

`Ctrl-C` stops only the foreground process and keeps the pane alive.

## Health Checks

```bash
curl -sS http://127.0.0.1:8091/api/os/apps
curl -sS http://127.0.0.1:5173/api/os/apps
```

Both should return JSON with app entries (for example `inventory`, `gepa`).

## Build And Run Embedded Launcher

```bash
cd wesen-os
pnpm run launcher:binary:build
./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091
```

## Common Issues

- `connection refused` on `:8091`:
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
  - `go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091`
- stale listener on `:8091`:
  - `lsof-who -p 8091 -k`
