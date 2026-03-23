---
Title: Implementation Postmortem
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
    - Path: ../../../../../../../go-go-os-chat/pkg/profilechat/request_resolver.go
      Note: Shared request-resolution path for engineprofiles and runtime extension decode
    - Path: ../../../../../../../go-go-os-chat/pkg/profilechat/runtime_composer.go
      Note: Runtime composition after inference settings are resolved
    - Path: ../../../../../../../pinocchio/pkg/cmds/profilebootstrap/profile_selection.go
      Note: Pinocchio profile-selection precedence referenced by the launcher migration
    - Path: ../../../../../../../pinocchio/pkg/inference/runtime/profile_runtime.go
      Note: Pinocchio runtime extension contract consumed by webchat-style apps
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/main.go
      Note: Composition root showing launcher fallback defaults versus resolved profile data
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go
      Note: Launcher bootstrap entrypoint and precedence implementation
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml
      Note: Concrete sample engine-profile registry and runtime-extension payload used by tests
    - Path: ../../../../../../../wesen-os/pkg/doc/topics/01-wesen-os-guide.md
      Note: Operator-facing statement of authoritative profile/config behavior
ExternalSources: []
Summary: Detailed postmortem of the APP-30 migration from legacy mixed runtime profiles to Pinocchio bootstrap plus Geppetto engine-profile registries, including system map, implementation order, failures, validation, and remaining risks.
LastUpdated: 2026-03-22T23:58:00-04:00
WhatFor: Explain to future maintainers exactly what changed, why it had to change in this order, how the launcher/chat stack now resolves profiles, and what operational/runtime assumptions remain.
WhenToUse: Use when onboarding into wesen-os chat/profile architecture, reviewing APP-30, debugging launcher profile selection, or extending the runtime/profile system after the engineprofiles migration.
---


# Implementation Postmortem

## Executive Summary

APP-30 migrated `wesen-os` and its shared chat stack off the deleted legacy mixed profile system (`geppetto/pkg/profiles`) and onto the current split architecture:

- Geppetto owns engine-profile registries and final inference-settings resolution.
- Pinocchio owns config/bootstrap, profile-selection precedence, and the shared runtime extension shape.
- `wesen-os` owns application behavior, module composition, and launcher-specific fallback policy.

Before this migration, `wesen-os` still behaved as if one profile object should own everything: model settings, prompt, middleware config, tool exposure, and mutable profile CRUD. That model no longer matched the current Geppetto and Pinocchio APIs. The migration therefore had two goals:

1. make the system compile and run against the current libraries,
2. make the architecture honest, so future work is not built on compatibility ghosts.

The final result is a system where:

- the frontend profile API is read/select-only,
- `go-go-os-chat` resolves `engineprofiles` and decodes Pinocchio runtime extensions,
- the launcher bootstraps from Pinocchio config and profile files,
- file-backed Pinocchio profile registries are now the source of truth for launcher-visible profiles,
- `wesen-os` keeps only minimal code-owned fallback defaults when a runtime extension is absent.

## Problem Statement

The starting system had accumulated a stack of mismatches:

- `wesen-os` launcher startup still imported `github.com/go-go-golems/geppetto/pkg/profiles`, a package path that no longer existed in the active workspace.
- `go-go-os-chat` still assumed profiles were mixed objects that contained both engine settings and runtime policy.
- inventory and assistant modules still passed profile write options around, even though the new shared Pinocchio profile HTTP surface is mostly read/list/get/current-profile.
- tests still defended obsolete behaviors such as profile CRUD and legacy selectors.
- the launcher itself still defined builtin profile objects in code, which contradicted the stated goal of loading Pinocchio config and profile files instead of `wesen-os` profile data.

For a new intern, the key conceptual problem was this:

> The codebase was trying to operate with a “single profile object controls everything” mental model, but the platform libraries had already moved to a “engine settings resolved first, app runtime policy resolved separately” model.

That mismatch caused both build failures and design confusion.

## The System You Need To Understand First

### High-Level Architecture

At runtime, the relevant path looks like this:

```text
Browser
  -> wesen-os frontend
  -> namespaced HTTP routes under /api/apps/<app-id>/
  -> backend module (assistant or inventory)
  -> go-go-os-chat chatservice
  -> request resolver
  -> runtime composer
  -> Pinocchio webchat server
  -> Geppetto engine
```

A slightly more expanded view:

```text
+------------------------------- Browser / Frontend --------------------------------+
| go-go-os-frontend chat-runtime                                                    |
| apps/os-launcher shell                                                            |
+-------------------------------------+---------------------------------------------+
                                      |
                                      v
+------------------------------ wesen-os launcher ----------------------------------+
| cmd/wesen-os-launcher/main.go                                                     |
| - module registry                                                                 |
| - inventory backend module                                                        |
| - assistant backend module                                                        |
| - Pinocchio profile bootstrap                                                     |
+-------------------------------------+---------------------------------------------+
                                      |
                                      v
+--------------------------- shared chat backend layer -----------------------------+
| go-go-os-chat/pkg/chatservice                                                     |
| go-go-os-chat/pkg/profilechat/request_resolver.go                                 |
| go-go-os-chat/pkg/profilechat/runtime_composer.go                                 |
+-------------------------------------+---------------------------------------------+
                                      |
                                      v
+------------------------------ Pinocchio / Geppetto -------------------------------+
| pinocchio/pkg/webchat                                                             |
| pinocchio/pkg/inference/runtime/profile_runtime.go                                |
| pinocchio/pkg/cmds/profilebootstrap/*                                             |
| geppetto/pkg/engineprofiles                                                       |
| geppetto/pkg/steps/ai/settings                                                    |
+-----------------------------------------------------------------------------------+
```

### Ownership Boundaries

This migration only makes sense if you keep the ownership boundaries straight.

#### Geppetto

Geppetto owns:

- engine-profile registry types,
- engine-profile resolution,
- inference-settings merging,
- model/provider/API-key settings structures.

Important files:

- `geppetto/pkg/engineprofiles/types.go`
- `geppetto/pkg/engineprofiles/source_chain.go`
- `geppetto/pkg/engineprofiles/inference_settings_merge.go`
- `geppetto/pkg/cli/bootstrap/engine_settings.go`
- `geppetto/pkg/cli/bootstrap/profile_selection.go`

#### Pinocchio

Pinocchio owns:

- CLI/bootstrap behavior for `PINOCCHIO_*`,
- the `profile-settings` section contract,
- webchat transport structs,
- the app-owned runtime extension shape used by webchat-style apps.

Important files:

- `pinocchio/pkg/cmds/profilebootstrap/profile_selection.go`
- `pinocchio/pkg/cmds/profilebootstrap/engine_settings.go`
- `pinocchio/pkg/inference/runtime/profile_runtime.go`
- `pinocchio/pkg/webchat/http/profile_api.go`
- `pinocchio/cmd/web-chat/main.go`
- `pinocchio/cmd/web-chat/profile_policy.go`

#### wesen-os

`wesen-os` owns:

- the launcher binary and module composition root,
- app-level operational defaults,
- which modules are mounted,
- which profile should be the app-specific fallback when the request omits `profile`,
- operator-facing docs for launcher behavior.

Important files:

- `wesen-os/cmd/wesen-os-launcher/main.go`
- `wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`
- `wesen-os/pkg/assistantbackendmodule/module.go`
- `wesen-os/pkg/doc/topics/01-wesen-os-guide.md`

#### go-go-os-chat

`go-go-os-chat` owns the shared backend glue between app modules and Pinocchio:

- route mounting,
- request resolution,
- runtime composition,
- the translation layer between app requests and Pinocchio webchat runtime state.

Important files:

- `go-go-os-chat/pkg/chatservice/component.go`
- `go-go-os-chat/pkg/profilechat/request_resolver.go`
- `go-go-os-chat/pkg/profilechat/runtime_composer.go`

## The Core Conceptual Change

### Old Model

The old mental model was:

```text
profile
  = engine settings
  + system prompt
  + middleware config
  + tools
  + runtime patch behavior
```

This led to code like:

- resolve one profile object,
- extract an “effective runtime,”
- patch step settings,
- use legacy runtime keys as the source of truth.

### New Model

The new mental model is:

```text
engine profile
  -> resolve engine settings
  -> merge with hidden base inference settings

runtime extension
  -> decode app-owned runtime policy
  -> system prompt / middlewares / tools
```

This is the split model:

```text
ResolvedInferenceSettings = final model/provider/API config
ResolvedRuntime           = app runtime policy
```

That split is the reason the migration had to touch `go-go-os-chat` and not just the launcher.

## Docs And Source Material That Drove The Implementation

These were the most important sources during implementation.

### Primary design/reference docs

- `geppetto/pkg/doc/topics/01-profiles.md`
  - established the hard cut: Geppetto profiles are engine-only.
- `pinocchio/pkg/doc/topics/webchat-profile-registry.md`
  - showed the intended split between engine settings and app runtime policy.
- `pinocchio/pkg/doc/topics/webchat-engine-profile-migration-playbook.md`
  - described the migration seam for webchat-style apps.
- `pinocchio/cmd/pinocchio/doc/general/05-js-runner-scripts.md`
  - documented the `PINOCCHIO_*` and `profile-settings.profile-registries` precedence rules.

### Canonical code examples

- `pinocchio/cmd/web-chat/main.go`
  - the canonical running app that already bootstraps from Pinocchio-style profile settings.
- `pinocchio/cmd/web-chat/profile_policy.go`
  - the clearest example of the split resolver/runtime plan.
- `geppetto/pkg/cli/bootstrap/engine_settings.go`
  - the exact hidden-base-settings merge path we wanted the launcher to follow.
- `geppetto/pkg/cli/bootstrap/profile_selection.go`
  - the exact config/env/default merge path we wanted the launcher to follow.

### The existing code that had to change

- `wesen-os/cmd/wesen-os-launcher/main.go`
- `go-go-os-chat/pkg/profilechat/request_resolver.go`
- `go-go-os-chat/pkg/profilechat/runtime_composer.go`
- `go-go-os-chat/pkg/chatservice/component.go`
- `wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/runtime_composer.go`
- `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
- `wesen-os/pkg/assistantbackendmodule/module.go`

## What The System Looked Like Before

### Frontend

The frontend still exposed profile CRUD helpers:

- `createProfile`
- `updateProfile`
- `deleteProfile`
- `setDefaultProfile`

That API surface lived in:

- `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`

But the backend/platform direction had already moved toward:

- list profiles,
- get a profile,
- get/set current selection cookie,
- expose schemas.

### Shared backend

The shared backend still assumed the old world:

- `request_resolver.go` imported `geppetto/pkg/profiles`
- `runtime_composer.go` used mixed runtime types and `step_settings_patch`
- `chatservice/component.go` carried profile write dependencies

### Launcher

The launcher still built profiles in memory at startup:

```go
profileRegistry, err := newInMemoryProfileService(
    "default",
    &Profile{Slug: "inventory", Runtime: ...},
    &Profile{Slug: "analyst", Runtime: ...},
    &Profile{Slug: "planner", Runtime: ...},
)
```

That meant:

- `wesen-os` itself acted as the profile registry,
- Pinocchio config/profile files were not authoritative,
- the engine/runtime split was being papered over by launcher-owned profile structs.

## Why The Migration Order Mattered

The final implementation order was not arbitrary. It followed the actual dependency chain.

### Order we used

1. remove obsolete frontend CRUD contract,
2. remove backend write-option contract,
3. migrate `go-go-os-chat` resolver/composer,
4. migrate inventory wrappers/tests,
5. add default-profile fallback support to the strict resolver,
6. migrate launcher bootstrap to Pinocchio config/profile loading,
7. replace inline YAML with a checked-in Pinocchio fixture,
8. update operator docs,
9. write postmortem.

### Why this order was correct

If we had tried to start with the launcher, we would still have hit the shared backend blocker:

```text
cmd/wesen-os-launcher/main.go imports legacy profiles package
        |
        v
assistantbackendmodule and inventory module still depend on go-go-os-chat
        |
        v
go-go-os-chat/profilechat still imports dead package and still expects mixed runtime semantics
```

So the real critical path was:

```text
frontend contract cleanup
  -> shared backend contract cleanup
  -> profilechat migration
  -> launcher bootstrap migration
```

## The Actual Implementation Slices

### Slice 1: Hard-cut profile CRUD

What changed:

- removed frontend shared CRUD client methods,
- removed launcher tests defending mutable profile routes,
- removed backend write-option wiring in app modules and chatservice.

Important files:

- `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
- `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`
- `go-go-os-chat/pkg/chatservice/component.go`
- `wesen-os/pkg/assistantbackendmodule/module.go`
- `go-go-app-inventory/pkg/backendcomponent/component.go`

Why it mattered:

- it shrank the contract surface,
- it stopped the test suite from forcing obsolete behavior,
- it revealed the true backend migration blocker.

### Slice 2: Migrate `profilechat`

What changed:

- replaced `pkg/profiles` with `pkg/engineprofiles`,
- split engine settings from runtime policy,
- removed `step_settings_patch`,
- decoded `pinocchio.webchat_runtime@v1` from engine-profile extensions,
- changed runtime fingerprint generation to reflect the split model.

Important files:

- `go-go-os-chat/pkg/profilechat/request_resolver.go`
- `go-go-os-chat/pkg/profilechat/runtime_composer.go`
- `go-go-os-chat/pkg/profilechat/request_resolver_test.go`
- `go-go-os-chat/pkg/profilechat/runtime_composer_test.go`

High-level pseudocode:

```go
selection := readProfileAndRegistryFromRequest()
resolvedEngineProfile := registry.ResolveEngineProfile(selection)
finalInferenceSettings := MergeInferenceSettings(base, resolvedEngineProfile.InferenceSettings)
runtimePolicy := ProfileRuntimeFromEngineProfile(resolvedEngineProfile)

return ResolvedConversationRequest{
    ResolvedInferenceSettings: finalInferenceSettings,
    ResolvedRuntime: runtimePolicy,
    RuntimeKey: selectedOrFallbackProfileSlug,
}
```

Why it mattered:

- this is where the old architecture actually lived,
- until this changed, the launcher could not be migrated honestly.

### Slice 3: Add explicit default profile selection

What changed:

- `StrictRequestResolver` gained `WithDefaultProfileSelection(...)`.

Why it mattered:

- inventory and assistant share one registry stack,
- but they do not share the same app-level fallback slug.

This is a subtle but important distinction:

```text
registry source of truth      != app-specific fallback selection policy
```

### Slice 4: Launcher bootstrap migration

What changed:

- added `profile_bootstrap.go`,
- removed builtin in-memory profile definitions,
- loaded profile registries from Pinocchio sources,
- wired both assistant and inventory modules to the loaded registry chain,
- added focused tests for CLI/env/config/default-path precedence,
- moved integration tests to file-backed Pinocchio fixtures.

Important files:

- `wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`
- `wesen-os/cmd/wesen-os-launcher/main.go`
- `wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test.go`
- `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`
- `wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`

High-level pseudocode:

```go
baseSettings := ResolveBaseInferenceSettings(parsed)
profileSelection := ResolveCLIProfileSelection(parsed)

if profileSelection.ProfileRegistries empty:
    profileSelection.ProfileRegistries = defaultPinocchioProfilesPathIfPresent()

registryChain := NewChainedRegistryFromSourceSpecs(profileSelection.ProfileRegistries)

inventoryResolver :=
    NewStrictRequestResolver("inventory").
        WithProfileRegistry(registryChain, registryChain.DefaultRegistrySlug()).
        WithBaseInferenceSettings(baseSettings).
        WithDefaultProfileSelection(inventoryOrSelectedSlug)

assistantResolver :=
    NewStrictRequestResolver("assistant").
        WithProfileRegistry(registryChain, registryChain.DefaultRegistrySlug()).
        WithBaseInferenceSettings(baseSettings).
        WithDefaultProfileSelection("assistant")
```

## The Runtime Extension Contract

The runtime extension used by `wesen-os` is the Pinocchio-owned key:

- `pinocchio.webchat_runtime@v1`

Shape:

```yaml
extensions:
  pinocchio.webchat_runtime@v1:
    system_prompt: string
    middlewares:
      - name: string
        id: string
        enabled: bool
        config: {}
    tools:
      - string
```

Where it is defined:

- `pinocchio/pkg/inference/runtime/profile_runtime.go`

Where `wesen-os` now uses it:

- decoding in `go-go-os-chat/pkg/profilechat/request_resolver.go`
- consumption in `go-go-os-chat/pkg/profilechat/runtime_composer.go`
- sample registry file in `wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`

## Key API Contracts

### Request resolution

Relevant type:

- `pinocchio/pkg/webchat/http.ResolvedConversationRequest`

Important fields after the migration:

- `RuntimeKey`
- `RuntimeFingerprint`
- `ResolvedInferenceSettings`
- `ResolvedRuntime`
- `ProfileVersion`

Meaning:

- `RuntimeKey` is the selected/fallback app runtime key,
- `ResolvedInferenceSettings` is final engine config,
- `ResolvedRuntime` is app runtime policy,
- `ProfileVersion` comes from engine-profile metadata.

### Profile HTTP API

Shared Pinocchio read/select contract:

- `GET /api/chat/profiles`
- `GET /api/chat/profiles/{slug}`
- `GET /api/chat/profile`
- `POST /api/chat/profile`
- `GET /api/chat/schemas/middlewares`
- `GET /api/chat/schemas/extensions`

Important file:

- `pinocchio/pkg/webchat/http/profile_api.go`

### Launcher profile bootstrap

Important APIs:

- `profilebootstrap.ResolveBaseInferenceSettings(...)`
- `profilebootstrap.ResolveCLIProfileSelection(...)`
- `gepprofiles.ParseRegistrySourceSpecs(...)`
- `gepprofiles.NewChainedRegistryFromSourceSpecs(...)`

## Problems We Hit During Implementation

### 1. Build blocker from deleted legacy package

The launcher and shared backend still referenced:

```text
github.com/go-go-golems/geppetto/pkg/profiles
```

This was the first hard blocker. It forced the migration to start in `go-go-os-chat/profilechat`, not just in launcher startup.

### 2. YAML registry validation surprise

The first file-backed test fixture used `default_profile_slug`, which the runtime YAML loader rejected:

```text
validation error (registry.default_profile_slug): engine profile YAML does not support default_profile_slug; use profile slug "default"
```

Lesson:

- the YAML runtime format is stricter than the in-memory registry builder,
- test fixtures must match the actual runtime file format, not what seems “obvious.”

### 3. Timed-out integration test from channel backpressure

One integration test captured runtime-composer requests through a too-small buffered channel. Once the chat loop composed more than once, the test goroutine blocked and the HTTP request hung.

Fix:

- changed the capture send to non-blocking.

Lesson:

- integration test helpers that tap into runtime composition must never be allowed to block the main chat loop.

### 4. Shared registry, different app defaults

Once inventory and assistant shared the same file-backed registry stack, we had to decide where app-specific default selection lives.

The correct answer was:

- in resolver configuration,
- not by mutating the registry,
- not by inventing separate registry copies.

## Design Decisions And Why They Were Correct

### Decision: No backwards compatibility layer

Why:

- the user explicitly asked for no backwards compatibility and no wrappers,
- compatibility code would have hidden the architecture change,
- stale tests and APIs would have kept obsolete semantics alive.

### Decision: Keep one shared registry stack

Why:

- one launcher process should read one coherent set of profile sources,
- inventory and assistant can still choose different fallback slugs at the resolver boundary,
- it avoids duplicated bootstrap logic and registry divergence.

### Decision: Keep minimal code-owned fallback defaults

Why:

- operators may provide engine-only profiles without runtime extensions,
- the apps should remain minimally usable in that case,
- but runtime extension data is authoritative when present.

That means the code now has a clear rule:

```text
profile runtime extension present   -> use it
profile runtime extension absent    -> use launcher-owned fallback defaults
```

### Decision: Use checked-in profile fixture

Why:

- the runtime contract should be visible as data,
- the fixture doubles as documentation,
- future tests can reuse the same known-good registry shape.

## Alternatives Considered

### Alternative 1: Recreate the old mixed profile package locally

Rejected because:

- it would codify the wrong architecture,
- it would create a private compatibility fork,
- it would delay the real migration rather than solving it.

### Alternative 2: Leave builtin launcher profiles and only change imports

Rejected because:

- it would still leave `wesen-os` as the source of truth,
- it would not satisfy the requirement to load Pinocchio config and profile files,
- it would keep the runtime contract hidden in launcher code.

### Alternative 3: Give assistant and inventory separate registry stacks

Rejected because:

- it duplicates bootstrap work,
- it introduces new drift risks,
- the actual requirement was different fallback selection, not different file stacks.

### Alternative 4: Remove all code-owned defaults immediately

Rejected for now because:

- it would turn missing runtime extensions into hard failures,
- the current system still benefits from safe fallback behavior,
- the operator docs can state that runtime extension data is authoritative when present.

## Validation Matrix

### Main validation commands

Shared backend:

```bash
go test ./pkg/profilechat -count=1
go test ./pkg/chatservice ./pkg/profilechat -count=1
```

Inventory wrapper side:

```bash
go test ./pkg/backendcomponent ./pkg/backendmodule ./pkg/pinoweb -count=1
```

Launcher:

```bash
go test ./cmd/wesen-os-launcher -count=1 -timeout 90s
go test ./pkg/assistantbackendmodule -count=1
```

Frontend:

```bash
npm run test -w packages/chat-runtime
```

### What the tests now prove

- frontend no longer advertises CRUD profile helpers,
- shared backend resolves engine profiles and runtime extensions correctly,
- launcher bootstrap honors CLI/env/config/default-path precedence,
- launcher integration paths still support read/select profile behavior,
- profile switches rebuild in-flight runtime state correctly.

## File-By-File Review Map For A New Intern

Start in this order.

1. `go-go-os-chat/pkg/profilechat/request_resolver.go`
   - understand request parsing,
   - understand how engine profiles are resolved,
   - understand how runtime extensions are decoded.
2. `go-go-os-chat/pkg/profilechat/runtime_composer.go`
   - understand how final inference settings are consumed,
   - understand how system prompt, middleware, and tool policy are applied.
3. `wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`
   - understand config/env/default-path precedence,
   - understand how the registry chain is opened.
4. `wesen-os/cmd/wesen-os-launcher/main.go`
   - understand how the launcher wires the shared registry and per-app fallback defaults.
5. `wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`
   - understand the actual profile file shape expected by tests and operators.
6. `pinocchio/pkg/inference/runtime/profile_runtime.go`
   - understand the runtime extension contract.
7. `pinocchio/pkg/webchat/http/profile_api.go`
   - understand the shared read/select profile HTTP API surface.

## Remaining Risks And Future Work

### Remaining risks

- `docmgr doctor` is still crashing with a nil-pointer panic in this environment, so ticket hygiene still depends on explicit frontmatter validation and manual review.
- inventory and assistant still keep minimal fallback defaults in code; if those drift from operator-owned profile files, behavior may differ depending on whether the runtime extension is present.
- the assistant profile API now lists the shared registry stack, not a private assistant-only list. That is acceptable for now, but it is a UX/design decision worth revisiting.

### Future work

- decide whether missing `pinocchio.webchat_runtime@v1` should remain a soft fallback or become a hard validation failure for certain launcher-managed profiles,
- expand launcher/operator docs with concrete startup examples using `--profile-registries` and config files,
- consider whether the checked-in sample profile registry should evolve into a documented starter profile pack for operators,
- fix the `docmgr doctor` crash so the ticket can have a clean doctor pass.

## Open Questions

- Should `wesen-os` eventually require a runtime extension on `inventory` and `assistant`, instead of permitting fallback defaults?
- Should the launcher ship a documented example profile registry under a non-test path for operators to copy directly?
- Should assistant and inventory continue sharing one profile list in the UI, or should the assistant surface eventually filter that list?

## References

### Main code references

- `wesen-os/cmd/wesen-os-launcher/main.go`
- `wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`
- `wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test.go`
- `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`
- `wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`
- `go-go-os-chat/pkg/profilechat/request_resolver.go`
- `go-go-os-chat/pkg/profilechat/runtime_composer.go`
- `pinocchio/pkg/inference/runtime/profile_runtime.go`
- `pinocchio/pkg/cmds/profilebootstrap/profile_selection.go`
- `pinocchio/pkg/cmds/profilebootstrap/engine_settings.go`
- `pinocchio/pkg/webchat/http/profile_api.go`
- `geppetto/pkg/cli/bootstrap/profile_selection.go`
- `geppetto/pkg/cli/bootstrap/engine_settings.go`

### Ticket documents

- `design-doc/01-intern-guide-to-migrating-wesen-os-to-pinocchio-config-and-engine-profile-registries.md`
- `reference/01-investigation-diary.md`
- `tasks.md`
- `changelog.md`
