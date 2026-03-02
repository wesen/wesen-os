---
Title: Module Documentation System — Concrete Design
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
    - Path: /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/module.go
      Note: Current module contract — new DocumentableModule interface goes here
    - Path: /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/manifest_endpoint.go
      Note: Manifest endpoint — add docs_available hint here
    - Path: /home/manuel/code/wesen/corporate-headquarters/docmgr/pkg/models/document.go
      Note: docmgr Document struct — inspiration for ModuleDoc frontmatter
ExternalSources: []
Summary: >-
    Concrete design for a simple module documentation system. Each module
    embeds markdown files with YAML frontmatter. A shared docmw package
    parses and serves them. The launcher aggregates all module docs into
    a searchable index. Topics and doc types come from a controlled vocabulary.
LastUpdated: 2026-03-01T11:39:26.188132812-05:00
WhatFor: >-
    Blueprint for implementing the module documentation system. Read this
    before writing code.
WhenToUse: >-
    When implementing the docmw package, adding docs to a module, or
    building the documentation aggregation endpoint.
---

## Overview

Every module can ship markdown documentation alongside its code. The
documentation is embedded in the Go binary via `go:embed`, parsed at
startup, and served over HTTP. The launcher aggregates all module docs
into a single searchable index.

There is one document type: a markdown file with YAML frontmatter.
The frontmatter carries metadata — title, doc type, topics, summary,
see-also links, and related files. Doc types and topics are drawn from
a shared vocabulary so they stay consistent across modules.

```
Module repo                         Runtime
============                        =======

  pkg/docs/
    overview.md          go:embed    docmw parses frontmatter
    api-reference.md     -------->   builds TOC
    getting-started.md               serves HTTP endpoints
                                         |
                                         v
                                    GET /api/apps/{id}/docs
                                    GET /api/apps/{id}/docs/{slug}
                                         |
                                         v
                              Launcher aggregation endpoint
                              GET /api/os/docs?query=...&topics=...
```


## Document Format

Each document is a markdown file. The filename (minus `.md`) becomes
the slug. The file starts with YAML frontmatter between `---` fences.

```yaml
---
Title: Inventory API Reference
DocType: reference
Topics: [inventory, api]
Summary: Complete reference for the inventory module's HTTP API.
SeeAlso:
  - inventory/overview
  - gepa/api-reference
Order: 2
---

## Endpoints

### GET /items

Returns all inventory items...
```

### Frontmatter Fields

| Field    | Type       | Required | Description                                    |
|----------|------------|----------|------------------------------------------------|
| Title    | string     | yes      | Human-readable title                           |
| DocType  | string     | yes      | One of the vocabulary doc types                |
| Topics   | []string   | no       | Tags from the vocabulary topics list           |
| Summary  | string     | no       | One-paragraph description for search results   |
| SeeAlso  | []string   | no       | Slugs of related docs (`{module}/{slug}` or just `{slug}` for same module) |
| Order    | int        | no       | Sort position in the TOC (default 0)           |

That's it. No ticket, no owners, no status — those are project-management
fields that don't belong in runtime module documentation. Keep it minimal.

### Vocabulary

A single `vocabulary.yaml` file defines valid doc types and topics.
It ships in the `docmw` package as a default and can be extended per
deployment.

```yaml
docTypes:
  - slug: guide
    description: Conceptual overview of a module or topic area
  - slug: reference
    description: API and type reference
  - slug: tutorial
    description: Step-by-step walkthrough
  - slug: example
    description: Focused example with runnable code
  - slug: troubleshooting
    description: Common problems and solutions

topics:
  - slug: inventory
    description: Inventory management module
  - slug: gepa
    description: GEPA optimization module
  - slug: arc-agi
    description: ARC-AGI player module
  - slug: backend
    description: Go backend development
  - slug: frontend
    description: TypeScript frontend development
  - slug: hypercard
    description: HyperCard runtime and cards
  - slug: api
    description: HTTP API endpoints
  - slug: events
    description: WebSocket events and SEM pipeline
  - slug: architecture
    description: System architecture and design
  - slug: onboarding
    description: Getting started and setup
```

Validation is best-effort at startup: unknown topics or doc types get
logged as warnings but don't prevent the module from loading.


## Go Implementation

### The `ModuleDoc` Struct

```go
package docmw

type ModuleDoc struct {
    Slug    string   `json:"slug"`
    Title   string   `json:"title"`
    DocType string   `json:"doc_type"`
    Topics  []string `json:"topics,omitempty"`
    Summary string   `json:"summary,omitempty"`
    SeeAlso []string `json:"see_also,omitempty"`
    Order   int      `json:"order,omitempty"`

    // Content is the markdown body (below the frontmatter).
    // Only populated when serving a single doc, not in TOC listings.
    Content string `json:"content,omitempty"`

    // Set by the middleware at mount time.
    ModuleID string `json:"module_id,omitempty"`
}
```

### The `docmw` Package

```go
package docmw

import (
    "io/fs"
    "net/http"
)

// DocStore holds parsed documentation for one module.
type DocStore struct {
    ModuleID string
    Docs     []ModuleDoc          // sorted by Order, then slug
    BySlug   map[string]*ModuleDoc
}

// ParseFS reads all .md files from the given filesystem,
// parses their YAML frontmatter, and returns a DocStore.
func ParseFS(moduleID string, fsys fs.FS) (*DocStore, error)

// MountRoutes registers two handlers on the mux:
//   GET /api/apps/{moduleID}/docs         → JSON array of ModuleDoc (no content)
//   GET /api/apps/{moduleID}/docs/{slug}  → single ModuleDoc with content
func (ds *DocStore) MountRoutes(mux *http.ServeMux)
```

The implementation is straightforward:

1. `ParseFS` walks the FS, reads each `.md` file, splits frontmatter
   from body, unmarshals the YAML into a `ModuleDoc`, sets the slug
   from the filename, and stores the body in `Content`.

2. The TOC endpoint returns all docs with `Content` omitted.

3. The single-doc endpoint returns one doc with `Content` populated.

### Module Integration

A module opts in by embedding a `docs/` directory and calling `ParseFS`
during `Init`:

```go
//go:embed docs/*.md
var docsFS embed.FS

type InventoryModule struct {
    docs *docmw.DocStore
}

func (m *InventoryModule) Init(ctx context.Context) error {
    store, err := docmw.ParseFS("inventory", docsFS)
    if err != nil {
        return fmt.Errorf("parsing module docs: %w", err)
    }
    m.docs = store
    return nil
}

func (m *InventoryModule) MountRoutes(mux *http.ServeMux) error {
    // ... existing routes ...
    if m.docs != nil {
        m.docs.MountRoutes(mux)
    }
    return nil
}
```

### Manifest Hint

The manifest endpoint gets a `docs` hint, parallel to the existing
`reflection` hint:

```go
type AppManifestDocument struct {
    // ... existing fields ...
    Docs *AppManifestDocsHint `json:"docs,omitempty"`
}

type AppManifestDocsHint struct {
    Available bool   `json:"available"`
    URL       string `json:"url,omitempty"`
    Count     int    `json:"count,omitempty"`
}
```

The registry populates this automatically when a module has a non-nil
`DocStore`.

### Optional Interface

Alternatively, instead of having each module call `MountRoutes` itself,
define an optional interface that the registry detects:

```go
type DocumentableModule interface {
    DocStore() *docmw.DocStore
}
```

The registry checks for this interface just like it checks for
`ReflectiveAppBackendModule`, and mounts the docs routes automatically.
This keeps module code even simpler:

```go
func (m *InventoryModule) DocStore() *docmw.DocStore {
    return m.docs
}
```


## Launcher Aggregation

The launcher already has the module registry. At startup, after all
modules are initialized, it collects docs from every module that
implements `DocumentableModule` and from its own glazed help pages.

### Aggregation Endpoint

```
GET /api/os/docs
    ?query=...        simple substring search in title, summary, and content
    &topics=...       comma-separated topic filter (AND)
    &doc_type=...     filter by doc type
    &module=...       filter by module ID
```

Response:

```json
{
  "total": 15,
  "results": [
    {
      "slug": "inventory/api-reference",
      "module_id": "inventory",
      "title": "Inventory API Reference",
      "doc_type": "reference",
      "topics": ["inventory", "api"],
      "summary": "Complete reference for...",
      "url": "/api/apps/inventory/docs/api-reference"
    }
  ],
  "facets": {
    "topics": [{"slug": "api", "count": 4}, {"slug": "inventory", "count": 3}],
    "doc_types": [{"slug": "reference", "count": 5}, {"slug": "guide", "count": 3}],
    "modules": [{"id": "inventory", "count": 3}, {"id": "gepa", "count": 2}]
  }
}
```

### Including Glazed Help Pages

The launcher already embeds help pages via `go:embed`. These use glazed
help system frontmatter (slightly different from the `ModuleDoc` format).
The aggregation layer converts them:

```go
// Convert glazed help sections to ModuleDoc format
func helpSectionToModuleDoc(section glazed.HelpSection) ModuleDoc {
    return ModuleDoc{
        Slug:     section.Slug,
        Title:    section.Title,
        DocType:  mapSectionType(section.SectionType), // GeneralTopic→guide, Tutorial→tutorial
        Topics:   section.Topics,
        Summary:  section.Short,
        Content:  section.Content,
        ModuleID: "wesen-os", // launcher-level docs
    }
}
```

This way, the 5 help pages we've already written show up in the same
search results as module-specific documentation.

### Implementation

The aggregation endpoint is simple in-memory filtering. No database,
no FTS5, no external dependencies. The launcher builds a flat list of
all `ModuleDoc` entries at startup, and the endpoint filters and counts.

```go
type DocsIndex struct {
    All    []ModuleDoc
    BySlug map[string]*ModuleDoc // key: "module_id/slug"
}

func (idx *DocsIndex) Search(query, topics, docType, moduleID string) []ModuleDoc {
    // Simple loop with substring matching and tag filtering.
    // Good enough for 50-100 documents. Add FTS later if needed.
}

func (idx *DocsIndex) Facets() Facets {
    // Count topics, doc types, modules across all docs.
}
```


## Frontend Changes

### apps-browser Updates

The existing apps-browser module needs minimal changes:

1. **ModuleBrowserWindow**: Add a fourth column "Docs" next to Modules |
   APIs | Schemas. When a module with `docs.available` is selected,
   fetch its TOC and display doc titles. Clicking a doc shows the
   markdown content in the detail panel.

2. **GetInfoWindow**: Add a "Documentation" section listing doc titles
   with links to open them in the browser.

3. **BrowserDetailPanel**: Add a new `DocDetail` component that renders
   markdown content. Use an existing markdown renderer
   (`react-markdown` + `react-syntax-highlighter`).

### TypeScript Types

```typescript
interface ModuleDoc {
  slug: string;
  title: string;
  doc_type: string;
  topics?: string[];
  summary?: string;
  see_also?: string[];
  order?: number;
  content?: string;  // only present when fetching a single doc
  module_id?: string;
}

interface DocsSearchResponse {
  total: number;
  results: Array<ModuleDoc & { url: string }>;
  facets: {
    topics: Array<{ slug: string; count: number }>;
    doc_types: Array<{ slug: string; count: number }>;
    modules: Array<{ id: string; count: number }>;
  };
}
```

### RTK Query Endpoints

```typescript
// In appsApi.ts or a new docsApi.ts
getModuleDocs: builder.query<ModuleDoc[], string>({
  query: (appId) => `/api/apps/${appId}/docs`,
}),

getModuleDoc: builder.query<ModuleDoc, { appId: string; slug: string }>({
  query: ({ appId, slug }) => `/api/apps/${appId}/docs/${slug}`,
}),

searchDocs: builder.query<DocsSearchResponse, { query?: string; topics?: string; docType?: string; module?: string }>({
  query: (params) => ({
    url: '/api/os/docs',
    params,
  }),
}),
```


## File Layout

Where the code lives:

```
go-go-os-backend/
  pkg/
    docmw/                      ← NEW: reusable docs middleware
      docmw.go                  ParseFS, DocStore, MountRoutes
      docmw_test.go
      vocabulary.go             Vocabulary struct, default vocabulary
      vocabulary.yaml           Default doc types and topics
      aggregation.go            DocsIndex, Search, Facets

go-go-os-backend/
  pkg/backendhost/
    module.go                   ← MODIFY: add DocumentableModule interface
    manifest_endpoint.go        ← MODIFY: add docs hint to manifest
    docs_endpoint.go            ← NEW: aggregation endpoint registration

go-go-app-inventory/
  pkg/docs/                     ← NEW: embedded markdown files
    overview.md
    api-reference.md
    getting-started.md

go-go-os-frontend/
  apps/apps-browser/
    src/api/appsApi.ts          ← MODIFY: add docs query endpoints
    src/domain/types.ts         ← MODIFY: add ModuleDoc types
    src/components/
      DocDetail.tsx             ← NEW: markdown rendering component
      BrowserColumns.tsx        ← MODIFY: add Docs pane
      BrowserDetailPanel.tsx    ← MODIFY: add doc detail rendering
```


## Implementation Order

1. **`docmw` package** — ParseFS, DocStore, MountRoutes, vocabulary.
   Test with a few sample .md files. (~1 day)

2. **Wire into one module** — Add `docs/` directory to inventory module,
   embed it, implement DocumentableModule. Verify the per-module
   endpoints work. (~half day)

3. **Manifest hint** — Add `docs` hint to the manifest endpoint so the
   frontend knows which modules have docs. (~1 hour)

4. **Aggregation endpoint** — Collect all module docs + help pages into
   DocsIndex, serve the search/facets endpoint. (~half day)

5. **Frontend: DocDetail component** — Markdown renderer with syntax
   highlighting. (~half day)

6. **Frontend: wire into apps-browser** — Add Docs column, doc detail
   rendering, search integration. (~1 day)

Total: ~4 days of focused work for a working end-to-end system.


## What This Doesn't Do (Yet)

- No live/evaluable examples (just code blocks)
- No full-text search (substring matching is fine for <100 docs)
- No cross-link resolution (see_also values are just strings for now)
- No validation CLI (add `docmw doctor` later if needed)
- No frontend module metadata (that's a separate concern)
- No versioning (docs match the running binary, that's enough)

These are all reasonable additions later but not needed for the first
version.
