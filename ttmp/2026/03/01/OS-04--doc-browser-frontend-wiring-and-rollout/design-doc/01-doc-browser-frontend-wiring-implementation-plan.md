---
Title: Doc Browser Frontend Wiring Implementation Plan
Ticket: OS-04
Status: active
Topics:
    - documentation
    - frontend
    - apps-browser
    - wesen-os
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Primary command/window wiring for doc browser screens
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.tsx
      Note: Screen routing and navigation entrypoint inside docs window
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocCenterHome.tsx
      Note: Home screen module/topic/doc-type discovery UX
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocReaderScreen.tsx
      Note: Full document rendering and related-doc navigation
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/GetInfoWindow.tsx
      Note: Existing docs links currently used from module Get Info flow
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx
      Note: Apps folder context actions for doc browser entry
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx
      Note: Module browser context actions for doc browser entry
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts
      Note: Docs endpoint hooks and aggregate query support
    - Path: ../../../../../../wesen-os/ttmp/2026/03/01/OS-03--doc-browser-ui-design/design-doc/01-doc-browser-ui-screen-designs-and-feature-specification.md
      Note: Approved UI behavior and component mapping baseline
ExternalSources: []
Summary: Detailed phased rollout plan to wire OS-03 doc browser UI into real frontend runtime flows, command surfaces, and regression tests.
LastUpdated: 2026-03-01T15:45:00-05:00
WhatFor: Execution guide for engineers implementing and validating doc browser wiring in production frontend flow.
WhenToUse: Read before coding OS-04 implementation phases or reviewing frontend doc browser integration PRs.
---

## Goal

Make app documentation browsing a first-class launcher workflow, not just a storybook-only component set. Users should be able to discover docs, jump from module context to reader view, search/filter docs, and keep navigation stable under real runtime usage.

## Progress Snapshot (2026-03-01)

- Phase 1 (discoverability wiring): implemented.
- Phase 2 (deep-link and parsing hardening): implemented.
- Phase 3 (regression tests): implemented and passing (`pnpm --filter @hypercard/apps-browser test`).
- Phase 4 (runtime smoke): implemented, including host proxy fix for `/api/os/docs` in Vite dev mode.
- Phase 6 follow-up (planned): advanced interaction upgrades for multi-window docs, context-menu open-in-new, and Ctrl/Cmd-click behavior (see reference doc 02).

## Baseline Snapshot (Current State)

### Already Implemented (from OS-03 + OS-02)

- Docs API hooks exist in `appsApi.ts`:
  - `useGetOSDocsQuery`
  - `useGetModuleDocsQuery`
  - `useLazyGetModuleDocQuery`
- Doc browser screen components exist:
  - `DocCenterHome`, `DocReaderScreen`, `DocSearchScreen`, `ModuleDocsScreen`, `TopicBrowserScreen`
- Launcher module wiring already includes doc browser command IDs and window payload builder:
  - `apps-browser.open-docs`
  - `apps-browser.open-doc-page`
  - `apps-browser.search-docs`
- Existing entry points exist from module surfaces:
  - `GetInfoWindow` `onOpenDoc` callback
  - context menu actions in `AppsFolderWindow` and `ModuleBrowserWindow`

### Gaps To Close In OS-04

- No dedicated runtime regression tests for doc browser command routing and navigation flows.
- No explicit launcher-level discoverability guarantee for docs center entry (outside context menus and Get Info).
- No explicit acceptance checklist tying UI behavior to backend endpoint truth in one place.
- No execution-focused ticket that translates OS-03 design into rollout commits, test gates, and handoff criteria.

## Target Runtime Behavior

1. A user can open Documentation Center without already being inside a module context.
2. A user can deep-link to a specific page (`module + slug`) from Get Info and context menus.
3. Search and filter state behaves predictably and keeps back-navigation stable.
4. Doc reader can move to related pages and adjacent pages without losing context.
5. Regression tests protect command payload parsing, initial-screen resolution, and core navigation transitions.

## Integration Surfaces

### A) Command and Window Wiring

Primary file: `apps/apps-browser/src/launcher/module.tsx`

Responsibilities:

- map command payloads to `buildDocBrowserWindowPayload`
- parse app-key suffix into initial doc browser screen params
- keep route construction deterministic (`home`, `search:<query>`, `<module>[:slug]`)

### B) UI Entry Points

Primary files:

- `components/GetInfoWindow.tsx`
- `components/AppsFolderWindow.tsx`
- `components/ModuleBrowserWindow.tsx`

Responsibilities:

- expose consistent user actions (`View Documentation`, doc title links)
- ensure action payload always includes `moduleId` and optionally `slug`

### C) Screen State and Routing

Primary files:

- `components/doc-browser/DocBrowserContext.tsx`
- `components/doc-browser/DocBrowserWindow.tsx`

Responsibilities:

- manage screen stack and back-navigation
- preserve initial params and transitions between home/search/module-docs/reader/topic-browser

### D) Data Fetching

Primary file: `api/appsApi.ts`

Responsibilities:

- keep query key behavior stable for filtered searches
- avoid over-fetch and maintain predictable cache usage

## Phased Implementation Plan

### Phase 0: Discovery + Gap Confirmation

- Reconfirm which OS-03 integration tasks are already present in code.
- Create explicit list of remaining runtime-facing wiring/test gaps.
- Capture this in diary before code edits.

Deliverable: validated delta list (what remains after OS-03 implementation).

### Phase 1: Discoverability Wiring

- Add/confirm a direct docs-center action in a high-discoverability surface:
  - apps-browser folder toolbar button or command-palette-friendly action.
- Ensure this action always opens doc browser home (`home` suffix) with stable dedupe behavior.

Deliverable: docs center is reachable in one click without context menus.

### Phase 2: Deep Link and Navigation Hardening

- Validate and adjust suffix parsing in launcher adapter for:
  - `home`
  - `search:<query>`
  - `<module>`
  - `<module>:<slug>`
- Ensure page-open actions from Get Info and context menus always route to reader for existing docs.
- Normalize malformed payload fallback behavior (no crash, deterministic fallback screen).

Deliverable: robust deep-link behavior and predictable fallback handling.

### Phase 3: Regression Tests

- Add tests in apps-browser covering:
  - doc command handler routing (`open-docs`, `open-doc-page`, `search-docs`)
  - doc browser initial screen resolution and transitions
  - callback integration path from Get Info to doc reader open
- Keep tests lightweight and deterministic (no full desktop shell boot required when avoidable).

Deliverable: frontend integration behavior protected by automated tests.

### Phase 4: Runtime Smoke + Rollout Docs

- Run tmux runtime smoke against live backend endpoints and UI startup.
- Verify command execution paths and docs page rendering manually.
- Update OS-04 ticket changelog/tasks/diary with command outputs and known caveats.

Deliverable: rollout evidence and handoff-ready ticket state.

## Testing Strategy

### Automated

- `pnpm --filter @hypercard/apps-browser test`
- Any new test files for command and navigation behavior

### Runtime Smoke

- launcher backend + frontend in tmux panes
- verify:
  - `/api/os/apps`
  - `/api/os/docs`
  - `/api/apps/{id}/docs`
  - docs center opens and reader renders expected content

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hidden partial wiring (works in stories, fails in runtime shell) | Users cannot reliably open docs | Prioritize runtime smoke in tmux after each major phase |
| Command payload drift between call sites | Broken deep links to reader screen | Centralize payload parsing and add command handler tests |
| Query-state regressions in search/topic views | Confusing navigation and stale results | Add targeted tests around initial params and back stack |
| Backend/frontend drift on docs availability | UI errors or dead links | Keep smoke checks tied to live `/api/os/docs` and module docs endpoints |

## Acceptance Criteria

- Docs center is reachable from a discoverable UI entry without prior module selection.
- Get Info and context menu flows open doc reader deep links reliably.
- Command routing + initial-screen behavior is covered by tests.
- Runtime smoke verifies behavior against live docs endpoints.
- OS-04 ticket contains clear diary/changelog evidence and closed task checklist.

## Recommended Commit Grouping

1. Phase 1 discoverability wiring
2. Phase 2 navigation/deep-link hardening
3. Phase 3 tests
4. Phase 4 ticket evidence/docs updates
