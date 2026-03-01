---
Title: Implementation Guide: Global Help Menu and Customizable Doc Browser
Ticket: OS-06
Status: active
Topics:
    - frontend
    - documentation
    - apps-browser
    - launcher
    - wesen-os
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Add help menu section, command id, and mode-aware doc window payload parsing.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts
      Note: Add `/api/os/help` and `/api/os/help/{slug}` query hooks.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/domain/types.ts
      Note: Add global help response types and mode contract types.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.tsx
      Note: Inject and route mode/config for shared doc browser shell.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocCenterHome.tsx
      Note: Add help-mode home rendering path that does not require app manifest membership.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocReaderScreen.tsx
      Note: Add help-mode detail fetch path.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/apps/os-launcher/src/__tests__/launcherMenuRuntime.test.tsx
      Note: Verify top-level help menu presence and baseline runtime behavior.
ExternalSources: []
Summary: >-
    Step-by-step implementation instructions for adding a launcher Help menu and
    introducing mode-configurable doc browser behavior for global help vs app docs.
LastUpdated: 2026-03-01T23:20:00-05:00
WhatFor: Intern execution guide with explicit contracts, migration plan, and test requirements.
WhenToUse: Read before implementing OS-06; use as PR review checklist.
---

# Implementation Guide: Global Help Menu and Customizable Doc Browser

## Context

The backend now exposes launcher/global help pages via:

- `/api/os/help`
- `/api/os/help/{slug}`
- aggregate inclusion in `/api/os/docs` under module id `wesen-os`

But the current frontend doc browser home is app-manifest-driven: it builds module cards only from `/api/os/apps` entries with docs hints. Because `wesen-os` is not an app manifest entry, global help does not appear as a first-class module in the current home screen.

## Product Requirement Interpretation

Implement two separate menu entry points, both using a shared doc browser implementation:

1. `Help > General Help`
- Opens global, non-app help pages.
- Data source is launcher help endpoints.

2. `Help > Apps Documentation Browser`
- Opens existing app/module docs experience.
- Data source remains app docs endpoints + aggregate docs search.

This implies one component tree with mode/config injection, not two independent doc browser implementations.

## Proposed Technical Contract

## 1) New Browser Mode Type

Add a mode enum in frontend doc-browser layer:

```ts
type DocBrowserMode = 'apps' | 'help';
```

Recommended config shape:

```ts
interface DocBrowserConfig {
  mode: DocBrowserMode;
  title: string;
  homeHeading: string;
  emptyStateText: string;
}
```

Use config to avoid hard-coded "Modules with Documentation" language in help mode.

## 2) New Command ID

In `apps-browser` launcher module, add command id:

- `apps-browser.open-help`

Keep existing commands:

- `apps-browser.open-docs`
- `apps-browser.open-doc-page`
- `apps-browser.search-docs`

## 3) Doc Window Route Grammar Extension

Today routes encode only screen/module/slug. Extend to include mode explicitly:

- `apps:home`
- `apps:search:<query>`
- `apps:module:<moduleId>`
- `apps:doc:<moduleId>:<slug>`
- `help:home`
- `help:search:<query>`
- `help:doc:<slug>`

Do not guess mode from module id. Make mode first token.

## 4) Menu Contribution

Add a top-level menu section contribution in `apps-browser` launcher module:

- Section id: `help`
- Label: `Help`
- Items:
  - `General Help` -> `apps-browser.open-help`
  - separator
  - `Apps Documentation Browser` -> `apps-browser.open-docs`

Rationale:
- `useDesktopShellController` merges contribution menus with default menus.
- This is the correct extension point for persistent top menu entries.

## 5) API Hooks For Help Mode

In `appsApi.ts` and domain types add:

- `getOSHelpDocs`: `/api/os/help`
- `getOSHelpDoc({ slug })`: `/api/os/help/{slug}`

Keep existing apps-mode hooks unchanged.

## 6) Mode-Specific Data Behavior

### Apps mode (existing)

- Home: app manifest + aggregate docs mapping.
- Reader: `/api/apps/{module}/docs/{slug}`.

### Help mode (new)

- Home: use `/api/os/help` and/or `/api/os/docs?module=wesen-os`.
- Reader: `/api/os/help/{slug}`.
- Do not require `/api/os/apps` for global help listing.

## Implementation Steps (Intern)

## Step A: Add Menu + Command Wiring

File: `go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx`

1. Add `COMMAND_OPEN_HELP = 'apps-browser.open-help'`.
2. Extend command matcher and run branch to open doc browser in `help` mode.
3. Add menu contribution section `help` with required entries.
4. Extend payload builder/parser for mode-aware routes.

## Step B: Extend API Layer

Files:

- `.../apps/apps-browser/src/domain/types.ts`
- `.../apps/apps-browser/src/api/appsApi.ts`

1. Add global-help response interfaces.
2. Add RTK query hooks for `/api/os/help` and `/api/os/help/{slug}`.
3. Export hooks for UI usage.

## Step C: Add Doc Browser Configurable Mode

Files:

- `.../components/doc-browser/DocBrowserWindow.tsx`
- `.../components/doc-browser/DocBrowserContext.tsx`
- `.../components/doc-browser/DocCenterHome.tsx`
- `.../components/doc-browser/DocReaderScreen.tsx`
- optional: `DocSearchScreen.tsx`

1. Thread `mode/config` from window payload to provider/screen components.
2. Branch data fetching/labels by mode.
3. Keep shared layout, navigation, and interaction primitives.

## Step D: Verify Runtime Integration

File:

- `wesen-os/apps/os-launcher/src/__tests__/launcherMenuRuntime.test.tsx`

Add assertion that top menu labels include `Help` once launcher boots with `apps-browser` module.

## Test Plan

## Unit/Component

- `apps-browser/src/launcher/module.test.tsx`
- Add tests for new `apps-browser.open-help` routing and mode parsing.

- Doc browser tests:
  - help mode home rendering.
  - help mode reader fetch path.
  - apps mode unchanged behavior.

## Launcher Runtime

- `wesen-os/apps/os-launcher/src/__tests__/launcherMenuRuntime.test.tsx`
- Validate `Help` menu visibility and no regression to existing sections.

## Manual QA Script

1. Start launcher + frontend.
2. Open `Help > General Help`.
3. Open a known page (e.g. `wesen-os-guide`) and verify content renders.
4. Open `Help > Apps Documentation Browser` and verify inventory/arc-agi/gepa docs still work.
5. Validate Cmd/Ctrl-click and context-menu open-in-new-window in both modes.

## Common Pitfalls

- Do not keep home screen app-manifest filtering in help mode.
- Do not fork into separate doc browser components; use mode-config.
- Do not overload `apps-browser.open-docs` with ambiguous behavior; keep explicit command ids.
- Ensure route parsing handles malformed mode tokens safely (default to `apps` home).

## Definition Of Done

- Help menu exists with both required entries.
- General Help opens launcher-help-backed doc browser mode.
- Apps Documentation Browser opens current app-docs mode.
- One shared doc browser implementation supports both modes via config.
- Tests and manual QA checklist pass.
