---
Title: Intern guide to app-scoped chat/profile surfaces and inventory built-in profiles
Ticket: APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES
Status: active
Topics:
    - architecture
    - wesen-os
    - pinocchio
    - profiles
    - frontend
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../geppetto/pkg/engineprofiles/source_chain.go
      Note: Defines chained-registry source precedence and implicit profile resolution behavior
    - Path: ../../../../../../../go-go-os-chat/pkg/chatservice/component.go
      Note: Shows that the generic profile API handler is mounted against the injected registry
    - Path: ../../../../../../../go-go-os-chat/pkg/profilechat/request_resolver.go
      Note: Shared chat resolver path that consumes selected profile and registry
    - Path: ../../../../../../../pinocchio/pkg/inference/runtime/profile_runtime.go
      Note: Pinocchio-owned runtime extension contract for prompt/middlewares/tools
    - Path: ../../../../../../../pinocchio/pkg/webchat/http/profile_api.go
      Note: Generic registry-centric profile list/get handler used by app chat services
    - Path: ../../../../../../../wesen-os/apps/os-launcher/src/app/assistantModule.tsx
      Note: Assistant frontend explicitly opts out of profile selection
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/app_profile_surface.go
      Note: Implements the new app-scoped registry surface and visibility enforcement
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/main.go
      Note: Launcher mounts per-app routes and injects shared profile registry into multiple app modules
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go
      Note: Launcher builds the single shared chained registry from Pinocchio profile settings
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml
      Note: Inventory and analyst profiles currently exist as test fixture data
    - Path: ../../../../../../../wesen-os/pkg/assistantbackendmodule/builtin_profiles.go
      Note: Loads the assistant built-in registry shipped with the assistant app surface
    - Path: ../../../../../../../wesen-os/pkg/assistantbackendmodule/module.go
      Note: Assistant backend also mounts profile APIs against the shared registry today
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Inventory frontend explicitly opts into selectable profile policy
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go
      Note: Inventory backend mounts profile APIs against the shared registry today
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-app-inventory/pkg/backendmodule/builtin_profiles.go
      Note: Loads the inventory built-in registry shipped with the inventory app surface
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts
      Note: Frontend sends profile and registry directly to the namespaced /chat endpoint
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.ts
      Note: Selector currently fetches an unfiltered profile list from the app basePrefix
ExternalSources: []
Summary: Detailed intern-facing analysis and implementation guide for making chat/profile endpoints app-scoped and ensuring inventory built-in profiles exist as real runtime data.
LastUpdated: 2026-03-23T14:25:00-04:00
WhatFor: Explain to a new engineer how the current chat/profile stack works, why inventory profiles are missing at runtime, and how to redesign the profile surface so each app owns its visible/selectable profiles and guaranteed built-in registry data.
WhenToUse: Use when implementing app-scoped profile APIs, deciding how inventory built-in profiles should be loaded, or separating inventory/assistant/raw-chat profile visibility.
---



# Intern guide to app-scoped chat/profile surfaces and inventory built-in profiles

## Executive Summary

The current `wesen-os` chat architecture already has one important separation in place: each chat-capable backend module is mounted under its own app namespace such as `/api/apps/inventory/...` or `/api/apps/assistant/...`. However, the profile surface under those endpoints is still effectively global. Inventory and assistant each expose their own `/chat` and `/api/chat/profiles` routes, but both are backed by the same shared registry chain injected by the launcher. That means the route namespace is app-specific while the visible profile list and implicit profile resolution rules are still shared.

This is why the current behavior feels wrong. The inventory chat frontend is intentionally selectable and shows a profile selector, but the list it receives is not an inventory-owned profile catalog. It is whatever happens to be in the shared registry chain for the current launcher process. At the same time, the inventory-specific profiles that users expect to always exist (`default`, `inventory`, `analyst`, and likely `assistant`) are not guaranteed runtime data. They only exist today in the checked-in launcher test fixture under `cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`.

The proposed solution is not to invent a second legacy profile abstraction. The correct direction is to keep using Pinocchio and Geppetto engine profiles, but to make the profile surface app-scoped:

- each app keeps its own namespaced chat endpoints,
- each app gets its own registry surface,
- each app defines its own visible/selectable profile set,
- each app ships guaranteed built-in profiles as real registry data,
- each app’s `/chat` resolver and `/api/chat/profiles` list must agree about what is valid and visible,
- the launcher-level generic Pinocchio registry remains available as a lower-precedence fallback pool rather than the indiscriminate app-facing surface.

## Problem Statement

The specific user-visible symptom is simple: the inventory chat profile selector does not reliably show the inventory-oriented profiles the product expects, such as `inventory` and `analyst`. The deeper architectural problem is that the system currently combines three different concerns in a confusing way:

1. route ownership is already per-app,
2. runtime policy is now profile-extension based,
3. profile visibility is still shared across apps.

That produces the following mismatch:

```text
inventory app endpoint
  -> inventory frontend expects inventory-facing profile choices
  -> inventory backend exposes a generic shared profile registry list
  -> inventory-specific built-in profiles are not guaranteed to exist at runtime
```

The result is operationally fragile and conceptually unclear:

- operators cannot assume the inventory chat will always have the expected inventory profiles,
- frontend behavior depends on whatever shared registry sources the launcher happens to load,
- adding future chat apps like raw chat or chat-with-documents would repeat the same leak,
- `/chat` and `/api/chat/profiles` are namespaced by URL but not truly scoped by app behavior.

For a new intern, the key lesson is:

> The current bug is not mainly a frontend selector bug. It is an ownership bug. The profile list shown by an app endpoint must be owned by that app, not by a globally shared registry view.

## The System You Need To Understand First

### 1. Route Namespacing Is Already Per-App

`wesen-os` mounts each backend module under `/api/apps/<app-id>/...` in the launcher. That happens in the module loop inside `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go`.

High-level route shape:

```text
/api/apps/inventory/chat
/api/apps/inventory/ws
/api/apps/inventory/api/chat/profiles

/api/apps/assistant/chat
/api/apps/assistant/ws
/api/apps/assistant/api/chat/profiles
```

Important files:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go`

### 2. The Shared Registry Is Built Once in the Launcher

The launcher resolves `profile-settings.profile-registries` and constructs one `geppetto/pkg/engineprofiles.ChainedRegistry`. That happens in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`.

The important architectural point is that this bootstrap currently produces one shared registry object:

```text
launcher bootstrap
  -> ResolveBaseInferenceSettings(...)
  -> ResolveCLIProfileSelection(...)
  -> ParseRegistrySourceSpecs(...)
  -> NewChainedRegistryFromSourceSpecs(...)
  -> shared registry passed into inventory
  -> same shared registry passed into assistant
```

This is why app route namespacing and profile ownership are currently out of sync.

### 3. The Frontend Already Has an App/Surface-Level Profile Policy Concept

The frontend chat-runtime package already distinguishes three modes:

- `kind: 'none'`
- `kind: 'fixed'`
- `kind: 'selectable'`

That type lives in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileTypes.ts`.

This is important because the frontend is already telling us the intended product shape:

- inventory chat is profile-selectable,
- assistant chat currently is not profile-selectable,
- future chat surfaces can choose their own mode.

Concrete examples:

- inventory uses `profilePolicy={{ kind: 'selectable', scopeKey: \`conv:${convId}\` }}` in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx`
- assistant uses `profilePolicy={{ kind: 'none' }}` in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx`

### 4. The Selector Lists What `/api/chat/profiles` Returns

The selector is not inventing its own view. It asks the backend for `/api/chat/profiles` and renders the returned items. The fetching hook currently calls `listProfiles(undefined, { basePrefix })`, which means “list all profiles visible through this endpoint, with no explicit registry filter.”

Important files:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.ts`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatProfileSelector.tsx`

### 5. `/chat` and `/api/chat/profiles` Share the Same Registry Today

This is the core bug. Inventory and assistant each mount their own chat and profile routes, but both routes are wired against the same launcher-built registry object:

- inventory receives `ProfileRegistry: launcherBootstrap.ProfileRegistry`
- assistant receives `ProfileRegistry: launcherBootstrap.ProfileRegistry`

So the system is:

```text
per-app route namespace
  + shared profile registry
  + shared generic profile list handler
  + app-specific default profile fallback
```

That is not enough. Default profile fallback is not the same thing as app ownership of the visible profile set.

## Current-State Evidence

### The Inventory Profiles Only Exist in Test Data Today

The expected inventory-oriented profiles are visible in:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`

That file contains:

- `default`
- `inventory`
- `analyst`
- `planner`
- `assistant`

But that file is test data, not runtime-owned shipped profile data. The runtime bootstrap loads from:

1. `--profile-registries`
2. `PINOCCHIO_PROFILE_REGISTRIES`
3. config `profile-settings.profile-registries`
4. `${XDG_CONFIG_HOME:-~/.config}/pinocchio/profiles.yaml`

So if the live registry sources do not include `inventory` and `analyst`, those profiles will not appear in the inventory selector.

### The Profile API Is Registry-Centric, Not App-Centric

Pinocchio’s shared profile API handler lists engine profiles directly from the injected registry:

- it calls `ListRegistries(...)`
- then `ListEngineProfiles(...)`
- then returns the union of those results

This is the right generic handler for a generic webchat surface, but it is not sufficient for an app-owned profile experience unless the app’s injected registry is already filtered/scoped the right way.

### The Request Path Already Carries Profile Selection Cleanly

The frontend sends:

```json
{
  "prompt": "...",
  "conv_id": "...",
  "profile": "analyst",
  "registry": "default"
}
```

Then the shared resolver:

1. parses `profile` and `registry`,
2. resolves the engine profile,
3. merges inference settings,
4. decodes `pinocchio.webchat_runtime@v1`,
5. builds the runtime used by the composer.

That means the selection wire protocol is already good enough. The missing piece is not how selection is transmitted. The missing piece is what each app endpoint is allowed to expose and resolve.

## Why The Current Behavior Feels Wrong

The product intuition is:

- inventory chat should always have inventory-facing profiles,
- assistant chat should not accidentally inherit inventory/operator profiles,
- other future chat apps should own their own profile sets.

The current code only partially models that:

- inventory has a selectable frontend surface,
- assistant has a non-selectable frontend surface,
- but both backends still inherit the same raw registry chain.

In other words:

```text
frontend: app-aware
routes:   app-aware
profiles: not app-aware enough
```

## Proposed Solution

The recommended design is:

1. keep the existing namespaced endpoints,
2. stop treating the shared launcher registry as the final app-facing profile surface,
3. build a separate registry chain or registry surface per app,
4. keep the shared launcher registry only as the generic fallback layer under those app surfaces,
5. make the profile list and chat resolver use the same app-owned visibility rules,
6. ship real built-in inventory and assistant profiles as runtime data rather than test fixtures.

### Design Principle

Each app that exposes chat should own four things together:

- its route namespace,
- its visible/selectable profiles,
- its built-in runtime profile data,
- its profile-selection validation rules.

This is the core conceptual change:

```text
old
  one shared registry -> many app endpoints

new
  inventory endpoint -> inventory-owned registry surface
  assistant endpoint -> assistant-owned registry surface
  raw-chat endpoint  -> raw-chat-owned registry surface
```

### Important Clarification

This design does **not** require a return to the old mixed profile model.

We should still use:

- Geppetto engine profiles for inference settings,
- Pinocchio runtime extensions for prompt/middleware/tool policy.

What changes is ownership of the app-facing surface, not the underlying engine-profile model.

## Proposed Runtime Model

### Inventory

Inventory should own a guaranteed base profile set:

- `default`
- `inventory`
- `analyst`
- `assistant`

Those should be real shipped runtime profiles, for example in an embedded YAML file under the inventory package or another app-owned runtime-data directory.

Those built-ins should sit above the shared launcher registry in the inventory app surface. The inventory-visible selector list should come from the inventory app registry surface, not from the raw launcher registry.

### Assistant

Assistant should own its own profile surface. At minimum:

- ship its own assistant built-in profile registry,
- keep `profilePolicy.kind = 'none'` in the frontend if there is no selector,
- do not expose a broad shared profile list just because the backend currently can.

If assistant later gains selectable profiles, they should be assistant-owned profiles, not whatever the global registry happens to contain.

### Future Chat Apps

Examples:

- raw chat,
- chat with documents,
- subject-specific copilots.

Each should get its own profile surface policy rather than inheriting the inventory view or the generic global registry list.

## Proposed Data Flow

### Current

```text
operator profile sources
        |
        v
launcher shared chained registry
        |
        +--> inventory /chat
        +--> inventory /api/chat/profiles
        +--> assistant /chat
        +--> assistant /api/chat/profiles
```

### Proposed

```text
shared launcher registry --------------------+
                                             |
inventory built-in profiles -----------------+--> inventory app profile surface
                                                   -> /api/apps/inventory/chat
                                                   -> /api/apps/inventory/api/chat/profiles

shared launcher registry --------------------+
                                             |
assistant built-in profiles -----------------+--> assistant app profile surface
                                                   -> /api/apps/assistant/chat
                                                   -> /api/apps/assistant/api/chat/profiles

shared launcher registry --------------------+
                                             |
raw-chat built-in profiles ------------------+--> raw-chat app profile surface
```

## API Design

### Keep the Existing URI Pattern

Do **not** introduce a new top-level route scheme. The current namespaced model is already correct:

- `/api/apps/inventory/chat`
- `/api/apps/inventory/api/chat/profiles`
- `/api/apps/assistant/chat`
- `/api/apps/assistant/api/chat/profiles`

The change should be behind those endpoints, not in the public URI pattern.

### Backend Contract Per App

Each chat app should define an app-owned profile surface configuration. In pseudocode:

```go
type AppProfileSurface struct {
    AppID                  string
    VisibleRegistrySlug    string
    DefaultProfileSlug     string
    VisibleProfileSlugs    []string
    BuiltinRegistry        *EngineProfileRegistry
    GenericFallback        Registry
}
```

Semantics:

- `BuiltinRegistry`
  - shipped with the app
  - guarantees that core app profiles exist
- `GenericFallback`
  - the shared launcher registry built from Pinocchio config / env / CLI
  - remains available for stack inheritance and generic profile references
- `VisibleProfileSlugs`
  - the app’s allowlist for selector and chat resolution
- `VisibleRegistrySlug`
  - the registry slug that the frontend sees for this app surface
- `DefaultProfileSlug`
  - what the app should use when the request omits `profile`

The real implementation may not use this exact struct name, but the ownership boundary should look like this.

### Request Validation Rule

The app’s `/chat` handler and `/api/chat/profiles` handler must agree. If a profile slug is not visible in the app’s list, the app should not accept it in `/chat`.

Pseudocode:

```go
func resolveInventoryRequest(req ChatRequest) error {
    if req.Profile != "" && !inventoryVisibleProfiles.Contains(req.Profile) {
        return badRequest("unknown or disallowed inventory profile")
    }
    return nil
}
```

Without this rule, the selector can lie or drift from the actual resolver behavior.

## Precedence Design

This is one of the most important design decisions.

The clarified target is not “one shared chain with a frontend filter.” The target is:

```text
inventory app surface
  = [inventory built-ins] + [shared launcher registry as generic fallback]

assistant app surface
  = [assistant built-ins] + [shared launcher registry as generic fallback]
```

The practical meaning is:

- app-built-in profiles are always present,
- the app surface default registry is app-owned,
- generic shared registries are still available underneath for stack composition and fallback references,
- the selector and `/chat` only expose profiles the app surface marks visible.

### Recommended Resolution Behavior

When the request omits `registry`, the app surface should resolve against its app-owned visible registry first.

When the request omits `profile`, the app surface should use its app-owned default profile slug.

When a visible app profile stacks onto a generic shared profile, that cross-registry lookup should still succeed through the underlying aggregate registry.

Pseudocode:

```go
inventorySurface := NewAppProfileSurface(
    visibleRegistry = inventoryBuiltins,
    fallbackRegistry = launcherBootstrap.ProfileRegistry,
    visibleProfiles = {"default", "inventory", "analyst", "assistant"},
    defaultProfile = "inventory",
)
```

### Recommendation

Prefer app-built-in profiles as the visible top layer and the shared launcher registry as the fallback pool below them.

Reason:

- it guarantees the inventory UX,
- it matches the user expectation that inventory-specific profiles are always available,
- it still lets app-owned profiles inherit from generic shared profiles without exposing the full generic surface to users.

## Detailed Implementation Plan

### Phase 1: Ship Real App-Owned Built-In Registries

Create embedded YAML-backed built-in registry documents for:

- inventory
- assistant

Requirements:

- inventory built-ins include `default`, `inventory`, `analyst`, `assistant`
- assistant built-ins include `assistant`
- built-ins live in app-owned packages, not launcher testdata
- built-ins decode through `DecodeEngineProfileYAMLSingleRegistry(...)`

### Phase 2: Build App-Specific Registry Surfaces

At launcher composition time:

1. keep building the shared launcher registry from Pinocchio config,
2. load each app’s built-in registry,
3. build an app-specific aggregate store that contains:
   - the app built-in visible registry,
   - the shared launcher registries for fallback resolution,
4. set the app surface default registry to the app’s built-in registry slug,
5. inject the app-specific surface into that app’s resolver and profile API.

Important:

- inventory and assistant must no longer share the same injected final registry object,
- the shared launcher registry remains a dependency of the app surfaces, not the surface itself.

### Phase 3: Enforce App-Owned Visibility Rules

For inventory:

- list only `default`, `inventory`, `analyst`, and `assistant`
- reject explicit requests for non-inventory-visible profile slugs
- reject explicit requests for foreign registries

For assistant:

- keep the frontend selector disabled,
- expose only assistant-owned profiles from the assistant profile API.

### Phase 4: Keep the Frontend Protocol Stable

The existing payload can stay:

```json
{ "profile": "analyst", "registry": "inventory" }
```

The only change is semantic:

- the selector gets back app-scoped profiles,
- `/chat` accepts only app-scoped selections.

### Phase 5: Add Integration and Package Tests

Required tests:

- inventory `/api/chat/profiles` lists exactly `default`, `inventory`, `analyst`, and `assistant`
- inventory `/chat` accepts `profile=analyst`
- inventory `/chat` rejects a foreign profile slug
- assistant `/api/chat/profiles` does not leak inventory profiles
- inventory default selection resolves to `inventory`
- assistant default selection resolves to `assistant`

## File-by-File Implementation Guide

### Launcher Composition

Files:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go`

Responsibilities:

- keep Pinocchio config/bootstrap ownership,
- build app-specific registry surfaces from that bootstrap,
- stop injecting one indiscriminate registry into every app.

### Shared Chat Backend Layer

Files:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/chatservice/component.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go`

Responsibilities:

- request resolver must validate app-visible profile selections,
- the profile API should operate against the injected app surface rather than the raw launcher registry.

### Inventory Backend

Files:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx`

Responsibilities:

- own inventory built-in registry data,
- own inventory-visible profiles,
- own inventory middleware definitions,
- keep frontend selector behavior aligned with backend visibility.

### Assistant Backend

Files:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx`

Responsibilities:

- own assistant built-in registry data,
- deliberately expose a small assistant-only profile surface,
- keep the frontend selector disabled until the product wants assistant profile switching.

### Frontend Shared Chat Runtime

Files:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.ts`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatProfileSelector.tsx`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts`

Responsibilities:

- no major protocol changes required if the backend is fixed,
- optionally add tests confirming that app-specific endpoints produce app-specific profile lists.

## Design Decisions

### Decision 1: Keep the Current URL Namespace Model

Rationale:

- it already matches the module system,
- it already works for frontend API resolution,
- the bug is in profile ownership, not URL structure.

### Decision 2: Do Not Reintroduce Legacy Mixed Profiles

Rationale:

- APP-30 already migrated the system away from that model,
- the right fix is app-scoped profile views on top of engine profiles, not a rollback.

### Decision 3: Inventory And Assistant Must Ship Real Runtime Profiles

Rationale:

- product expectations require those profiles to exist,
- testdata is not a runtime contract,
- operator config alone is not enough for a stable UX.

### Decision 4: `/chat` and `/api/chat/profiles` Must Share the Same Allowlist

Rationale:

- otherwise the selector can show invalid options,
- or the backend can accept invisible options,
- both are product bugs.

## Alternatives Considered

### Alternative 1: Frontend-Only Filtering

This would mean filtering the full shared profile list in `useProfiles.ts`.

Why reject it:

- cosmetic only,
- backend still exposes leaked profiles,
- `/chat` would still accept globally shared selections,
- future app surfaces would repeat the same mistake.

### Alternative 2: Keep One Global Profile Surface and Rely on Naming Conventions

Example:

- “inventory-* means inventory”
- “assistant-* means assistant”

Why reject it:

- fragile and implicit,
- still not true ownership,
- hard to validate and reason about.

### Alternative 3: Recreate a Second App-Profile Layer Separate from Engine Profiles

Why reject it for now:

- more moving parts,
- unnecessary for the immediate problem,
- the current wire path already supports profile selection cleanly through engine-profile slugs plus runtime extensions.

## Open Questions

- Should inventory later reintroduce `planner`, or keep the first cut to `default`, `inventory`, `analyst`, and `assistant`?
- Should app-specific profile visibility live in a dedicated registry implementation or be expressed as a launcher-owned aggregate store plus policy checks?
- Should future apps such as document chat get a dedicated built-in registry file per app package, or a common `pkg/appprofiles` home in `wesen-os`?

## References

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/engineprofiles/source_chain.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/chatservice/component.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/pkg/webchat/http/profile_api.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/pkg/inference/runtime/profile_runtime.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.ts`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts`
