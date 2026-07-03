---
Title: os-core compatibility facade implementation plan
Ticket: os-core-compat
Status: active
Topics:
  - frontend
  - architecture
  - widgets
  - theme
  - react
  - extraction
DocType: design
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Detailed plan for turning os-core into a compatibility facade over macos1-react without forcing a repo-wide migration.
LastUpdated: 2026-04-09T20:23:20.297166898-04:00
WhatFor: Keep the repo stable while moving presentational UI ownership from os-core to macos1-react.
WhenToUse: Use when rewiring os-core, planning the cleanup of duplicated UI code, or deciding whether downstream packages must migrate immediately.
---

# os-core compatibility facade implementation plan

## 1. Goal

Turn `@go-go-golems/os-core` into a **compatibility facade** over `@go-go-golems/macos1-react` for the extracted presentational UI pieces, while keeping runtime/controller functionality inside `os-core`.

This lets us:
- finish Phase 6 of the extraction ticket
- avoid a repo-wide breaking migration right now
- preserve existing imports in downstream packages/apps
- gradually reduce duplication in `os-core`

## 2. Non-Goal

This ticket is **not** about migrating every consumer in the repo from `@go-go-golems/os-core` to `@go-go-golems/macos1-react`.

Downstream packages such as `os-chat`, `os-kanban`, `os-ui-cards`, `os-confirm`, `os-scripting`, and the apps under `apps/` should continue to work unchanged for now.

## 3. Repo Paths

Use these paths consistently:

- Repo root: `wesen-os/`
- Frontend workspace root: `wesen-os/workspace-links/go-go-os-frontend/`
- Extracted package: `wesen-os/workspace-links/go-go-os-frontend/packages/macos1-react/`
- Compatibility package: `wesen-os/workspace-links/go-go-os-frontend/packages/os-core/`
- Follow-up ticket root: `wesen-os/ttmp/2026/04/09/os-core-compat--os-core-compatibility-facade-over-macos1-react/`

## 4. Problem Statement

We successfully extracted theme, base primitives, rich primitives, and shell primitives into `packages/macos1-react/`, but `os-core` still contains local copies and still imports its local implementations.

Examples:
- `packages/os-core/src/index.ts` still re-exports `./components/widgets`
- `packages/os-core/src/theme/index.ts` still imports its own CSS and exports `HyperCardTheme`
- `packages/os-core/src/components/shell/windowing/DesktopShellView.tsx` still imports local `DesktopIconLayer`, `DesktopMenuBar`, `WindowLayer`, `ContextMenu`, `Toast`, and `HyperCardTheme`

At the same time, many packages/apps in the repo still depend on `@go-go-golems/os-core` for presentational components.

A hard cleanup would require broad downstream changes. The safer path is to make `os-core` a facade first.

## 5. Proposal

### 5.1 High-Level Strategy

Do the cleanup in three layers:

1. **Package graph / build wiring**
   - make `os-core` depend on `macos1-react`
   - build `macos1-react` before `os-core`

2. **Internal `os-core` rewiring**
   - switch `os-core` source files to import extracted presentational pieces from `macos1-react`
   - keep runtime/controller modules local to `os-core`

3. **Compatibility re-exports**
   - keep `@go-go-golems/os-core` public imports working for downstream packages
   - defer direct downstream migration

### 5.2 Architectural Boundary

**Move ownership to `macos1-react`:**
- theme CSS
- `Macos1Theme`
- base widget primitives
- rich primitive subset
- shell presentational primitives
- `PARTS` / `RICH_PARTS`

**Keep ownership in `os-core`:**
- runtime types outside presentational shell surface
- desktop controller/runtime logic
- windowing Redux state
- command routing
- contribution registry
- menu runtime provider
- notification/runtime state

## 6. Exact Compatibility-Facade Plan

### 6.1 `packages/os-core/package.json`

Add a dependency:

```json
"dependencies": {
  "@go-go-golems/macos1-react": "workspace:*",
  "debug": "^4.4.3"
}
```

Reason:
- `os-core` source will import from `macos1-react`
- this should be a real workspace dependency, not only an alias

### 6.2 Root build scripts

File:
- `workspace-links/go-go-os-frontend/package.json`

Update these scripts so `macos1-react` builds before `os-core`:

- `build`
- `build:publish-v1`

Example shape:

```json
"build": "npm run build -w packages/macos1-react && npm run build -w packages/os-core && ..."
```

```json
"build:publish-v1": "npm run build:dist -w packages/macos1-react && npm run build:dist -w packages/os-core && ..."
```

### 6.3 `packages/os-core/src/components/shell/windowing/DesktopShellView.tsx`

Rewire imports from local presentational code to `macos1-react`.

#### Replace

```ts
import { PARTS } from '../../../parts';
import { HyperCardTheme } from '../../../theme/HyperCardTheme';
import { ContextMenu } from '../../widgets/ContextMenu';
import { Toast } from '../../widgets/Toast';
import { DesktopIconLayer } from './DesktopIconLayer';
import { DesktopMenuBar } from './DesktopMenuBar';
import { WindowLayer } from './WindowLayer';
```

#### With

```ts
import { Macos1Theme } from '@go-go-golems/macos1-react';
import { PARTS } from '@go-go-golems/macos1-react/parts';
import { ContextMenu, Toast } from '@go-go-golems/macos1-react/primitives';
import { DesktopIconLayer, DesktopMenuBar, WindowLayer } from '@go-go-golems/macos1-react/shell';
```

#### Keep local

```ts
import { DesktopWindowMenuRuntimeProvider } from './desktopMenuRuntime';
import type { DesktopShellControllerResult } from './useDesktopShellController';
```

#### Update JSX

```tsx
<Macos1Theme theme={themeClass}>
  ...
</Macos1Theme>
```

### 6.4 `packages/os-core/src/index.ts`

Turn base widget exports and theme export into compatibility re-exports.

#### Current behavior
- re-exports from `./components/widgets`
- exports `HyperCardTheme` from local source
- exports `./parts`

#### Proposed behavior
- re-export widget primitives from `@go-go-golems/macos1-react/primitives`
- re-export `PARTS` from `@go-go-golems/macos1-react/parts`
- expose `Macos1Theme` and optionally a deprecated alias `HyperCardTheme`
- keep runtime/state exports local

Suggested shape:

```ts
// Widgets
export * from '@go-go-golems/macos1-react/primitives';

// Parts
export { PARTS, RICH_PARTS } from '@go-go-golems/macos1-react/parts';
export type { PartName, RichPartName } from '@go-go-golems/macos1-react/parts';

// Theme
export { Macos1Theme } from '@go-go-golems/macos1-react';
export type { Macos1ThemeProps } from '@go-go-golems/macos1-react';
```

If compatibility alias is needed:

```ts
export { Macos1Theme as HyperCardTheme } from '@go-go-golems/macos1-react';
export type { Macos1ThemeProps as HyperCardThemeProps } from '@go-go-golems/macos1-react';
```

### 6.5 `packages/os-core/src/theme/index.ts`

Replace local CSS imports with:

```ts
import '@go-go-golems/macos1-react/theme';
export { Macos1Theme } from '@go-go-golems/macos1-react';
export type { Macos1ThemeProps } from '@go-go-golems/macos1-react';
```

If a compatibility alias is required, export it here too.

### 6.6 `packages/os-core/src/theme/HyperCardTheme.tsx`

Convert this file into a thin compatibility shim instead of deleting it immediately.

Suggested approach:

```ts
export { Macos1Theme as HyperCardTheme } from '@go-go-golems/macos1-react';
export type { Macos1ThemeProps as HyperCardThemeProps } from '@go-go-golems/macos1-react';
```

This preserves internal and downstream imports that still reference `HyperCardTheme`.

### 6.7 `packages/os-core/src/desktop/react/index.ts`

This file currently exports both runtime pieces and presentational shell pieces.

Split intent as follows:

**Re-export from `macos1-react`:**
- `DesktopIconLayer`
- `DesktopMenuBar`
- `WindowLayer`
- `WindowResizeHandle`
- `WindowSurface`
- `WindowTitleBar`
- shell presentational types

**Keep local in `os-core`:**
- `DesktopShell`
- `DesktopShellView`
- `composeDesktopContributions`
- `DesktopWindowMenuRuntimeProvider`
- `useDesktopShellController`
- command routing
- content adapters
- runtime registries

This preserves the existing `desktop-react` public surface while moving UI ownership.

## 7. What Not to Do Yet

Do **not** do these in this ticket:

- mass-update all downstream packages to import from `macos1-react`
- delete local widget files from `os-core/src/components/widgets/`
- delete local shell presentational files immediately
- change `os-chat`, `os-kanban`, `os-ui-cards`, `os-confirm`, or app imports directly
- move runtime/controller code out of `os-core`

Those are follow-up cleanup tasks after the compatibility facade works.

## 8. Validation Plan

### 8.1 Build and typecheck

From `workspace-links/go-go-os-frontend/` run:

```bash
npm run build -w packages/macos1-react
npm run build:dist -w packages/macos1-react
npm run build -w packages/os-core
npm run typecheck -w packages/os-core
```

### 8.2 Integration validation

Verify:
- `packages/os-core/src/components/shell/windowing/DesktopShellView.tsx` resolves package imports correctly
- `@go-go-golems/os-core/theme` still works
- `@go-go-golems/os-core` still exports `Btn`, `Checkbox`, etc.
- `@go-go-golems/os-core/desktop-react` still exports shell presentational pieces and runtime pieces

### 8.3 Consumer smoke tests

Spot-check downstream packages/apps without migrating them:
- `packages/os-chat`
- `packages/os-kanban`
- `packages/os-ui-cards`
- `apps/todo`
- `apps/crm`

The goal is to confirm they still build against `os-core` unchanged.

## 9. Future Follow-Up After This Ticket

Once the compatibility facade is stable, create a later cleanup pass for:
- removing duplicated source files from `os-core`
- migrating direct consumers to `macos1-react` where desirable
- deciding whether `HyperCardTheme` alias remains or is removed
- tightening `desktop-react` type exports if needed

## 10. Recommendation

Proceed with the compatibility-facade approach first. It minimizes blast radius, finishes the Phase 6 integration story, and gives us a safe path to later deletion/migration work.
