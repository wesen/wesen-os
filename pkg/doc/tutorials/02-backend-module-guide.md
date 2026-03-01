---
Title: Building a Backend Module
Slug: backend-module-guide
Short: Step-by-step guide for implementing a new backend app module, wiring it into the launcher composition, and verifying it works end-to-end.
Topics:
- backend
- modules
- go
- tutorial
Commands:
- wesen-os-launcher
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: Tutorial
---

This tutorial walks through building a new backend app module from scratch and integrating it into the wesen-os launcher. By the end you will have a working module with identity, routes, health checks, reflection, lifecycle integration, and tests.

## What You'll Build

A new backend module called `my-app` that:

- Registers with a unique app ID and capability list.
- Exposes HTTP routes under `/api/apps/my-app/`.
- Reports meaningful health status.
- Provides reflection metadata for API discovery.
- Passes lifecycle startup and integration tests.

## Prerequisites

- A running workspace (see `developer-onboarding`).
- Familiarity with Go HTTP handlers and interfaces.
- Understanding of the architecture (see `architecture-overview`).

## Step 1 — Define the Module Package

Create a new package in your app repository. The conventional location is `pkg/backendmodule/`.

```go
package backendmodule

import (
    "context"
    "net/http"
    "sync/atomic"

    "github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
)

// Module implements backendhost.AppBackendModule.
var _ backendhost.AppBackendModule = (*Module)(nil)

type Module struct {
    healthy atomic.Bool
}

func NewModule() *Module {
    return &Module{}
}
```

The `var _ backendhost.AppBackendModule = (*Module)(nil)` line is a compile-time check that your struct implements the interface. If you miss a method, the compiler tells you immediately instead of at runtime.

**Why start with the interface check:** In a large codebase with multiple module implementations, forgetting a method is easy. The compile-time check catches this before any test runs.

## Step 2 — Implement Manifest

The manifest declares your module's identity and capabilities. Choose your app ID carefully — it determines the URL namespace and must match the frontend module ID exactly.

```go
func (m *Module) Manifest() backendhost.Manifest {
    return backendhost.Manifest{
        AppID:       "my-app",
        Name:        "My App",
        Description: "A new application module for wesen-os.",
        Required:    false,
        Capabilities: []string{"api", "reflection"},
    }
}
```

**App ID rules:**

- Lowercase letters, digits, and hyphens only.
- Must pass `backendhost.ValidateAppID`.
- Must be unique across all registered modules.
- Must match the frontend `manifest.id` if you have a frontend module.

**Capabilities** are free-form strings that describe what the module offers. They appear in the `/api/os/apps` manifest endpoint and help frontend code decide how to interact with the module. Use specific, meaningful names like `scripts`, `timeline`, `chat` rather than generic ones like `data` or `features`.

## Step 3 — Implement Lifecycle Methods

The lifecycle manager calls these methods in order during startup:

```go
func (m *Module) Init(ctx context.Context) error {
    // Initialize resources: open DB connections, load config, validate state.
    // Return an error if initialization cannot proceed.
    return nil
}

func (m *Module) Start(ctx context.Context) error {
    // Start background workers, connect to external services, begin processing.
    // Called after Init succeeds.
    m.healthy.Store(true)
    return nil
}

func (m *Module) Stop(ctx context.Context) error {
    // Shut down gracefully: close connections, stop workers, flush buffers.
    // Called in reverse registration order during shutdown or rollback.
    m.healthy.Store(false)
    return nil
}

func (m *Module) Health(ctx context.Context) error {
    // Return nil if the module is ready to serve requests.
    // Return an error with a diagnostic message if something is wrong.
    if !m.healthy.Load() {
        return fmt.Errorf("my-app: not started or shutting down")
    }
    return nil
}
```

**Make health checks meaningful.** A health check that always returns nil hides deployment errors. Good health checks verify:

- Required database handles are available.
- Required configuration is loaded.
- External service connections are alive.
- Background workers are running.

**What happens if Init or Start fails:** The lifecycle manager calls `Stop` on all previously started modules in reverse order (rollback), then returns the error to the launcher. The launcher exits with the error message.

**What happens if Health fails for a required app:** If your module's `Manifest().Required` is true (or your app ID is in the `--required-apps` flag), a health failure during startup prevents the launcher from starting.

## Step 4 — Implement Routes

The `MountRoutes` method receives a `*http.ServeMux` that is already scoped to your app namespace. Register routes without any prefix — backendhost adds `/api/apps/my-app/` automatically.

```go
func (m *Module) MountRoutes(mux *http.ServeMux) error {
    mux.HandleFunc("GET /health", m.handleHealth)
    mux.HandleFunc("GET /items", m.handleListItems)
    mux.HandleFunc("POST /items", m.handleCreateItem)
    mux.HandleFunc("GET /items/{id}", m.handleGetItem)
    mux.HandleFunc("GET /schemas/", m.handleSchemas)
    return nil
}

func (m *Module) handleHealth(w http.ResponseWriter, r *http.Request) {
    if err := m.Health(r.Context()); err != nil {
        http.Error(w, err.Error(), http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write([]byte(`{"status":"ok"}`))
}

func (m *Module) handleListItems(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    _, _ = w.Write([]byte(`{"items":[]}`))
}

func (m *Module) handleCreateItem(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    _, _ = w.Write([]byte(`{"created":true}`))
}

func (m *Module) handleGetItem(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    w.Header().Set("Content-Type", "application/json")
    _, _ = fmt.Fprintf(w, `{"id":%q}`, id)
}

func (m *Module) handleSchemas(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    _, _ = w.Write([]byte(`{"schemas":[]}`))
}
```

**Effective URLs** for these routes (after backendhost namespace mounting):

```
GET  /api/apps/my-app/health
GET  /api/apps/my-app/items
POST /api/apps/my-app/items
GET  /api/apps/my-app/items/{id}
GET  /api/apps/my-app/schemas/
```

**What happens if you hardcode the prefix:** If you register `/api/apps/my-app/items` inside `MountRoutes`, the effective URL becomes `/api/apps/my-app/api/apps/my-app/items` (double-prefixed) and nothing works. This is the most common routing mistake.

## Step 5 — Add Reflection Support

Reflection makes your module's API discoverable without reading source code. Implement the optional `ReflectiveAppBackendModule` interface:

```go
var _ backendhost.ReflectiveAppBackendModule = (*Module)(nil)

func (m *Module) Reflection() *backendhost.ModuleReflectionDocument {
    return &backendhost.ModuleReflectionDocument{
        AppID:       "my-app",
        Name:        "My App",
        Description: "A new application module for wesen-os.",
        Capabilities: []backendhost.CapabilityDoc{
            {ID: "api", Stability: "stable"},
            {ID: "reflection", Stability: "stable"},
        },
        APIs: []backendhost.APIDoc{
            {ID: "list-items", Method: "GET", Path: "/api/apps/my-app/items"},
            {ID: "create-item", Method: "POST", Path: "/api/apps/my-app/items"},
            {ID: "get-item", Method: "GET", Path: "/api/apps/my-app/items/{id}"},
        },
        Schemas: []backendhost.SchemaDoc{
            {ID: "my-app.items.list.response.v1", Format: "json-schema"},
        },
    }
}
```

This document is served at `GET /api/os/apps/my-app/reflection` and powers the apps-browser debug tool in the launcher frontend.

**Why add reflection early:** Reflection documents accumulate during development. If you add them later, you have to reconstruct the full API surface from handlers. Starting with reflection keeps the documentation synchronized with the implementation.

## Step 6 — Wire into the Launcher Composition

### 6a. Create an adapter (if needed)

If your module's interface matches `backendhost.AppBackendModule` directly, no adapter is needed. If your module uses a different contract (like inventory's `backendcomponent.Component`), create a thin adapter in `wesen-os/pkg/<app>/module.go`:

```go
package myapp

import (
    "github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
    "github.com/go-go-golems/my-app-repo/pkg/backendmodule"
)

func NewModule(config Config) (backendhost.AppBackendModule, error) {
    return backendmodule.NewModule(), nil
}
```

### 6b. Register in main.go

Open `wesen-os/cmd/wesen-os-launcher/main.go` and add your module to the composition:

```go
// After GEPA module creation, before the modules slice:
myAppModule := myapp.NewModule()

modules := []backendhost.AppBackendModule{
    inventoryModule,
    gepaModule,
    myAppModule,  // Add your module here
}
```

The module is now part of the registry. The existing loop in `RunIntoWriter` mounts its namespaced routes and includes it in the manifest endpoint automatically.

### 6c. Update go.mod

If your module lives in a separate repository, add a `replace` directive in `wesen-os/go.mod`:

```
replace github.com/go-go-golems/my-app-repo => ../my-app-repo
```

And add the directory to the root `go.work` file.

## Step 7 — Write Tests

### Manifest contract test

Verify your manifest returns valid data:

```go
func TestModuleManifest(t *testing.T) {
    m := NewModule()
    manifest := m.Manifest()
    assert.Equal(t, "my-app", manifest.AppID)
    assert.NotEmpty(t, manifest.Name)
    assert.NotEmpty(t, manifest.Capabilities)
}
```

### Route method validation

Verify routes respond to expected methods:

```go
func TestRoutes(t *testing.T) {
    m := NewModule()
    _ = m.Init(context.Background())
    _ = m.Start(context.Background())
    defer m.Stop(context.Background())

    mux := http.NewServeMux()
    err := m.MountRoutes(mux)
    require.NoError(t, err)

    // Test GET /items
    req := httptest.NewRequest("GET", "/items", nil)
    rec := httptest.NewRecorder()
    mux.ServeHTTP(rec, req)
    assert.Equal(t, http.StatusOK, rec.Code)
}
```

### Health check test

```go
func TestHealth(t *testing.T) {
    m := NewModule()

    // Before start: should be unhealthy
    err := m.Health(context.Background())
    assert.Error(t, err)

    // After start: should be healthy
    _ = m.Init(context.Background())
    _ = m.Start(context.Background())
    err = m.Health(context.Background())
    assert.NoError(t, err)

    // After stop: should be unhealthy
    _ = m.Stop(context.Background())
    err = m.Health(context.Background())
    assert.Error(t, err)
}
```

### Namespaced mount test

Verify routes work through the backendhost namespace layer:

```go
func TestNamespacedRoutes(t *testing.T) {
    m := NewModule()
    _ = m.Init(context.Background())
    _ = m.Start(context.Background())
    defer m.Stop(context.Background())

    appMux := http.NewServeMux()
    err := backendhost.MountNamespacedRoutes(appMux, m.Manifest().AppID, m.MountRoutes)
    require.NoError(t, err)

    req := httptest.NewRequest("GET", "/api/apps/my-app/items", nil)
    rec := httptest.NewRecorder()
    appMux.ServeHTTP(rec, req)
    assert.Equal(t, http.StatusOK, rec.Code)
}
```

## Step 8 — Verify End-to-End

Start the launcher with your new module:

```bash
cd wesen-os
go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091
```

Then verify:

```bash
# Module appears in manifest
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | select(.app_id=="my-app")'

# Reflection is available
curl -sS http://127.0.0.1:8091/api/os/apps/my-app/reflection | jq .

# Routes respond
curl -sS http://127.0.0.1:8091/api/apps/my-app/items | jq .
curl -sS http://127.0.0.1:8091/api/apps/my-app/health
```

## Complete File List

For a minimal new backend module, you need these files:

| File | Purpose |
|---|---|
| `pkg/backendmodule/module.go` | Module struct, manifest, lifecycle, health |
| `pkg/backendmodule/routes.go` | HTTP handler registration and implementations |
| `pkg/backendmodule/contracts.go` | Request/response DTOs |
| `pkg/backendmodule/reflection.go` | Reflection document |
| `pkg/backendmodule/module_test.go` | Contract, route, health, and namespace tests |
| `wesen-os/pkg/<app>/module.go` | Adapter (if needed) |
| `wesen-os/cmd/wesen-os-launcher/main.go` | Registration in composition list |

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| Compile error: does not implement `AppBackendModule` | Missing interface method | Add the missing method; check the `var _` line |
| Duplicate app ID at startup | Another module uses the same ID | Choose a unique app ID |
| Routes return 404 | Module not in `modules` slice, or routes have hardcoded prefix | Add module to composition and remove prefix from `MountRoutes` |
| Health check always passes | `Health()` returns nil unconditionally | Add real checks for DB, config, worker status |
| Reflection endpoint missing | Module doesn't implement `ReflectiveAppBackendModule` | Add `Reflection()` method and interface assertion |
| Module not in `/api/os/apps` | Module not registered in registry | Add to `modules` slice before `NewModuleRegistry` call |

## See Also

- `architecture-overview` — System topology and module boundaries
- `api-reference` — Endpoint catalog and namespace conventions
- `build-and-package` — How to build and ship the launcher binary with your module
- `troubleshooting` — Debugging guide for common issues
- `glossary` — Definitions for AppBackendModule, Manifest, Lifecycle Manager, and related terms
