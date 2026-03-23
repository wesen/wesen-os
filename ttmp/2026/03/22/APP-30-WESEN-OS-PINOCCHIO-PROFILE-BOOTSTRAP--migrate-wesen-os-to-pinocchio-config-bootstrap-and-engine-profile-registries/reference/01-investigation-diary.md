---
Title: Investigation diary
Ticket: APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP
Status: active
Topics:
    - architecture
    - wesen-os
    - pinocchio
    - geppetto
    - profiles
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../geppetto/README.md
      Note: Top-level documentation entry point used during investigation
    - Path: ../../../../../../../geppetto/pkg/cli/bootstrap/engine_settings.go
      Note: Base inference plus resolved engine-profile merge path
    - Path: ../../../../../../../geppetto/pkg/cli/bootstrap/profile_selection.go
      Note: Bootstrap resolution evidence captured in the diary
    - Path: ../../../../../../../go-go-os-chat/pkg/chatservice/component.go
      Note: Read/select-only shared profile API surface after the CRUD cut
    - Path: ../../../../../../../go-go-os-chat/pkg/profilechat/request_resolver.go
      Note: |-
        Engine-profile request resolution and runtime-extension decoding
        Added explicit default engine-profile selection for launcher-driven defaults
    - Path: ../../../../../../../go-go-os-chat/pkg/profilechat/runtime_composer.go
      Note: Inference-settings-first runtime composition
    - Path: ../../../../../../../pinocchio/README.md
      Note: Pinocchio config and profile precedence documentation used in analysis
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/main.go
      Note: Launcher now loads Pinocchio profile registries instead of builtin profiles
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/main_integration_test.go
      Note: |-
        Initial evidence and later implementation target for removing mutable profile integration expectations
        Launcher integration suite now resolves profiles from Pinocchio-backed fixtures
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go
      Note: Pinocchio config/profile bootstrap logic for the launcher
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test.go
      Note: Focused precedence coverage for launcher bootstrap
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test_helpers_test.go
      Note: |-
        File-backed Pinocchio profile fixtures shared by launcher tests
        Copies the checked-in profile fixture into temp dirs for bootstrap tests
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml
      Note: Checked-in Pinocchio profile registry fixture used by launcher tests
    - Path: ../../../../../../../wesen-os/pkg/assistantbackendmodule/module.go
      Note: Assistant backend wiring after write-option removal
    - Path: ../../../../../../../wesen-os/ttmp/2026/02/27/GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML--wesen-os-startup-fails-due-implicit-legacy-profiles-yaml-fallback/index.md
      Note: Prior related investigation used as historical context
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go
      Note: Inventory backend wiring after write-option removal
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/middleware_definitions.go
      Note: Inventory default middleware types now use Pinocchio runtime middleware uses
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/runtime_composer.go
      Note: Inventory wrapper alignment with migrated profilechat composer
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.test.ts
      Note: Frontend runtime tests updated to match the read/select-only contract
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts
      Note: Frontend shared profile transport client edited to remove CRUD exports during implementation
ExternalSources: []
Summary: Chronological diary of the research, ticket setup, writing, and delivery work for APP-30.
LastUpdated: 2026-03-23T00:16:00-04:00
WhatFor: Capture the evidence-gathering, ticket creation, and delivery steps behind the APP-30 migration guide.
WhenToUse: Use when reviewing how APP-30 was assembled or when continuing the implementation from the research/design stage.
---





# Investigation diary

## Goal

Capture the research and documentation steps used to create the APP-30 migration ticket and the detailed intern-facing guide for moving `wesen-os` to Pinocchio bootstrap plus Geppetto engine-profile registries.

## Step 1: Investigate the current profile/bootstrap architecture and create the ticket workspace

The first part of the work was discovery. The user did not ask for a speculative plan; they asked for a ticket and a detailed guide grounded in the docs in `geppetto`, and specifically wanted `wesen-os` to load Pinocchio config and profile files rather than `wesen-os`-specific ones. That meant the main goal was to map the current architecture across repositories before writing any recommendations.

The workspace turned out to span more than one app. `wesen-os` itself contains the launcher, but the relevant profile/runtime behavior also lives in `pinocchio`, `geppetto`, `go-go-os-chat`, and the frontend workspace links. The main technical question was whether the migration was only an entrypoint change or a deeper domain migration. The answer, after reading the files, was that it is deeper: the launcher, shared resolver/composer package, backend component glue, and frontend profile API assumptions all still reflect the older mixed runtime profile model.

### Prompt Context

**User prompt (verbatim):** "Read the docs in geppetto and create a new ticket to bring wesen-os/ up to the new profiles and profile registry settings, and have it load the pinocchio config and profile files (not wesen-os ones). 

Create the docmgr ticket, keep a diary.

Then 

create a detailed analysis / design / implementation guide for the migration and which docs you found, that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a new docmgr ticket in this repo, read the current Geppetto and related docs/code, keep a diary, and produce a detailed intern-facing migration guide for bringing `wesen-os` onto the new Pinocchio/bootstrap plus engine-profile registry model, then validate and upload the bundle.

**Inferred user intent:** Establish an implementation-ready documentation artifact for a future migration, with enough context that a new engineer can understand the system boundaries and carry out the change safely.

### What I did

- Read the skill instructions for `ticket-research-docmgr-remarkable`, `docmgr`, and `diary`.
- Confirmed the docmgr root for this repo with:
  - `docmgr status --summary-only`
- Mapped the workspace layout and verified that `geppetto`, `pinocchio`, and `wesen-os` are sibling repositories in the current workspace.
- Read the highest-signal current docs and reference implementations:
  - `geppetto/README.md`
  - `geppetto/pkg/doc/topics/01-profiles.md`
  - `geppetto/pkg/doc/topics/13-js-api-reference.md`
  - `geppetto/pkg/sections/profile_sections.go`
  - `geppetto/pkg/cli/bootstrap/*.go`
  - `pinocchio/README.md`
  - `pinocchio/examples/js/README.md`
  - `pinocchio/pkg/doc/topics/webchat-profile-registry.md`
  - `pinocchio/cmd/web-chat/main.go`
  - `pinocchio/cmd/web-chat/profile_policy.go`
- Read the current `wesen-os` launcher and downstream dependencies:
  - `wesen-os/cmd/wesen-os-launcher/main.go`
  - `go-go-os-chat/pkg/profilechat/request_resolver.go`
  - `go-go-os-chat/pkg/profilechat/runtime_composer.go`
  - `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
  - `go-go-os-chat/pkg/chatservice/component.go`
  - `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
  - `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`
- Created the ticket:
  - `docmgr ticket create-ticket --ticket APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --title "Migrate wesen-os to Pinocchio config/bootstrap and engine-profile registries" --topics architecture,wesen-os,pinocchio,geppetto,profiles`
- Added the primary design doc and diary document:
  - `docmgr doc add --ticket APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --doc-type design-doc --title "Intern guide to migrating wesen-os to Pinocchio config and engine-profile registries"`
  - `docmgr doc add --ticket APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --doc-type reference --title "Investigation diary"`

### Why

- The migration target is defined by the newer Geppetto and Pinocchio docs, not by memory of the older mixed runtime profile system.
- The launcher code alone was insufficient, because the same domain is split across shared packages and the frontend.
- The frontend profile API assumptions are critical because they determine whether Pinocchio's shared read-oriented profile handlers are sufficient.

### What worked

- `docmgr status --summary-only` immediately clarified that the doc root for this repo is `openai-app-server/ttmp`, not the top-level `ttmp`.
- `geppetto/pkg/doc/topics/01-profiles.md` and `pinocchio/pkg/doc/topics/webchat-profile-registry.md` gave the clearest current-source statements of the new architecture.
- Reading `pinocchio/cmd/web-chat/main.go` and `profile_policy.go` provided a concrete implementation reference, not just conceptual docs.
- The frontend and integration tests proved that mutable profile CRUD is still part of the current `wesen-os` behavior.

### What didn't work

- I initially checked for a top-level `ttmp` directory and hit:

```text
find: ‘ttmp’: No such file or directory
```

- I initially searched `geppetto/docs`, but this repo stores docs under `geppetto/pkg/doc`, which produced:

```text
rg: geppetto/docs: No such file or directory (os error 2)
```

- I also checked whether `geppetto/pkg/profiles` still exists as a real package and got:

```text
rg: geppetto/pkg/profiles: IO error for operation on geppetto/pkg/profiles: No such file or directory (os error 2)
```

That failure was useful because it confirmed that downstream code importing the old path is operating against stale assumptions relative to the current Geppetto tree in this workspace.

### What I learned

- The correct architecture is already documented and implemented in Pinocchio; `wesen-os` is the lagging consumer.
- The migration is broader than "make launcher load a different YAML path."
- The largest compatibility risk is not config precedence. It is the mutable profile API surface still expected by the frontend and integration tests.

### What was tricky to build

- The tricky part was separating "new official architecture" from "current `wesen-os` behavior" because both coexist in the workspace.
- The old and new profile domains use similar words but different semantics:
  - old model: profile includes runtime behavior and engine settings
  - new model: engine profile controls engine settings; app owns runtime behavior
- The easiest mistake would have been to write a guide that only updates `main.go` and ignores `go-go-os-chat` and the frontend API contract. The repository evidence showed that would be incomplete.

### What warrants a second pair of eyes

- Whether the intended migration should preserve mutable profile CRUD long-term or whether the product wants a deliberate hard cut to read-only selection.
- Whether `go-go-os-chat` should be migrated in place or bypassed in favor of a more Pinocchio-like local resolver/composer package inside `wesen-os`.
- Whether runtime policy should always use `pinocchio.webchat_runtime@v1` or whether `wesen-os` needs an app-specific extension shape.

### What should be done in the future

- Implement the migration in phases starting with bootstrap ownership and profile type replacement.
- Make the mutable profile API decision explicit before changing backend handlers.
- Add regression tests for Pinocchio config/profile precedence in the launcher.

### Code review instructions

- Start with the design doc in this ticket.
- Then read the core evidence files in this order:
  - `geppetto/pkg/doc/topics/01-profiles.md`
  - `pinocchio/pkg/doc/topics/webchat-profile-registry.md`
  - `pinocchio/cmd/web-chat/profile_policy.go`
  - `wesen-os/cmd/wesen-os-launcher/main.go`
  - `go-go-os-chat/pkg/profilechat/request_resolver.go`
  - `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
- Validate that the guide's main claims are supported by those files.

### Technical details

- Ticket created:
  - `APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP`
- Ticket path:
  - `openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries`

## Step 2: Write the migration guide, relate the evidence, validate, and prepare delivery

The second part of the work was synthesis. After the evidence pass, the deliverable needed to be useful to a new intern, not just to someone already familiar with the code. That meant the guide had to explain the system boundaries first, then the gaps, then the implementation order, and only after that the file-by-file plan.

The design doc was therefore written around the ownership split between Pinocchio bootstrap, Geppetto engine profiles, and app-owned runtime policy. I also called out the mutable profile API compatibility issue explicitly because it is the one place where "follow Pinocchio" is not sufficient by itself. The rest of this step is the bookkeeping and delivery loop: relate the key files, run `docmgr doctor`, and bundle-upload to reMarkable.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Finish the ticket deliverable end to end: detailed doc, diary, doc bookkeeping, validation, and upload.

**Inferred user intent:** Produce a complete documentation package that can be consumed immediately, not a half-finished ticket stub.

### What I did

- Replaced the generated stubs in:
  - `index.md`
  - `tasks.md`
  - `changelog.md`
  - the primary design doc
  - this diary
- Structured the design doc around:
  - current-state architecture,
  - docs found,
  - gap analysis,
  - target architecture,
  - file-level migration phases,
  - pseudocode,
  - testing and risks.
- Preserved the evidence trail back to concrete files rather than writing speculative recommendations.
- Related the key evidence files to the design doc and diary with `docmgr doc relate`.
- Added missing vocabulary entries with:
  - `docmgr vocab add --category topics --slug geppetto --description "Geppetto engine/runtime architecture and APIs"`
  - `docmgr vocab add --category topics --slug profiles --description "Profile registries, selection, and runtime/profile contracts"`
- Attempted validation with:
  - `docmgr doctor --ticket APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --stale-after 30`
  - `docmgr validate frontmatter --doc /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/index.md --suggest-fixes`
- `docmgr validate frontmatter --doc /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/01-intern-guide-to-migrating-wesen-os-to-pinocchio-config-and-engine-profile-registries.md --suggest-fixes`
  - `docmgr validate frontmatter --doc /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/reference/01-investigation-diary.md --suggest-fixes`
- Performed reMarkable delivery with:
  - `remarquee status`
  - `remarquee cloud account --non-interactive`
  - `remarquee upload bundle --dry-run ...`
  - `remarquee upload bundle ...`
  - `remarquee cloud ls /ai/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --long --non-interactive`

### Why

- A migration guide is only actionable if the reader understands both the desired architecture and the current reality that must be changed.
- The ticket needed to explain not just "what to do" but "why this is the right boundary split now."

### What worked

- The prior GEPA-16 ticket was useful background because it framed the earlier fallback-path problem and reinforced why the config namespace matters.
- Pinocchio's web-chat command served as an excellent reference implementation to point the intern at.
- `docmgr validate frontmatter` passed for the ticket index, design doc, and diary after the vocabulary update.
- The reMarkable dry-run and real bundle upload both succeeded, and the remote listing showed the uploaded bundle in the expected directory.

### What didn't work

- `docmgr doctor --ticket APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --stale-after 30` crashed twice with:

```text
panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation code=0x1 addr=0x8 pc=0x137708b]
...
github.com/go-go-golems/docmgr/pkg/commands.(*DoctorCommand).RunIntoGlazeProcessor
...
```

- `docmgr validate frontmatter` against `changelog.md` fails because that file does not contain frontmatter, which is expected for the generated changelog file and was not the primary deliverable we needed to validate.

### What I learned

- The migration plan is much clearer when organized around ownership boundaries rather than repositories.
- The hardest part for a new engineer will be distinguishing engine-profile data from app-owned runtime data because the old system mixed them.
- The current `docmgr doctor` command in this environment has a tooling bug that needs a separate fix; it is not a ticket-content issue.

### What was tricky to build

- The main challenge was keeping the document detailed enough for onboarding without turning it into a changelog of every file in the workspace.
- I handled that by separating:
  - evidence sources,
  - current-state architecture,
  - implementation phases,
  - API/file references.

### What warrants a second pair of eyes

- The decision to hard-cut mutable profile CRUD should be reflected consistently in frontend, backend wrappers, and tests.
- Whether `go-go-os-chat` should be migrated in place or bypassed in favor of a more Pinocchio-like local resolver/composer package inside `wesen-os`.

### What should be done in the future

- Finish the ticket bookkeeping and upload evidence.
- If implementation starts, continue this diary with one step per migration slice.

### Code review instructions

- Review the design doc for completeness against the user request:
  - docs found
  - detailed analysis
  - design
  - implementation guide
  - prose + bullets + pseudocode + diagrams + API references + file references
- Confirm the guide mentions both:
  - Pinocchio config/profile loading,
  - frontend mutable profile API compatibility risk.

### Technical details

- Primary deliverable:
  - `design-doc/01-intern-guide-to-migrating-wesen-os-to-pinocchio-config-and-engine-profile-registries.md`
- Diary:
  - `reference/01-investigation-diary.md`
- Upload destination:
  - `/ai/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP`
- Upload verification:
  - `remarquee cloud ls /ai/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --long --non-interactive`
  - result: `[f] APP-30 wesen-os Pinocchio profile bootstrap`

## Step 3: Revise the plan after deciding to kill profile CRUD and produce an implementation checklist

After the initial research ticket was written, the user clarified the migration scope: keep it simple and kill profile CRUD for now. That changes the plan materially. The earlier design doc treated CRUD as a compatibility decision that still needed resolution; the new target is now explicit. The migration should hard-cut the write surface and align the system with Pinocchio's simpler shared read/select profile APIs.

This was a useful simplification because it removed one of the largest scope multipliers in the original analysis. Instead of preserving or rebuilding profile mutation infrastructure, the plan can now focus on four concrete changes: Pinocchio bootstrap in the launcher, `engineprofiles` migration in `go-go-os-chat`, app-owned runtime policy extensions, and removal of CRUD expectations from the frontend and integration tests.

### Prompt Context

**User prompt (verbatim):** "ok, we can kill the profile CRUD for now. Lte's keep it simple. Design a step by step detailed implementation plan, and create a detailed list of tasks to get there. commit."

**Assistant interpretation:** Revise APP-30 around the explicit decision to remove mutable profile CRUD, expand the design into a more operational implementation sequence, turn that into a phased task checklist, and commit the ticket updates.

**Inferred user intent:** Convert the earlier architecture analysis into a simpler, implementation-ready migration plan that reduces scope and can be handed directly to engineering work.

### What I did

- Rewrote the design doc so the selected migration path is now:
  - hard-cut mutable profile CRUD,
  - use Pinocchio bootstrap for config/profile discovery,
  - migrate `go-go-os-chat` to `engineprofiles`,
  - keep only read/select profile APIs.
- Expanded the implementation section into:
  - implementation phases,
  - a detailed step-by-step sequence,
  - a grouped engineering task breakdown.
- Replaced the old generic ticket tasks with a phased backlog covering frontend, backend, `go-go-os-chat`, launcher wiring, runtime policy, validation, and docs.
- Updated the diary to capture the scope reduction and the new plan.

### Why

- The earlier version of the ticket still left CRUD as an unresolved compatibility branch.
- Once CRUD was intentionally removed, the right ticket was no longer “analyze the options,” but “sequence the simplest viable migration.”

### What worked

- The simplified decision made the plan sharper. The backend target now matches the shared Pinocchio profile handler model instead of requiring extra mutation infrastructure.
- The task list became much easier to organize into phases because one entire branch of possible work disappeared.

### What didn't work

- No new technical blocker surfaced during this planning revision. The only existing tooling blocker remains the previously recorded `docmgr doctor` crash.

### What I learned

- The biggest source of ambiguity in the first version of the ticket was the unresolved CRUD compatibility branch.
- Once that branch was closed, the migration became a much more straightforward “bootstrap + domain migration + wrapper cleanup” plan.

### What was tricky to build

- The main challenge was not adding another abstract architecture section. The user asked for a concrete implementation plan, so the document had to move from “design reasoning” to “execution sequence.”
- I handled that by adding:
  - implementation phases,
  - step-by-step code migration order,
  - a grouped task breakdown tied to concrete files.

### What warrants a second pair of eyes

- Whether the hard-cut CRUD decision requires any additional product-facing notes in launcher/frontend docs before implementation starts.
- Whether `go-go-os-chat` should still be the long-term owner of the shared resolver/composer, even after its migration.

### What should be done in the future

- Start implementation with Phase A so CRUD expectations are removed before backend internals are reshaped.
- Continue the diary with one entry per implementation slice and include test commands/results.

### Code review instructions

- Review the updated design doc sections:
  - `Decision 3`
  - `Alternative C`
  - `Implementation Phases`
  - `Detailed Step-By-Step Implementation Plan`
  - `Detailed Task Breakdown`
- Confirm the task list now matches the simplified read/select-only profile strategy.

### Technical details

- Files updated in this revision:
  - `design-doc/01-intern-guide-to-migrating-wesen-os-to-pinocchio-config-and-engine-profile-registries.md`
  - `tasks.md`
  - `reference/01-investigation-diary.md`

## Step 4: Remove the frontend profile CRUD client surface and stale mutation examples

The first implementation slice was the frontend transport boundary. The user asked for task-by-task implementation with commits and a detailed diary, so I started with the smallest hard-cut that makes the new direction explicit: the shared `chat-runtime` profile client no longer exports create, update, delete, or set-default helpers. This was the right first slice because it removes the mutation contract at the API edge before touching deeper backend internals.

This step also confirmed that the runtime package did not have active product code depending on those write helpers. The remaining references were the helper implementations themselves, their tests, and one mock/example snippet in the apps-browser fixture. That made the first change a clean deletion rather than a behavioral rewrite.

### Prompt Context

**User prompt (verbatim):** "Alright, work on the tasks one by one, commit at appropriate intervals, keep a detailed diary as you work."

**Assistant interpretation:** Begin executing APP-30 in focused slices, commit each slice separately, and keep the ticket diary current as implementation proceeds.

**Inferred user intent:** Move from planning to real code changes while preserving a continuation trail that makes review and handoff straightforward.

**Commit (code):** `55f6845` — `refactor(chat-runtime): drop profile CRUD client paths`

### What I did
- Inspected the frontend profile client and its tests:
  - `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
  - `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.test.ts`
- Searched the frontend workspace for `createProfile`, `updateProfile`, `deleteProfile`, and `setDefaultProfile`.
- Removed the exported CRUD helpers from `profileApi.ts`.
- Removed the write-path tests from `profileApi.test.ts`.
- Updated the stale mock/example snippet in:
  - `wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/mocks/fixtures/apps.ts`
  so it no longer advertises profile creation.
- Ran:
  - `npm run test -w packages/chat-runtime`
- Staged only the three edited files and committed the frontend slice.

### Why
- The migration now explicitly rejects mutable profile CRUD.
- Removing the transport helpers early prevents new code from continuing to target endpoints that are supposed to disappear.
- This slice was low-risk because it was almost entirely deletion and did not depend on the deeper `engineprofiles` migration yet.

### What worked
- `rg` confirmed there were no remaining live package references to the write helpers after the deletion.
- `npm run test -w packages/chat-runtime` passed:

```text
Test Files  22 passed (22)
Tests  110 passed (110)
```

- The linked frontend repo accepted a focused commit after staging only the three intended files.

### What didn't work
- The first attempt to stage and commit the linked `go-go-os-frontend` worktree hit a git metadata path outside the writable root and failed with:

```text
fatal: Unable to create '/home/manuel/code/wesen/wesen-os/.git/worktrees/wesen-os1/modules/workspace-links/go-go-os-frontend/index.lock': Read-only file system
```

- That was an environment/worktree boundary issue, not a code problem. The commit succeeded once the git operation ran with access to the linked worktree metadata.

### What I learned
- The current frontend runtime package was already close to the desired read/select-only shape.
- The main frontend cleanup work for APP-30 is contract deletion and stale test/example cleanup, not a large UI rewrite.
- Linked worktrees in this workspace can make otherwise-routine git operations fail if the git metadata lives outside the active writable tree.

### What was tricky to build
- The tricky part was making sure I was cutting only obsolete mutation code and not silently breaking a real consumer.
- I approached that by tracing references with `rg` before editing, then deleting the transport helpers only after confirming the remaining call sites were tests and mock/example content. That let the first commit be intentionally surgical instead of speculative.

### What warrants a second pair of eyes
- The apps-browser fixture change is only a mock/example cleanup; if that fixture is treated as product documentation elsewhere, someone familiar with that flow should confirm the new example text is still representative.
- If any downstream repo imports these deleted functions from a released package rather than the local workspace, that will surface later as an integration/versioning concern rather than a local type error.

### What should be done in the future
- Remove backend and launcher tests that still assert profile mutation routes so the cross-repo contract matches the frontend cut.
- Continue into bootstrap and `engineprofiles` migration now that the transport layer no longer advertises writes.

### Code review instructions
- Start in `profileApi.ts` and confirm only the write helpers were removed.
- Then review `profileApi.test.ts` to confirm only mutation-focused tests disappeared and the read/list/schema tests still cover the remaining contract.
- Validate with:
  - `npm run test -w packages/chat-runtime`

### Technical details
- Searched with:
  - `rg -n "createProfile|updateProfile|deleteProfile|setDefaultProfile" ...`
- Files changed:
  - `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
  - `wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.test.ts`
  - `wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/mocks/fixtures/apps.ts`

## Step 5: Remove mutable profile expectations from the launcher integration contract

The next slice moved up one layer to the `wesen-os` launcher integration suite. After the frontend transport cut, the biggest remaining contradiction was in `main_integration_test.go`: the tests still asserted profile creation, update, deletion, set-default behavior, and legacy compatibility selectors. Those tests would keep the old contract alive even if the implementation was moved forward.

The user then clarified the migration philosophy even further: no backwards compatibility and no wrappers, this is new work. That made the edit direction straightforward. I removed the compatibility and mutation-oriented integration cases, renamed the main route test to a read-only contract check, and kept the explicit profile-selection tests that still matter in the new model.

### Prompt Context

**User prompt (verbatim):** "No backwards compatibility, no wrappers, this is new work."

**Assistant interpretation:** Do not preserve legacy selectors or mutation behavior just because the old system exposed them; cut the obsolete contract directly.

**Inferred user intent:** Optimize the migration for the clean target architecture, not for transitional compatibility scaffolding.

**Commit (code):** `963912c` — `test(wesen-os): drop mutable profile integration contract`

### What I did
- Inspected `wesen-os/cmd/wesen-os-launcher/main_integration_test.go` for:
  - CRUD endpoint assertions,
  - legacy current-profile route assertions,
  - legacy `registry_slug` selector assertions,
  - runtime-switch tests that depended on creating/updating profiles dynamically.
- Replaced `TestProfileAPI_CRUDRoutesAreMounted` with `TestProfileAPI_ReadRoutesAreMounted`.
- Removed the parts of the route test that created, patched, deleted, and set defaults on profiles.
- Rewrote the invalid-registry test so it checks only the surviving read contract.
- Removed the legacy registry selector test.
- Removed E2E cases that depended on runtime-created or runtime-mutated profiles.
- Removed helper functions that only existed to support those deleted tests.
- Ran:
  - `gofmt -w /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main_integration_test.go`
  - `go test ./cmd/wesen-os-launcher -run 'TestProfileAPI_ReadRoutesAreMounted|TestProfileAPI_InvalidRegistryReturnsBadRequest|TestProfileE2E_ExplicitProfileSelection_RuntimeKeyReflectsSelection|TestProfileE2E_ExplicitProfileChange_RebuildsInFlightConversationRuntime' -count=1`
- Committed only the integration test file.

### Why
- The launcher integration suite is the highest-leverage place to stop preserving the old mutation contract.
- Leaving these tests in place would force later code changes to either keep obsolete behavior or fight the test suite during the migration.
- Removing compatibility-route assertions early matches the explicit product direction and reduces future implementation noise.

### What worked
- The resulting test file now expresses the new desired contract more clearly:
  - read profile list,
  - read profile document,
  - reject invalid registry,
  - support explicit selection between existing profiles.
- `gofmt` completed cleanly.
- The focused commit in the `wesen-os` repo was isolated to one file.

### What didn't work
- The focused `go test` command failed before compiling the package because the current launcher code still imports a legacy package path that the module graph cannot resolve in this checkout:

```text
# github.com/go-go-golems/wesen-os/cmd/wesen-os-launcher
cmd/wesen-os-launcher/main.go:15:2: no required module provides package github.com/go-go-golems/geppetto/pkg/profiles; to add it:
	go get github.com/go-go-golems/geppetto/pkg/profiles
FAIL	github.com/go-go-golems/wesen-os/cmd/wesen-os-launcher [setup failed]
FAIL
```

- That is an expected migration blocker rather than a regression from the test cleanup. The codebase still has legacy `pkg/profiles` imports that must be replaced as part of later phases.

### What I learned
- The repository is already telling us where the next migration cut must happen: the launcher package cannot even compile cleanly against the current workspace until the legacy `pkg/profiles` dependency is removed.
- Test cleanup is useful not only for correctness but for revealing the real blocking dependency earlier.

### What was tricky to build
- The subtle part was distinguishing “selection behavior we still need” from “mutation/compatibility behavior we explicitly do not want anymore.”
- I handled that by keeping the tests that exercise existing profiles (`inventory`, `analyst`) and deleting the tests that manufactured new profiles or asserted legacy selector routes. That preserves user-relevant selection coverage without reintroducing compatibility scope through the test suite.

### What warrants a second pair of eyes
- Someone familiar with the intended runtime-debug coverage should confirm that deleting the planner/rebuilder mutation-based tests does not drop any independently valuable persistence assertions that should be reintroduced later using static Pinocchio profile fixtures.
- Once the launcher is migrated off `pkg/profiles`, these focused tests should be rerun to verify the new failures are gone and no hidden assumptions remain.

### What should be done in the future
- Begin the actual code migration in the launcher and `go-go-os-chat` so `pkg/profiles` disappears from the build graph.
- Reintroduce any necessary runtime-truth assertions later using fixed read-only profile fixtures instead of mutable profile creation flows.

### Code review instructions
- Review the diff in `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`.
- Confirm that the surviving tests align with the simplified contract:
  - read/list/get,
  - selection,
  - invalid registry rejection.
- Re-run `gofmt` and the focused `go test` command once the legacy import issue is fixed.

### Technical details
- Removed test coverage for:
  - create profile,
  - update profile,
  - delete profile,
  - set default profile,
  - legacy `registry_slug`,
  - legacy current-profile write route.
- Validation command and blocker:
  - `go test ./cmd/wesen-os-launcher -run 'TestProfileAPI_ReadRoutesAreMounted|TestProfileAPI_InvalidRegistryReturnsBadRequest|TestProfileE2E_ExplicitProfileSelection_RuntimeKeyReflectsSelection|TestProfileE2E_ExplicitProfileChange_RebuildsInFlightConversationRuntime' -count=1`
  - blocker: unresolved `github.com/go-go-golems/geppetto/pkg/profiles`

## Step 6: Remove backend write-option wiring and make read/select-only the shared contract

Once the frontend and launcher tests stopped defending profile mutation, I removed the remaining backend write-option plumbing. This was a contract-level cleanup across `go-go-os-chat`, `wesen-os`, and the inventory app: the shared chatservice no longer needs write handlers, and the app modules should stop pretending they exist.

This step was intentionally small and mechanical because it was clearing dead API surface, not introducing new profile behavior. The main goal was to make the shared modules accurately express the simplified contract before the deeper `engineprofiles` migration changed the internals.

### Prompt Context

**User prompt (verbatim):** "Alright, work on the tasks one by one, commit at appropriate intervals, keep a detailed diary as you work."

**Assistant interpretation:** Execute the migration in focused slices, commit each stable slice, and keep the APP-30 diary current as implementation progresses.

**Inferred user intent:** Get real migration work landed incrementally with a clean audit trail rather than a single large unreviewable change.

**Commit (code):** `aec4c62` / `e24ab59` / `293c0db` — `refactor(chatservice): drop profile write options` / `refactor(inventory): drop profile write options` / `refactor(wesen-os): drop profile write option wiring`

### What I did
- Removed `WriteActor` and `WriteSource` from `go-go-os-chat/pkg/chatservice/component.go`.
- Updated `wesen-os/pkg/assistantbackendmodule/module.go` so the assistant backend stops passing profile write dependencies into chatservice.
- Updated `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go` and `pkg/backendmodule/module.go` so inventory stops passing profile write dependencies as well.
- Removed the corresponding launcher wiring in `wesen-os/cmd/wesen-os-launcher/main.go`.
- Re-ran the immediate package tests around the simplified contract:
  - `go test ./pkg/chatservice -count=1`
  - `go test ./pkg/backendcomponent ./pkg/backendmodule -count=1`
  - `go test ./pkg/assistantbackendmodule -count=1`
- Committed the slices in the repos that own the affected code.

### Why
- The user explicitly decided there should be no backwards compatibility and no wrappers.
- Leaving write-option wiring in place would keep dead API assumptions alive even after the frontend and launcher tests stopped asserting mutable profile behavior.
- Removing the plumbing early shrank the surface area for the later resolver/composer migration.

### What worked
- The chatservice layer now exposes only the read/select profile contract that the product still wants.
- The app modules compiled cleanly with the write path deleted.
- The commit history now separates contract deletion from later behavior migration.

### What didn't work
- `go test ./pkg/assistantbackendmodule -count=1` initially still failed before the `profilechat` migration because `go-go-os-chat/pkg/profilechat/request_resolver.go` was importing the dead `github.com/go-go-golems/geppetto/pkg/profiles` package.
- That failure made it clear the real blocking dependency had already moved down into `profilechat`, not the module wiring that I had just cleaned up.

### What I learned
- The correct next step was not more launcher cleanup; it was migrating the shared resolver/composer package that sits underneath both apps.
- The shared API cut was still worth doing because it removed noise and confirmed that the remaining blocker was a true dependency issue, not stale option wiring.

### What was tricky to build
- The subtle part was touching three repos that all participate in the same chat backend contract without accidentally mixing in unrelated changes from the dirty worktrees.
- I handled that by staging only the exact component/module files in each repo and validating the narrowest packages that exercise the contract, so each commit stayed reviewable and independent.

### What warrants a second pair of eyes
- Reviewers should confirm that no downstream caller still expects `WriteActor` or `WriteSource` on the shared chatservice constructor.
- Someone familiar with the frontend routing should verify that there is no remaining UI path that still assumes profile mutation endpoints exist.

### What should be done in the future
- Migrate the shared resolver/composer layer off legacy mixed profiles so the read/select-only contract is backed by the new engine-profile runtime model.

### Code review instructions
- Start in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/chatservice/component.go` and confirm the write-option fields disappeared.
- Then review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go` and `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go` to confirm the call sites stopped wiring write dependencies.
- Validate with:
  - `go test ./pkg/chatservice ./pkg/profilechat -count=1` in `go-go-os-chat`
  - `go test ./pkg/backendcomponent ./pkg/backendmodule ./pkg/pinoweb -count=1` in `go-go-app-inventory`
  - `go test ./pkg/assistantbackendmodule -count=1` in `wesen-os`

### Technical details
- Files changed in this slice:
  - `go-go-os-chat/pkg/chatservice/component.go`
  - `wesen-os/pkg/assistantbackendmodule/module.go`
  - `wesen-os/cmd/wesen-os-launcher/main.go`
  - `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go`
  - `wesen-os/workspace-links/go-go-app-inventory/pkg/backendmodule/module.go`

## Step 7: Migrate `profilechat` and inventory `pinoweb` to `engineprofiles` plus Pinocchio runtime extensions

This was the first real behavior migration. The shared `profilechat` package was still built around `geppetto/pkg/profiles`, mixed engine/runtime profile semantics, and `step_settings_patch`. That package sits on the critical path for both the assistant app and the inventory app, so it had to move before the launcher bootstrap work could even be compiled cleanly.

I treated this as new work, not a compatibility layer. The resolver now selects an engine profile, merges resolved inference settings, decodes app runtime policy from the Pinocchio runtime extension, and hands the composer a split model instead of the old mixed runtime object. Inventory’s thin wrappers and tests were then aligned to the same contract.

### Prompt Context

**User prompt (verbatim):** "continue"

**Assistant interpretation:** Continue executing the migration from the current checkpoint instead of stopping at the planning/docs stage.

**Inferred user intent:** Keep shipping the implementation slices in order until the ticket is materially advanced, with validation and diary updates after each stable checkpoint.

**Commit (code):** `18f9efc` / `0718893` — `refactor(profilechat): resolve engine profiles with pinocchio runtime` / `refactor(pinoweb): align inventory runtime wrappers with engine profiles`

### What I did
- Replaced `geppetto/pkg/profiles` imports with `geppetto/pkg/engineprofiles` in `go-go-os-chat/pkg/profilechat/request_resolver.go`.
- Added resolver-local conversation planning types so `profilechat` can keep engine settings, runtime policy, fingerprinting, and metadata separate.
- Reworked request resolution to:
  - select a registry slug and engine-profile slug,
  - call `ResolveEngineProfile(...)`,
  - merge resolved settings with any base inference settings,
  - decode runtime policy with `pinocchio/pkg/inference/runtime`,
  - return `ResolvedInferenceSettings` plus `ResolvedRuntime`.
- Reworked the runtime composer to consume resolved inference settings directly, drop `step_settings_patch`, normalize middleware inputs through `middlewarecfg`, and fingerprint the new split model.
- Updated `go-go-os-chat` resolver/composer tests to use `engineprofiles.EngineProfileRegistry`, `infruntime.ProfileRuntime`, and resolved inference settings fixtures.
- Updated the inventory `pinoweb` middleware definitions, wrapper signatures, and tests to use the new runtime middleware types and split-model expectations.
- Ran:
  - `go test ./pkg/profilechat -count=1`
  - `go test ./pkg/pinoweb -count=1`
  - `go test ./pkg/chatservice ./pkg/profilechat -count=1`
  - `go test ./pkg/backendcomponent ./pkg/backendmodule ./pkg/pinoweb -count=1`
  - `go test ./pkg/assistantbackendmodule -count=1`
- Committed the shared package first, then the inventory adapter repo.

### Why
- The launcher package could not be migrated cleanly while the shared backend still imported a deleted legacy profile package.
- `profilechat` is the actual abstraction boundary between app-facing modules and Pinocchio runtime composition, so this is where the old mixed-profile assumptions had to be removed.
- Cutting directly to the split engine-settings/runtime-policy model matches the target architecture described in the APP-30 design doc.

### What worked
- `go-go-os-chat/pkg/profilechat` now resolves engine profiles using the current `engineprofiles` API.
- Runtime composition now builds from `ResolvedInferenceSettings` and Pinocchio runtime extensions instead of mutating step settings with a patch map.
- Inventory’s wrapper layer stayed thin and continued to validate cleanly once its types and tests were updated.
- The `wesen-os` assistant module test now passes again, which means the shared contract is viable for the next launcher-bootstrap step.

### What didn't work
- The first validation boundary exposed that inventory tests were still importing the removed legacy profile package, so the adapter repo had to be migrated in the same slice rather than deferred.
- That was a dependency-alignment issue, not a design change, but it confirmed that the `profilechat` cutover had to include immediate consumer test updates.

### What I learned
- The real migration seam is `profilechat`, not the launcher.
- Once `profilechat` speaks in terms of engine profiles and runtime extensions, the remaining launcher work becomes bootstrap/config wiring instead of a package-resurrection exercise.
- The inventory app is close enough to the shared abstraction that its wrappers should stay minimal and follow the shared types directly.

### What was tricky to build
- The hard part was preserving the old externally visible read/select behavior while deleting the internal mixed-profile model underneath it.
- The approach that worked was to build an explicit local conversation plan type in the resolver, then translate that into the Pinocchio request struct only at the boundary. That kept the migration coherent and prevented the composer from re-deriving state from half-updated legacy fields.

### What warrants a second pair of eyes
- The runtime fingerprint format changed materially because it now reflects resolved inference settings and normalized middleware uses rather than the old mixed runtime payload. Reviewers should confirm there are no hidden consumers that persisted or compared the old fingerprint shape.
- The resolver currently hard-rejects legacy `runtime_key`, `registry_slug`, and `request_overrides`; someone familiar with any external API clients should confirm that hard cut is acceptable under the new product direction.

### What should be done in the future
- Move directly into launcher bootstrap/config migration so `wesen-os` resolves its base inference settings and profile registries from Pinocchio-owned config and profile files.
- Replace the remaining launcher-owned built-in profiles with real Pinocchio profile fixtures.

### Code review instructions
- Start in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go` and review the new `ResolveEngineProfile(...)` flow plus runtime-extension decode.
- Then review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/runtime_composer.go` and confirm the composer consumes `ResolvedInferenceSettings` rather than `step_settings_patch`.
- Finally review the thin inventory alignment in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/runtime_composer.go` and `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/middleware_definitions.go`.
- Validate with:
  - `go test ./pkg/chatservice ./pkg/profilechat -count=1`
  - `go test ./pkg/backendcomponent ./pkg/backendmodule ./pkg/pinoweb -count=1`
  - `go test ./pkg/assistantbackendmodule -count=1`

### Technical details
- Files changed in this slice:
  - `go-go-os-chat/pkg/profilechat/request_resolver.go`
  - `go-go-os-chat/pkg/profilechat/request_resolver_test.go`
  - `go-go-os-chat/pkg/profilechat/runtime_composer.go`
  - `go-go-os-chat/pkg/profilechat/runtime_composer_test.go`
  - `wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/middleware_definitions.go`
  - `wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/request_resolver_test.go`
  - `wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/runtime_composer.go`
  - `wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/runtime_composer_test.go`

## Step 8: Add an explicit default engine-profile selection path to the shared strict resolver

The launcher migration needed one small shared capability before it could be implemented cleanly: a way to say “when a request does not specify `profile`, use this engine-profile slug as the default.” The existing strict resolver already knew how to reject legacy selectors and resolve explicit engine-profile slugs, but it had no first-class concept of a configured default profile other than “whatever the registry default happens to be.”

I added that capability directly to `go-go-os-chat/pkg/profilechat` instead of inventing a launcher-only wrapper. That keeps the behavior inside the shared request-resolution boundary, which is where it belongs, and lets the launcher express an operator-selected default inventory profile without reintroducing old `runtime_key` semantics.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Continue landing the migration slices needed to make the launcher read Pinocchio profile settings from the new stack instead of relying on in-memory defaults.

**Inferred user intent:** Keep the implementation moving forward, even if one slice requires a small shared-package capability first.

**Commit (code):** `6eae647` — `feat(profilechat): support configured default profile selection`

### What I did
- Added `defaultProfileSlug` to `StrictRequestResolver`.
- Added `WithDefaultProfileSelection(...)` so callers can configure a fallback engine-profile slug.
- Changed `resolveProfileSelection(...)` so it returns that configured default slug when the request body and query omit `profile`.
- Added a unit test proving that a resolver configured with `analyst` resolves `analyst` when the request contains no explicit profile selector.
- Ran:
  - `gofmt -w pkg/profilechat/request_resolver.go pkg/profilechat/request_resolver_test.go`
  - `go test ./pkg/profilechat -count=1`

### Why
- The launcher needs to honor a selected default inventory profile from Pinocchio config/CLI without making every request carry `profile=...`.
- The registry default alone was not enough because the launcher wants inventory to default to `inventory`, assistant to default to `assistant`, and operator-selected inventory defaults to override only the inventory side.
- Adding this as a shared resolver feature is cleaner than rebuilding selection policy outside the resolver.

### What worked
- The change was small and isolated to the shared resolver.
- Existing explicit-selection behavior stayed intact.
- The new test locks in the intended fallback behavior before the launcher starts relying on it.

### What didn't work
- N/A

### What I learned
- The right abstraction for “launcher-selected default profile” is a resolver option, not a registry mutation.
- This keeps the registry file authoritative while still letting different app surfaces use different defaults from the same registry stack.

### What was tricky to build
- The subtle part was keeping the new behavior constrained to the “no explicit profile in request” case.
- I handled that by changing only the empty-selector branch in `resolveProfileSelection(...)`; explicit request body/query selectors still pass through the same validation and error paths as before.

### What warrants a second pair of eyes
- Reviewers should confirm that no other caller was relying on “empty request profile means registry default only” as a hard invariant.
- Someone familiar with Pinocchio webchat may want to decide later whether this same option should exist on the canonical Pinocchio-side resolver as well.

### What should be done in the future
- Use this new resolver capability in the launcher so inventory defaults can come from Pinocchio profile selection precedence while assistant remains pinned to `assistant`.

### Code review instructions
- Review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go`.
- Confirm that `WithDefaultProfileSelection(...)` only affects requests with no explicit `profile`.
- Validate with:
  - `go test ./pkg/profilechat -count=1`

### Technical details
- New API:
  - `(*StrictRequestResolver).WithDefaultProfileSelection(profileSlug gepprofiles.EngineProfileSlug)`
- New coverage:
  - `TestStrictRequestResolver_UsesConfiguredDefaultProfileSelectionWhenRequestOmitsProfile`

## Step 9: Replace launcher-owned mixed profiles with Pinocchio bootstrap and file-backed engine-profile registries

This was the main launcher cutover. I removed the old built-in `wesen-os` profile definitions from `main.go`, replaced them with a launcher-local Pinocchio bootstrap helper, and rewired the launcher and integration tests so they load file-backed engine-profile registries instead of manufacturing profile structs in memory.

The important shift is that `wesen-os` is no longer the source of truth for profile data. It now resolves hidden base inference settings from Pinocchio config/env/defaults, resolves profile registry sources from Pinocchio profile settings with the expected precedence, falls back to `${XDG_CONFIG_HOME:-~/.config}/pinocchio/profiles.yaml` when appropriate, and uses those loaded registries for both the inventory and assistant app modules.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Continue the real migration work and land the launcher-bootstrap replacement rather than stopping after shared-package cleanup.

**Inferred user intent:** Get `wesen-os` onto the new Pinocchio config/profile bootstrap path end-to-end, with tests proving the new precedence and read/select behavior.

**Commit (code):** `b75ffa2` — `refactor(wesen-os): bootstrap launcher from pinocchio profiles`

### What I did
- Added `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`.
  - `resolveLauncherProfileBootstrap(...)` now:
    - calls `profilebootstrap.ResolveBaseInferenceSettings(...)`,
    - calls `profilebootstrap.ResolveCLIProfileSelection(...)`,
    - applies a launcher-local fallback to `${XDG_CONFIG_HOME:-~/.config}/pinocchio/profiles.yaml` if no registry sources were set explicitly,
    - opens a `geppetto/pkg/engineprofiles` chained registry,
    - parses the selected engine-profile slug,
    - returns the loaded registry plus base settings and config-file trace.
- Rewrote `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go` to:
  - import `pkg/engineprofiles` instead of the deleted legacy profile package,
  - remove `newInMemoryProfileService(...)`,
  - remove the built-in inventory/analyst/planner/assistant profile definitions,
  - wire the loaded Pinocchio registry into both inventory and assistant modules,
  - pass `WithBaseInferenceSettings(...)` into both request resolvers,
  - use `WithDefaultProfileSelection("inventory")` for inventory and `WithDefaultProfileSelection("assistant")` for assistant,
  - override the inventory default with the selected launcher profile when the operator selected a non-assistant profile.
- Added focused bootstrap tests in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test.go` covering:
  - `--profile` / `--profile-registries`,
  - config-file driven `profile-settings`,
  - `PINOCCHIO_*` env precedence,
  - default `~/.config/pinocchio/profiles.yaml` fallback.
- Added file-backed profile fixtures in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test_helpers_test.go`.
- Reworked `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main_integration_test.go` so the integration server and websocket tests use the new file-backed bootstrap helper instead of in-memory profiles.
- Ran:
  - `gofmt -w cmd/wesen-os-launcher/main.go cmd/wesen-os-launcher/main_integration_test.go cmd/wesen-os-launcher/profile_bootstrap.go cmd/wesen-os-launcher/profile_bootstrap_test.go cmd/wesen-os-launcher/profile_bootstrap_test_helpers_test.go`
  - `go test ./cmd/wesen-os-launcher -run 'TestResolveLauncherProfileBootstrap_' -count=1 -v -timeout 30s`
  - `go test ./cmd/wesen-os-launcher -run 'TestProfileAPI_ReadRoutesAreMounted|TestAssistantProfilesEndpoint_ListsAssistantProfile|TestChatHandler_PassesProfileDefaultMiddlewaresToRuntimeComposer' -count=1 -v -timeout 30s`
  - `go test ./cmd/wesen-os-launcher -run 'TestProfileE2E_ExplicitProfileSelection_RuntimeKeyReflectsSelection|TestProfileE2E_ExplicitProfileChange_RebuildsInFlightConversationRuntime' -count=1 -v -timeout 30s`
  - `go test ./cmd/wesen-os-launcher -count=1 -timeout 90s`
  - `go test ./pkg/assistantbackendmodule -count=1`

### Why
- The launcher could not keep shipping built-in mixed profiles and still claim that Pinocchio config/profile files were authoritative.
- Removing the built-in profiles was necessary to make the migration real rather than cosmetic.
- The focused bootstrap tests were needed because the new behavior depends on precedence rules, not just type conversions.

### What worked
- The launcher package now compiles and tests cleanly without importing `github.com/go-go-golems/geppetto/pkg/profiles`.
- Pinocchio config/env/profile precedence is now under test in the launcher package.
- The read/select integration tests still pass when the profiles come from file-backed registries instead of in-memory Go structs.
- The assistant module package test still passes after the launcher switched to the new bootstrap path.

### What didn't work
- My first file-backed YAML fixture used `default_profile_slug`, and the engine-profile loader rejected it immediately:

```text
validation error (registry.default_profile_slug): engine profile YAML does not support default_profile_slug; use profile slug "default"
```

- That error came from:
  - `go test ./cmd/wesen-os-launcher -run 'TestResolveLauncherProfileBootstrap_|TestProfileAPI_ReadRoutesAreMounted|TestAssistantProfilesEndpoint_ListsAssistantProfile|TestChatHandler_PassesProfileDefaultMiddlewaresToRuntimeComposer|TestProfileE2E_ExplicitProfileSelection_RuntimeKeyReflectsSelection|TestProfileE2E_ExplicitProfileChange_RebuildsInFlightConversationRuntime' -count=1`
- The fix was to remove `default_profile_slug` from the YAML fixture and make the launcher set the inventory default explicitly through `WithDefaultProfileSelection("inventory")`.

- After that, `TestChatHandler_PassesProfileDefaultMiddlewaresToRuntimeComposer` started timing out at 30 seconds because the test runtime stub was writing to a too-small capture channel while the chat loop composed more than once. The timed-out command was:

```text
go test ./cmd/wesen-os-launcher -run 'TestProfileAPI_ReadRoutesAreMounted|TestAssistantProfilesEndpoint_ListsAssistantProfile|TestChatHandler_PassesProfileDefaultMiddlewaresToRuntimeComposer' -count=1 -v -timeout 30s
```

- The fix was to make the capture send non-blocking in the test stub.

### What I learned
- The YAML registry format is stricter than the old in-memory registry construction path; loader validation surfaces assumptions immediately.
- Explicit resolver defaults are the clean way to preserve per-app behavior when multiple app surfaces share one registry stack.
- The launcher integration tests were already close to the new architecture once the bootstrap source changed from in-memory structs to file-backed registries.

### What was tricky to build
- The hardest part was preserving the old user-facing app defaults while removing the launcher’s ownership of profile definitions.
- I solved that by separating two concerns:
  - the registry file remains authoritative for profile data,
  - the launcher configures per-app fallback selection policy (`inventory` vs `assistant`) at the request resolver boundary.
- That keeps the bootstrap path honest without forcing every app surface to share the same default profile slug.

### What warrants a second pair of eyes
- Reviewers should confirm that using a single shared registry stack for both inventory and assistant is acceptable for the current product scope, especially because the assistant profile API can now list more than one profile.
- Someone familiar with operator UX should confirm the default `~/.config/pinocchio/profiles.yaml` fallback is the intended launcher behavior and not just the intended CLI behavior.

### What should be done in the future
- Move the remaining inventory/assistant runtime-policy defaults fully into real profile files or document the intentional code-owned defaults that remain.
- Add launcher/operator docs that explain the new Pinocchio config/profile source of truth and the expected file locations.

### Code review instructions
- Start with `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go`.
- Then review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go` to confirm the built-in profile registry is gone.
- Then review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test.go` and `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main_integration_test.go` to confirm the precedence and integration coverage.
- Validate with:
  - `go test ./cmd/wesen-os-launcher -count=1 -timeout 90s`
  - `go test ./pkg/assistantbackendmodule -count=1`

### Technical details
- New launcher bootstrap helper:
  - `resolveLauncherProfileBootstrap(ctx, parsed)`
- New focused tests:
  - `TestResolveLauncherProfileBootstrap_UsesCLIProfileSelectionAndRegistries`
  - `TestResolveLauncherProfileBootstrap_UsesConfigFileProfileSettingsAndBaseInferenceSettings`
  - `TestResolveLauncherProfileBootstrap_UsesPINOCCHIOEnvOverrides`
  - `TestResolveLauncherProfileBootstrap_FallsBackToDefaultPinocchioProfilesPath`

## Step 10: Replace generated inline profile YAML with a checked-in Pinocchio fixture

After the launcher bootstrap landed, the tests were still building their profile registry YAML inline inside a Go helper. That worked, but it was a poor long-term artifact for this migration because it hid the actual profile-file shape inside a string template. Since one of the remaining APP-30 tasks was to add/update sample Pinocchio profile files used by tests, I converted that helper to copy a checked-in fixture from `testdata`.

This is a small step, but it matters for reviewability. The repository now contains an explicit sample Pinocchio profile registry file showing the runtime extension contract that `wesen-os` expects, rather than burying that contract inside generated test strings.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Keep pushing the migration forward in small, reviewable commits and record each one clearly in the ticket diary.

**Inferred user intent:** Make the migration artifacts concrete, not just executable, so future readers and reviewers can see what a valid Pinocchio profile file looks like for `wesen-os`.

**Commit (code):** `4b722e7` — `test(wesen-os): add pinocchio profile fixture`

### What I did
- Added `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`.
- Moved the inventory, analyst, planner, and assistant runtime-policy examples into that fixture using `pinocchio.webchat_runtime@v1`.
- Simplified `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test_helpers_test.go` so it copies the checked-in fixture into temp directories instead of generating YAML inline.
- Ran:
  - `gofmt -w cmd/wesen-os-launcher/profile_bootstrap_test_helpers_test.go`
  - `go test ./cmd/wesen-os-launcher -count=1 -timeout 90s`

### Why
- A checked-in fixture is easier to inspect, reuse, and update than a generated YAML string in test code.
- The runtime extension contract for `wesen-os` should be visible as data, not only as code.
- This closes one of the migration tasks around sample Pinocchio profile files used by tests.

### What worked
- The launcher package test suite still passed unchanged after the helper switched from generated YAML to a copied fixture.
- The checked-in file now serves as a concrete reference for how inventory and assistant runtime policy should look in a real Pinocchio profile registry.

### What didn't work
- N/A

### What I learned
- Once the bootstrap loader was working, moving from generated fixtures to checked-in fixtures was low-risk and high-value.
- The runtime-extension contract becomes much easier to review when it is represented in an actual YAML file.

### What was tricky to build
- The only subtlety was preserving the temp-directory behavior needed by the fallback and precedence tests while still centralizing the fixture content.
- I handled that by keeping the helper responsible for copying the fixture into a temp path, so the tests still control exact file locations without duplicating the YAML content.

### What warrants a second pair of eyes
- Reviewers should confirm that the checked-in fixture captures the intended runtime policy for all four launcher-facing profiles and does not drift from operator expectations.

### What should be done in the future
- Reuse this checked-in fixture shape, or a variant of it, in any future operator docs or smoke tests that need a known-good Pinocchio profile registry for `wesen-os`.

### Code review instructions
- Review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`.
- Then review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test_helpers_test.go` to confirm the helper now copies the fixture rather than building YAML inline.
- Validate with:
  - `go test ./cmd/wesen-os-launcher -count=1 -timeout 90s`

### Technical details
- Fixture path:
  - `cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml`
- Updated helper:
  - `writeIntegrationPinocchioProfiles(...)`

## Step 11: Document the final launcher contract and write the implementation postmortem

Once the code path was stable, the remaining work was no longer about changing behavior. It was about making the new behavior understandable. The launcher had moved to Pinocchio bootstrap, the shared resolver had moved to `engineprofiles`, and the CRUD cut had already simplified the profile API surface. What was still missing was an operator-facing explanation in `wesen-os` itself and a maintainers' postmortem in the ticket that explained why the migration happened in this order.

This step closed that gap. I updated the `wesen-os` guide so operators can understand where profiles now come from, how precedence works, and what remains a code fallback. Then I wrote a detailed postmortem for a new intern that explains the system map, ownership boundaries, migration slices, failure cases, validation results, and the remaining risks.

### Prompt Context

**User prompt (verbatim):** "go ahead, then write a detailed postmortem.

Create a detailed analysis / postmortem that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Finish the remaining migration/documentation tasks, then produce a detailed intern-facing postmortem and store it in APP-30 before uploading the updated bundle.

**Inferred user intent:** Leave behind a complete handoff package that explains both the final architecture and the implementation journey, so a new maintainer can extend or debug the system without rediscovering the same boundaries and mistakes.

**Commit (code):** `b7c7f70` — `docs(wesen-os): document pinocchio launcher profile bootstrap`

### What I did
- Updated `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/doc/topics/01-wesen-os-guide.md` with:
  - profile-registry source precedence,
  - selected-profile precedence,
  - shared registry plus app-specific fallback selection behavior,
  - the `pinocchio.webchat_runtime@v1` runtime extension contract,
  - the checked-in sample profile fixture path,
  - the distinction between authoritative profile data and launcher-owned fallback defaults.
- Added clarifying comments in `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go` so future readers see that the code-owned prompts/tools are fallbacks, not the primary source of runtime truth.
- Wrote `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/02-implementation-postmortem.md`.
- Updated the APP-30 ticket index and changelog to link the postmortem and record the actual `wesen-os` documentation commit hash.
- Re-ran:
  - `go test ./cmd/wesen-os-launcher -count=1 -timeout 90s`
  - `docmgr validate frontmatter --doc /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/02-implementation-postmortem.md --suggest-fixes`

### Why
- The migration changed architectural ownership, not just code paths, so the repository needed docs that explain those ownership boundaries plainly.
- A future maintainer should not have to reverse-engineer profile precedence or runtime-extension semantics from tests and resolver code.
- The postmortem is the place to capture the real sequence of changes, the mistakes encountered, and the reasoning behind the final simplified design.

### What worked
- The `wesen-os` guide now matches the actual launcher bootstrap code and the checked-in test fixture.
- The postmortem provides a single place where a new intern can learn the old model, the new model, the migration order, and the concrete files involved.
- The small comments in `main.go` reduce the chance that someone later treats launcher fallbacks as the primary source of truth.

### What didn't work
- `docmgr doctor --ticket APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --stale-after 30` was still not clean earlier in the ticket lifecycle because the command crashed in this environment with a nil-pointer panic. I did not mark that task complete, and the postmortem still calls it out as an unresolved tooling issue rather than a migration failure.

### What I learned
- The final migration artifacts are much easier to trust when the operator docs, sample fixture, integration tests, and postmortem all tell the same story.
- Even "docs-only" follow-up work can materially reduce future regressions when the system has subtle ownership boundaries like this one.

### What was tricky to build
- The tricky part was describing fallback behavior precisely without accidentally implying that `wesen-os` still owns the primary profile registry.
- I handled that by writing the docs around an explicit hierarchy:
  - Pinocchio profile files and selected profile settings are authoritative,
  - `go-go-os-chat` resolves those engine profiles and runtime extensions,
  - `wesen-os` keeps only app-level default selection plus narrow runtime fallbacks when the extension is absent.
- That framing keeps the docs aligned with the code and avoids sliding back into the old mixed-profile mental model.

### What warrants a second pair of eyes
- Someone familiar with operator workflows should review the new launcher guide to confirm the precedence explanation matches how they expect to configure `wesen-os` in practice.
- Someone familiar with Pinocchio docs should confirm the `pinocchio.webchat_runtime@v1` explanation stays aligned if the shared runtime schema evolves.

### What should be done in the future
- Finish the reMarkable upload and record the final remote verification in this diary and the ticket changelog.
- If `docmgr doctor` is fixed upstream, rerun it for APP-30 and close the remaining ticket hygiene task.

### Code review instructions
- Start with `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/doc/topics/01-wesen-os-guide.md`.
- Then inspect `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/02-implementation-postmortem.md`.
- Then review `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go` and `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go` to confirm the docs match the code.
- Validate with:
  - `go test ./cmd/wesen-os-launcher -count=1 -timeout 90s`
  - `docmgr validate frontmatter --doc /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/02-implementation-postmortem.md --suggest-fixes`

### Technical details
- `wesen-os` operator-guide commit:
  - `b7c7f70`
- New postmortem doc:
  - `design-doc/02-implementation-postmortem.md`
- Remaining unresolved hygiene item:
  - `docmgr doctor --ticket APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --stale-after 30`

## Step 12: Upload the final APP-30 bundle to reMarkable and verify the remote listing

The last step was delivery. By this point the ticket already contained the original migration guide, the diary, and the new implementation postmortem. The right final action was to publish an updated bundle to reMarkable without overwriting the earlier research upload, so both the original design bundle and the new postmortem package remain available under the same ticket folder.

I used a distinct bundle name for the second upload to avoid destructive replacement. That preserves the earlier document while making the new postmortem package easy to find. The remote listing now shows both documents in `/ai/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP`.

### Prompt Context

**User prompt (verbatim):** (same as Step 11)

**Assistant interpretation:** Package the final APP-30 docs, upload them to reMarkable, and verify that the uploaded document is actually present in the expected remote folder.

**Inferred user intent:** Finish the handoff loop completely so the ticket exists in both the repo and the external reading surface used for review.

### What I did
- Confirmed tooling and auth with:
  - `remarquee status`
  - `remarquee cloud account --non-interactive`
- Dry-ran the bundle upload with:
  - `remarquee upload bundle --dry-run /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/index.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/01-intern-guide-to-migrating-wesen-os-to-pinocchio-config-and-engine-profile-registries.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/02-implementation-postmortem.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/reference/01-investigation-diary.md --name "APP-30 wesen-os Pinocchio migration postmortem" --remote-dir "/ai/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP" --toc-depth 2`
- Performed the real upload with the same arguments, without `--dry-run`.
- Verified the remote directory with:
  - `remarquee cloud ls /ai/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --long --non-interactive`

### Why
- The user explicitly asked for the ticket contents to be uploaded to reMarkable.
- A dry run first is the safest way to verify bundle composition and remote path before generating and uploading the PDF.
- Using a new bundle name avoids overwriting prior uploads and preserves review history.

### What worked
- `remarquee status` and `remarquee cloud account --non-interactive` both succeeded immediately.
- The dry run showed the expected four input documents and the intended remote directory.
- The upload completed successfully.
- The remote listing confirmed both:
  - `APP-30 wesen-os Pinocchio migration postmortem`
  - `APP-30 wesen-os Pinocchio profile bootstrap`

### What didn't work
- N/A

### What I learned
- Keeping the original and updated bundles side by side is a better review workflow than overwriting the original upload, because readers can compare the initial design artifact with the final postmortem package.

### What was tricky to build
- The main subtlety was choosing between overwrite and additive upload behavior.
- I deliberately chose an additive upload with a distinct document name because the skill guidance treats overwrite as destructive, and the user did not ask to replace the earlier PDF.

### What warrants a second pair of eyes
- N/A

### What should be done in the future
- If the ticket is revised again, continue using distinct bundle names unless there is a deliberate decision to replace an existing reMarkable document.

### Code review instructions
- Review the bundle inputs in:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/index.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/01-intern-guide-to-migrating-wesen-os-to-pinocchio-config-and-engine-profile-registries.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/02-implementation-postmortem.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/reference/01-investigation-diary.md`
- Re-run:
  - `remarquee cloud ls /ai/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --long --non-interactive`

### Technical details
- Remote directory:
  - `/ai/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP`
- Uploaded document name:
  - `APP-30 wesen-os Pinocchio migration postmortem`
