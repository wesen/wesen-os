---
Title: API Endpoint Reference
Slug: api-reference
Short: Complete HTTP endpoint catalog for the wesen-os launcher, including manifest discovery, reflection, and per-app route conventions.
Topics:
- api
- endpoints
- backend
- manifest
- reflection
Commands:
- wesen-os-launcher
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

Every backend module in wesen-os exposes HTTP endpoints under a namespaced prefix. This document catalogs the platform-level endpoints and the per-app route conventions so frontend developers, integration testers, and debugging sessions have a single reference.

## Platform Endpoints

These endpoints are registered by the backendhost layer, not by individual app modules.

### GET /api/os/apps

Returns the list of registered app modules with health status and reflection availability.

**Response shape:**

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

**Why it exists:** The launcher frontend calls this endpoint at startup to discover which apps are available, whether they are healthy, and whether reflection metadata can be fetched. It is the single source of truth for what the running instance supports.

**What happens if it returns errors:** The frontend cannot populate the app catalog. Verify that the backend is running and that lifecycle startup completed without errors.

### GET /api/os/apps/{app_id}/reflection

Returns machine-readable API documentation for one app module. Only available when the module implements `ReflectiveAppBackendModule`.

**Response shape (example for ARC):**

```json
{
  "app_id": "arc-agi",
  "name": "ARC-AGI",
  "description": "Abstract Reasoning Corpus game engine",
  "capabilities": [
    { "id": "games", "stability": "beta" },
    { "id": "reflection", "stability": "stable" }
  ],
  "apis": [
    { "id": "games-list", "method": "GET", "path": "/api/apps/arc-agi/games" },
    { "id": "session-create", "method": "POST", "path": "/api/apps/arc-agi/sessions" }
  ],
  "schemas": [
    { "id": "arc.games.list.response.v1", "format": "json-schema" }
  ]
}
```

**Why it exists:** Reflection accelerates onboarding by making the API surface discoverable without reading source code. It also powers the apps-browser debug tool in the launcher frontend.

## App Route Namespace Convention

All app routes are mounted under `/api/apps/<app-id>/`. The app module registers routes relative to its own root; the backendhost layer prepends the namespace prefix.

For example, if the inventory module registers:

```go
mux.HandleFunc("/chat", m.handleChat)
mux.HandleFunc("/ws", m.handleWs)
mux.HandleFunc("/api/timeline", m.handleTimeline)
```

The effective URLs become:

```
/api/apps/inventory/chat
/api/apps/inventory/ws
/api/apps/inventory/api/timeline
```

**Why this matters:** Hardcoding `/api/apps/inventory/` inside a module's `MountRoutes` function causes double-prefixing and 404s. Always register routes without the namespace prefix.

## Per-App Route Catalogs

### Inventory (`/api/apps/inventory/...`)

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/chat` | Chat conversation endpoint |
| GET | `/ws` | WebSocket connection for streaming events |
| GET | `/api/timeline` | Timeline entity retrieval |
| GET | `/api/` | General API root |
| POST | `/confirm` | Confirmation dialog handler |
| GET | `/` | App root / health |

Capabilities: `chat`, `ws`, `timeline`, `profiles`, `confirm`

### GEPA (`/api/apps/gepa/...`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/scripts` | List available optimization scripts |
| POST | `/runs` | Start a new optimization run |
| GET | `/runs` | List runs |
| GET | `/runs/{id}` | Get run status and results |
| GET | `/schemas` | Schema discovery |

Capabilities: `scripts`, `runs`, `timeline`, `reflection`

### ARC-AGI (`/api/apps/arc-agi/...`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/games` | List available ARC games |
| POST | `/sessions` | Create a game session |
| POST | `/sessions/{id}/action` | Submit a game action |
| POST | `/sessions/{id}/reset` | Reset a session |
| GET | `/sessions/{id}/timeline` | Session event timeline |
| GET | `/schemas` | Schema discovery |

Capabilities: `games`, `sessions`, `actions`, `timeline`, `reflection`

Note: ARC routes are only available when `--arc-enabled=true` (default). Set `--arc-enabled=false` for local development without ARC runtime dependencies.

## Legacy Route Policy

The following top-level paths are explicitly registered as 404 handlers to prevent accidental use of pre-namespace routes:

- `/chat`, `/chat/`
- `/ws`, `/ws/`
- `/api/timeline`, `/api/timeline/`

**Why this exists:** Before the namespaced route model, some clients used these paths directly. The explicit 404 handlers make it immediately obvious that the old paths no longer work, rather than silently falling through to the SPA handler.

The `--legacy-aliases` flag is validated at startup by `GuardNoLegacyAliases`. If any forbidden aliases are configured, the launcher refuses to start.

## WebSocket Connection Model

WebSocket connections follow the same namespace convention. The frontend resolves WebSocket URLs via `resolveWsBase(appId)` which produces `/api/apps/<appId>/ws`.

The inventory WebSocket carries streaming chat events, hypercard timeline events, and confirmation dialog interactions. Each connection is scoped to one conversation and managed by the webchat server's per-conversation reader lifecycle.

Relevant flags:

| Flag | Default | Purpose |
|---|---|---|
| `--idle-timeout-seconds` | 60 | Stop per-conversation reader after N idle seconds |
| `--evict-idle-seconds` | 300 | Evict conversations after N idle seconds |
| `--evict-interval-seconds` | 60 | Sweep interval for idle conversation eviction |

## Health Check Endpoints

For quick verification that the system is running:

```bash
# Platform manifest (includes per-app health)
curl -sS http://127.0.0.1:8091/api/os/apps | jq .

# Individual app health via manifest
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | select(.app_id=="inventory") | .healthy'
```

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| `/api/os/apps` returns empty apps list | No modules registered or lifecycle startup failed | Check backend startup logs for errors |
| Reflection endpoint returns 404 | Module does not implement `ReflectiveAppBackendModule` | Add reflection support to the module |
| Double-prefixed URLs (`/api/apps/inventory/api/apps/inventory/...`) | Module hardcodes namespace prefix in `MountRoutes` | Remove the prefix from route registration |
| WebSocket connection drops immediately | Idle timeout too aggressive | Increase `--idle-timeout-seconds` |
| Legacy path `/chat` returns 404 | Expected behavior — route was intentionally blocked | Use `/api/apps/inventory/chat` instead |

## See Also

- `architecture-overview` — System topology and module boundaries
- `backend-module-guide` — How to add routes and capabilities to a new module
- `troubleshooting` — Symptom-based debugging guide
