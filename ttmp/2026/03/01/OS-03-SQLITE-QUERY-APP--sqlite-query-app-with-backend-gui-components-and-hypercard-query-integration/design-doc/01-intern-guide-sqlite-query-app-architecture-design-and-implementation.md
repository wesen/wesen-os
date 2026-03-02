---
Title: 'Intern Guide: SQLite Query App Architecture, Design, and Implementation'
Ticket: OS-03-SQLITE-QUERY-APP
Status: active
Topics:
    - backend
    - frontend
    - documentation
    - reflection
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/domain/stack.ts
      Note: Reference HyperCard stack capability declaration pattern for domain/system intents.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/launcher/module.tsx
      Note: Reference launcher module composition and API base resolution behavior.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/backendcomponent/component.go
      Note: Reference backend component route mounting and manifest strategy.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/inventorydb/store.go
      Note: SQLite store patterns used as reference for new query service design.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/manifest_endpoint.go
      Note: Manifest and reflection endpoint behavior used for app discovery.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/module.go
      Note: Canonical backend module and reflection contracts referenced by the design.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/routes.go
      Note: App ID validation and namespaced route mounting rules.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts
      Note: Frontend module contract for launcher integration.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/runtime/buildLauncherContributions.ts
      Note: Auto launch command and icon contribution behavior.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js
      Note: VM dispatch APIs including dispatchDomainAction used by HyperCards.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/PluginCardSessionHost.tsx
      Note: Runtime host lifecycle and global state projection for cards.
    - Path: workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/pluginIntentRouting.ts
      Note: Domain intent to Redux action mapping and capability enforcement.
    - Path: workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/src/App.tsx
      Note: Launcher host context with resolveApiBase/resolveWsBase for app modules.
    - Path: workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/src/app/modules.tsx
      Note: Current launcher module registry list where sqlite-query module will be added.
    - Path: workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/src/app/store.ts
      Note: Shared reducer registration point for new app state slices.
    - Path: workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/vite.config.ts
      Note: Alias/proxy wiring pattern needed for new app frontend package.
    - Path: workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main.go
      Note: Composition root showing module registration
ExternalSources: []
Summary: Detailed intern-facing architecture, design, and implementation guide for building a SQLite query app with backend APIs, launcher UI, and HyperCard query intent integration.
LastUpdated: 2026-03-01T13:45:00-05:00
WhatFor: Provide a complete execution manual for implementing a new SQLite query app in the go-go-os/wesen-os composition ecosystem.
WhenToUse: Use this document when designing and implementing the SQLite query app and when onboarding engineers new to the architecture.
---


# Intern Guide: SQLite Query App Architecture, Design, and Implementation

## Executive Summary

This document is a complete implementation guide for adding a new SQLite query app to the `wesen-os` composition runtime. The target outcome is an app that:

1. Exposes backend HTTP APIs for querying a SQLite database.
2. Provides graphical query components in the launcher UI.
3. Exposes query functionality to HyperCard cards through runtime domain intents.

The architecture already supports this pattern. The backend side is built around `AppBackendModule` contracts and namespaced routes (`/api/apps/<app-id>/...`), while the frontend side is built around `LaunchableAppModule` contracts and registry/store composition. HyperCard runtime cards run in a sandbox and communicate through `dispatchDomainAction`, which is mapped to Redux actions and then to app logic.

This guide is intentionally detailed for an intern who has never worked in this codebase. It includes:

- system diagrams,
- file-by-file integration points,
- concrete API contracts,
- pseudocode,
- phased implementation plan,
- test and validation playbooks,
- risks and alternatives.

## Problem Statement and Scope

### Problem

We need a new app module that allows users (and HyperCard cards) to run controlled SQLite queries and inspect results in a desktop-style launcher environment.

Current system strengths:

- backend module composition and lifecycle are already standardized,
- frontend launcher registration is standardized,
- HyperCard runtime already supports domain intents and capability policy,
- inventory app demonstrates a full-stack reference for SQLite + frontend + HyperCard flows.

Current gap:

- no dedicated general SQLite query app with its own backend module, graphical query tooling, and HyperCard-exposed query commands.

### Scope

In scope:

1. New backend app module for SQLite querying.
2. New frontend launcher app module and window components.
3. HyperCard integration path for query requests via domain intents.
4. Composition wiring into `wesen-os` launcher runtime.
5. Tests and validation workflow.

Out of scope for first iteration:

1. Cross-database support (Postgres/MySQL).
2. Multi-tenant auth model.
3. Full SQL IDE feature set.
4. Write-enabled SQL in v1 (unless explicitly approved).

## Glossary

- `App ID`: canonical module identity string (example: `sqlite-query`) used across backend, frontend, and routing.
- `Backend module`: Go implementation of `AppBackendModule` mounted under `/api/apps/<app-id>/`.
- `Launcher module`: TypeScript `LaunchableAppModule` that defines icon, windows, and contributions.
- `HyperCard intent`: structured action emitted by sandbox card runtime (`card`, `session`, `domain`, `system`).
- `Domain intent`: HyperCard intent that maps to Redux action type `<domain>/<actionType>`.
- `Reflection`: discoverable API metadata under `/api/os/apps/<app-id>/reflection`.

## Current-State Architecture (Evidence-Based)

### 1. Composition runtime in wesen-os

The launcher entrypoint builds composed modules and mounts namespaced routes:

- Inventory SQLite initialization and migration in launcher startup:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main.go:119`
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main.go:129`
- Module registry construction and lifecycle startup:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main.go:257`
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main.go:265`
- Namespaced route mounting for each module:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main.go:276`
- App manifest endpoint registration:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main.go:273`

ASCII flow:

```text
Browser
  |
  +--> GET /api/os/apps ------------------> backendhost manifest endpoint
  |
  +--> GET /api/apps/<app-id>/... --------> mounted module routes
  |
  +--> GET / (other paths) ---------------> launcherui SPA fallback
```

### 2. Backend host contracts and guarantees

Backend module interface contract:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/module.go:18`

Key guarantees:

1. App ID validation regex and prefixing:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/routes.go:10`
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/routes.go:34`
2. Route mounting under `/api/apps/<app-id>/`:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/routes.go:37`
3. Duplicate app ID rejection in registry:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/registry.go:29`
4. Lifecycle startup ordering with rollback on failures:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/lifecycle.go:34`
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/lifecycle.go:44`
5. Manifest + optional reflection endpoint shape:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/manifest_endpoint.go:35`
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/manifest_endpoint.go:70`

### 3. Frontend launcher contracts and runtime wiring

Launcher module contract:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts:22`

Important frontend invariants:

1. App ID validation and state key validation:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/contracts/appManifest.ts:45`
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/contracts/appManifest.ts:49`
2. Registry sorts modules and enforces unique IDs/state keys:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/registry/createAppRegistry.ts:22`
3. `resolveApiBase` and `resolveWsBase` provided by host context:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/contracts/launcherHostContext.ts:8`
4. App window rendering resolves app key -> module -> `renderWindow`:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/runtime/renderAppWindow.ts:14`
5. Launcher contributions auto-create icon launch commands:
   - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/runtime/buildLauncherContributions.ts:44`

### 4. HyperCard intent model and domain action bridge

Runtime host loads bundle and renders cards:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/PluginCardSessionHost.tsx:73`

Intent dispatch primitives inside VM bootstrap:

- `dispatchDomainAction(domain, actionType, payload)` emitted as `scope: 'domain'`:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js:236`

Intent router maps domain intent to Redux action:

- `type: "${intent.domain}/${intent.actionType}"`:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/pluginIntentRouting.ts:69`

Capability gating:

- domain and system authorization policy:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/features/pluginCardRuntime/capabilityPolicy.ts:41`

### 5. Inventory reference implementation (closest pattern)

Inventory backend component exposes API/chat/ws/timeline routes:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/backendcomponent/component.go:112`

Inventory SQLite implementation patterns:

- SQLite DSN with WAL and foreign keys:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/inventorydb/store.go:34`
- Migrations and seed transactions:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/inventorydb/store.go:53`

Inventory frontend launcher module wiring:

- manifest + state + launch + contributions + render:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/launcher/module.tsx:31`

Inventory HyperCard capability declaration:

- stack plugin capabilities domain/system:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/domain/stack.ts:40`

## Gap Analysis for Requested SQLite Query App

Required by user:

1. Expose querying a DB via backend app.
2. Provide graphical components.
3. Expose query function to HyperCards.

What exists now:

1. Platform contracts and runtime mechanisms already exist.
2. No dedicated `sqlite-query` app module in launcher module list.
3. No dedicated query UI app/window in `wesen-os` launcher modules.
4. HyperCard can dispatch domain intents, but no query-domain reducer/thunk path exists for a new app yet.

Conclusion:

- This is mostly an integration and implementation effort, not a platform rewrite.
- Reusing inventory patterns is the fastest, lowest-risk path.

## Proposed Solution

### Architecture Decision

Create a new app repository (recommended) named `go-go-app-sqlite-query` with both backend and frontend modules, then compose it into `wesen-os`.

Why this is recommended:

1. Matches existing ownership boundaries in `wesen-os` and `go-go-app-inventory` READMEs.
2. Keeps domain logic isolated from composition runtime.
3. Makes future extraction/versioning cleaner.

Alternative (faster but less clean): implement module directly inside `wesen-os`. This is acceptable for prototype-only scope, but not recommended for long-term ownership.

### Target Runtime Diagram

```text
+-----------------------------------------------------------------------+
|                           wesen-os launcher                           |
|                                                                       |
|  /api/os/apps  (manifest + reflection links)                          |
|  /api/apps/inventory/...                                               |
|  /api/apps/gepa/...                                                    |
|  /api/apps/arc-agi/...                                                 |
|  /api/apps/sqlite-query/...    <--- NEW                               |
|                                                                       |
|  SPA shell with launcher modules: inventory, arc, ..., sqlite-query   |
+---------------------------+-------------------------------------------+
                            |
                            v
                    +-------------------+
                    | sqlite-query app  |
                    | backend + frontend|
                    +---------+---------+
                              |
        +---------------------+----------------------+
        |                                            |
        v                                            v
 SQLite backend API                          HyperCard cards
 (query/schema/saved)                        dispatchDomainAction(...)
        |                                            |
        +-----------------> Redux action bridge <----+
                          type: sqliteQuery/runQuery
```

### Functional Components

1. Backend API service (Go):
   - controlled SQL query execution,
   - schema introspection,
   - saved query CRUD,
   - reflection documents.
2. Frontend launcher app (TypeScript/React):
   - query editor,
   - result grid,
   - schema browser,
   - saved query panel.
3. HyperCard integration:
   - domain action handlers to request queries,
   - capability policy restricting allowed domains/system commands,
   - result projection into card/session/global state.

## API Reference (Proposed v1)

All endpoints are namespaced under `/api/apps/sqlite-query`.

### 1. Query execution

`POST /api/apps/sqlite-query/query`

Request:

```json
{
  "statement": "SELECT sku, name, qty FROM items WHERE qty < ? ORDER BY qty ASC LIMIT ?",
  "params": [5, 50],
  "read_only": true,
  "timeout_ms": 2000
}
```

Response:

```json
{
  "columns": [
    {"name": "sku", "type": "TEXT"},
    {"name": "name", "type": "TEXT"},
    {"name": "qty", "type": "INTEGER"}
  ],
  "rows": [
    ["SKU-001", "Widget A", 2],
    ["SKU-009", "Widget Z", 3]
  ],
  "row_count": 2,
  "elapsed_ms": 7,
  "truncated": false
}
```

### 2. Query plan

`POST /api/apps/sqlite-query/explain`

Request:

```json
{
  "statement": "SELECT * FROM items WHERE sku = ?",
  "params": ["SKU-001"]
}
```

Response:

```json
{
  "plan": [
    "SEARCH items USING INDEX sqlite_autoindex_items_1 (sku=?)"
  ]
}
```

### 3. Schema

`GET /api/apps/sqlite-query/schema`

Response:

```json
{
  "tables": [
    {
      "name": "items",
      "columns": [
        {"name": "sku", "type": "TEXT", "pk": true},
        {"name": "name", "type": "TEXT", "pk": false}
      ],
      "indexes": ["idx_items_qty"]
    }
  ]
}
```

### 4. Health

`GET /api/apps/sqlite-query/health`

Response:

```json
{"status":"ok"}
```

### 5. Saved queries

- `GET /api/apps/sqlite-query/saved-queries`
- `POST /api/apps/sqlite-query/saved-queries`
- `DELETE /api/apps/sqlite-query/saved-queries/{id}`

## Backend Design

### Package layout (new repo recommended)

```text
go-go-app-sqlite-query/
  pkg/sqlitedb/
    store.go
    models.go
    migrate.go
    seed.go
  pkg/sqlitetools/
    tools.go
  pkg/backendcomponent/
    component.go
    reflection.go
    component_test.go
  apps/sqlite-query/
    src/...
```

### Core backend interfaces

Implement contract compatible with backend host:

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

Reference:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/module.go:18`

### Query policy (v1)

Security posture for intern implementation:

1. Read-only by default.
2. Reject multiple statements (`;` disallowed except trailing whitespace use case if parser supports).
3. Allow only `SELECT`, `WITH`, and `EXPLAIN QUERY PLAN` for v1.
4. Require `LIMIT` or enforce server max rows (for example 500).
5. Hard timeout on query execution.

Pseudocode:

```go
func (s *Store) Query(ctx context.Context, statement string, params []any, opts QueryOptions) (QueryResult, error) {
    stmt := strings.TrimSpace(statement)
    if stmt == "" {
        return QueryResult{}, errors.New("statement is required")
    }

    if !isAllowedReadOnlyStatement(stmt) {
        return QueryResult{}, errors.New("statement not allowed in read-only mode")
    }

    if containsMultipleStatements(stmt) {
        return QueryResult{}, errors.New("multiple statements are not allowed")
    }

    ctx, cancel := context.WithTimeout(ctx, opts.Timeout)
    defer cancel()

    rows, err := s.db.QueryContext(ctx, stmt, params...)
    if err != nil {
        return QueryResult{}, errors.Wrap(err, "execute query")
    }
    defer rows.Close()

    cols, err := rows.Columns()
    if err != nil {
        return QueryResult{}, errors.Wrap(err, "columns")
    }

    result := scanRowsWithLimit(rows, cols, opts.MaxRows)
    return result, nil
}
```

### Reflection document

Expose machine-readable API references using `ReflectiveAppBackendModule`:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/module.go:29`

Pseudocode:

```go
func (m *Module) Reflection(ctx context.Context) (*backendhost.ModuleReflectionDocument, error) {
    return &backendhost.ModuleReflectionDocument{
        AppID:   "sqlite-query",
        Name:    "SQLite Query",
        Version: "v1",
        Summary: "Read-only SQLite query module with schema and saved query APIs.",
        APIs: []backendhost.ReflectionAPI{
            {ID: "query", Method: "POST", Path: "/api/apps/sqlite-query/query"},
            {ID: "schema", Method: "GET", Path: "/api/apps/sqlite-query/schema"},
        },
        Schemas: []backendhost.ReflectionSchemaRef{
            {ID: "sqlite-query.query.request.v1", Format: "json-schema", URI: "/api/apps/sqlite-query/schemas/sqlite-query.query.request.v1"},
        },
    }, nil
}
```

## Frontend Design

### Launcher module contract

Implement `LaunchableAppModule`:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts:22`

Recommended manifest:

```ts
manifest: {
  id: 'sqlite-query',
  name: 'SQLite Query',
  icon: '🗄️',
  launch: { mode: 'window' },
  desktop: { order: 15 },
}
```

### UI window composition

Minimum v1 windows:

1. Main query window (`instanceId: folder` or `main`):
   - SQL editor text area,
   - run button,
   - rows/elapsed summary,
   - result table.
2. Schema window:
   - table list and columns.
3. Saved queries window (optional in v1 if time constrained).
4. HyperCard runtime debug window (recommended for development).

### Data flow model

```text
User types SQL -> clicks Run
    -> dispatch sqliteQuery/runQueryRequested
    -> async thunk calls POST /api/apps/sqlite-query/query
    -> success dispatch sqliteQuery/runQuerySucceeded
    -> reducers update result state
    -> table component rerenders
```

### State slices (recommended)

- `sqliteQuery`:
  - editorText,
  - isRunning,
  - lastError,
  - result columns/rows,
  - elapsedMs,
  - history.
- `sqliteSchema`:
  - schema cache,
  - loading/error.

## HyperCard Integration Design

### Principle

Cards must not call backend directly. Cards emit intents; host/router maps them to Redux actions and system actions.

Evidence:

- VM creates domain intents via `dispatchDomainAction(...)`:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js:236`
- Host maps domain intent to Redux action type `<domain>/<actionType>`:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/pluginIntentRouting.ts:69`

### Proposed domain contract for sqlite query cards

Use domain `sqliteQuery`.

Allowed actions:

1. `sqliteQuery/runQueryRequest`
2. `sqliteQuery/loadSchemaRequest`
3. `sqliteQuery/selectSavedQuery`

Card handler pseudocode:

```js
handlers: {
  run({ cardState, dispatchDomainAction }) {
    dispatchDomainAction('sqliteQuery', 'runQueryRequest', {
      statement: cardState.statement,
      params: cardState.params || [],
    });
  },
}
```

Redux middleware/thunk pseudocode:

```ts
if (action.type === 'sqliteQuery/runQueryRequest') {
  dispatch(sqliteQueryActions.runStarted());
  try {
    const res = await fetch('/api/apps/sqlite-query/query', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(action.payload),
    });
    const data = await res.json();
    dispatch(sqliteQueryActions.runSucceeded(data));
  } catch (err) {
    dispatch(sqliteQueryActions.runFailed(String(err)));
  }
}
```

### Capability policy

Declare stack plugin capabilities to restrict card authority:

```ts
plugin: {
  bundleCode: SQLITE_QUERY_PLUGIN_BUNDLE,
  capabilities: {
    domain: ['sqliteQuery'],
    system: ['nav.go', 'nav.back', 'notify', 'window.close'],
  },
}
```

Reasoning:

- prevents cards from dispatching arbitrary domain actions,
- allows only navigation/toast/window-close system commands.

## File-by-File Implementation Plan

### Phase 0: Repository scaffold

1. Create repository `go-go-app-sqlite-query`.
2. Add Go module and npm workspace shape matching `go-go-app-inventory`.

Files:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-sqlite-query/go.mod` (new)
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-sqlite-query/package.json` (new)
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-sqlite-query/apps/sqlite-query/package.json` (new)

### Phase 1: SQLite store package

Implement store with migration and query methods.

Files:

- `go-go-app-sqlite-query/pkg/sqlitedb/store.go`
- `go-go-app-sqlite-query/pkg/sqlitedb/models.go`
- `go-go-app-sqlite-query/pkg/sqlitedb/seed.go`
- `go-go-app-sqlite-query/pkg/sqlitedb/store_test.go`

Borrow patterns from:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/inventorydb/store.go`

### Phase 2: Backend component module

Implement backend component and reflection.

Files:

- `go-go-app-sqlite-query/pkg/backendcomponent/component.go`
- `go-go-app-sqlite-query/pkg/backendcomponent/reflection.go`
- `go-go-app-sqlite-query/pkg/backendcomponent/component_test.go`

### Phase 3: Optional query tools for chat runtime

If we need tool exposure to chat assistant in v1:

Files:

- `go-go-app-sqlite-query/pkg/sqlitetools/tools.go`
- `go-go-app-sqlite-query/pkg/sqlitetools/tools_test.go`

Reference for tool registration style:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/inventorytools/tools.go`

### Phase 4: Frontend app and launcher module

Files:

- `go-go-app-sqlite-query/apps/sqlite-query/src/launcher/module.tsx`
- `go-go-app-sqlite-query/apps/sqlite-query/src/launcher/renderSqliteQueryApp.tsx`
- `go-go-app-sqlite-query/apps/sqlite-query/src/features/sqliteQuery/sqliteQuerySlice.ts`
- `go-go-app-sqlite-query/apps/sqlite-query/src/reducers.ts`
- `go-go-app-sqlite-query/apps/sqlite-query/src/domain/stack.ts`
- `go-go-app-sqlite-query/apps/sqlite-query/src/domain/pluginBundle.vm.js`

### Phase 5: Compose into wesen-os backend

Files in `wesen-os`:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main.go`
  - add flags for sqlite-query DB path and seed behavior,
  - initialize store,
  - register module in `modules` slice.
- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/sqlite_query_backend_module.go` (new wrapper file, similar to inventory wrapper).

### Phase 6: Compose into wesen-os frontend launcher

Files in `wesen-os`:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/vite.config.ts`
  - add aliases for `@hypercard/sqlite-query`, `@hypercard/sqlite-query/launcher`, and reducers export,
  - add proxy routes for `/api/apps/sqlite-query/...`.
- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/src/app/modules.tsx`
  - add module to `launcherModules` array.
- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/src/app/store.ts`
  - register shared reducers for `sqliteQuery`/`sqliteSchema` if needed by runtime projections.

### Phase 7: Workspace wiring

- Update workspace module references:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go.work`
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/go.mod` (`replace` lines)

### Phase 8: Tests and smoke validation

1. Backend contract tests.
2. Frontend launcher module tests.
3. Integration test in `wesen-os/cmd/wesen-os-launcher/main_integration_test.go` style for:
   - `/api/os/apps` includes `sqlite-query`,
   - query endpoint works,
   - reflection endpoint works.
4. Launcher smoke script check.

## Detailed Pseudocode

### Backend module construction in launcher

```go
sqliteDB, err := sqlitedb.Open(cfg.SQLiteQueryDB)
if err != nil { return errors.Wrap(err, "open sqlite-query db") }
if err := sqlitedb.Migrate(sqliteDB); err != nil { return errors.Wrap(err, "migrate sqlite-query db") }
store, err := sqlitedb.NewStore(sqliteDB)
if err != nil { return errors.Wrap(err, "create sqlite-query store") }

sqliteModule := newSQLiteQueryBackendModule(store /* + runtime deps if needed */)

modules := []backendhost.AppBackendModule{
    inventoryModule,
    gepaModule,
    sqliteModule,
}
```

### Frontend module registration

```ts
import { sqliteQueryLauncherModule } from '@hypercard/sqlite-query/launcher';

export const launcherModules: LaunchableAppModule[] = [
  inventoryLauncherModule,
  sqliteQueryLauncherModule,
  // ...
];
```

### Query thunk + reducer

```ts
export const runQuery = createAsyncThunk('sqliteQuery/runQuery', async (payload: RunQueryInput) => {
  const res = await fetch('/api/apps/sqlite-query/query', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as RunQueryOutput;
});

const sqliteQuerySlice = createSlice({
  name: 'sqliteQuery',
  initialState,
  reducers: {
    setEditorText(state, action) { state.editorText = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runQuery.pending, (state) => { state.isRunning = true; state.lastError = null; })
      .addCase(runQuery.fulfilled, (state, action) => {
        state.isRunning = false;
        state.lastResult = action.payload;
      })
      .addCase(runQuery.rejected, (state, action) => {
        state.isRunning = false;
        state.lastError = String(action.error.message ?? 'query failed');
      });
  },
});
```

### HyperCard query card handler

```js
defineCard('queryRunner', {
  render({ cardState, globalState }) {
    const last = globalState?.domains?.sqliteQuery?.lastResult;
    return ui.panel([
      ui.text('SQLite Query Runner'),
      ui.input(cardState.statement || 'SELECT * FROM items LIMIT 20', {
        onChange: { handler: 'setStatement' },
      }),
      ui.button('Run', { onClick: { handler: 'run' }, variant: 'primary' }),
      ui.text(last ? ('Rows: ' + String(last.row_count || 0)) : 'No results yet'),
    ]);
  },
  handlers: {
    setStatement({ dispatchCardAction }, args) {
      dispatchCardAction('patch', { statement: String(args?.value || '') });
    },
    run({ cardState, dispatchDomainAction }) {
      dispatchDomainAction('sqliteQuery', 'runQueryRequest', {
        statement: cardState.statement,
        params: [],
        read_only: true,
      });
    },
  },
});
```

## Sequence Diagrams

### Sequence A: Query from graphical UI

```text
User -> QueryWindow: click Run
QueryWindow -> Redux: dispatch sqliteQuery/runQuery (thunk)
Redux thunk -> Backend API: POST /api/apps/sqlite-query/query
Backend API -> SQLite Store: execute validated read-only statement
SQLite Store -> Backend API: rows + metadata
Backend API -> Redux thunk: JSON result
Redux thunk -> Redux store: runQuery/fulfilled
Redux store -> QueryWindow: rerender table
```

### Sequence B: Query from HyperCard

```text
User -> PluginCardRenderer: click Run button
PluginCardRenderer -> PluginCardSessionHost: emit event("run")
PluginCardSessionHost -> QuickJS runtime: eventCard(...)
QuickJS runtime -> Host: [{scope:"domain", domain:"sqliteQuery", actionType:"runQueryRequest", ...}]
Host intent router -> Redux: dispatch {type:"sqliteQuery/runQueryRequest", payload:...}
Redux middleware/thunk -> Backend API: POST /api/apps/sqlite-query/query
Backend API -> Redux: result actions
Redux projected domains -> PluginCardSessionHost: globalState.domains updated
PluginCardSessionHost -> QuickJS runtime: renderCard(...new global state...)
```

## Testing and Validation Strategy

### Backend tests

1. `TestManifest_ValidAppIDAndCapabilities`
2. `TestMountRoutes_QueryEndpoint`
3. `TestQuery_ReadOnlyRejectsWriteStatements`
4. `TestQuery_RespectsRowLimit`
5. `TestReflection_IncludesQueryAndSchemaRoutes`

### Frontend tests

1. launcher module manifest/registration test.
2. query window render and dispatch test.
3. reducer/thunk tests for success and failure.
4. HyperCard session host integration test with domain intent path.

### Integration tests in wesen-os

Add tests similar to existing integration patterns:

- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main_integration_test.go:137`

Assertions:

1. `/api/os/apps` contains `sqlite-query`.
2. `/api/apps/sqlite-query/health` returns 200.
3. `/api/apps/sqlite-query/query` returns rows for seed DB.
4. `/api/os/apps/sqlite-query/reflection` returns expected APIs.

### Manual validation playbook

```bash
# from wesen-os
npm run launcher:binary:build
./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091

# verify module registration
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | .app_id'

# verify query endpoint
curl -sS -X POST http://127.0.0.1:8091/api/apps/sqlite-query/query \
  -H 'content-type: application/json' \
  -d '{"statement":"SELECT name FROM sqlite_master WHERE type=\"table\" LIMIT 20","params":[],"read_only":true}' | jq .
```

## Risks and Mitigations

### Risk 1: SQL safety and runaway queries

Mitigations:

1. read-only statement policy in v1,
2. server-side max row cap,
3. timeout with context cancellation,
4. statement normalization and multi-statement rejection,
5. optional allow-list by table prefix if needed.

### Risk 2: App ID drift between backend and frontend

Mitigations:

1. use shared constant for `AppID` in backend component,
2. enforce frontend `manifest.id === 'sqlite-query'`,
3. integration test validates module appears in `/api/os/apps` and routes resolve.

### Risk 3: HyperCard action mismatch

Mitigations:

1. document canonical domain string (`sqliteQuery`),
2. keep action names in one exported constants file,
3. add tests asserting card-dispatched intent reaches expected reducer/thunk.

### Risk 4: Composition complexity across repos

Mitigations:

1. phase-by-phase checklist (below),
2. explicit `go.work` and Vite alias updates,
3. smoke script extension for sqlite-query routes.

## Alternatives Considered

### Alternative A: Build inside wesen-os only

Pros:

- fastest initial implementation.

Cons:

- weak ownership boundaries,
- harder reuse and testing isolation,
- diverges from split-repo app model.

Decision: not recommended except for short-lived prototype.

### Alternative B: Expose direct SQL execution to HyperCard VM (no Redux bridge)

Pros:

- fewer frontend layers.

Cons:

- breaks sandbox architecture principle,
- bypasses capability policy and centralized logging,
- harder to test and secure.

Decision: reject.

### Alternative C: Write-enabled SQL in v1

Pros:

- more powerful immediately.

Cons:

- significantly higher blast radius,
- permission and audit model needed first.

Decision: reject for v1; consider v2 after policy and auth gates.

## Implementation Checklist (Intern-Friendly)

1. Create `go-go-app-sqlite-query` scaffold (Go + frontend workspace).
2. Implement `pkg/sqlitedb` with migrate/query/schema APIs and tests.
3. Implement `pkg/backendcomponent` with manifest/routes/health/reflection.
4. Implement frontend module + query window + reducers + stack/plugin bundle.
5. Wire aliases and proxies in `wesen-os/apps/os-launcher/vite.config.ts`.
6. Register launcher module in `wesen-os/apps/os-launcher/src/app/modules.tsx`.
7. Register reducers in `wesen-os/apps/os-launcher/src/app/store.ts`.
8. Register backend module in `wesen-os/cmd/wesen-os-launcher/main.go`.
9. Update `go.work` and `wesen-os/go.mod` replace directives.
10. Add backend, frontend, and integration tests.
11. Run smoke checks and endpoint validation commands.
12. Verify HyperCard query action works end-to-end.

## Open Questions

1. Should v1 support only read-only SQL (`SELECT`, `WITH`, `EXPLAIN`) or also controlled writes?
2. Should query history be local-only (frontend state) or persisted server-side per user/session?
3. Do we need per-table allow-list policy for first release?
4. Do we need role-based access control before enabling any write pathway?

## References

### Core composition and runtime

- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/main.go`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/src/App.tsx`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/src/app/modules.tsx`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/src/app/store.ts`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/vite.config.ts`

### Backend contracts

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/module.go`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/routes.go`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/manifest_endpoint.go`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/lifecycle.go`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-backend/pkg/backendhost/registry.go`

### Frontend and HyperCard contracts

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/contracts/appManifest.ts`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/desktop-os/src/runtime/renderAppWindow.ts`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/PluginCardSessionHost.tsx`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/pluginIntentRouting.ts`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/features/pluginCardRuntime/capabilityPolicy.ts`

### Reference implementation

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/inventorydb/store.go`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/backendcomponent/component.go`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/pkg/inventorytools/tools.go`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/launcher/module.tsx`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/domain/stack.ts`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/domain/pluginBundle.vm.js`

## Implemented Snapshot (2026-03-01)

The implementation now lives in `go-go-app-sqlite` (canonical app name), not `go-go-app-sqlite-query`.

### Backend implementation paths

- `go-go-app-sqlite/pkg/sqliteapp/config.go`
- `go-go-app-sqlite/pkg/sqliteapp/runtime.go`
- `go-go-app-sqlite/pkg/sqliteapp/migrations.go`
- `go-go-app-sqlite/pkg/sqliteapi/contracts.go`
- `go-go-app-sqlite/pkg/sqliteapi/executor.go`
- `go-go-app-sqlite/pkg/sqliteapi/errors.go`
- `go-go-app-sqlite/pkg/sqliteapi/handler.go`
- `go-go-app-sqlite/pkg/sqliteapi/metadata_store.go`
- `go-go-app-sqlite/pkg/backendcomponent/component.go`
- `go-go-app-sqlite/cmd/go-go-app-sqlite/main.go`

### Frontend implementation paths

- `go-go-app-sqlite/apps/sqlite/src/launcher/module.tsx`
- `go-go-app-sqlite/apps/sqlite/src/launcher/renderSqliteApp.tsx`
- `go-go-app-sqlite/apps/sqlite/src/components/SqliteWorkspaceWindow.tsx`
- `go-go-app-sqlite/apps/sqlite/src/domain/hypercard/intentContract.ts`
- `go-go-app-sqlite/apps/sqlite/src/domain/hypercard/intentBridge.ts`
- `go-go-app-sqlite/apps/sqlite/src/domain/hypercard/runtimeHandlers.ts`
- `go-go-app-sqlite/apps/sqlite/src/domain/hypercard/exampleCard.ts`

### Implemented API contracts

- `POST /api/apps/sqlite/query`
  - request: `sql`, optional `positional_params` or `named_params`, optional `row_limit`, optional `timeout_ms`
  - response: `{ columns, rows, meta }`
  - structured error categories: `validation`, `permission`, `syntax`, `execution`, `timeout`
- `GET /api/apps/sqlite/history?limit=&offset=&status=`
  - response: `{ items, total, limit, offset }`
- `GET /api/apps/sqlite/saved-queries`
- `POST /api/apps/sqlite/saved-queries`
- `PUT /api/apps/sqlite/saved-queries/{id}`
- `DELETE /api/apps/sqlite/saved-queries/{id}`

### Implemented guardrails

- statement allow/deny policy
- explicit read-only mutation blocking
- statement timeout policy and client-side cancellation support
- response redaction by configured columns
- audit metadata logging (no parameter values)
- in-memory rate-limit throttling (429)

### HyperCard intent contract (implemented)

- intent: `sqlite.query.execute`
- payload/result contracts exported from `apps/sqlite/src/domain/hypercard/intentContract.ts`
- runtime handler bridge exported from `apps/sqlite/src/domain/hypercard/runtimeHandlers.ts`
- normalized envelopes:
  - success: `{ ok: true, intent, data }`
  - failure: `{ ok: false, intent, error }`

### Validation status

- backend tests: implemented and passing (`GOWORK=off go test ./...`)
- frontend full workspace typecheck/test: pending environment dependency resolution
- launcher smoke + HyperCard runtime integration tests: still pending in tasks checklist
