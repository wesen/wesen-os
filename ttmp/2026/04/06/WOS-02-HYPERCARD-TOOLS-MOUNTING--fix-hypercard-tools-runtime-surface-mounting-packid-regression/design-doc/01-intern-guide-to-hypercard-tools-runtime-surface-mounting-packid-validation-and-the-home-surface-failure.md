---
Title: Intern Guide to HyperCard Tools Runtime Surface Mounting, packId Validation, and the Home-Surface Failure
Ticket: WOS-02-HYPERCARD-TOOLS-MOUNTING
Status: active
Topics:
    - wesen-os
    - hypercard
    - runtime
    - frontend
    - bugfix
    - documentation
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.authoring.d.ts
      Note: Authoring contract currently omits required packId field
    - Path: workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.test.ts
      Note: Direct QuickJS regression test for HyperCard Tools bundle loading and home-surface rendering
    - Path: workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js
      Note: Actual QuickJS runtime bundle source missing packId on surfaces
    - Path: workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/stack.ts
      Note: Static bundle definition and home surface metadata
    - Path: workspace-links/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx
      Note: HyperCard Tools launcher window payload and RuntimeSurfaceSessionHost wiring
    - Path: workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/runtimeService.ts
      Note: QuickJS runtime load path and thrown error
    - Path: workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/stack-bootstrap.vm.js
      Note: Runtime bootstrap enforces surface.packId while building surfaceTypes
    - Path: workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx
      Note: React host that ensures sessions and renders runtime surfaces
ExternalSources: []
Summary: ""
LastUpdated: 2026-04-06T17:06:22-04:00
WhatFor: Teach a new engineer how HyperCard runtime bundles mount inside wesen-os, why packId is required, and how to fix the current HyperCard Tools regression.
WhenToUse: Use when debugging runtime bundle loading failures, QuickJS runtime session startup, or runtime surface type mismatches in launcher windows.
---



# Intern Guide to HyperCard Tools Runtime Surface Mounting, packId Validation, and the Home-Surface Failure

## Executive Summary

When a user double-clicks the `HyperCard Tools` icon in the `wesen-os` desktop, the launcher opens a window whose content is a QuickJS-backed runtime bundle rather than a normal React app window. On April 6, 2026, that path fails immediately with `Runtime surface packId is required for surface: home`, and the window shows a runtime error instead of the catalog UI.

The root cause is narrow and concrete: the HyperCard Tools runtime bundle declares a `surfaces` map whose entries provide `render()` and optional `handlers`, but those entries do not provide the `packId` that the runtime bootstrap now requires for every surface. The runtime host needs that `packId` so it knows which renderer and validator family to use for the tree returned by the QuickJS bundle. In this case the bundle uses the `ui` runtime package and returns UI-card-shaped trees, so the correct surface type id is `ui.card.v1`.

The recommended fix is also narrow: update the HyperCard Tools bundle so every surface explicitly declares `packId: 'ui.card.v1'`, update the authoring types so omitting `packId` becomes a compile-time error, and add a direct regression test that loads the HyperCard Tools bundle through `QuickJSRuntimeService`. Do not add a runtime fallback or a backwards-compatibility shim. The strict contract is doing useful work here by catching an invalid bundle before the session renders inconsistent output.

## Problem Statement

### User-visible symptom

Observed in the browser on `http://localhost:5173/` on April 6, 2026:

- Double-click `HyperCard Tools` on the desktop.
- A new `HyperCard Tools` window opens.
- The body of that window renders `Runtime error: Error: Runtime surface packId is required for surface: home`.
- Console output shows the failure inside `QuickJSRuntimeService.loadRuntimeBundle(...)` and then in `RuntimeSurfaceSessionHost`.

This was reproduced directly in Playwright during investigation.

### Why this matters

This issue blocks the entire HyperCard Tools demo stack from mounting. The bug is not just cosmetic. It prevents the session from loading, which means:

- no `home` surface render,
- no session state hydration,
- no runtime event dispatch,
- no use of the HyperCard Tools catalog as a reference implementation for UI DSL authoring.

### Scope of this ticket

This ticket covers:

1. the architecture explanation for a new intern,
2. the concrete root cause,
3. the implementation plan for the fix,
4. the required regression tests,
5. the validation path for the repaired behavior.

This ticket does not propose:

- redesigning the runtime surface architecture,
- adding bundle-level default surface types,
- relaxing the runtime contract to silently infer missing `packId` values.

## System Primer

This section defines the core terms, because the bug only makes sense once the naming is clear.

### 1. Launcher module

A launcher module is the app-facing unit that participates in the desktop shell. It declares an icon, a launch mode, and a function that builds the `openWindow` payload used when the icon is opened. The `HyperCard Tools` launcher module lives at [module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx:1).

### 2. Runtime bundle or stack

A runtime bundle is a blob of JavaScript code loaded into QuickJS. It declares:

- bundle id,
- title,
- `packageIds`,
- optional initial session state,
- optional initial per-surface state,
- `surfaces`.

The static TypeScript-side wrapper that the launcher knows about is `RuntimeBundleDefinition` in [types.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-core/src/cards/types.ts:19). The actual HyperCard Tools QuickJS source string is imported from [pluginBundle.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.ts:1) and defined in [pluginBundle.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js:3).

### 3. Runtime package

A runtime package is a QuickJS prelude or API package installed before the bundle source runs. For example:

- `ui` is a runtime package that exposes `ui.*` constructors, declared in [runtimeRegistration.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-ui-cards/src/runtimeRegistration.tsx:6).
- `kanban` is another runtime package, declared in [runtimeRegistration.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-kanban/src/runtimeRegistration.tsx:9).

Important distinction:

- `packageId` answers: "What APIs are installed into the QuickJS runtime before bundle code runs?"
- `packId` answers: "How should the rendered tree for this surface be validated and rendered back in React?"

Those are related but not interchangeable.

### 4. Runtime surface

A runtime surface is one renderable screen inside a runtime bundle. `home`, `layouts`, and `playground` are surface ids inside the HyperCard Tools bundle. The static launcher-side bundle metadata points to the bundle home surface at [stack.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/stack.ts:39).

Each surface must declare:

- a unique id inside the bundle,
- a `render()` function,
- optional `handlers`,
- a `packId`.

The current bug is precisely that the HyperCard Tools surfaces define `render()` and `handlers`, but not `packId`.

### 5. Runtime surface type

A runtime surface type is the React-side contract used after QuickJS returns a tree. The registry is implemented in [runtimeSurfaceTypeRegistry.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-packs/runtimeSurfaceTypeRegistry.tsx:21).

Each runtime surface type provides:

- `packId`,
- `validateTree(value)`,
- `render({ tree, onEvent })`.

Example:

- `ui.card.v1` is declared in [uiCardV1Pack.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-ui-cards/src/runtime-packs/uiCardV1Pack.tsx:6).
- `kanban.v1` is declared in [runtimeRegistration.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-kanban/src/runtimeRegistration.tsx:19).

### 6. Runtime session

A runtime session is one concrete running instance of a bundle. The manager owns session records keyed by `sessionId` in [runtimeSessionManager.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-session-manager/runtimeSessionManager.ts:54). HyperCard Tools creates session ids like `hypercard-tools-session:<workspace-id>` in [module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx:12).

### 7. Runtime service

`QuickJSRuntimeService` is the low-level service that:

- creates QuickJS sessions,
- installs runtime packages,
- runs bundle code,
- reads bundle metadata,
- renders surfaces,
- dispatches surface events,
- injects dynamic runtime surfaces.

It lives in [runtimeService.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/runtimeService.ts:101).

### 8. Runtime surface session host

`RuntimeSurfaceSessionHost` is the React bridge between the desktop shell and the QuickJS runtime. It:

- registers the Redux-side runtime session state,
- asks the runtime session manager to ensure the QuickJS session exists,
- injects pending runtime surfaces,
- projects Redux/domain state into the runtime view model,
- renders the resulting tree using the correct `packId`.

It lives in [RuntimeSurfaceSessionHost.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx:105).

## End-to-End Flow of the Failing Path

This is the shortest correct story of what happens when the bug reproduces.

```text
Desktop icon double-click
  -> desktop shell routes command icon.open.hypercard-tools
  -> launcher module builds a surface window payload
  -> window content adapter renders RuntimeSurfaceSessionHost
  -> RuntimeSurfaceSessionHost asks RuntimeSessionManager to ensure the session
  -> RuntimeSessionManager calls QuickJSRuntimeService.loadRuntimeBundle(...)
  -> QuickJS bootstrap reads bundle metadata
  -> bootstrap scans every surface and requires surface.packId
  -> HyperCard Tools "home" surface has no packId
  -> loadRuntimeBundle throws
  -> RuntimeSurfaceSessionHost marks the session as error
  -> window renders the runtime error message
```

Here are the concrete file anchors for that flow:

1. The launcher shell generates `icon.open.<appId>` commands in [buildLauncherContributions.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-shell/src/runtime/buildLauncherContributions.ts:18).
2. Desktop icon open dispatch goes through `routeCommand('icon.open.<iconId>')` in [useDesktopShellController.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-core/src/components/shell/windowing/useDesktopShellController.tsx:975).
3. HyperCard Tools builds a `content.kind = 'surface'` window payload with `bundleId = 'hypercardToolsUiDslDemo'` and `surfaceSessionId = 'hypercard-tools-session:...'` in [module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx:71).
4. The same module renders `RuntimeSurfaceSessionHost` for that window in [module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx:90).
5. The host ensures the runtime session via `DEFAULT_RUNTIME_SESSION_MANAGER.ensureSession(...)` in [RuntimeSurfaceSessionHost.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx:212).
6. The manager calls `runtimeService.loadRuntimeBundle(...)` in [runtimeSessionManager.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-session-manager/runtimeSessionManager.ts:221).
7. The service reads bundle metadata from the bootstrap host in [runtimeService.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/runtimeService.ts:143).
8. The bootstrap computes `surfaceTypes` by calling `normalizeRuntimeSurfacePackId(key, surface?.packId)` for every surface in [stack-bootstrap.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/stack-bootstrap.vm.js:166).
9. That helper throws if `packId` is missing in [stack-bootstrap.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/stack-bootstrap.vm.js:77).

## Current State Analysis

### Observed failure

Playwright reproduction on April 6, 2026 confirmed:

- the app loads at `http://localhost:5173/`,
- the `HyperCard Tools` icon is present,
- opening it creates a `HyperCard Tools` dialog,
- the dialog body shows `Runtime error: Error: Runtime surface packId is required for surface: home`.

Console captured at the same time reported:

- `QuickJSRuntimeService` failed to load the `hypercardToolsUiDslDemo` bundle,
- `RuntimeSurfaceSessionHost` then reported the runtime session load failure.

### Static bundle definition is not the source of the failure

The launcher-side `STACK` definition for HyperCard Tools is present and looks structurally normal in [stack.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/stack.ts:39):

- `id: 'hypercardToolsUiDslDemo'`,
- `homeSurface: 'home'`,
- `plugin.packageIds: ['ui']`,
- a static `surfaces` map used for launcher metadata and window placeholders.

That static bundle metadata is enough for the launcher to open the window, but it is not enough for QuickJS to mount the runtime. The runtime still needs the bundle source string to define valid runtime surfaces.

### The actual runtime bundle source omits packId

The HyperCard Tools bundle source in [pluginBundle.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js:215) returns:

- `id`,
- `title`,
- `packageIds: ["ui"]`,
- `initialSessionState`,
- `initialSurfaceState`,
- `surfaces`.

But the actual surface entries begin like this:

```js
surfaces: {
  home: {
    render({ state }) { ... },
    handlers: { ... }
  }
}
```

There is no `packId` field on `home` or the sibling surfaces.

### The runtime bootstrap now requires packId for every surface

The bootstrap host computes bundle metadata by returning:

```js
surfaceTypes: Object.fromEntries(
  Object.entries(__runtimeBundle.surfaces).map(([key, surface]) => [
    key,
    normalizeRuntimeSurfacePackId(key, surface?.packId),
  ]),
),
```

This code lives in [stack-bootstrap.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/stack-bootstrap.vm.js:176). Because `home.packId` is missing, the bundle never finishes loading. This is why the failure happens during session startup rather than later during render.

### Why packId is required

After the session loads, `RuntimeSurfaceSessionHost` resolves the surface type id and uses it to validate and render the tree:

- resolve type id in [RuntimeSurfaceSessionHost.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx:158)
- validate returned tree in [RuntimeSurfaceSessionHost.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx:406)
- render the validated tree in [RuntimeSurfaceSessionHost.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx:513)

Without a `packId`, the host cannot know whether a surface tree is:

- `ui.card.v1`,
- `kanban.v1`,
- or some future surface family.

### packageIds and packId are different things

This distinction matters because it is easy for a new engineer to confuse them.

`packageIds`:

- are bundle-wide,
- control which QuickJS APIs get installed,
- come from `bundle.plugin.packageIds` in the launcher definition or from the runtime bundle return object,
- example: `ui` in [runtimeRegistration.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-ui-cards/src/runtimeRegistration.tsx:6).

`packId`:

- is surface-specific,
- controls which surface type validator and renderer the host uses,
- example: `ui.card.v1` in [uiCardV1Pack.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-ui-cards/src/runtime-packs/uiCardV1Pack.tsx:6).

Short version:

- `packageIds` install code into the VM.
- `packId` explains the shape of what a surface returns.

### This is not caused by surface id collisions

Both the launcher bundle and the HyperCard Tools bundle use a surface named `home`. The launcher bundle's `home` exists in [apps/os-launcher/src/domain/stack.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/domain/stack.ts:15), and the HyperCard Tools bundle's `home` exists in [apps/hypercard-tools/src/domain/stack.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/stack.ts:10).

That shared name is not the bug. Surface ids are interpreted inside a specific runtime bundle and session. The actual failure message references `home` only because `home` is the first invalid surface encountered while reading bundle metadata.

### Why the bug escaped tests

The coverage gap is two-part:

1. `apps/os-launcher/src/__tests__/launcherHost.test.tsx` verifies that the launcher opens a `surface` window for HyperCard Tools and that the payload points at `bundleId = 'hypercardToolsUiDslDemo'` in [launcherHost.test.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/__tests__/launcherHost.test.tsx:39). It does not load the HyperCard Tools QuickJS bundle.
2. The existing QuickJS integration test in [runtimeService.integration.test.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/runtimeService.integration.test.ts:32) uses a small inventory fixture whose surfaces do declare `packId`, so it exercises the runtime loader but not the broken HyperCard Tools bundle.

There is also a compile-time gap: the HyperCard Tools authoring definitions in [pluginBundle.authoring.d.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.authoring.d.ts:56) define `PluginCardDef` without any `packId` field. That makes it too easy to author an invalid bundle without TypeScript complaining.

## Root Cause

### Primary root cause

The QuickJS bundle source for HyperCard Tools is invalid under the current runtime bundle contract because each surface entry omits `packId`.

### Secondary contributing causes

1. The authoring type definitions for HyperCard Tools do not require `packId`.
2. There is no direct test that loads the HyperCard Tools bundle with `QuickJSRuntimeService`.
3. The launcher tests stop at payload construction and do not assert that the referenced bundle is actually mountable.

### Non-causes

These are plausible guesses that are not supported by the evidence:

1. Missing `ui` runtime package registration. The launcher registers both `UI_RUNTIME_PACKAGE` and `UI_CARD_V1_RUNTIME_SURFACE_TYPE` in [registerRuntimePackages.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/registerRuntimePackages.ts:7).
2. Incorrect bundle id or session id. The window payload uses the expected bundle id and a valid session id prefix in [module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx:71).
3. Home surface name collision across apps. Surface ids are bundle-local, not global.

## Proposed Solution

### Design choice

Make the HyperCard Tools bundle explicitly conform to the runtime contract. Every surface in `pluginBundle.vm.js` should declare `packId: 'ui.card.v1'`.

Do not:

- infer `packId` from `packageIds`,
- default all missing surfaces to `ui.card.v1` in the runtime bootstrap,
- add a "legacy mode" in `QuickJSRuntimeService`.

Those alternatives would hide invalid bundle authoring and make multi-surface-family bundles harder to reason about later.

### Recommended implementation shape

Because every current HyperCard Tools surface returns UI-card trees, there are two reasonable concrete implementations.

Option A: explicit field on every surface.

```js
home: {
  packId: 'ui.card.v1',
  render({ state }) { ... },
  handlers: { ... },
}
```

Option B: a local helper inside `pluginBundle.vm.js`.

```js
const UI_CARD_PACK_ID = 'ui.card.v1';

function uiSurface(render, handlers = {}) {
  return {
    packId: UI_CARD_PACK_ID,
    render,
    handlers,
  };
}

surfaces: {
  home: uiSurface(({ state }) => { ... }, {
    openDemo(context, args) { ... },
  }),
}
```

I recommend Option B if the file stays bundle-authored by hand, because it reduces repetition and makes the contract obvious at the top of the file. I recommend Option A if the team wants absolute explicitness in generated or partially generated VM source. Either is acceptable. The important part is that `packId` becomes explicit, not inferred.

### Authoring contract change

Update `PluginCardDef` in [pluginBundle.authoring.d.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.authoring.d.ts:56) to require `packId: string`.

Recommended shape:

```ts
interface PluginCardDef {
  packId: string;
  render(context: PluginRenderContext): PluginUiNode;
  handlers?: Record<string, (context: PluginHandlerContext, args?: unknown) => void>;
}
```

This change prevents the same bug from being reintroduced during future editing.

### Regression test strategy

Add a focused test that loads the HyperCard Tools bundle directly. The test should not depend on the full launcher module registry, because that suite currently pulls in workspace dependencies that may not exist in every local checkout.

Recommended test location:

- `workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.test.ts`

Recommended assertions:

1. Register `UI_RUNTIME_PACKAGE`.
2. Register `UI_CARD_V1_RUNTIME_SURFACE_TYPE`.
3. Load `HYPERCARD_TOOLS_DEMO_PLUGIN_BUNDLE` through `QuickJSRuntimeService`.
4. Assert `bundle.surfaces` contains `home`.
5. Assert `bundle.surfaceTypes.home === 'ui.card.v1'`.
6. Render `home` and assert the tree validates as a UI card tree.

## Design Decisions

### Decision 1: keep strict packId validation

Rationale:

- The strict runtime bootstrap caught a real invalid contract.
- The host needs `surfaceTypes` to safely validate and render surface trees.
- Relaxing the rule would create ambiguity for future mixed-surface bundles.

### Decision 2: fix the bundle, not the runtime loader

Rationale:

- The bundle is the invalid artifact.
- Other working fixtures already comply with the contract, for example [inventory-stack.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/fixtures/inventory-stack.vm.js:8).
- The smallest correct fix is to repair the HyperCard Tools surface definitions.

### Decision 3: make authoring types stricter

Rationale:

- Runtime-only failure is expensive feedback.
- The missing `packId` is statically knowable.
- The authoring declaration file is already the expected place to describe bundle shape.

### Decision 4: test the broken bundle directly

Rationale:

- The failure is inside QuickJS bundle load, not only inside launcher routing.
- A direct bundle test is cheaper and more deterministic than a full desktop integration test.
- It avoids unrelated workspace import instability from the launcher-host suite.

## Pseudocode and Key Flows

### A. Current failing load path

```ts
function openHypercardTools() {
  const payload = buildWorkspaceWindowPayload('icon');
  openWindow(payload);
}

function renderWindow() {
  return <RuntimeSurfaceSessionHost bundle={STACK} sessionId="hypercard-tools-session:..." />;
}

async function ensureSession() {
  const runtimeHandle = await runtimeSessionManager.ensureSession({
    bundleId: 'hypercardToolsUiDslDemo',
    sessionId,
    packageIds: ['ui'],
    bundleCode: HYPERCARD_TOOLS_DEMO_PLUGIN_BUNDLE,
  });
}

function quickJsBootstrap_getMeta(bundle) {
  for (const [surfaceId, surface] of Object.entries(bundle.surfaces)) {
    if (!surface.packId) {
      throw new Error(`Runtime surface packId is required for surface: ${surfaceId}`);
    }
  }
}
```

### B. Desired corrected load path

```ts
const UI_CARD_PACK_ID = 'ui.card.v1';

const bundle = {
  id: 'hypercardToolsUiDslDemo',
  packageIds: ['ui'],
  surfaces: {
    home: {
      packId: UI_CARD_PACK_ID,
      render() { ... },
      handlers: { ... },
    },
    layouts: {
      packId: UI_CARD_PACK_ID,
      render() { ... },
    },
  },
};

const meta = runtimeHandle.getBundleMeta();
assert(meta.surfaceTypes.home === 'ui.card.v1');
const tree = runtimeHandle.renderSurface('home', projectedState);
validateRuntimeSurfaceTree('ui.card.v1', tree);
renderRuntimeSurfaceTree('ui.card.v1', tree, emitRuntimeEvent);
```

### C. Mental model diagram

```text
Launch layer
  Desktop icon
    -> launcher module
    -> openWindow(payload)

Window host layer
  Window content adapter
    -> RuntimeSurfaceSessionHost

Runtime lifecycle layer
  RuntimeSessionManager
    -> QuickJSRuntimeService
    -> QuickJS session

Bundle contract layer
  packageIds = install VM APIs
  surfaces[*].packId = choose render/validate family

Render layer
  surface render() returns raw tree
    -> validateRuntimeSurfaceTree(packId, tree)
    -> renderRuntimeSurfaceTree(packId, tree, onEvent)
```

## Implementation Plan

### Phase 1: Repair HyperCard Tools bundle contract

Edit:

- [pluginBundle.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js)

Actions:

1. Introduce a local `UI_CARD_PACK_ID = 'ui.card.v1'` constant.
2. Add `packId` to every surface definition, either explicitly or via a helper wrapper.
3. Keep the current `packageIds: ["ui"]` value unchanged.

Exit criteria:

- `QuickJSRuntimeService.loadRuntimeBundle(...)` succeeds for the HyperCard Tools bundle.

### Phase 2: Tighten authoring types

Edit:

- [pluginBundle.authoring.d.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.authoring.d.ts)

Actions:

1. Require `packId` on `PluginCardDef`.
2. Optionally introduce a `type PluginPackId = 'ui.card.v1' | 'kanban.v1' | string` alias if the team wants clearer intent without over-constraining future growth.

Exit criteria:

- missing `packId` becomes a TypeScript error during local editing.

### Phase 3: Add regression coverage

Create:

- `workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.test.ts`

Actions:

1. Register the UI runtime package and UI runtime surface type.
2. Load the HyperCard Tools bundle in QuickJS.
3. Assert `surfaceTypes.home === 'ui.card.v1'`.
4. Render `home` and validate the returned tree.

Exit criteria:

- the regression is caught without requiring the full launcher app suite.

### Phase 4: Re-verify in the browser

Validation:

1. run the local launcher,
2. open `http://localhost:5173/`,
3. double-click `HyperCard Tools`,
4. confirm the window mounts the catalog instead of showing a runtime error,
5. confirm console no longer reports the `packId` error.

## Testing and Validation Strategy

### Unit tests

Primary target:

- a new direct HyperCard Tools runtime bundle test.

Secondary optional coverage:

- a small launcher integration smoke test if the workspace dependency graph is stable in CI.

### Manual validation

Use the real launcher desktop because this is a mount-path issue, not only a pure QuickJS issue.

Checklist:

1. open the launcher page,
2. double-click `HyperCard Tools`,
3. verify `home` renders,
4. navigate to at least one secondary surface,
5. verify no `packId is required` console error remains.

### Why not rely only on the current launcherHost suite

During investigation, running:

```bash
pnpm -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os exec vitest run apps/os-launcher/src/__tests__/launcherHost.test.tsx apps/os-launcher/src/domain/pluginBundle.test.ts
```

showed that `launcherHost.test.tsx` currently fails in this checkout because `@go-go-golems/arc-agi-player/launcher` is missing from the workspace import graph. That makes it a weak place to pin this regression unless the surrounding dependency layout is also stabilized.

## Alternatives Considered

### Alternative 1: default missing packId to `ui.card.v1`

Rejected because:

- it hides an invalid authoring contract,
- it breaks down as soon as a bundle mixes surface families,
- it would make the runtime less predictable.

### Alternative 2: infer packId from `packageIds`

Rejected because:

- `packageIds` and `packId` model different things,
- a bundle can install a package without every surface using the same render type,
- inference would be guesswork, not contract data.

### Alternative 3: recover from missing packId in `RuntimeSurfaceSessionHost`

Rejected because:

- the failure happens during bundle metadata generation, before host-side render resolution,
- moving the fallback later would just spread contract ambiguity across more layers.

## Risks and Open Questions

### Risks

1. Other hand-authored runtime bundles may also omit `packId` and simply have not been exercised yet.
2. If the team chooses a helper function in `pluginBundle.vm.js`, reviewers should verify it remains obvious to future authors that surfaces are all `ui.card.v1`.
3. If regression coverage is added only under HyperCard Tools, similar issues in other runtime bundles may still slip through.

### Open questions

1. Should the project introduce a shared authoring helper for single-pack bundles so surface declarations are less repetitive?
2. Should the repository add a static lint or bundle-schema validation step for runtime VM source files before runtime execution?
3. Should `RuntimeBundleDefinition.surfaces[*].meta.runtime.packId` become a more consistent mirror of the QuickJS-side contract for tooling and editor flows?

## Recommended Next Actions

1. Fix `pluginBundle.vm.js` so every surface declares `packId: 'ui.card.v1'`.
2. Fix `pluginBundle.authoring.d.ts` so the omission becomes statically illegal.
3. Add a direct HyperCard Tools QuickJS load test.
4. Re-run the desktop click path manually.
5. Optionally scan other hand-authored runtime bundles for the same omission.

## References

- Launcher app bootstraps runtime package and surface type registration in [apps/os-launcher/src/App.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/App.tsx:10) and [apps/os-launcher/src/app/registerRuntimePackages.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/registerRuntimePackages.ts:7)
- HyperCard Tools window launch and session host rendering in [apps/hypercard-tools/src/launcher/module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx:71)
- HyperCard Tools static bundle metadata in [apps/hypercard-tools/src/domain/stack.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/stack.ts:39)
- HyperCard Tools QuickJS bundle source in [apps/hypercard-tools/src/domain/pluginBundle.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js:215)
- Outdated HyperCard Tools authoring type in [apps/hypercard-tools/src/domain/pluginBundle.authoring.d.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.authoring.d.ts:56)
- Runtime bundle contract and worker requests in [packages/os-scripting/src/plugin-runtime/contracts.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/contracts.ts:62)
- QuickJS runtime loader in [packages/os-scripting/src/plugin-runtime/runtimeService.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/runtimeService.ts:162)
- Bundle metadata bootstrap and `packId` normalization in [packages/os-scripting/src/plugin-runtime/stack-bootstrap.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/stack-bootstrap.vm.js:77)
- React host bridge in [packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx:105)
- Runtime session ownership and handles in [packages/os-scripting/src/runtime-session-manager/runtimeSessionManager.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-session-manager/runtimeSessionManager.ts:29)
- Runtime surface type registry in [packages/os-scripting/src/runtime-packs/runtimeSurfaceTypeRegistry.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-packs/runtimeSurfaceTypeRegistry.tsx:13)
- Working `packId` example in [packages/os-scripting/src/plugin-runtime/fixtures/inventory-stack.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/fixtures/inventory-stack.vm.js:8)
- Existing runtime integration tests in [packages/os-scripting/src/plugin-runtime/runtimeService.integration.test.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/runtimeService.integration.test.ts:32)

## Proposed Solution

<!-- Describe the proposed solution in detail -->

## Design Decisions

<!-- Document key design decisions and rationale -->

## Alternatives Considered

<!-- List alternative approaches that were considered and why they were rejected -->

## Implementation Plan

<!-- Outline the steps to implement this design -->

## Open Questions

<!-- List any unresolved questions or concerns -->

## References

<!-- Link to related documents, RFCs, or external resources -->
