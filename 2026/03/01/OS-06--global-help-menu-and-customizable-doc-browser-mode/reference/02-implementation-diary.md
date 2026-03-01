---
Title: Implementation Diary — Global Help Menu and Customizable Doc Browser Mode
Ticket: OS-06
Status: active
Topics:
    - frontend
    - documentation
    - apps-browser
    - launcher
    - wesen-os
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Command handler, menu contribution, and mode-aware doc window payload routing.
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts
      Note: API layer for help endpoints.
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/domain/types.ts
      Note: Domain types for help doc responses.
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.tsx
      Note: Doc browser shell with mode/config injection.
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserContext.tsx
      Note: Doc browser state management with mode awareness.
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocCenterHome.tsx
      Note: Home screen with mode-specific data sources.
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocReaderScreen.tsx
      Note: Reader with mode-specific fetch paths.
ExternalSources: []
Summary: Step-by-step implementation diary for OS-06.
LastUpdated: 2026-03-01T17:30:00-05:00
WhatFor: Chronological record of implementation decisions, commands, failures, and fixes.
WhenToUse: During and after OS-06 implementation for review and debugging.
---

# Implementation Diary

## Step 0: Discovery

### What I did

Read all OS-06 ticket documents (index, tasks, design guide, execution notes) and the current codebase:

- `module.tsx`: Launcher command handler with 6 command IDs, doc browser route parsing, window payload builders. No menu contributions currently.
- `appsApi.ts`: RTK Query hooks for `/api/os/apps`, `/api/os/docs`, `/api/apps/{id}/docs`, `/api/apps/{id}/docs/{slug}`. No help-specific hooks yet.
- `types.ts`: Domain types for app manifest, reflection, module docs, OS docs. No help-specific types yet.
- `DocBrowserWindow.tsx`: Screen router with toolbar, context menu. No mode/config awareness.
- `DocBrowserContext.tsx`: Reducer-based navigation state with `DocBrowserScreen` type. No mode tracking.
- `DocCenterHome.tsx`: App-manifest-driven home screen. Filters by `app.docs?.available`. No help mode path.
- `DocReaderScreen.tsx`: Fetches from `/api/apps/{module}/docs/{slug}`. No help-mode fetch path.

Verified backend help endpoints:
- `GET /api/os/help` returns 6 docs with `module_id: "wesen-os"`.
- `GET /api/os/help/{slug}` returns full content with markdown.
- `GET /api/os/docs?module=wesen-os` includes help docs in aggregate search.

Key observations:
- Help response shape matches `ModuleDocsTOCResponse` (has `module_id` and `docs` array).
- Single help doc response matches `ModuleDocDocument` (has `content` field).
- The `DesktopContribution` interface supports `menus` property for contributing top-level menu sections.
- Menu sections with same `id` get merged via `composeDesktopContributions`.
- The apps-browser module currently contributes NO menus (only commands, adapters).

### Decisions

- Help mode will use `mode: 'help'` prefix in routes: `help:home`, `help:search:<query>`, `help:doc:<slug>`.
- Apps mode routes will be prefixed too: `apps:home`, `apps:search:<query>`, etc.
- Backwards compatibility: unprefixed routes default to `apps` mode.
- Menu contribution will add a `help` section with two items.
- API hooks will reuse existing response types where shapes match.
