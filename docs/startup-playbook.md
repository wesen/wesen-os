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
npm install
```

## Start Backend + Frontend In tmux

Use one tmux window with two panes so process restarts do not close panes.

```bash
ROOT=/home/manuel/workspaces/2026-02-22/add-gepa-optimizer
SOCKET=/tmp/tmux-1000/default
SESSION=dev

tmux -S "$SOCKET" new-session -d -s "$SESSION" -c "$ROOT/wesen-os"
tmux -S "$SOCKET" split-window -h -t "$SESSION":0 -c "$ROOT/wesen-os"

# pane 0: backend
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 \
  "go run ./cmd/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091" C-m

# pane 1: frontend
tmux -S "$SOCKET" send-keys -t "$SESSION":0.1 \
  "npm run dev -w apps/os-launcher" C-m

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

tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 C-c
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 \
  "cd /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os" C-m
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 \
  "go run ./cmd/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091" C-m

tmux -S "$SOCKET" send-keys -t "$SESSION":0.1 C-c
tmux -S "$SOCKET" send-keys -t "$SESSION":0.1 \
  "cd /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os" C-m
tmux -S "$SOCKET" send-keys -t "$SESSION":0.1 \
  "npm run dev -w apps/os-launcher" C-m
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
npm run launcher:binary:build
./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091
```

## Common Issues

- `connection refused` on `:8091`:
  - backend is not running or still starting;
  - check backend pane output with `tmux capture-pane`.
- backend appears stuck at startup:
  - retry with ARC disabled:
  - `go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091`
- stale listener on `:8091`:
  - `lsof-who -p 8091 -k`
