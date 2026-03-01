---
Title: Architecture Overview
Slug: architecture-overview
Short: High-level system map of the wesen-os modular app runtime, including repository topology, module boundaries, and runtime data flow.
Topics:
- architecture
- backend
- modules
- composition
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

The wesen-os launcher is a composed runtime that assembles backend app modules and a frontend shell into a single binary. Understanding how the pieces fit together is the prerequisite for adding new apps, debugging route issues, or reasoning about the build pipeline.

## Repository Topology

The system spans multiple repositories that are composed via a Go workspace (`go.work`) and local `replace` directives in `wesen-os/go.mod`. During development these repositories act as one integrated system.

| Repository | Owns | Language |
|---|---|---|
| `go-go-os-backend` | Backend host contracts, lifecycle, namespaced routing, manifest endpoint | Go |
| `go-go-os-frontend` | Shared frontend packages (desktop-os, engine, hypercard-runtime, chat-runtime) | TypeScript |
| `go-go-app-inventory` | Inventory backend + frontend app | Go + TypeScript |
| `go-go-app-arc-agi-3` | ARC-AGI backend + frontend app | Go + TypeScript |
| `go-go-gepa` | GEPA optimizer backend module | Go |
| `wesen-os` | Composition root: launcher binary, launcher frontend shell, doc embedding | Go + TypeScript |

The composition binary lives in `wesen-os/cmd/wesen-os-launcher/main.go`. It imports backend modules from app repositories and mounts them under namespaced routes.

## Runtime Data Flow

At startup, the launcher performs these steps in order:

1. Parse server config flags (address, DB paths, feature toggles).
2. Initialize domain stores (inventory SQLite, profiles).
3. Create backend module instances (inventory, GEPA, optionally ARC).
4. Register modules in a `ModuleRegistry` that validates uniqueness and app ID format.
5. Run lifecycle startup (`Init` then `Start`) with health checks for required apps.
6. Mount each module's routes under `/api/apps/<app-id>/`.
7. Register the manifest discovery endpoint at `/api/os/apps`.
8. Serve the embedded SPA frontend as a fallback handler.

At runtime, the frontend discovers available apps via `GET /api/os/apps`, renders the launcher shell, and delegates to per-app windows that communicate with their backend via `resolveApiBase(appId)` which resolves to `/api/apps/<appId>`.

## Three Critical Invariants

These invariants must hold across the entire system. Violating any of them causes silent failures or runtime errors that are difficult to diagnose.

**1. App ID consistency.** The app ID string must be identical in the backend `Manifest().AppID`, the frontend `manifest.id`, and all URL path references. A mismatch between backend and frontend causes the launcher to fail to resolve API bases or show "unknown module" errors.

**2. Intent naming alignment.** When VM card handlers emit `dispatchDomainAction(domain, actionType, payload)`, the resulting Redux action type is `<domain>/<actionType>`. The reducer or effect handler must match this exact string. A typo or case mismatch causes the action to be silently ignored.

**3. Packaging chain integrity.** The embedded launcher binary serves frontend assets from `pkg/launcherui/dist/`. If the frontend build, dist sync, or binary rebuild steps are skipped or run out of order, the binary serves stale or missing UI. The chain is: frontend build -> `launcher-ui-sync.sh` -> Go binary build.

## Module Boundaries

Each backend module implements the `AppBackendModule` interface from `go-go-os-backend/pkg/backendhost`. This interface provides:

- `Manifest()` — identity, capabilities, required flag
- `MountRoutes(*http.ServeMux)` — HTTP handlers scoped to the module
- `Init/Start/Stop/Health` — lifecycle methods

Routes registered in `MountRoutes` are automatically prefixed with `/api/apps/<app-id>/` by the host. Modules must not hardcode their own path prefix.

Optional reflection support (`ReflectiveAppBackendModule`) exposes machine-readable API documentation at `/api/os/apps/<app-id>/reflection`.

## Suggested Reading Paths

| Role | Next documents |
|---|---|
| New engineer (any role) | `developer-onboarding`, then `glossary` |
| Backend developer | `backend-module-guide`, then `api-reference`, then `build-and-package` |
| Fullstack (adding a new app) | `backend-module-guide`, then `build-and-package` |
| Debugging / ops | `troubleshooting`, then `api-reference` |

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| Module not appearing in `/api/os/apps` | Module not added to composition list in `main.go` | Add module to `modules` slice before registry creation |
| Duplicate app ID panic at startup | Two modules share the same app ID | Give each module a unique ID |
| Routes return 404 despite module being registered | Routes hardcode `/api/apps/...` prefix inside `MountRoutes` | Remove prefix; backendhost adds it automatically |
| Frontend shows "Unknown app module" | Frontend module not registered in `modules.tsx` | Add to `launcherModules` array |

## See Also

- `developer-onboarding` — First-day setup walkthrough
- `backend-module-guide` — Step-by-step guide for adding a backend module
- `build-and-package` — Frontend build, embed, and binary assembly pipeline
- `glossary` — Term definitions used across this documentation
