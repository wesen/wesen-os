---
Title: wesen-os Composition and Operations Guide
Slug: wesen-os-guide
Short: How to set up, run, build, deploy, and troubleshoot the wesen-os launcher — the composition runtime that assembles backend app modules and a frontend shell into a single binary.
Topics:
- wesen-os
- architecture
- build
- operations
- troubleshooting
Commands:
- wesen-os-launcher
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

This is the operations guide for the wesen-os launcher: the composition runtime that assembles backend app modules (inventory, GEPA, ARC-AGI) and a frontend shell into a single Go binary with embedded SPA assets. It covers everything from first-day workspace setup through binary packaging and troubleshooting.

For building new backend modules, see `backend-developer-guide`. For building new frontend app modules, see `frontend-developer-guide`. For building a complete app with both sides, see `building-a-full-app`.

## Architecture Overview

The wesen-os launcher is a single Go binary that hosts multiple backend app modules behind namespaced HTTP routes and serves an embedded React SPA as the frontend shell. Six repositories compose into this runtime, each owning a distinct boundary.

### Repository Topology

| Repository | Owns | Language |
|---|---|---|
| `go-go-os-backend` | Backend host contracts (`AppBackendModule`), lifecycle manager, namespaced route mounting, manifest endpoint | Go |
| `go-go-os-frontend` | Shared frontend packages: `desktop-os` (launcher contracts), `engine` (HyperCard DSL/shell), `hypercard-runtime` (VM/card host), `chat-runtime` (chat UI/state) | TypeScript |
| `go-go-app-inventory` | Inventory domain: backend API/tools/DB + frontend app (chat, cards, contributions) | Go + TypeScript |
| `go-go-app-arc-agi-3` | ARC-AGI: backend game engine + frontend player (React windows, HyperCard demo stack, bridge middleware) | Go + TypeScript |
| `go-go-gepa` | GEPA optimizer: backend script runner + run management | Go |
| `wesen-os` | Composition root: launcher binary (`cmd/wesen-os-launcher`), launcher frontend shell (`apps/os-launcher`), SPA embedding (`pkg/launcherui`), documentation | Go + TypeScript |

These repositories are composed via a Go workspace (`go.work`) and local `replace` directives in `wesen-os/go.mod`. During development they act as one integrated system.

### Runtime Startup Sequence

The composition entrypoint is `wesen-os/cmd/wesen-os-launcher/main.go`. When the launcher starts, `RunIntoWriter` executes these steps in order:

1. **Parse config flags** — address, DB paths, feature toggles, timeouts.
2. **Initialize inventory store** — open SQLite, run migrations, optionally seed/reset.
3. **Create runtime composer** — configure system prompt, allowed tools, profile registry.
4. **Register hypercard extensions** — SEM event mappings for card/widget timeline events.
5. **Create webchat server** — HTTP/WebSocket server with tool registration and event sink.
6. **Create GEPA module** — script runner with configurable timeout and concurrency.
7. **Optionally create ARC module** — game engine with configurable driver and runtime mode.
8. **Build module registry** — validates app ID uniqueness and format for all modules.
9. **Guard legacy aliases** — rejects forbidden route aliases (`/chat`, `/ws`, `/api/timeline`).
10. **Run lifecycle startup** — ordered `Init` → `Start` per module, then `Health` for required apps. Rollback on failure.
11. **Mount namespaced routes** — each module's routes go under `/api/apps/<app-id>/`.
12. **Register manifest endpoint** — `GET /api/os/apps` returns module list with health and reflection.
13. **Register legacy 404 handlers** — explicit 404s for pre-namespace paths.
14. **Serve SPA** — embedded frontend as fallback handler for all other routes.
15. **Optionally mount under root prefix** — `--root` flag wraps everything under a URL prefix.

### Three Critical Invariants

These invariants must hold across the entire system. Violating any of them causes silent failures or runtime errors that are difficult to diagnose.

**1. App ID consistency.** The app ID string must be identical in the backend `Manifest().AppID`, the frontend `manifest.id`, and all URL path references. The backend uses it for route namespacing (`/api/apps/<app-id>/`), the frontend uses it for `resolveApiBase(appId)`, and the manifest endpoint uses it for discovery. A mismatch between any of these causes routing failures, missing icons, or "unknown module" errors.

**2. Intent naming alignment.** When VM card handlers emit `dispatchDomainAction(domain, actionType, payload)`, the runtime constructs a Redux action with type `<domain>/<actionType>`. The app's reducer or middleware must handle this exact string. A typo, case mismatch, or domain name difference causes the action to be silently ignored — no error message, no state change, no UI update.

**3. Packaging chain integrity.** The embedded launcher binary serves frontend assets from `pkg/launcherui/dist/`. This directory is populated by a three-stage pipeline: frontend build → dist sync → Go binary build. If any stage is skipped or run out of order, the binary serves stale or missing UI. The one-command build (`npm run launcher:binary:build`) chains all three stages.

## Developer Onboarding

This section gets you from zero to a running wesen-os launcher in about 15 minutes.

### Prerequisites

| Tool | Version | Check command |
|---|---|---|
| Go | 1.25+ | `go version` |
| Node.js | 20+ | `node --version` |
| npm | 10+ | `npm --version` |
| tmux | any | `tmux -V` |
| SQLite3 | any | `sqlite3 --version` |
| Git | any | `git --version` |

### Workspace Setup

Clone all repositories as siblings in one parent directory:

```bash
mkdir -p ~/workspaces/wesen-os && cd ~/workspaces/wesen-os

git clone git@github.com:go-go-golems/go-go-os-backend.git
git clone git@github.com:go-go-golems/go-go-os-frontend.git
git clone git@github.com:go-go-golems/go-go-app-inventory.git
git clone git@github.com:go-go-golems/go-go-app-arc-agi-3.git
git clone git@github.com:go-go-golems/go-go-gepa.git
git clone git@github.com:go-go-golems/wesen-os.git
```

**Why sibling layout matters:** The `go.work` file and `wesen-os/go.mod` `replace` directives reference sibling directories by relative path (`../go-go-app-inventory`). If the repositories are not siblings, both Go module resolution and Vite alias resolution fail.

Install dependencies and create the data directory:

```bash
cd ~/workspaces/wesen-os/wesen-os
npm install
mkdir -p data
```

Verify the Go workspace is valid:

```bash
cd ~/workspaces/wesen-os
go build ./wesen-os/...
```

### Starting Backend and Frontend

Use tmux to run both processes in split panes:

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

**Why `--arc-enabled=false`:** The ARC-AGI module requires a Python runtime and Dagger. Disabling it avoids configuration requirements during initial setup.

Wait about 10 seconds, then verify health in a separate terminal:

```bash
curl -sS http://127.0.0.1:8091/api/os/apps | jq .
curl -sS http://127.0.0.1:5173/api/os/apps | jq .
```

Both should return JSON with `inventory` and `gepa` app entries. Open `http://127.0.0.1:5173/` to see the launcher shell.

### Restarting Processes

To restart without closing tmux panes:

```bash
# Restart backend (Ctrl-C stops foreground, pane stays alive)
tmux send-keys -t dev:0.0 C-c
tmux send-keys -t dev:0.0 \
  "go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091" C-m

# Restart frontend
tmux send-keys -t dev:0.1 C-c
tmux send-keys -t dev:0.1 \
  "npm run dev -w apps/os-launcher" C-m
```

### Running Tests

```bash
# Backend tests (all modules in wesen-os)
GOWORK=off go test ./...

# Frontend type checking
npm run typecheck -w apps/os-launcher

# Integration tests (starts full launcher internally)
GOWORK=off go test ./cmd/wesen-os-launcher/ -run TestIntegration -v
```

## Build, Package, and Deploy

The wesen-os launcher ships as a single Go binary with the frontend SPA embedded via `go:embed`. Understanding the build pipeline is necessary for shipping changes, debugging stale UI issues, and setting up local development with hot-reloading.

### Pipeline Stages

The build pipeline has three stages that must execute in order:

```
1. Frontend build       →  apps/os-launcher/dist/
2. Dist sync            →  pkg/launcherui/dist/
3. Go binary build      →  build/wesen-os-launcher
```

**Stage 1: Frontend Build** — `npm run launcher:frontend:build` runs Vite to build `apps/os-launcher` into `apps/os-launcher/dist/`. The Vite config defines aliases that resolve imports from sibling repositories.

**Stage 2: Dist Sync** — `npm run launcher:ui:sync` runs `scripts/launcher-ui-sync.sh`, which copies the built frontend into `pkg/launcherui/dist/`. The sync script cleans the target directory first to prevent stale files.

**Stage 3: Go Binary Build** — `npm run launcher:binary:build` chains all three stages and produces `build/wesen-os-launcher`.

**One-command build:**

```bash
cd wesen-os
npm run launcher:binary:build
```

### Vite Configuration

The Vite config (`apps/os-launcher/vite.config.ts`) defines two critical configurations:

**Aliases** map `@hypercard/*` package imports to source directories in sibling repositories:

| Alias | Resolves to |
|---|---|
| `@hypercard/engine` | `go-go-os-frontend/packages/engine/src` |
| `@hypercard/desktop-os` | `go-go-os-frontend/packages/desktop-os/src` |
| `@hypercard/chat-runtime` | `go-go-os-frontend/packages/chat-runtime/src` |
| `@hypercard/hypercard-runtime` | `go-go-os-frontend/packages/hypercard-runtime/src` |
| `@hypercard/inventory/launcher` | `go-go-app-inventory/apps/inventory/src/launcher/public.ts` |
| `@hypercard/inventory/reducers` | `go-go-app-inventory/apps/inventory/src/reducers.ts` |
| `@hypercard/arc-agi-player/launcher` | `go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts` |

**Proxies** forward API requests from the Vite dev server to the backend:

| Dev URL pattern | Backend target |
|---|---|
| `/api/apps/inventory/*` | `http://127.0.0.1:8091` |
| `/api/apps/inventory/ws` | `http://127.0.0.1:8091` (WebSocket) |
| `/api/os/apps` | `http://127.0.0.1:8091` |
| `/api/apps` | `http://127.0.0.1:8091` (catch-all) |

When adding a new app, you need to add both an alias for the frontend imports and proxy rules for the backend API.

### Go Workspace and Module Composition

The root `go.work` file includes all repositories so IDE support and cross-module `go test` work. Additionally, `wesen-os/go.mod` uses `replace` directives for each dependency:

```
replace github.com/go-go-golems/go-go-app-inventory => ../go-go-app-inventory
replace github.com/go-go-golems/go-go-app-arc-agi => ../go-go-app-arc-agi-3
replace github.com/go-go-golems/go-go-gepa => ../go-go-gepa
replace github.com/go-go-golems/go-go-os-backend => ../go-go-os-backend
```

**Why both `go.work` and `replace`:** The `go.work` file enables IDE support and cross-module testing. The `replace` directives ensure that `go build` inside `wesen-os/` uses local code even outside the workspace context (CI builds with `GOWORK=off`).

### SPA Embedding

`pkg/launcherui/handler.go` uses `//go:embed all:dist` to include the built frontend in the binary. The `all:` prefix includes dotfiles like `.vite/manifest.json`. The handler serves static files from the embedded filesystem and falls back to `index.html` for client-side routes, enabling React Router to handle navigation.

### Smoke Tests

```bash
npm run launcher:smoke
```

This runs `scripts/smoke-wesen-os-launcher.sh`, which starts the binary, waits for HTTP readiness, verifies `GET /api/os/apps` returns expected entries, verifies the SPA index page is served, and stops the launcher.

## Configuration Reference

All launcher flags with defaults. Run `wesen-os-launcher wesen-os-launcher --help --long-help` for the full list.

### Server Flags

| Flag | Default | Purpose |
|---|---|---|
| `--addr` | `:8091` | HTTP listen address |
| `--root` | `/` | URL prefix for all handlers |
| `--required-apps` | `inventory` | Comma-separated app IDs required at startup (health check must pass) |
| `--legacy-aliases` | (empty) | Comma-separated legacy aliases (startup fails if forbidden aliases configured) |

### Inventory Flags

| Flag | Default | Purpose |
|---|---|---|
| `--inventory-db` | `./data/inventory.db` | SQLite database path |
| `--inventory-seed-on-start` | `true` | Seed domain data during startup |
| `--inventory-reset-on-start` | `false` | Reset domain tables before seeding |

### GEPA Flags

| Flag | Default | Purpose |
|---|---|---|
| `--gepa-scripts-root` | (empty) | Comma-separated directories to scan for GEPA scripts |
| `--gepa-run-timeout-seconds` | `30` | Timeout for one GEPA run |
| `--gepa-max-concurrent-runs` | `4` | Max concurrent GEPA runs |

### ARC Flags

| Flag | Default | Purpose |
|---|---|---|
| `--arc-enabled` | `true` | Enable ARC-AGI module |
| `--arc-driver` | `dagger` | Runtime driver (`dagger` or `raw`) |
| `--arc-runtime-mode` | `offline` | Operation mode (`offline`, `normal`, `online`) |
| `--arc-repo-root` | `../go-go-app-arc-agi-3/2026-02-27--arc-agi/ARC-AGI` | Path to ARC Python project root |
| `--arc-startup-timeout-seconds` | `45` | Runtime startup health timeout |
| `--arc-request-timeout-seconds` | `30` | Upstream request timeout |
| `--arc-raw-listen-addr` | `127.0.0.1:18081` | Loopback listen address for raw mode |
| `--arc-api-key` | `1234` | X-API-Key header for ARC requests |
| `--arc-max-session-events` | `200` | Max session events retained per session |

### Timeline and Chat Flags

| Flag | Default | Purpose |
|---|---|---|
| `--idle-timeout-seconds` | `60` | Stop per-conversation reader after N idle seconds |
| `--evict-idle-seconds` | `300` | Evict conversations after N idle seconds |
| `--evict-interval-seconds` | `60` | Sweep interval for idle conversation eviction |
| `--timeline-dsn` | (empty) | SQLite DSN for durable timeline snapshots |
| `--timeline-db` | (empty) | SQLite DB path for timeline snapshots |
| `--turns-dsn` | (empty) | SQLite DSN for durable turn snapshots |
| `--turns-db` | (empty) | SQLite DB path for turn snapshots |
| `--timeline-inmem-max-entities` | `1000` | In-memory entity cap when no timeline DB configured |

## API Endpoint Reference

### Platform Endpoints

**GET /api/os/apps** — Returns all registered app modules with health status and reflection availability.

```json
{
  "apps": [
    {
      "app_id": "inventory",
      "name": "Inventory",
      "required": true,
      "capabilities": ["chat", "ws", "timeline", "profiles", "confirm"],
      "healthy": true,
      "reflection": {
        "available": true,
        "url": "/api/os/apps/inventory/reflection",
        "version": "v1"
      }
    },
    {
      "app_id": "gepa",
      "name": "GEPA Optimizer",
      "required": false,
      "capabilities": ["scripts", "runs", "timeline", "reflection"],
      "healthy": true,
      "reflection": {
        "available": true,
        "url": "/api/os/apps/gepa/reflection",
        "version": "v1"
      }
    }
  ]
}
```

**GET /api/os/apps/{app_id}/reflection** — Returns machine-readable API documentation for one module. Only available when the module implements `ReflectiveAppBackendModule`.

### Per-App Route Catalogs

**Inventory** (`/api/apps/inventory/...`):

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/chat` | Chat conversation endpoint |
| GET | `/ws` | WebSocket for streaming events |
| GET | `/api/timeline` | Timeline entity retrieval |
| GET | `/api/` | General API root |
| POST | `/confirm` | Confirmation dialog handler |

**GEPA** (`/api/apps/gepa/...`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/scripts` | List optimization scripts |
| POST | `/runs` | Start a new run |
| GET | `/runs` | List runs |
| GET | `/runs/{id}` | Get run status/results |
| GET | `/schemas` | Schema discovery |

**ARC-AGI** (`/api/apps/arc-agi/...`, requires `--arc-enabled=true`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/games` | List ARC games |
| POST | `/sessions` | Create game session |
| POST | `/sessions/{id}/action` | Submit game action |
| POST | `/sessions/{id}/reset` | Reset session |
| GET | `/sessions/{id}/timeline` | Session event timeline |
| GET | `/schemas` | Schema discovery |

### Legacy Route Policy

The following top-level paths are explicitly registered as 404 handlers:

- `/chat`, `/chat/`
- `/ws`, `/ws/`
- `/api/timeline`, `/api/timeline/`

These existed before the namespaced route model. The explicit 404s make it obvious the old paths no longer work, rather than silently falling through to the SPA handler. The `--legacy-aliases` flag is validated by `GuardNoLegacyAliases` — any forbidden alias causes startup failure.

### WebSocket Connection Model

WebSocket URLs follow the namespace convention. The frontend resolves them via `resolveWsBase(appId)` → `/api/apps/<appId>/ws`. Each connection is scoped to one conversation and managed by the webchat server's per-conversation reader lifecycle, governed by `--idle-timeout-seconds`, `--evict-idle-seconds`, and `--evict-interval-seconds`.

## Troubleshooting

### Backend Startup Failures

| Problem | Cause | Solution |
|---|---|---|
| Exits with `start backend module lifecycle` | Required module health check failed | Check `--required-apps` flag, verify module health implementation |
| Exits with `open inventory sqlite db` | DB path doesn't exist or isn't writable | Create `data/` directory or set `--inventory-db` |
| Backend stuck at startup | ARC module waiting for runtime health | Pass `--arc-enabled=false` |
| Duplicate app ID panic | Two modules return same `Manifest().AppID` | Give each module a unique app ID |
| Legacy alias validation error | `--legacy-aliases` contains forbidden path | Remove `/chat`, `/ws`, or `/api/timeline` from the flag |
| Port already in use | Stale process from previous run | Run `lsof-who -p 8091 -k` |

### Route and API Issues

| Problem | Cause | Solution |
|---|---|---|
| 404 on backend route | Module not in composition list, or prefix hardcoded in MountRoutes | Add to `modules` slice, remove prefix |
| Double-prefixed URLs | MountRoutes hardcodes `/api/apps/<id>` | Backendhost adds prefix automatically; remove it |
| `/api/os/apps` returns empty | No modules registered or lifecycle failed | Check startup logs |
| Reflection endpoint returns 404 | Module doesn't implement `ReflectiveAppBackendModule` | Add `Reflection` method |

### Frontend and UI Issues

| Problem | Cause | Solution |
|---|---|---|
| App icon opens "Unknown app module" | Module not in `launcherModules` or manifest ID mismatch | Add to `modules.tsx`, check ID |
| Embedded binary serves stale UI | Build pipeline stages skipped | Run `npm run launcher:binary:build` |
| Vite dev server returns 502 | Backend not running on proxy target port | Start backend on 127.0.0.1:8091 |
| Frontend shows blank page | Backend not running (API calls fail) | Start backend first |

### Database and Storage Issues

| Problem | Cause | Solution |
|---|---|---|
| Inventory DB errors at startup | DB locked or path missing | Create directory, stop other processes |
| Timeline data not persisting | No timeline DB configured | Set `--timeline-dsn` or `--timeline-db` |

### Build and Compilation Issues

| Problem | Cause | Solution |
|---|---|---|
| `go:embed` pattern error | `pkg/launcherui/dist/` empty or missing | Run frontend build + dist sync first |
| Module import errors with `GOWORK=off` | Missing `replace` directive | Add `replace` to `wesen-os/go.mod` |
| Vite alias resolution error | Missing alias for new import | Add alias in `vite.config.ts` |

## Glossary

**App ID** — Lowercase, hyphen-separated string uniquely identifying a module across backend, frontend, and URL namespace. Must match regex `^[a-z0-9][a-z0-9-]{0,62}$`. Examples: `inventory`, `gepa`, `arc-agi`.

**App Key** — Runtime window identifier in format `<appId>:<instanceId>`. Used by the launcher shell to route window rendering to the correct module.

**AppBackendModule** — Go interface every backend module implements: `Manifest()`, `MountRoutes(*http.ServeMux)`, `Init(ctx)`, `Start(ctx)`, `Stop(ctx)`, `Health(ctx)`.

**Artifact** — Structured output extracted from timeline entities by the artifact projection middleware. When artifacts contain `runtimeCardId` and `runtimeCardCode`, they trigger runtime card registration.

**Bridge Pattern** — Architecture where domain intents from VM handlers are intercepted by Redux middleware, which makes async API calls and dispatches results. Used by ARC-AGI; contrasts with the direct-reducer pattern used by inventory.

**Capability Policy** — Per-runtime-session allowlist governing which domain and system intents a VM handler can dispatch. Intents targeting unauthorized domains are silently rejected.

**Contribution** — Menu items, command handlers, context actions, or window content adapters that a frontend module adds to the launcher shell via `createContributions`.

**Host Context** — Object provided to app modules with `dispatch`, `getState`, `openWindow`, `closeWindow`, `resolveApiBase(appId)`, `resolveWsBase(appId)`.

**HyperCard** — Interactive card system where cards are defined in JavaScript, executed in a QuickJS sandbox, and communicate with the host through runtime intents.

**Intent** — Structured message emitted by a VM card handler. Four scopes: `card` (UI-local), `session` (stack-wide), `domain` (Redux action), `system` (shell command).

**LaunchableAppModule** — TypeScript interface every frontend module implements: `manifest`, optional `state`, `buildLaunchWindow`, optional `createContributions`, `renderWindow`.

**Lifecycle Manager** — Go component orchestrating ordered `Init`/`Start`/`Health`/`Stop` across modules with reverse-order rollback on failure.

**Manifest** — Identity and capability declaration. Backend: `AppID`, `Name`, `Description`, `Required`, `Capabilities`. Frontend: `id`, `name`, `icon`, `launch`, `desktop`.

**Module Registry** — Validates and stores registered backend modules; enforces app ID uniqueness and format.

**Namespaced Routes** — All app HTTP handlers mounted under `/api/apps/<app-id>/` by `MountNamespacedRoutes`.

**QuickJS** — Sandboxed JavaScript engine running VM card handler code. No DOM, network, or filesystem access.

**Reflection** — Machine-readable API documentation at `/api/os/apps/<app-id>/reflection`. Includes endpoints, schemas, capabilities.

**Runtime Card** — Card definition injected dynamically from backend events through the artifact projection pipeline.

**Runtime Session** — VM execution context per card session ID with its own QuickJS context, state, and capability policy.

**SEM (Structured Event Mapping)** — Backend mechanism for typed timeline events. Produces structured envelopes like `hypercard.card.v2` and `hypercard.widget.v1`.

**Stack** — Collection of card definitions bundled with shared state, selectors, and handlers. Loaded into a runtime session.

**Timeline Entity** — Normalized event representation flowing from backend SEM events through WebSocket to frontend timeline mapper.

## See Also

- `backend-developer-guide` — Building backend app modules
- `frontend-developer-guide` — Building frontend app modules
- `building-a-full-app` — End-to-end guide for a complete app
