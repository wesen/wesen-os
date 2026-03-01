---
Title: Troubleshooting Runbook
Slug: troubleshooting
Short: Symptom-based lookup table for diagnosing common wesen-os launcher issues across backend, frontend, VM runtime, and packaging.
Topics:
- debugging
- troubleshooting
- operations
Commands:
- wesen-os-launcher
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

This runbook is organized by symptom. Find the problem you are experiencing and follow the diagnostic steps. Each entry includes the root cause and a concrete fix.

## Backend Startup Failures

### Launcher exits immediately with lifecycle error

**Symptoms:** Process exits with `start backend module lifecycle` error.

**Diagnostic steps:**

1. Check which app IDs are in `--required-apps` (default: `inventory`).
2. Check whether the required module's `Health()` returned an error.
3. Look for `Init` or `Start` errors in the log output.

**Common causes and fixes:**

| Cause | Fix |
|---|---|
| Inventory DB path doesn't exist or isn't writable | Create the `data/` directory or set `--inventory-db` to a writable path |
| ARC runtime not configured but `--arc-enabled=true` (default) | Pass `--arc-enabled=false` for local development |
| Port already in use | Run `lsof-who -p 8091 -k` to kill the stale process |
| Required app health check failed | Check the specific module's logs for initialization errors |

### Duplicate app ID panic

**Symptoms:** Panic or error mentioning `duplicate app ID` during module registry creation.

**Cause:** Two modules return the same `Manifest().AppID`.

**Fix:** Give each module a unique app ID. Check all module implementations for collisions.

### Legacy alias validation failure

**Symptoms:** Error mentioning `validate legacy route aliases`.

**Cause:** The `--legacy-aliases` flag contains a path that is on the forbidden list (`/chat`, `/ws`, `/api/timeline`).

**Fix:** Remove the offending alias. Legacy paths are intentionally blocked to enforce the namespaced route model.

## Route and API Issues

### 404 on a backend route that should exist

**Diagnostic steps:**

1. Verify the module is in the `modules` slice in `main.go`.
2. Verify `GET /api/os/apps` includes the app ID.
3. Verify the route path uses the namespaced form: `/api/apps/<app-id>/<route>`.
4. Verify the module's `MountRoutes` registers the route without a namespace prefix.

**Common causes:**

| Cause | Fix |
|---|---|
| Module not registered in composition | Add to `modules` slice in `RunIntoWriter` |
| Route registered with hardcoded namespace prefix | Remove `/api/apps/<id>` from `MountRoutes`; backendhost adds it |
| Wrong HTTP method | Check if the handler expects GET vs POST |
| Path missing trailing slash or has extra slash | Match the exact path registered by the handler |

### Double-prefixed URLs

**Symptoms:** Requests go to `/api/apps/inventory/api/apps/inventory/chat`.

**Cause:** The module's `MountRoutes` hardcodes the namespace prefix, and backendhost adds it again.

**Fix:** Register routes as `/chat`, not `/api/apps/inventory/chat`, inside `MountRoutes`.

### `/api/os/apps` returns empty or incomplete

**Diagnostic steps:**

1. Check backend startup logs for module registration errors.
2. Check that all modules are created before `NewModuleRegistry(modules...)`.
3. If ARC is missing, check `--arc-enabled` flag.

## Frontend and UI Issues

### App icon opens "Unknown app module" window

**Diagnostic steps:**

1. Verify the app's frontend module is in `launcherModules` array in `apps/os-launcher/src/app/modules.tsx`.
2. Verify the frontend module's `manifest.id` matches the backend's `Manifest().AppID`.
3. Verify the module's state key is unique (no collision with other modules).

**Fix:** Add the module to `launcherModules` and ensure ID consistency.

### Embedded launcher serves stale frontend

**Symptoms:** UI looks outdated or missing new features after code changes.

**Diagnostic steps:**

1. Check when `pkg/launcherui/dist/index.html` was last modified.
2. Check whether the binary was rebuilt after the last frontend build.

**Fix:** Run the full build pipeline:

```bash
npm run launcher:binary:build
```

This chains frontend build → dist sync → Go binary build. All three stages must complete.

### Vite dev server returns 502 on API calls

**Symptoms:** API requests from the frontend fail with 502 Bad Gateway.

**Cause:** The backend is not running on the port that Vite's proxy targets.

**Fix:** Start the backend on `127.0.0.1:8091` (the proxy target configured in `vite.config.ts`), or update the proxy configuration to match the actual backend address.

## VM and HyperCard Issues

### VM handler executes but no visible state change

**Diagnostic steps:**

1. Open the hypercard-tools debug panel in the launcher.
2. Check the runtime timeline for emitted intents.
3. If intents appear: verify the action type string matches the reducer case exactly.
4. If no intents appear: verify the handler actually calls a dispatch function.
5. Check for capability authorization rejections in the timeline.

**Common causes:**

| Cause | Fix |
|---|---|
| Action type mismatch (`inventory/saveitem` vs `inventory/saveItem`) | Use identical casing in handler and reducer |
| Capability policy doesn't include the domain | Add domain to session capability allowlist |
| Handler uses wrong scope (session instead of domain) | Switch to `dispatchDomainAction` for business logic |
| Handler throws before reaching dispatch call | Add try/catch and check for JS errors in console |

### Runtime card not injected (card metadata in artifact but no render)

**Diagnostic steps:**

1. Verify `runtimeCardId` and `runtimeCardCode` fields exist in the timeline entity.
2. Verify artifact projection middleware extracted the card registration.
3. Verify the session host received the injection request.
4. Check the QuickJS console for compilation errors in the runtime card code.

**Common causes:**

| Cause | Fix |
|---|---|
| Missing `runtimeCardId` in timeline entity | Check backend SEM event construction |
| Card code has syntax errors | Fix JavaScript syntax; QuickJS rejects invalid code silently |
| Session host not ready when injection attempted | Cards are queued; check if session load completed |
| Duplicate runtime card ID | Use unique IDs per card instance |

### Domain intent fires but API call doesn't happen

**Symptoms:** Redux action appears in devtools but no network request.

**Cause:** Using the direct reducer pattern (Pattern 1) when you need the bridge middleware pattern (Pattern 2).

**Fix:** Implement a bridge middleware that intercepts the domain action and makes the API call. See the ARC bridge pattern in `go-go-app-arc-agi-3/apps/arc-agi-player/src/bridge/middleware.ts`.

## Database and Storage Issues

### Inventory database errors at startup

**Common causes:**

| Cause | Fix |
|---|---|
| DB file path doesn't exist | Create parent directory: `mkdir -p data/` |
| DB file is locked by another process | Stop the other process or use a different DB path |
| Migration failure | Check for schema version conflicts; try `--inventory-reset-on-start` |

### Timeline data not persisting

**Cause:** No timeline DSN or DB path configured. By default, timeline data is in-memory only.

**Fix:** Set `--timeline-dsn` or `--timeline-db` to a SQLite path for durable storage.

## Port and Process Issues

### Port already in use

```bash
lsof-who -p 8091 -k
```

This identifies and kills the process holding the port.

### Backend appears stuck at startup

**Common causes:**

| Cause | Fix |
|---|---|
| ARC module waiting for runtime health | Pass `--arc-enabled=false` |
| Long database migration | Wait or check DB file permissions |
| Deadlock in module init | Check logs for the last successful init step |

## Build and Compilation Issues

### `go:embed` fails with pattern error

**Cause:** The `pkg/launcherui/dist/` directory is empty or doesn't exist.

**Fix:** Run the frontend build and dist sync first:

```bash
npm run launcher:frontend:build
npm run launcher:ui:sync
```

### Module import errors with `GOWORK=off`

**Cause:** Missing `replace` directive in `wesen-os/go.mod`.

**Fix:** Add a `replace` directive pointing to the local checkout of the dependency.

### Frontend build fails with alias resolution errors

**Cause:** A new import references a package without a Vite alias.

**Fix:** Add the alias in `apps/os-launcher/vite.config.ts`.

## See Also

- `architecture-overview` — System topology for understanding component relationships
- `api-reference` — Endpoint catalog for verifying route existence
- `build-and-package` — Build pipeline details for packaging issues
- `intent-routing-reference` — Intent scope and naming contract for VM debugging
