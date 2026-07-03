---
Title: implementation diary
Ticket: os-core-compat
Status: active
Topics:
  - frontend
  - architecture
  - widgets
  - theme
  - react
  - extraction
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Chronological notes for os-core compatibility facade work.
LastUpdated: 2026-04-09T20:23:20.444889806-04:00
WhatFor: Record implementation progress, decisions, failures, and validation for the os-core compatibility facade work.
WhenToUse: Update while rewiring os-core to consume macos1-react and preserving downstream compatibility.
---

# implementation diary

## Goal

Track the compatibility-facade work that makes `@go-go-golems/os-core` consume `@go-go-golems/macos1-react` internally while preserving the existing public surface for downstream packages.

## Context

The extraction work succeeded in creating `packages/macos1-react/`, but `os-core` still owns local copies of the presentational pieces. A hard removal would require broad changes across the repo. The compatibility-facade plan is the bridge: keep downstream imports stable, but move implementation ownership into `macos1-react`.

## Quick Reference

### Main files expected to change
- `workspace-links/go-go-os-frontend/package.json`
- `workspace-links/go-go-os-frontend/packages/os-core/package.json`
- `workspace-links/go-go-os-frontend/packages/os-core/src/index.ts`
- `workspace-links/go-go-os-frontend/packages/os-core/src/theme/index.ts`
- `workspace-links/go-go-os-frontend/packages/os-core/src/theme/HyperCardTheme.tsx`
- `workspace-links/go-go-os-frontend/packages/os-core/src/desktop/react/index.ts`
- `workspace-links/go-go-os-frontend/packages/os-core/src/components/shell/windowing/DesktopShellView.tsx`

### Main files that should stay local to os-core
- `packages/os-core/src/components/shell/windowing/useDesktopShellController.tsx`
- `packages/os-core/src/components/shell/windowing/desktopMenuRuntime.tsx`
- `packages/os-core/src/components/shell/windowing/contextActionRegistry.ts`
- `packages/os-core/src/components/shell/windowing/desktopContributions.ts`
- `packages/os-core/src/components/shell/windowing/desktopCommandRouter.ts`
- `packages/os-core/src/components/shell/windowing/windowContentAdapter.ts`

### Validation commands
```bash
cd workspace-links/go-go-os-frontend
npm run build -w packages/macos1-react
npm run build:dist -w packages/macos1-react
npm run build -w packages/os-core
npm run typecheck -w packages/os-core
```

## Usage Examples

### Example compatibility re-export
```ts
export * from '@go-go-golems/macos1-react/primitives';
export { PARTS, RICH_PARTS } from '@go-go-golems/macos1-react/parts';
export { Macos1Theme as HyperCardTheme } from '@go-go-golems/macos1-react';
```

### Example Phase 6-style DesktopShellView import rewrite
```ts
import { Macos1Theme } from '@go-go-golems/macos1-react';
import { PARTS } from '@go-go-golems/macos1-react/parts';
import { ContextMenu, Toast } from '@go-go-golems/macos1-react/primitives';
import { DesktopIconLayer, DesktopMenuBar, WindowLayer } from '@go-go-golems/macos1-react/shell';
```

## Log

### 2026-04-09 20:25 — Follow-up ticket created

Created ticket `os-core-compat` to track the compatibility-facade cleanup separately from the main extraction ticket.

Purpose of the split:
- keep the extraction ticket focused on creating `macos1-react`
- track repo-wide compatibility and cleanup in a dedicated workspace
- avoid losing the compatibility-facade plan in chat history

### 2026-04-09 20:35 — Compatibility Facade Implementation Started

Implemented the first pass of the compatibility facade in code.

**Files changed:**
- `workspace-links/go-go-os-frontend/package.json`
- `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs`
- `workspace-links/go-go-os-frontend/packages/os-core/package.json`
- `workspace-links/go-go-os-frontend/packages/os-core/tsconfig.json`
- `workspace-links/go-go-os-frontend/packages/os-core/src/index.ts`
- `workspace-links/go-go-os-frontend/packages/os-core/src/theme/index.ts`
- `workspace-links/go-go-os-frontend/packages/os-core/src/theme/HyperCardTheme.tsx`
- `workspace-links/go-go-os-frontend/packages/os-core/src/desktop-theme-macos1.ts`
- `workspace-links/go-go-os-frontend/packages/os-core/src/desktop/react/index.ts`
- `workspace-links/go-go-os-frontend/packages/os-core/src/components/shell/windowing/DesktopShellView.tsx`
- `workspace-links/go-go-os-frontend/packages/os-core/src/components/shell/windowing/desktopMenuRuntime.tsx`

**Main implementation points:**
- added `@go-go-golems/macos1-react` as an `os-core` dependency
- updated root build scripts so `macos1-react` builds before `os-core`
- rewired `DesktopShellView.tsx` to consume `Macos1Theme`, `PARTS`, `ContextMenu`, `Toast`, `DesktopIconLayer`, `DesktopMenuBar`, and `WindowLayer` from `macos1-react`
- converted `os-core/theme/index.ts` into a compatibility facade over `@go-go-golems/macos1-react/theme`
- converted `os-core/src/theme/HyperCardTheme.tsx` into a backward-compatible shim
- rewired `os-core/src/index.ts` to re-export base primitives from `@go-go-golems/macos1-react/primitives`
- rewired presentational shell exports in `os-core/src/desktop/react/index.ts` to `@go-go-golems/macos1-react/shell`
- changed `desktopMenuRuntime.tsx` to use the extracted shell window scope context so `WindowLayer` and `useDesktopWindowId()` remain coherent
- updated `build-dist.mjs` to understand object-style `exports` entries with `types`/`default`
- added `os-core/tsconfig.json` path mappings to the built declaration files under `packages/macos1-react/dist/`

**Validation results so far:**
- `npm run build:dist -w packages/macos1-react` ✅
- `npm run build -w packages/os-core` ✅
- `npm run build:dist -w packages/os-core` ✅
- downstream package spot checks:
  - `npm run build -w packages/os-chat` ✅
  - `npm run build -w packages/os-kanban` ✅
  - `npm run build -w packages/os-ui-cards` ✅

**Open caveat:**
- an app-level spot check with `apps/todo` still surfaced broader project-reference issues involving `os-scripting`/`os-core` declaration usage. This should be treated as follow-up validation, not proof that the compatibility facade itself is fundamentally broken.

### 2026-04-09 21:10 — CSS facade validation fixed and Phase 6 closed

Finished the remaining Phase 6 validation issue around theme CSS loading through `@go-go-golems/os-core/theme`.

**Problem observed:**
- `apps/crm` already imported `@go-go-golems/os-core/theme`
- the app built successfully
- but the emitted CSS bundle initially did **not** include the expected macos1/os-core theme selectors and tokens
- root/export smoke tests passed, but the CSS side-effect chain was not clearly flowing through the facade in the Vite app build

**Root cause:**
- `tooling/vite/createHypercardViteConfig.ts` aliased `@go-go-golems/os-core` to `packages/os-core/src`, but did **not** alias `@go-go-golems/macos1-react`
- `os-core/src/theme/index.ts` imported `@go-go-golems/macos1-react/theme`, which therefore resolved through the package boundary rather than the same source-alias flow used by local workspace packages
- in practice, this meant the app build did not reliably pull the macos1-react CSS side effects into the final app CSS bundle during workspace/Vite development mode

**Fix:**
- added a Vite alias in `tooling/vite/createHypercardViteConfig.ts`:
  - `@go-go-golems/macos1-react` → `packages/macos1-react/src`

**Validation after fix:**
- `npm run build -w apps/crm` ✅
- emitted CSS bundle grew from ~3.4 kB to ~39.6 kB, which is expected once the extracted theme/primitives/shell CSS is included
- verified the built CSS now contains:
  - `[data-widget=macos1],[data-widget=hypercard]`
  - `theme-macos1`
  - `Geneva`
  - `[data-part=btn]`
  - shell/windowing selectors and token declarations
- this closes the remaining Phase 6 compatibility-facade CSS question

**Phase 6 status after this step:**
- theme facade import/bundling ✅
- root `os-core` widget compatibility surface ✅
- `os-core/desktop-react` compatibility surface ✅
- app-level consumer validation (`apps/crm`) ✅

## Related

- `design/01-os-core-compatibility-facade-implementation-plan.md`
- extraction ticket: `ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/`
