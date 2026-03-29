---
Title: Clean Workspace Composition Architecture, Migration Plan, and Intern Guide
Ticket: APP-02-WORKSPACE-COMPOSITION-REORG
Status: active
Topics:
    - wesen-os
    - frontend
    - architecture
    - tooling
    - pnpm-workspace
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: go-go-app-inventory/apps/inventory/package.json
      Note: Example of a better public launcher export package
    - Path: go-go-os-backend/pkg/backendhost/module.go
      Note: Stable backend module contract
    - Path: go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts
      Note: Frontend app module runtime contract
    - Path: go-go-os-frontend/packages/desktop-os/src/store/createLauncherStore.ts
      Note: Launcher store assembly contract
    - Path: go.work
      Note: Current Go workspace composition root
    - Path: wesen-os/apps/os-launcher/src/app/modules.tsx
      Note: Static launcher module list that treats optional apps as required
    - Path: wesen-os/apps/os-launcher/src/app/store.ts
      Note: Host-level imports of app-internal reducers
    - Path: wesen-os/apps/os-launcher/tsconfig.json
      Note: Duplicated TypeScript path coupling into sibling repos
    - Path: wesen-os/apps/os-launcher/vite.config.ts
      Note: Manual frontend alias map and sibling-repo coupling
    - Path: wesen-os/cmd/wesen-os-launcher/main.go
      Note: Backend composition and route mounting in the host binary
ExternalSources: []
Summary: Redesign the current split-repo launcher composition into a package-based, top-level workspace model with generated registries, explicit optional-app handling, and intern-friendly operational documentation.
LastUpdated: 2026-03-05T15:00:00-05:00
WhatFor: Give engineers a clear, evidence-backed plan for replacing brittle sibling-path composition with a clean workspace and package contract model.
WhenToUse: When reorganizing local development, launcher app composition, or cross-repo package boundaries for wesen-os and go-go-os frontend apps.
---


# Clean Workspace Composition Architecture, Migration Plan, and Intern Guide

## Executive Summary

The current `wesen-os` composition model works, but it is brittle because the frontend launcher imports sibling repositories by filesystem path instead of consuming packages through a real workspace dependency graph. The backend side is in somewhat better shape because it already composes named Go modules through `go.mod`, `go.work`, and wrapper packages, but the frontend side still depends on handwritten Vite aliases, handwritten TypeScript path maps, and direct imports into app internals.

This design document proposes the cleanest practical reorganization:

1. Introduce a dedicated top-level development workspace that owns the local multi-repo composition graph.
2. Make `wesen-os` consume frontend apps as packages, not as `../../../repo/src/...` aliases.
3. Standardize a public launcher export for every app package.
4. Replace handwritten app lists with a generated registry driven by a workspace manifest.
5. Make optional apps truly optional so missing repos do not break `pnpm dev`, `pnpm build`, or `pnpm test`.
6. Keep the existing runtime contracts that are already good: `backendhost.AppBackendModule`, `desktop-os` launcher manifests, app registries, and namespaced backend routes.

This document is written for a new intern. It starts by explaining what the system is today, why the current shape fails in practice, what the clean target shape should be, and how to migrate without breaking the launcher.

## Problem Statement

### The short version

`wesen-os` is currently acting as the composition root for multiple frontend and backend app repositories, but its frontend composition is based on sibling repository layout rather than package contracts. That means the launcher build depends on local clone names, clone presence, install order, and internal `src` paths from other repos.

### The concrete symptoms

The current repository state shows several kinds of coupling:

1. `wesen-os/apps/os-launcher/vite.config.ts` manually aliases package names to sibling repository source directories such as `go-go-os-frontend/packages/engine/src`, `go-go-app-inventory/apps/inventory/src`, `go-go-app-arc-agi-3/apps/arc-agi-player/src`, and `go-go-app-sqlite/apps/sqlite/src` (`wesen-os/apps/os-launcher/vite.config.ts:20` to `:56`).
2. The same mapping is duplicated in `wesen-os/apps/os-launcher/vitest.config.ts` (`wesen-os/apps/os-launcher/vitest.config.ts:17` to `:53`).
3. The same mapping is duplicated again in `wesen-os/apps/os-launcher/tsconfig.json` (`wesen-os/apps/os-launcher/tsconfig.json:21` to `:61`).
4. The launcher hard-imports optional apps in `wesen-os/apps/os-launcher/src/app/modules.tsx` (`wesen-os/apps/os-launcher/src/app/modules.tsx:1` to `:20`).
5. The launcher store also imports app-internal Redux slices directly from app feature folders, not from public exports (`wesen-os/apps/os-launcher/src/app/store.ts:3` to `:25`).
6. The startup playbook still tells developers to ensure a very specific sibling layout, including repos that are not present in this workspace (`wesen-os/docs/startup-playbook.md:7` to `:16`).

The result is that the launcher is not merely composed from packages. It is assembled from live source trees plus assumptions about what happens to be checked out next to `wesen-os`.

### Why this matters

This design creates failure modes that are operationally expensive:

1. A missing sibling repo causes immediate build failure, even if that app should be optional.
2. A missing install in a sibling repo can break Vite resolution.
3. Any change to folder layout requires synchronized edits across Vite, Vitest, TypeScript, scripts, and docs.
4. The public/private boundary of each app becomes unclear because `wesen-os` imports internal app files directly.
5. New engineers cannot tell which dependencies are contractual and which are accidental.

## Scope

### In scope

This document covers:

1. The current workspace and package layout across `wesen-os`, `go-go-os-frontend`, `go-go-app-inventory`, and related optional app repos.
2. The backend composition model and why it is closer to the correct shape already.
3. The frontend launcher model and why it is still too path-driven.
4. A target architecture for a clean local development workspace.
5. New package/API contracts for launcher integrations.
6. A phased migration plan, including generated registries, validation commands, and documentation changes.

### Out of scope

This document does not redesign:

1. The `desktop-os` visual shell.
2. The HyperCard runtime itself.
3. The semantics of `backendhost.AppBackendModule`.
4. Product-level UX or app-specific feature work.

## Audience And How To Read This Document

This guide assumes the reader is new to the codebase.

If you are an intern, read it in this order:

1. `What The System Is`
2. `Current-State Architecture`
3. `What Is Wrong Today`
4. `Target Architecture`
5. `Implementation Phases`
6. `Testing And Validation`

If you are a senior engineer planning the migration, focus on:

1. `Evidence Summary`
2. `Design Decisions`
3. `API Sketches`
4. `Implementation Plan`
5. `Risks And Alternatives`

## What The System Is

At a high level, the `wesen-os` ecosystem is a launcher shell that composes multiple apps into one desktop-like runtime.

There are two major halves:

1. Backend composition.
2. Frontend composition.

### Backend composition, conceptually

The backend composition model is:

```text
Go backend modules
  -> implement backendhost.AppBackendModule
  -> get registered in a module registry
  -> are lifecycle-managed
  -> are mounted under /api/apps/<app-id>/...
  -> are listed in /api/os/apps
```

The relevant backend contract is already explicit:

- `go-go-os-backend/pkg/backendhost/module.go:19` to `:27`
- `go-go-os-backend/pkg/backendhost/manifest_endpoint.go:38` to `:123`
- `wesen-os/cmd/wesen-os-launcher/main.go:314` to `:341`

That is a good foundation. Backend modules are named, typed, and discoverable.

### Frontend composition, conceptually

The frontend composition model is intended to be:

```text
Frontend app modules
  -> implement LaunchableAppModule
  -> are added to a launcher registry
  -> contribute icons / commands / renderers
  -> provide reducers if needed
  -> render windows inside DesktopShell
```

This contract also exists already:

- `go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts:22` to `:28`
- `go-go-os-frontend/packages/desktop-os/src/registry/createAppRegistry.ts:22` to `:42`
- `go-go-os-frontend/packages/desktop-os/src/store/createLauncherStore.ts:71` to `:90`

So the problem is not that the system lacks a frontend composition model. The problem is that `wesen-os` is not consuming that model through stable package boundaries.

## Repository Primer

### The current workspace root

The current working directory contains multiple sibling repositories:

```text
os-openai-app-server/
  go-go-app-inventory/
  go-go-goja/
  go-go-os-backend/
  go-go-os-frontend/
  openai-app-server/
  wesen-os/
```

The root Go workspace includes:

- `go-go-app-inventory`
- `go-go-goja`
- `go-go-os-backend`
- `openai-app-server`
- `wesen-os`

This is encoded in `go.work` (`go.work:3` to `:8`).

Notably, `go-go-os-frontend` is not part of `go.work`, which is expected because it is a Node/TypeScript workspace, but it reinforces that there is no single top-level workspace model covering both Go and frontend composition today.

### Repo responsibilities

Use this table as a mental map:

| Repo | What it owns today | Why it matters here |
| --- | --- | --- |
| `wesen-os` | launcher frontend host, embedded UI, composed backend binary | current composition root |
| `go-go-os-backend` | backendhost contracts, module registry, namespaced routing, manifest endpoint | stable backend API surface |
| `go-go-os-frontend` | engine, desktop-os, shared runtime packages, some bundled apps | shared frontend platform |
| `go-go-app-inventory` | inventory frontend app package and backend module | example of better package exports |
| optional app repos | ARC, sqlite, GEPA, others | currently coupled too directly |

## Evidence Summary

### 1. `wesen-os` owns the current frontend host

`wesen-os/package.json` defines the launcher commands and points everything at `apps/os-launcher` (`wesen-os/package.json:7` to `:22`).

That is fine. The launcher app belongs here.

### 2. `wesen-os` is only a tiny pnpm workspace

`wesen-os/pnpm-workspace.yaml` only includes `apps/*` (`wesen-os/pnpm-workspace.yaml:1` to `:2`).

That means the launcher does not consume sibling repos through workspace linking. Instead, it reaches out to them via alias maps.

### 3. `go-go-os-frontend` is a separate pnpm workspace

`go-go-os-frontend/pnpm-workspace.yaml` includes `packages/*` and `apps/*` (`go-go-os-frontend/pnpm-workspace.yaml:1` to `:3`).

That means shared packages like `@hypercard/engine` and `@hypercard/desktop-os` are only workspace-local inside that repo unless something else explicitly links them.

### 4. Vite/Vitest/TS in `wesen-os` mirror the same alias map

The launcher duplicates the same composition map across:

1. `wesen-os/apps/os-launcher/vite.config.ts:13` to `:56`
2. `wesen-os/apps/os-launcher/vitest.config.ts:10` to `:53`
3. `wesen-os/apps/os-launcher/tsconfig.json:12` to `:61`

This is a classic drift problem. Whenever a new app is added, removed, renamed, or reorganized, multiple files must be edited in lock-step.

### 5. `wesen-os` imports app internals directly

Examples:

1. `@hypercard/book-tracker-debug/src/launcher/module`
2. `@hypercard/crm/src/launcher/module`
3. `@hypercard/todo/src/launcher/module`
4. `@hypercard/crm/src/features/...`
5. `@hypercard/todo/src/features/tasks/tasksSlice`

See:

- `wesen-os/apps/os-launcher/src/app/modules.tsx:1` to `:9`
- `wesen-os/apps/os-launcher/src/app/store.ts:3` to `:9`

That means the launcher depends on app-internal file layout, not just exported package contracts.

### 6. Some apps already expose a better package shape

`go-go-app-inventory/apps/inventory/package.json` exports:

1. `.` -> `./src/index.ts`
2. `./launcher` -> `./src/launcher/public.ts`
3. `./reducers` -> `./src/reducers.ts`

See `go-go-app-inventory/apps/inventory/package.json:6` to `:10`.

`go-go-os-frontend/apps/apps-browser/package.json` and `go-go-os-frontend/apps/hypercard-tools/package.json` also expose `./launcher` (`go-go-os-frontend/apps/apps-browser/package.json:9` to `:12`, `go-go-os-frontend/apps/hypercard-tools/package.json:6` to `:9`).

That is the direction we want.

### 7. Some apps do not expose a launcher package contract yet

`todo`, `crm`, and `book-tracker-debug` do not currently declare `exports` in their package manifests:

- `go-go-os-frontend/apps/todo/package.json:1` to `:27`
- `go-go-os-frontend/apps/crm/package.json:1` to `:28`
- `go-go-os-frontend/apps/book-tracker-debug/package.json`

Because of that, `wesen-os` imports their `src` internals directly.

### 8. The docs encode the same brittle workspace expectation

The startup playbook requires a very specific sibling layout and says both `wesen-os` and `go-go-os-frontend` must be installed separately (`wesen-os/docs/startup-playbook.md:7` to `:31`).

The setup script also clones or requires repos ad hoc (`wesen-os/scripts/setup-workspace.sh:16` to `:32`).

This tells us the project is already compensating operationally for a missing first-class workspace model.

## Current-State Architecture

### Backend flow today

The backend flow is already structured and mostly sound.

The launcher binary:

1. creates backend modules,
2. builds a `ModuleRegistry`,
3. starts lifecycle management,
4. registers `/api/os/apps`,
5. mounts each backend under `/api/apps/<app-id>/...`,
6. serves the embedded SPA.

The critical lines are:

- `wesen-os/cmd/wesen-os-launcher/main.go:314` to `:341`

This gives us the current backend diagram:

```text
+--------------------------------------------+
| cmd/wesen-os-launcher                      |
|                                            |
| modules := []AppBackendModule{...}         |
| registry := NewModuleRegistry(modules...)  |
| lifecycle.Startup(requiredApps)            |
| RegisterAppsManifestEndpoint(appMux)       |
| MountNamespacedRoutes(appMux, appID, ...)  |
| appMux.Handle("/", launcherui.Handler())   |
+------------------------+-------------------+
                         |
                         v
               /api/os/apps
               /api/apps/inventory/*
               /api/apps/sqlite/*
               /api/apps/gepa/*
```

### Frontend flow today

The frontend flow is conceptually clean, but operationally messy.

The launcher app:

1. imports `launcherModules`,
2. builds `launcherRegistry`,
3. builds a combined launcher store,
4. builds desktop contributions,
5. renders app windows through the registry.

The key files are:

- `wesen-os/apps/os-launcher/src/app/modules.tsx`
- `wesen-os/apps/os-launcher/src/app/registry.ts`
- `wesen-os/apps/os-launcher/src/app/store.ts`
- `wesen-os/apps/os-launcher/src/App.tsx`

The conceptual frontend diagram is:

```text
app packages
  -> export launcher module(s)
  -> launcher registry sorts and validates manifests
  -> launcher store merges reducers
  -> DesktopShell renders icons, commands, windows
```

The `desktop-os` contracts are clear:

```ts
export interface LaunchableAppModule {
  manifest: AppManifest
  state?: LaunchableAppStateConfig
  buildLaunchWindow(ctx, reason): OpenWindowPayload
  createContributions?(ctx): DesktopContribution[]
  renderWindow(params): ReactNode | null
  onRegister?(ctx): void
}
```

That contract is from `go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts:22` to `:28`.

The problem is the launcher does not resolve those modules via installed package exports. It resolves them via path aliases into source trees.

### Why the current launcher startup fails in practice

The real-world failure chain looks like this:

1. Vite resolves `@hypercard/*` aliases by filesystem path.
2. If the target repo is missing, the build fails with `ENOENT`.
3. If the repo exists but dependencies are not installed the way the alias expects, the build can still fail.
4. Because `modules.tsx` imports optional apps statically, the whole launcher fails even when only one optional repo is absent.

This is not hypothetical. It was observed directly while investigating the current workspace:

1. `vite` initially failed to resolve React from a sibling-repo path.
2. After tightening the React alias to use `apps/os-launcher/node_modules`, the next failure was a missing `go-go-app-arc-agi-3` source file.
3. TypeScript then failed across many packages because `wesen-os` was referencing packages whose dependencies were never installed in one unified workspace.

The system is telling us clearly that the dependency graph exists conceptually, but not structurally.

## What Is Wrong Today

This section translates the evidence into architecture problems.

### Problem 1: The package graph is implicit

Today, the real dependency graph is spread across:

1. `wesen-os/package.json`
2. `wesen-os/pnpm-workspace.yaml`
3. `go-go-os-frontend/package.json`
4. `go-go-os-frontend/pnpm-workspace.yaml`
5. `wesen-os/apps/os-launcher/vite.config.ts`
6. `wesen-os/apps/os-launcher/vitest.config.ts`
7. `wesen-os/apps/os-launcher/tsconfig.json`
8. `wesen-os/docs/startup-playbook.md`
9. `wesen-os/scripts/setup-workspace.sh`

That is too many places for one dependency model.

### Problem 2: Package contracts are inconsistent

Some apps export `./launcher`; some do not.

That means there is no guarantee that every app can be consumed the same way. If an engineer adds a new app, they cannot infer the correct package surface by convention alone.

### Problem 3: Optional apps are compiled as required apps

The launcher currently imports ARC and sqlite directly:

- `wesen-os/apps/os-launcher/src/app/modules.tsx:4`
- `wesen-os/apps/os-launcher/src/app/modules.tsx:8`

If the source repo is missing, the launcher does not degrade gracefully. It simply fails to build.

This violates a key composition rule:

> Optional app absence should remove functionality, not destroy the host.

### Problem 4: The launcher store imports app internals

`store.ts` reaches into feature slices directly (`wesen-os/apps/os-launcher/src/app/store.ts:3` to `:9`).

This means:

1. `wesen-os` knows internal file locations of app repos.
2. App state composition logic leaks into the host.
3. Refactoring app internals becomes host-breaking.

### Problem 5: There is no single “workspace root” for Node composition

The Go side has a top-level `go.work`.

The frontend side does not have an equivalent top-level `pnpm-workspace.yaml` that covers all participating repos.

Instead, each repo is its own isolated workspace and `wesen-os` bridges them by path aliasing.

That is the wrong level of abstraction.

## Design Goals

The migration should satisfy these goals:

1. A missing optional app repo should not break launcher startup.
2. `wesen-os` should depend on package names and public exports, not app `src` internals.
3. The frontend workspace graph should be declared once.
4. The backend composition contract should remain stable.
5. The migration should preserve split repositories and independent release cadence.
6. New engineers should have one canonical setup flow.
7. Build, test, typecheck, and dev should all consume the same dependency model.

## Target Architecture

### High-level decision

The cleanest target is not a full monorepo and not the status quo. It is a dedicated top-level composition workspace with explicit package contracts.

Call it a “workspace repo” or “workspace root”. The name matters less than the role.

### The target shape

```text
workspace-root/
  package.json
  pnpm-workspace.yaml
  go.work
  workspace.apps.yaml
  scripts/
    workspace-doctor.sh
    generate-launcher-registry.mjs
  repos/
    wesen-os/                # or sibling checkout path
    go-go-os-frontend/
    go-go-app-inventory/
    go-go-app-sqlite/        # optional
    go-go-app-arc-agi-3/     # optional
    go-go-gepa/              # optional
```

The functional rule is:

1. the workspace root owns dependency linking,
2. package exports define public frontend entrypoints,
3. a manifest drives which apps are present and enabled,
4. generated registry files feed the launcher.

### Why this is the cleanest practical option

This preserves:

1. separate Git repos,
2. independent app ownership,
3. independent release cadence,
4. existing backend contracts,
5. existing `desktop-os` runtime abstractions.

It removes:

1. sibling `src` path imports from `wesen-os`,
2. repeated alias maps in three config files,
3. static imports for missing optional apps,
4. hidden install-order requirements.

## Target Ownership Model

### `wesen-os`

`wesen-os` should own:

1. launcher app host,
2. embedded frontend build output,
3. backend binary composition,
4. launcher-specific help/docs,
5. workspace-level generated frontend registry output.

`wesen-os` should not own:

1. other repos’ source path maps,
2. app-internal slice imports,
3. knowledge of app internal file layout.

### `go-go-os-frontend`

`go-go-os-frontend` should own:

1. `@hypercard/engine`
2. `@hypercard/desktop-os`
3. `@hypercard/chat-runtime`
4. `@hypercard/hypercard-runtime`
5. shared launcher-app contract types
6. any bundled core apps that are intentionally part of that repo

### App repos

Each app repo should own:

1. its own public package exports,
2. its own launcher integration export,
3. its own reducers and store contributions,
4. its own backend module,
5. its own docs and tests.

The host should import only the public launcher integration export, never internal files.

## Target Frontend Package Contract

Every app that can appear in the launcher should expose the same public surface.

### Required package exports

Each app package should export:

1. `.` for general package usage,
2. `./launcher` for launcher composition,
3. optional `./docs` or `./contracts` if needed later.

Example:

```json
{
  "name": "@hypercard/example-app",
  "exports": {
    ".": "./src/index.ts",
    "./launcher": "./src/launcher/public.ts"
  }
}
```

### Required launcher export shape

The launcher export should not make `wesen-os` guess which reducers or modules it needs.

I recommend a new contract:

```ts
import type { Reducer } from "@reduxjs/toolkit";
import type { LaunchableAppModule } from "@hypercard/desktop-os";

export interface LauncherAppIntegration {
  module: LaunchableAppModule;
  reducers?: Record<string, Reducer>;
  requiredWorkspacePackages?: string[];
}
```

The main difference from the current system is that store contributions become part of the public integration contract, instead of being separately imported by `wesen-os`.

### Why not put everything inside `LaunchableAppModule`?

That is possible, but I do not recommend it.

Reasons:

1. `LaunchableAppModule` is already a good runtime contract.
2. Reducer contributions are assembly metadata, not window rendering behavior.
3. Keeping an outer `LauncherAppIntegration` object makes the separation explicit:
   - `module` describes runtime behavior;
   - `reducers` describe store assembly;
   - other future assembly metadata can be added without bloating the core module contract.

## Target Workspace Manifest

The host needs one declarative source of truth for which apps exist locally and which are enabled.

I recommend a manifest file at the workspace root:

```yaml
apps:
  - id: inventory
    enabled: true
    required: true
    frontendPackage: "@hypercard/inventory"
    launcherExport: "@hypercard/inventory/launcher"
    backendModule: "github.com/go-go-golems/go-go-app-inventory/pkg/backendmodule"

  - id: sqlite
    enabled: auto
    required: false
    frontendPackage: "@hypercard/sqlite"
    launcherExport: "@hypercard/sqlite/launcher"
    backendModule: "github.com/go-go-golems/go-go-app-sqlite/pkg/backendcomponent"

  - id: arc-agi-player
    enabled: auto
    required: false
    frontendPackage: "@hypercard/arc-agi-player"
    launcherExport: "@hypercard/arc-agi-player/launcher"
    backendModule: "github.com/go-go-golems/go-go-app-arc-agi/pkg/backendmodule"
```

### Meaning of `enabled`

Use these semantics:

1. `true`
   - fail if the package is missing.
2. `false`
   - do not include the app.
3. `auto`
   - include the app if the package is installed and the backend module is available.

This gives a clean and teachable rule for optional apps.

## Generated Registry Approach

### Why generate?

Because handwritten app lists are where optionality breaks.

The current launcher list is manual:

```ts
export const launcherModules: LaunchableAppModule[] = [
  inventoryLauncherModule,
  sqliteLauncherModule,
  todoLauncherModule,
  crmLauncherModule,
  bookTrackerLauncherModule,
  arcPlayerLauncherModule,
  appsBrowserLauncherModule,
  hypercardToolsLauncherModule,
];
```

That is from `wesen-os/apps/os-launcher/src/app/modules.tsx:11` to `:20`.

Manual lists are easy to understand initially, but they are the wrong tool once some entries are optional or repo-local.

### Proposed generation flow

At build time:

1. read `workspace.apps.yaml`,
2. resolve which frontend packages are installed,
3. emit a generated file such as `src/app/generated/launcherIntegrations.ts`,
4. import only the integrations that are actually available,
5. fail only when a `required: true` app is missing.

### Pseudocode

```ts
type WorkspaceApp = {
  id: string;
  enabled: true | false | "auto";
  required: boolean;
  launcherExport: string;
};

const apps = loadWorkspaceManifest();
const presentApps = [];

for (const app of apps) {
  if (app.enabled === false) continue;

  const resolved = tryResolvePackage(app.launcherExport);
  if (!resolved) {
    if (app.required || app.enabled === true) {
      throw new Error(`Required app missing: ${app.id}`);
    }
    continue;
  }

  presentApps.push({
    id: app.id,
    importPath: app.launcherExport,
  });
}

writeGeneratedFile(presentApps);
```

The generated file can then look like:

```ts
import { inventoryLauncherIntegration } from "@hypercard/inventory/launcher";
import { appsBrowserLauncherIntegration } from "@hypercard/apps-browser/launcher";

export const launcherIntegrations = [
  inventoryLauncherIntegration,
  appsBrowserLauncherIntegration,
];
```

## Generated Store Assembly

Today, `wesen-os/apps/os-launcher/src/app/store.ts` manually imports many app slices (`wesen-os/apps/os-launcher/src/app/store.ts:3` to `:25`).

That should become generated or derived from integration objects.

### Target flow

```ts
import { launcherIntegrations } from "./generated/launcherIntegrations";

const launcherModules = launcherIntegrations.map((entry) => entry.module);
const sharedReducers = Object.assign({}, ...launcherIntegrations.map((entry) => entry.reducers ?? {}));

export const { store, createStore } = createLauncherStore(launcherModules, {
  sharedReducers: {
    timeline: timelineReducer,
    chatSession: chatSessionReducer,
    chatWindow: chatWindowReducer,
    chatProfiles: chatProfilesReducer,
    ...sharedReducers,
  },
});
```

This keeps `desktop-os` contracts stable while removing app-internal imports from the host.

## Top-Level pnpm Workspace

### The essential change

Today:

- `wesen-os` has one pnpm workspace.
- `go-go-os-frontend` has another pnpm workspace.
- app repos have their own workspace files.

The target is a top-level workspace root that includes all participating frontend packages.

### Example

```yaml
packages:
  - "wesen-os/apps/*"
  - "go-go-os-frontend/packages/*"
  - "go-go-os-frontend/apps/*"
  - "go-go-app-inventory/apps/*"
  - "go-go-app-sqlite/apps/*"
  - "go-go-app-arc-agi-3/apps/*"
```

In practice, this file should live in the dedicated workspace root, not inside `wesen-os`.

### Why a top-level workspace matters

Once pnpm understands the full graph:

1. `@hypercard/engine` resolves like a package, not a path alias.
2. Vite and Vitest can largely rely on normal package resolution.
3. TypeScript path maps become smaller or disappear.
4. one `pnpm install` establishes the frontend graph.

## The Role Of `go.work`

The Go side already has the right idea: local module composition belongs at the workspace root.

The frontend should mirror that idea with a top-level `pnpm-workspace.yaml`.

The clean target is:

```text
workspace-root/
  go.work
  pnpm-workspace.yaml
  package.json
```

That does not mean Go and Node must be built by one tool. It means both dependency graphs are declared from one place.

## What Should Stay The Same

Not everything needs to move.

The following pieces are already correct or close to correct:

1. `backendhost.AppBackendModule`
2. `backendhost.RegisterAppsManifestEndpoint`
3. `desktop-os` contracts for app manifests and `LaunchableAppModule`
4. `createAppRegistry`
5. `createLauncherStore`
6. `launcherui.Handler()` serving the built SPA

The redesign is mainly about dependency declaration and composition inputs, not runtime semantics.

## Design Decisions

### Decision 1: Preserve split repos

We are not proposing a monorepo.

Reason:

1. split repos already encode ownership boundaries,
2. Go module release boundaries already exist,
3. the problem is composition ergonomics, not Git history layout.

### Decision 2: Add a dedicated workspace root

Reason:

1. the current local dev environment already behaves like a meta-workspace,
2. but that reality is undocumented and under-specified,
3. making it explicit is less disruptive than merging repos.

### Decision 3: Standardize `./launcher` exports

Reason:

1. package consumers need one predictable import path,
2. some packages already do this successfully,
3. it removes the need for `src/launcher/module` imports.

### Decision 4: Introduce `LauncherAppIntegration`

Reason:

1. it centralizes assembly metadata,
2. it stops `wesen-os` from importing app slices directly,
3. it supports generated composition cleanly.

### Decision 5: Generate registries from manifest + installed packages

Reason:

1. optional apps cannot be expressed safely with static imports,
2. generation gives deterministic output and clear errors,
3. generated files are easier to test than implicit runtime resolution.

## Detailed Implementation Plan

### Phase 0: Stabilize the current launcher

Objective:

Reduce immediate failure noise while the clean architecture is being introduced.

Tasks:

1. keep the React toolchain resolution local to `apps/os-launcher/node_modules`.
2. document that missing sibling app repos are a separate problem from React resolution.
3. add a temporary `workspace doctor` script that reports:
   - missing repos,
   - missing pnpm installs,
   - missing app exports,
   - missing generated registry output.

Success criteria:

1. `pnpm dev` fails with clear diagnostics instead of opaque import resolution errors.

### Phase 1: Standardize public exports for every app

Objective:

Make every launcher-capable app consumable through a public package path.

Tasks:

1. add `exports` with `./launcher` to:
   - `@hypercard/todo`
   - `@hypercard/crm`
   - `@hypercard/book-tracker-debug`
2. ensure launcher entry files only export public symbols.
3. stop importing `src/launcher/module` from `wesen-os`.

Success criteria:

1. all launcher app imports can be written as `@hypercard/<app>/launcher`.

### Phase 2: Introduce `LauncherAppIntegration`

Objective:

Move reducer and assembly metadata into public app integration exports.

Tasks:

1. define the new type in `@hypercard/desktop-os` or a nearby launcher contract package.
2. update each app launcher export to expose integration objects.
3. remove app-internal slice imports from `wesen-os/apps/os-launcher/src/app/store.ts`.

Success criteria:

1. `wesen-os` no longer imports app feature files directly.

### Phase 3: Generate launcher registry inputs

Objective:

Replace handwritten app arrays with generated integration lists.

Tasks:

1. add `workspace.apps.yaml`.
2. add `scripts/generate-launcher-registry.mjs`.
3. emit `src/app/generated/launcherIntegrations.ts`.
4. make `modules.tsx` and `store.ts` consume generated output.

Success criteria:

1. optional app absence no longer breaks the host.
2. required app absence fails with a clean error.

### Phase 4: Introduce a real top-level frontend workspace

Objective:

Make package resolution work through pnpm instead of alias maps.

Tasks:

1. create a top-level `pnpm-workspace.yaml` in the dedicated workspace root.
2. create a root `package.json` with:
   - `pnpm install`
   - `pnpm dev`
   - `pnpm build`
   - `pnpm test`
   - `pnpm doctor`
3. migrate the launcher away from manual sibling source aliases.
4. reduce or delete the repeated alias maps from Vite, Vitest, and TS.

Success criteria:

1. package imports resolve from workspace linking.
2. alias maps are only needed for edge cases, not core composition.

### Phase 5: Normalize docs and startup flows

Objective:

Give engineers one source of truth.

Tasks:

1. replace the current split-install startup instructions.
2. document the workspace root as the only entrypoint for local development.
3. add a clear “required vs optional apps” section.
4. update app authoring docs to require `./launcher` exports and integration objects.

Success criteria:

1. an intern can set up the workspace without reading source code.

## API Sketches

### Proposed launcher integration type

```ts
import type { Reducer } from "@reduxjs/toolkit";
import type { LaunchableAppModule } from "@hypercard/desktop-os";

export interface LauncherAppIntegration {
  id: string;
  module: LaunchableAppModule;
  reducers?: Record<string, Reducer>;
  docs?: {
    title: string;
    path?: string;
  }[];
}
```

### Proposed generator input

```ts
export interface WorkspaceAppManifestEntry {
  id: string;
  enabled: true | false | "auto";
  required: boolean;
  launcherExport: string;
  frontendPackage: string;
}
```

### Proposed generated output

```ts
import { inventoryLauncherIntegration } from "@hypercard/inventory/launcher";
import { todoLauncherIntegration } from "@hypercard/todo/launcher";

export const launcherIntegrations = [
  inventoryLauncherIntegration,
  todoLauncherIntegration,
] as const;
```

## Example Intern Workflow After The Migration

This section is intentionally concrete.

Suppose an intern adds a new app called `notes`.

### What they would do

1. create `@hypercard/notes`.
2. add:
   - `src/index.ts`
   - `src/launcher/public.ts`
3. export `notesLauncherIntegration`.
4. add the app to `workspace.apps.yaml`.
5. run generator.
6. run workspace doctor.
7. run `pnpm dev` at the workspace root.

### What they would not need to do

They would not need to:

1. edit `wesen-os/apps/os-launcher/vite.config.ts`,
2. edit `wesen-os/apps/os-launcher/vitest.config.ts`,
3. edit `wesen-os/apps/os-launcher/tsconfig.json`,
4. import app feature slices directly into the launcher host.

That is the core maintainability win.

## Example Runtime Flow In The Target Model

```text
workspace.apps.yaml
    |
    v
generate-launcher-registry.mjs
    |
    v
generated/launcherIntegrations.ts
    |
    +--> modules.tsx -> createAppRegistry(...)
    |
    +--> store.ts -> createLauncherStore(...)
    |
    v
App.tsx -> buildLauncherContributions(...) -> DesktopShell
```

This is the right shape because the host consumes generated assembly artifacts, not hand-curated source imports.

## Testing And Validation Strategy

### Unit tests

Add tests for:

1. generator behavior when required apps are missing,
2. generator behavior when optional apps are missing,
3. registry output ordering,
4. duplicate reducer keys,
5. invalid app manifests,
6. integration export shape.

### Integration tests

Add launcher build/test scenarios for:

1. minimal workspace with only required apps,
2. workspace with optional apps present,
3. workspace with optional apps absent,
4. workspace doctor output.

### Smoke tests

The end-to-end smoke path should verify:

1. `/api/os/apps` lists mounted backend modules,
2. the launcher frontend renders available app icons,
3. missing optional apps are absent rather than fatal,
4. required apps still fail loudly if missing.

### Human validation checklist

1. `pnpm doctor` at workspace root passes.
2. `pnpm dev` starts without manual repo-path surgery.
3. `pnpm build` succeeds with current optional app configuration.
4. `go test ./...` in `wesen-os` still passes.
5. `curl /api/os/apps` reflects the same app set the launcher expects.

## Migration Risks

### Risk 1: Temporary dual-mode complexity

For a period, the system may need to support:

1. legacy alias-based composition,
2. new package-based composition.

Mitigation:

1. keep the migration phase short,
2. gate the new generator behind a default-on script as soon as possible,
3. remove duplicate code paths quickly.

### Risk 2: App packages may expose too much or too little

Mitigation:

1. write a launcher export checklist,
2. enforce one public `./launcher` entrypoint,
3. ban `wesen-os` imports from app `src/features/**`.

### Risk 3: Optional backend and frontend app presence may diverge

Mitigation:

1. use one shared manifest for both sides,
2. have the doctor script compare frontend package availability and backend module availability,
3. surface mismatches explicitly.

## Alternatives Considered

### Alternative 1: Keep the current split-repo layout and improve docs only

Rejected.

Reason:

1. the failures are structural, not just documentation problems,
2. better docs would explain a brittle system but would not make it robust.

### Alternative 2: Merge everything into a monorepo

Rejected for now.

Reason:

1. it is a much larger organizational change,
2. it disrupts release and ownership boundaries more than necessary,
3. the composition problems can be solved without merging Git history.

### Alternative 3: Publish all frontend packages to a package registry and consume versions only

Rejected as the primary local-dev model.

Reason:

1. it is too slow for active cross-repo local development,
2. engineers need editable live source during app and launcher work,
3. a local workspace still gives faster feedback.

### Alternative 4: Use dynamic `import()` at runtime instead of generation

Rejected as the main mechanism.

Reason:

1. build-time validation is easier to reason about,
2. generated files are easier to test,
3. runtime discovery tends to hide missing-package failures until later.

## Recommended Rollout Order

If you are executing this work, do it in this order:

1. standardize `./launcher` exports for all apps,
2. introduce `LauncherAppIntegration`,
3. generate the frontend registry,
4. add the top-level pnpm workspace,
5. remove alias duplication,
6. update startup docs and doctor tooling,
7. remove legacy path-based assumptions.

Do not start by deleting aliases first. That would break the current developer workflow before the new package graph exists.

## Practical Intern Notes

If you are new to the system, remember these rules:

1. `go-go-os-backend` defines the backend-side app module contract.
2. `go-go-os-frontend/packages/desktop-os` defines the launcher-side frontend app module contract.
3. `wesen-os` should be the host, not the place where app internals are manually wired.
4. public package exports are the contract; `src/...` imports are an implementation leak.
5. optional apps must be declared, not assumed.

## Conclusion

The current system already contains the right runtime abstractions. The main problem is that the local composition layer is underdesigned. The cleanest fix is to make the workspace itself a first-class artifact: one root for package linking, one manifest for app presence, one generated registry for launcher inputs, and one public launcher export per app.

That gives the project a stable architecture without forcing a monorepo. It also gives a new engineer something the current system does not: a clear mental model for how the launcher is assembled and where they should make changes.

## References

### Core evidence files

1. `go.work`
2. `wesen-os/package.json`
3. `wesen-os/pnpm-workspace.yaml`
4. `go-go-os-frontend/package.json`
5. `go-go-os-frontend/pnpm-workspace.yaml`
6. `wesen-os/apps/os-launcher/vite.config.ts`
7. `wesen-os/apps/os-launcher/vitest.config.ts`
8. `wesen-os/apps/os-launcher/tsconfig.json`
9. `wesen-os/apps/os-launcher/src/app/modules.tsx`
10. `wesen-os/apps/os-launcher/src/app/store.ts`
11. `go-go-os-frontend/packages/desktop-os/src/contracts/appManifest.ts`
12. `go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts`
13. `go-go-os-frontend/packages/desktop-os/src/registry/createAppRegistry.ts`
14. `go-go-os-frontend/packages/desktop-os/src/store/createLauncherStore.ts`
15. `go-go-app-inventory/apps/inventory/package.json`
16. `go-go-os-frontend/apps/todo/package.json`
17. `go-go-os-frontend/apps/crm/package.json`
18. `go-go-os-frontend/apps/apps-browser/package.json`
19. `go-go-os-frontend/apps/hypercard-tools/package.json`
20. `wesen-os/docs/startup-playbook.md`
21. `wesen-os/scripts/setup-workspace.sh`
22. `go-go-os-backend/pkg/backendhost/module.go`
23. `go-go-os-backend/pkg/backendhost/manifest_endpoint.go`
24. `wesen-os/cmd/wesen-os-launcher/main.go`

### Ticket-local research artifacts

1. `scripts/run_workspace_topology_scan.sh`
2. `scripts/run_launcher_coupling_scan.sh`
3. `scripts/output/workspace-topology-scan-20260305-150221.log`
4. `scripts/output/launcher-coupling-scan-20260305-150221.log`
