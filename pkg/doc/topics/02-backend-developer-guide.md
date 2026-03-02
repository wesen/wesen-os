---
Title: Backend Developer Guide
Slug: backend-developer-guide
Short: Comprehensive guide for building Go backend app modules in wesen-os, from the AppBackendModule contract through lifecycle, routing, reflection, composition wiring, and testing.
Topics:
- backend
- go
- modules
- api
- developer-guide
Commands:
- wesen-os-launcher
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

This guide covers everything a Go developer needs to build, test, and integrate a backend app module into the wesen-os launcher. It starts with the conceptual foundations — what modules are and why the system is designed around them — then moves through the contract reference with concrete examples drawn from the inventory, GEPA, and ARC-AGI modules.

For frontend module development, see `frontend-developer-guide`. For the dedicated OS-02 docs architecture and endpoint contracts, see `backend-documentation-system`. For building a complete app with both backend and frontend, see `building-a-full-app`. For workspace setup and operations, see `wesen-os-guide`. For the HyperCard card system that frontend modules use to create interactive UI, see `hypercard-environment-guide`.

## What Modules Are and Why They Exist

A backend module is a self-contained unit of application functionality that plugs into the wesen-os composition runtime. Think of it as a small, focused web service that doesn't need to worry about running its own HTTP server, managing its own process lifecycle, or exposing its own health checks to the outside world. The composition runtime handles all of that — the module focuses entirely on its domain logic.

This design comes from a practical observation: most backend services share the same operational boilerplate. They need to start up in an orderly fashion, respond to health checks, expose HTTP endpoints under a well-known path, and shut down gracefully. Rather than reimplementing these concerns in every service, wesen-os extracts them into a contract. The `AppBackendModule` interface is that contract — six methods that cover identity, routing, and lifecycle.

The module abstraction provides three key benefits:

- **Isolation without overhead.** Each module owns its own HTTP routes, state, and resources. Modules cannot accidentally interfere with each other's routes because the namespace prefix is enforced by the runtime, not by convention. Yet all modules run in a single process, sharing a single port and a single binary — no container orchestration, no service mesh, no inter-process communication overhead.

- **Discoverability.** Every module is automatically discoverable through the manifest endpoint (`GET /api/os/apps`). Modules that implement reflection expose machine-readable API documentation. The frontend shell uses these endpoints to know what backend capabilities exist, and debug tools use them to show the system's current state. When you add a module, the entire system immediately knows about it.

- **Testability at every level.** The `AppBackendModule` interface is deliberately simple: no framework dependencies, no dependency injection container, no runtime magic. You can test a module's routes by creating an `http.ServeMux`, calling `MountRoutes`, and making `httptest` requests. You can test the namespaced mounting by calling `MountNamespacedRoutes`. You can test the lifecycle by calling `Init`, `Start`, `Health`, and `Stop` in sequence. Every layer is independently testable.

### How a Module Fits into the Bigger Picture

The following diagram shows how a backend module relates to the rest of the system. The module itself is the rightmost box — everything to its left is infrastructure provided by the composition runtime.

```
  Browser / Frontend
       |
       |  GET /api/apps/my-app/items
       v
  +-- HTTP Server (net/http) ---------------------------------+
  |                                                            |
  |  Main Mux                                                  |
  |    |                                                       |
  |    +-- /api/os/apps ---------> Module Registry             |
  |    |                            (manifest, health, reflect)|
  |    |                                                       |
  |    +-- /api/apps/my-app/ ----> StripPrefix                 |
  |    |                            |                          |
  |    |                            v                          |
  |    |                      Child Mux                        |
  |    |                        |                              |
  |    |                        +-- GET /items --> handleList   |
  |    |                        +-- POST /items -> handleCreate|
  |    |                        +-- GET /health -> handleHealth|
  |    |                                                       |
  |    +-- (fallback) ----------> SPA Handler                  |
  +------------------------------------------------------------+
```

Your module code lives in the "Child Mux" section. The runtime creates the HTTP server, the main mux, the namespace prefix, and the SPA fallback. Your module just registers handlers on the child mux and implements the lifecycle methods.

### How Backend Modules Connect to the Frontend

Backend modules do not directly know about the frontend. There is no import, no shared type system, no RPC framework connecting the two. Instead, the connection is mediated through two mechanisms:

**HTTP APIs.** The frontend calls the backend's routes through `resolveApiBase(appId)`, which produces URLs like `/api/apps/inventory/items`. The contract between frontend and backend is the HTTP API — request methods, URL paths, JSON request/response shapes. The reflection endpoint makes this contract discoverable.

**Timeline events and HyperCard cards.** For modules that support chat and interactive cards, the backend emits Structured Event Mapping (SEM) events through a WebSocket connection. These events flow through the timeline pipeline into the frontend's Redux store. Some events carry HyperCard card definitions that are injected into the QuickJS sandbox for rendering. This pipeline is covered in detail in the `hypercard-environment-guide`.

The app ID is the bridge between these worlds. When the frontend calls `resolveApiBase('inventory')`, it gets `/api/apps/inventory`. When the backend registers routes on a mux with app ID `inventory`, those routes end up at `/api/apps/inventory/...`. The string must match exactly.

## Getting Started

### Prerequisites

- A running workspace with all repositories cloned as siblings (see `wesen-os-guide`).
- Go 1.25+ installed.
- Familiarity with Go HTTP handlers and interfaces.

### Your First Module in 5 Minutes

Create a new Go package for your module. The conventional location is `pkg/backendmodule/` in your app repository.

```go
package backendmodule

import (
    "context"
    "fmt"
    "net/http"
    "sync/atomic"

    "github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
)

// Compile-time check: Module must implement AppBackendModule.
var _ backendhost.AppBackendModule = (*Module)(nil)

type Module struct {
    healthy atomic.Bool
}

func NewModule() *Module {
    return &Module{}
}

func (m *Module) Manifest() backendhost.AppBackendManifest {
    return backendhost.AppBackendManifest{
        AppID:        "my-app",
        Name:         "My App",
        Description:  "A new application module.",
        Capabilities: []string{"api", "reflection"},
    }
}

func (m *Module) Init(ctx context.Context) error { return nil }

func (m *Module) Start(ctx context.Context) error {
    m.healthy.Store(true)
    return nil
}

func (m *Module) Stop(ctx context.Context) error {
    m.healthy.Store(false)
    return nil
}

func (m *Module) Health(ctx context.Context) error {
    if !m.healthy.Load() {
        return fmt.Errorf("my-app: not started")
    }
    return nil
}

func (m *Module) MountRoutes(mux *http.ServeMux) error {
    mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte(`{"status":"ok"}`))
    })
    mux.HandleFunc("GET /items", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        _, _ = w.Write([]byte(`{"items":[]}`))
    })
    return nil
}
```

Wire it into the launcher by adding it to the `modules` slice in `wesen-os/cmd/wesen-os-launcher/main.go`:

```go
myModule := mybackend.NewModule()
modules := []backendhost.AppBackendModule{
    inventoryModule,
    gepaModule,
    myModule,
}
```

Start the launcher and verify:

```bash
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | select(.app_id=="my-app")'
curl -sS http://127.0.0.1:8091/api/apps/my-app/items
```

### Project Layout Conventions

| File | Purpose |
|---|---|
| `pkg/backendmodule/module.go` | Module struct, manifest, lifecycle, health |
| `pkg/backendmodule/routes.go` | HTTP handler registration and implementations |
| `pkg/backendmodule/contracts.go` | Request/response DTOs |
| `pkg/backendmodule/reflection.go` | Reflection document |
| `pkg/backendmodule/module_test.go` | Contract, route, health, and namespace tests |

## The AppBackendModule Contract

Every backend module implements this interface from `go-go-os-backend/pkg/backendhost/module.go`:

```go
type AppBackendModule interface {
    Manifest() AppBackendManifest
    MountRoutes(mux *http.ServeMux) error
    Init(ctx context.Context) error
    Start(ctx context.Context) error
    Stop(ctx context.Context) error
    Health(ctx context.Context) error
}
```

**Why the `var _` compile-time check matters:** In a large codebase with multiple module implementations, forgetting a method is easy. The line `var _ backendhost.AppBackendModule = (*Module)(nil)` causes a compile error if your struct misses any method, catching the problem before any test runs.

### Manifest

The `AppBackendManifest` struct declares your module's identity and capabilities:

```go
type AppBackendManifest struct {
    AppID        string   `json:"app_id"`
    Name         string   `json:"name"`
    Description  string   `json:"description,omitempty"`
    Required     bool     `json:"required,omitempty"`
    Capabilities []string `json:"capabilities,omitempty"`
}
```

**AppID** — The canonical identifier for your module. Must match the regex `^[a-z0-9][a-z0-9-]{0,62}$` (lowercase alphanumeric with hyphens). This string determines the URL namespace (`/api/apps/<app-id>/`), appears in the manifest endpoint, and must match the frontend module's `manifest.id` exactly. Choose carefully — changing it later requires updating all references.

**Name** — Human-readable display name. Shown in the `/api/os/apps` response and the apps-browser debug tool.

**Required** — When true, the lifecycle manager checks this module's health during startup. If the health check fails, the entire launcher startup fails. You can also make a module required via the `--required-apps` flag without setting this field.

**Capabilities** — Free-form strings describing what the module offers. They surface in `/api/os/apps` and help frontend code decide how to interact with the module. Use specific, meaningful names:

| App | Capabilities |
|---|---|
| inventory | `chat`, `ws`, `timeline`, `profiles`, `confirm`, `docs` |
| gepa | `scripts`, `runs`, `timeline`, `reflection`, `docs` |
| arc-agi | `games`, `sessions`, `actions`, `timeline`, `reflection`, `docs` |

### Lifecycle: Init, Start, Stop, Health

The lifecycle manager orchestrates an orderly startup and shutdown sequence across all registered modules. Understanding this sequence matters because it determines when your module can safely use resources, when it must be ready to serve, and what happens when something goes wrong.

The sequence proceeds in registration order for startup and reverse order for shutdown:

```
  Startup:                              Shutdown (or rollback):

  Module A: Init -> Start               Module C: Stop
  Module B: Init -> Start               Module B: Stop
  Module C: Init -> Start               Module A: Stop
       |                                     ^
       v                                     |
  Health check (required modules only)  (reverse order)
       |
       v
  Mount routes, begin serving
```

If any `Init` or `Start` call fails, the lifecycle manager rolls back by calling `Stop` on all previously started modules in reverse order. This ensures that resources are released even when startup fails partway through.

**Init(ctx)** — Allocate resources: open database connections, load configuration files, validate prerequisites, parse embedded assets. Return an error to abort startup. Called once before `Start`. This is where you establish the preconditions your module needs — if the database doesn't exist or the config is invalid, fail here with a clear error message rather than letting the module start in a broken state.

**Start(ctx)** — Begin serving: start background workers, connect to external services, begin processing queues. Called after `Init` succeeds. The module is added to the started list for rollback. After `Start` returns successfully, the module is expected to be able to handle requests. If `Start` fails, the same reverse-order `Stop` rollback happens.

**Stop(ctx)** — Graceful shutdown: close database connections, stop background workers, flush buffers, release resources. Called in reverse registration order during normal shutdown or startup rollback. Should be idempotent — calling `Stop` on a module that was never started should not panic. This is important because during rollback, `Stop` may be called on a module whose `Init` succeeded but whose `Start` was never called.

**Health(ctx)** — Return nil if the module is ready to serve requests. Return an error with a diagnostic message if something is wrong. Called after all modules are started, but only checked for required modules. Health is also reported in the manifest endpoint (`GET /api/os/apps`), so a failing health check is visible to both the startup sequence and anyone inspecting the running system.

**Make health checks meaningful.** A health check that always returns nil hides deployment errors that surface only after user traffic arrives. Good health checks verify the actual readiness of the module's dependencies:

```go
func (m *Module) Health(ctx context.Context) error {
    if !m.healthy.Load() {
        return fmt.Errorf("my-app: not started or shutting down")
    }
    if err := m.db.PingContext(ctx); err != nil {
        return fmt.Errorf("my-app: database unreachable: %w", err)
    }
    if !m.worker.IsRunning() {
        return fmt.Errorf("my-app: background worker stopped")
    }
    return nil
}
```

### MountRoutes

The `mux` argument is a fresh `*http.ServeMux` already scoped to your module's namespace. Routes registered here become `/api/apps/<app-id>/<route>` — backendhost prepends the prefix automatically using `http.StripPrefix`.

```go
func (m *Module) MountRoutes(mux *http.ServeMux) error {
    mux.HandleFunc("GET /health", m.handleHealth)
    mux.HandleFunc("GET /items", m.handleListItems)
    mux.HandleFunc("POST /items", m.handleCreateItem)
    mux.HandleFunc("GET /items/{id}", m.handleGetItem)
    mux.HandleFunc("PUT /items/{id}", m.handleUpdateItem)
    mux.HandleFunc("DELETE /items/{id}", m.handleDeleteItem)
    mux.HandleFunc("GET /schemas/", m.handleSchemas)
    return nil
}
```

If your app ID is `my-app`, the effective URLs are:

```
GET    /api/apps/my-app/health
GET    /api/apps/my-app/items
POST   /api/apps/my-app/items
GET    /api/apps/my-app/items/{id}
PUT    /api/apps/my-app/items/{id}
DELETE /api/apps/my-app/items/{id}
GET    /api/apps/my-app/schemas/
```

**The most common routing mistake** is hardcoding the namespace prefix inside `MountRoutes`. If you register `/api/apps/my-app/items`, the effective URL becomes `/api/apps/my-app/api/apps/my-app/items` (double-prefixed) and nothing works. Always register routes without the prefix.

Go 1.22+ method routing patterns (`GET /items`, `POST /items/{id}`) work correctly within the scoped mux.

## Reflection

Reflection makes your module's API discoverable without reading source code. Implement the optional `ReflectiveAppBackendModule` interface to expose machine-readable documentation at `/api/os/apps/<app-id>/reflection`.

```go
type ReflectiveAppBackendModule interface {
    Reflection(ctx context.Context) (*ModuleReflectionDocument, error)
}
```

### ModuleReflectionDocument Structure

```go
type ModuleReflectionDocument struct {
    AppID        string                 `json:"app_id"`
    Name         string                 `json:"name"`
    Version      string                 `json:"version,omitempty"`
    Summary      string                 `json:"summary,omitempty"`
    Capabilities []ReflectionCapability `json:"capabilities,omitempty"`
    Docs         []ReflectionDocLink    `json:"docs,omitempty"`
    APIs         []ReflectionAPI        `json:"apis,omitempty"`
    Schemas      []ReflectionSchemaRef  `json:"schemas,omitempty"`
}
```

`ReflectionCapability` includes `ID`, `Stability` (`stable`, `beta`, `experimental`), and `Description`.

`ReflectionAPI` includes `ID`, `Method`, `Path` (the full namespaced path), `Summary`, and optional schema references for request/response/error bodies.

`ReflectionSchemaRef` includes `ID`, `Format` (`json-schema`), and optionally a `URI` or `Embedded` schema object.

### Example Reflection Implementation

```go
var _ backendhost.ReflectiveAppBackendModule = (*Module)(nil)

func (m *Module) Reflection(ctx context.Context) (*backendhost.ModuleReflectionDocument, error) {
    return &backendhost.ModuleReflectionDocument{
        AppID:   "my-app",
        Name:    "My App",
        Version: "v1",
        Summary: "Task management module with CRUD API.",
        Capabilities: []backendhost.ReflectionCapability{
            {ID: "api", Stability: "stable", Description: "RESTful item management"},
            {ID: "reflection", Stability: "stable"},
        },
        APIs: []backendhost.ReflectionAPI{
            {ID: "list-items", Method: "GET", Path: "/api/apps/my-app/items", Summary: "List all items"},
            {ID: "create-item", Method: "POST", Path: "/api/apps/my-app/items", Summary: "Create a new item"},
            {ID: "get-item", Method: "GET", Path: "/api/apps/my-app/items/{id}", Summary: "Get item by ID"},
        },
        Schemas: []backendhost.ReflectionSchemaRef{
            {ID: "my-app.items.list.response.v1", Format: "json-schema"},
        },
    }, nil
}
```

**Why add reflection early:** Reflection documents accumulate during development. If you add them later, you have to reconstruct the full API surface from handlers. Starting with reflection keeps documentation synchronized with implementation.

## Module Documentation System (OS-02)

OS-02 adds a structured docs system that runs alongside reflection. Reflection is API-oriented metadata; module docs are authored Markdown pages for runbooks, overviews, API explanations, and troubleshooting guides.

### Backend Contract

Modules that expose docs implement the optional `DocumentableAppBackendModule` interface:

```go
type DocumentableAppBackendModule interface {
    AppBackendModule
    DocStore() *docmw.DocStore
}
```

When implemented, `/api/os/apps` includes a `docs` hint:

```json
{
  "app_id": "inventory",
  "name": "Inventory",
  "docs": {
    "available": true,
    "url": "/api/apps/inventory/docs",
    "count": 4,
    "version": "v1"
  }
}
```

### Authoring Pattern

1. Create `pkg/backendmodule/docs/*.md` pages with frontmatter.
2. Embed docs with `//go:embed docs/*.md`.
3. Parse docs into `docmw.DocStore` in module construction.
4. Mount docs routes in `MountRoutes` with `docmw.MountRoutes(mux, store)`.
5. Return the store from `DocStore()`.

Required frontmatter fields:

- `Title`
- `DocType`

Common optional fields:

- `Slug` (defaults to filename without extension)
- `Summary`
- `Topics`
- `SeeAlso`
- `Order`

Example page:

```markdown
---
Title: Inventory API Reference
DocType: api-reference
Slug: api-reference
Topics:
  - inventory
  - api
Summary: Route-level contract for inventory backend endpoints.
Order: 20
---

# Inventory API Reference
```

### Endpoint Contracts

Module-local endpoints:

- `GET /api/apps/<app-id>/docs`
  - returns `{ "module_id": "...", "docs": [...] }`
  - each entry contains metadata only (no large markdown body)
- `GET /api/apps/<app-id>/docs/<slug>`
  - returns one doc entry including `content`

Composition endpoint:

- `GET /api/os/docs`
  - aggregates docs across all documentable modules
  - supports filters:
    - `query`
    - `module`
    - `doc_type`
    - `topics`
  - returns `results` and `facets` (`topics`, `doc_types`, `modules`)

### Smoke Commands (Copy/Paste)

```bash
# 1) Manifest includes docs hint per app
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | {app_id, healthy, docs, reflection}'

# 2) Module docs index
curl -sS http://127.0.0.1:8091/api/apps/inventory/docs | jq .

# 3) Module docs page by slug
curl -sS http://127.0.0.1:8091/api/apps/inventory/docs/overview | jq .

# 4) Cross-module aggregated docs with filters
curl -sS "http://127.0.0.1:8091/api/os/docs?module=inventory,gepa&doc_type=overview" | jq .
```

## Composition Wiring

How to register your module in the wesen-os launcher.

### Direct Registration

If your module directly implements `AppBackendModule`, add it to the `modules` slice in `RunIntoWriter` in `wesen-os/cmd/wesen-os-launcher/main.go`:

```go
myModule := mybackend.NewModule(config)

modules := []backendhost.AppBackendModule{
    inventoryModule,
    gepaModule,
    myModule,
}
```

The existing loop in `RunIntoWriter` handles everything else: registry creation, lifecycle startup, namespaced route mounting, and manifest endpoint inclusion.

### Adapter Pattern

If your module uses a different internal contract, create a thin adapter package. This is how the three existing apps integrate:

- **Inventory**: `go-go-app-inventory/pkg/backendmodule/module.go` wraps `backendcomponent.Component` into `AppBackendModule` from within the inventory repository.
- **ARC-AGI**: `wesen-os/pkg/arcagi/module.go` wraps the ARC module contract.
- **GEPA**: `wesen-os/pkg/gepa/module.go` wraps the GEPA module contract.

The adapter is typically 50-100 lines that delegate each interface method to the underlying implementation while normalizing manifest and reflection structures.

### Module Dependencies

When your module lives in a separate repository:

1. Add a `replace` directive in `wesen-os/go.mod`:
   ```
   replace github.com/go-go-golems/my-app-repo => ../my-app-repo
   ```

2. Add the directory to the root `go.work`:
   ```
   use (
       ./my-app-repo
       // ... existing entries
   )
   ```

3. Import and use in `main.go`:
   ```go
   import mybackend "github.com/go-go-golems/my-app-repo/pkg/backendmodule"
   ```

### Configuration Flags

To add module-specific configuration flags, add them to `NewCommand()` in `main.go`:

```go
fields.New("my-app-db", fields.TypeString, fields.WithDefault("./data/my-app.db"),
    fields.WithHelp("SQLite database path for my-app")),
fields.New("my-app-timeout-seconds", fields.TypeInteger, fields.WithDefault(30),
    fields.WithHelp("Request timeout for my-app operations")),
```

Read them in `RunIntoWriter` via the `serverSettings` struct:

```go
type serverSettings struct {
    // ... existing fields
    MyAppDB      string `glazed:"my-app-db"`
    MyAppTimeout int    `glazed:"my-app-timeout-seconds"`
}
```

## Namespaced Route Model

All app routes are mounted under `/api/apps/<app-id>/` using `MountNamespacedRoutes` from `go-go-os-backend/pkg/backendhost/routes.go`. This namespace isolation is one of the central design decisions in wesen-os — it ensures that modules cannot accidentally shadow each other's routes, and it gives the frontend a predictable URL pattern for resolving API endpoints.

The namespace also enables the manifest and reflection endpoints to work. Because the runtime knows every module's app ID and prefix, it can construct the manifest endpoint that lists all modules and the reflection URLs that point to each module's API documentation. Without namespacing, the runtime would have no way to distinguish one module's routes from another's.

### How MountNamespacedRoutes Works

```go
func MountNamespacedRoutes(parent *http.ServeMux, appID string, mount func(mux *http.ServeMux) error) error {
    prefix, err := NamespacedAppPrefix(appID)  // "/api/apps/<appID>"
    subMux := http.NewServeMux()
    if err := mount(subMux); err != nil {
        return err
    }
    parent.Handle(prefix+"/", http.StripPrefix(prefix, subMux))
    return nil
}
```

It creates a child `http.ServeMux`, calls your `MountRoutes` with it, then mounts the child under the namespace prefix using `http.StripPrefix`. Your handlers receive requests with the prefix already stripped — they see `/items`, not `/api/apps/my-app/items`.

### App ID Validation

App IDs are validated by `ValidateAppID` against the regex `^[a-z0-9][a-z0-9-]{0,62}$`:

- Must start with a lowercase letter or digit.
- May contain lowercase letters, digits, and hyphens.
- Maximum 63 characters.

Invalid IDs are rejected during module registry creation.

## Testing

### Manifest Contract Test

```go
func TestModuleManifest(t *testing.T) {
    m := NewModule()
    manifest := m.Manifest()

    assert.Equal(t, "my-app", manifest.AppID)
    assert.NotEmpty(t, manifest.Name)
    assert.NotEmpty(t, manifest.Capabilities)
    assert.NoError(t, backendhost.ValidateAppID(manifest.AppID))
}
```

### Route Method Validation

```go
func TestRoutes(t *testing.T) {
    m := NewModule()
    require.NoError(t, m.Init(context.Background()))
    require.NoError(t, m.Start(context.Background()))
    defer m.Stop(context.Background())

    mux := http.NewServeMux()
    require.NoError(t, m.MountRoutes(mux))

    tests := []struct {
        method string
        path   string
        status int
    }{
        {"GET", "/items", http.StatusOK},
        {"POST", "/items", http.StatusCreated},
        {"GET", "/health", http.StatusOK},
    }

    for _, tt := range tests {
        req := httptest.NewRequest(tt.method, tt.path, nil)
        rec := httptest.NewRecorder()
        mux.ServeHTTP(rec, req)
        assert.Equal(t, tt.status, rec.Code, "%s %s", tt.method, tt.path)
    }
}
```

### Health Check Lifecycle Test

```go
func TestHealthLifecycle(t *testing.T) {
    m := NewModule()

    // Before start: unhealthy
    assert.Error(t, m.Health(context.Background()))

    // After start: healthy
    require.NoError(t, m.Init(context.Background()))
    require.NoError(t, m.Start(context.Background()))
    assert.NoError(t, m.Health(context.Background()))

    // After stop: unhealthy
    require.NoError(t, m.Stop(context.Background()))
    assert.Error(t, m.Health(context.Background()))
}
```

### Namespaced Mount Test

```go
func TestNamespacedRoutes(t *testing.T) {
    m := NewModule()
    require.NoError(t, m.Init(context.Background()))
    require.NoError(t, m.Start(context.Background()))
    defer m.Stop(context.Background())

    appMux := http.NewServeMux()
    require.NoError(t, backendhost.MountNamespacedRoutes(appMux, m.Manifest().AppID, m.MountRoutes))

    // Verify the namespaced URL works
    req := httptest.NewRequest("GET", "/api/apps/my-app/items", nil)
    rec := httptest.NewRecorder()
    appMux.ServeHTTP(rec, req)
    assert.Equal(t, http.StatusOK, rec.Code)
}
```

### Reflection Test

```go
func TestReflection(t *testing.T) {
    m := NewModule()
    reflective, ok := backendhost.AppBackendModule(m).(backendhost.ReflectiveAppBackendModule)
    require.True(t, ok, "module should implement ReflectiveAppBackendModule")

    doc, err := reflective.Reflection(context.Background())
    require.NoError(t, err)
    assert.Equal(t, m.Manifest().AppID, doc.AppID)
    assert.NotEmpty(t, doc.APIs)
}
```

## Case Studies

### Inventory Backend

**App ID:** `inventory`. **Capabilities:** `chat`, `ws`, `timeline`, `profiles`, `confirm`, `docs`.

The inventory backend is the most full-featured module. It implements `backendcomponent.Component` (a different contract from `AppBackendModule`), and is adapted in `go-go-app-inventory/pkg/backendmodule/module.go`. The adapter delegates manifest, routes, lifecycle, and reflection to the underlying component.

Key patterns: webchat server integration for chat/WebSocket, tool registration for LLM-callable inventory operations, profile registry for multiple assistant personalities, SEM event mappings for hypercard timeline events (`hypercard_events.go`), runtime card composition from timeline context.

### GEPA Backend

**App ID:** `gepa`. **Capabilities:** `scripts`, `runs`, `timeline`, `reflection`, `docs`.

The GEPA module is a good model for a simpler backend that doesn't use chat/WebSocket. It exposes a script runner API with concurrency limits and timeouts. Routes include script listing, run creation/listing/status, and schema discovery. Reflection describes all APIs and schemas. The adapter in `wesen-os/pkg/gepa/module.go` is straightforward.

### ARC-AGI Backend

**App ID:** `arc-agi`. **Capabilities:** `games`, `sessions`, `actions`, `timeline`, `reflection`, `docs`.

The ARC module demonstrates config normalization (setting defaults for driver, runtime mode, API key, timeouts), conditional registration (`--arc-enabled` flag), and configurable reflection (`EnableReflection` config field). Its adapter in `wesen-os/pkg/arcagi/module.go` handles the conditional creation pattern.

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Hardcoding namespace prefix in MountRoutes | Double-prefixed URLs, all routes 404 | Register routes without `/api/apps/<id>` prefix |
| Health check always returns nil | Deployment errors hidden until user traffic | Verify DB handles, config state, worker liveness |
| App ID mismatch with frontend manifest | Frontend can't resolve API base, shows unknown module | Use identical string in both manifests |
| Forgetting to add module to composition list | Module invisible to the system | Add to `modules` slice before `NewModuleRegistry` |
| Missing `replace` directive in go.mod | Build fails with module not found | Add `replace` for local checkout |
| Forgetting to add to go.work | IDE can't resolve module, cross-module tests fail | Add `use` entry |

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| Compile error: does not implement AppBackendModule | Missing interface method | Add `var _ backendhost.AppBackendModule = (*Module)(nil)` |
| Duplicate app ID at startup | Collision with existing module | Choose unique app ID |
| Routes return 404 | Module not in composition, or prefix hardcoded | Add to `modules`, remove prefix from MountRoutes |
| Lifecycle startup fails | Init or Start returns error | Check logs for specific failure message |
| Reflection 404 | Module doesn't implement ReflectiveAppBackendModule | Add `Reflection(ctx)` method and interface assertion |
| Module not in `/api/os/apps` | Not registered in registry | Add to `modules` slice before `NewModuleRegistry` |
| Health check blocks startup | Module is required and Health returns error | Fix underlying issue or remove from `--required-apps` |
| `/api/apps/<id>/docs` returns 404 | Docs routes not mounted or module not documentable | Ensure `docmw.MountRoutes(...)` is called and `DocStore()` is exposed |
| `/api/apps/<id>/docs` returns 500 at startup | Malformed docs frontmatter (missing `Title`/`DocType`) | Fix frontmatter and re-run startup; keep parser validation errors actionable |
| Docs hint exists but docs list is empty unexpectedly | Embedded docs files missing or embed glob mismatch | Verify `//go:embed docs/*.md` path and that files exist in repo |
| Docs integration differs across repos | Cross-repo dependency/setup drift (`go.work`, `replace`, local checkout mismatch) | Align sibling repos, `go.work`, and `wesen-os/go.mod` replace directives before testing |

## See Also

- `wesen-os-guide` — Workspace setup, build pipeline, configuration reference
- `backend-documentation-system` — Structured docs system contracts, module authoring flow, and endpoint smoke checks
- `frontend-developer-guide` — Building the frontend side of your app
- `hypercard-environment-guide` — The HyperCard runtime, UI DSL, and sandboxed card system
- `building-a-full-app` — Complete backend+frontend integration walkthrough
