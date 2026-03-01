---
Title: Glossary
Slug: glossary
Short: Definitions of key terms used across wesen-os documentation, including app identity, intent scopes, runtime concepts, and packaging terminology.
Topics:
- glossary
- terminology
- reference
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

This glossary defines terms used throughout the wesen-os documentation. Terms are listed alphabetically. Where a term has a natural relationship to another, the entry includes a cross-reference.

## App ID

A lowercase, hyphen-separated string that uniquely identifies a backend module and its corresponding frontend module. Examples: `inventory`, `gepa`, `arc-agi`. The app ID determines the URL namespace (`/api/apps/<app-id>/`), manifest discovery key, and frontend-to-backend linkage. Must pass the `ValidateAppID` regex in `backendhost/routes.go`.

**Critical rule:** The app ID must be identical across the backend `Manifest().AppID`, the frontend `manifest.id`, and all API path references. A mismatch causes silent routing failures.

See also: App Key, Manifest.

## App Key

A runtime string in the format `<appId>:<instanceId>` that identifies a specific window instance in the launcher shell. The app ID portion links to the module; the instance ID distinguishes multiple windows of the same app.

See also: App ID.

## AppBackendModule

The Go interface that every backend app module must implement. Defined in `go-go-os-backend/pkg/backendhost/module.go`. Methods: `Manifest()`, `MountRoutes(*http.ServeMux)`, `Init(context.Context)`, `Start(context.Context)`, `Stop(context.Context)`, `Health(context.Context)`.

See also: Manifest, Lifecycle Manager.

## Artifact

A structured output object extracted from timeline entities by the artifact projection middleware. Artifacts include hypercard widget metadata, runtime card definitions, and other structured payloads that the frontend uses to render interactive UI elements. When an artifact contains `runtimeCardId` and `runtimeCardCode` fields, the middleware registers it as a runtime card.

See also: Runtime Card, Timeline Entity.

## Bridge Pattern

An architecture pattern where domain intents from VM card handlers are intercepted by Redux middleware, which makes asynchronous API calls and dispatches result actions back into the store. Used when domain actions require external I/O. The ARC-AGI app uses this pattern; the inventory app uses the simpler direct-reducer pattern.

See also: Domain Scope, Intent.

## Capability Policy

A per-runtime-session allowlist that determines which domain and system intents a VM card handler is authorized to dispatch. Domain intents targeting domains not in the policy are silently rejected. System commands not in the policy are also rejected. The policy is configured when the runtime session is created.

See also: Intent, Domain Scope, System Scope.

## Card Scope

The most local intent scope. Card state is ephemeral and resets when the card unmounts. Use for form values, toggle states, loading indicators, and other UI-local concerns.

See also: Intent, Session Scope.

## Contribution

A menu item, command handler, context action, or window adapter that a frontend launcher module adds to the shell. Contributions are collected from all registered modules by `buildLauncherContributions` and merged into the shell's command palette, menus, and context menus.

See also: LaunchableAppModule.

## Domain Scope

An intent scope that bridges VM card handlers to the application's Redux store. When a handler calls `dispatchDomainAction(domain, actionType, payload)`, the intent is authorized against the capability policy and then dispatched as a Redux action with type `<domain>/<actionType>`.

See also: Intent, Capability Policy, Bridge Pattern.

## Host Context

The object provided by the launcher shell to each app module's render function. Includes `dispatch`, `getState`, `openWindow`, `closeWindow`, `resolveApiBase(appId)`, and `resolveWsBase(appId)`. This is the bridge between the desktop shell and app-specific windows.

See also: LaunchableAppModule.

## HyperCard

The interactive card system used by wesen-os. HyperCard cards are defined in JavaScript, run inside a QuickJS sandbox, and communicate with the host application through runtime intents. The name references the classic Apple HyperCard concept of stackable, scriptable cards.

See also: Runtime Card, Stack, VM.

## Intent

A structured message emitted by a VM card handler to communicate with the host application. Intents have four scopes: card, session, domain, and system. The runtime processes intents through `dispatchRuntimeIntent`, which routes them to the appropriate state slice, reducer, or shell action.

See also: Card Scope, Session Scope, Domain Scope, System Scope.

## LaunchableAppModule

The TypeScript interface that every frontend app module must implement. Defined in `go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts`. Provides: `manifest`, optional `state` (key + reducer), `buildLaunchWindow`, optional `createContributions`, and `renderWindow`.

See also: Manifest, Contribution, Host Context.

## Lifecycle Manager

The Go component in `backendhost` that orchestrates ordered `Init` and `Start` calls across all registered backend modules, performs health checks for required apps, and handles rollback via `Stop` in reverse order if any startup step fails.

See also: AppBackendModule.

## Manifest

The identity and capability declaration for a backend or frontend module. Backend manifests include `AppID`, `Name`, `Description`, `Required`, and `Capabilities`. Frontend manifests include `id`, `name`, `icon`, and `launch` configuration. The `/api/os/apps` endpoint exposes backend manifests for frontend discovery.

See also: App ID, Reflection.

## Module Registry

The Go component in `backendhost` that validates and stores registered backend modules. Enforces app ID uniqueness and format validation. Created by `NewModuleRegistry(modules...)`.

See also: AppBackendModule, Lifecycle Manager.

## Namespaced Routes

The routing convention where all backend app HTTP handlers are mounted under `/api/apps/<app-id>/`. The `MountNamespacedRoutes` function in backendhost prepends this prefix to each module's routes. Modules must register routes without the prefix.

See also: App ID.

## QuickJS

The JavaScript engine used to run VM card handler code in a sandboxed environment. Provided by the `QuickJSCardRuntimeService` in the hypercard-runtime package. Card code runs in an isolated context with no access to the DOM, network, or filesystem.

See also: VM, HyperCard.

## Reflection

Machine-readable API documentation exposed by backend modules that implement `ReflectiveAppBackendModule`. Accessible at `/api/os/apps/<app-id>/reflection`. Includes endpoint catalogs, schema references, and capability stability annotations.

See also: Manifest.

## Runtime Card

A card definition injected dynamically into the VM host at runtime, as opposed to cards defined statically in a stack bundle. Runtime cards are registered when the artifact projection middleware extracts `runtimeCardId` and `runtimeCardCode` from timeline entities. The session host picks up pending cards via `injectPendingCardsWithReport`.

See also: Artifact, Stack.

## Runtime Session

A VM execution context scoped to one card session ID. Each session has its own QuickJS context, loaded bundle code, card definitions, state, and capability policy. Sessions are managed by `PluginCardSessionHost`.

See also: QuickJS, Capability Policy.

## SEM (Structured Event Mapping)

The backend mechanism for constructing typed timeline events. Inventory registers hypercard SEM mappings (e.g., `hypercard.card.v2`, `hypercard.widget.v1`) that produce structured event envelopes. These events flow through WebSocket to the frontend, where the timeline mapper normalizes them into timeline entities.

See also: Timeline Entity, Artifact.

## Session Scope

An intent scope for state shared across all cards in a stack session. Session state survives card navigation within the same session but is lost when the session ends. Use for multi-step wizard state or accumulated selections.

See also: Intent, Card Scope.

## Stack

A collection of card definitions bundled together with shared state, selectors, and handlers. Defined via `defineStackBundle(factory)` in VM code. A stack is loaded into a runtime session where its cards can be rendered and interacted with.

See also: HyperCard, Runtime Session.

## System Scope

An intent scope for shell-level commands that affect the launcher environment. System commands include `navigate` (open a window or card), `notify` (show a toast), and `close` (close the current window). System intents are capability-gated.

See also: Intent, Capability Policy.

## Timeline Entity

A normalized event representation used by the frontend chat and hypercard runtime. Backend events arrive as SEM-typed WebSocket messages, are normalized by the timeline mapper, and become timeline entities that can be rendered, projected into artifacts, or recorded for replay.

See also: SEM, Artifact.

## VM (Virtual Machine)

In the wesen-os context, refers to the QuickJS JavaScript execution environment where HyperCard card handlers run. VM code is sandboxed and communicates with the host exclusively through runtime intents (dispatch functions). The term distinguishes card handler code from regular frontend React/TypeScript code.

See also: QuickJS, Intent, HyperCard.

## See Also

- `architecture-overview` — System topology using these terms in context
- `intent-routing-reference` — Detailed semantics for intent scopes and dispatch
- `api-reference` — Endpoint catalog referenced by manifest and reflection terms
