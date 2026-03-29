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

For building new backend modules, see `backend-developer-guide`. For the structured backend docs system (module docs pages, docs hints, and aggregate docs endpoint), see `backend-documentation-system`. For building new frontend app modules, see `frontend-developer-guide`. For building a complete app with both sides, see `building-a-full-app`. For the HyperCard runtime and card system, see `hypercard-environment-guide`.

## Design Philosophy

Most application platforms make you choose: either you get a monolith that is easy to deploy but hard to extend, or you get a microservices architecture that is flexible but complex to operate. wesen-os takes a different path. It is a composition runtime — a single binary that assembles independently-developed modules into a cohesive system at build time, while preserving the development-time independence of separate repositories.

The key insight is that many applications share the same operational needs: lifecycle management, health checking, route namespacing, API discovery, and frontend embedding. Rather than reimplementing these concerns in every application, wesen-os provides them as infrastructure. Each application module focuses on its domain logic — inventory management, optimization, puzzle solving — and the composition runtime handles everything else.

This design has several consequences worth understanding:

- **Modules are the unit of extension.** Adding a new capability to the system means writing a new module, not modifying existing code. The module contract (`AppBackendModule` on the backend, `LaunchableAppModule` on the frontend) defines the boundary between your code and the platform. Everything inside the module is yours; everything outside is managed by the runtime.

- **The app ID is the primary key of the system.** A single lowercase string — like `inventory` or `gepa` — ties together a backend module, a frontend module, URL paths, API resolution, window routing, and capability policies. This string must be identical everywhere it appears. It is the one thing you choose once and never change.

- **The system is inspectable at runtime.** Every registered module appears in the manifest endpoint (`GET /api/os/apps`). Modules that implement reflection expose machine-readable API documentation. The frontend shell provides debug tools for inspecting windows, Redux state, timeline events, and HyperCard sessions. This observability is not an afterthought — it is a core design principle.

- **A single binary simplifies deployment.** The Go binary embeds the frontend SPA, so deploying wesen-os means copying one file. There is no web server to configure, no asset directory to synchronize, no reverse proxy to set up. The tradeoff is a more complex build pipeline, which this guide covers in detail.

## Architecture Overview

The wesen-os launcher is a single Go binary that hosts multiple backend app modules behind namespaced HTTP routes and serves an embedded React SPA as the frontend shell. Six repositories compose into this runtime, each owning a distinct boundary.

The following diagram shows how a user request flows through the system. When a user opens the launcher in a browser and clicks an app icon, two parallel paths activate: the frontend renders the app's window using React, and the window's components make API calls to the backend through namespaced routes.

```
  Browser
    |
    |  GET /  (initial page load)
    v
+------------------------------------------------------------------+
|  wesen-os-launcher binary                                         |
|                                                                   |
|  +-- SPA Handler (fallback) -----> embedded React app (index.html)|
|  |                                                                |
|  +-- /api/os/apps ---------------> Module Registry                |
|  |                                  (manifest + health + reflect) |
|  |                                                                |
|  +-- /api/apps/inventory/... ----> Inventory Module               |
|  |                                  (chat, ws, timeline, tools)   |
|  |                                                                |
|  +-- /api/apps/gepa/... --------> GEPA Module                    |
|  |                                  (scripts, runs, schemas)      |
|  |                                                                |
|  +-- /api/apps/arc-agi/... -----> ARC-AGI Module                  |
|                                    (games, sessions, actions)     |
+------------------------------------------------------------------+
```

Every HTTP request hits one of these routing layers. API requests are dispatched to the appropriate module based on the URL prefix. All other requests fall through to the SPA handler, which serves the embedded frontend. The frontend, in turn, makes API calls back to the same binary — creating a self-contained system where a single process serves both the UI and the data.

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

### How Modules Connect: Backend to Frontend to HyperCard

Understanding the full path from a user clicking an icon to data appearing in a window is essential for debugging and for designing new modules. The following diagram traces this path:

```
  User clicks "Inventory" icon
        |
        v
  LaunchableAppModule.buildLaunchWindow()
        |  returns OpenWindowPayload
        v
  Windowing system opens window
        |
        v
  LaunchableAppModule.renderWindow()
        |  returns React component
        v
  React component calls fetch(resolveApiBase('inventory') + '/items')
        |  resolves to /api/apps/inventory/items
        v
  Backend routes request to InventoryModule.handleListItems()
        |  queries SQLite, returns JSON
        v
  React component receives JSON, updates UI
        |
        v
  (Optional) Component opens HyperCard card window
        |  card renders in QuickJS sandbox
        |  card handler calls dispatchDomainAction('inventory', 'updateQty', {...})
        |  intent routes to Redux store
        |  Redux action type: 'inventory/updateQty'
        |  inventory reducer updates state
        |  React re-renders with new data
        v
  User sees updated inventory
```

This path crosses three boundaries: the frontend module contract (TypeScript), the HTTP API (JSON over HTTP), and the backend module contract (Go). The app ID string `inventory` is the thread that connects all three — it determines the URL prefix, the API base resolution, the window routing, and the domain intent namespace.

For modules that use the HyperCard card system, there is an additional layer: card code runs in a QuickJS sandbox and communicates through structured intents rather than direct API calls. The `hypercard-environment-guide` covers this layer in detail.

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
go test ./...

# Frontend type checking
npm run typecheck -w apps/os-launcher

# Integration tests (starts full launcher internally)
go test ./cmd/wesen-os-launcher/ -run TestIntegration -v
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

**Aliases** map `@go-go-golems/*` package imports to source directories in sibling repositories:

| Alias | Resolves to |
|---|---|
| `@go-go-golems/os-core` | `go-go-os-frontend/packages/engine/src` |
| `@go-go-golems/os-shell` | `go-go-os-frontend/packages/desktop-os/src` |
| `@go-go-golems/os-chat` | `go-go-os-frontend/packages/chat-runtime/src` |
| `@go-go-golems/os-scripting` | `go-go-os-frontend/packages/hypercard-runtime/src` |
| `@go-go-golems/inventory/launcher` | `go-go-app-inventory/apps/inventory/src/launcher/public.ts` |
| `@go-go-golems/inventory/reducers` | `go-go-app-inventory/apps/inventory/src/reducers.ts` |
| `@go-go-golems/arc-agi-player/launcher` | `go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts` |

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

**Why both `go.work` and `replace`:** The `go.work` file enables IDE support and cross-module testing. The `replace` directives ensure that `go build` inside `wesen-os/` uses local code even outside the workspace context (CI/workspace builds).

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

### Profile Bootstrap And Runtime Policy

The launcher no longer defines its own built-in profile registry in Go. Profile data now comes from Pinocchio-style engine-profile registries, and the launcher resolves them before it starts the inventory and assistant chat modules.

The bootstrap flow lives in [`cmd/wesen-os-launcher/profile_bootstrap.go`](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go). It resolves two different kinds of state:

- hidden base inference settings:
  - API type
  - engine/model
  - API keys
  - other Geppetto AI settings
- profile selection and registry sources:
  - selected engine-profile slug
  - profile registry file/database locations
  - loaded registry chain

The launcher follows Pinocchio precedence rules:

1. `--profile-registries`
2. `PINOCCHIO_PROFILE_REGISTRIES`
3. `profile-settings.profile-registries` from config
4. `${XDG_CONFIG_HOME:-~/.config}/pinocchio/profiles.yaml` if present

Selected profile precedence:

1. `--profile`
2. `PINOCCHIO_PROFILE`
3. `profile-settings.profile` from config
4. launcher/app fallback selection

The last step is important. Inventory and assistant share the same loaded registry stack, but they do not use the same fallback slug:

- inventory falls back to `inventory`
- assistant falls back to `assistant`

That app-level fallback is configured at the request-resolver boundary, not by mutating the registry.

### Runtime Extension Contract

Engine profiles are engine-only by default. App-owned runtime policy is carried in the Pinocchio extension key:

- `pinocchio.webchat_runtime@v1`

The checked-in sample file used by launcher tests is:

- [`cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml)

Its runtime payload looks like this:

```yaml
extensions:
  pinocchio.webchat_runtime@v1:
    system_prompt: You are an inventory assistant. Be concise, accurate, and tool-first.
    middlewares:
      - name: inventory_artifact_policy
        id: artifact-policy
      - name: inventory_suggestions_policy
        id: suggestions-policy
    tools:
      - inventory_search_items
      - inventory_get_item
      - inventory_low_stock
      - inventory_report
      - inventory_update_qty
      - inventory_record_sale
```

Semantics:

- `system_prompt`:
  - app-owned prompt seed for that selected profile
- `middlewares`:
  - Pinocchio middleware instances to build and attach
- `tools`:
  - tool names the runtime should expose upstream

These fields are not part of engine configuration. They are decoded by the shared request resolver and consumed by the runtime composer after inference settings have already been resolved.

### Fallback Defaults vs Authoritative Profile Data

The launcher still keeps minimal code-owned fallback values in [`cmd/wesen-os-launcher/main.go`](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go):

- inventory fallback system prompt
- inventory fallback tool allowlist
- assistant fallback system prompt

Those are safety defaults for profiles that omit the runtime extension. When `pinocchio.webchat_runtime@v1` is present on the selected profile, the profile runtime data is authoritative and overrides those fallback values.

In practical terms:

- if operators provide a complete Pinocchio profile file, that file defines runtime truth
- if they provide an engine-only profile with no runtime extension, the launcher still has safe defaults and the app remains usable

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

## Inspecting the Running System

One of wesen-os's design principles is runtime observability. A running launcher exposes multiple inspection points that help you understand what modules are loaded, whether they are healthy, what APIs they expose, and what is happening inside the frontend shell.

### The Module Manifest Endpoint

The manifest endpoint at `GET /api/os/apps` is the single source of truth about what modules are registered and their current state. Every module that was added to the composition list and successfully passed through the lifecycle appears here.

```bash
curl -sS http://127.0.0.1:8091/api/os/apps | jq .
```

This returns a JSON document listing every module with its app ID, name, capabilities, health status, and whether reflection is available. When something goes wrong — a module doesn't appear, health is false, or reflection is missing — this endpoint is the first place to check.

The manifest endpoint is also what the frontend shell uses during initialization. When the launcher SPA loads, it fetches this endpoint to discover what apps are available and what capabilities they support. The frontend's app registry uses this information to match backend capabilities with frontend modules.

### Reflection: Machine-Readable API Documentation

Modules that implement `ReflectiveAppBackendModule` expose detailed API documentation at `GET /api/os/apps/<app-id>/reflection`. This is not just for humans reading documentation — it is structured data that tools and other modules can consume programmatically.

```bash
curl -sS http://127.0.0.1:8091/api/os/apps/gepa/reflection | jq .
```

The reflection document includes:

- **API inventory.** Every HTTP endpoint the module exposes, with method, path, and description.
- **Capability annotations.** Each capability tagged with a stability level (`stable`, `beta`, `experimental`).
- **Schema references.** JSON Schema identifiers for request and response bodies.
- **Version information.** The module's declared API version.

Reflection is particularly valuable during development: when building a frontend component that calls a backend API, you can inspect the reflection endpoint to discover available routes, understand request/response shapes, and verify that the module is exposing the APIs you expect.

### Frontend Debug Tools

The launcher shell includes several debug windows accessible through the inventory module's contributions (or through programmatic launch). These tools provide visibility into the frontend runtime:

- **Apps Browser** — Lists all registered frontend modules with their manifests, state keys, and contribution counts. Shows which modules are active and how they are configured.
- **Redux State Inspector** — Shows the current Redux store state tree, including engine core state (windowing, notifications), shared domain state, and per-module private state.
- **Timeline Debugger** — Displays the timeline event stream as events flow from the backend through WebSocket to the frontend. Useful for diagnosing SEM event mapping issues and artifact projection.
- **Runtime Card Debug** — Shows all registered runtime cards (both static and dynamically injected), their source code, and injection status per session.
- **Redux Perf** — Shows Redux action dispatch timing, helping diagnose performance issues in domain intent handling.

These tools are not separate applications — they are windows within the launcher shell, built using the same module and contribution system that regular apps use.

### Health Checking from the Command Line

For quick health verification without opening a browser:

```bash
# Check all modules
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | {app_id, healthy}'

# Check a specific module's routes
curl -sS http://127.0.0.1:8091/api/apps/inventory/health

# Check reflection availability
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | select(.reflection.available) | .app_id'
```

These commands are useful in scripts, CI pipelines, and smoke tests. The `npm run launcher:smoke` script uses similar checks to verify the binary before deployment.

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
| Module import errors in workspace mode | Missing `replace` directive | Add `replace` to `wesen-os/go.mod` |
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
- `backend-documentation-system` — Structured backend docs contracts, endpoints, and validation workflow
- `frontend-developer-guide` — Building frontend app modules
- `hypercard-environment-guide` — The HyperCard runtime, UI DSL, and sandboxed card system
- `building-a-full-app` — End-to-end guide for a complete app
