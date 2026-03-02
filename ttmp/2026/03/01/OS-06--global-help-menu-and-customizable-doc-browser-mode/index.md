---
Title: Global Help Menu and Customizable Doc Browser Mode
Ticket: OS-06
Status: active
Topics:
    - frontend
    - documentation
    - apps-browser
    - launcher
    - wesen-os
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Launcher command/menu contribution point for doc browser windows.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.tsx
      Note: Root doc browser router and customization entrypoint.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocCenterHome.tsx
      Note: Current apps-centric home screen logic that hides launcher-only docs module.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocReaderScreen.tsx
      Note: Reader currently fetches app-scoped docs only; needs help-mode source support.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts
      Note: API layer where /api/os/help hooks should be added.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/packages/engine/src/components/shell/windowing/useDesktopShellController.tsx
      Note: Menu composition behavior (default + contribution menus).
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/apps/os-launcher/src/__tests__/launcherMenuRuntime.test.tsx
      Note: Runtime launcher menu behavior verification.
ExternalSources: []
Summary: >-
    Intern implementation ticket for adding a top-level Help menu with global
    (non-app) help browsing and a dedicated menu entry for app documentation,
    using one configurable doc browser component.
LastUpdated: 2026-03-01T23:20:00-05:00
WhatFor: >-
    Provide a precise implementation guide and checklist for building a
    customizable docs browser mode that supports both launcher help docs and
    app/module docs.
WhenToUse: >-
    Use this ticket when implementing or reviewing global help menu and doc
    browser mode customization work.
---

# Global Help Menu and Customizable Doc Browser Mode

## Goal

Add a top-level Help menu that opens a general help browser (not tied to an app), while also keeping a clear menu entry for the existing apps documentation browser.

## Required Product Behavior

1. Top menu includes a `Help` section.
2. `Help` menu contains at least:
- `General Help` (launcher/global help pages).
- `Apps Documentation Browser` (existing app/module docs browser).
3. Both actions open the same `DocBrowserWindow` implementation, but with different mode/config.
4. Global help mode must not depend on `/api/os/apps` app manifest entries.

## Primary Document Map

1. `design-doc/01-implementation-guide-global-help-menu-and-customizable-doc-browser.md`
- Intern-ready technical implementation guide.

2. `tasks.md`
- Execution checklist with acceptance gates.

3. `reference/01-intern-execution-notes.md`
- Implementation notes, pitfalls, and QA checklist.
