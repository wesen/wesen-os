---
Title: Rich App Documentation System — Design Exploration
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
      Note: Current reflection contract types (ModuleReflectionDocument, ReflectionDocLink, etc.)
    - Path: /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/manifest_endpoint.go
      Note: Current manifest + reflection HTTP endpoints
    - Path: /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/apps/apps-browser/src/domain/types.ts
      Note: Frontend TypeScript types mirroring backend reflection
    - Path: /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx
      Note: Current reflection detail panel in Module Browser
    - Path: /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/apps/apps-browser/src/components/GetInfoWindow.tsx
      Note: Current Get Info window showing module metadata
    - Path: /home/manuel/code/wesen/corporate-headquarters/docmgr/pkg/models/document.go
      Note: docmgr metadata model (Document, Vocabulary, RelatedFile)
    - Path: /home/manuel/code/wesen/corporate-headquarters/docmgr/internal/httpapi/server.go
      Note: docmgr HTTP API (search, facets, ticket graph)
ExternalSources: []
Summary: >-
    Design exploration for a rich, Mathematica-inspired documentation system
    for wesen-os app modules. Covers the current state (manifest + reflection
    endpoints, apps-browser frontend), studies Wolfram's documentation center
    as an aspirational model, then explores five concrete approaches: extending
    the reflection contract, adding a per-module docs endpoint, embedding
    docmgr-style metadata, creating a unified app profile document, and
    building a documentation center frontend. Includes data models, endpoint
    designs, frontend component sketches, and a recommended phased plan.
LastUpdated: 2026-03-01T11:25:24.686058664-05:00
WhatFor: >-
    Guide the design and implementation of a rich documentation system for
    wesen-os app modules, replacing the current minimal reflection metadata
    with something closer to Wolfram Mathematica's documentation center.
WhenToUse: >-
    When planning work on the apps-browser documentation features, the
    reflection contract, or any module's self-documentation capabilities.
---

## Motivation

Every wesen-os app module today can expose two tiers of metadata: a manifest
(identity, health, capabilities) and an optional reflection document (APIs,
schemas, doc links). The apps-browser frontend renders this information in a
three-column browser and a Get Info dialog. It works, but the experience is
closer to viewing a package.json than reading documentation.

The goal is to move toward something richer — a documentation system where
opening an app module feels like opening a Wolfram Mathematica documentation
page. Not just field names and HTTP paths, but explanatory prose, live
examples, cross-linked concepts, visual diagrams, and structured navigation
across the entire module ecosystem.

This document explores what that system could look like, studying both the
Wolfram documentation center as an aspirational model and the docmgr metadata
system as a practical foundation already present in our tooling.


## The Wolfram Mathematica Documentation Model

Wolfram's documentation center is widely regarded as one of the best
software documentation systems ever built. Every symbol (function, constant,
option) has a reference page with a highly consistent structure. Beyond
individual reference pages, the documentation center organizes knowledge
into three tiers: reference pages, guide pages, and tutorials.

### Reference Pages

Each function gets a structured page with these sections:

- **Usage block** — Syntax patterns with brief descriptions, color-coded
  argument placeholders, and type annotations.
- **Details and Options** — Prose paragraphs explaining behavior, edge
  cases, option names and defaults, and mathematical foundations.
- **Examples** — Subdivided into Basic Examples, Scope (showing the range
  of inputs), Options (one subsection per option), Applications (real-world
  usage), Properties & Relations (connections to other functions), and
  Neat Examples (impressive one-liners). Every example is a live,
  evaluable cell with visible output.
- **See Also** — Cross-links to related symbols, grouped by relationship
  type (similar functions, inverse operations, generalizations).
- **Tech Notes** — Links to deeper mathematical or algorithmic background.
- **History** — When the symbol was introduced, which version changed it.

The key insight is that every section serves a different reader need:
the usage block for quick recall, Details for deep understanding, Examples
for learning by doing, See Also for navigation, and History for
compatibility decisions.

### Guide Pages

Guide pages group related functions by topic — "Machine Learning",
"String Manipulation", "Graph & Network Operations". Each guide page
contains:

- A paragraph overview of the topic area
- Categorized lists of symbols with one-line descriptions
- Links to relevant tutorials
- Cross-links to other guide pages

Guide pages serve as the entry point for topic-based exploration. A
developer who doesn't know the function name starts here, scans the
categorized list, and drills into reference pages.

### Tutorial Pages

Tutorials are narrative documents that walk through a complete workflow:
"Introduction to Machine Learning", "Working with Images". They combine
prose, evaluable examples, and cross-links to both reference and guide
pages. Tutorials tell a story; reference pages state facts.

### The Documentation Center Browser

The documentation center itself is a structured navigation interface:

- **Search** — Full-text search across all pages, with result snippets
  and faceted filtering by page type and topic.
- **Hierarchical navigation** — A tree of guide pages organized by
  domain, drilling down to reference pages.
- **Cross-links everywhere** — Every symbol mention in prose is a
  clickable link to its reference page. Every reference page links
  back to its parent guide pages.
- **Consistent visual design** — Color coding for page types (orange
  for reference, blue for guide, green for tutorial), consistent
  section ordering, and a uniform header with breadcrumbs.

### What Makes It Work

The Wolfram system works because of three properties:

1. **Structured consistency** — Every page of the same type has the same
   sections in the same order. Readers build spatial memory: "Examples
   are always below Details." This reduces cognitive load.

2. **Dense cross-linking** — Every page links to related pages. The
   documentation becomes a navigable graph rather than a flat list.
   Discovery happens through navigation, not just search.

3. **Live examples** — Examples aren't screenshots or code blocks; they
   are evaluable expressions with visible output. The reader can modify
   an example and see what happens. This makes the documentation a
   learning environment, not just a reference shelf.


## What wesen-os Has Today

### Backend Manifest (Tier 1)

Every `AppBackendModule` exposes a manifest via `GET /api/os/apps`:

```go
type AppBackendManifest struct {
    AppID        string   `json:"app_id"`
    Name         string   `json:"name"`
    Description  string   `json:"description,omitempty"`
    Required     bool     `json:"required,omitempty"`
    Capabilities []string `json:"capabilities,omitempty"`
}
```

The manifest endpoint augments this with health status and a reflection
hint. This is analogous to a function's signature — name, arity, basic
type information. It answers "what is this?" but not "how do I use it?"

### Backend Reflection (Tier 2)

Modules that implement `ReflectiveAppBackendModule` expose richer metadata
via `GET /api/os/apps/{id}/reflection`:

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

This provides API listings with method/path/summary, schema references,
capability descriptions with stability levels, and documentation links.
In Wolfram terms, this is roughly equivalent to the usage block and the
See Also section — structured metadata about what exists, without the
explanatory prose, examples, or cross-linking.

### Frontend: apps-browser

The `apps-browser` module provides four window types:

1. **AppsFolderWindow** — Icon grid for launching apps (analogous to the
   Mathematica documentation center's home page, but with no search or
   categorization).
2. **ModuleBrowserWindow** — Three-column Finder: Modules | APIs | Schemas
   with a detail panel. This is the closest thing to a documentation
   browser, but it displays raw metadata fields rather than rich content.
3. **GetInfoWindow** — A compact dialog showing manifest fields, health
   status, API list, doc links, and schema chips.
4. **HealthDashboardWindow** — Operational health overview.

### Gaps

Compared to the Wolfram model, wesen-os is missing:

| Wolfram Concept          | wesen-os Equivalent           | Gap                                     |
|--------------------------|-------------------------------|-----------------------------------------|
| Reference page           | Reflection document           | No prose, no examples, no cross-links   |
| Guide page               | (nothing)                     | No topic-based grouping of modules      |
| Tutorial                 | glazed help pages             | Not integrated with apps-browser        |
| Live examples            | (nothing)                     | No evaluable/runnable examples          |
| Structured sections      | Ad-hoc JSON fields            | No consistent page template             |
| Cross-linking            | `ReflectionDocLink`           | Links exist but nothing renders them    |
| Full-text search         | (nothing)                     | No search across module documentation   |
| Navigation hierarchy     | Flat module list              | No categorization or breadcrumbs        |
| Visual consistency       | Raw field display             | No page-type design system              |
| History/changelog        | (nothing)                     | No version history for APIs or modules  |


## The docmgr Metadata System

Before exploring design approaches, it is worth understanding the
documentation management system already present in the project's tooling.
The `docmgr` CLI organizes documents into ticket workspaces with YAML
frontmatter metadata:

```yaml
Title: API Design for User Service
Ticket: MEN-3475
Status: active
Topics: [api, architecture]
DocType: design-doc
Intent: long-term
Owners: [alice]
Summary: "Brief summary of the document's content"
WhatFor: "Who this document serves and why"
WhenToUse: "When a reader should consult this document"
RelatedFiles:
  - Path: backend/api/user.go
    Note: Main API implementation
```

Key features of docmgr's metadata model:

- **Controlled vocabulary** — Topics, doc types, statuses, and intents
  are drawn from a vocabulary file. This ensures consistency across
  documents and enables faceted search.
- **Related files** — Bidirectional links between documents and source
  code, with human-readable notes explaining the relationship.
- **Full-text search** — An FTS5-backed search index with snippet
  extraction, filterable by topic, doc type, status, ticket, date
  range, and related file path.
- **HTTP API** — A REST API serving search, faceted navigation, ticket
  graphs, document content, and workspace metadata.
- **Ticket graph** — Mermaid-renderable graphs showing relationships
  between documents and source files within a ticket workspace.
- **Validation** — A `doctor` command that checks frontmatter quality,
  finds stale documents, and suggests fixes.

The docmgr model provides something Wolfram has but our reflection system
lacks: a vocabulary-controlled, searchable, cross-linked document store
with rich metadata. The question is how to bring these properties into
the runtime module documentation system.


## Design Approaches

### Approach A: Extend the Reflection Contract

The simplest approach is to add richer fields to the existing
`ModuleReflectionDocument`:

```go
type ModuleReflectionDocument struct {
    // ... existing fields ...

    // New documentation fields
    LongDescription string              `json:"long_description,omitempty"`
    GettingStarted  string              `json:"getting_started,omitempty"`
    Guides          []ModuleGuide       `json:"guides,omitempty"`
    Examples        []ModuleExample     `json:"examples,omitempty"`
    Events          []ModuleEvent       `json:"events,omitempty"`
    Intents         []ModuleIntent      `json:"intents,omitempty"`
    HyperCardStacks []StackDescriptor   `json:"hypercard_stacks,omitempty"`
    FrontendInfo    *FrontendModuleInfo `json:"frontend_info,omitempty"`
    Changelog       []ChangelogEntry    `json:"changelog,omitempty"`
    SeeAlso         []SeeAlsoLink       `json:"see_also,omitempty"`
    Topics          []string            `json:"topics,omitempty"`
}

type ModuleGuide struct {
    ID       string `json:"id"`
    Title    string `json:"title"`
    Summary  string `json:"summary,omitempty"`
    Content  string `json:"content"` // Markdown
    Order    int    `json:"order,omitempty"`
}

type ModuleExample struct {
    ID          string `json:"id"`
    Title       string `json:"title"`
    Description string `json:"description,omitempty"`
    Category    string `json:"category,omitempty"` // basic, scope, application, advanced
    Code        string `json:"code"`
    Language    string `json:"language,omitempty"` // curl, typescript, go
    Output      string `json:"output,omitempty"`
}

type ModuleEvent struct {
    ID          string `json:"id"`
    Type        string `json:"type"`   // e.g., "hypercard.card.v2"
    Channel     string `json:"channel,omitempty"` // ws, sse
    Description string `json:"description,omitempty"`
    PayloadSchema string `json:"payload_schema,omitempty"`
}

type ModuleIntent struct {
    ID          string `json:"id"`
    Action      string `json:"action"` // e.g., "inventory/updateQty"
    Scope       string `json:"scope,omitempty"` // app, global, card
    Description string `json:"description,omitempty"`
    PayloadSchema string `json:"payload_schema,omitempty"`
}

type StackDescriptor struct {
    ID             string   `json:"id"`
    Name           string   `json:"name"`
    Description    string   `json:"description,omitempty"`
    Cards          []string `json:"cards,omitempty"`
    CapabilityPolicy string `json:"capability_policy,omitempty"`
}

type FrontendModuleInfo struct {
    Icon          string   `json:"icon,omitempty"`
    LaunchMode    string   `json:"launch_mode,omitempty"` // window, singleton, folder
    DesktopOrder  int      `json:"desktop_order,omitempty"`
    WindowTypes   []string `json:"window_types,omitempty"`
    SharedReducers []string `json:"shared_reducers,omitempty"`
    Commands      []string `json:"commands,omitempty"`
    StateKey      string   `json:"state_key,omitempty"`
}

type ChangelogEntry struct {
    Version     string `json:"version"`
    Date        string `json:"date,omitempty"`
    Description string `json:"description"`
    Breaking    bool   `json:"breaking,omitempty"`
}

type SeeAlsoLink struct {
    Target      string `json:"target"` // app_id or doc slug
    Kind        string `json:"kind"`   // related, inverse, generalization, prerequisite
    Description string `json:"description,omitempty"`
}
```

**Advantages:**

- No new endpoints or infrastructure needed
- Frontend already fetches reflection; richer data just renders more
- Each module remains self-contained — its documentation ships with its code
- Straightforward to implement incrementally (add fields one at a time)

**Disadvantages:**

- Reflection response grows very large for well-documented modules
- Markdown content in JSON is awkward to edit and version
- No shared vocabulary enforcement across modules
- No cross-module search without fetching all reflections
- Every module must implement the interface in Go code; prose in string
  literals is uncomfortable

**Wolfram parallel:** This is like embedding the entire reference page
as a JSON document served by the function itself. Wolfram doesn't do
this — their documentation is external to the language runtime.


### Approach B: Per-Module Docs Endpoint

Add a standardized documentation endpoint convention where each module
serves its own documentation as structured markdown files:

```
GET /api/apps/{id}/docs              → list of doc pages
GET /api/apps/{id}/docs/{slug}       → single doc page (markdown + frontmatter)
GET /api/apps/{id}/docs/{slug}/raw   → raw markdown content
```

The list endpoint returns a table of contents:

```json
{
  "app_id": "inventory",
  "pages": [
    {
      "slug": "overview",
      "title": "Inventory Module Overview",
      "doc_type": "guide",
      "summary": "Architecture and concepts for the inventory module",
      "order": 1,
      "topics": ["inventory", "backend"]
    },
    {
      "slug": "api-reference",
      "title": "API Reference",
      "doc_type": "reference",
      "order": 2,
      "topics": ["inventory", "api"]
    },
    {
      "slug": "getting-started",
      "title": "Getting Started with Inventory",
      "doc_type": "tutorial",
      "order": 3,
      "topics": ["inventory", "onboarding"]
    }
  ]
}
```

The single-page endpoint returns frontmatter metadata plus rendered
content:

```json
{
  "slug": "overview",
  "title": "Inventory Module Overview",
  "doc_type": "guide",
  "topics": ["inventory", "backend"],
  "content_markdown": "## Architecture\n\nThe inventory module...",
  "see_also": [
    {"target": "inventory/api-reference", "kind": "related"},
    {"target": "gepa/overview", "kind": "related"}
  ],
  "related_files": [
    {"path": "go-go-app-inventory/pkg/inventory/module.go", "note": "Module implementation"}
  ]
}
```

Implementation: modules embed markdown files using `go:embed` (just like
the glazed help system) and mount a docs handler:

```go
//go:embed docs/*.md
var docsFS embed.FS

func (m *InventoryModule) MountRoutes(mux *http.ServeMux) error {
    // ... existing routes ...
    docmw.MountModuleDocs(mux, m.Manifest().AppID, docsFS)
    return nil
}
```

The `docmw` package provides a reusable handler that parses frontmatter,
builds the TOC, and serves individual pages. It enforces a consistent
metadata schema (matching the docmgr vocabulary model).

**Advantages:**

- Documentation lives as markdown files alongside module code
- Authors use their editor, not Go string literals
- Each page has structured metadata (topics, doc type, see also)
- Pages can be large (guides, tutorials) without bloating the reflection
  response
- Natural parallel to the glazed help system (same go:embed pattern)
- Reusable `docmw` middleware means consistency across modules

**Disadvantages:**

- Every module needs to opt in and embed docs
- Cross-module search requires aggregating docs from multiple endpoints
- More HTTP endpoints to maintain
- Markdown rendering happens on the frontend (needs a markdown renderer
  component)

**Wolfram parallel:** This is closest to how Wolfram actually works —
documentation is external to the function but associated with it by
convention. The documentation browser fetches pages on demand.


### Approach C: docmgr-Style Metadata in the Runtime

Bring the docmgr metadata model directly into the runtime. Instead of
ad-hoc JSON fields, use the same controlled vocabulary, structured
frontmatter, and relationship model that docmgr uses for ticket
documentation.

The idea is that the wesen-os launcher runs a lightweight embedded
docmgr workspace at startup. Each module registers its documentation
pages into this workspace. The launcher then serves docmgr's HTTP API
(search, facets, ticket graph) alongside the existing app APIs.

```
GET /api/os/docs/search?query=...&topics=...   → docmgr-style search
GET /api/os/docs/facets                         → available topics, doc types
GET /api/os/docs/get?path=...                   → single document
GET /api/os/docs/graph?ticket=...               → relationship graph
```

Each module contributes docs to the workspace:

```go
type DocumentableModule interface {
    Documents() []DocContribution
}

type DocContribution struct {
    Slug     string
    Metadata models.Document  // docmgr's Document struct
    Content  string           // Markdown body
}
```

At startup, the launcher collects all contributions, builds an in-memory
docmgr workspace, indexes it, and serves the docmgr HTTP API.

**Advantages:**

- Unified search across all module documentation
- Controlled vocabulary ensures consistent tagging
- Full docmgr feature set: faceted search, related file tracking,
  staleness detection, ticket graph visualization
- The frontend can reuse docmgr's existing HTTP API client patterns
- Documentation quality can be validated with `docmgr doctor`

**Disadvantages:**

- Significant infrastructure: embedded workspace, in-memory index,
  additional HTTP endpoints
- Modules must depend on the docmgr models package
- The docmgr model is designed for project-level documentation, not
  runtime module metadata — some fields (Ticket, Owners, Status) don't
  map cleanly to runtime docs
- Heavier runtime footprint (FTS5 index in memory)

**Wolfram parallel:** This is like having the Wolfram documentation center
be a first-class part of the kernel, indexed and searchable at runtime.
Wolfram actually does something similar — the documentation center is
built into the application, not a separate website.


### Approach D: Unified App Profile Document

Create a single, comprehensive "app profile" document type that merges
all information about a module — backend, frontend, HyperCard, events,
documentation — into one structured descriptor. This is less about
serving prose documentation and more about creating a complete,
machine-readable module specification.

```go
type AppProfile struct {
    // Identity
    AppID       string `json:"app_id"`
    Name        string `json:"name"`
    Version     string `json:"version,omitempty"`
    Icon        string `json:"icon,omitempty"`
    Description string `json:"description,omitempty"`

    // Classification
    Topics       []string `json:"topics,omitempty"`
    Categories   []string `json:"categories,omitempty"`
    Stability    string   `json:"stability,omitempty"`

    // Backend
    Backend *BackendProfile `json:"backend,omitempty"`

    // Frontend
    Frontend *FrontendProfile `json:"frontend,omitempty"`

    // HyperCard
    HyperCard *HyperCardProfile `json:"hypercard,omitempty"`

    // Documentation pages (inline or by reference)
    Pages []PageRef `json:"pages,omitempty"`

    // Cross-links
    SeeAlso      []SeeAlsoLink `json:"see_also,omitempty"`
    DependsOn    []string      `json:"depends_on,omitempty"`
    UsedBy       []string      `json:"used_by,omitempty"`

    // History
    Changelog []ChangelogEntry `json:"changelog,omitempty"`
}

type BackendProfile struct {
    Required     bool                   `json:"required"`
    Healthy      bool                   `json:"healthy"`
    Capabilities []ReflectionCapability `json:"capabilities,omitempty"`
    APIs         []ReflectionAPI        `json:"apis,omitempty"`
    Schemas      []ReflectionSchemaRef  `json:"schemas,omitempty"`
    Events       []ModuleEvent          `json:"events,omitempty"`
    Intents      []ModuleIntent         `json:"intents,omitempty"`
}

type FrontendProfile struct {
    LaunchMode     string   `json:"launch_mode"`
    DesktopOrder   int      `json:"desktop_order,omitempty"`
    WindowTypes    []string `json:"window_types,omitempty"`
    Commands       []string `json:"commands,omitempty"`
    SharedReducers []string `json:"shared_reducers,omitempty"`
    StateKey       string   `json:"state_key,omitempty"`
    Contributions  []string `json:"contributions,omitempty"`
}

type HyperCardProfile struct {
    Stacks []StackDescriptor `json:"stacks,omitempty"`
    Intents []ModuleIntent   `json:"intents,omitempty"`
}

type PageRef struct {
    Slug    string `json:"slug"`
    Title   string `json:"title"`
    DocType string `json:"doc_type"` // reference, guide, tutorial, example
    Summary string `json:"summary,omitempty"`
    URL     string `json:"url,omitempty"`  // if served separately
    Inline  string `json:"inline,omitempty"` // if embedded as markdown
    Order   int    `json:"order,omitempty"`
}
```

Served from: `GET /api/os/apps/{id}/profile`

**Advantages:**

- Single request gives the frontend everything it needs to render a
  complete app page
- Captures backend + frontend + HyperCard in one document
- The `PageRef` array references documentation pages without embedding
  their full content (lazy loading)
- Naturally maps to the Wolfram reference page structure: identity at
  top, capabilities as "Details", APIs as "Functions", examples
  referenced by page, see also at bottom

**Disadvantages:**

- Large new contract that every module must implement
- Duplicates some information from manifest and reflection
- Frontend info must somehow be communicated from TypeScript to Go
  (or the profile must be assembled by the composition root)
- Inline documentation in a JSON document is still awkward

**Wolfram parallel:** This is the closest to the actual Wolfram internal
representation — a structured document that the documentation center
renders. The difference is that Wolfram's internal format is not exposed
as an API; it's compiled into the notebook system.


### Approach E: Documentation Center as a Frontend App

Instead of serving documentation through module APIs, build a dedicated
"Documentation Center" frontend app that aggregates and renders
documentation from multiple sources:

1. **Module manifests and reflections** (existing endpoints)
2. **Glazed help pages** (the 5 docs we've written, served via a new endpoint)
3. **Module doc pages** (if Approach B is adopted)
4. **External markdown** (project READMEs, design docs from ttmp/)

The Documentation Center app would be a new `LaunchableAppModule` with:

- A search bar with full-text search and faceted filtering
- A navigation sidebar with categorized page links (by topic, by module,
  by page type)
- A main content area that renders markdown pages with:
  - Consistent section structure and visual design
  - Syntax-highlighted code blocks
  - Inline cross-links that navigate within the documentation center
  - Collapsible example sections
  - API endpoint cards with "Try It" buttons
  - Schema viewers with expand/collapse
- Breadcrumb navigation showing the current page's position in the
  hierarchy

The documentation center doesn't require any backend changes — it
consumes existing endpoints. But it benefits enormously from richer
backend metadata (Approaches A-D).

```
Documentation Center Architecture:

  +-----------------------------------------+
  |          Documentation Center            |
  |  +----------+  +-----------------------+ |
  |  | Sidebar  |  | Content Area          | |
  |  |          |  |                       | |
  |  | Search   |  | [Breadcrumbs]         | |
  |  | -----    |  |                       | |
  |  | Topics   |  | # Module Name         | |
  |  |  > api   |  |                       | |
  |  |  > arch  |  | Description and       | |
  |  |  > ...   |  | overview prose...     | |
  |  |          |  |                       | |
  |  | Modules  |  | ## APIs               | |
  |  |  > inv   |  | GET /items            | |
  |  |  > gepa  |  | POST /items           | |
  |  |  > arc   |  |                       | |
  |  |          |  | ## Examples            | |
  |  | Guides   |  | ```bash               | |
  |  |  > ops   |  | curl /api/apps/...    | |
  |  |  > dev   |  | ```                   | |
  |  |          |  |                       | |
  |  | Tutorials|  | ## See Also           | |
  |  |  > build |  | > gepa-module         | |
  |  |  > hyper |  | > backend-dev-guide   | |
  |  +----------+  +-----------------------+ |
  +-----------------------------------------+
```

**Data sources the Documentation Center consumes:**

```
  +------------------+     +------------------+     +------------------+
  | /api/os/apps     |     | /api/os/help     |     | /api/apps/{id}/  |
  | (manifests)      |     | (glazed help     |     |   docs/{slug}    |
  |                  |     |  pages)          |     | (module docs)    |
  +--------+---------+     +--------+---------+     +--------+---------+
           |                        |                        |
           +------------------------+------------------------+
                                    |
                        +-----------v-----------+
                        |  Documentation Center |
                        |  (aggregation layer)  |
                        +-----------+-----------+
                                    |
                        +-----------v-----------+
                        |   Unified Doc Index   |
                        |   (client-side or     |
                        |    server-side FTS)   |
                        +-----------------------+
```

**Advantages:**

- Best user experience — a purpose-built documentation browser
- Can aggregate documentation from heterogeneous sources
- Frontend-only changes for the initial version
- Incrementally adoptable: starts with existing data, gets richer as
  modules add more documentation
- Natural place to add search, navigation, and visual consistency

**Disadvantages:**

- Significant frontend engineering effort
- Requires a markdown renderer component (though many exist)
- Without richer backend data, the documentation center is just a
  fancy skin over the existing minimal metadata
- Client-side search has limits; may need a server-side aggregation
  endpoint eventually

**Wolfram parallel:** This is exactly the Documentation Center — a
dedicated UI application whose sole purpose is navigating and
displaying documentation. It's the right architectural choice, but it
needs rich content to display.


## Synthesis: A Recommended Approach

The five approaches are not mutually exclusive. They layer naturally:

```
Layer 5:  Documentation Center App (Approach E)
              |
Layer 4:  Aggregation endpoint (parts of C)
              |
Layer 3:  Per-module docs endpoint (Approach B)
              |
Layer 2:  Extended reflection + app profile (Approaches A + D)
              |
Layer 1:  Current manifest + reflection (what exists today)
```

The recommended plan implements these layers bottom-up across three
phases:

### Phase 1: Enrich the Backend Metadata (2-3 days)

1. **Extend `ModuleReflectionDocument`** with fields from Approach A
   that don't involve large prose blocks: `topics`, `events`, `intents`,
   `frontend_info`, `changelog`, `see_also`. This makes the existing
   Module Browser and Get Info windows immediately richer.

2. **Add a docs endpoint convention** (Approach B). Create a reusable
   `docmw` package in `go-go-os-backend` that:
   - Accepts an `embed.FS` of markdown files with docmgr-style frontmatter
   - Parses frontmatter and builds a TOC
   - Serves `GET /api/apps/{id}/docs` (TOC) and
     `GET /api/apps/{id}/docs/{slug}` (page content)
   - Enforces a shared vocabulary for `doc_type` and `topics`

3. **Implement docs for one module** (e.g., inventory) as a proof of
   concept. Write 3-4 pages: overview, API reference, getting started,
   and one example page.

### Phase 2: Build the Documentation Center Frontend (3-5 days)

1. **Create a `docs-center` app** in `go-go-os-frontend/apps/`. This
   is a new `LaunchableAppModule` registered in the launcher.

2. **Add a glazed help endpoint** to the launcher backend. The launcher
   already has help pages embedded via `go:embed`; add a simple endpoint
   (`GET /api/os/help`) that lists them and
   (`GET /api/os/help/{slug}`) that serves their content.

3. **Build the Documentation Center UI:**
   - Sidebar with search, topic tree, module list
   - Content area with markdown rendering (use `react-markdown` or
     `@mdx-js/mdx`)
   - Cross-link navigation (clicking a module name or doc slug navigates
     within the center)
   - Consistent page templates for different doc types

4. **Integrate existing data sources:**
   - Module manifests and reflections (existing)
   - Glazed help pages (new endpoint)
   - Module doc pages (from Phase 1)

### Phase 3: Deep Integration (ongoing)

1. **Add server-side doc aggregation** — A single endpoint that merges
   all module docs + help pages into a searchable index, supporting
   faceted search by topic, doc type, and module.

2. **Add live examples** — For API endpoints, add "Try It" buttons that
   send requests and display responses. For HyperCard stacks, add
   card preview/playground mode.

3. **Add dependency/cross-link graph** — Visualize relationships between
   modules, their APIs, shared schemas, and documentation pages.

4. **Add docmgr integration** — Allow the documentation center to
   display ttmp/ design docs and investigation diaries alongside
   module documentation, providing a unified view of both runtime
   and project documentation.


## Detailed Data Models

### Module Documentation Page (docmgr-compatible frontmatter)

Each module doc page is a markdown file with YAML frontmatter that
follows the docmgr model, extended with module-specific fields:

```yaml
---
Title: Inventory API Reference
ModuleID: inventory
DocType: reference
Topics: [inventory, api, backend]
Status: active
Summary: >-
  Complete reference for the inventory module's HTTP API endpoints,
  including request/response schemas and example payloads.
SeeAlso:
  - Target: inventory/overview
    Kind: related
    Description: Architecture and concepts
  - Target: gepa/api-reference
    Kind: related
    Description: Similar API patterns in GEPA
RelatedFiles:
  - Path: go-go-app-inventory/pkg/api/handlers.go
    Note: API handler implementations
  - Path: go-go-app-inventory/pkg/api/schemas.go
    Note: Request/response type definitions
Examples:
  - ID: list-items
    Title: List all items
    Category: basic
    Language: bash
    Code: |
      curl -s http://localhost:17851/api/apps/inventory/items | jq .
  - ID: create-item
    Title: Create a new item
    Category: basic
    Language: bash
    Code: |
      curl -X POST http://localhost:17851/api/apps/inventory/items \
        -H 'Content-Type: application/json' \
        -d '{"name": "Widget", "quantity": 10}'
Order: 2
---

## Endpoints

### GET /items

Returns all inventory items, optionally filtered by category.

**Parameters:**

| Name     | Type   | Required | Description              |
|----------|--------|----------|--------------------------|
| category | string | no       | Filter by item category  |
| limit    | int    | no       | Maximum results (default 50) |

**Response:**

...
```

### Vocabulary Extension

Add module-specific vocabulary entries to the controlled vocabulary:

```yaml
docTypes:
  - slug: reference
    description: API and type reference for a module
  - slug: guide
    description: Conceptual overview of a module or topic area
  - slug: tutorial
    description: Step-by-step walkthrough
  - slug: example
    description: Focused example with runnable code
  - slug: changelog
    description: Version history and breaking changes

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
    description: HyperCard runtime and card system
  - slug: api
    description: HTTP API endpoints
  - slug: events
    description: WebSocket events and SEM pipeline
  - slug: intents
    description: Intent routing system
  - slug: schemas
    description: JSON schemas and type definitions
```

### The `docmw` Package (Docs Middleware)

```go
package docmw

import (
    "embed"
    "net/http"
)

type Options struct {
    AppID     string
    FS        embed.FS
    PathRoot  string // directory within FS containing .md files
    Vocabulary *Vocabulary // optional shared vocabulary for validation
}

// MountModuleDocs registers two endpoints on the mux:
//   GET /api/apps/{appID}/docs       → JSON array of page descriptors
//   GET /api/apps/{appID}/docs/{slug} → JSON with page metadata + markdown content
func MountModuleDocs(mux *http.ServeMux, opts Options) {
    // Parse all .md files in opts.FS at startup
    // Build TOC sorted by Order field
    // Register handlers
}

type PageDescriptor struct {
    Slug    string   `json:"slug"`
    Title   string   `json:"title"`
    DocType string   `json:"doc_type"`
    Topics  []string `json:"topics,omitempty"`
    Summary string   `json:"summary,omitempty"`
    Order   int      `json:"order"`
}

type PageContent struct {
    PageDescriptor
    ContentMarkdown string      `json:"content_markdown"`
    SeeAlso         []SeeAlso   `json:"see_also,omitempty"`
    RelatedFiles    []RelatedFile `json:"related_files,omitempty"`
    Examples        []Example   `json:"examples,omitempty"`
}
```

### Documentation Center Aggregation Endpoint

```
GET /api/os/docs
    ?query=...          full-text search
    &topics=...         comma-separated topic filter
    &doc_type=...       page type filter
    &module=...         module ID filter
    &page_size=50
    &cursor=...

Response:
{
  "total": 42,
  "results": [
    {
      "slug": "inventory/api-reference",
      "module_id": "inventory",
      "title": "Inventory API Reference",
      "doc_type": "reference",
      "topics": ["inventory", "api"],
      "summary": "Complete reference for...",
      "snippet": "...matched text...",
      "source": "module-docs"  // or "help-page" or "design-doc"
    }
  ],
  "facets": {
    "topics": [{"slug": "api", "count": 12}, ...],
    "doc_types": [{"slug": "reference", "count": 8}, ...],
    "modules": [{"id": "inventory", "count": 5}, ...]
  },
  "next_cursor": "..."
}
```


## Frontend Component Design

### Page Templates

The Documentation Center renders different page types with consistent
but type-appropriate templates:

**Reference Page** (for a module overview or API reference):
```
+--------------------------------------------------+
| [icon] Module Name                    [badges]   |
| Topics: api, backend    Stability: stable        |
+--------------------------------------------------+
| ## Description                                   |
| Prose overview of the module...                  |
|                                                  |
| ## Capabilities                                  |
| | Capability | Stability | Description |        |
| |------------|-----------|-------------|        |
| | chat       | stable    | Chat API... |        |
|                                                  |
| ## API Endpoints                                 |
| +----------------------------------------------+ |
| | GET /items     List inventory items          | |
| | POST /items    Create a new item             | |
| | GET /items/:id Get item by ID                | |
| +----------------------------------------------+ |
|                                                  |
| ## Examples                                      |
| [Basic Examples]  [Scope]  [Applications]        |
| ```bash                                          |
| curl -s http://localhost:17851/api/apps/...      |
| ```                                              |
|                                                  |
| ## Events                                        |
| | Event Type | Channel | Description |           |
|                                                  |
| ## See Also                                      |
| > gepa-module  >  backend-dev-guide             |
+--------------------------------------------------+
```

**Guide Page** (for topic-based grouping):
```
+--------------------------------------------------+
| # Topic: Backend Development                     |
+--------------------------------------------------+
| Overview paragraph about backend development...  |
|                                                  |
| ## Core Concepts                                 |
| - AppBackendModule contract                      |
| - Module lifecycle (Init → Start → Stop)         |
| - Route mounting and reflection                  |
|                                                  |
| ## Modules                                       |
| +----------------------------------------------+ |
| | [icon] Inventory    Manage physical items    | |
| | [icon] GEPA         Optimization engine      | |
| | [icon] ARC-AGI      Puzzle player            | |
| +----------------------------------------------+ |
|                                                  |
| ## Related Guides                                |
| > Frontend Development  > HyperCard Runtime      |
+--------------------------------------------------+
```

**Tutorial Page** (for step-by-step narrative):
```
+--------------------------------------------------+
| # Tutorial: Building a Full App                  |
| Estimated time: 45 min    Prerequisites: [...]   |
+--------------------------------------------------+
| ## Introduction                                  |
| Narrative prose setting the scene...             |
|                                                  |
| ## Phase 1: Backend Module                       |
| Step-by-step instructions with code blocks,      |
| explanations, and expected outputs...            |
|                                                  |
| ## Phase 2: Frontend Module                      |
| ...                                              |
|                                                  |
| ## What You Built                                |
| Summary and next steps.                          |
+--------------------------------------------------+
```

### Markdown Rendering Requirements

The content area needs a markdown renderer that supports:

- Standard CommonMark (headings, lists, tables, code blocks, links)
- Syntax highlighting for Go, TypeScript, bash, JSON, YAML
- Custom components for:
  - **API cards** — Styled method + path + summary blocks
  - **Cross-links** — `[[module:inventory]]` or `[[doc:backend-developer-guide]]`
    syntax that renders as navigable links within the documentation center
  - **Collapsible sections** — For long example outputs
  - **Schema viewers** — Inline JSON schema rendering with expand/collapse
  - **Admonitions** — Note, Warning, Tip callouts
  - **Mermaid diagrams** — Inline diagram rendering for architecture visuals


## Open Questions

1. **Where does frontend module metadata come from?** The reflection
   system is backend-only. Frontend manifest information (icon, launch
   mode, commands, contributions) lives in TypeScript. Options:
   (a) The composition root (wesen-os) generates a static frontend
   manifest at build time; (b) the Documentation Center reads it
   directly from the TypeScript module objects at runtime;
   (c) module authors duplicate the info in backend reflection.

2. **Should documentation be versioned?** If modules evolve, old
   documentation may not match the running version. Should the docs
   endpoint include version information? Should there be a
   "documentation version matches binary version" check?

3. **How should cross-module links resolve?** If the inventory module's
   docs reference the GEPA module, how does the link resolve? By
   convention (`gepa/overview`)? By a central registry? What happens
   if the target module isn't loaded?

4. **Client-side vs server-side search?** For a small number of modules
   (5-10), client-side search (fetching all TOCs and indexing in the
   browser) works fine. At scale, server-side search is needed. When
   to make that transition?

5. **Should the Documentation Center be a separate app or built into
   the apps-browser?** The apps-browser already has module browsing.
   Adding documentation rendering there might be more natural than
   creating a separate app. But it also makes the apps-browser much
   more complex.

6. **How do HyperCard cards document themselves?** Cards are JavaScript
   running in a QuickJS sandbox. They can't embed markdown files. Should
   card documentation live in the host module's docs, or should cards
   have their own lightweight metadata format?

7. **What role does the assistant play?** The assistant already generates
   HyperCard cards dynamically. Could it also generate documentation
   pages dynamically? A "explain this module" intent that produces a
   formatted documentation page could be powerful.


## Comparison Matrix

| Property                  | A: Extend Reflection | B: Docs Endpoint | C: docmgr Runtime | D: App Profile | E: Docs Center |
|---------------------------|---------------------|-------------------|--------------------|--------------------|----------------|
| Backend changes           | Small               | Medium            | Large              | Medium             | None (initially)|
| Frontend changes          | Small               | Medium            | Medium             | Medium             | Large          |
| Rich prose content        | Awkward (JSON)      | Natural (MD)      | Natural (MD)       | Awkward (JSON)     | Renders MD     |
| Cross-module search       | No                  | No (per-module)   | Yes                | No                 | Yes (client)   |
| Controlled vocabulary     | No                  | Optional          | Yes                | No                 | Aggregated     |
| Live examples             | No                  | No                | No                 | No                 | Possible       |
| Frontend module info      | Yes (if populated)  | No                | Possible           | Yes                | Aggregated     |
| Incremental adoption      | Easy                | Easy              | Hard (all-or-none) | Medium             | Easy           |
| Wolfram-like experience   | Low                 | Medium            | Medium-High        | Medium             | High           |


## Next Steps

- [ ] Review this design document and choose which approaches to pursue
- [ ] Prototype the `docmw` package (Approach B) as a reusable Go middleware
- [ ] Write documentation pages for the inventory module as a proof of concept
- [ ] Build a basic Documentation Center window in apps-browser (Approach E, minimal)
- [ ] Add a glazed help pages endpoint to the launcher backend
- [ ] Extend `ModuleReflectionDocument` with topics, events, see_also (Approach A)
- [ ] Design the cross-link resolution convention
- [ ] Evaluate markdown rendering libraries for the frontend
