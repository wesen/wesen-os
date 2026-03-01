---
Title: Backend Documentation System Guide
Slug: backend-documentation-system
Short: How structured backend docs work in wesen-os, from markdown authoring and module contracts to aggregate discovery and runtime smoke validation.
Topics:
- backend
- documentation
- modules
- api
- testing
- troubleshooting
Commands:
- wesen-os-launcher
Flags:
- addr
- arc-enabled
- required-apps
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

This guide explains the backend documentation system added in OS-02. The system gives each backend module a structured docs corpus, exposes module-local docs endpoints, publishes docs hints in the manifest, and provides an aggregate docs endpoint across all modules.

The goal is practical: make module behavior discoverable without reading source code, keep onboarding material close to implementation, and provide machine-readable contracts that frontend tools can render directly.

For general backend module development, see `backend-developer-guide`. For launcher operations and startup flow, see `wesen-os-guide`. For complete backend+frontend app construction, see `building-a-full-app`.

## Why This System Exists

Before OS-02, module discoverability relied mostly on reflection metadata and source browsing. Reflection is great for endpoint/schema inventory, but it is intentionally terse and API-centric. It does not replace authored runbooks, architecture explanations, lifecycle notes, or troubleshooting procedures.

The backend docs system fills that gap by adding:

- a consistent markdown frontmatter schema,
- strict parsing and in-memory indexing,
- stable HTTP endpoints per module,
- composition-level aggregation for cross-module search/filter,
- frontend-facing hints so UI can show docs availability without guessing.

This keeps docs and code in the same repository and release unit, reducing drift between "how it works" and "what actually runs."

## System Architecture

The implementation is split across three layers to keep ownership boundaries clear.

| Layer | Responsibility | Key Paths |
|---|---|---|
| Core library (`go-go-os-backend`) | parse, validate, store, and serve module docs | `pkg/docmw/*`, `pkg/backendhost/*` |
| App modules (`inventory`, `arc-agi`, `gepa`) | own and embed module docs pages | `pkg/backendmodule/docs/*.md`, `docs_store.go`, `module.go` |
| Composition (`wesen-os`) | aggregate docs across modules | `cmd/wesen-os-launcher/docs_endpoint.go` |

At runtime, requests flow like this:

```
GET /api/os/apps
  -> backendhost manifest endpoint
  -> includes docs hint if module implements DocumentableAppBackendModule

GET /api/apps/<app-id>/docs
GET /api/apps/<app-id>/docs/<slug>
  -> module-local handlers mounted by docmw.MountRoutes

GET /api/os/docs
  -> composition aggregator across documentable modules
  -> supports query/module/doc_type/topics filters + facets
```

## Data Contracts

### 1) Module Doc Model

`docmw.ModuleDoc` represents one page:

- `module_id`
- `slug`
- `title`
- `doc_type`
- `topics` (optional)
- `summary` (optional)
- `see_also` (optional)
- `order` (optional)
- `content` (full markdown body; omitted in TOC responses)

### 2) Manifest Docs Hint

When a module implements `DocumentableAppBackendModule`, `/api/os/apps` includes:

```json
{
  "docs": {
    "available": true,
    "url": "/api/apps/inventory/docs",
    "count": 4,
    "version": "v1"
  }
}
```

### 3) Module Docs Endpoints

| Endpoint | Purpose | Response Shape |
|---|---|---|
| `GET /api/apps/<id>/docs` | module docs table of contents | `{ "module_id": "...", "docs": [...] }` |
| `GET /api/apps/<id>/docs/<slug>` | one docs page | full `ModuleDoc` including `content` |

### 4) Aggregate Endpoint

`GET /api/os/docs` returns docs across all documentable modules:

- `results[]` with module/doc metadata + URL,
- `facets.topics[]`,
- `facets.doc_types[]`,
- `facets.modules[]`.

Supported filters:

- `query` (text search in title/summary/slug/module_id),
- `module` (CSV),
- `doc_type` (CSV),
- `topics` (CSV).

## Authoring Workflow For A Module

This section covers the practical implementation path and why each step matters.

### Step 1: Author Markdown Pages

Create pages in the module package, usually `pkg/backendmodule/docs/*.md`.

Required frontmatter fields:

- `Title`
- `DocType`

Recommended fields:

- `Slug`
- `Summary`
- `Topics`
- `SeeAlso`
- `Order`

Example:

```markdown
---
Title: Inventory API Reference
DocType: api-reference
Slug: api-reference
Topics:
  - inventory
  - api
Summary: Route contracts, payloads, and error behavior for inventory.
Order: 20
---

API documentation body...
```

### Step 2: Embed and Parse

Embed docs at build time and parse into `docmw.DocStore`.

```go
//go:embed docs/*.md
var docsFS embed.FS

func loadDocStore() (*docmw.DocStore, error) {
    return docmw.ParseFS("inventory", docsFS, docmw.ParseOptions{})
}
```

Why: embedding keeps docs versioned with module binaries, and parser validation catches frontmatter errors early.

### Step 3: Mount Module Docs Routes

In `MountRoutes`, call `docmw.MountRoutes(mux, store)` after module route registration.

Why: every module gets a uniform docs API contract without reimplementing handlers.

### Step 4: Expose `DocStore()`

Implement `DocumentableAppBackendModule`:

```go
func (m *Module) DocStore() *docmw.DocStore { return m.docStore }
```

Why: backendhost uses this to publish manifest docs hints and composition uses it for aggregation.

### Step 5: Test It

Minimum coverage:

- parse success/failure tests,
- docs route tests (`/docs`, `/docs/{slug}`),
- manifest docs hint assertions,
- aggregate endpoint assertions (`/api/os/docs` filters/facets).

## Frontend Consumption Path

The launcher apps-browser consumes docs through two channels:

- manifest docs hint (`app.docs`),
- docs endpoints (`/api/apps/{id}/docs`, `/api/apps/{id}/docs/{slug}`).

Current UI behavior:

- Get Info window shows docs available/unavailable/error states,
- lists docs pages and links to module docs endpoints,
- keeps docs state separate from reflection state.

This separation matters because docs and reflection can fail independently.

## End-to-End Validation

Run these checks after backend/frontend startup.

```bash
# docs hint + reflection hint in manifest
curl -sS http://127.0.0.1:8091/api/os/apps \
  | jq '.apps[] | {app_id, docs, reflection}'

# per-module docs endpoints
curl -sS http://127.0.0.1:8091/api/apps/inventory/docs | jq '{module_id, count:(.docs|length)}'
curl -sS http://127.0.0.1:8091/api/apps/arc-agi/docs | jq '{module_id, count:(.docs|length)}'
curl -sS http://127.0.0.1:8091/api/apps/gepa/docs | jq '{module_id, count:(.docs|length)}'

# one doc page
curl -sS http://127.0.0.1:8091/api/apps/inventory/docs/overview \
  | jq '{module_id, slug, title, doc_type}'

# aggregate docs endpoint
curl -sS http://127.0.0.1:8091/api/os/docs | jq '{total, modules:[.facets.modules[].id]}'
curl -sS 'http://127.0.0.1:8091/api/os/docs?module=gepa' \
  | jq '{total, modules:[.results[].module_id] | unique}'
```

When running the app stack in tmux, ensure no stale backend process already binds `:8091`; otherwise smoke checks can hit an older runtime and produce misleading results.

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| `/api/apps/<id>/docs` returns 404 | Docs routes not mounted or module does not expose `DocStore()` | Call `docmw.MountRoutes(...)` and implement `DocumentableAppBackendModule` |
| Module startup fails after docs pages are added | Frontmatter is malformed (missing `Title` or `DocType`) | Fix markdown frontmatter and restart; parser errors identify the failing page |
| Manifest does not show docs hint | `DocStore()` returns nil or module is not documentable | Confirm store loads successfully and `DocStore()` returns it |
| Docs index is unexpectedly empty | Embedded docs files missing or wrong embed glob/path | Verify `//go:embed docs/*.md` and repository file layout |
| `/api/os/docs` misses a module | Module not registered in composition or not documentable | Check `modules` slice in launcher and `DocStore()` implementation |
| Smoke checks show old behavior | Requests hit stale process on same port | Kill existing listener, start fresh launcher, then rerun checks |
| ARC-enabled smoke fails at startup | ARC runtime submodules not initialized | Run `git submodule update --init --recursive` in `go-go-app-arc-agi-3` |
| Behavior differs across repos | Workspace/replace drift across sibling checkouts | Align `go.work`, `wesen-os/go.mod` replacements, and local repo revisions |

## See Also

- `backend-developer-guide` — Core backend module contracts and lifecycle
- `wesen-os-guide` — Workspace setup, startup, build, and operational checks
- `building-a-full-app` — End-to-end app construction flow including docs integration
- `frontend-developer-guide` — Frontend launcher module integration details
