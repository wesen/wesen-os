---
Title: Intern guide to migrating wesen-os to Pinocchio config and engine-profile registries
Ticket: APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP
Status: active
Topics:
    - architecture
    - wesen-os
    - pinocchio
    - geppetto
    - profiles
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: geppetto/pkg/doc/topics/01-profiles.md
      Note: Primary engine-profile contract and hard-cut architecture
    - Path: go-go-os-chat/pkg/profilechat/request_resolver.go
      Note: Shared OS-chat still uses legacy resolved runtime semantics
    - Path: pinocchio/cmd/web-chat/profile_policy.go
      Note: Reference request resolver and runtime split
    - Path: pinocchio/pkg/doc/topics/webchat-profile-registry.md
      Note: Canonical split between engine settings and app-owned runtime policy
    - Path: wesen-os/cmd/wesen-os-launcher/main.go
      Note: Current launcher wiring still on legacy mixed profiles
    - Path: wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts
      Note: Frontend still expects mutable profile CRUD endpoints
ExternalSources: []
Summary: Detailed intern-facing analysis and implementation guide for migrating wesen-os from legacy mixed profiles to Pinocchio bootstrap plus Geppetto engine-profile registries.
LastUpdated: 2026-03-22T16:51:32.711419417-04:00
WhatFor: Explain, justify, and sequence the migration that makes wesen-os consume Pinocchio config/profile sources and Geppetto engine-profile registries instead of the older mixed runtime profile system.
WhenToUse: Use when implementing or reviewing the APP-30 migration or when onboarding a new engineer to the current profile/bootstrap architecture across geppetto, pinocchio, wesen-os, go-go-os-chat, and the frontend.
---


# Intern guide to migrating wesen-os to Pinocchio config and engine-profile registries

## Executive Summary

`wesen-os` is still wired to an older profile model that mixes engine configuration and application runtime policy inside `geppetto/pkg/profiles`. The new Geppetto and Pinocchio architecture no longer works that way. Geppetto now resolves engine-only profiles from registry stacks, while Pinocchio owns config/bootstrap and the discovery of profile registries. Application runtime policy such as prompt text, middleware configuration, tool allowlists, runtime key construction, and runtime fingerprints belongs in the application layer.

That means the migration is not a one-line import change. The launcher entrypoint, shared OS-chat packages, inventory backend glue, and frontend profile API assumptions all need to be reviewed together. The current `wesen-os` launcher hardcodes in-memory mixed runtime profiles, and the frontend still has a mutable profile CRUD client. For the simplified migration chosen later in this ticket, that CRUD surface is intentionally removed rather than preserved.

The recommended migration plan is:

1. Move launcher bootstrap to Pinocchio-owned config/profile discovery.
2. Replace legacy mixed profile resolution with Geppetto `engineprofiles`.
3. Move runtime policy into app-owned extensions or explicit runtime composer inputs.
4. Hard-cut mutable profile CRUD and keep only read/select profile APIs.
5. Update tests and docs so the new contract is explicit.

## Problem Statement

The user asked for a new ticket to bring `wesen-os/` up to the new profiles and profile registry settings, and to make it load Pinocchio config and profile files instead of `wesen-os`-owned ones. The codebase is currently split across several repos in one workspace, so the problem appears in layers rather than one place.

Observed current state:

- `wesen-os/cmd/wesen-os-launcher/main.go` still imports `github.com/go-go-golems/geppetto/pkg/profiles` and builds in-memory profiles containing `Runtime` values with system prompt, middleware list, and tool list.
- `go-go-os-chat/pkg/profilechat/request_resolver.go` and `runtime_composer.go` also import the old `pkg/profiles` model and still reason in terms of `ResolvedProfile.EffectiveRuntime`, `RuntimeKey`, and `step_settings_patch`.
- `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts` still expects write APIs: create, patch, delete, and set-default.
- Pinocchio's current docs and implementation have already hard-cut to `pkg/engineprofiles`, `profile-settings.profile-registries`, and Pinocchio-owned bootstrap helpers.

The migration must therefore answer four separate questions:

1. Where do config files and environment variables come from?
2. Where do engine profiles come from?
3. Where does runtime policy come from?
4. Which reduced profile HTTP APIs remain supported after the cutover?

## Proposed Solution

Adopt Pinocchio's bootstrap/config/profile discovery for the launcher, but keep `wesen-os` as the owner of application runtime policy.

### Target ownership split

```text
Pinocchio bootstrap
  -> default config path
  -> explicit --config-file merge
  -> PINOCCHIO_* env resolution
  -> profile-settings.profile / profile-settings.profile-registries

Geppetto engineprofiles
  -> parse registry sources
  -> build chained registry
  -> resolve engine profile stack
  -> merge resolved inference_settings onto hidden base settings

wesen-os app layer
  -> inventory assistant prompt policy
  -> middleware definitions and instances
  -> tool allowlists
  -> runtime key / runtime fingerprint policy
  -> read/select profile API only
```

### Concrete migration target

- `wesen-os` should read base inference config the same way Pinocchio does.
- `wesen-os` should read engine profile registries from the same precedence stack Pinocchio documents.
- `wesen-os` should stop embedding mixed runtime profiles directly in `main.go`.
- Runtime policy should move into either:
  - app-owned runtime composer defaults, or
  - an engine-profile extension decoded by the app layer, like Pinocchio's `pinocchio.webchat_runtime@v1`.
- Shared request resolution should produce two outputs:
  - final `InferenceSettings`
  - app-owned runtime policy

### Required precedence rules

Pinocchio documents this precedence in `pinocchio/README.md` and `pinocchio/cmd/pinocchio/doc/general/05-js-runner-scripts.md`:

Profile registries:

1. `--profile-registries`
2. `PINOCCHIO_PROFILE_REGISTRIES`
3. `profile-settings.profile-registries` in config
4. `${XDG_CONFIG_HOME:-~/.config}/pinocchio/profiles.yaml` if present

Selected profile:

1. `--profile`
2. `PINOCCHIO_PROFILE`
3. `profile-settings.profile` in config
4. registry default profile

For this migration, those rules should become the source of truth for `wesen-os` profile bootstrap.

## Design Decisions

## Documents And Code I Found

These are the most important references and why they matter.

- `geppetto/README.md`
  - states that small CLIs should expose `profile` and `profile-registries` while keeping base settings app-owned.
- `geppetto/pkg/doc/topics/01-profiles.md`
  - the clearest statement of the hard cut: Geppetto profiles are engine-only.
- `geppetto/pkg/doc/topics/13-js-api-reference.md`
  - shows the same split in the JS API: `profiles.resolve(...)` returns engine settings; runtime is separate.
- `geppetto/pkg/sections/profile_sections.go`
  - shows the `profile-settings` section shape and the Pinocchio default profiles path helper.
- `geppetto/pkg/cli/bootstrap/config.go`
  - defines the app bootstrap contract (`AppBootstrapConfig`).
- `geppetto/pkg/cli/bootstrap/profile_selection.go`
  - defines the merged config/env/default resolution path for `profile-settings`.
- `geppetto/pkg/cli/bootstrap/engine_settings.go`
  - defines how hidden base settings and resolved engine profiles are merged.
- `pinocchio/README.md`
  - documents the intended operator-facing config/profile flow.
- `pinocchio/examples/js/README.md`
  - useful concise explanation of why Pinocchio bootstrap differs from raw Geppetto JS.
- `pinocchio/pkg/doc/topics/webchat-profile-registry.md`
  - the best current description of the split between engine profiles and app-owned runtime policy in a webchat app.
- `pinocchio/pkg/inference/runtime/profile_runtime.go`
  - defines the app-owned runtime extension shape.
- `pinocchio/pkg/webchat/http/profile_api.go`
  - defines the shared read/list/get/current-profile API surface.
- `pinocchio/cmd/web-chat/main.go`
  - canonical example of engine-profile registry bootstrap in a running app.
- `pinocchio/cmd/web-chat/profile_policy.go`
  - canonical example of separating resolved engine settings from app-owned runtime policy.
- `wesen-os/cmd/wesen-os-launcher/main.go`
  - current legacy launcher wiring and the main migration target.
- `go-go-os-chat/pkg/profilechat/request_resolver.go`
  - current old mixed runtime request resolver.
- `go-go-os-chat/pkg/profilechat/runtime_composer.go`
  - current old mixed runtime composer with `step_settings_patch`.
- `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
  - shows current profile API and chat-service integration.
- `go-go-os-chat/pkg/chatservice/component.go`
  - shows another stale dependency on the old profile/write API shape.
- `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
  - proves the frontend currently expects mutable profile APIs, which will need to be hard-cut.
- `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`
  - proves end-to-end launcher tests currently expect create/update/delete/default profile operations, which must be removed or rewritten.
- `wesen-os/ttmp/2026/02/27/GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML--wesen-os-startup-fails-due-implicit-legacy-profiles-yaml-fallback`
  - prior evidence around the old fallback problem and why the config/profile namespace matters.

## Current-State Architecture

### 1. Geppetto's current contract

Geppetto is already in the right place conceptually.

Observed in `geppetto/pkg/doc/topics/01-profiles.md`:

- engine profiles answer only: "what `InferenceSettings` build the engine?"
- they do not answer:
  - system prompt
  - middleware selection
  - tool policy
  - runtime key/fingerprint

Observed in `geppetto/pkg/cli/bootstrap/engine_settings.go`:

- hidden base inference settings come from app config/env/defaults,
- resolved engine-profile settings are merged on top,
- if no registry sources exist, the app can still run on base settings alone.

This is the contract `wesen-os` should adopt.

### 2. Pinocchio's current contract

Pinocchio builds on that Geppetto split.

Observed in `pinocchio/pkg/cmds/profilebootstrap/profile_selection.go`:

- Pinocchio creates an `AppBootstrapConfig` with:
  - `AppName: "pinocchio"`
  - `EnvPrefix: "PINOCCHIO"`
  - config mapping logic
  - Geppetto base/profile sections

Observed in `pinocchio/cmd/web-chat/main.go` and `profile_policy.go`:

- the app resolves profile selection separately,
- builds a registry chain from `profile-settings.profile-registries`,
- resolves the selected engine profile,
- merges `resolved.InferenceSettings` with hidden base settings,
- decodes runtime policy separately from engine-profile extensions,
- converts the local plan to the shared webchat transport once.

This is the reference implementation to mirror.

### 3. Current `wesen-os` launcher contract

Observed in `wesen-os/cmd/wesen-os-launcher/main.go`:

- `CreateGeppettoSections()` is included in the command description, so profile-related flags exist,
- but those profile settings are not resolved through Pinocchio bootstrap helpers,
- the launcher hardcodes multiple in-memory mixed profiles such as `default`, `inventory`, `analyst`, `planner`, and `assistant`,
- each profile contains runtime behavior directly:
  - system prompt
  - middlewares
  - tools
- request resolvers are created by `pinoweb.NewStrictRequestResolver(...).WithProfileRegistry(...)` and `profilechat.NewStrictRequestResolver(...).WithProfileRegistry(...)`.

The important consequence is that the launcher is still assuming:

```text
profile = engine settings + runtime behavior
```

That is the old model.

### 4. Current shared OS-chat contract

Observed in `go-go-os-chat/pkg/profilechat/request_resolver.go`:

- the resolver imports `geppetto/pkg/profiles`,
- resolves `ResolvedProfile.EffectiveRuntime`,
- stamps `RuntimeKey`,
- supports `RequestOverrides`,
- still lives in the old mixed runtime domain.

Observed in `go-go-os-chat/pkg/profilechat/runtime_composer.go`:

- the composer builds step settings directly from parsed values,
- applies `profileRuntime.StepSettingsPatch`,
- uses old `RuntimeSpec` middleware/tool/system prompt fields.

This package needs migration, not just the launcher.

### 5. Current frontend contract

Observed in `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`:

- frontend code calls:
  - `listProfiles`
  - `getProfile`
  - `createProfile`
  - `updateProfile`
  - `deleteProfile`
  - `setDefaultProfile`

Observed in `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`:

- integration tests create a profile,
- patch it,
- mark another as default,
- delete it.

That means the migration cannot silently switch to Pinocchio's read-only shared profile API and call the job done. The CRUD surface must be intentionally deleted from frontend, tests, and backend wrappers.

## Gap Analysis

| Area | Current wesen-os | Target model | Gap |
|---|---|---|---|
| Config namespace | app launcher wiring, not explicitly Pinocchio bootstrap | Pinocchio config + env precedence | launcher must call Pinocchio bootstrap helpers |
| Profile type | `geppetto/pkg/profiles` mixed runtime | `geppetto/pkg/engineprofiles` | broad import/type migration |
| Runtime ownership | stored inside profiles | app-owned runtime policy / extensions | move prompt/tools/middleware data out of legacy runtime type |
| Request resolution | returns mixed runtime result | resolve engine settings and runtime policy separately | new resolver shape required |
| Runtime composer | old `step_settings_patch` model | compose from resolved inference settings + app runtime policy | composer rewrite or replacement required |
| Profile HTTP surface | mutable CRUD assumed by frontend/tests | Pinocchio shared handlers are read/list/get/current-profile | frontend/tests/backend wrappers must be hard-cut to read-only/select-only |
| Default files | legacy/fallback confusion | intentionally use Pinocchio config/profiles paths | use Pinocchio bootstrap, not ad hoc launcher defaults |

## Proposed Architecture

### Decision 1: Pinocchio bootstrap should own config/profile discovery

Recommendation:

- Keep launcher flags such as `--addr`, `--root`, DB settings, ARC settings in `wesen-os`.
- Resolve hidden AI base settings and `profile-settings.*` through Pinocchio bootstrap helpers.

Why:

- the user explicitly asked for Pinocchio config/profile files,
- Pinocchio already codifies the correct precedence rules,
- it prevents `wesen-os` from reinventing a second config namespace for AI/profile concerns.

### Decision 2: Engine settings and runtime policy must split cleanly

Recommendation:

- use `geppetto/pkg/engineprofiles` for all profile selection and inference settings,
- keep runtime policy in app-owned structures.

Preferred runtime policy shape:

```yaml
extensions:
  pinocchio.webchat_runtime@v1:
    system_prompt: You are an inventory assistant.
    middlewares:
      - name: inventory_artifact_policy
        id: artifact-policy
      - name: inventory_suggestions_policy
        id: suggestions-policy
    tools:
      - inventory.lookup_item
      - inventory.list_low_stock
```

For `wesen-os`, this extension can live in the Pinocchio profile files the user asked us to load, because the engine profile document may carry app-owned extensions even though engine settings remain the core profile data.

### Decision 3: Hard-cut mutable profile CRUD and simplify the profile surface

This decision was made after the initial research pass.

Facts:

- shared Pinocchio profile handlers already support the simplified surface we want:
  - list profiles
  - get profile
  - read/write current-profile cookie
  - list middleware and extension schemas
- preserving CRUD would require extra store mutation work that is not necessary for the simplified migration,
- the user explicitly chose to keep the migration simple and kill profile CRUD for now.

Implementation consequence:

- remove `createProfile`, `updateProfile`, `deleteProfile`, and `setDefaultProfile` usage from the frontend and any related tests,
- remove backend assumptions that write actor/source are needed for profile API mutation flows,
- treat engine profile files as configuration inputs, not mutable runtime data.

This dramatically reduces migration scope and keeps the cutover aligned with current Pinocchio shared handlers.

### Decision 4: The shared OS-chat package should follow Pinocchio's resolver/composer shape

Recommendation:

- stop modeling conversation resolution as `ResolvedProfile.EffectiveRuntime`,
- replace it with a local plan that contains:
  - resolved engine settings
  - runtime policy
  - runtime identity/fingerprint

Suggested local shape:

```go
type ResolvedOSConversationPlan struct {
    ConvID         string
    Prompt         string
    IdempotencyKey string
    Runtime        *ResolvedOSRuntime
}

type ResolvedOSRuntime struct {
    RuntimeKey         string
    RuntimeFingerprint string
    ProfileVersion     uint64

    InferenceSettings *aisettings.InferenceSettings
    SystemPrompt      string
    Middlewares       []infruntime.MiddlewareUse
    ToolNames         []string
    ProfileMetadata   map[string]any
}
```

This should mirror the pattern in `pinocchio/cmd/web-chat/profile_policy.go`.

## Alternatives Considered

### Alternative A: keep `wesen-os` on the old mixed profile package and only change default file paths

Rejected.

Why:

- it would preserve the wrong model,
- it would continue coupling engine settings and runtime policy,
- it would diverge from current Geppetto and Pinocchio docs.

### Alternative B: switch only the launcher, keep `go-go-os-chat` untouched

Rejected.

Why:

- the launcher delegates its core request-resolution and runtime-composition behavior into `go-go-os-chat`,
- the old semantics would remain downstream.

### Alternative C: hard-cut mutable profiles immediately and adopt only Pinocchio shared read APIs

Selected.

Why:

- it is the simplest migration path,
- it matches the shared Pinocchio handler surface,
- it avoids unnecessary engine-profile mutation infrastructure while the main goal is bootstrap and registry alignment.

### Alternative D: create a new `wesen-os`-specific config namespace for AI/profile settings

Rejected.

Why:

- the request explicitly says to load Pinocchio config/profile files,
- duplicate namespaces create operator confusion.

## Implementation Plan

## Implementation Phases

### Phase 0: Freeze the simplified target contract in docs and tests

The target contract for this migration is:

- Pinocchio owns config/bootstrap and profile registry discovery.
- Geppetto owns engine-profile resolution.
- `wesen-os` owns runtime policy.
- profile HTTP APIs are read/select only.
- mutable profile CRUD is removed.

Work:

1. Add a migration note to launcher docs explaining that AI/profile config comes from Pinocchio sources.
2. Add focused tests for config/profile precedence:
   - explicit launcher flags beat config,
   - `PINOCCHIO_*` env beats config,
   - Pinocchio default config/profile files are consulted when explicit values are absent.
3. Identify and mark every CRUD-oriented test and frontend call site that will be removed or rewritten.

### Phase 1: Bootstrap through Pinocchio helpers

Files to study first:

- `pinocchio/pkg/cmds/profilebootstrap/profile_selection.go`
- `pinocchio/pkg/cmds/profilebootstrap/engine_settings.go`
- `geppetto/pkg/cli/bootstrap/profile_selection.go`
- `geppetto/pkg/cli/bootstrap/engine_settings.go`

Implementation direction:

- in `wesen-os/cmd/wesen-os-launcher/main.go`, stop treating parsed values as the full source of truth for AI/profile settings,
- add a launcher-local bootstrap helper that calls Pinocchio bootstrap functions.

Pseudocode:

```go
profileSelection, err := profilebootstrap.ResolveCLIProfileSelection(parsed)
if err != nil { ... }

baseInferenceSettings, configFiles, err := profilebootstrap.ResolveBaseInferenceSettings(parsed)
if err != nil { ... }

resolvedEngine, err := profilebootstrap.ResolveCLIEngineSettingsFromBase(
    ctx,
    baseInferenceSettings,
    parsed,
    configFiles,
)
if err != nil { ... }
defer resolvedEngine.Close()
```

Important nuance:

- this should use Pinocchio app name/env prefix for AI/profile settings,
- it should not force `wesen-os` to adopt Pinocchio for unrelated launcher flags.

### Phase 2: Replace legacy profile imports with engine-profile types

Replace imports of:

- `github.com/go-go-golems/geppetto/pkg/profiles`

with:

- `github.com/go-go-golems/geppetto/pkg/engineprofiles`

Likely migration files:

- `wesen-os/cmd/wesen-os-launcher/main.go`
- `go-go-os-chat/pkg/profilechat/request_resolver.go`
- `go-go-os-chat/pkg/profilechat/runtime_composer.go`
- `wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/runtime_composer.go`
- `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
- `go-go-os-chat/pkg/chatservice/component.go`

### Phase 3: Remove built-in launcher profile definitions

Delete or heavily reduce the in-memory profile bootstrapping in `wesen-os/cmd/wesen-os-launcher/main.go`.

Instead:

- build a chained registry from Pinocchio profile sources,
- resolve profiles at request time,
- keep only app defaults that are not meant to be user-editable profile data.

If some bootstrap fallback profiles are still needed for tests, isolate them in test helpers rather than application startup.

### Phase 4: Move runtime policy into extensions or explicit app config

Inventory and assistant runtime policy currently lives in legacy `Runtime` fields.

Move that policy into:

- the Pinocchio webchat runtime extension, or
- explicit app-local configuration that the request resolver combines with resolved engine settings.

Recommended approach:

- use extensions for profile-varying policy,
- use launcher/composer options for app-wide defaults.

Example:

```text
profile "inventory"
  engine settings -> provider/model/api
  runtime extension -> inventory prompt + inventory middleware + inventory tools

profile "assistant"
  engine settings -> provider/model/api
  runtime extension -> assistant prompt + assistant tool policy
```

### Phase 5: Rebuild request resolution and runtime composition

Use `pinocchio/cmd/web-chat/profile_policy.go` as the model.

Expected flow:

```text
incoming request
  -> resolve selected registry + selected engine profile slug
  -> ResolveEngineProfile(...)
  -> MergeInferenceSettings(base, resolved.InferenceSettings)
  -> decode runtime extension
  -> build runtime key + fingerprint
  -> pass shared transport object to webchat
```

Important rule:

- runtime composer should not re-resolve profiles.
- request resolver should produce the complete local plan once.

### Phase 6: Hard-cut profile CRUD from frontend and backend wrappers

This phase exists specifically because the simplified plan intentionally removes mutable profile operations.

Backend work:

1. Remove assumptions that profile write metadata is needed in:
   - `go-go-os-chat/pkg/chatservice/component.go`
   - `wesen-os/pkg/assistantbackendmodule/module.go`
   - `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
2. Keep only the shared Pinocchio profile API handler surface:
   - list/get/current-profile/schema endpoints.
3. Delete or rewrite integration tests that assert:
   - create profile,
   - patch profile,
   - set default profile,
   - delete profile.

Frontend work:

1. Remove or deprecate:
   - `createProfile`
   - `updateProfile`
   - `deleteProfile`
   - `setDefaultProfile`
   from `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`.
2. Update any consuming UI to support:
   - list available profiles,
   - select current profile,
   - read current profile,
   - handle missing/deleted selection by falling back to a valid profile.
3. Rewrite frontend tests and mocks to stop expecting write endpoints.

### Phase 7: Frontend, tests, and docs

Update:

- launcher integration tests,
- frontend mocks and profile API tests,
- inventory backend docs,
- launcher startup/operations docs.

The migration is not complete until these surfaces reflect the new contract.

## Detailed Step-By-Step Implementation Plan

This is the concrete sequence I would follow in code.

### Step 1: Remove CRUD expectations first

Reason:

- it narrows the backend target immediately,
- it removes the need to keep mutation compatibility while refactoring the profile domain.

Files:

- `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
- frontend callers/tests using the removed functions
- `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`

Expected outcome:

- only read/select profile API expectations remain.

### Step 2: Introduce launcher-local Pinocchio bootstrap helpers

Create a small launcher-local helper in `wesen-os/cmd/wesen-os-launcher` that resolves:

- base inference settings
- selected profile
- selected registry sources
- chained engine-profile registry

Expected outcome:

- the launcher no longer depends on ad hoc in-memory profile defaults for engine selection.

### Step 3: Migrate `go-go-os-chat/pkg/profilechat/request_resolver.go`

Replace:

- old `ResolveEffectiveProfile(...)`
- old `RuntimeKeyFallback`
- old `ResolvedProfile.EffectiveRuntime`

with:

- `ResolveEngineProfile(...)`
- merged inference settings
- runtime extension decode
- local runtime plan build

Expected outcome:

- `go-go-os-chat` starts speaking the same conceptual language as Pinocchio web-chat.

### Step 4: Migrate `go-go-os-chat/pkg/profilechat/runtime_composer.go`

Replace:

- legacy `RuntimeSpec`
- `step_settings_patch`
- old middleware types from the mixed profile package

with:

- final resolved inference settings from the request resolver,
- runtime extension fields,
- middleware definitions resolved against app-owned runtime middleware uses.

Expected outcome:

- the composer becomes a pure composition layer rather than a second profile-resolution layer.

### Step 5: Swap `wesen-os` launcher and wrappers to engineprofiles

Files:

- `wesen-os/cmd/wesen-os-launcher/main.go`
- `wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/runtime_composer.go`
- `wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/request_resolver.go`
- `wesen-os/pkg/assistantbackendmodule/module.go`
- `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
- `go-go-os-chat/pkg/chatservice/component.go`

Expected outcome:

- all app wiring uses `engineprofiles.Registry`,
- all request resolvers/composers use the new plan.

### Step 6: Delete hardcoded mixed runtime profile definitions from launcher startup

Replace the current in-memory bootstrap profiles in `main.go` with:

- profile files loaded from Pinocchio registry sources,
- app-owned defaults only where no profile-specific override is needed.

Expected outcome:

- the selected model/provider now truly comes from Pinocchio profile files.

### Step 7: Validate runtime behavior end to end

Checklist:

- selected profile changes engine settings,
- assistant and inventory still resolve prompts, middlewares, and tools correctly,
- current profile route still works if enabled,
- list/get profile routes still work,
- no create/update/delete/default paths remain in backend or frontend.

## Detailed Task Breakdown

### Task Group A: Frontend hard cut

1. Remove CRUD functions from `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`.
2. Update any imports/call sites that still reference removed CRUD helpers.
3. Rewrite frontend tests/mocks to use only list/get/current-profile/schema flows.
4. Update launcher/frontend fixtures that still stub CRUD responses.

### Task Group B: Backend API hard cut

5. Remove CRUD-oriented launcher integration tests from `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`.
6. Remove any backend wrapper fields that only exist for profile mutation bookkeeping.
7. Ensure mounted profile APIs are limited to read/select/schema routes.

### Task Group C: Bootstrap migration

8. Add launcher-local helper(s) for Pinocchio bootstrap resolution.
9. Resolve base inference settings via Pinocchio bootstrap.
10. Resolve selected profile and registry sources via Pinocchio bootstrap.
11. Build chained engine-profile registry from the resolved sources.

### Task Group D: `go-go-os-chat` profile domain migration

12. Migrate `go-go-os-chat/pkg/profilechat/request_resolver.go` to `engineprofiles`.
13. Introduce a local resolved conversation plan struct in `go-go-os-chat`.
14. Decode runtime policy from engine-profile extensions instead of legacy runtime fields.
15. Migrate `go-go-os-chat/pkg/profilechat/runtime_composer.go` to consume final inference settings plus runtime extension data.
16. Update `go-go-os-chat/pkg/chatservice/component.go` to the simplified profile API contract.

### Task Group E: `wesen-os` wrapper migration

17. Migrate assistant module wiring in `wesen-os/pkg/assistantbackendmodule/module.go`.
18. Migrate inventory backend component wiring in `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`.
19. Update `pinoweb` aliases/wrappers to the new resolver/composer types.
20. Replace in-memory mixed profiles in `wesen-os/cmd/wesen-os-launcher/main.go`.

### Task Group F: Runtime policy migration

21. Define the runtime extension data needed for inventory.
22. Define the runtime extension data needed for assistant.
23. Update profile files and/or test profile fixtures to carry the new runtime extension fields.
24. Ensure middleware and tool allowlists are sourced from the new runtime data path.

### Task Group G: Validation and documentation

25. Add/adjust launcher precedence tests for `PINOCCHIO_*`, config, and flags.
26. Add/adjust resolver/composer unit tests in `go-go-os-chat`.
27. Add/adjust launcher integration tests for read/select profile behavior.
28. Update startup and operator docs to state that Pinocchio config/profile files are authoritative.
29. Update APP-30 diary/changelog as implementation proceeds.

## Detailed Pseudocode

### Bootstrap and registry chain

```go
func resolveLauncherProfiles(ctx context.Context, parsed *values.Values) (*ResolvedLauncherProfiles, error) {
    selection, err := profilebootstrap.ResolveCLIProfileSelection(parsed)
    if err != nil {
        return nil, err
    }

    base, configFiles, err := profilebootstrap.ResolveBaseInferenceSettings(parsed)
    if err != nil {
        return nil, err
    }

    if len(selection.ProfileRegistries) == 0 {
        return &ResolvedLauncherProfiles{
            BaseInferenceSettings: base,
            ConfigFiles:           configFiles,
        }, nil
    }

    specs, err := engineprofiles.ParseRegistrySourceSpecs(selection.ProfileRegistries)
    if err != nil {
        return nil, err
    }

    chain, err := engineprofiles.NewChainedRegistryFromSourceSpecs(ctx, specs)
    if err != nil {
        return nil, err
    }

    return &ResolvedLauncherProfiles{
        BaseInferenceSettings: base,
        ProfileSelection:      selection,
        Registry:              chain,
        DefaultRegistry:       chain.DefaultRegistrySlug(),
        Close:                 func() { _ = chain.Close() },
    }, nil
}
```

### Request resolution

```go
func (r *Resolver) Resolve(req *http.Request) (webhttp.ResolvedConversationRequest, error) {
    selectedProfile := resolveProfileSlugFromPathBodyQueryCookie(req)
    selectedRegistry := resolveRegistryFromBodyQueryCookieDefault(req)

    resolvedProfile, err := r.registry.ResolveEngineProfile(ctx, engineprofiles.ResolveInput{
        RegistrySlug:      selectedRegistry,
        EngineProfileSlug: selectedProfile,
    })
    if err != nil { ... }

    finalSettings, err := engineprofiles.MergeInferenceSettings(r.base, resolvedProfile.InferenceSettings)
    if err != nil { ... }

    runtimeExt, _, err := infruntime.ProfileRuntimeFromEngineProfile(
        mustGetProfileModel(r.registry, selectedRegistry, selectedProfile),
    )
    if err != nil { ... }

    runtime := buildRuntime(finalSettings, runtimeExt, resolvedProfile.Metadata)
    plan := buildConversationPlan(req, runtime)
    return toResolvedConversationRequest(plan), nil
}
```

### Optional mutation API compatibility layer

```go
func (s *ProfileMutationService) DeleteProfile(ctx context.Context, registry RegistrySlug, slug EngineProfileSlug, expected uint64) error {
    model, ok, err := s.store.GetRegistry(ctx, registry)
    if err != nil { return err }
    if !ok || model == nil { return engineprofiles.ErrRegistryNotFound }

    clone := model.Clone()
    delete(clone.Profiles, slug)
    if clone.DefaultEngineProfileSlug == slug {
        clone.DefaultEngineProfileSlug = pickNewDefault(clone.Profiles)
    }

    return s.store.UpsertRegistry(ctx, clone, engineprofiles.SaveOptions{
        ExpectedVersion: expected,
        Actor:           s.actor,
        Source:          s.source,
    })
}
```

## Testing Strategy

### Minimum backend coverage

- launcher boots with no explicit profile registry and base Pinocchio config only
- launcher boots with `--profile-registries`
- launcher resolves `PINOCCHIO_PROFILE_REGISTRIES`
- launcher respects `profile-settings.profile-registries` from Pinocchio config
- selected profile changes model/provider settings
- runtime extension changes prompt/tools/middlewares without changing engine resolution
- missing selected profile returns `404`
- invalid profile/registry slug returns `400`

### Frontend coverage

- profile selector still lists profiles
- current profile route still works if enabled
- schema endpoints still expose middleware and extension schemas
- stale/deleted selected profile falls back deterministically

## Risks And Open Questions

### Risk 1: hidden config namespace mismatch

If `wesen-os` continues to rely on its own app config namespace for AI sections while only profile registries come from Pinocchio, operators will end up with split-brain configuration. Avoid this.

### Risk 2: partial CRUD removal

If only the backend or only the frontend removes CRUD, the system will fail in a confusing half-migrated state. Remove the write surface deliberately and early.

### Risk 3: partial migration inside shared packages

If `wesen-os` launcher migrates but `go-go-os-chat` stays on the old mixed runtime domain, the code will remain conceptually inconsistent and likely harder to maintain than before.

### Risk 4: runtime extension drift

If multiple apps define similar runtime extensions with slightly different keys or schema expectations, profile authoring becomes fragile. Prefer reusing Pinocchio's existing `pinocchio.webchat_runtime@v1` unless there is a strong reason not to.

### Open questions

1. Should `go-go-os-chat` be migrated in place, or should `wesen-os` stop depending on it and adopt a Pinocchio-style local resolver/composer package?
2. Do both inventory and assistant modules need the same runtime extension key, or should assistant policy stay explicit in code while inventory becomes profile-driven?
3. How much frontend UI should remain around profile selection once CRUD is removed?

## References

## File References

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/README.md`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/doc/topics/01-profiles.md`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/doc/topics/13-js-api-reference.md`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/sections/profile_sections.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/cli/bootstrap/config.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/cli/bootstrap/profile_selection.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/cli/bootstrap/engine_settings.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/engineprofiles/store.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/engineprofiles/registry.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/README.md`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/examples/js/README.md`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/examples/js/profiles/basic.yaml`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/pkg/doc/topics/webchat-profile-registry.md`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/pkg/inference/runtime/profile_runtime.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/pkg/webchat/http/profile_api.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/cmd/web-chat/main.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/cmd/web-chat/profile_policy.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/runtime_composer.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/chatservice/component.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main_integration_test.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/02/27/GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML--wesen-os-startup-fails-due-implicit-legacy-profiles-yaml-fallback/index.md`
