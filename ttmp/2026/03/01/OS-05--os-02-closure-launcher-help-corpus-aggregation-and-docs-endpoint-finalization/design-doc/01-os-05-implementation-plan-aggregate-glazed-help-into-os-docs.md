---
Title: OS-05 Implementation Plan: Aggregate Glazed Help Into OS Docs
Ticket: OS-05
Status: active
Topics:
    - documentation
    - backend
    - wesen-os
    - glazed
    - launcher
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/cmd/wesen-os-launcher/docs_endpoint.go
      Note: Existing aggregate docs endpoint and filtering implementation.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/cmd/wesen-os-launcher/main.go
      Note: Startup wiring and mux registration for launcher APIs.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/pkg/doc/doc.go
      Note: Help page embedding/loading into glazed help system.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/cmd/wesen-os-launcher/main_integration_test.go
      Note: Integration contract validation surface.
ExternalSources: []
Summary: >-
    Implementation guide for closing OS-02 documentation gaps by exposing
    launcher help pages via runtime endpoints and including them in
    /api/os/docs aggregation.
LastUpdated: 2026-03-01T17:55:00-05:00
WhatFor: >-
    Provide an intern-friendly, file-level execution plan with endpoint
    contracts, data mappings, testing strategy, and rollout checks.
WhenToUse: >-
    Read before implementing or reviewing launcher docs aggregation changes.
---

# OS-05 Implementation Plan: Aggregate Glazed Help Into OS Docs

## Problem Statement

OS-02 introduced module documentation for inventory/arc-agi/gepa and aggregate
search via `/api/os/docs`. However, launcher-level glazed help pages in
`wesen-os/pkg/doc/` are still isolated to CLI help flows and are not surfaced
through runtime docs APIs. This leaves a discoverability gap in the app-facing
browser and keeps one OS-02 checklist item open.

## Current State Analysis

### What Exists

- Embedded launcher help corpus via `wesendoc.AddDocToHelpSystem(helpSystem)`.
- Module docs endpoints:
  - `/api/apps/{id}/docs`
  - `/api/apps/{id}/docs/{slug}`
- Aggregated endpoint `/api/os/docs` with filters and facets.
- Integration tests for module docs and aggregate filters.

### What Is Missing

- No launcher runtime endpoint for help pages (`/api/os/help*`).
- `/api/os/docs` only indexes module `DocumentableAppBackendModule` stores.
- No tests proving launcher docs appear in aggregate output/facets.

## Design Decisions

1. Keep a single in-memory model for runtime docs
- Convert glazed help sections into `docmw.ModuleDoc` and keep them in a
  launcher-local `DocStore`. This avoids parallel ad-hoc structs.

2. Add explicit launcher help endpoints
- `GET /api/os/help`: TOC for launcher help docs.
- `GET /api/os/help/{slug}`: full single help document.

3. Merge launcher docs into `/api/os/docs`
- Preserve existing module docs behavior.
- Add launcher help records with stable `module_id` and URL pointing to
  `/api/os/help/{slug}`.

4. Keep filtering model unchanged
- Reuse existing `query`, `module`, `doc_type`, `topics` filter semantics.
- Only extend data sources and ensure deterministic ordering.

## Data Mapping: Glazed Help -> ModuleDoc

For each loaded help section:

- `module_id`: `wesen-os`
- `slug`: section slug
- `title`: section title
- `doc_type`: mapped from section type:
  - `GeneralTopic` -> `guide`
  - `Tutorial` -> `tutorial`
  - `Example` -> `example`
  - `Application` -> `application`
- `topics`: section topics
- `summary`: section short description
- `order`: section order
- `content`: section markdown body
- aggregate `url`: `/api/os/help/{slug}`

## API Contracts

### GET /api/os/help

Response:

```json
{
  "module_id": "wesen-os",
  "docs": [
    {
      "module_id": "wesen-os",
      "slug": "wesen-os-guide",
      "title": "wesen-os Guide",
      "doc_type": "guide",
      "topics": ["operations"],
      "summary": "..."
    }
  ]
}
```

### GET /api/os/help/{slug}

Response mirrors module doc detail shape (includes `content` and metadata).

### GET /api/os/docs (extended)

- Existing fields unchanged.
- Results now include launcher records where `module_id == "wesen-os"`.
- Facets include launcher-driven counts for topics/doc_types/modules.

## File-Level Implementation Plan

### 1. `cmd/wesen-os-launcher/docs_endpoint.go`

- Add helper to load launcher help docs into a `docmw.DocStore`.
- Add section-type mapping helper.
- Add `/api/os/help` and `/api/os/help/{slug}` registration function.
- Extend `/api/os/docs` registration to accept optional launcher help store and
  append those docs into aggregation results.

### 2. `cmd/wesen-os-launcher/main.go`

- Build launcher help store once at startup.
- Register `/api/os/help*` endpoints.
- Pass launcher help store into `/api/os/docs` registration.

### 3. `cmd/wesen-os-launcher/main_integration_test.go`

- Register help store in integration server test wiring.
- Add tests for:
  - `/api/os/help` TOC response.
  - `/api/os/help/{slug}` detail response.
  - `/api/os/docs` includes `wesen-os` records and respects `module=wesen-os`.

### 4. OS-02 Ticket Files

- Mark launcher-help aggregation task done in OS-02 `tasks.md`.
- Add changelog evidence entry pointing to implementing commit.
- Run `docmgr doctor` and capture status.

## Validation Plan

1. `go test ./cmd/wesen-os-launcher -count=1`
2. `go test ./... -count=1` in `wesen-os`
3. Manual smoke (optional but preferred):
- `curl http://127.0.0.1:8091/api/os/help`
- `curl http://127.0.0.1:8091/api/os/help/wesen-os-guide`
- `curl 'http://127.0.0.1:8091/api/os/docs?module=wesen-os'`

## Risks And Mitigations

- Risk: Help section metadata differs from module docs conventions.
- Mitigation: Centralized mapping helper and deterministic defaults.

- Risk: Startup failure if help store load is strict.
- Mitigation: Keep loader resilient; return empty store on conversion failures.

- Risk: Behavior drift in aggregate ordering/facets.
- Mitigation: Extend integration tests with launcher assertions.

## Acceptance Criteria

- `/api/os/help` and `/api/os/help/{slug}` return expected payloads.
- `/api/os/docs` includes launcher help docs and facets reflect them.
- Existing module docs behavior remains intact.
- OS-02 closure checklist updated and evidence logged.
