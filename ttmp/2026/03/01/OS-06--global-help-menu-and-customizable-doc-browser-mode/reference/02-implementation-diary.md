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

## Step 1: Menu + Command + Route Contract (Phase 1+2)

### What I did

Implemented the menu contribution, new command ID, and mode-aware route grammar:

1. **DocBrowserContext.tsx**: Added `DocBrowserMode = 'apps' | 'help'` type. Added `mode` to context value interface and provider props. Threaded `mode` through `useMemo` value.

2. **DocBrowserWindow.tsx**: Added `mode` prop to `DocBrowserWindowProps`. Passed `mode` to `DocBrowserProvider`.

3. **module.tsx**:
   - Added `COMMAND_OPEN_HELP = 'apps-browser.open-help'` and mode constants (`DOC_MODE_APPS`, `DOC_MODE_HELP`).
   - Imported `DesktopMenuSection` and `DocBrowserMode` types.
   - Rewrote `buildDocBrowserWindowPayload` to accept `mode` option. Routes now include mode prefix: `apps:home`, `help:home`, `apps:doc:inventory:overview`, `help:doc:wesen-os-guide`. Help windows get title "Help" and separate dedupe key `apps-browser:help`.
   - Rewrote `parseDocBrowserSuffix` to detect mode prefix (`apps` or `help`) as first token. Backward compatible: unprefixed routes default to `undefined` mode (apps behavior). Help mode `doc` routes auto-set `moduleId: 'wesen-os'`.
   - Added `COMMAND_OPEN_HELP` to command handler `matches` and `run` methods.
   - Explicitly passed `mode: 'apps'` to existing commands (`COMMAND_OPEN_DOCS`, `COMMAND_OPEN_DOC_PAGE`, `COMMAND_SEARCH_DOCS`).
   - Added `menus` to desktop contribution: Help section with "General Help" and "Apps Documentation Browser" items separated by a divider.
   - Updated adapter to pass parsed `mode` to `DocBrowserWindow` and to `buildDocBrowserWindowPayload` for new-window callbacks.

4. **module.test.tsx**: Updated 3 existing test expectations for mode-prefixed appKeys. Existing backward-compatible tests continued to pass unchanged.

### What worked

- The mode prefix approach is clean: first token is always the mode, followed by the route. Backward compatibility is natural since the parser checks if the first token is a known mode.
- Using `satisfies DesktopMenuSection` on the menu contribution caught type issues at compile time.

### Commit

`b066b82` feat(apps-browser): add Help menu contribution and mode-aware doc browser routing (OS-06 Phase 1+2)

## Step 2: API Layer + Mode-Aware Screens (Phase 3+4)

### What I did

1. **appsApi.ts**: Added two new RTK Query endpoints:
   - `getHelpDocs`: `GET /api/os/help` → `ModuleDocsTOCResponse`
   - `getHelpDoc`: `GET /api/os/help/{slug}` → `ModuleDocDocument`
   - Added `HelpDocs` and `HelpPage` cache tag types.
   - Exported `useGetHelpDocsQuery` and `useGetHelpDocQuery` hooks.

2. **DocCenterHome.tsx**: Split into three components:
   - `HelpCenterHome`: Fetches from `useGetHelpDocsQuery()`, shows help pages as `HelpDocCard` entries using existing `doc-entry-card` styles.
   - `AppsCenterHome`: Existing app-manifest-driven home (renamed from old `DocCenterHome`).
   - `DocCenterHome`: Thin wrapper that reads `mode` from context and renders the appropriate home.
   - Added `placeholder` prop to `DocSearchBar` for mode-specific placeholders.

3. **DocReaderScreen.tsx**: Uses RTK Query `skip` option for conditional data fetching:
   - In apps mode: fetches from `useGetModuleDocsQuery` and `useGetModuleDocQuery` (skips help queries).
   - In help mode: fetches from `useGetHelpDocsQuery` and `useGetHelpDocQuery` (skips app queries).
   - Module name shows "Help" instead of app name in help mode.

4. **DocBrowserWindow.tsx toolbar**: In help mode, hides "Topics" button and "Module" button since these are app-only affordances.

### What worked

- RTK Query's `skip` option makes conditional hook usage clean without violating React's rules of hooks.
- Reusing existing `doc-entry-card` styles for help doc cards provides visual consistency without new CSS.
- No new domain types needed since help endpoint responses match existing `ModuleDocsTOCResponse` and `ModuleDocDocument` shapes.

### Commit

`457d810` feat(apps-browser): add help mode API hooks and mode-aware doc browser screens (OS-06 Phase 3+4)

## Step 3: Tests (Phase 5+6)

### What I did

Added 7 new tests to `module.test.tsx` (24 total, up from 17):

1. `opens help mode browser from apps-browser.open-help` — verifies command routes to help mode with correct appKey, title, and dedupe key.
2. `matches apps-browser.open-help command` — verifies command handler matches the new command ID.
3. `contributes a Help menu section with required entries` — verifies menu contribution structure: Help section with "General Help" (open-help) and "Apps Documentation Browser" (open-docs).
4. `routes help:home suffix to help mode home screen` — verifies route parser extracts mode.
5. `routes help:doc:<slug> suffix to help mode reader with wesen-os moduleId` — verifies help doc route sets moduleId to "wesen-os".
6. `routes apps:module:<id> suffix to apps mode with moduleId` — verifies explicit apps mode prefix.
7. `routes apps:search:<query> suffix to apps mode search` — verifies mode-prefixed search routes.

All 24 tests pass. No regressions in existing tests.
