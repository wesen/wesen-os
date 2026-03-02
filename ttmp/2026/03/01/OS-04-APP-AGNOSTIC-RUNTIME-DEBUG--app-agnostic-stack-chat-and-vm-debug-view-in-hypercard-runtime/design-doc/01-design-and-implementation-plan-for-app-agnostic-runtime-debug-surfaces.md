---
Title: Design and Implementation Plan for App-Agnostic Runtime Debug Surfaces
Ticket: OS-04-APP-AGNOSTIC-RUNTIME-DEBUG
Status: active
Topics:
    - backend
    - frontend
    - documentation
    - reflection
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: |-
        Current inventory-owned debug wiring for stacks/chat timeline/event windows and command/menu glue.
        Current inventory-specific debug orchestration baseline
    - Path: ../../../../../../../go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx
      Note: Existing pattern for app-agnostic tooling app module and window-content adapter split.
    - Path: ../../../../../../../go-go-os-frontend/packages/chat-runtime/src/chat/debug/EventViewerWindow.tsx
      Note: |-
        Existing chat event debug window that should be reusable from app-agnostic runtime debug surfaces.
        Chat event viewer to be composed in app-agnostic suite
    - Path: ../../../../../../../go-go-os-frontend/packages/chat-runtime/src/chat/debug/TimelineDebugWindow.tsx
      Note: |-
        Existing timeline inspector used by inventory debug actions.
        Chat timeline inspector to be composed in app-agnostic suite
    - Path: ../../../../../../../go-go-os-frontend/packages/engine/src/components/shell/windowing/desktopContributions.ts
      Note: |-
        Official desktop composition extension points used for generic debug contribution factories.
        Shell contribution contract used by planned factory APIs
    - Path: ../../../../../../../go-go-os-frontend/packages/hypercard-runtime/src/features/pluginCardRuntime/pluginCardRuntimeSlice.ts
      Note: |-
        VM/runtime timeline and session state that should be exposed in the new app-agnostic VM debug panel.
        VM timeline/session/pending-intent state for proposed VM debug panel
    - Path: ../../../../../../../go-go-os-frontend/packages/hypercard-runtime/src/hypercard/debug/RuntimeCardDebugWindow.tsx
      Note: |-
        Existing stack/runtime inspector component with residual inventory coupling.
        Shared runtime stack inspector and residual ownerAppId coupling
ExternalSources: []
Summary: Detailed architecture analysis and implementation blueprint to move stack/chat/vm debug surfaces from inventory-specific launcher glue into an app-agnostic hypercard-runtime package API.
LastUpdated: 2026-03-01T19:40:00-05:00
WhatFor: Plan a later implementation that lets any launcher app reuse stack/chat/vm debug windows without copying inventory-specific command/instance/wiring code.
WhenToUse: Use this document before implementing shared runtime debug surfaces or onboarding interns to runtime debug architecture.
---


# Design and Implementation Plan for App-Agnostic Runtime Debug Surfaces

## Executive Summary

Today, the strongest runtime debug experience (Stacks/Cards, Event Viewer, Timeline Debug) is assembled inside the inventory launcher module. The underlying components are partly reusable, but orchestration is inventory-specific: command IDs, app keys, window instance parsing, stack adapters, and focused conversation resolution are hardcoded to inventory naming.

The target state is a package-level, app-agnostic debug suite in `@hypercard/hypercard-runtime` that any launcher app can opt into with a small, typed configuration object. This suite should expose stack/chat/vm debug surfaces through reusable contribution factories and render helpers, while preserving app ownership of naming, scope, and policy.

This ticket is planning-only (for later implementation). No production code is changed in this ticket.

## Problem Statement

### User outcome requested

Create a separate design ticket that explains in detail how to build an app-independent stack/chat/vm debug view in `hypercard-runtime`, inspired by today’s inventory debug UX, with a concrete implementation plan.

### Why this matters

Without a package-level abstraction, every app that wants runtime diagnostics must copy and fork inventory glue logic. That creates drift, duplicate bugs, and prevents consistent operator workflows across launcher apps.

### In-scope

1. Analyze current runtime debug composition and coupling points.
2. Design app-agnostic APIs in `hypercard-runtime` for stack/chat/vm debug windows.
3. Provide phased file-level implementation plan and testing strategy.
4. Provide onboarding-level detail for a new intern.

### Out-of-scope

1. Implementing the code changes now.
2. Redesigning chat transport, VM contracts, or desktop shell architecture.
3. Replacing unrelated inventory UX like Redux perf window.

## Glossary

- `App-owned glue`: code that binds generic runtime components to a specific app id, stack id, command namespace, and menu/layout choices.
- `Debug suite`: unified package API exposing stack/chat/vm debug windows and command/menu contributions.
- `VM debug`: visibility into plugin runtime sessions, runtime intent timeline, pending intents, and runtime state projections.
- `Conversation context`: mapping from focused UI window to `convId` for chat-specific debug windows.

## Current-State Architecture (Evidence-backed)

### 1. Desktop extension points already support reusable contribution factories

The shell already composes command handlers, menus, icons, window adapters, and startup windows via `DesktopContribution` and `composeDesktopContributions`.

Evidence:

- `DesktopContribution` contract includes `menus`, `commands`, `windowContentAdapters`, `startupWindows` in `desktopContributions.ts:36-43`.
- Composition and routing happen in `desktopContributions.ts:118-143`.
- Window adapter contract (`WindowContentAdapter`) exists in `windowContentAdapter.ts:11-15`.

Implication: We do not need a new shell mechanism. We only need better package-level factories in `hypercard-runtime` that emit standard `DesktopContribution` objects.

### 2. Inventory currently assembles the full debug experience itself

Inventory owns:

1. command id namespace and parsing,
2. window payload construction,
3. focused conversation resolution,
4. dynamic menu/context actions,
5. stack card adapter,
6. app window render routing for debug instance IDs.

Evidence highlights in `renderInventoryApp.tsx`:

- app and command hardcoding:
  - `INVENTORY_APP_ID = 'inventory'` (`37`)
  - `CHAT_COMMAND_PREFIX = 'inventory.chat.'` (`45`)
- window payload builders for debug windows:
  - event viewer (`139-148`)
  - timeline debug (`150-159`)
  - stack/runtime debug (`161-169`)
- focused conversation parsing is app-specific:
  - parse app key and require inventory app id/prefix (`191-204`, `206-229`)
- debug command routing and actions are inventory-prefixed (`487-704`)
- debug menu section entries are inventory-prefixed (`735-742`)
- runtime debug render branch is inventory-owned (`1025-1027`)

Implication: The current debug experience is functionally rich, but not portable.

### 3. Reusable debug components exist, but are split across packages

Current components:

- Stack/runtime inspector: `RuntimeCardDebugWindow` in `hypercard-runtime`.
  - file: `packages/hypercard-runtime/src/hypercard/debug/RuntimeCardDebugWindow.tsx`
- Chat event viewer: `EventViewerWindow` in `chat-runtime`.
  - file: `packages/chat-runtime/src/chat/debug/EventViewerWindow.tsx`
- Chat timeline inspector: `TimelineDebugWindow` in `chat-runtime`.
  - file: `packages/chat-runtime/src/chat/debug/TimelineDebugWindow.tsx`

Implication: We can compose these instead of rebuilding from scratch, but today composition is manual and app-local.

### 4. `RuntimeCardDebugWindow` still contains residual inventory coupling

Evidence:

- hardcoded editor owner app id in edit action:
  - `openCodeEditor(dispatch, { ownerAppId: 'inventory', cardId: card.cardId }, card.code)` at `RuntimeCardDebugWindow.tsx:122`
- stack selection only uses first provided stack:
  - `const activeStack = stacks[0];` at `74`
- cross-package debug UI dependency:
  - `SyntaxHighlight` imported from `@hypercard/chat-runtime` at `10`

Implication: Even “shared” runtime debug UI is not fully app-agnostic yet.

### 5. Chat event/timeline windows are generic by props but currently inventory-routed

Evidence:

- `EventViewerWindow` only needs `conversationId` (`EventViewerWindow.tsx:31-35`).
- `TimelineDebugWindow` only needs `conversationId` (`TimelineDebugWindow.tsx:26-30`).
- Inventory render routing instantiates these components by instance prefix (`renderInventoryApp.tsx:1017-1024`).

Implication: Their internals are reusable; missing piece is shared runtime debug routing/orchestration.

### 6. VM state needed for a dedicated VM debug pane already exists

Evidence in `pluginCardRuntimeSlice.ts`:

- runtime session registry (`56-62`, `203-214`)
- runtime intent timeline (`14-26`, `163-197`, `352-354`)
- pending domain/system/nav intent queues (`59-61`, `275-307`)

Evidence in selectors:

- selectors for timeline and pending queues in `selectors.ts:34-43`

Implication: We can add an app-agnostic VM pane without changing runtime core contracts.

## Gap Analysis

### Gap A: No package-level debug suite abstraction

Each app must reproduce the same layers:

- command ids,
- payload builders,
- instance parsing,
- render routing,
- menu/context action registration.

### Gap B: Stack/chat/vm surfaces are not bundled as one reusable set

Current state is component-level reuse, not experience-level reuse.

### Gap C: Current stack runtime debug window cannot identify owning app generically

It always launches editor as `ownerAppId: 'inventory'`, which is incorrect for non-inventory stacks.

### Gap D: Conversation resolution is app-specific and duplicated

Inventory couples `convId` discovery to `appKey` format and `chat-` instance prefix. This logic will differ by app and needs configurable injection, not copy/paste.

## Target Design Principles

1. `hypercard-runtime` owns shared debug suite APIs and defaults.
2. Launcher apps supply app-specific policy through typed options.
3. App-specific naming should be data/config, not hardcoded in components.
4. Composition should use existing shell contribution contracts.
5. Add VM pane visibility without changing runtime intent contracts.

## Proposed Architecture

## 1) New package module: `hypercard-runtime/debug-suite`

Create a debug-suite layer in `hypercard-runtime` that provides three categories of API:

1. `window payload helpers` (typed instance codecs + `OpenWindowPayload` builders)
2. `desktop contribution factory` (commands/menus/icons/context actions)
3. `render helper` (maps instance id to correct debug React window)

### High-level structure

```text
packages/hypercard-runtime/src/hypercard/debug-suite/
  index.ts
  types.ts
  instanceCodec.ts
  payloads.ts
  contributionFactory.ts
  renderDebugWindow.tsx
  RuntimeDebugHubWindow.tsx
  RuntimeVmDebugPanel.tsx
```

## 2) Introduce a unified app-agnostic debug window descriptor contract

Define a typed union for debug window kinds.

Example kinds:

- `hub` (tabbed stack/chat/vm view)
- `chat-events`
- `chat-timeline`
- `runtime-cards` (legacy compatibility surface)
- `vm`

Codec output example instance id:

- `debug~hub`
- `debug~chat-events~<convId>`
- `debug~chat-timeline~<convId>`
- `debug~vm`

This replaces custom per-app string prefixes like `event-viewer-` and `timeline-debug-`.

## 3) Build a reusable contribution factory

Add `createRuntimeDebugContribution(options)` which returns `DesktopContribution`.

The app provides:

- `ownerAppId`
- command namespace prefix (default derived from app id)
- stack provider
- optional conversation resolver
- menu/icon inclusion flags
- optional label overrides

The factory emits:

- debug commands (open hub/events/timeline/vm)
- optional menu section entries
- optional folder/icon entries
- optional card window adapter helper for stack(s)

## 4) Provide app-agnostic render helper

Add `renderRuntimeDebugWindow(options, instanceId, renderCtx): ReactNode | null`.

Behavior:

- decode instance id,
- route to `RuntimeDebugHubWindow`, `EventViewerWindow`, `TimelineDebugWindow`, `RuntimeCardDebugWindow`, or `RuntimeVmDebugPanel`,
- return `null` for non-debug instances so host app render can continue.

This lets launcher modules keep render ownership while reusing shared routing.

## 5) Add a first-class VM pane

Create `RuntimeVmDebugPanel` in `hypercard-runtime` that reads:

- sessions,
- runtime timeline,
- pending domain/system/nav intents.

Initial view targets read-only diagnostics similar to current stack window style:

- session status table,
- timeline list with filters (`scope`, `outcome`, `sessionId`),
- pending queues and counts,
- copy/export JSON actions.

## 6) Refactor `RuntimeCardDebugWindow` for app-agnostic behavior

Changes required:

1. add `ownerAppId` prop (required or default to explicit fallback),
2. remove hardcoded `'inventory'` from edit action,
3. support selecting among multiple stacks (not only `stacks[0]`),
4. keep current sections (stack cards, runtime registry, artifacts, sessions).

## 7) Keep chat debug components where they are; compose, do not fork

For v1 of this plan:

- continue rendering `EventViewerWindow` and `TimelineDebugWindow` from `chat-runtime`,
- invoke them from `hypercard-runtime` debug-suite renderer,
- avoid component duplication.

Future optional improvement:

- extract shared debug primitives (`SyntaxHighlight`, YAML helpers, structured tree) into neutral package if dependency direction needs cleanup.

## Architecture Diagrams

### Current state (inventory owns orchestration)

```text
inventory launcher module
  |- build payload strings / prefixes / command ids
  |- parse focused conversation from inventory appKey format
  |- render branches for EventViewer / Timeline / RuntimeCardDebug
  |- menu + context registration
  |- card adapter tied to inventory STACK
         |
         +--> chat-runtime debug components (EventViewerWindow, TimelineDebugWindow)
         +--> hypercard-runtime component (RuntimeCardDebugWindow)
```

### Target state (hypercard-runtime owns debug-suite composition)

```text
any launcher app module
  |- createRuntimeDebugContribution(options)
  |- renderRuntimeDebugWindow(options, instanceId, ctx)
  |- (optional) createRuntimeCardAdapters(options)
         |
         +--> hypercard-runtime debug-suite (shared)
                |- RuntimeDebugHubWindow (tabs: Stack / Chat / VM)
                |- RuntimeCardDebugWindow (ownerAppId-aware)
                |- RuntimeVmDebugPanel
                |- delegates chat panels to chat-runtime components
```

### Open-debug command sequence

```text
User -> Menu command "Debug > Event Viewer"
  -> Desktop command router
    -> createRuntimeDebugContribution handler
      -> resolve conversationId (from provided resolver)
      -> build debug instance id (codec)
      -> openWindow({ content: { kind:'app', appKey: <ownerAppId>:<instance> } })
        -> module renderWindow(instanceId)
          -> renderRuntimeDebugWindow(...)
            -> <EventViewerWindow conversationId=... />
```

## API Reference (Proposed)

## Types

```ts
// packages/hypercard-runtime/src/hypercard/debug-suite/types.ts

export interface RuntimeDebugConversationContext {
  state: unknown;
  focusedWindowId: string | null;
}

export interface RuntimeDebugConversationResolver {
  (ctx: RuntimeDebugConversationContext): string | null;
}

export interface RuntimeDebugSuiteOptions {
  ownerAppId: string;
  stacks: CardStackDefinition[] | (() => CardStackDefinition[]);
  commandPrefix?: string; // default: `${ownerAppId}.debug.`
  includeMenuSection?: boolean;
  includeIcons?: boolean;
  conversationResolver?: RuntimeDebugConversationResolver;
  labels?: {
    menuSection?: string;
    hub?: string;
    events?: string;
    timeline?: string;
    stacks?: string;
    vm?: string;
  };
}
```

## Window descriptor + codec

```ts
export type RuntimeDebugWindowKind =
  | { kind: 'hub' }
  | { kind: 'chat-events'; conversationId: string }
  | { kind: 'chat-timeline'; conversationId: string }
  | { kind: 'runtime-cards' }
  | { kind: 'vm' };

export function encodeRuntimeDebugInstanceId(desc: RuntimeDebugWindowKind): string;
export function decodeRuntimeDebugInstanceId(instanceId: string): RuntimeDebugWindowKind | null;
```

## Contribution factory + rendering helper

```ts
export function createRuntimeDebugContribution(
  hostContext: LauncherHostContext,
  options: RuntimeDebugSuiteOptions,
): DesktopContribution;

export function renderRuntimeDebugWindow(args: {
  instanceId: string;
  windowId: string;
  options: RuntimeDebugSuiteOptions;
}): ReactNode | null;
```

## Pseudocode (app integration)

```ts
// app launcher module (inventory, hypercard-tools, or new app)

const debugOptions: RuntimeDebugSuiteOptions = {
  ownerAppId: 'inventory',
  stacks: [STACK],
  conversationResolver: ({ state, focusedWindowId }) => resolveConvIdForInventory(state, focusedWindowId),
};

createContributions: (hostContext) => [
  createRuntimeDebugContribution(hostContext, debugOptions),
  createAppSpecificContribution(hostContext),
],

renderWindow: ({ instanceId, windowId }) => {
  const debugNode = renderRuntimeDebugWindow({ instanceId, windowId, options: debugOptions });
  if (debugNode) return debugNode;

  // existing app window routes
  if (instanceId.startsWith('chat-')) return <ChatConversationWindow ... />;
  if (instanceId === 'folder') return <FolderWindow />;
  return <UnknownWindow instanceId={instanceId} />;
};
```

## Detailed Implementation Plan (For Later)

## Phase 0: Baseline and guardrails

Goal: freeze current behavior via tests before extracting.

1. Add/expand tests around current inventory debug command behavior.
2. Capture current command IDs and instance routing assumptions in fixtures.
3. Add “no-regression” snapshots for menu labels and icon ids if story tests exist.

Suggested files:

- `apps/inventory/src/launcher/__tests__/...` (new tests)
- reuse existing launcher host tests in `wesen-os/apps/os-launcher/src/__tests__/launcherHost.test.tsx`

## Phase 1: Decouple `RuntimeCardDebugWindow`

Goal: remove hardcoded inventory assumptions.

1. Add prop: `ownerAppId`.
2. Replace hardcoded `'inventory'` in `openCodeEditor(...)` call.
3. Add stack selector UI when `stacks.length > 1`.
4. Keep backward-compatible defaults temporarily (`ownerAppId = 'inventory'`) only during migration phase.

Files:

- `packages/hypercard-runtime/src/hypercard/debug/RuntimeCardDebugWindow.tsx`
- `packages/hypercard-runtime/src/hypercard/debug/RuntimeCardDebugWindow.stories.tsx`
- tests for new prop/selection behavior

## Phase 2: Implement debug-suite codec and payload helpers

Goal: standardize debug instance ids and window payload creation.

1. Add `instanceCodec.ts` and tests.
2. Add payload builders that wrap `formatAppKey(ownerAppId, instanceId)`.
3. Ensure dedupe keys are deterministic.

Files:

- `packages/hypercard-runtime/src/hypercard/debug-suite/instanceCodec.ts`
- `packages/hypercard-runtime/src/hypercard/debug-suite/payloads.ts`
- tests in `debug-suite/__tests__/...`

## Phase 3: Implement VM debug panel

Goal: expose runtime VM state/intents in an app-agnostic UI.

1. Add `RuntimeVmDebugPanel.tsx` using selectors from plugin runtime feature.
2. Include filters and queue/timeline summaries.
3. Add copy/export action hooks and tests for filter logic.

Files:

- `packages/hypercard-runtime/src/hypercard/debug-suite/RuntimeVmDebugPanel.tsx`
- optional helper model file for derived rows/filters
- tests for selectors-to-view model mapping

## Phase 4: Implement contribution factory and render helper

Goal: make orchestration reusable.

1. Add `createRuntimeDebugContribution(...)`.
2. Add `renderRuntimeDebugWindow(...)`.
3. Add optional `RuntimeDebugHubWindow` tabbed shell composing stack/chat/vm panes.
4. Export APIs via hypercard runtime barrels.

Files:

- `packages/hypercard-runtime/src/hypercard/debug-suite/contributionFactory.ts`
- `packages/hypercard-runtime/src/hypercard/debug-suite/renderDebugWindow.tsx`
- `packages/hypercard-runtime/src/hypercard/debug-suite/RuntimeDebugHubWindow.tsx`
- `packages/hypercard-runtime/src/hypercard/index.ts`
- `packages/hypercard-runtime/src/index.ts` (if needed)

## Phase 5: Migrate inventory to new shared API

Goal: delete duplicated inventory glue and keep behavior equivalent.

1. Replace inventory-specific debug command/payload builders with factory output.
2. Replace debug render branches with `renderRuntimeDebugWindow(...)`.
3. Keep only inventory-specific conversation resolver and stack binding.
4. Remove dead code/prefix parsers that become obsolete.

Files:

- `apps/inventory/src/launcher/renderInventoryApp.tsx`
- `apps/inventory/src/launcher/module.tsx` (if any wiring changes)

## Phase 6: Optional adoption in hypercard-tools

Goal: validate true app-agnostic portability.

1. Plug same factory into `apps/hypercard-tools`.
2. Provide stack binding and optional conversation resolver (if chat windows exist).

Files:

- `apps/hypercard-tools/src/launcher/module.tsx`

## Phase 7: Documentation and onboarding

1. Add usage docs in `hypercard-runtime` readme or docs folder.
2. Add “how to enable debug suite in an app module” with minimal integration example.
3. Add troubleshooting matrix (missing conv id, missing stack, unknown instance id).

## Testing and Validation Strategy

## Unit tests

1. instance codec round-trips (`encode`/`decode`).
2. payload builders set `appKey`, dedupe keys, and labels correctly.
3. VM panel view model filters and counts.
4. `RuntimeCardDebugWindow` uses provided `ownerAppId`.

## Integration tests

1. command routing opens correct debug window ids.
2. menu/context actions resolve by focus and provided conversation resolver.
3. `renderRuntimeDebugWindow` returns `null` for non-debug instances.

## Storybook

1. `RuntimeDebugHubWindow` with mocked tabs/data.
2. `RuntimeVmDebugPanel` with seeded timeline and pending queues.
3. multi-stack `RuntimeCardDebugWindow` story.

## Launcher smoke tests

1. inventory: open each debug surface via menu/icon/command.
2. verify event viewer and timeline resolve focused conversation.
3. verify runtime card edit opens editor with app-correct `ownerAppId`.

## Risks and Tradeoffs

1. `Conversation resolver` flexibility vs complexity.
- Risk: overly generic resolver API can become hard to reason about.
- Mitigation: keep resolver minimal (`state`, `focusedWindowId`) and document expected behavior.

2. Temporary duplication during migration.
- Risk: inventory keeps old + new paths briefly.
- Mitigation: phase cutover with tests, then remove old path in same ticket phase.

3. Cross-package debug dependencies (`SyntaxHighlight` from chat runtime).
- Risk: layering confusion and future dependency cycles.
- Mitigation: keep v1 as-is; track follow-up extraction if needed.

4. Hub window scope creep.
- Risk: tabbed hub could delay rollout if overdesigned.
- Mitigation: ship factory + per-window routing first; add hub tabbing as incremental step.

## Open Questions

1. Should the first shared surface be a tabbed “hub” window, or just shared builders for separate windows to minimize risk?
2. Should conversation resolution become a standardized helper in `chat-runtime`, or remain app-provided in `hypercard-runtime` options?
3. Should VM pane expose action dispatch replay/simulation, or stay read-only initially?
4. Do we want to keep inventory-prefixed command ids for backwards script compatibility, or intentionally cut over to a new shared naming scheme?

## Intern Onboarding Guide: How to Work This Ticket Later

1. Read these files first:
- `renderInventoryApp.tsx` (full current glue)
- `RuntimeCardDebugWindow.tsx` (stack runtime surface)
- `EventViewerWindow.tsx` and `TimelineDebugWindow.tsx` (chat surfaces)
- `pluginCardRuntimeSlice.ts` and `selectors.ts` (vm state contracts)
- `desktopContributions.ts` and `windowContentAdapter.ts` (shell extension contracts)

2. Implement in this order:
- decouple `RuntimeCardDebugWindow` owner app,
- implement codec + payload helpers,
- implement factory + render helper,
- migrate inventory,
- add VM pane,
- add hub if time remains.

3. Keep PRs small:
- PR1: component decouple
- PR2: codec/factory skeleton
- PR3: inventory migration
- PR4: VM pane + docs/tests

4. Validation checklist per PR:
- unit tests pass in `hypercard-runtime`
- inventory launcher tests pass
- manual open flows verified (`event`, `timeline`, `stacks`, `vm` where applicable)

## References

- Inventory debug composition:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx`
- Runtime card debug component:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/hypercard/debug/RuntimeCardDebugWindow.tsx`
- Chat debug components:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/chat-runtime/src/chat/debug/EventViewerWindow.tsx`
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/chat-runtime/src/chat/debug/TimelineDebugWindow.tsx`
- VM runtime state + selectors:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/features/pluginCardRuntime/pluginCardRuntimeSlice.ts`
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/features/pluginCardRuntime/selectors.ts`
- Shell contribution contracts:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/engine/src/components/shell/windowing/desktopContributions.ts`
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/engine/src/components/shell/windowing/windowContentAdapter.ts`
- Launcher module pattern:
  - `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx`
