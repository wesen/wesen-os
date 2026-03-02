---
Title: Doc Browser Frontend Wiring and Rollout
Ticket: OS-04
Status: active
Topics:
    - documentation
    - frontend
    - apps-browser
    - wesen-os
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts
      Note: RTK Query docs endpoint hooks consumed by doc browser screens
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx
      Note: |-
        Context menu integration point for opening docs
        Toolbar documentation entrypoint for discoverability
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/GetInfoWindow.tsx
      Note: Existing docs links and onOpenDoc callback path
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx
      Note: |-
        Module browser context menu integration point for opening docs
        Toolbar Doc Center and Module Docs entrypoints
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserContext.test.ts
      Note: Reducer transition coverage for local navigation
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.test.ts
      Note: Initial screen resolution coverage
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.tsx
      Note: Root doc browser window router and toolbar
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/launcher/module.test.tsx
      Note: Regression tests for command handling and docs suffix parsing
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: |-
        Launchable module adapter and command routing for doc browser windows
        Doc command routing and docs window route parsing hardening
    - Path: workspaces/2026-03-01/add-os-doc-browser/wesen-os/apps/os-launcher/vite.config.ts
      Note: Dev host proxy alignment for aggregate docs endpoint during runtime smoke
    - Path: workspaces/2026-03-01/add-os-doc-browser/wesen-os/ttmp/2026/03/01/OS-03--doc-browser-ui-design/design-doc/01-doc-browser-ui-screen-designs-and-feature-specification.md
      Note: Source UI design and screen specification that OS-04 wires into runtime flow
ExternalSources: []
Summary: Execution ticket for wiring the OS-03 doc browser UI into the real frontend runtime flow, command surfaces, and regression test suite.
LastUpdated: 2026-03-01T15:45:00-05:00
WhatFor: Track implementation work to make docs browsing first-class in the launcher frontend and not just available via internal component stories.
WhenToUse: Use this ticket while integrating doc browser entry points, navigation flows, and tests in go-go-os-frontend and validating the rollout in wesen-os runtime.
---



# Doc Browser Frontend Wiring and Rollout

## Overview

OS-03 delivered the screen design and component implementation for the doc browser UI. OS-04 is the execution ticket that wires that work into the frontend runtime so users can discover docs quickly, navigate docs reliably, and keep the behavior covered by automated tests.

## Scope

- Wire doc browser entry points in frontend interactions (commands, context actions, window payloads).
- Harden navigation and state behavior in real runtime conditions.
- Add missing tests for command routing and doc browser navigation flows.
- Validate end-to-end behavior against live backend docs endpoints.

## Out of Scope

- Backend endpoint redesign (`/api/os/docs`, `/api/apps/{id}/docs`, `/api/apps/{id}/docs/{slug}` already exist in OS-02).
- New visual redesign of doc browser screens (OS-03 design is baseline).

## Key Links

- Implementation plan: `design-doc/01-doc-browser-frontend-wiring-implementation-plan.md`
- Task checklist: `tasks.md`
- Diary: `reference/01-implementation-diary-doc-browser-frontend-wiring.md`
- Advanced interaction research: `reference/02-documentation-link-interaction-research-ctrl-click-context-multi-window.md`
- Source design ticket: `ttmp/2026/03/01/OS-03--doc-browser-ui-design`

## Status

Current status: **active**.

## Working Mode

- Commit in phase-sized chunks.
- Keep changelog and diary updated after each meaningful implementation group.
- Prefer runtime-verifiable behavior over story-only integration.
