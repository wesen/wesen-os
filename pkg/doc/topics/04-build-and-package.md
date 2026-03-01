---
Title: Build, Package, and Deploy
Slug: build-and-package
Short: The full pipeline from frontend build through dist sync and Go embed to a runnable launcher binary, including Vite dev proxy and smoke checks.
Topics:
- build
- packaging
- embed
- vite
- deployment
Commands:
- wesen-os-launcher
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

The wesen-os launcher ships as a single Go binary with the frontend SPA embedded via `go:embed`. Understanding the build pipeline is necessary for shipping changes, debugging stale UI issues, and setting up local development with hot-reloading.

## Pipeline Overview

The build pipeline has three stages that must execute in order:

```
1. Frontend build       →  apps/os-launcher/dist/
2. Dist sync            →  pkg/launcherui/dist/
3. Go binary build      →  build/wesen-os-launcher
```

Skipping or reordering any stage produces a binary that serves stale or missing frontend assets.

**Why three stages instead of one:** The frontend build uses Vite and produces output in the app's own `dist/` directory. The sync step copies that output into the Go package directory where `go:embed` can reach it. The Go build then compiles everything into a single binary. This separation keeps the frontend build independent from Go tooling and allows the frontend to be developed and tested without rebuilding the binary.

## Stage 1: Frontend Build

```bash
cd wesen-os
npm run launcher:frontend:build
```

This runs Vite to build `apps/os-launcher` into `apps/os-launcher/dist/`. The Vite config (`apps/os-launcher/vite.config.ts`) defines aliases that resolve imports from sibling repositories:

- `@hypercard/engine` → `go-go-os-frontend/packages/engine/src`
- `@hypercard/desktop-os` → `go-go-os-frontend/packages/desktop-os/src`
- `@hypercard/inventory` → `go-go-app-inventory/apps/inventory/src`
- `@hypercard/chat-runtime` → `go-go-os-frontend/packages/chat-runtime/src`
- `@hypercard/hypercard-runtime` → `go-go-os-frontend/packages/hypercard-runtime/src`

**What happens if aliases are wrong:** The build fails with module resolution errors. If a new app adds frontend exports that the launcher imports, you need to add a corresponding alias in `vite.config.ts`.

## Stage 2: Dist Sync

```bash
npm run launcher:ui:sync
```

This runs `scripts/launcher-ui-sync.sh`, which copies the built frontend from `apps/os-launcher/dist/` to `pkg/launcherui/dist/`. The sync script cleans the target directory first to prevent stale files from lingering.

**Why a separate sync step:** The Go `//go:embed` directive requires the embedded files to be inside the Go package directory tree. Since the frontend build output lives in the npm workspace directory structure, a copy step bridges the gap.

## Stage 3: Go Binary Build

```bash
npm run launcher:binary:build
```

This runs `scripts/build-wesen-os-launcher.sh`, which executes the frontend build, dist sync, and then `go build` to produce `build/wesen-os-launcher`.

The SPA handler in `pkg/launcherui/handler.go` uses:

```go
//go:embed all:dist
var distFS embed.FS
```

The `all:` prefix includes dotfiles (like `.vite/manifest.json`) that Vite produces. The handler serves static files from the embedded filesystem and falls back to `index.html` for client-side routes.

## One-Command Build

For the common case of building everything from scratch:

```bash
cd wesen-os
npm run launcher:binary:build
```

This single command chains all three stages.

## Running the Built Binary

```bash
./build/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091
```

Then open `http://127.0.0.1:8091/`.

Key flags:

| Flag | Default | Purpose |
|---|---|---|
| `--addr` | `:8091` | HTTP listen address |
| `--arc-enabled` | `true` | Enable ARC-AGI module (set to `false` for faster local startup) |
| `--inventory-db` | `./data/inventory.db` | SQLite database path for inventory |
| `--root` | `/` | URL prefix for all handlers |
| `--gepa-scripts-root` | `` | Directories to scan for GEPA scripts |

See `wesen-os-launcher wesen-os-launcher --help` for the full flag list.

## Local Development with Vite Dev Server

For frontend development with hot-reloading, run the backend and Vite dev server separately:

```bash
# Terminal 1: Backend
cd wesen-os
go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091

# Terminal 2: Frontend dev server
cd wesen-os
npm run dev -w apps/os-launcher
```

The Vite dev server (default port 5173) proxies API requests to the backend. The proxy config in `vite.config.ts` maps:

- `/api/apps/...` → `http://127.0.0.1:8091/api/apps/...`
- `/api/os/apps` → `http://127.0.0.1:8091/api/os/apps`

Open `http://127.0.0.1:5173/` for the dev experience with hot module replacement.

**Why not just use the embedded binary for development:** The embedded binary requires a full rebuild for every frontend change. The Vite dev server provides sub-second hot reloads and preserves React component state during development.

See `developer-onboarding` for the tmux-based startup playbook that runs both processes in split panes.

## Go Workspace and Module Composition

The root `go.work` file includes all repositories in the workspace:

```
use (
    ./go-go-os-backend
    ./go-go-os-frontend
    ./go-go-app-inventory
    ./go-go-app-arc-agi-3
    ./go-go-gepa
    ./wesen-os
    // ... other modules
)
```

Additionally, `wesen-os/go.mod` uses `replace` directives to point at local checkouts:

```
replace github.com/go-go-golems/go-go-app-inventory => ../go-go-app-inventory
replace github.com/go-go-golems/go-go-app-arc-agi => ../go-go-app-arc-agi-3
replace github.com/go-go-golems/go-go-gepa => ../go-go-gepa
replace github.com/go-go-golems/go-go-os-backend => ../go-go-os-backend
```

**Why both `go.work` and `replace`:** The `go.work` file enables IDE support and `go test ./...` across the workspace. The `replace` directives ensure that `go build` inside `wesen-os/` uses local code even outside the workspace context (for example, in CI or when running with `GOWORK=off`).

## Smoke Tests

After building, run the smoke test suite:

```bash
npm run launcher:smoke
```

This runs `scripts/smoke-wesen-os-launcher.sh`, which:

1. Starts the launcher binary.
2. Waits for HTTP readiness.
3. Verifies `GET /api/os/apps` returns expected app entries.
4. Verifies the SPA index page is served.
5. Stops the launcher.

## Adding a New App to the Build

When adding a new app module, the build pipeline needs updates at these points:

1. **`go.work`:** Add the new module directory.
2. **`wesen-os/go.mod`:** Add a `replace` directive for the new module.
3. **`vite.config.ts`:** Add alias for the new app's frontend exports (if it has a frontend).
4. **`vite.config.ts`:** Add proxy route for the new app's API namespace (if needed during dev).
5. **`main.go`:** Import and instantiate the new backend module.

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| Binary serves old/stale UI | Dist sync or binary rebuild skipped | Run `npm run launcher:binary:build` (full pipeline) |
| Frontend build fails with module resolution errors | Missing or wrong Vite alias | Add alias for the imported package in `vite.config.ts` |
| `go:embed` error about missing dist directory | Frontend not built or dist not synced | Run `npm run launcher:frontend:build && npm run launcher:ui:sync` |
| Vite dev server returns 502 on API calls | Backend not running on expected port | Start backend on `127.0.0.1:8091` or update proxy target |
| `GOWORK=off go test` fails with module errors | Missing `replace` directive | Add `replace` to `wesen-os/go.mod` for the dependency |
| Binary missing new app routes | Module not imported in `main.go` | Add import and registration in `RunIntoWriter` |

## See Also

- `developer-onboarding` — Workspace setup and first startup
- `architecture-overview` — How the build pipeline fits into the overall system
- `troubleshooting` — General debugging guide
