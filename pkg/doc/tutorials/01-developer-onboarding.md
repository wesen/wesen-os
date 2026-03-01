---
Title: Developer Onboarding
Slug: developer-onboarding
Short: First-day setup walkthrough from cloning repositories to running the launcher and verifying health, with pointers to next docs based on your role.
Topics:
- onboarding
- setup
- getting-started
Commands:
- wesen-os-launcher
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: Tutorial
---

This tutorial gets you from zero to a running wesen-os launcher in about 15 minutes. By the end you will have the workspace set up, the backend and frontend running, and a basic understanding of where to go next based on your role.

## What You'll Build

A running local development environment with:

- The wesen-os launcher backend serving app modules on port 8091.
- The Vite frontend dev server with hot-reloading on port 5173.
- Verified health checks confirming both are working.

## Prerequisites

You need the following installed:

| Tool | Version | Check command |
|---|---|---|
| Go | 1.25+ | `go version` |
| Node.js | 20+ | `node --version` |
| npm | 10+ | `npm --version` |
| tmux | any | `tmux -V` |
| SQLite3 | any | `sqlite3 --version` |
| Git | any | `git --version` |

If you use `asdf` or `mise` for version management, the workspace `.tool-versions` file specifies the expected versions.

## Step 1 — Clone the Workspace

The wesen-os ecosystem uses multiple repositories that must be siblings in the same parent directory. Clone them into a workspace directory:

```bash
mkdir -p ~/workspaces/wesen-os && cd ~/workspaces/wesen-os

git clone git@github.com:go-go-golems/go-go-os-backend.git
git clone git@github.com:go-go-golems/go-go-os-frontend.git
git clone git@github.com:go-go-golems/go-go-app-inventory.git
git clone git@github.com:go-go-golems/go-go-app-arc-agi-3.git
git clone git@github.com:go-go-golems/go-go-gepa.git
git clone git@github.com:go-go-golems/wesen-os.git
```

Your directory should look like:

```
~/workspaces/wesen-os/
  go-go-os-backend/
  go-go-os-frontend/
  go-go-app-inventory/
  go-go-app-arc-agi-3/
  go-go-gepa/
  wesen-os/
```

**Why sibling layout matters:** The `go.work` file and `wesen-os/go.mod` `replace` directives reference sibling directories by relative path. If the repositories are not siblings, Go module resolution and Vite alias resolution will fail.

## Step 2 — Install Dependencies

```bash
cd ~/workspaces/wesen-os/wesen-os
npm install
```

This installs frontend dependencies for the launcher shell and all workspace packages.

For Go dependencies, the workspace handles resolution automatically. Verify the Go workspace is valid:

```bash
cd ~/workspaces/wesen-os
go build ./wesen-os/...
```

**What happens if this fails:** Check that all sibling repositories are present and that `go.work` includes them. Missing repositories cause module resolution errors.

## Step 3 — Create the Data Directory

The inventory module needs a SQLite database directory:

```bash
mkdir -p ~/workspaces/wesen-os/wesen-os/data
```

The launcher creates the database file automatically on first startup.

## Step 4 — Start Backend and Frontend

Use tmux to run both processes in split panes so you can restart them independently:

```bash
cd ~/workspaces/wesen-os/wesen-os

tmux new-session -d -s dev
tmux split-window -h -t dev:0

# Pane 0: Backend
tmux send-keys -t dev:0.0 \
  "go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091" C-m

# Pane 1: Frontend dev server
tmux send-keys -t dev:0.1 \
  "npm run dev -w apps/os-launcher" C-m

tmux attach -t dev
```

**Why `--arc-enabled=false`:** The ARC-AGI module requires a Python runtime and Dagger. Disabling it avoids configuration requirements during initial setup. You can enable it later once your ARC environment is configured.

Wait about 10 seconds for both processes to start. The backend prints its listen address when ready. The Vite server prints its URL (usually `http://localhost:5173/`).

## Step 5 — Verify Health

In a separate terminal:

```bash
# Check backend manifest endpoint
curl -sS http://127.0.0.1:8091/api/os/apps | jq .

# Check frontend proxy (should return same data via Vite proxy)
curl -sS http://127.0.0.1:5173/api/os/apps | jq .
```

Both should return JSON with at least `inventory` and `gepa` app entries. If you see `connection refused`, the backend is still starting — wait a few seconds and retry.

## Step 6 — Open the Launcher

Open `http://127.0.0.1:5173/` in your browser. You should see the wesen-os launcher shell with app icons for the registered modules.

Click the Inventory icon to open the inventory app window. Try sending a chat message to verify the full stack (frontend → WebSocket → backend → LLM inference → response rendering) is working.

## Restarting Processes

To restart without closing tmux panes:

```bash
# Restart backend (pane 0)
tmux send-keys -t dev:0.0 C-c
tmux send-keys -t dev:0.0 \
  "go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091" C-m

# Restart frontend (pane 1)
tmux send-keys -t dev:0.1 C-c
tmux send-keys -t dev:0.1 \
  "npm run dev -w apps/os-launcher" C-m
```

`Ctrl-C` stops only the foreground process and keeps the pane alive.

## Running Tests

```bash
# Backend tests (all modules)
cd ~/workspaces/wesen-os/wesen-os
GOWORK=off go test ./...

# Frontend type checking
npm run typecheck -w apps/os-launcher

# Integration tests
GOWORK=off go test ./cmd/wesen-os-launcher/ -run TestIntegration -v
```

## What to Read Next

Now that you have a running system, choose your path based on what you'll be working on:

| Your role | Next documents |
|---|---|
| Backend Go developer | `backend-module-guide` → `api-reference` → `build-and-package` |
| Frontend TypeScript developer | Explore `go-go-os-frontend/docs/` for frontend-specific guides |
| Fullstack (adding a new app) | `backend-module-guide` → `build-and-package` |
| Understanding the system | `architecture-overview` → `glossary` |
| Debugging an issue | `troubleshooting` |

Use `wesen-os-launcher help <topic>` to read any of these documents from the command line.

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| `connection refused` on `:8091` | Backend still starting or crashed | Check backend tmux pane for errors |
| `npm install` fails | Node version mismatch | Ensure Node 20+ is active |
| `go build` fails with module errors | Missing sibling repository | Clone all required repos as siblings |
| Backend stuck at startup | ARC module waiting for runtime | Pass `--arc-enabled=false` |
| Port 8091 already in use | Stale process from previous run | Run `lsof-who -p 8091 -k` |
| Frontend shows blank page | Backend not running (API calls fail) | Start backend first, then reload |

## See Also

- `architecture-overview` — System topology and module boundaries
- `build-and-package` — How to build the embedded launcher binary
- `glossary` — Definitions for terms used in the codebase
