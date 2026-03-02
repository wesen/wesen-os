---
Title: Backend Documentation System Rollout Plan (Inventory ARC-AGI GEPA)
Ticket: OS-02
Status: active
Topics:
    - documentation
    - apps-browser
    - reflection
    - frontend
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../go-go-app-arc-agi-3/pkg/backendmodule/module.go
      Note: |-
        ARC module lifecycle/mount points where docs store can be initialized
        ARC module docs route mounting and lifecycle initialization point
    - Path: ../../../../../../../go-go-app-arc-agi-3/pkg/backendmodule/reflection.go
      Note: ARC reflection payload currently carrying docs links only
    - Path: ../../../../../../../go-go-app-inventory/pkg/backendcomponent/component.go
      Note: |-
        Inventory backend component entrypoint and route mounting
        Inventory module docs loading insertion point
    - Path: ../../../../../../../go-go-gepa/pkg/backendmodule/module.go
      Note: |-
        Direct GEPA backend module integration point for docs loader and docs routes
        Direct GEPA docs loader and docs routes implementation target
    - Path: ../../../../../../../go-go-os-backend/pkg/backendhost/backendhost_test.go
      Note: Existing tests for manifest/reflective behavior to extend for docs behavior
    - Path: ../../../../../../../go-go-os-backend/pkg/backendhost/manifest_endpoint.go
      Note: |-
        Manifest and reflection HTTP endpoints that need docs hint extension
        Manifest endpoint where docs availability hint is added
    - Path: ../../../../../../../go-go-os-backend/pkg/backendhost/module.go
      Note: |-
        Canonical backend module contract and optional reflection interface
        Host interface extension point for optional module docs support
    - Path: ../../../../../../../go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts
      Note: apps-browser RTK Query usage of manifest/reflection endpoints
    - Path: ../../../../../../../go-go-os-frontend/apps/apps-browser/src/domain/types.ts
      Note: Frontend contract mirror for /api/os/apps and reflection payloads
    - Path: cmd/wesen-os-launcher/inventory_backend_module.go
      Note: |-
        Inventory adapter in composition layer; currently no reflection/docs interface
        Inventory adapter target for DocStore exposure
    - Path: cmd/wesen-os-launcher/main.go
      Note: |-
        Composition root where modules are registered and host endpoints are mounted
        Composition wiring and aggregation endpoint registration point
    - Path: pkg/arcagi/module.go
      Note: |-
        ARC-AGI adapter that maps reflection from app repo into backendhost contract
        ARC adapter rollout and reflection/docs alignment
    - Path: pkg/gepa/module.go
      Note: |-
        GEPA adapter that maps reflection from external module into backendhost contract
        GEPA adapter should stay thin while docs live in go-go-gepa
ExternalSources: []
Summary: Backend-first implementation plan for OS-02. It evaluates the existing design proposals against the current backend host and module composition code, then defines a phased rollout for a module documentation system across inventory, arc-agi, and gepa with concrete API contracts, pseudocode, file-level changes, test strategy, and intern onboarding notes.
LastUpdated: 2026-03-01T12:00:00-05:00
WhatFor: Use this document to implement OS-02 backend work safely and consistently across go-go-os-backend, wesen-os composition adapters, and app module repositories.
WhenToUse: Read this before coding any docs-system backend changes, adding module docs to inventory/arc-agi/gepa, or updating manifest/reflection contracts.
---



# Backend Documentation System Rollout Plan (Inventory ARC-AGI GEPA)

## Executive Summary

OS-02 already has strong exploratory design material, but backend implementation needs one narrowed execution plan that matches current code boundaries. Today, backend metadata has two levels: manifest (`GET /api/os/apps`) and optional reflection (`GET /api/os/apps/{id}/reflection`). The host contract and tests are stable and small, which is good for incremental extension.

The recommended backend strategy is:

1. Add a reusable markdown+frontmatter docs package to `go-go-os-backend` (`pkg/docmw`) for per-module docs stores and routes.
2. Extend `backendhost` with an optional documentable interface and a `docs` hint in `AppManifestDocument`.
3. Keep module docs routes under existing app namespaces (`/api/apps/{id}/docs` and `/api/apps/{id}/docs/{slug}`) and keep reflection focused on API/schema discoverability.
4. Implement docs incrementally for `inventory`, `arc-agi`, and `gepa` in their owning repositories.
5. Add an aggregated search endpoint at the composition layer (`wesen-os`), because it mixes module docs and launcher help pages.

This avoids a risky “big contract rewrite,” keeps compatibility with current frontend fetch patterns, and gives interns a file-by-file rollout path.

## Problem Statement And Scope

### Problem

The current backend supports discoverability of APIs/schemas through reflection, but not rich module documentation pages suitable for onboarding and daily development.

Observed from current code:

1. `AppBackendModule` has no docs capability, only lifecycle and routing (`go-go-os-backend/pkg/backendhost/module.go:17`).
2. `AppManifestDocument` exposes reflection hints but no docs hints (`go-go-os-backend/pkg/backendhost/manifest_endpoint.go:9`).
3. `wesen-os` mounts module routes and manifest endpoints centrally (`wesen-os/cmd/wesen-os-launcher/main.go:272`).
4. Inventory composition adapter does not implement reflection/docs optional interfaces (`wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go:18`).
5. ARC and GEPA adapters implement reflection mapping (`wesen-os/pkg/arcagi/module.go:67`, `wesen-os/pkg/gepa/module.go:67`).
6. apps-browser types and data layer currently only know manifest+reflection (`go-go-os-frontend/apps/apps-browser/src/domain/types.ts:7`, `go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts:9`).

### Scope Of This Plan

In scope:

1. Backend data model and contracts for module docs.
2. Host endpoint changes (`/api/os/apps`, `/api/apps/{id}/docs*`, `/api/os/docs`).
3. Module rollout for inventory, arc-agi, gepa.
4. Test plan and migration sequencing.
5. Intern onboarding and first-implementation checklist.

Out of scope (for this backend-first phase):

1. Full docs-center frontend application.
2. Advanced search infrastructure (FTS, ranking, synonyms).
3. Live runnable examples/execution sandboxes.
4. Backfilling all legacy modules immediately.

## Current-State Architecture (Evidence-Based)

### 1) Backend Host Contract Is Compact And Stable

`AppBackendModule` is intentionally minimal: manifest, route mount, lifecycle, health (`go-go-os-backend/pkg/backendhost/module.go:17-25`).

Optional discoverability exists via `ReflectiveAppBackendModule` with `Reflection(ctx)` (`go-go-os-backend/pkg/backendhost/module.go:27-31`).

Implication: adding docs as another optional interface follows an existing, proven extension pattern.

### 2) Manifest Endpoint Is The Discovery Root

`RegisterAppsManifestEndpoint` builds the app list and computes per-app health (`go-go-os-backend/pkg/backendhost/manifest_endpoint.go:30-68`).

Reflection availability is already surfaced as a hint in each manifest row (`go-go-os-backend/pkg/backendhost/manifest_endpoint.go:53-59`).

Implication: docs availability should be surfaced in the same object to let the frontend do feature-gated fetches without probing.

### 3) Composition Root Controls Real Runtime Wiring

`wesen-os` builds module list, creates registry, starts lifecycle, mounts manifest endpoints, then mounts module namespaces (`wesen-os/cmd/wesen-os-launcher/main.go:229-279`).

Implication: any aggregation endpoint spanning all modules belongs here, not inside generic `go-go-os-backend` host package.

### 4) Module Adapters Are Mixed (Important For Rollout)

1. Inventory uses an adapter wrapping `go-go-app-inventory/pkg/backendcomponent` (`wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go:18-73`).
2. ARC adapter wraps external module and maps reflection structs (`wesen-os/pkg/arcagi/module.go:67-122`).
3. GEPA adapter does the same (`wesen-os/pkg/gepa/module.go:67-122`).

Implication: docs rollout still needs adapter-awareness, but all three module repos are now available and can own their docs directly.

### 5) Inventory Has No Reflection Today

Inventory component exposes manifest/lifecycle/routes but no reflection contract (`go-go-app-inventory/pkg/backendcomponent/component.go:33-40`).

Implication: docs system must not depend on reflection support. Manifest docs hint is essential.

### 6) ARC Already Has Rich Reflection With Doc Links

ARC reflection includes capabilities/apis/schemas/docs links (`go-go-app-arc-agi-3/pkg/backendmodule/reflection.go:5-55`).

Implication: docs endpoints should complement, not replace, reflection; reflection docs links can cross-link into module docs pages.

### 7) Frontend Contract Is Reflection-Centric

apps-browser currently types manifest as optional `reflection` and fetches `/api/os/apps` plus `/api/os/apps/{id}/reflection` (`go-go-os-frontend/apps/apps-browser/src/domain/types.ts:7-33`, `go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts:9-28`).

Implication: backend should add manifest `docs` hint with the same low-friction pattern and keep old fields intact.

## Analysis Of Existing OS-02 Proposed Design

This section evaluates the two existing OS-02 docs against real backend constraints.

### Strong Points To Keep

1. Per-module markdown docs with frontmatter and `go:embed` is a good fit for Go module repos (OS-02 design-doc 02, `Module Integration`).
2. Keeping prose outside reflection JSON avoids very large reflection payloads (OS-02 design-doc 01, Approach B vs A).
3. A lightweight first-pass search endpoint is appropriate for current scale (OS-02 design-doc 02, `DocsIndex` with simple filtering).

### Adjustments Needed Before Implementation

1. Aggregation placement:
The concrete design places aggregation in `go-go-os-backend`.
Adjustment: keep generic parsing/store logic in `go-go-os-backend`, but place runtime aggregation endpoint wiring in `wesen-os` composition because it needs launcher-specific help docs and module composition context (`wesen-os/cmd/wesen-os-launcher/main.go:272`).

2. Interface dependency design:
If `backendhost` optional interface returns a concrete `docmw.DocStore`, `backendhost` imports `docmw`.
This is acceptable if `docmw` stays backendhost-independent. Enforce this as an invariant.

3. Module ownership reality:
`go-go-gepa` is now present in the workspace and in `go.work`, so GEPA docs can be implemented directly in `go-go-gepa/pkg/backendmodule` instead of using a composition-owned fallback.

4. Reflection growth caution:
Approach A proposes many new reflection fields. For backend phase, do not add large prose-bearing reflection fields. Keep reflection stable and add docs endpoints first.

### Decision

Adopt “Approach B first, C-lite later”:

1. Implement per-module docs endpoints now.
2. Add manifest docs hints now.
3. Add composition-level aggregated docs search endpoint now (simple filters).
4. Leave large reflection extension and full docmgr runtime embedding for later.

## Proposed Backend Architecture

### Contract Additions

#### 1) Manifest Hint Extension

Extend `AppManifestDocument` in `go-go-os-backend/pkg/backendhost/manifest_endpoint.go`:

```go
type AppManifestDocument struct {
    // existing fields
    Reflection *AppManifestReflectionHint `json:"reflection,omitempty"`
    Docs       *AppManifestDocsHint       `json:"docs,omitempty"`
}

type AppManifestDocsHint struct {
    Available bool   `json:"available"`
    URL       string `json:"url,omitempty"`
    Count     int    `json:"count,omitempty"`
    Version   string `json:"version,omitempty"`
}
```

#### 2) Optional Documentable Interface

Add to `go-go-os-backend/pkg/backendhost/module.go`:

```go
type DocumentableAppBackendModule interface {
    DocStore() *docmw.DocStore
}
```

Pattern mirrors `ReflectiveAppBackendModule` and keeps optional behavior.

#### 3) Module Docs Routes

Keep routes inside app namespace mounted by existing `MountNamespacedRoutes` flow:

1. `GET /api/apps/{app_id}/docs`
2. `GET /api/apps/{app_id}/docs/{slug}`

No new root prefix required.

### `docmw` Package (`go-go-os-backend/pkg/docmw`)

#### Responsibilities

1. Parse markdown files with YAML frontmatter from `fs.FS`.
2. Validate required metadata (`Title`, `DocType`), optional vocabulary checks.
3. Build in-memory store sorted by `Order`, then slug.
4. Serve JSON endpoints (TOC and single doc).
5. Provide primitives for aggregation (`AllDocs`, `Find`, facets helper).

#### Data Structures

```go
type ModuleDoc struct {
    ModuleID string   `json:"module_id"`
    Slug     string   `json:"slug"`
    Title    string   `json:"title"`
    DocType  string   `json:"doc_type"`
    Topics   []string `json:"topics,omitempty"`
    Summary  string   `json:"summary,omitempty"`
    SeeAlso  []string `json:"see_also,omitempty"`
    Order    int      `json:"order,omitempty"`
    Content  string   `json:"content,omitempty"`
}

type DocStore struct {
    ModuleID string
    Docs     []ModuleDoc
    BySlug   map[string]*ModuleDoc
}
```

### Composition Aggregation Endpoint (`wesen-os`)

Add composition-level endpoint:

1. `GET /api/os/docs?query=&topics=&doc_type=&module=`

Behavior:

1. Aggregates `DocStore` entries from all documentable modules.
2. Optionally adds launcher help docs from `wesen-os/pkg/doc` (already embedded for CLI help via `wesendoc.AddDocToHelpSystem`, `wesen-os/cmd/wesen-os-launcher/main.go:434`).
3. Returns filtered results plus facets.

This endpoint should live in `wesen-os/cmd/wesen-os-launcher` package, not in `go-go-os-backend`, to avoid coupling generic backendhost library to launcher-specific docs assets.

## API Contracts

### 1) Manifest (`GET /api/os/apps`)

Add docs hint per app:

```json
{
  "app_id": "arc-agi",
  "name": "ARC-AGI",
  "required": false,
  "healthy": true,
  "reflection": {
    "available": true,
    "url": "/api/os/apps/arc-agi/reflection",
    "version": "v1"
  },
  "docs": {
    "available": true,
    "url": "/api/apps/arc-agi/docs",
    "count": 4,
    "version": "v1"
  }
}
```

### 2) Module TOC (`GET /api/apps/{id}/docs`)

```json
{
  "module_id": "inventory",
  "docs": [
    {
      "module_id": "inventory",
      "slug": "overview",
      "title": "Inventory Module Overview",
      "doc_type": "guide",
      "topics": ["inventory", "backend", "onboarding"],
      "summary": "Architecture and runtime boundaries.",
      "order": 1
    }
  ]
}
```

### 3) Module Doc (`GET /api/apps/{id}/docs/{slug}`)

```json
{
  "module_id": "inventory",
  "slug": "overview",
  "title": "Inventory Module Overview",
  "doc_type": "guide",
  "topics": ["inventory", "backend", "onboarding"],
  "summary": "Architecture and runtime boundaries.",
  "see_also": ["inventory/api-reference", "arc-agi/overview"],
  "order": 1,
  "content": "## Overview\n..."
}
```

### 4) Aggregated Search (`GET /api/os/docs`)

```json
{
  "total": 9,
  "results": [
    {
      "module_id": "inventory",
      "slug": "api-reference",
      "title": "Inventory API Reference",
      "doc_type": "reference",
      "topics": ["inventory", "api"],
      "summary": "HTTP routes for inventory runtime.",
      "url": "/api/apps/inventory/docs/api-reference"
    }
  ],
  "facets": {
    "topics": [{"slug": "api", "count": 4}],
    "doc_types": [{"slug": "reference", "count": 3}],
    "modules": [{"id": "inventory", "count": 3}]
  }
}
```

## Pseudocode For Core Backend Flow

### Startup Wiring

```go
modules := []backendhost.AppBackendModule{inventoryModule, gepaModule, arcModule}
registry := backendhost.NewModuleRegistry(modules...)
lifecycle := backendhost.NewLifecycleManager(registry)
_ = lifecycle.Startup(ctx, opts)

appMux := http.NewServeMux()
backendhost.RegisterAppsManifestEndpoint(appMux, registry)

for _, m := range registry.Modules() {
    _ = backendhost.MountNamespacedRoutes(appMux, m.Manifest().AppID, m.MountRoutes)
}

docsIndex := buildDocsIndex(registry, loadLauncherHelpDocs())
registerOSDocsEndpoint(appMux, docsIndex)
```

### Manifest Row Enrichment

```go
for _, module := range registry.Modules() {
    doc := AppManifestDocument{...}

    if reflective, ok := module.(ReflectiveAppBackendModule); ok {
        doc.Reflection = &AppManifestReflectionHint{...}
    }

    if documentable, ok := module.(DocumentableAppBackendModule); ok {
        if store := documentable.DocStore(); store != nil {
            doc.Docs = &AppManifestDocsHint{
                Available: true,
                URL: "/api/apps/" + appID + "/docs",
                Count: len(store.Docs),
                Version: "v1",
            }
        }
    }
}
```

### `docmw` Parse

```go
func ParseFS(moduleID string, fsys fs.FS, opts ParseOptions) (*DocStore, error) {
    files := listMarkdownFiles(fsys)
    store := &DocStore{ModuleID: moduleID, BySlug: map[string]*ModuleDoc{}}

    for _, file := range files {
        raw := readFile(fsys, file)
        frontmatter, body := splitFrontmatter(raw)
        meta := decodeFrontmatter(frontmatter)
        validate(meta, opts.Vocabulary)

        slug := strings.TrimSuffix(path.Base(file), ".md")
        doc := ModuleDoc{ModuleID: moduleID, Slug: slug, ...meta..., Content: body}
        store.Docs = append(store.Docs, doc)
        store.BySlug[slug] = &store.Docs[len(store.Docs)-1]
    }

    sortDocs(store.Docs)
    return store, nil
}
```

## Module Rollout Plan (Inventory, ARC-AGI, GEPA)

### Inventory

#### Current State

1. Adapter in `wesen-os` wraps `backendcomponent.Component` (`wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go:18`).
2. Underlying component has no reflection/docs contracts (`go-go-app-inventory/pkg/backendcomponent/component.go:33`).

#### Rollout

1. Add `pkg/backendcomponent/docs/*.md` in `go-go-app-inventory`.
2. Add optional docs loader in component `Init` or constructor.
3. Expose docs store accessor from component (component-level method) or from `wesen-os` adapter.
4. Implement `DocStore()` on `inventoryBackendModule` adapter so host can surface manifest docs hint.

#### Initial Doc Set

1. `overview.md`
2. `api-reference.md`
3. `profiles-and-runtime.md`
4. `troubleshooting.md`

### ARC-AGI

#### Current State

1. ARC module already has reflection and schema routes (`go-go-app-arc-agi-3/pkg/backendmodule/module.go:109`, `:156`).
2. Existing narrative doc exists at `go-go-app-arc-agi-3/docs/arc-agi-app-module-user-guide.md`.

#### Rollout

1. Add structured docs directory under `go-go-app-arc-agi-3/pkg/backendmodule/docs/`.
2. Convert/split existing user guide into frontmatter-based pages.
3. Load docs in module startup and mount `/docs` routes via module mount.
4. Optionally keep reflection `Docs` links, but point them at `/api/apps/arc-agi/docs/{slug}` for consistency.

#### Initial Doc Set

1. `overview.md`
2. `session-lifecycle.md`
3. `api-reference.md`
4. `runtime-modes.md`

### GEPA

#### Current State

1. GEPA module source is available at `go-go-gepa/pkg/backendmodule`.
2. `wesen-os/pkg/gepa/module.go` is an adapter that should remain thin and map host contracts only (`wesen-os/pkg/gepa/module.go:67`).

#### Rollout

1. Add `go-go-gepa/pkg/backendmodule/docs/*.md` as GEPA-owned docs pack.
2. Load docs in `go-go-gepa/pkg/backendmodule/module.go` and mount `/docs` routes there.
3. Expose docs store through `wesen-os/pkg/gepa/module.go` so backendhost can publish manifest docs hints.

#### Initial Doc Set

1. `overview.md`
2. `scripts-and-runs.md`
3. `api-reference.md`

## File-Level Implementation Plan

### Phase 1: Core Contracts And Parser

Target repos:

1. `go-go-os-backend`

Create:

1. `pkg/docmw/docmw.go`
2. `pkg/docmw/vocabulary.go`
3. `pkg/docmw/vocabulary.yaml`
4. `pkg/docmw/docmw_test.go`

Modify:

1. `pkg/backendhost/module.go` (add optional documentable interface)
2. `pkg/backendhost/manifest_endpoint.go` (add docs hint)
3. `pkg/backendhost/backendhost_test.go` (manifest docs hint and interface behavior tests)

Exit criteria:

1. `go test ./pkg/backendhost ./pkg/docmw` passes in `go-go-os-backend`.
2. Manifest includes docs hint for fake documentable module.

### Phase 2: Module Integration

Target repos:

1. `go-go-app-inventory`
2. `go-go-app-arc-agi-3`
3. `go-go-gepa`
4. `wesen-os` (adapter exposure and composition wiring)

Create docs files for each module and wire loaders.

Exit criteria:

1. `/api/apps/inventory/docs` returns TOC.
2. `/api/apps/arc-agi/docs` returns TOC.
3. `/api/apps/gepa/docs` returns TOC (direct go-go-gepa ownership).

### Phase 3: Composition Aggregation Endpoint

Target repo:

1. `wesen-os`

Create:

1. `cmd/wesen-os-launcher/docs_endpoint.go` (or `pkg/docsindex` if you want separate package)
2. `cmd/wesen-os-launcher/docs_endpoint_test.go`

Modify:

1. `cmd/wesen-os-launcher/main.go` to build index and register `/api/os/docs`
2. `cmd/wesen-os-launcher/main_integration_test.go` add docs endpoint assertions

Exit criteria:

1. `/api/os/docs` returns merged results and facets.
2. Existing `/api/os/apps` and reflection tests remain green.

### Phase 4: Frontend Contract Handshake (Backend Support Complete)

Target repo:

1. `go-go-os-frontend` (not implemented in this backend ticket, but backend contract is now ready)

Expected backend-ready outputs:

1. Manifest has `docs` hint.
2. Module docs endpoints are stable.
3. Aggregated search endpoint is available.

## Testing And Validation Strategy

### Unit Tests (`go-go-os-backend`)

1. Frontmatter parser success/failure cases.
2. Slug collisions and deterministic ordering.
3. Unknown vocabulary topic/doc_type behavior (warning vs error policy).
4. Manifest docs hint population in presence/absence of documentable interface.

### Module Tests (`go-go-app-*`)

1. Inventory/ARC docs store initialization tests.
2. Route tests for `/docs` and `/docs/{slug}`.
3. ARC reflection docs link consistency tests if links are updated.

### Composition Integration Tests (`wesen-os`)

1. `GET /api/os/apps` contains docs hints for each rolled-out module.
2. `GET /api/apps/{id}/docs` and `/docs/{slug}` succeed for inventory/arc/gepa.
3. `GET /api/os/docs` returns filtered/faceted results.
4. Regression check: existing chat/ws/timeline/reflection behavior remains unchanged.

### Manual Smoke

Run launcher and verify:

1. `curl /api/os/apps | jq` includes `docs` fields.
2. `curl /api/apps/inventory/docs | jq` returns expected pages.
3. `curl /api/os/docs?query=session` returns cross-module hits.

## Risks, Tradeoffs, And Mitigations

### Risk 1: Contract Drift Between Reflection And Docs

Problem:

Reflection docs links and docs endpoint URLs can diverge.

Mitigation:

1. Central helper to derive docs URL from app ID and slug.
2. Add tests asserting reflection docs links resolve when present.

### Risk 2: Cross-Repo Synchronization Drift

Problem:

With `go-go-gepa` now local, docs changes span one more repository and can drift from `wesen-os` adapter expectations if contracts change unevenly.

Mitigation:

1. Keep GEPA docs contract tests in `go-go-gepa/pkg/backendmodule`.
2. Add adapter-level integration tests in `wesen-os` that validate manifest hints and `/api/apps/gepa/docs` behavior.

### Risk 3: Frontmatter Quality Regressions

Problem:

Bad frontmatter can silently degrade docs UX.

Mitigation:

1. Strict required field validation in parser.
2. Optional warning collection surfaced in logs/startup report.
3. Test fixtures with invalid samples.

### Tradeoff: Keep Search Simple Now

Decision:

Use in-memory filtering first.

Reason:

Current module/doc count is small; complexity of FTS is not justified for phase 1. This is explicitly revisitable.

## Intern Onboarding: How To Start Implementing

### Mental Model

1. `go-go-os-backend` defines generic contracts and reusable middleware.
2. `go-go-app-*` repos own module-specific docs content and loader wiring.
3. `wesen-os` composes modules, exposes global endpoints, and handles cross-module aggregation.

### Suggested First Week Plan

Day 1:

1. Read current contracts and tests in `go-go-os-backend/pkg/backendhost`.
2. Implement `pkg/docmw` with parser + tests.

Day 2:

1. Add docs interface and manifest docs hint.
2. Extend backendhost tests.

Day 3:

1. Wire inventory docs and adapter `DocStore()`.
2. Verify runtime endpoints manually.

Day 4:

1. Wire arc-agi docs and update reflection docs links.
2. Add module tests.

Day 5:

1. Add GEPA docs directly in `go-go-gepa/pkg/backendmodule` and expose via the existing `wesen-os` adapter.
2. Add `/api/os/docs` aggregation endpoint and integration tests.

### Done Definition For Backend Phase

1. Manifest includes docs hints for rolled-out modules.
2. Each rolled-out module exposes `/api/apps/{id}/docs` and `/api/apps/{id}/docs/{slug}`.
3. Composition exposes `/api/os/docs` aggregated search.
4. Unit/integration tests cover parser, manifest hints, module routes, and aggregation.
5. No regression in existing reflection/chat/lifecycle endpoints.

## Open Questions

1. Should unknown doc_type/topic fail startup in strict mode, or always warn and continue?
2. Should manifest docs `count` include only module docs or include launcher docs when module is `wesen-os`?
3. Should reflection `docs` links be retained long-term if module docs endpoints exist (duplication vs discoverability)?
4. Do we want version pinning between module binary version and docs set in phase 1, or defer to phase 2?

## Alternatives Considered

1. Put all docs content into reflection payload:
Rejected for phase 1 because payload size and authoring ergonomics are poor.

2. Full embedded docmgr runtime in backend:
Rejected for phase 1 because operational complexity is high relative to near-term needs.

3. Frontend-only docs aggregation with no backend docs endpoints:
Rejected because module-level ownership and stable API contracts are backend responsibilities.

## References

1. OS-02 design exploration: `ttmp/2026/03/01/OS-02--rich-app-documentation-system-for-wesen-os/design-doc/01-rich-app-documentation-system-design-exploration.md`
2. OS-02 concrete design: `ttmp/2026/03/01/OS-02--rich-app-documentation-system-for-wesen-os/design-doc/02-module-documentation-system-concrete-design.md`
3. Backend contract: `go-go-os-backend/pkg/backendhost/module.go`
4. Manifest/reflection endpoint: `go-go-os-backend/pkg/backendhost/manifest_endpoint.go`
5. Launcher composition wiring: `wesen-os/cmd/wesen-os-launcher/main.go`
6. Inventory adapter: `wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go`
7. ARC adapter and module: `wesen-os/pkg/arcagi/module.go`, `go-go-app-arc-agi-3/pkg/backendmodule/module.go`
8. GEPA module + adapter: `go-go-gepa/pkg/backendmodule/module.go`, `wesen-os/pkg/gepa/module.go`
9. apps-browser backend contract mirror: `go-go-os-frontend/apps/apps-browser/src/domain/types.ts`
