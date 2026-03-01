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

This guide covers everything a Go developer needs to build, test, and integrate a backend app module into the wesen-os launcher. It starts with getting started basics and builds to the full contract reference, with concrete examples drawn from the inventory, GEPA, and ARC-AGI modules.

For frontend module development, see `frontend-developer-guide`. For building a complete app with both backend and frontend, see `building-a-full-app`. For workspace setup and operations, see `wesen-os-guide`.

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
| inventory | `chat`, `ws`, `timeline`, `profiles`, `confirm` |
| gepa | `scripts`, `runs`, `timeline`, `reflection` |
| arc-agi | `games`, `sessions`, `actions`, `timeline`, `reflection` |

### Lifecycle: Init, Start, Stop, Health

The lifecycle manager calls these methods in a specific order with defined rollback behavior.

**Init(ctx)** — Allocate resources: open database connections, load configuration files, validate prerequisites, parse embedded assets. Return an error to abort startup. Called once before `Start`. If `Init` fails, `Stop` is called on all previously started modules in reverse order.

**Start(ctx)** — Begin serving: start background workers, connect to external services, begin processing queues. Called after `Init` succeeds. The module is added to the started list for rollback. If `Start` fails, the same reverse-order `Stop` rollback happens.

**Stop(ctx)** — Graceful shutdown: close database connections, stop background workers, flush buffers, release resources. Called in reverse registration order during normal shutdown or startup rollback. Should be idempotent — calling `Stop` on a module that was never started should not panic.

**Health(ctx)** — Return nil if the module is ready to serve requests. Return an error with a diagnostic message if something is wrong. Called after all modules are started, but only checked for required modules.

**Make health checks meaningful.** A health check that always returns nil hides deployment errors that surface only after user traffic arrives. Good health checks verify:

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

If your module uses a different internal contract, create a thin adapter in `wesen-os/pkg/<app>/module.go`. This is how the three existing apps integrate:

- **Inventory**: `wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go` wraps `backendcomponent.Component` into `AppBackendModule`.
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

All app routes are mounted under `/api/apps/<app-id>/` using `MountNamespacedRoutes` from `go-go-os-backend/pkg/backendhost/routes.go`.

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

**App ID:** `inventory`. **Capabilities:** `chat`, `ws`, `timeline`, `profiles`, `confirm`.

The inventory backend is the most full-featured module. It implements `backendcomponent.Component` (a different contract from `AppBackendModule`), which is wrapped by an adapter in `wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go`. The adapter delegates manifest, routes, lifecycle, and reflection to the underlying component.

Key patterns: webchat server integration for chat/WebSocket, tool registration for LLM-callable inventory operations, profile registry for multiple assistant personalities, SEM event mappings for hypercard timeline events (`hypercard_events.go`), runtime card composition from timeline context.

### GEPA Backend

**App ID:** `gepa`. **Capabilities:** `scripts`, `runs`, `timeline`, `reflection`.

The GEPA module is a good model for a simpler backend that doesn't use chat/WebSocket. It exposes a script runner API with concurrency limits and timeouts. Routes include script listing, run creation/listing/status, and schema discovery. Reflection describes all APIs and schemas. The adapter in `wesen-os/pkg/gepa/module.go` is straightforward.

### ARC-AGI Backend

**App ID:** `arc-agi`. **Capabilities:** `games`, `sessions`, `actions`, `timeline`, `reflection`.

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

## See Also

- `wesen-os-guide` — Workspace setup, build pipeline, configuration reference
- `frontend-developer-guide` — Building the frontend side of your app
- `building-a-full-app` — Complete backend+frontend integration walkthrough
