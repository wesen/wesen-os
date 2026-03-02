---
Title: Doc Browser UI — Screen Designs and Feature Specification
Ticket: OS-03
Status: active
Topics:
    - documentation
    - frontend
    - apps-browser
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-backend/pkg/docmw/docmw.go
      Note: |-
        Backend doc store, parser, and per-module HTTP handlers
        Backend doc store and HTTP handlers
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts
      Note: |-
        RTK Query endpoints for docs (getOSDocs, getModuleDocs, getModuleDoc)
        RTK Query endpoints for docs
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/GetInfoWindow.tsx
      Note: |-
        Current docs display in Get Info dialog (links to raw JSON)
        Current docs display in Get Info dialog
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx
      Note: Current three-column module browser (reflection-focused, no docs integration)
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/domain/types.ts
      Note: |-
        Frontend TypeScript types for docs API responses (OSDocsResponse, ModuleDocDocument, etc.)
        Frontend TypeScript types for docs API responses
    - Path: workspaces/2026-03-01/add-os-doc-browser/wesen-os/cmd/wesen-os-launcher/docs_endpoint.go
      Note: |-
        Backend aggregate docs endpoint with faceted filtering
        Backend aggregate docs endpoint
    - Path: workspaces/2026-03-01/add-os-doc-browser/wesen-os/pkg/doc/topics/05-backend-documentation-system.md
      Note: Backend documentation system guide (data contracts, endpoint inventory)
ExternalSources: []
Summary: Complete UI design for a dedicated Documentation Browser in wesen-os. Covers five screens (Doc Center Home, Search & Filter, Module Docs, Doc Reader, Topic Browser) with ASCII wireframes, feature inventories, API mappings, data structures, component architecture, and a phased implementation plan. Builds on the OS-02 backend docs system.
LastUpdated: 2026-03-01T14:30:49.057646363-05:00
WhatFor: Blueprint for implementing the documentation browser frontend. Read this before writing UI code. The ASCII sketches show layout, the feature tables show behavior, and the API sections show data flow.
WhenToUse: When implementing any of the five doc browser screens, designing the component tree, or adding new docs-related features to the apps-browser frontend.
---


# Doc Browser UI — Screen Designs and Feature Specification

## Executive Summary

The OS-02 ticket delivered a complete backend documentation system: per-module
doc stores, HTTP endpoints, manifest hints, and an aggregate search/filter
endpoint. The frontend currently surfaces docs only as metadata in the Get
Info dialog (linking to raw JSON endpoints) and has no way to read, search,
or browse documentation.

This design specifies a dedicated Documentation Browser — a new window type
in the apps-browser that provides five interconnected screens:

1. **Doc Center Home** — landing page with module cards, topic groups, and search
2. **Search & Filter** — full-text search with faceted sidebar filtering
3. **Module Docs** — all documentation for a single module, grouped by doc type
4. **Doc Reader** — full-page rendered markdown with navigation and cross-links
5. **Topic Browser** — cross-module exploration organized by topic tags

Each screen is designed around the existing backend APIs (`/api/os/docs`,
`/api/apps/{id}/docs`, `/api/apps/{id}/docs/{slug}`) and the existing RTK
Query layer. No backend changes are required for the initial implementation.

The design takes inspiration from Wolfram's Documentation Center (structured
navigation tiers, cross-linking, consistent page layout) while staying
practical for the current doc corpus size (~11 pages across 3 modules).

## Problem Statement

The backend documentation system built in OS-02 produces structured, typed,
searchable module documentation. But the frontend has no way to use it:

- **GetInfoWindow** lists doc titles with links to raw JSON API endpoints.
  A user clicking "Inventory API Reference" sees `{"module_id":"inventory",
  "slug":"api-reference", ...}` — not rendered documentation.

- **ModuleBrowserWindow** is focused on reflection (APIs and schemas). It
  has no docs column, no docs detail view, and no way to navigate from
  an API endpoint to its related documentation.

- **There is no search UI.** The aggregate `/api/os/docs` endpoint supports
  query text, topic filtering, doc type filtering, and module filtering,
  but no frontend component consumes it.

- **There is no cross-module navigation.** The `see_also` field in each doc
  page supports cross-linking between modules, but nothing renders those
  links or enables topic-based browsing.

The result: module documentation exists and is served over HTTP, but the only
way to read it is `curl` or a browser pointed at the JSON endpoint.


## Available Backend APIs

Before designing screens, here is the complete inventory of endpoints and
their response shapes. All of these exist and are tested.

### Manifest (docs hints)

```
GET /api/os/apps
```

Each app in the response may include:

```typescript
docs?: {
  available: boolean;
  url?: string;      // e.g. "/api/apps/inventory/docs"
  count?: number;    // e.g. 4
  version?: string;  // e.g. "v1"
}
```

### Module Docs TOC

```
GET /api/apps/{id}/docs
```

Response:

```typescript
{
  module_id: string;
  docs: Array<{
    module_id: string;
    slug: string;
    title: string;
    doc_type: string;
    topics?: string[];
    summary?: string;
    see_also?: string[];
    order?: number;
    // content is OMITTED in TOC responses
  }>;
}
```

### Single Doc Page

```
GET /api/apps/{id}/docs/{slug}
```

Response: Full `ModuleDocDocument` including `content` (markdown body).

### Aggregate Docs (cross-module search)

```
GET /api/os/docs?query=...&topics=...&doc_type=...&module=...
```

Response:

```typescript
{
  total: number;
  results: Array<{
    module_id: string;
    slug: string;
    title: string;
    doc_type: string;
    topics?: string[];
    summary?: string;
    url: string;  // e.g. "/api/apps/inventory/docs/overview"
  }>;
  facets: {
    topics:    Array<{ slug: string; count: number }>;
    doc_types: Array<{ slug: string; count: number }>;
    modules:   Array<{ id: string; count: number }>;
  };
}
```

### Existing RTK Query Hooks

```typescript
useGetAppsQuery()                          // manifest with docs hints
useGetModuleDocsQuery(appId)               // module TOC
useLazyGetModuleDocQuery()                 // single page (lazy)
useGetOSDocsQuery(query)                   // aggregate search
```


## Current Module Documentation Corpus

Understanding the actual content helps inform layout decisions.

| Module    | Docs | Doc Types                    | Topics                                     |
|-----------|------|------------------------------|---------------------------------------------|
| inventory | 4    | guide, reference             | backend, inventory, api, onboarding, profiles, troubleshooting |
| arc-agi   | 4    | guide, reference             | backend, onboarding, runtime, api, sessions |
| gepa      | 3    | guide, reference             | backend, onboarding, scripts, api           |

Total: 11 doc pages across 3 modules. Small enough that the Doc Center Home
can show everything without pagination, but the design must scale to dozens
of modules with hundreds of pages.


---

## Screen 1: Doc Center Home

### Purpose

Landing page for the documentation browser. Shows the full documentation
landscape at a glance: which modules have docs, what topics are covered,
and provides a search entry point.

### ASCII Wireframe

```
+======================================================================+
| Doc Center                                                    [x]    |
+======================================================================+
|                                                                      |
|  +----------------------------------------------------------------+  |
|  |  Search documentation...                              [Search] |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  MODULES WITH DOCUMENTATION                                         |
|  +-----------------------+ +-----------------------+ +-------------+ |
|  | +---+                 | | +---+                 | | +---+       | |
|  | |INV|  Inventory      | | |ARC|  ARC-AGI        | | |GEP| GEPA | |
|  | +---+                 | | +---+                 | | +---+       | |
|  | 4 pages               | | 4 pages               | | 3 pages    | |
|  | guide, reference      | | guide, reference      | | guide, ref | |
|  |                       | |                       | |             | |
|  | * Overview         >  | | * Overview         >  | | * Overview  | |
|  | * API Reference    >  | | * API Reference    >  | | * API Ref   | |
|  | * Profiles & RT    >  | | * Runtime Modes    >  | | * Scripts   | |
|  | * Troubleshooting  >  | | * Session Lifecy.. >  | |             | |
|  +-----------------------+ +-----------------------+ +-------------+ |
|                                                                      |
|  BROWSE BY TOPIC                                                     |
|  +----------+ +----------+ +----------+ +----------+ +----------+   |
|  | backend  | | api      | | runtime  | | onboard- | | trouble- |   |
|  |    11    | |     6    | |     2    | | ing   5  | | shoot  1 |   |
|  +----------+ +----------+ +----------+ +----------+ +----------+   |
|  +----------+ +----------+ +----------+ +----------+                |
|  | profiles | | sessions | | scripts  | | frontend |                |
|  |     1    | |     1    | |     1    | |     0    |                |
|  +----------+ +----------+ +----------+ +----------+                |
|                                                                      |
|  BROWSE BY TYPE                                                      |
|  +----------------+ +----------------+ +----------------+            |
|  | guide       7  | | reference   4  | | tutorial    0  |            |
|  +----------------+ +----------------+ +----------------+            |
|                                                                      |
+======================================================================+
|  11 docs across 3 modules                                            |
+======================================================================+
```

### Features

| Feature | Behavior | API/Data Source |
|---------|----------|----------------|
| Search bar | Text input; on submit navigates to Search & Filter screen with query pre-filled | Local navigation state |
| Module cards | One card per module with docs. Shows icon, name, page count, doc types, and top doc titles. Click card header → Module Docs screen. Click doc title → Doc Reader. | `useGetAppsQuery()` for manifest + `useGetOSDocsQuery({})` for facets |
| Topic chips | One chip per topic from the vocabulary. Shows count of docs tagged with that topic. Click → Search & Filter screen filtered by that topic. | `OSDocsResponse.facets.topics` |
| Doc type chips | One chip per doc type. Shows count. Click → Search & Filter filtered by that doc type. | `OSDocsResponse.facets.doc_types` |
| Module icon | Reuses existing `AppIcon` component. | `AppManifestDocument` |
| Footer stats | Total doc count and module count. | `OSDocsResponse.total` + `OSDocsResponse.facets.modules.length` |
| Empty state | If no modules have docs, show "No documentation available yet" message with link to backend docs guide. | `OSDocsResponse.total === 0` |

### Data Flow

```
useGetAppsQuery() ──> manifest (for module names, icons, health)
useGetOSDocsQuery({}) ──> all docs + facets (for counts, topic chips, doc type chips)

Derive:
  moduleCards = group results by module_id, attach manifest data
  topicChips = facets.topics sorted by count desc
  docTypeChips = facets.doc_types sorted by count desc
```

### Component Tree

```
DocCenterHomeWindow
  DocSearchBar
  ModuleCardGrid
    ModuleCard (per module)
      AppIcon
      DocTitleList (clickable titles)
  TopicChipRow
    TopicChip (per topic facet)
  DocTypeChipRow
    DocTypeChip (per doc_type facet)
  DocCenterFooter
```


---

## Screen 2: Search & Filter

### Purpose

Full search experience with faceted filtering. Reached from the search bar,
topic/type chip clicks on the home screen, or by typing a query in the
browser toolbar. This is the primary discovery interface for finding docs
across all modules.

### ASCII Wireframe

```
+======================================================================+
| Doc Search                                               [Home] [x]  |
+======================================================================+
|  +----------------------------------------------------------------+  |
|  |  session lifecycle                                    [Search] |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  +----------------+  +----------------------------------------------+|
|  | FILTERS        |  | RESULTS (3 of 11)                    [Sort] ||
|  |                |  |                                              ||
|  | Modules        |  | +------------------------------------------+||
|  | [x] inventory  |  | | guide | arc-agi                          |||
|  | [x] arc-agi    |  | | Session Lifecycle                       |||
|  | [x] gepa       |  | | Covers session creation, state machine  |||
|  |                |  | | transitions, and cleanup behavior.      |||
|  | Doc Types      |  | +------------------------------------------+||
|  | [x] guide      |  |                                              ||
|  | [x] reference  |  | +------------------------------------------+||
|  | [ ] tutorial   |  | | guide | inventory                       |||
|  | [ ] troublesh  |  | | Profiles and Runtime                    |||
|  |                |  | | Profile loading, session binding, and   |||
|  | Topics         |  | | runtime configuration.                  |||
|  | [x] backend    |  | +------------------------------------------+||
|  | [x] runtime    |  |                                              ||
|  | [ ] api        |  | +------------------------------------------+||
|  | [ ] onboarding |  | | reference | arc-agi                     |||
|  | [ ] profiles   |  | | ARC-AGI API Reference                   |||
|  | [ ] sessions   |  | | Route contracts, payloads, and error    |||
|  | [ ] scripts    |  | | behavior for the ARC module.            |||
|  | [ ] troublesh  |  | +------------------------------------------+||
|  |                |  |                                              ||
|  | [Clear All]    |  |                                              ||
|  +----------------+  +----------------------------------------------+|
|                                                                      |
+======================================================================+
|  Showing 3 results for "session lifecycle"                           |
+======================================================================+
```

### Features

| Feature | Behavior | API/Data Source |
|---------|----------|----------------|
| Search input | Debounced text input (300ms). Triggers `getOSDocs` query with current filters. | `useGetOSDocsQuery({ query, topics, doc_type, module })` |
| Module filter checkboxes | Toggle modules on/off. All checked by default. Unchecking a module removes its docs from results. | Filter state → `OSDocsQuery.module` |
| Doc type filter checkboxes | Toggle doc types. All checked by default. | Filter state → `OSDocsQuery.doc_type` |
| Topic filter checkboxes | Toggle topics. All checked by default. | Filter state → `OSDocsQuery.topics` |
| Clear All button | Resets all filters and query text. | Local state reset |
| Result cards | Shows doc_type badge, module_id badge, title, summary. Click → Doc Reader screen. | `OSDocsResponse.results[]` |
| Sort dropdown | Sort results by: Relevance (default), Module, Title A-Z, Doc Type. | Client-side sort on `results[]` |
| Result count | "Showing N results" or "Showing N of M" when filtered. | `OSDocsResponse.total` |
| Home button | Navigate back to Doc Center Home. | Local navigation |
| URL-driven state | Filters and query are reflected in navigation state so back/forward works. | URL params or Redux state |
| Empty results | "No docs match your search. Try different keywords or clear filters." | `results.length === 0` |
| Facet counts | Each filter checkbox shows the count from the facets response for visual feedback. | `OSDocsResponse.facets` |

### Data Flow

```
filterState = {
  query: string,
  modules: string[],
  docTypes: string[],
  topics: string[],
}

useGetOSDocsQuery({
  query: filterState.query,
  module: filterState.modules,    // only if not "all checked"
  doc_type: filterState.docTypes, // only if not "all checked"
  topics: filterState.topics,     // only if not "all checked"
})

Response → render result cards
Response.facets → update checkbox counts (grayed if count=0)
```

### Component Tree

```
DocSearchWindow
  DocSearchBar
  DocSearchLayout (two-column)
    DocFilterSidebar
      FilterSection ("Modules")
        FilterCheckbox (per module facet)
      FilterSection ("Doc Types")
        FilterCheckbox (per doc_type facet)
      FilterSection ("Topics")
        FilterCheckbox (per topic facet)
      ClearFiltersButton
    DocResultsList
      SortDropdown
      DocResultCard (per result)
        DocTypeBadge
        ModuleBadge
        DocTitle (clickable → reader)
        DocSummary
      EmptyResultsMessage (conditional)
  DocSearchFooter
```


---

## Screen 3: Module Docs

### Purpose

Shows all documentation for a single module, organized by doc type. This is
the module-level documentation overview — like a book's table of contents.
Reached by clicking a module card on the home screen, or from breadcrumbs
in the reader.

### ASCII Wireframe

```
+======================================================================+
| Inventory — Documentation                          [Home] [Search] [x]|
+======================================================================+
|                                                                      |
|  +---+  Inventory Module                                             |
|  |INV|  4 documentation pages                                        |
|  +---+  Healthy | Reflection available | Docs v1                     |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  |                                                                |  |
|  |  GUIDES                                                        |  |
|  |  +------------------------------------------------------------+|  |
|  |  |                                                            ||  |
|  |  |  1. Inventory Module Overview                              ||  |
|  |  |     Architecture and ownership boundaries for the          ||  |
|  |  |     inventory backend module.                              ||  |
|  |  |     Topics: backend, inventory, onboarding                 ||  |
|  |  |                                                    [Read >]||  |
|  |  |                                                            ||  |
|  |  +------------------------------------------------------------+|  |
|  |  +------------------------------------------------------------+|  |
|  |  |                                                            ||  |
|  |  |  2. Profiles and Runtime                                   ||  |
|  |  |     Profile loading, session binding, and runtime          ||  |
|  |  |     configuration.                                         ||  |
|  |  |     Topics: backend, profiles                              ||  |
|  |  |                                                    [Read >]||  |
|  |  |                                                            ||  |
|  |  +------------------------------------------------------------+|  |
|  |                                                                |  |
|  |  REFERENCES                                                    |  |
|  |  +------------------------------------------------------------+|  |
|  |  |                                                            ||  |
|  |  |  3. Inventory API Reference                                ||  |
|  |  |     Route contracts, payloads, and error behavior for      ||  |
|  |  |     inventory.                                             ||  |
|  |  |     Topics: backend, api, inventory                        ||  |
|  |  |                                                    [Read >]||  |
|  |  |                                                            ||  |
|  |  +------------------------------------------------------------+|  |
|  |                                                                |  |
|  |  TROUBLESHOOTING                                               |  |
|  |  +------------------------------------------------------------+|  |
|  |  |                                                            ||  |
|  |  |  4. Inventory Troubleshooting                              ||  |
|  |  |     Common errors, debugging, and recovery.                ||  |
|  |  |     Topics: backend, troubleshooting                       ||  |
|  |  |                                                    [Read >]||  |
|  |  |                                                            ||  |
|  |  +------------------------------------------------------------+|  |
|  |                                                                |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  ALSO IN THIS MODULE                                                 |
|  Reflection: 5 APIs, 3 schemas        [Open in Module Browser]      |
|                                                                      |
+======================================================================+
```

### Features

| Feature | Behavior | API/Data Source |
|---------|----------|----------------|
| Module header | Module icon, name, page count, health status, reflection availability, docs version. | `useGetAppsQuery()` → find app by id |
| Doc type groups | Docs grouped by `doc_type` with section headers. Within each group, sorted by `order` then `slug`. | `useGetModuleDocsQuery(appId)` |
| Doc entry cards | Title, summary, topic tags, order number, "Read" button. Click anywhere → Doc Reader. | `ModuleDocDocument` from TOC |
| Topic badges | Small inline badges for each topic on a doc entry. Click badge → Search & Filter filtered by that topic. | `ModuleDocDocument.topics` |
| Reflection link | "Open in Module Browser" button at bottom if reflection is available. Opens ModuleBrowserWindow with this module pre-selected. | `app.reflection?.available` |
| Home/Search buttons | Navigate to Doc Center Home or Search & Filter. | Local navigation |
| Empty state | "This module has no documentation pages yet." | `docs.length === 0` |

### Data Flow

```
Props: moduleId (string)

useGetAppsQuery()                → manifest for module name, icon, health
useGetModuleDocsQuery(moduleId)  → full TOC with metadata

Derive:
  groupedDocs = group docs by doc_type
  docTypeOrder = ['guide', 'tutorial', 'reference', 'troubleshooting']
  sortedGroups = docTypeOrder.filter(t => groupedDocs[t]?.length > 0)
```

### Component Tree

```
ModuleDocsWindow
  ModuleDocsHeader
    AppIcon
    ModuleName
    ModuleStatusBadges (health, reflection, docs version)
  DocTypeGroupList
    DocTypeGroup (per doc_type that has docs)
      DocTypeGroupHeader ("Guides", "References", etc.)
      DocEntryCard (per doc in group)
        OrderNumber
        DocTitle (clickable)
        DocSummary
        TopicBadgeRow
          TopicBadge (per topic)
        ReadButton
  ModuleReflectionLink (conditional)
```


---

## Screen 4: Doc Reader

### Purpose

Full-page rendering of a single documentation page. This is where users
actually read documentation. It renders the markdown content, shows metadata,
and provides navigation to related docs via see_also links and
previous/next within the module.

### ASCII Wireframe

```
+======================================================================+
| Doc Reader                              [Home] [Search] [Module] [x] |
+======================================================================+
|                                                                      |
|  inventory > Guides > Inventory Module Overview                      |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  | +--------+  +----------+  +----------+  +-------------+       |  |
|  | | guide  |  | inventory|  | backend  |  | onboarding  |       |  |
|  | +--------+  +----------+  +----------+  +-------------+       |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  |                                                                |  |
|  |  # Inventory Module Overview                                   |  |
|  |                                                                |  |
|  |  The inventory backend module owns chat, websocket, timeline,  |  |
|  |  profile, confirm, and documentation routes under:             |  |
|  |                                                                |  |
|  |  - `/api/apps/inventory/...`                                   |  |
|  |                                                                |  |
|  |  The module delegates runtime behavior to                      |  |
|  |  `pkg/backendcomponent` and adds backend-host integration      |  |
|  |  contracts:                                                    |  |
|  |                                                                |  |
|  |  - `AppBackendModule`                                          |  |
|  |  - `ReflectiveAppBackendModule`                                |  |
|  |  - `DocumentableAppBackendModule`                              |  |
|  |                                                                |  |
|  |  ## Responsibilities                                           |  |
|  |                                                                |  |
|  |  | Area        | Description                    |              |  |
|  |  |-------------|--------------------------------|              |  |
|  |  | Chat        | Message handling, LLM routing  |              |  |
|  |  | Timeline    | Event recording, playback      |              |  |
|  |  | Profiles    | Profile CRUD, session binding  |              |  |
|  |  | Confirm     | Human-in-the-loop confirmation |              |  |
|  |  | Docs        | Embedded module documentation  |              |  |
|  |  |                                                             |  |
|  |  ...                                                           |  |
|  |                                                                |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  | SEE ALSO                                                       |  |
|  |                                                                |  |
|  | * Inventory API Reference (inventory/api-reference)        >   |  |
|  | * Profiles and Runtime (inventory/profiles-and-runtime)     >  |  |
|  | * ARC-AGI Module Overview (arc-agi/overview)                >  |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  |  < Prev: (none)         |  Next: API Reference >              |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
+======================================================================+
```

### Features

| Feature | Behavior | API/Data Source |
|---------|----------|----------------|
| Breadcrumb navigation | "module > doc_type > title" path. Each segment is clickable: module → Module Docs screen, doc_type → Search & Filter filtered by type. | Derived from `ModuleDocDocument` metadata |
| Metadata bar | Badges showing doc_type, module_id, and each topic. Clickable: module badge → Module Docs, topic badge → Search & Filter. | `ModuleDocDocument` fields |
| Markdown renderer | Full markdown rendering with: headings, paragraphs, lists, tables, code blocks with syntax highlighting, inline code, bold/italic, links. | `ModuleDocDocument.content` |
| Table of contents | Auto-generated from H2/H3 headings in the markdown content. Shown as a floating sidebar on wide viewports or a collapsible section on narrow. | Parsed from `content` |
| See Also links | Cross-module doc links. Each entry shows title and `module/slug` path. Click → loads that doc in the reader. | `ModuleDocDocument.see_also[]` resolved against module TOC |
| Prev/Next navigation | Sequential navigation within the module's docs (by order field). Shows title of prev/next doc. | `useGetModuleDocsQuery(moduleId)` → find adjacent docs |
| Toolbar buttons | Home (→ Doc Center Home), Search (→ Search & Filter), Module (→ Module Docs for current module). | Local navigation |
| Loading state | Skeleton placeholder while doc content loads. | `useLazyGetModuleDocQuery` loading state |
| Error state | "Failed to load document" with retry button. | Query error state |
| Code block copy | Copy button on code blocks. | Client-side clipboard API |
| Scroll to heading | Click TOC entry → smooth scroll to that heading. URL hash updated. | Client-side scroll + hash |

### Data Flow

```
Props: moduleId (string), slug (string)

useGetModuleDocQuery({ appId: moduleId, slug })  → full doc with content
useGetModuleDocsQuery(moduleId)                   → TOC for prev/next nav
useGetAppsQuery()                                 → manifest for module name/icon

Derive:
  breadcrumb = [module.name, doc.doc_type, doc.title]
  headings = parseMarkdownHeadings(doc.content)
  prevDoc / nextDoc = findAdjacentInTOC(toc, slug)
  seeAlsoResolved = resolveSeeAlso(doc.see_also, allModuleTOCs)
```

### Markdown Rendering

The reader needs a markdown-to-React renderer. Options:

1. **react-markdown** with remark-gfm plugin (tables, strikethrough,
   task lists) and rehype-highlight for code blocks.
2. **marked** + DOMPurify for pre-rendered HTML (lighter but less
   React-idiomatic).

Recommendation: `react-markdown` + `remark-gfm` + `rehype-highlight`.
This gives GFM tables, fenced code blocks with syntax highlighting,
and React component control over every element.

### Component Tree

```
DocReaderWindow
  DocReaderToolbar
    HomeButton
    SearchButton
    ModuleButton
  DocBreadcrumb
    BreadcrumbSegment (module name, clickable)
    BreadcrumbSegment (doc type, clickable)
    BreadcrumbSegment (title, current)
  DocMetadataBar
    DocTypeBadge
    ModuleBadge
    TopicBadge (per topic)
  DocReaderContent
    DocTableOfContents (sidebar or collapsible)
      TOCEntry (per heading)
    MarkdownRenderer
      (headings, paragraphs, tables, code blocks, lists, links)
  DocSeeAlso
    SeeAlsoLink (per see_also entry)
  DocPrevNextNav
    PrevDocLink
    NextDocLink
```


---

## Screen 5: Topic Browser

### Purpose

Browse documentation organized by topic rather than by module. This is the
cross-cutting view — useful when a user wants to understand "all runtime
docs" or "all troubleshooting docs" regardless of which module they belong to.

### ASCII Wireframe

```
+======================================================================+
| Topics                                               [Home] [Search] |
+======================================================================+
|                                                                      |
|  +---------------------------+  +------------------------------------+
|  | TOPICS                    |  |                                    |
|  |                           |  |  backend (11 docs)                 |
|  | * backend          (11)  >|  |                                    |
|  |   api               (6)  |  |  Documentation across all modules  |
|  |   frontend           (0)  |  |  tagged with "backend".            |
|  |   onboarding         (5)  |  |                                    |
|  |   profiles           (1)  |  |  INVENTORY (4)                     |
|  |   runtime            (2)  |  |  +--------------------------------+|
|  |   scripts            (1)  |  |  | guide  Overview             > ||
|  |   sessions           (1)  |  |  | guide  Profiles and Runtime > ||
|  |   troubleshooting    (1)  |  |  | ref    API Reference        > ||
|  |                           |  |  | ref    Troubleshooting      > ||
|  |                           |  |  +--------------------------------+|
|  |                           |  |                                    |
|  |                           |  |  ARC-AGI (4)                       |
|  |                           |  |  +--------------------------------+|
|  |                           |  |  | guide  Overview             > ||
|  |                           |  |  | guide  Runtime Modes        > ||
|  |                           |  |  | guide  Session Lifecycle    > ||
|  |                           |  |  | ref    API Reference        > ||
|  |                           |  |  +--------------------------------+|
|  |                           |  |                                    |
|  |                           |  |  GEPA (3)                          |
|  |                           |  |  +--------------------------------+|
|  |                           |  |  | guide  Overview             > ||
|  |                           |  |  | guide  Scripts and Runs     > ||
|  |                           |  |  | ref    API Reference        > ||
|  |                           |  |  +--------------------------------+|
|  |                           |  |                                    |
|  +---------------------------+  +------------------------------------+
|                                                                      |
+======================================================================+
```

### Features

| Feature | Behavior | API/Data Source |
|---------|----------|----------------|
| Topic list (left pane) | All topics with doc counts. Sorted by count descending. Selected topic highlighted. Click → loads topic detail in right pane. | `useGetOSDocsQuery({})` → `facets.topics` |
| Topic detail (right pane) | Shows topic name, total count, description, then docs grouped by module. Each doc row shows doc_type badge + title. Click → Doc Reader. | `useGetOSDocsQuery({ topics: [selectedTopic] })` |
| Module subgroups | Within the topic detail, docs are grouped by module_id with module name as subheader and count. | Group `results` by `module_id` |
| Zero-count topics | Topics with count=0 shown dimmed/disabled (no docs use that topic yet). | `facets.topics` where `count === 0` |
| Home/Search buttons | Standard navigation. | Local navigation |

### Data Flow

```
State: selectedTopic (string | undefined)

// Left pane: always fetch unfiltered for complete topic list
useGetOSDocsQuery({}) → facets.topics for the sidebar

// Right pane: fetch filtered by selected topic
useGetOSDocsQuery({ topics: [selectedTopic] }) → results grouped by module
```

### Component Tree

```
TopicBrowserWindow
  TopicBrowserToolbar
    HomeButton
    SearchButton
  TopicBrowserLayout (two-column)
    TopicListPane
      TopicListItem (per topic)
        TopicName
        TopicCount
    TopicDetailPane
      TopicHeader (name, count, description)
      ModuleDocGroup (per module in results)
        ModuleGroupHeader (module name, count)
        TopicDocRow (per doc)
          DocTypeBadge
          DocTitle (clickable → reader)
```


---

## Cross-Screen Navigation Map

This diagram shows how users move between screens.

```
                    +------------------+
                    |  Doc Center Home |
                    +------------------+
                   /    |    |         \
         search   /     |    |          \ click topic
        submit   /      |    |           \
               v        |    |            v
    +---------------+   |    |    +----------------+
    | Search &      |   |    |    | Topic Browser  |
    | Filter        |   |    |    +----------------+
    +---------------+   |    |           |
          |             |    |           | click doc
          | click       |    |           v
          | result      |    |    +----------------+
          v             |    +--->| Doc Reader     |
    +---------------+   |        +----------------+
    | Doc Reader    |<--+              |    ^
    +---------------+                  |    |
          |    ^                       |    |
          |    | see_also              |    | prev/next
          |    | click                 |    |
          |    +--------<--------------+    |
          |                                 |
          | breadcrumb                      |
          | click module                    |
          v                                 |
    +---------------+                      |
    | Module Docs   |------click doc-------+
    +---------------+

    Every screen has [Home] button → Doc Center Home
    Every screen has [Search] button → Search & Filter (empty query)
    Doc Reader has [Module] button → Module Docs for current module
```


## Shared Components

These components are used across multiple screens and should be built first.

### DocTypeBadge

Small colored badge showing the doc type. Color-coded:

| Doc Type | Color | Label |
|----------|-------|-------|
| guide | blue | Guide |
| reference | green | Reference |
| tutorial | purple | Tutorial |
| troubleshooting | orange | Troubleshooting |

```typescript
interface DocTypeBadgeProps {
  docType: string;
}
```

### ModuleBadge

Small badge showing module name. Uses module's primary color or a neutral
gray. Clickable → Module Docs screen.

```typescript
interface ModuleBadgeProps {
  moduleId: string;
  moduleName?: string;
  onClick?: () => void;
}
```

### TopicBadge

Small tag-style badge for a topic. Clickable → Search & Filter with topic
pre-selected.

```typescript
interface TopicBadgeProps {
  topic: string;
  count?: number;
  onClick?: () => void;
}
```

### DocSearchBar

Shared search input with submit button. Used on Home and Search screens.

```typescript
interface DocSearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
}
```

### DocResultCard

Shared card for displaying a doc search result. Used in Search & Filter
results list and elsewhere.

```typescript
interface DocResultCardProps {
  result: OSDocResult;
  onClick: () => void;
}
```


## State Management

### Navigation State

The doc browser needs its own navigation state since it has multiple
"screens" within a single desktop window. Two approaches:

**Option A: Redux slice** (consistent with existing appsBrowserSlice)

```typescript
interface DocBrowserState {
  screen: 'home' | 'search' | 'module-docs' | 'reader' | 'topic-browser';
  // Search & Filter state
  searchQuery: string;
  searchFilters: {
    modules: string[];
    docTypes: string[];
    topics: string[];
  };
  // Module Docs state
  selectedModuleId?: string;
  // Reader state
  readerModuleId?: string;
  readerSlug?: string;
  // Topic Browser state
  selectedTopic?: string;
  // Navigation history (for back button)
  history: Array<{ screen: string; params: Record<string, string> }>;
}
```

**Option B: Component-local state with context** (simpler, avoids global state)

```typescript
// DocBrowserContext provides navigation between screens
interface DocBrowserNavigation {
  navigateTo(screen: DocBrowserScreen, params?: Record<string, string>): void;
  goBack(): void;
  currentScreen: DocBrowserScreen;
  currentParams: Record<string, string>;
}
```

Recommendation: **Option B** for initial implementation. The doc browser
is self-contained and does not need to share state with the module browser
or other windows. Use React context + useReducer internally. Migrate to
Redux only if cross-window coordination becomes necessary (e.g., "Open in
Doc Browser" from GetInfoWindow).

### RTK Query Cache Sharing

All doc browser screens share the same RTK Query cache via the existing
`appsApi` slice. This means:

- Navigating from Search to Reader does not re-fetch the manifest or TOC
  if they are already cached.
- The aggregate docs query (`getOSDocs`) uses the query params as cache key,
  so different filter combinations are cached separately.
- The individual doc page query (`getModuleDoc`) caches by `appId:slug`,
  so revisiting a page is instant.


## Window Integration

### Opening the Doc Browser

The doc browser should be launchable from multiple entry points:

1. **Menu bar** → "Documentation" or "Doc Center" menu item
2. **GetInfoWindow** → Change doc title links from raw JSON URLs to opening
   the doc in the Doc Reader screen
3. **ModuleBrowserWindow** → Add a "Docs" button or column that opens
   Module Docs for the selected module
4. **AppsFolderWindow** → Right-click context menu → "View Documentation"
5. **Command palette** → `docs.open`, `docs.search` commands

### Desktop Commands to Register

```typescript
// Open Doc Center Home
{ id: 'docs.open-center', label: 'Open Documentation Center' }

// Open Doc Reader for a specific page
{ id: 'docs.open-page', label: 'Open Documentation Page',
  payload: { moduleId: string, slug: string } }

// Open Search with a query
{ id: 'docs.search', label: 'Search Documentation',
  payload: { query?: string } }

// Open Module Docs
{ id: 'docs.open-module', label: 'View Module Documentation',
  payload: { moduleId: string } }
```


## Implementation Plan

### Phase 1: Foundation (shared components + Doc Center Home)

Build the shared components (badges, search bar, result cards) and the
Doc Center Home screen. This provides a landing page and validates the
data flow from `useGetOSDocsQuery`.

Files to create:
- `src/components/doc-browser/DocTypeBadge.tsx`
- `src/components/doc-browser/ModuleBadge.tsx`
- `src/components/doc-browser/TopicBadge.tsx`
- `src/components/doc-browser/DocSearchBar.tsx`
- `src/components/doc-browser/DocResultCard.tsx`
- `src/components/doc-browser/DocBrowserContext.tsx`
- `src/components/doc-browser/DocCenterHome.tsx`
- `src/components/doc-browser/DocBrowserWindow.tsx`

### Phase 2: Doc Reader

Build the markdown renderer and the Doc Reader screen. This is the most
critical screen — if users cannot read docs, nothing else matters.

Files to create:
- `src/components/doc-browser/MarkdownRenderer.tsx`
- `src/components/doc-browser/DocTableOfContents.tsx`
- `src/components/doc-browser/DocSeeAlso.tsx`
- `src/components/doc-browser/DocPrevNextNav.tsx`
- `src/components/doc-browser/DocReaderScreen.tsx`

Dependencies to add:
- `react-markdown`
- `remark-gfm`
- `rehype-highlight` (or `rehype-prism-plus`)

### Phase 3: Search & Filter

Build the faceted search screen. This connects the aggregate endpoint
to a usable filter UI.

Files to create:
- `src/components/doc-browser/DocFilterSidebar.tsx`
- `src/components/doc-browser/DocSearchScreen.tsx`

### Phase 4: Module Docs + Topic Browser

Build the remaining two screens. These are simpler compositions of
existing components.

Files to create:
- `src/components/doc-browser/ModuleDocsScreen.tsx`
- `src/components/doc-browser/TopicBrowserScreen.tsx`

### Phase 5: Integration

Wire the doc browser into the existing apps-browser:
- Register desktop commands
- Add context menu entries
- Update GetInfoWindow to open docs in the reader instead of raw JSON links
- Add "Docs" entry point to ModuleBrowserWindow

Files to modify:
- `src/launcher/module.tsx` (register commands)
- `src/components/GetInfoWindow.tsx` (change doc links)
- `src/components/ModuleBrowserWindow.tsx` (add docs button)


## Open Questions

1. **Markdown rendering library**: `react-markdown` is the recommendation,
   but `@mdx-js/react` would allow embedding React components in doc
   content. Is that a future need? For now, standard markdown is sufficient.

2. **Table of contents placement**: Floating right sidebar on wide screens?
   Collapsible top section? Both have tradeoffs. The wireframe shows a
   sidebar, but the implementation should be responsive.

3. **See Also resolution**: The `see_also` field contains slugs like
   `inventory/api-reference`. Should the reader pre-fetch all referenced
   docs to show their titles, or just display the slug as a link? Pre-fetch
   is better UX but adds API calls.

4. **Search highlighting**: Should search result cards highlight the matched
   terms in the title/summary? The backend currently does substring matching
   but does not return match positions. Client-side highlighting on the
   `query` term is feasible.

5. **Keyboard navigation**: Should the doc browser support keyboard shortcuts
   for navigation (e.g., `j/k` for prev/next doc, `/` for search focus)?
   This is a polish feature for later phases.

6. **Print/export**: Should the Doc Reader have a "Print" or "Export to PDF"
   button? The markdown content renders to HTML which browsers can print
   natively, but a styled print stylesheet would improve the output.


## References

- OS-02 design docs (rich app documentation system design exploration,
  module documentation system concrete design, rollout plan)
- Backend documentation system guide
  (`wesen-os/pkg/doc/topics/05-backend-documentation-system.md`)
- Current frontend types (`apps-browser/src/domain/types.ts`)
- Current RTK Query endpoints (`apps-browser/src/api/appsApi.ts`)
- Wolfram Documentation Center (aspirational model from OS-02 exploration)
