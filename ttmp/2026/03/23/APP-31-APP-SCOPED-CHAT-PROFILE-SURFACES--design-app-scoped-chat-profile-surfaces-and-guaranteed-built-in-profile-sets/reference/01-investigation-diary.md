---
Title: Investigation diary
Ticket: APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES
Status: active
Topics:
    - architecture
    - wesen-os
    - pinocchio
    - profiles
    - frontend
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../geppetto/pkg/engineprofiles/source_chain.go
      Note: Confirmed source ordering determines default and implicit slug resolution precedence
    - Path: ../../../../../../../go-go-os-chat/pkg/chatservice/component.go
      Note: Confirmed the profile API handler is mounted from the shared chatservice layer
    - Path: ../../../../../../../pinocchio/pkg/webchat/http/profile_api.go
      Note: Confirmed generic profile listing behavior is registry-centric rather than app-specific
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/app_profile_surface.go
      Note: New launcher-owned app profile surface implementation landed during APP-31
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go
      Note: Confirmed the launcher builds one shared registry chain from profile source specs
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml
      Note: Showed that inventory and analyst profiles currently exist only in test data
    - Path: ../../../../../../../wesen-os/pkg/assistantbackendmodule/module.go
      Note: Confirmed assistant profile routes use the same shared registry object
    - Path: ../../../../../../../wesen-os/pkg/assistantbackendmodule/profiles/profiles.yaml
      Note: Assistant built-in profile registry added during APP-31
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go
      Note: Confirmed inventory profile routes use the shared registry object
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-app-inventory/pkg/backendmodule/profiles/profiles.yaml
      Note: Inventory built-in profile registry added during APP-31
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileTypes.ts
      Note: Confirmed frontend already models per-surface profile policy
ExternalSources: []
Summary: Chronological diary of the investigation, ticket authoring, and delivery work for APP-31.
LastUpdated: 2026-03-23T11:55:00-04:00
WhatFor: Record the investigation steps behind APP-31, including the current registry-sharing behavior, the missing runtime inventory profiles, and the resulting app-scoped design recommendation.
WhenToUse: Use when continuing APP-31 or when reviewing how the design conclusions were derived from the current codebase.
---



# Investigation diary

## Goal

Capture the investigation and writing process for APP-31, with a clear record of what the current system does, what was surprising, and why the final design recommendation is to make profile surfaces app-owned rather than globally shared.

## Step 1: Confirm the current route, registry, and selector ownership boundaries

The first step was to verify whether the user’s intuition was correct. They suspected that inventory and assistant should probably have separate chat/profile surfaces because each frontend application wants its own custom profiles, middlewares, and tools. The important part was to confirm whether that problem was real in the codebase or only apparent in the UI.

The investigation showed that the system is already split in one dimension but not in another. The launcher mounts app routes under `/api/apps/<app-id>/...`, so inventory and assistant do have separate endpoint namespaces. But both of those namespaced endpoints are still backed by the same shared launcher-built profile registry chain. So the user’s concern was correct: the route surface is app-specific, but the profile visibility surface is still shared.

### Prompt Context

**User prompt (verbatim):** "ok, create a new docmgr ticket, keep a diary, and create a detailed analysis / design / implementation guide that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a new ticket and write a very detailed intern-facing architecture/design guide explaining why app-scoped chat/profile surfaces are needed, how the current system works, and how to implement the fix. Also keep a diary and upload the bundle.

**Inferred user intent:** Leave behind an implementation-ready architecture package for making chat/profile endpoints truly app-owned, especially for inventory’s expected built-in profiles.

### What I did
- Confirmed the doc root with:
  - `docmgr status --summary-only`
- Listed tickets to choose the next ticket ID:
  - `docmgr ticket list`
- Read the launcher bootstrap and module mount path:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go`
- Read the shared chatservice/profile API wiring:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/chatservice/component.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/pkg/webchat/http/profile_api.go`
- Read the inventory and assistant module wiring:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go`
- Read the frontend profile policy and selector path:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileTypes.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatProfileSelector.tsx`
- Verified where the expected inventory profiles exist:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`
- Checked source-chain precedence semantics in:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/engineprofiles/source_chain.go`

### Why
- The question is architectural, not cosmetic.
- The system needed to be mapped across launcher, shared backend, Pinocchio, Geppetto, and frontend before writing the design.
- Precedence behavior matters if the new design is going to combine app-shipped built-ins with operator-provided registries.

### What worked
- The code made the mismatch visible quickly:
  - one launcher-built registry chain,
  - many app endpoints,
  - one generic profile list handler,
  - app-specific frontend profile policies.
- The `source_chain.go` read clarified an important rule: later source specs get higher implicit precedence for registry-default and profile-slug resolution.

### What didn't work
- I initially tried to read `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-backend/pkg/backendhost/routes.go` directly and got:

```text
sed: can't read /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-backend/pkg/backendhost/routes.go: No such file or directory
```

- That was just a workspace-path assumption error. The launcher and docs already provided enough evidence for route namespacing, so I did not need to block on that file.

### What I learned
- The user-visible symptom (“why don’t I see analyst/inventory?”) is caused by two separate facts:
  - the expected inventory profiles are only in testdata,
  - the visible profile list is still sourced from a generic shared registry view.
- The frontend already has the right abstraction for app policy (`none` vs `selectable` vs `fixed`); the backend profile surface is what lags behind.

### What was tricky to build
- The subtle part was avoiding a false explanation. It would have been easy to say “the system needs separate endpoints,” but that is only half true.
- The endpoints are already separate by namespace. The missing separation is in profile visibility and guaranteed app-owned profile data.
- I solved that by writing the guide around the difference between:
  - route namespacing,
  - registry ownership,
  - app-owned profile surface behavior.

### What warrants a second pair of eyes
- Reviewers should verify whether inventory should permanently expose `assistant` and `planner` as visible profiles or only `default`, `inventory`, and `analyst`.
- Reviewers should verify the desired precedence between shipped built-ins and operator-provided registries before implementation starts.

### What should be done in the future
- Implement a real inventory built-in profile source outside testdata.
- Add app-specific profile visibility enforcement for both profile listing and chat resolution.
- Add integration tests that prove inventory and assistant no longer leak profiles across each other.

### Code review instructions
- Start with `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`.
- Then review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go` and `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go`.
- Then read `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.ts` and `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileTypes.ts`.
- Then inspect `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`.

### Technical details
- Ticket created:
  - `APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES`
- Ticket path:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES--design-app-scoped-chat-profile-surfaces-and-guaranteed-built-in-profile-sets`

## Step 2: Write the design guide, tasks, and delivery bundle

Once the architecture was clear, the second step was synthesis. The key design insight was that the implementation should not roll back to legacy mixed profiles and should not invent a second ad hoc selector concept. The new design should keep engine profiles and Pinocchio runtime extensions, but make the app-facing profile surface explicitly owned by each app.

That led to three concrete deliverables in the design guide:

- explain the current mismatch in plain language for a new intern,
- define the target app-scoped model and the required ownership boundaries,
- turn that into a file-by-file implementation plan with decisions, alternatives, and open questions.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Finish the ticket package end to end with a clear, detailed guide and a complete diary, then validate and upload it.

**Inferred user intent:** Create a durable architecture handoff document, not just a note or a partial design sketch.

### What I did
- Created the ticket workspace:
  - `docmgr ticket create-ticket --ticket APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES --title "Design app-scoped chat/profile surfaces and guaranteed built-in profile sets" --topics architecture,wesen-os,pinocchio,profiles,frontend`
- Added:
  - `design-doc/01-intern-guide-to-app-scoped-chat-profile-surfaces-and-inventory-built-in-profiles.md`
  - `reference/01-investigation-diary.md`
- Replaced the generated stubs in:
  - `index.md`
  - `tasks.md`
  - `changelog.md`
  - the design doc
  - this diary
- Structured the guide around:
  - current system map,
  - route vs registry vs frontend policy boundaries,
  - why inventory profiles are missing,
  - proposed app-scoped design,
  - precedence rules,
  - implementation phases,
  - file-by-file work plan,
  - alternatives and open questions.

### Why
- The user asked for a document detailed enough for a new intern, so the guide had to teach the system before prescribing changes.
- The implementation plan needed to be concrete enough to prevent future drift back into “shared route namespace means shared profile surface” thinking.

### What worked
- The architecture broke down cleanly into three teachable layers:
  - route namespace,
  - registry/runtime resolution,
  - frontend profile policy.
- Framing the problem as an ownership mismatch made the design much clearer than treating it as a missing-profile bug.

### What didn't work
- N/A

### What I learned
- This design is easier to explain once you separate “how requests are sent” from “what profiles the app is allowed to expose.”
- The existing `profile` and `registry` request payload already work; the main gap is in app-specific visibility and guaranteed built-in data.

### What was tricky to build
- The hardest part was making the guide detailed without becoming muddy.
- The system spans several repos and packages, and many names are similar:
  - engine profile,
  - profile surface,
  - frontend profile policy,
  - runtime extension,
  - registry source.
- I handled that by making the guide define each layer explicitly and then reusing those terms consistently.

### What warrants a second pair of eyes
- Someone familiar with product UX should review the recommended visible profile set for inventory.
- Someone familiar with operator configuration should review the precedence recommendation before implementation.

### What should be done in the future
- Validate the new docs with `docmgr validate frontmatter`.
- Relate the key code files to the design doc and diary.
- Upload the bundle to reMarkable and verify the remote listing.

### Code review instructions
- Review the design doc first.
- Then walk the evidence files in the order listed in Step 1.

## Step 3: Tighten the design around per-app registry surfaces and start the implementation plan

The next user clarification changed the shape of the ticket from “investigate and describe” to “update the design, break the work into phases, and begin implementation.” The most important architectural clarification was that each frontend app should get its own registry surface, while the launcher’s generic Pinocchio registry remains available only as the fallback layer underneath those app surfaces.

That matters because it turns the design from a vague “app-scoped filtering” idea into a concrete backend composition rule. Inventory and assistant should no longer receive the same final injected registry object. They should each receive an app-specific surface whose visible default registry is app-owned, whose selectable profiles are app-owned, and whose fallback resolution can still reference the shared launcher registry when a built-in app profile stacks onto generic shared profile data.

### Prompt Context

**User prompt (verbatim):** "update the design document.  create detailed tasksk separated in phases in the ticket's tasks document, andn then work on them one by one, committing at appropriate intervals and keeping an implementation diary."

**Assistant interpretation:** Update APP-31 to match the clarified target architecture, turn it into a phased implementation ticket, and then execute the implementation in focused slices with diary updates and commits.

**Inferred user intent:** Move APP-31 from research to execution, with enough planning detail that the implementation can proceed cleanly and be audited later.

### What I did
- Re-read the APP-31 design doc, tasks, and diary to find the sections that still described the profile surface too generically.
- Re-read the relevant implementation files:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/pinocchio/pkg/webchat/http/profile_api.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/engineprofiles/service.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/geppetto/pkg/engineprofiles/source_chain.go`
- Updated the design doc so it now explicitly states:
  - one app-scoped registry surface per app,
  - app-owned built-ins at the top,
  - shared launcher registry as the generic fallback below,
  - aligned `/chat` and `/api/chat/profiles` visibility enforcement.
- Expanded `tasks.md` into execution phases covering:
  - design refresh,
  - built-in registry files,
  - app-specific registry composition,
  - visibility enforcement,
  - tests,
  - diary/changelog bookkeeping.

### Why
- The earlier design correctly identified the ownership problem, but it still left too much room for a weaker implementation such as frontend-only filtering or one shared registry with a cosmetic allowlist.
- The user explicitly endorsed separate registry chains per app with a shared generic fallback, so the ticket needed to encode that decision unambiguously before code changes began.

### What worked
- Reading `source_chain.go` and `service.go` together clarified that a clean implementation does not need legacy compatibility logic. The app surface can be a purpose-built registry service that owns visibility and default behavior while delegating fallback resolution to the aggregate store.
- The phased task list now mirrors the actual implementation order instead of the earlier research-oriented checklist.

### What didn't work
- N/A

### What I learned
- The distinction between “visible registry” and “fallback registry” is the key concept for the new architecture.
- If that distinction is not explicit in the ticket, it is too easy to accidentally preserve the current global-profile behavior while only changing labels or frontend rendering.

### What was tricky to build
- The subtle part was making the design precise enough to guide code without prematurely locking into the exact helper type names.
- The codebase has three overlapping concepts:
  - the launcher-built shared chain,
  - the app-visible surface,
  - the request resolver’s default profile logic.
- I handled that by rewriting the design doc around the exact ownership boundaries those concepts need to satisfy instead of around the current package structure.

### What warrants a second pair of eyes
- Reviewers should verify that the design now matches the intended product rule: inventory and assistant can share generic fallback profiles for stack inheritance without sharing the same visible selector surface.

### What should be done in the future
- Implement Phase D first: ship real built-in inventory and assistant profile registries outside testdata.
- Then implement Phase E and Phase F together so the new registry surfaces and visibility enforcement land in the same code slice.

### Code review instructions
- Read the revised “Proposed Solution,” “Precedence Design,” and “Detailed Implementation Plan” sections in the APP-31 design doc.
- Then compare those sections against:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go`

### Technical details
- The tasks document now treats “design refresh” as its own completed phase before code work begins.
- The next implementation slice should be small and auditable:
  - add embedded built-in registry YAML files,
  - add loaders,
  - keep the shared launcher bootstrap untouched until the new app-surface composition helper exists.
- Confirm that each design claim points back to a concrete current-state file.
- Main design doc:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES--design-app-scoped-chat-profile-surfaces-and-guaranteed-built-in-profile-sets/design-doc/01-intern-guide-to-app-scoped-chat-profile-surfaces-and-inventory-built-in-profiles.md`

## Step 4: Validate and upload the ticket bundle to reMarkable

The last step was delivery. After the design doc and diary were written, I related the important evidence files to both documents and validated the frontmatter so the ticket would be structurally clean inside docmgr. Then I bundled the ticket and uploaded it to reMarkable under a dedicated APP-31 directory.

This matters because the user asked for the work to be stored in the ticket and uploaded, not merely drafted locally. The final check was the remote listing, which confirmed that the uploaded PDF exists in the expected destination.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Complete the ticket delivery loop by validating the docs, relating the evidence files, uploading the bundle, and confirming that the remote artifact exists.

**Inferred user intent:** Ensure the design package is reviewable both in the repo and on the external reading device/workflow used for long-form review.

### What I did
- Related the main evidence files to:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES--design-app-scoped-chat-profile-surfaces-and-guaranteed-built-in-profile-sets/design-doc/01-intern-guide-to-app-scoped-chat-profile-surfaces-and-inventory-built-in-profiles.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES--design-app-scoped-chat-profile-surfaces-and-guaranteed-built-in-profile-sets/reference/01-investigation-diary.md`
- Validated frontmatter with:
  - `docmgr validate frontmatter --doc .../index.md --suggest-fixes`
  - `docmgr validate frontmatter --doc .../design-doc/01-intern-guide-to-app-scoped-chat-profile-surfaces-and-inventory-built-in-profiles.md --suggest-fixes`
  - `docmgr validate frontmatter --doc .../reference/01-investigation-diary.md --suggest-fixes`
- Confirmed reMarkable tooling and auth with:
  - `remarquee status`
  - `remarquee cloud account --non-interactive`
- Dry-ran the upload with:
  - `remarquee upload bundle --dry-run ... --name "APP-31 app-scoped chat profile surfaces" --remote-dir "/ai/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES" --toc-depth 2`
- Uploaded the bundle with the same command without `--dry-run`.
- Verified the remote path with:
  - `remarquee cloud ls /ai/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES --long --non-interactive`

### Why
- The ticket should be both locally structured and externally reviewable.
- Validation catches docmgr metadata mistakes early.
- The dry run reduces the risk of uploading the wrong bundle or wrong remote path.

### What worked
- All three main APP-31 docs passed frontmatter validation.
- The related-file links were added successfully to both the guide and the diary.
- The bundle upload succeeded.
- The remote listing confirmed:
  - `APP-31 app-scoped chat profile surfaces`

### What didn't work
- N/A

### What I learned
- For architecture tickets, the combination of doc relationships plus a bundled reMarkable upload creates a much better handoff artifact than either one alone.

### What was tricky to build
- The only real subtlety was choosing the right upload unit. I kept the bundle focused on:
  - `index.md`
  - the primary design doc
  - the diary
- That keeps the review package compact while preserving the full ticket structure in the repo.

### What warrants a second pair of eyes
- N/A

### What should be done in the future
- If implementation work starts under this ticket, append new diary steps rather than replacing this investigation record.
- If the design expands to include additional chat apps beyond inventory and assistant, upload a follow-up bundle rather than overwriting this one.

### Code review instructions
- Review the three uploaded bundle documents in the ticket workspace.
- Re-run:
  - `remarquee cloud ls /ai/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES --long --non-interactive`

### Technical details
- Remote directory:
  - `/ai/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES`
- Uploaded document:
  - `APP-31 app-scoped chat profile surfaces`

## Step 5: Implement app-scoped registry surfaces and built-in profile sources

The first implementation slice took APP-31 from design into code. The main change was structural: inventory and assistant no longer consume the same final profile registry object. Instead, each app now ships its own built-in registry data, and the launcher composes an app-scoped registry surface that exposes only that app’s visible profiles while still keeping the shared launcher registry available underneath as the generic fallback pool.

This was intentionally done as new work rather than a compatibility layer. Inventory now ships and exposes `default`, `inventory`, `analyst`, and `assistant`; assistant ships and exposes only `assistant`. The tests assert that those surfaces are separate and that inventory chat rejects hidden foreign selections such as `planner`.

### Prompt Context

**User prompt (verbatim):** (same as Step 3)

**Assistant interpretation:** Implement the phased APP-31 migration in focused slices, commit along the way, and keep the ticket diary current.

**Inferred user intent:** Replace the shared cross-app profile surface with app-owned surfaces that are guaranteed at runtime and straightforward to maintain.

**Commit (code):** `b588378` — `feat(backendmodule): add inventory builtin chat profiles`

**Commit (code):** `a38a1c4` — `feat(wesen-os): add app-scoped chat profile surfaces`

### What I did
- Added real embedded inventory built-in profile data in:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendmodule/builtin_profiles.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendmodule/profiles/profiles.yaml`
- Added real embedded assistant built-in profile data in:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/builtin_profiles.go`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/profiles/profiles.yaml`
- Added the launcher-owned app surface implementation in:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/app_profile_surface.go`
- Updated launcher wiring in:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go`
  - inventory now receives an inventory-scoped registry surface
  - assistant now receives an assistant-scoped registry surface
- Updated integration coverage in:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main_integration_test.go`
  - inventory profile API now asserts an exact four-profile visible set
  - assistant profile API asserts no inventory leakage
  - inventory chat asserts hidden foreign profile rejection
  - default-selection coverage now proves inventory defaults to `inventory` and assistant marks `assistant` as default in its surface
- Ran:
  - `gofmt -w cmd/wesen-os-launcher/app_profile_surface.go cmd/wesen-os-launcher/main.go cmd/wesen-os-launcher/main_integration_test.go pkg/assistantbackendmodule/builtin_profiles.go workspace-links/go-go-app-inventory/pkg/backendmodule/builtin_profiles.go`
  - `go test ./cmd/wesen-os-launcher -count=1`
  - `go test ./pkg/assistantbackendmodule ./workspace-links/go-go-app-inventory/pkg/backendmodule -count=1`

### Why
- The user wanted the selector and resolver behavior to be separated by app, not shared indiscriminately across inventory and assistant.
- Shipped built-ins had to move out of launcher testdata so inventory and assistant would have guaranteed runtime profile surfaces.
- The implementation needed to avoid compatibility shims and make the app-scoped surface itself the new normal path.

### What worked
- The embedded-YAML approach fit the current stack cleanly. `DecodeEngineProfileYAMLSingleRegistry(...)` made it easy to keep the built-in registries as real profile documents instead of hardcoded Go structs.
- The launcher-owned `appProfileSurface` implementation cleanly separated:
  - visible registry behavior,
  - visible profile allowlisting,
  - fallback access to the shared launcher registry.
- The inventory and assistant integration tests immediately showed the desired separation once the app-specific surfaces were injected.

### What didn't work
- My first version of `TestProfileE2E_DefaultProfileSelection_IsAppSpecific` tried to prove the assistant default by posting directly to assistant chat and opening assistant websocket routes. That failed with:

```text
parse inference settings: section ai-client not found
```

- The failing command was:
  - `go test ./cmd/wesen-os-launcher -count=1`
- I did not try to hide or special-case that failure. Instead, I changed the test to prove the assistant default through the assistant profile surface itself by checking the assistant profile API item marked `is_default`, while still proving the inventory default on the live chat path where APP-31 actually changes behavior.

### What I learned
- The app-owned built-in registry and the app-owned visible profile policy are separate concerns, and both have to be injected together.
- It is fine for the shared launcher registry to stay in the system as a fallback dependency as long as it is no longer the thing exposed directly to each app.
- The nested `workspace-links/go-go-app-inventory` repo has to be committed separately before the top-level `wesen-os` repo can capture the updated gitlink cleanly.

### What was tricky to build
- The tricky part was enforcing visibility without breaking future stack inheritance from generic shared profiles.
- If the implementation had simply filtered the shared registry list, explicit chat selections could still have leaked or stack resolution could have been constrained incorrectly.
- The solution was to build a purpose-built app surface that:
  - exposes only one visible registry to the app,
  - allows only the app’s visible root profile slugs,
  - delegates actual resolution to an aggregate store that still contains the fallback launcher registries underneath.

### What warrants a second pair of eyes
- Reviewers should verify the visible inventory set is exactly what product wants in the first cut: `default`, `inventory`, `analyst`, and `assistant`.
- Reviewers should verify that app-owned built-ins using dedicated registry slugs (`inventory`, `assistant`) are the desired long-term surface contract rather than a temporary naming choice.

### What should be done in the future
- If future app-built-in profiles need to inherit from generic shared profiles, add explicit cross-registry stack references in the built-in YAML documents and extend tests to cover that inheritance path.
- If raw chat or document chat are added, follow the same pattern:
  - ship a built-in registry,
  - define visible slugs,
  - inject an app-scoped surface,
  - test list/chat alignment.

### Code review instructions
- Start with `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/app_profile_surface.go`.
- Then review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go` to see where inventory and assistant stop receiving the shared launcher registry directly.
- Then inspect the built-in YAML sources in:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendmodule/profiles/profiles.yaml`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/profiles/profiles.yaml`
- Finish with `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main_integration_test.go` and confirm the list and chat assertions line up with the visible surface policy.

### Technical details
- Inventory built-in repo commit:
  - `b588378`
- Top-level `wesen-os` repo commit:
  - `a38a1c4`
- Validated commands:
  - `go test ./cmd/wesen-os-launcher -count=1`
  - `go test ./pkg/assistantbackendmodule ./workspace-links/go-go-app-inventory/pkg/backendmodule -count=1`
