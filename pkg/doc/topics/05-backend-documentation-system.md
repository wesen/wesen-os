---
Title: Documentation System Guide
Slug: backend-documentation-system
Short: How the wesen-os documentation system works end-to-end, from backend markdown authoring and module contracts through aggregate discovery, the frontend doc browser, and the global help menu.
Topics:
- backend
- frontend
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

This guide explains the wesen-os documentation system. It covers the backend layer (OS-02) that gives each module a structured docs corpus, the frontend doc browser (OS-04) that renders and navigates that corpus, and the global help menu (OS-06) that surfaces launcher-level help pages through the same browser.

The goal is practical: make module behavior discoverable without reading source code, keep onboarding material close to implementation, and provide machine-readable contracts that frontend tools can render directly.

For general backend module development, see `backend-developer-guide`. For launcher operations and startup flow, see `wesen-os-guide`. For complete backend+frontend app construction, see `building-a-full-app`.

## Why This System Exists

Before OS-02, module discoverability relied mostly on reflection metadata and source browsing. Reflection is great for endpoint/schema inventory, but it is intentionally terse and API-centric. It does not replace authored runbooks, architecture explanations, lifecycle notes, or troubleshooting procedures.

The documentation system fills that gap by adding:

- a consistent markdown frontmatter schema,
- strict parsing and in-memory indexing,
- stable HTTP endpoints per module,
- composition-level aggregation for cross-module search/filter,
- a frontend doc browser with search, topic browsing, and multi-window support,
- a global help menu that surfaces launcher-level docs without requiring a fake app,
- frontend-facing hints so UI can show docs availability without guessing.

This keeps docs and code in the same repository and release unit, reducing drift between "how it works" and "what actually runs."

## System Architecture

The implementation is split across four layers to keep ownership boundaries clear.

| Layer | Responsibility | Key Paths |
|---|---|---|
| Core library (`go-go-os-backend`) | parse, validate, store, and serve module docs | `pkg/docmw/*`, `pkg/backendhost/*` |
| App modules (`inventory`, `arc-agi`, `gepa`) | own and embed module docs pages | `pkg/backendmodule/docs/*.md`, `docs_store.go`, `module.go` |
| Composition (`wesen-os`) | aggregate docs + global help endpoints | `cmd/wesen-os-launcher/docs_endpoint.go` |
| Frontend (`go-go-os-frontend`) | doc browser UI, API hooks, launcher integration | `apps/apps-browser/src/components/doc-browser/*`, `src/launcher/module.tsx` |

At runtime, the system serves three categories of endpoints:

```
Module docs (per app):
  GET /api/apps/<app-id>/docs        -> module TOC
  GET /api/apps/<app-id>/docs/<slug> -> full doc page

Aggregate docs (cross-module):
  GET /api/os/docs                   -> search/filter across all modules
                                        supports query/module/doc_type/topics + facets

Global help (launcher-level):
  GET /api/os/help                   -> help pages TOC
  GET /api/os/help/<slug>            -> full help page

Manifest:
  GET /api/os/apps                   -> includes docs hints per module
```

The frontend doc browser consumes all of these through RTK Query hooks and renders them in a windowed UI with toolbar navigation, search, and topic browsing.

## Data Contracts

### Module Doc Model

`docmw.ModuleDoc` represents one page:

- `module_id` — owning module identifier
- `slug` — URL-safe page key
- `title` — human-readable page title
- `doc_type` — classification (guide, tutorial, reference, troubleshooting, etc.)
- `topics` — optional tags for cross-cutting discovery
- `summary` — optional one-line description
- `see_also` — optional cross-references in `module_id/slug` format
- `order` — optional sort key within a module
- `content` — full markdown body (omitted in TOC responses)

### Manifest Docs Hint

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

### Module Docs Endpoints

| Endpoint | Purpose | Response Shape |
|---|---|---|
| `GET /api/apps/<id>/docs` | module docs table of contents | `{ "module_id": "...", "docs": [...] }` |
| `GET /api/apps/<id>/docs/<slug>` | one docs page | full `ModuleDoc` including `content` |

### Aggregate Endpoint

`GET /api/os/docs` returns docs across all documentable modules, including global help pages:

- `results[]` with module/doc metadata + URL,
- `facets.topics[]`,
- `facets.doc_types[]`,
- `facets.modules[]`.

Supported filters:

- `query` (text search in title/summary/slug/module_id),
- `module` (CSV),
- `doc_type` (CSV),
- `topics` (CSV).

### Global Help Endpoints

| Endpoint | Purpose | Response Shape |
|---|---|---|
| `GET /api/os/help` | help pages TOC | `{ "module_id": "wesen-os", "docs": [...] }` |
| `GET /api/os/help/<slug>` | one help page | full `ModuleDoc` including `content` |

Help pages share the same `ModuleDoc` shape as module docs. They use `module_id: "wesen-os"` and are sourced from the glazed help system (`pkg/doc/topics/*.md`) rather than from an app module's embedded docs.

## Backend: Authoring Module Docs

This section covers the practical implementation path for adding docs to a backend module.

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

Embedding keeps docs versioned with module binaries, and parser validation catches frontmatter errors early.

### Step 3: Mount Module Docs Routes

In `MountRoutes`, call `docmw.MountRoutes(mux, store)` after module route registration. Every module gets a uniform docs API contract without reimplementing handlers.

### Step 4: Expose DocStore

Implement `DocumentableAppBackendModule`:

```go
func (m *Module) DocStore() *docmw.DocStore { return m.docStore }
```

Backendhost uses this to publish manifest docs hints, and the composition layer uses it for aggregation.

### Step 5: Test It

Minimum coverage:

- parse success/failure tests,
- docs route tests (`/docs`, `/docs/{slug}`),
- manifest docs hint assertions,
- aggregate endpoint assertions (`/api/os/docs` filters/facets).

## Backend: Global Help Endpoint

The global help endpoint (`/api/os/help`) serves launcher-level documentation pages that are not tied to any specific app module. These pages are sourced from the glazed help system.

The implementation lives in `cmd/wesen-os-launcher/docs_endpoint.go`:

1. `loadLauncherHelpDocStore()` creates a glazed `HelpSystem`, loads sections from `pkg/doc`, and converts them to `docmw.ModuleDoc` entries with `module_id: "wesen-os"`.
2. `registerOSHelpEndpoint(mux, store)` mounts two handlers:
   - `GET /api/os/help` — returns the full TOC (no content bodies).
   - `GET /api/os/help/<slug>` — returns one page with full content.
3. `registerOSDocsEndpoint(mux, registry, helpStore)` includes help pages in the aggregate `/api/os/docs` response, making them discoverable through the same cross-module search interface.

Help section types are mapped to doc types: `Tutorial` becomes `"tutorial"`, `Example` becomes `"example"`, `Application` becomes `"application"`, and everything else becomes `"guide"`.

## Frontend: API Layer

The frontend consumes all documentation endpoints through RTK Query hooks defined in `apps/apps-browser/src/api/appsApi.ts`. Each hook provides automatic caching, deduplication, and loading states.

| Hook | Endpoint | Cache Tag |
|---|---|---|
| `useGetAppsQuery()` | `/api/os/apps` | `AppsList` |
| `useGetModuleDocsQuery(appId)` | `/api/apps/{id}/docs` | `DocsTOC` |
| `useGetModuleDocQuery({ appId, slug })` | `/api/apps/{id}/docs/{slug}` | `DocsPage` |
| `useGetOSDocsQuery(query)` | `/api/os/docs` | `OSDocs` |
| `useGetHelpDocsQuery()` | `/api/os/help` | `HelpDocs` |
| `useGetHelpDocQuery(slug)` | `/api/os/help/{slug}` | `HelpPage` |

The aggregate endpoint hook `useGetOSDocsQuery` accepts an optional `OSDocsQuery` object with `query`, `topics`, `doc_type`, and `module` fields. The hook builds URL parameters from this object, mapping arrays to CSV values.

Frontend TypeScript types mirror the backend response shapes:

- `ModuleDocsTOCResponse` — `{ module_id, docs[] }`
- `ModuleDocDocument` — full page including optional `content`
- `OSDocsResponse` — `{ total, results[], facets }` with `OSDocResult`, `OSDocFacet`, `OSDocModuleFacet`

## Frontend: Doc Browser

The doc browser is a windowed UI component that provides full documentation browsing, search, and reading capabilities. It lives in `apps/apps-browser/src/components/doc-browser/`.

### Component Architecture

```
DocBrowserWindow          (shell: toolbar + content + context menu)
  DocBrowserProvider      (state management: navigation, mode, menu)
    DocBrowserToolbar     (back, home, search, topics, module buttons)
    DocBrowserScreenRouter
      DocCenterHome       (dispatches to HelpCenterHome or AppsCenterHome)
      DocSearchScreen     (aggregate search with faceted filters)
      ModuleDocsScreen    (single module docs listing, grouped by doc type)
      DocReaderScreen     (markdown reader with breadcrumbs, metadata, see-also, prev/next)
      TopicBrowserScreen  (two-pane topic browser with module grouping)
    DocLinkContextMenu    (right-click menu: open here / open in new window)
```

### Screens

**DocCenterHome** — The landing screen. In apps mode, shows a grid of module cards (each with doc count and page links) plus topic and doc-type chip rows. In help mode, shows a flat list of help page cards. Both modes have a search bar at the top.

**DocSearchScreen** — Full-text search across all modules via `/api/os/docs`. Left sidebar has checkbox filters for modules, doc types, and topics. Results show as cards with doc-type and module badges. Filters use the aggregate endpoint's facets for counts.

**ModuleDocsScreen** — Single module view. Shows module name, health status, doc count, and pages grouped by doc type (guides, tutorials, references, troubleshooting). Groups are sorted in a canonical order with unknown types alphabetically appended.

**DocReaderScreen** — Reads and renders a single documentation page. Features:
- Breadcrumb navigation (module > doc type > page title),
- Metadata bar with clickable doc-type, module, and topic badges,
- Markdown rendering via `react-markdown` with GFM and syntax highlighting,
- Copy-to-clipboard buttons on code blocks,
- See Also section with cross-reference links,
- Previous/Next navigation within the module TOC.

In help mode, the reader fetches from `/api/os/help/{slug}` instead of `/api/apps/{id}/docs/{slug}`, using RTK Query's `skip` option to conditionally activate the correct hooks without violating React's rules of hooks.

**TopicBrowserScreen** — Two-pane layout. Left pane lists all topics with counts. Right pane shows docs matching the selected topic, grouped by module.

### Navigation and State Management

Navigation state is managed by `DocBrowserContext` using a reducer pattern:

```typescript
type DocBrowserScreen = 'home' | 'search' | 'module-docs' | 'reader' | 'topic-browser';

interface DocBrowserLocation {
  screen: DocBrowserScreen;
  moduleId?: string;
  slug?: string;
  query?: string;
  topic?: string;
}
```

The context provides navigation methods: `goHome()`, `goBack()`, `openSearch(query?)`, `openModuleDocs(moduleId)`, `openDoc(moduleId, slug)`, `openTopicBrowser(topic?)`. These push onto a history stack that supports back navigation.

### Link Interaction

All doc links across all screens use a consistent interaction model provided by `docLinkInteraction.ts`:

| Gesture | Behavior |
|---|---|
| Plain click | Navigate in current window |
| Cmd/Ctrl+click | Open in new window |
| Middle click | Open in new window |
| Right click | Show context menu (Open Here / Open in New Window) |

The `createDocLinkHandlers(target, openDoc, openDocNewWindow, showMenu)` function returns `onClick`, `onAuxClick`, and `onContextMenu` handlers that implement this policy. Every clickable doc link in the browser uses these handlers.

The context menu is rendered by `DocLinkContextMenu` inside `DocBrowserWindow`. It uses a backdrop for dismissal and positions absolutely at the click coordinates.

### Multi-Window Support

New doc browser windows are created with counter-based unique IDs and unique dedupe keys, allowing multiple doc windows to coexist:

```typescript
buildDocBrowserWindowPayload({ moduleId: 'inventory', slug: 'overview', newWindow: true })
// -> dedupeKey: "apps-browser:docs:new-1"
// -> appKey: "apps-browser:docs:apps:doc:inventory:overview"
```

Without `newWindow: true`, all navigation reuses a single shared window per mode via stable dedupe keys (`apps-browser:docs` for apps mode, `apps-browser:help` for help mode).

### Mode System

The doc browser supports two modes controlled by `DocBrowserMode`:

| Mode | Home Screen | Data Source | Toolbar Buttons |
|---|---|---|---|
| `apps` | Module card grid from `/api/os/apps` + `/api/os/docs` | `/api/apps/{id}/docs/*` | Back, Home, Search, Topics, Module |
| `help` | Help page list from `/api/os/help` | `/api/os/help/*` | Back, Home, Search |

Help mode hides the Topics and Module toolbar buttons since those are app-specific affordances. The mode is threaded through `DocBrowserContext` and consumed by each screen to select the appropriate data source and UI variant.

## Frontend: Launcher Integration

The doc browser is wired into the desktop through the apps-browser launcher module (`src/launcher/module.tsx`).

### Commands

| Command ID | Action |
|---|---|
| `apps-browser.open-docs` | Open apps-mode doc browser (optionally focused on a module) |
| `apps-browser.open-doc-page` | Open apps-mode reader at a specific page |
| `apps-browser.search-docs` | Open apps-mode search (optionally with a query) |
| `apps-browser.open-help` | Open help-mode doc browser at home |

### Menu Contribution

The module contributes a top-level `Help` menu section:

```
Help
  General Help          -> apps-browser.open-help
  ─────────────────
  Apps Documentation Browser -> apps-browser.open-docs
```

Menu sections with the same `id` get merged via `composeDesktopContributions`, so other modules can contribute additional Help entries.

### Route Grammar

Doc browser windows encode their state in the `appKey` suffix using a colon-delimited route grammar:

```
apps-browser:docs:<mode>:<route>

Mode prefix:
  apps     -> apps documentation mode
  help     -> global help mode

Route patterns:
  home                        -> home screen
  search                      -> search screen (no query)
  search:<encoded-query>      -> search screen with query
  module:<encoded-module-id>  -> module docs listing
  doc:<encoded-module>:<slug> -> doc reader (apps mode)
  doc:<encoded-slug>          -> doc reader (help mode, moduleId auto-set to "wesen-os")
```

Examples:
- `apps-browser:docs:apps:home` — apps mode home
- `apps-browser:docs:apps:doc:inventory:overview` — read inventory/overview
- `apps-browser:docs:help:home` — help mode home
- `apps-browser:docs:help:doc:wesen-os-guide` — read a help page

Route parts are URI-encoded for safe embedding. The parser is backward-compatible: unprefixed routes (from before OS-06) default to apps mode.

### Window Content Adapter

The adapter parses the `appKey` suffix, extracts mode and route parameters, and renders `DocBrowserWindow` with the appropriate props:

```typescript
<DocBrowserWindow
  mode={parsed.mode}
  initialScreen="reader"
  initialModuleId="inventory"
  initialSlug="overview"
  onOpenDocNewWindow={(moduleId, slug) =>
    hostContext.openWindow(buildDocBrowserWindowPayload({
      mode: parsed.mode,
      moduleId,
      slug,
      newWindow: true,
    }))
  }
/>
```

## Frontend: Styling

All doc browser components use `data-part` attribute selectors for styling, following the project convention. CSS custom properties (`--hc-*`) provide theming hooks.

Key `data-part` values and their roles:

| Part | Component | Purpose |
|---|---|---|
| `doc-browser` | Shell | Flex column container |
| `doc-browser-toolbar` | Toolbar | Horizontal button bar |
| `doc-browser-nav-btn` | Toolbar/Search | Navigation buttons (supports `data-state="active"`) |
| `doc-center-home` | Home | Padded flex column layout |
| `doc-search-bar` | Home/Search | Inline form with input + button |
| `doc-module-grid` | Home | CSS grid for module cards |
| `doc-module-card` | Home | Card with header, meta, and doc links |
| `doc-search-screen` | Search | Full-height flex layout |
| `doc-filter-sidebar` | Search | Fixed-width filter panel |
| `doc-result-card` | Search | Clickable result with badges |
| `doc-module-screen` | Module | Module detail with grouped docs |
| `doc-entry-card` | Module | Doc page card with order, title, topics |
| `doc-reader` | Reader | Padded flex column for reading |
| `doc-breadcrumb` | Reader | Navigable breadcrumb trail |
| `doc-meta-bar` | Reader | Badge row (doc type, module, topics) |
| `doc-content` | Reader | Markdown rendering container |
| `doc-code-block` | Reader | Code block with copy button (hover-revealed) |
| `doc-see-also` | Reader | Cross-reference links |
| `doc-prev-next` | Reader | Previous/Next navigation |
| `doc-topic-browser` | Topics | Two-pane master-detail layout |
| `doc-link-menu` | Context menu | Positioned popup with backdrop |
| `doc-badge` | Various | Small label (supports `data-variant="doc-type"` and `data-variant="module"`) |

All styles live in `DocBrowserWindow.css`. Colors, fonts, and borders use CSS custom properties that inherit from the window chrome theme:

```css
[data-part="doc-browser"] {
  font-family: var(--hc-font-family);
  font-size: var(--hc-font-size, 11px);
  color: var(--hc-color-fg, #000);
  background: var(--hc-color-bg, #fff);
}
```

## Frontend: Testing and Storybook

### MSW Mock Handlers

`createAppsHandlers(options)` in `src/mocks/msw/createAppsHandlers.ts` creates MSW request handlers that mirror the backend behavior. It accepts fixture data and returns handlers for:

- `GET /api/os/apps` — returns fixture apps list
- `GET /api/os/apps/:appId/reflection` — returns reflection or 501
- `GET /api/apps/:appId/docs` — returns module TOC
- `GET /api/apps/:appId/docs/:slug` — returns single doc
- `GET /api/os/docs` — full aggregate search with query/module/doc_type/topics filters and facets

The aggregate handler implements the same filter logic as the real backend (CSV filter parsing, case-insensitive text search, topic intersection, facet building).

### Unit Tests

Tests live in `src/launcher/module.test.tsx` and `src/components/doc-browser/DocBrowserWindow.test.ts`. They cover:

- Command routing: each command ID opens the correct window payload
- Route parsing: appKey suffixes decode to correct screen, module, slug, mode
- Mode parsing: help-prefixed routes set mode and auto-assign `moduleId: "wesen-os"`
- Backward compatibility: unprefixed routes still work
- Menu contribution: Help menu has the required entries
- Screen resolution: explicit screen props override implicit detection from params

### Storybook

Each screen component has a stories file with MSW-backed stories using `StoreDecorator` and `createDefaultAppsHandlers()`. Stories demonstrate:

- Default states (loading, empty, populated)
- Error states
- Mode variants (apps vs help)
- Multi-window interaction callbacks
- Context menu behavior

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

# global help endpoint
curl -sS http://127.0.0.1:8091/api/os/help \
  | jq '{module_id, count:(.docs|length)}'
curl -sS http://127.0.0.1:8091/api/os/help/backend-documentation-system \
  | jq '{module_id, slug, title, doc_type}'

# aggregate docs endpoint (includes help pages)
curl -sS http://127.0.0.1:8091/api/os/docs | jq '{total, modules:[.facets.modules[].id]}'
curl -sS 'http://127.0.0.1:8091/api/os/docs?module=wesen-os' \
  | jq '{total, titles:[.results[].title]}'
curl -sS 'http://127.0.0.1:8091/api/os/docs?module=gepa' \
  | jq '{total, modules:[.results[].module_id] | unique}'
```

When running the app stack in tmux, ensure no stale backend process already binds `:8091`; otherwise smoke checks can hit an older runtime and produce misleading results.

## Troubleshooting

### Backend Issues

| Problem | Cause | Solution |
|---|---|---|
| `/api/apps/<id>/docs` returns 404 | Docs routes not mounted or module does not expose `DocStore()` | Call `docmw.MountRoutes(...)` and implement `DocumentableAppBackendModule` |
| Module startup fails after docs pages are added | Frontmatter is malformed (missing `Title` or `DocType`) | Fix markdown frontmatter and restart; parser errors identify the failing page |
| Manifest does not show docs hint | `DocStore()` returns nil or module is not documentable | Confirm store loads successfully and `DocStore()` returns it |
| Docs index is unexpectedly empty | Embedded docs files missing or wrong embed glob/path | Verify `//go:embed docs/*.md` and repository file layout |
| `/api/os/docs` misses a module | Module not registered in composition or not documentable | Check `modules` slice in launcher and `DocStore()` implementation |
| `/api/os/help` returns empty docs | Help system failed to load or `pkg/doc` has no pages | Check `loadLauncherHelpDocStore()` logs and verify `pkg/doc/topics/*.md` exists |
| Smoke checks show old behavior | Requests hit stale process on same port | Kill existing listener, start fresh launcher, then rerun checks |
| ARC-enabled smoke fails at startup | ARC runtime submodules not initialized | Run `git submodule update --init --recursive` in `go-go-app-arc-agi-3` |
| Behavior differs across repos | Workspace/replace drift across sibling checkouts | Align `go.work`, `wesen-os/go.mod` replacements, and local repo revisions |

### Frontend Issues

| Problem | Cause | Solution |
|---|---|---|
| Doc browser shows "Loading..." indefinitely | API endpoint unreachable or CORS issue | Check that the backend is running and the proxy is configured |
| Help mode home shows "No help pages available" | `/api/os/help` returns empty docs array | Verify backend help store loaded successfully |
| Modifier-click does not open new window | `onOpenDocNewWindow` callback not wired | Ensure the launcher adapter passes the callback to `DocBrowserWindow` |
| Context menu does not appear | `showDocLinkMenu` not provided by context | Verify `DocBrowserProvider` receives `onOpenDocNewWindow` prop |
| Nested button hydration warning | A `<button>` is nested inside another `<button>` | Use `<span role="button" tabIndex={0}>` for inner interactive elements |
| Route parsing returns empty props | Malformed URI-encoded segment in appKey | Check for double-encoding; `decodeURIComponent` silently fails on invalid sequences |
| Search shows no results despite docs existing | Aggregate endpoint filters too narrow | Clear all filters and verify `/api/os/docs` returns results with no query params |
| Storybook stories fail to load | MSW handlers not registered or fixture data missing | Verify `createDefaultAppsHandlers()` is used in story decorators |

## See Also

- `backend-developer-guide` — Core backend module contracts and lifecycle
- `wesen-os-guide` — Workspace setup, startup, build, and operational checks
- `building-a-full-app` — End-to-end app construction flow including docs integration
- `frontend-developer-guide` — Frontend launcher module integration details
