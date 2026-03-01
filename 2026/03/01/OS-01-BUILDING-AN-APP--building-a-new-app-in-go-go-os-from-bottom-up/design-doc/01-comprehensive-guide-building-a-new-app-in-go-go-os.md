---
Title: 'Comprehensive Guide: Building a New App in go-go-os'
Ticket: OS-01-BUILDING-AN-APP
Status: active
Topics:
    - wesen-os
    - backend
    - frontend
    - modules
    - bundling
    - js-vm
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/apps/arc-agi-player/src/domain/pluginBundle.ts
      Note: ARC VM card bundle intent mapping.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/apps/arc-agi-player/src/domain/stack.ts
      Note: ARC stack declarations for runtime card handlers.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/module.tsx
      Note: ARC frontend launcher module and UI entrypoint.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/pkg/backendmodule/module.go
      Note: ARC AGI backend module implementation and exported metadata.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/pkg/backendmodule/module_test.go
      Note: ARC backend tests for contracts and capabilities.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/pkg/backendmodule/reflection.go
      Note: ARC reflection metadata surfaced to launcher app catalog.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/pkg/backendmodule/routes.go
      Note: ARC AGI HTTP route registration and app namespace.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/apps/inventory/src/domain/pluginBundle.ts
      Note: Inventory VM bundle definition and event mapping entrypoints.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/apps/inventory/src/domain/pluginBundle.vm.js
      Note: Inventory VM runtime dispatch implementation used by cards.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/apps/inventory/src/domain/stack.ts
      Note: Inventory stack builder used by defineStackBundle.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/apps/inventory/src/launcher/module.tsx
      Note: Inventory frontend launcher module registration and metadata.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/apps/inventory/src/reducers.ts
      Note: Inventory reducer and event sink integration for VM intents.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/pkg/backendcomponent/component.go
      Note: Inventory backend app module implementation and API routes.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/pkg/backendcomponent/component_test.go
      Note: Inventory backend contract verification.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/pkg/pinoweb/hypercard_events.go
      Note: Hypercard timeline event construction for card workflows.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/pkg/pinoweb/runtime_composer.go
      Note: Runtime card composition from timeline context.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/pkg/backendmodule/contracts.go
      Note: GEPA backend DTO contracts consumed by frontend and runtime.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/pkg/backendmodule/module.go
      Note: GEPA backend module registration and HTTP capability surface.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/pkg/backendmodule/module_test.go
      Note: GEPA backend module tests used in experiment suite.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/pkg/backendmodule/run_service.go
      Note: GEPA run service orchestration behind backend routes.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/backendhost_test.go
      Note: Contract tests validating host mount and lifecycle behavior.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/lifecycle.go
      Note: Lifecycle start and stop management for mounted backend modules.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/manifest_endpoint.go
      Note: Manifest endpoint contract used by launcher discovery.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/module.go
      Note: Core backend module contract and typed registration interface.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/registry.go
      Note: Registry mechanics used when mounting app backends.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/routes.go
      Note: Namespaced route mounting behavior and path prefixing.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/go.work
      Note: |-
        Workspace composition of all app/backend/frontend modules
        Defines multi-module workspace composition for launcher assembly.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/apps/os-launcher/src/app/modules.tsx
      Note: Launcher app registry and module composition frontend side.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/apps/os-launcher/src/app/registry.ts
      Note: Registry helper utilities and module selection logic.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/apps/os-launcher/src/app/store.ts
      Note: Global store wiring for app slices and runtime reducers.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/apps/os-launcher/src/domain/pluginBundle.ts
      Note: Launcher-level VM bundle definitions and intent handlers.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/apps/os-launcher/src/domain/pluginBundle.vm.js
      Note: Launcher VM JS dispatch primitives used by runtime cards.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/apps/os-launcher/src/domain/stack.ts
      Note: Launcher stack bundle declaration for card and page assembly.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/apps/os-launcher/src/main.tsx
      Note: Frontend bootstrap and launcher app root mount.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/apps/os-launcher/vite.config.ts
      Note: Vite alias and proxy mapping for launcher frontend.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go
      Note: Inventory backend adapter used by wesen-os launcher.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/cmd/wesen-os-launcher/main.go
      Note: Launcher composition root mounting backends and frontend.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/cmd/wesen-os-launcher/main_integration_test.go
      Note: Cross-app integration tests verifying app registry endpoints.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/go.mod
      Note: Local replace directives and module wiring for composed app runtime.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/pkg/arcagi/module.go
      Note: ARC app module binding into composed launcher module list.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/pkg/gepa/module.go
      Note: GEPA app module binding into composed launcher module list.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/pkg/launcherui/handler.go
      Note: Embedded SPA serving and fallback routing behavior.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/pkg/launcherui/handler_test.go
      Note: SPA fallback tests for client routes and static assets.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/scripts/build-wesen-os-launcher.sh
      Note: Packaging build script for launcher binary.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/scripts/launcher-ui-sync.sh
      Note: Frontend asset sync script before backend embedding.
    - Path: workspaces/2026-02-22/add-gepa-optimizer/wesen-os/scripts/smoke-wesen-os-launcher.sh
      Note: Smoke test script validating startup and core routes.
ExternalSources: []
Summary: Deep, evidence-backed guide for building a new backend/frontend app module in the go-go-os ecosystem, including VM event mapping and packaging.
LastUpdated: 2026-03-01T09:11:17.535713259-05:00
WhatFor: Onboard interns and engineers to implement and integrate new apps from first principles.
WhenToUse: When adding a new app backend+frontend pair to wesen-os and wiring VM cards, runtime intents, and packaging/build integration.
---

















































# Comprehensive Guide: Building a New App in go-go-os (Backend + Frontend + VM + Packaging)

## Executive summary

This document explains, in detail, how a new app is built and integrated in the current go-go-os ecosystem used by `wesen-os`. It is deliberately written for engineers who are new to the codebase and need both conceptual understanding and actionable implementation steps.

The architecture is modular and split across repositories:

1. Backend host contract and lifecycle live in `go-go-os-backend`.
2. Shared frontend launcher/runtime contracts live in `go-go-os-frontend`.
3. App-specific implementations live in app repositories such as `go-go-app-inventory`, `go-go-app-arc-agi-3`, and `go-go-gepa`.
4. Composition and deployment entrypoint currently live in `wesen-os` (`cmd/wesen-os-launcher`).

At runtime, the end-to-end flow is:

1. A backend module is registered with an app id and mounted under `/api/apps/<app-id>/...`.
2. The launcher frontend registers a corresponding app module and contributes icons/commands/window renderers.
3. If the app uses HyperCard plugin cards, VM bundle code is loaded by `QuickJSCardRuntimeService`.
4. Card handlers emit runtime intents (`card`, `session`, `domain`, `system`) via `dispatch*` APIs.
5. Intent routing maps those intents into Redux updates, domain actions, and system actions.
6. Packaging scripts and embed handling produce a runnable launcher with SPA assets and namespaced backend routes.

This guide includes evidence from code, runnable experiments, and complete pseudocode for creating a new app from zero.

## Problem statement and scope

### Problem

A new engineer needs to build a new app in this environment and must answer these non-trivial questions:

1. Where is the backend contract and how are routes mounted safely?
2. How does frontend launcher registration actually work?
3. How does VM JavaScript emit events/intents that mutate app state?
4. How do hypercard timeline events become runnable runtime cards?
5. What scripts/build steps are required to package and ship the app in `wesen-os`?

### Scope

This document covers:

1. Backend implementation and registration.
2. Frontend app module implementation and launcher contributions.
3. VM card bundle authoring and event-to-intent routing.
4. Packaging, embedding, route proxying, and smoke checks.
5. Practical implementation playbook with file-by-file guidance.

Out of scope:

1. Product UX design details.
2. CI/CD policy beyond what is already encoded in project scripts.
3. Non-current historical architectures.

## Repository map and architectural boundaries

The root workspace (`go.work`) includes the modules you need to reason about (`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go.work:1`):

1. `go-go-os-backend`
2. `go-go-os-frontend`
3. `go-go-app-inventory`
4. `go-go-app-arc-agi-3`
5. `go-go-gepa`
6. `wesen-os`

The composition binary uses local `replace` directives (`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/go.mod:5`, `:7`, `:166`, `:168`) so these repositories act like one integrated system during development.

### High-level topology

```text
+-------------------------+        +--------------------------------+
|      wesen-os           |        |        go-go-os-frontend       |
| cmd/wesen-os-launcher   |<------>| desktop-os + hypercard-runtime |
| module composition      |        | contracts + runtime host        |
+------------+------------+        +----------------+---------------+
             |                                      |
             | mounts /api/apps/<id>               | loads app modules
             v                                      v
+-------------------------+        +--------------------------------+
|    go-go-os-backend     |        | app repos (inventory/arc/...)  |
| backendhost interfaces  |        | launcher module + VM bundles    |
| lifecycle + namespaces  |        | reducers + app windows          |
+------------+------------+        +----------------+---------------+
             |                                      |
             | adapters                             | domain intents
             v                                      v
+-------------------------+        +--------------------------------+
| app backends            |        | Redux + intent routing          |
| inventory / arc / gepa  |        | (domain/system/card/session)    |
+-------------------------+        +--------------------------------+
```

## Backend foundation: host contract, lifecycle, routing, manifest

### Backend module contract

The canonical backend-side app contract is `AppBackendModule` (`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/module.go:17`). Every backend app provides:

1. `Manifest()` for app identity and capabilities.
2. `MountRoutes(*http.ServeMux)` for HTTP routes.
3. `Init/Start/Stop/Health` lifecycle methods.

Optional reflection is enabled by implementing `ReflectiveAppBackendModule` (`module.go:27`) and returning a `ModuleReflectionDocument` (`module.go:33`).

### Registry and app-id safety

`NewModuleRegistry` validates module uniqueness and app id format (`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/registry.go:14`).

Key guarantees:

1. Nil modules are rejected.
2. Invalid app IDs are rejected (`ValidateAppID`, `/pkg/backendhost/routes.go:18`).
3. Duplicate app IDs fail registration (`registry.go:29`).

### Lifecycle behavior

`LifecycleManager.Startup` performs ordered `Init` then `Start` across modules and enforces required-app health checks (`/pkg/backendhost/lifecycle.go:23`).

Semantics:

1. Required apps come from explicit startup options plus manifest `Required` flags (`lifecycle.go:95`).
2. On any startup failure, rollback via `Stop` is executed in reverse order (`lifecycle.go:40`, `:45`, `:71`).

### Namespaced mount model and legacy guardrails

All app routes must be mounted under `/api/apps/<app-id>/...` using `MountNamespacedRoutes` (`/pkg/backendhost/routes.go:37`).

Legacy aliases like `/chat`, `/ws`, `/api/timeline` are explicitly forbidden by `GuardNoLegacyAliases` (`routes.go:58`) and are additionally registered as explicit 404s in `wesen-os` (`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/cmd/wesen-os-launcher/main.go:409`).

This is one of the most important architecture invariants in this codebase.

### Manifest + reflection endpoint

`RegisterAppsManifestEndpoint` exposes:

1. `GET /api/os/apps` with health and reflection hints (`/pkg/backendhost/manifest_endpoint.go:35`).
2. `GET /api/os/apps/{app_id}/reflection` when supported (`manifest_endpoint.go:70`, `:93`).

This endpoint is critical for frontend discoverability tooling and debugging.

## Backend composition in wesen-os launcher

The composition entrypoint is `wesen-os/cmd/wesen-os-launcher/main.go`.

### What happens in `RunIntoWriter`

Core steps (in order):

1. Parse server config flags (`main.go:44` onward).
2. Initialize inventory DB and seed/migrate (`main.go:117` to `:143`).
3. Build inventory runtime composer and profile registry (`main.go:145` to `:200`).
4. Create webchat server and register inventory tools (`main.go:201` to `:214`).
5. Create GEPA module (`main.go:216` to `:225`).
6. Conditionally create ARC module (`main.go:237` to `:253`).
7. Create module registry and lifecycle startup (`main.go:255` to `:268`).
8. Mount namespaced routes per module (`main.go:270` to `:277`).
9. Register legacy 404 aliases + launcher SPA handler (`main.go:278` to `:280`).
10. Optionally mount everything under a custom root prefix (`main.go:286` to `:299`).

### Module adapters in wesen-os

`wesen-os` wraps app-specific module contracts into the shared backendhost interface:

1. Inventory wrapper: `/cmd/wesen-os-launcher/inventory_backend_module.go:22`.
2. ARC wrapper: `/pkg/arcagi/module.go:20`.
3. GEPA wrapper: `/pkg/gepa/module.go:20`.

These wrappers normalize manifest/reflection structures so all modules look identical to `backendhost`.

### Integration evidence in tests

`main_integration_test.go` demonstrates expected integration behavior:

1. Hypercard websocket lifecycle events (`hypercard.widget.start`, `hypercard.widget.v1`) are observed (`/cmd/wesen-os-launcher/main_integration_test.go:344` to `:357`).
2. `/api/os/apps` includes inventory/gepa/arc module metadata (`:435`, `:466`, `:495`).
3. Confirm routes coexist with chat/timeline under namespaced app routes (`:853` onward).

## App backend case studies

### Inventory backend component

Inventory backend contract and route mount live in:

`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/pkg/backendcomponent/component.go`

Key details:

1. App id is `inventory` (`component.go:17`).
2. Manifest advertises `chat`, `ws`, `timeline`, `profiles`, `confirm` (`component.go:96` to `:109`).
3. Mounted routes include `/chat`, `/ws`, `/api/timeline`, `/api/`, `/confirm`, `/` (`component.go:137` to `:152`).

### ARC backend module

ARC backend module lives in:

`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/pkg/backendmodule/module.go`

Important characteristics:

1. Config normalization sets defaults for driver/runtime/api key/timeouts (`module.go:42` to `:91`).
2. Manifest capabilities include `games`, `sessions`, `actions`, `timeline`, `reflection` (`module.go:93` to `:107`).
3. Route surface includes `/games`, `/sessions`, `/schemas` (`module.go:109` to `:121`).
4. Reflection can be disabled via config (`module.go:156` to `:160`).

Route handlers implement the gameplay API (`routes.go`), including session reset/action and timeline/event retrieval.

### GEPA backend module

GEPA backend module lives in:

`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/pkg/backendmodule/module.go`

Highlights:

1. App id is `gepa` (`module.go:17`).
2. Manifest exposes script runner + events/timeline + reflection (`module.go:63` to `:76`).
3. Routes: `/scripts`, `/runs`, `/schemas` (`module.go:79` to `:88`).
4. Reflection document describes APIs/schemas for discovery (`module.go:125` onward).

## Frontend launcher foundation (shared contracts)

Shared frontend launcher architecture is in `go-go-os-frontend/packages/desktop-os`.

### Manifest and module contracts

`AppManifest` and validation live in:

`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/desktop-os/src/contracts/appManifest.ts`

`LaunchableAppModule` lives in:

`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts`

Every app frontend module provides:

1. `manifest` (id/name/icon/launch mode).
2. optional state reducer registration.
3. `buildLaunchWindow`.
4. optional `createContributions`.
5. `renderWindow`.

### Registry, contributions, window rendering

Core runtime pieces:

1. `createAppRegistry` checks manifest/state-key uniqueness (`/registry/createAppRegistry.ts:22`).
2. `buildLauncherContributions` aggregates module contributions and launch commands (`/runtime/buildLauncherContributions.ts:44`).
3. `renderAppWindow` parses `appKey`, finds module, and calls `module.renderWindow` (`/runtime/renderAppWindow.ts:14`).
4. `createLauncherStore` merges shared reducers and module reducers while protecting reserved keys (`/store/createLauncherStore.ts:71`).

## Frontend composition in wesen-os launcher app

`wesen-os/apps/os-launcher` wires the shared runtime into a concrete shell.

### Module list and registry

`launcherModules` currently include inventory, todo, crm, book-tracker, arc, apps-browser, hypercard-tools (`/apps/os-launcher/src/app/modules.tsx:10`).

`launcherRegistry = createAppRegistry(launcherModules)` (`/app/registry.ts:1`).

### Store

The launcher store includes shared reducers from chat runtime and app reducers (`/app/store.ts:12` onward).

### Host context

`App.tsx` defines host context functions (`/apps/os-launcher/src/App.tsx:22`):

1. `dispatch/getState`
2. `openWindow/closeWindow`
3. `resolveApiBase(appId) => /api/apps/<appId>`
4. `resolveWsBase(appId) => /api/apps/<appId>/ws`

This host context is the bridge between desktop shell and app modules.

## HyperCard VM runtime deep dive

This is the most important section for “event mapping to VM JS”.

### VM contract primitives

`stack-bootstrap.vm.js` defines global VM APIs:

1. `defineStackBundle(factory)`.
2. `defineCard(cardId, definitionOrFactory)`.
3. `defineCardRender(cardId, renderFn)`.
4. `defineCardHandler(cardId, handlerName, handlerFn)`.

See `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js:87` onward.

### Runtime dispatch functions inside VM

During `__stackHost.event(...)`, the runtime injects dispatchers (`stack-bootstrap.vm.js:220` to `:261`):

1. `dispatchCardAction(actionType, payload)` -> scope `card`.
2. `dispatchSessionAction(actionType, payload)` -> scope `session`.
3. `dispatchDomainAction(domain, actionType, payload)` -> scope `domain`.
4. `dispatchSystemCommand(command, payload)` -> scope `system`.

The handler returns a list of runtime intents.

### Runtime service

`QuickJSCardRuntimeService` loads code, renders cards, emits intents (`/plugin-runtime/runtimeService.ts:155`).

Relevant operations:

1. `loadStackBundle(stackId, sessionId, code)` (`runtimeService.ts:201`).
2. `renderCard(...)` (`:253`).
3. `eventCard(...)` (`:273`).
4. `defineCard/defineCardRender/defineCardHandler` for runtime injection (`:220`, `:231`, `:242`).

### Session host + renderer

`PluginCardSessionHost` orchestrates runtime load, injection, render, and event dispatch (`/runtime-host/PluginCardSessionHost.tsx:73`).

`PluginCardRenderer` translates VM UI nodes into React controls (`/runtime-host/PluginCardRenderer.tsx:56`).

### Intent routing and policy

`dispatchRuntimeIntent` is the translation point from VM intents to app actions (`/runtime-host/pluginIntentRouting.ts:83`).

Behavior:

1. All intents are ingested into runtime timeline (`ingestRuntimeIntent`).
2. Domain/system intents are capability-gated (`authorizeDomainIntent`, `authorizeSystemIntent`).
3. Domain intents dispatch Redux actions with type `<domain>/<actionType>` (`pluginIntentRouting.ts:69`, `:110`).
4. System intents map to navigation/notify/window-close actions.

### Runtime state slice

`pluginCardRuntimeSlice` stores runtime session/card state, pending intents, and timeline (`/features/pluginCardRuntime/pluginCardRuntimeSlice.ts:199`).

State actions include:

1. Local `card/session` state mutation (`patch/set/reset`) via `applyStateAction` (`:132`).
2. Queueing `domain`/`system` intents for effect hosts (`:275`, `:304`).

## Timeline SEM -> artifact projection -> runtime card injection

This pipeline is how backend-generated hypercard events become live runtime cards.

### Step 1: backend emits SEM events

Inventory registers hypercard SEM mappings (`/go-go-app-inventory/pkg/pinoweb/hypercard_events.go:167`) including `hypercard.card.v2` and `hypercard.widget.v1`.

### Step 2: chat timeline mapper normalizes entity kinds

`timelineMapper` remaps `hypercard.card.v2` and `hypercard.widget.v1` to internal render kinds and extracts `runtimeCardId/runtimeCardCode` (`/packages/chat-runtime/src/chat/sem/timelineMapper.ts:99` to `:149`).

### Step 3: artifact projection middleware

`artifactProjectionMiddleware` inspects timeline entities and extracts artifact upserts (`/hypercard/artifacts/artifactProjectionMiddleware.ts:12`).

If runtime card fields exist, it registers the card in runtime registry (`artifactProjectionMiddleware.ts:24` to `:26`).

### Step 4: runtime card injection

`PluginCardSessionHost` calls `injectPendingCardsWithReport(...)` after bundle load and on registry changes (`/runtime-host/PluginCardSessionHost.tsx:152`, `:233`).

This enables dynamic card definitions generated at runtime.

## Frontend app case studies

### Inventory frontend launcher module

`inventoryLauncherModule` is defined in:

`/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/apps/inventory/src/launcher/module.tsx`

Key points:

1. manifest id is `inventory` (`module.tsx:33`).
2. state key is `app_inventory` (`module.tsx:42`).
3. window rendering computes api base from host context (`module.tsx:51` onward).

### Inventory window and contribution model

`renderInventoryApp.tsx` is a comprehensive example of advanced launcher contributions.

It demonstrates:

1. registering timeline modules for chat runtime (`renderInventoryApp.tsx:76` to `:80`).
2. creating card adapters using `PluginCardSessionHost` (`:446` to `:463`).
3. command handlers that open windows and route conversation/debug commands (`:466` onward).
4. menu/context/action contributions (`:706` onward).

### Inventory VM bundle and reducer contract

Inventory VM bundle emits domain action types like:

1. `inventory/updateQty`
2. `inventory/saveItem`
3. `inventory/deleteItem`
4. `inventory/createItem`
5. `inventory/receiveStock`

Bundle source:

`/go-go-app-inventory/apps/inventory/src/domain/pluginBundle.vm.js`

Reducer sink:

`/go-go-app-inventory/apps/inventory/src/features/inventory/inventorySlice.ts:17` onward.

This is an important pattern: VM domain intent names should match reducer/action contracts.

### ARC frontend + bridge pattern

ARC demo stack emits `dispatchDomainAction('arc', 'command.request', ...)` from VM handlers (`/go-go-app-arc-agi-3/apps/arc-agi-player/src/domain/pluginBundle.ts:132`, `:146`, `:170`, `:198`, `:222`).

ARC bridge then handles these requests using middleware/effects:

1. contracts: `/apps/arc-agi-player/src/bridge/contracts.ts`
2. state slice: `/apps/arc-agi-player/src/bridge/slice.ts`
3. API execution middleware: `/apps/arc-agi-player/src/bridge/middleware.ts`
4. pending-intent effect host: `/apps/arc-agi-player/src/bridge/ArcPendingIntentEffectHost.tsx`

This pattern is useful when domain actions are asynchronous API workflows.

## Packaging and build pipeline

### Workspace and module composition

1. Root `go.work` includes all repos (`/go.work:1`).
2. `wesen-os/go.mod` uses local `replace` to compose app/backend modules (`/wesen-os/go.mod:5`, `:7`, `:166`, `:168`).

### Frontend build and embed

`wesen-os/package.json` defines launcher build chain (`/wesen-os/package.json:7`):

1. Build launcher frontend.
2. Sync dist to embed folder (`scripts/launcher-ui-sync.sh`).
3. Build launcher binary (`scripts/build-wesen-os-launcher.sh`).

`launcher-ui-sync.sh` copies `apps/os-launcher/dist` to `pkg/launcherui/dist` (`/scripts/launcher-ui-sync.sh:5` to `:17`).

`pkg/launcherui/handler.go` embeds `dist` via `//go:embed all:dist` and serves SPA fallback (`/pkg/launcherui/handler.go:12`, `:52`).

### Vite aliases and proxying

`apps/os-launcher/vite.config.ts` maps aliases to local source packages and app repos (`/apps/os-launcher/vite.config.ts:25` onward).

Proxy routes map `/api/apps/...` and `/api/os/apps` to backend target in dev (`vite.config.ts:60` onward).

This is how local frontend development can target running backend modules without CORS hacks.

## How to build a new app from scratch: implementation playbook

This is the practical implementation recipe.

### Phase 1: Backend module (minimum viable)

1. Create a backend module package in app repo.
2. Implement `Manifest`, `MountRoutes`, `Init`, `Start`, `Stop`, `Health`.
3. Give it a unique app id that passes backendhost validation regex.
4. Add `Reflection` support early so `/api/os/apps/<id>/reflection` is useful.

Suggested shape:

```go
// app backend module skeleton
func (m *Module) Manifest() Manifest {
  return Manifest{
    AppID: "my-app",
    Name: "My App",
    Required: false,
    Capabilities: []string{"api", "reflection"},
  }
}

func (m *Module) MountRoutes(mux *http.ServeMux) error {
  mux.HandleFunc("/health", m.handleHealth)
  mux.HandleFunc("/api/thing", m.handleThing)
  mux.HandleFunc("/schemas/", m.handleSchema)
  return nil
}
```

### Phase 2: Wire backend into wesen-os composition

1. Add a wrapper adapter in `wesen-os/pkg/<app>/module.go` if needed.
2. Instantiate module in launcher `main.go`.
3. Append to `modules` list before registry creation.
4. Ensure namespaced mount loop picks it up automatically.

Pseudocode from current launcher composition:

```go
modules := []backendhost.AppBackendModule{
  inventoryModule,
  gepaModule,
  myAppModule,
}
registry := backendhost.NewModuleRegistry(modules...)
lifecycle := backendhost.NewLifecycleManager(registry)
lifecycle.Startup(ctx, backendhost.StartupOptions{RequiredAppIDs: []string{"inventory"}})

appMux := http.NewServeMux()
backendhost.RegisterAppsManifestEndpoint(appMux, registry)
for _, module := range registry.Modules() {
  backendhost.MountNamespacedRoutes(appMux, module.Manifest().AppID, module.MountRoutes)
}
```

### Phase 3: Frontend launcher module

1. Add app launcher module implementing `LaunchableAppModule`.
2. Provide manifest id exactly matching backend app id.
3. If app needs state, add `stateKey` reducer.
4. Implement `buildLaunchWindow`, `createContributions`, `renderWindow`.

Skeleton:

```ts
export const myAppLauncherModule: LaunchableAppModule = {
  manifest: {
    id: 'my-app',
    name: 'My App',
    icon: '🧩',
    launch: { mode: 'window' },
  },
  state: {
    stateKey: 'app_my_app',
    reducer: myAppReducer,
  },
  buildLaunchWindow: (ctx, reason) => ({ ... }),
  createContributions: (ctx) => [ ... ],
  renderWindow: ({ instanceId, windowId, ctx }) => <MyAppWindow instanceId={instanceId} windowId={windowId} />,
};
```

### Phase 4: Register module in launcher frontend

1. Add module import in `wesen-os/apps/os-launcher/src/app/modules.tsx`.
2. Insert module into `launcherModules` array.
3. If needed, add shared reducer into `app/store.ts`.

### Phase 5: If app uses VM cards

1. Author plugin bundle with `defineStackBundle`.
2. Define cards and handlers.
3. Emit intents via dispatch helpers.
4. Ensure reducer/effect layer handles emitted domain action types.

VM handler template:

```js
handlers: {
  submit({ dispatchCardAction, dispatchDomainAction, dispatchSystemCommand }, args) {
    dispatchCardAction('set', { path: 'form.value', value: args.value });
    dispatchDomainAction('my-app', 'saveThing', { value: args.value });
    dispatchSystemCommand('notify', { message: 'Saved' });
  }
}
```

### Phase 6: Bridge domain intents to effects/reducers

Choose one pattern:

1. Direct reducer-only pattern (inventory style) where `domain/actionType` directly matches reducer action type.
2. Bridge middleware/effect host pattern (ARC style) where commands become asynchronous API requests and then feedback into runtime/session state.

### Phase 7: Packaging and smoke

1. Ensure app frontend is reachable by launcher build aliases and exports.
2. Run frontend build and sync scripts.
3. Build launcher binary.
4. Run smoke tests and selected integration tests.

## Event-to-VM mapping reference (end-to-end)

### Inventory hypercard event path

```text
Backend runtime emits events
  -> pinoweb hypercard SEM mappings (hypercard.widget.*, hypercard.card.*)
  -> websocket SEM envelope
  -> chat-runtime sem registry + timeline mapper
  -> timeline entity remap + artifact extraction
  -> artifact projection middleware
  -> registerRuntimeCard(runtimeCardId, runtimeCardCode)
  -> PluginCardSessionHost injectPendingCards
  -> VM defineCard()
  -> user interaction triggers handler
  -> dispatchDomainAction('inventory', ...)
  -> inventory reducer updates state
```

### ARC command path

```text
VM handler emits dispatchDomainAction('arc', 'command.request', payload)
  -> plugin intent routing dispatches arc/command.request
  -> arc bridge middleware/effect host validates + calls /api/apps/arc-agi/*
  -> response maps to arcBridge state + runtime session patches
  -> UI rerenders with status/frame/timeline updates
```

## Experiments run for this ticket

Experiment scripts were added under ticket scripts folder:

1. `scripts/run_backend_contract_experiments.sh`
2. `scripts/run_vm_event_mapping_experiments.sh`
3. `scripts/run_packaging_composition_experiments.sh`

Latest output logs:

1. `scripts/output/backend-contract-experiments-20260301-075752.log`
2. `scripts/output/vm-event-mapping-experiments-20260301-075744.log`
3. `scripts/output/packaging-composition-experiments-20260301-075744.log`

### Experiment outcomes

1. Backend contract and integration sample tests passed for backendhost, inventory, arc, gepa, and selected `wesen-os` launcher integration tests.
2. VM mapping probe confirmed dispatch primitives, intent routing, artifact projection, and reducer contract alignment.
3. Packaging probe validated go workspace/module replace setup, launcher scripts, embed handler behavior, Vite proxy map, and targeted route/embed tests.

## Common pitfalls and sharp edges

1. **App ID drift** between backend manifest and frontend manifest causes runtime mismatch.
2. **Unnamespaced route assumptions** break due enforced `/api/apps/<id>` model.
3. **Reducer action mismatch** with VM `dispatchDomainAction(domain, actionType)` leads to no-op behavior.
4. **Capabilities misconfiguration** can silently deny domain/system intents.
5. **Forgetting chat/timeline module registration** can hide hypercard timeline entities.
6. **Missing frontend dist sync** causes stale or empty embedded launcher UI.
7. **Dynamic runtime cards** require artifact projection + runtime injection chain to be intact.

## Testing strategy for a new app

### Backend tests

1. Unit tests for manifest, route handlers, lifecycle, reflection.
2. Namespaced mount tests via backendhost helper.
3. Integration tests in `wesen-os` for `/api/os/apps`, reflection, and representative route calls.

### Frontend tests

1. Module contract tests for manifest/state/window payloads.
2. Runtime intent routing tests for domain/system mapping and gating.
3. Card host tests for bundle load/render/event flow.
4. Timeline mapping tests for sem event normalization and artifact extraction.

### Smoke checks

1. `GET /api/os/apps` includes new app id and healthy state.
2. `GET /api/os/apps/<id>/reflection` returns schema.
3. Launcher icon opens app window.
4. VM card interaction mutates expected state and/or triggers expected API command.

## Intern quick-start checklist

1. Pick app id and keep it consistent everywhere.
2. Implement backend module skeleton and mount namespaced routes.
3. Add backend module to launcher composition list.
4. Implement frontend launcher module and register it in launcher modules array.
5. If using VM cards, create bundle and map domain intents to reducers/effects.
6. Run backend and integration tests.
7. Verify `/api/os/apps` + reflection.
8. Verify launcher icon -> window -> interaction flow.
9. Run packaging scripts and smoke checks.
10. Update docs, changelog, and related-file links.

## File reference catalog

### Backend host and composition

1. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/module.go`
2. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/registry.go`
3. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/lifecycle.go`
4. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/routes.go`
5. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-backend/pkg/backendhost/manifest_endpoint.go`
6. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/cmd/wesen-os-launcher/main.go`
7. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go`
8. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/pkg/gepa/module.go`
9. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/pkg/arcagi/module.go`

### Frontend launcher and VM runtime

1. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/desktop-os/src/contracts/appManifest.ts`
2. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts`
3. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/desktop-os/src/registry/createAppRegistry.ts`
4. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/desktop-os/src/runtime/buildLauncherContributions.ts`
5. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/desktop-os/src/runtime/renderAppWindow.ts`
6. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js`
7. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/runtimeService.ts`
8. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/PluginCardSessionHost.tsx`
9. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/pluginIntentRouting.ts`
10. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os-frontend/packages/hypercard-runtime/src/hypercard/artifacts/artifactRuntime.ts`

### App implementations

1. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/pkg/backendcomponent/component.go`
2. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/pkg/pinoweb/hypercard_events.go`
3. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/apps/inventory/src/launcher/module.tsx`
4. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx`
5. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-inventory/apps/inventory/src/domain/pluginBundle.vm.js`
6. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/pkg/backendmodule/module.go`
7. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/pkg/backendmodule/routes.go`
8. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/apps/arc-agi-player/src/domain/pluginBundle.ts`
9. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-app-arc-agi-3/apps/arc-agi-player/src/bridge/middleware.ts`
10. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/pkg/backendmodule/module.go`

### Packaging/build

1. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go.work`
2. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/go.mod`
3. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/package.json`
4. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/apps/os-launcher/vite.config.ts`
5. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/scripts/launcher-ui-sync.sh`
6. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/scripts/build-wesen-os-launcher.sh`
7. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/scripts/smoke-wesen-os-launcher.sh`
8. `/home/manuel/workspaces/2026-02-22/add-gepa-optimizer/wesen-os/pkg/launcherui/handler.go`

## Closing notes

The most important implementation discipline is consistency across three identifiers and boundaries:

1. app identity (`app id`) across backend + frontend manifest + namespaced API paths,
2. intent naming (`domain/actionType`) across VM handlers and reducers/effects,
3. packaging chain (frontend build -> dist sync -> embed -> launcher binary).

If those remain coherent, the modular architecture scales cleanly and new apps can be added with predictable behavior and minimal coupling.

## Appendix A: Detailed backend build sequence (line-by-line mental model)

This section intentionally slows down and walks through backend construction as if you were pair-programming with an intern.

### A1. Define app identity and capabilities first

Before writing handlers, define the shape of your app module identity:

1. `AppID` must be stable and machine-safe.
2. `Name` is human-facing.
3. `Description` should explain the module boundary.
4. `Capabilities` should be small, specific, and meaningful.

Why this matters:

1. `AppID` controls URL namespace (`/api/apps/<app-id>`), manifest discovery, and frontend linkage.
2. Capability strings become quick diagnostics for whether a module is configured properly.

### A2. Mount only app-local routes

Inside `MountRoutes`, think “this mux is already app-scoped.”

If your app id is `my-app`, backendhost will mount your subroutes under `/api/apps/my-app/`.

So if you write:

```go
mux.HandleFunc("/jobs", m.handleJobs)
```

then effective route is:

```text
/api/apps/my-app/jobs
```

Do not hardcode `/api/apps/my-app` inside the app module itself. That path prefix belongs to the backendhost layer.

### A3. Add health behavior that actually proves readiness

A weak `Health()` implementation that always returns nil is a hidden risk. Make health meaningful:

1. verify required directories and files,
2. verify external runtime process connection,
3. verify required schema/config loaded,
4. verify DB handle availability where relevant.

This will surface deployment errors during startup instead of after user traffic arrives.

### A4. Reflection should be treated as required in practice

Reflection is technically optional but practically very useful.

Invest in reflection early:

1. include endpoint list,
2. include schema references,
3. include doc links,
4. include capability stability notes.

This accelerates onboarding and reduces guesswork.

### A5. Register module in composition with fail-fast startup

When composing modules in `wesen-os`:

1. create module instances,
2. pass all modules into `backendhost.NewModuleRegistry(...)`,
3. run lifecycle startup,
4. mount namespaced routes in a single loop.

Treat this sequence as non-negotiable ordering.

### A6. Add tests before exposing to launcher frontend

Recommended minimum backend tests for a new app:

1. manifest contract test,
2. route method validation (`GET` vs `POST`),
3. health error path test,
4. reflection availability test,
5. lifecycle required-app behavior test in composition context.

## Appendix B: Detailed frontend launcher build sequence

### B1. Define the frontend manifest with backend awareness

Your frontend manifest should intentionally model backend linkage via host context resolution.

Even when the manifest backend field is optional, the module should still use:

1. `ctx.resolveApiBase(appId)` for HTTP
2. `ctx.resolveWsBase(appId)` for websocket

This avoids path drift between modules.

### B2. Choose app window strategy early

Decide whether your app opens:

1. one singleton workspace window,
2. multiple instance windows,
3. folder + child windows (inventory pattern),
4. hybrid app+card windows (inventory/arc patterns).

Window strategy impacts:

1. dedupe keys,
2. context action design,
3. command routing complexity,
4. runtime session lifecycle behavior.

### B3. Prefer explicit command handlers over implicit magic

The inventory launcher contribution file is long because it encodes explicit behavior.

That is a strength, not a weakness, for maintainability. Command handlers should be explicit about:

1. command match rules,
2. preconditions,
3. fallback behavior,
4. side effects,
5. return (`handled` vs `pass`).

### B4. Use adapters for card windows

If your app uses plugin cards:

1. add a window content adapter,
2. match `window.content.kind === 'card'`,
3. delegate to `PluginCardSessionHost`.

This keeps card runtime concerns isolated and makes non-card app windows simpler.

### B5. Keep module state keys stable

State key collisions are rejected in `createAppRegistry` and `createLauncherStore` paths.

Use a clear convention:

1. `app_<app_name>` for launcher slice state,
2. separate domain slice names for shared reducers.

### B6. Register module in launcher list and verify order

In `modules.tsx`, ordering influences icon sorting behavior.

If desktop ordering matters, set `manifest.desktop.order` and verify icon layout.

## Appendix C: VM authoring playbook with practical constraints

### C1. Think of bundle code as a tiny deterministic runtime

Inside VM bundle code:

1. avoid external side effects,
2. keep helper functions pure where possible,
3. minimize dynamic behavior that makes debugging difficult.

### C2. Distinguish state scopes intentionally

Use the right dispatch scope for each mutation:

1. `card` scope: UI-local ephemeral state for one card.
2. `session` scope: stack session state across cards.
3. `domain` scope: app business action meant for reducers/effects.
4. `system` scope: shell commands (navigation, notifications, close).

Common anti-pattern:

1. using `session` scope for domain business data that should live in Redux domain state.

### C3. Use deterministic payload shapes

`dispatchDomainAction('inventory', 'saveItem', payload)` should always send a predictable payload shape.

Why:

1. reducers/effects become simpler,
2. logs are easier to inspect,
3. schema/reflection can be documented,
4. compatibility checks become possible.

### C4. Treat handler names as API surface

A handler named `submit` or `save` becomes part of UI event contract.

Stabilize handler naming and document handler args in comments or companion docs.

### C5. Runtime card injection safety

Runtime card injection is powerful but easy to misuse.

Guidelines:

1. only register runtime cards from trusted sources,
2. log failed injection attempts with session/card context,
3. include runtime card id uniqueness strategy,
4. provide cleanup/unregister path if cards are ephemeral.

## Appendix D: Endpoint and payload examples

These examples are conceptual and based on observed handlers.

### D1. Apps manifest

```json
{
  "apps": [
    {
      "app_id": "inventory",
      "name": "Inventory",
      "required": true,
      "capabilities": ["chat", "ws", "timeline", "profiles", "confirm"],
      "healthy": true,
      "reflection": {
        "available": true,
        "url": "/api/os/apps/inventory/reflection",
        "version": "v1"
      }
    }
  ]
}
```

### D2. Reflection shape (truncated)

```json
{
  "app_id": "arc-agi",
  "name": "ARC-AGI",
  "capabilities": [
    { "id": "games", "stability": "beta" },
    { "id": "reflection", "stability": "stable" }
  ],
  "apis": [
    { "id": "games-list", "method": "GET", "path": "/api/apps/arc-agi/games" }
  ],
  "schemas": [
    { "id": "arc.games.list.response.v1", "format": "json-schema" }
  ]
}
```

### D3. VM domain intent envelope (effective action)

Conceptually routed action produced by `dispatchDomainAction('inventory', 'saveItem', {...})`:

```json
{
  "type": "inventory/saveItem",
  "payload": {
    "sku": "SKU-123",
    "edits": { "qty": 7 }
  },
  "meta": {
    "source": "plugin-runtime",
    "sessionId": "runtime-session-1",
    "cardId": "itemDetail",
    "windowId": "window:inventory:..."
  }
}
```

## Appendix E: Troubleshooting runbook

### E1. App icon opens unknown module window

Symptoms:

1. shell renders “Unknown app module”.

Checks:

1. app module included in `launcherModules`.
2. manifest id uniqueness.
3. `appKey` format `<appId>:<instanceId>`.

### E2. 404 on backend route

Symptoms:

1. frontend requests `/api/apps/my-app/...` and receives 404.

Checks:

1. module registered in launcher backend module list.
2. `MountRoutes` includes target subpath.
3. no legacy alias expectation (`/chat` etc).

### E3. VM handler executes but no state changes

Symptoms:

1. no visible UI updates.

Checks:

1. verify handler actually emits intent.
2. verify intent scope is correct.
3. verify domain action type matches reducer/effect contract.
4. verify capability policy allows domain/system intent.

### E4. Runtime card not injected

Symptoms:

1. artifact shows card metadata but card does not render.

Checks:

1. `runtimeCardId/runtimeCardCode` extraction succeeded.
2. `registerRuntimeCard` called in projection middleware.
3. session host is ready and injection attempted.
4. runtime code compiles in QuickJS.

### E5. Embedded launcher serves stale frontend

Symptoms:

1. binary serves old UI.

Checks:

1. rebuilt `apps/os-launcher/dist`.
2. ran `launcher-ui-sync.sh`.
3. rebuilt launcher binary after sync.

## Appendix F: Suggested template skeletons for a new app

### F1. Backend module skeleton file list

1. `pkg/backendmodule/module.go`
2. `pkg/backendmodule/routes.go`
3. `pkg/backendmodule/contracts.go`
4. `pkg/backendmodule/reflection.go`
5. `pkg/backendmodule/module_test.go`

### F2. Frontend module skeleton file list

1. `apps/<app>/src/launcher/module.tsx`
2. `apps/<app>/src/launcher/render<App>.tsx`
3. `apps/<app>/src/domain/stack.ts`
4. `apps/<app>/src/domain/pluginBundle.vm.js` (if VM)
5. `apps/<app>/src/features/<domain>/<slice>.ts`
6. `apps/<app>/src/reducers.ts`

### F3. Composition touchpoints

1. `wesen-os/cmd/wesen-os-launcher/main.go` (backend registration)
2. `wesen-os/pkg/<app>/module.go` (adapter, if needed)
3. `wesen-os/apps/os-launcher/src/app/modules.tsx` (frontend registration)
4. `wesen-os/apps/os-launcher/src/app/store.ts` (shared reducers if needed)
5. `wesen-os/apps/os-launcher/vite.config.ts` (aliases/proxies if needed)

## Appendix G: Concept glossary

1. **App ID**: canonical backend/frontend identity key.
2. **App key**: runtime window key string `<appId>:<instanceId>`.
3. **Capability policy**: per runtime session domain/system allowlist.
4. **Runtime session**: VM execution context per card session id.
5. **Timeline entity**: normalized chat/runtime event representation.
6. **Artifact**: structured output object projected from timeline entities.
7. **Runtime card**: card definition injected dynamically into VM host.
8. **Launcher contribution**: menus/icons/commands/adapters a module adds to shell.
9. **Namespaced routes**: app routes mounted under `/api/apps/<app-id>`.
10. **Reflection**: machine-readable doc for app APIs/schemas/capabilities.
