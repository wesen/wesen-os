---
Title: 'Research diary: repo split architecture'
Ticket: GEPA-09-REPO-SPLIT-ARCHITECTURE
Status: active
Topics:
    - architecture
    - go-go-os
    - frontend
    - inventory-chat
    - gepa
    - plugins
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: go-go-gepa/go.mod
      Note: GEPA dependency baseline
    - Path: go-go-os/README.md
      Note: Monorepo architecture baseline used in diary evidence
    - Path: go-go-os/go-inventory-chat/go.mod
      Note: Backend dependency baseline
    - Path: go-go-os/package.json
      Note: Build workflow and coupling evidence
ExternalSources: []
Summary: Chronological research log for the repository split design, including v2 rename to wesen-os and go-go-app-inventory plus command evidence and task planning.
LastUpdated: 2026-02-27T19:25:00-05:00
WhatFor: Provide continuation context and audit trail for how the repository split design was produced.
WhenToUse: Use when continuing implementation planning, reviewing assumptions, or retracing source evidence.
---


# Research diary: repo split architecture

## Goal

Produce a deep, implementation-ready research document (10+ pages) that defines:

1. how to split into three repos,
2. how the final dependency graph should work,
3. what APIs/contracts each repo should expose,
4. how composition repo startup and runtime initialization should behave,
5. with an explicit no-backwards-compatibility migration approach.

## Context snapshot

The working tree already contained prior GEPA and OS integration work under tickets `GEPA-07` and `GEPA-08`. The new ask was specifically repository architecture and operational split, not immediate code refactor.

Primary source roots used:

- `go-go-os/`
- `go-go-os/go-inventory-chat/`
- `go-go-gepa/`
- `go-go-gepa/ttmp/` for ticket docs and storage

No external internet sources were used because this was an internal architecture analysis tied to local repository contracts.

## Chronological log

## Phase 1: ticket and workspace setup

Commands run:

```bash
docmgr status --summary-only
docmgr ticket list
docmgr ticket create-ticket --ticket GEPA-09-REPO-SPLIT-ARCHITECTURE --title "Repository split architecture for go-go-os, inventory chat, and GEPA composition" --topics architecture,go-go-os,frontend,inventory-chat,gepa,plugins
docmgr doc add --ticket GEPA-09-REPO-SPLIT-ARCHITECTURE --doc-type design-doc --title "Repository split blueprint and implementation roadmap"
docmgr doc add --ticket GEPA-09-REPO-SPLIT-ARCHITECTURE --doc-type reference --title "Research diary: repo split architecture"
```

Findings:

- Existing tickets ran through `GEPA-08`; `GEPA-09` was the next logical id.
- Ticket workspace was created successfully with default files (`index.md`, `tasks.md`, `changelog.md`).

Decision:

- Use `GEPA-09` as a dedicated split-architecture ticket to avoid mixing with existing implementation-heavy tickets.

## Phase 2: repository inventory and boundary scan

Commands run:

```bash
rg --files go-go-os | head -n 200
rg --files go-go-gepa | head -n 200
find go-go-os -maxdepth 3 -type d | sort
rg --files go-go-os/go-inventory-chat | head -n 260
```

Findings:

- `go-go-os` contains both frontend workspace and `go-inventory-chat` backend in one tree.
- `go-go-gepa` is separate and mature enough to be consumed as dependency, but current launcher wiring still uses an internal GEPA module in `go-inventory-chat/internal/gepa`.

Interpretation:

- split strategy should treat current `go-inventory-chat/internal/gepa` as transitional implementation and define a clearer adapter boundary in composition repo.

## Phase 3: backend contract extraction

Commands run:

```bash
sed -n '1,260p' go-go-os/go-inventory-chat/cmd/go-go-os-launcher/main.go
sed -n '1,260p' go-go-os/go-inventory-chat/cmd/go-go-os-launcher/inventory_backend_module.go
sed -n '1,260p' go-go-os/go-inventory-chat/internal/backendhost/module.go
sed -n '1,260p' go-go-os/go-inventory-chat/internal/backendhost/manifest_endpoint.go
sed -n '1,260p' go-go-os/go-inventory-chat/internal/backendhost/routes.go
sed -n '1,320p' go-go-os/go-inventory-chat/internal/backendhost/lifecycle.go
sed -n '1,260p' go-go-os/go-inventory-chat/internal/backendhost/registry.go
```

Findings:

- Generic backend module interface is already coherent and reusable.
- Lifecycle startup/required health check semantics are explicit and robust.
- Route namespacing and forbidden legacy aliases are already encoded.
- Reflection endpoint support exists and provides strong foundation for discoverability.

Interpretation:

- Composition repo should carry this generic host package largely unchanged.
- Domain repos should avoid importing host internals directly to prevent cycles.

## Phase 4: frontend contract extraction

Commands run:

```bash
sed -n '1,260p' go-go-os/apps/os-launcher/src/App.tsx
sed -n '1,260p' go-go-os/apps/os-launcher/src/app/modules.tsx
sed -n '1,260p' go-go-os/packages/desktop-os/src/contracts/launchableAppModule.ts
sed -n '1,260p' go-go-os/packages/desktop-os/src/contracts/launcherHostContext.ts
sed -n '1,260p' go-go-os/packages/desktop-os/src/contracts/appManifest.ts
sed -n '1,320p' go-go-os/packages/desktop-os/src/registry/createAppRegistry.ts
sed -n '1,320p' go-go-os/packages/desktop-os/src/store/createLauncherStore.ts
sed -n '1,320p' go-go-os/packages/desktop-os/src/runtime/buildLauncherContributions.ts
sed -n '1,320p' go-go-os/packages/desktop-os/src/runtime/renderAppWindow.ts
```

Findings:

- Frontend module contracts (`LaunchableAppModule`, `AppManifest`, `LauncherHostContext`) are already strong separation points.
- Host resolves backend endpoints by app id (`/api/apps/${appId}`), matching backend route namespacing.
- Current composition of modules in `apps/os-launcher` is hardcoded import list and should move to package-level dependency imports across repos.

Interpretation:

- repo A should own these contracts and runtime primitives;
- repo B should publish domain module packages implementing those contracts;
- repo C should orchestrate imports and runtime registration.

## Phase 5: route and runtime behavior evidence

Commands run:

```bash
sed -n '1,360p' go-go-os/apps/inventory/src/launcher/renderInventoryApp.tsx
sed -n '1,320p' go-go-os/packages/engine/src/chat/runtime/http.ts
sed -n '1,280p' go-go-os/packages/engine/src/chat/ws/wsManager.ts
sed -n '1,280p' go-go-os/packages/engine/src/chat/runtime/conversationManager.ts
```

Findings:

- Inventory frontend module already uses host context API base and ws base fallback logic.
- Chat runtime endpoint assumptions are stable and namespaced when basePrefix is set.
- WS and timeline hydration flow is clear and reusable after split.

Interpretation:

- no route redesign needed for split; route governance should focus on preserving namespaced-only model and removing legacy aliases.

## Phase 6: build pipeline and coupling evidence

Commands run:

```bash
cat go-go-os/package.json
cat go-go-os/apps/os-launcher/package.json
sed -n '1,260p' go-go-os/scripts/sync-launcher-ui.sh
sed -n '1,260p' go-go-os/scripts/build-go-go-os-launcher.sh
sed -n '1,260p' go-go-os/scripts/smoke-go-go-os-launcher.sh
sed -n '1,260p' go-go-os/go-inventory-chat/internal/launcherui/handler.go
```

Findings:

- launcher binary build currently depends on direct filesystem sync from frontend dist into Go embed directory.
- this is a core coupling point to be redesigned for multi-repo flow.

Interpretation:

- composition repo should keep embed behavior (for single binary), but artifact ingestion must come from repo A/B outputs rather than in-tree app build outputs.

## Phase 7: GEPA and dependency evidence

Commands run:

```bash
sed -n '1,320p' go-go-os/go-inventory-chat/internal/gepa/module.go
cat go-go-os/go-inventory-chat/go.mod
cat go-go-gepa/go.mod
```

Findings:

- Internal GEPA module in `go-inventory-chat` already mirrors desired routes and reflection model.
- dependency versions show drift between inventory-chat and go-go-gepa in core shared libs.

Interpretation:

- composition repo should pin versions and own compatibility testing matrix.
- GEPA adapter should be explicit and isolated to simplify future plugin extraction.

## Phase 8: drafting decisions

Key architecture decisions made while drafting:

1. Three-repo split exactly as requested.
2. Keep generic backend host API in composition repo.
3. Keep repo B host-agnostic via component contract to avoid cyclic dependency.
4. Retain namespaced routes; no legacy compatibility shim.
5. Use reflection and schema endpoints as mandatory discoverability surface.
6. Define hard-cut migration phases with no dual-mode support.

Rejected direction:

- keeping a compatibility bridge for legacy routes; rejected because explicit instruction was no backwards compatibility.

## Phase 9: documentation edits

Files authored:

- `design-doc/01-repository-split-blueprint-and-implementation-roadmap.md`
- `reference/01-research-diary-repo-split-architecture.md` (this file)

Supporting ticket files to update next:

- `index.md`
- `tasks.md`
- `changelog.md`

## Quick reference: resulting architecture recommendation

1. Repo A (`hypercard-frontend`): frontend platform packages only.
2. Repo B (`hypercard-inventory-chat`): inventory domain backend + frontend module packages.
3. Repo C (`go-go-os-composition`): backend host, launcher command, adapters, product binary.

Critical API rule:

- all backend app APIs under `/api/apps/<app-id>/*`.

Critical bootstrap rule:

- backend modules start before HTTP server is exposed;
- frontend launcher derives base paths from app id through host context.

## Usage example for future investigations

If a future contributor needs to continue this work:

1. Open this diary and the design doc.
2. Confirm contracts still match source line evidence in references.
3. Create implementation tasks per migration phase.
4. Keep no-compat constraints explicit in every PR.

## Outstanding follow-ups

1. Decide exact GEPA adapter mode for phase 1 (library vs subprocess).
2. Define artifact transport for frontend bundles between repo A and repo C.
3. Add contract-test suites in repo C and enforce them in repo B CI.

## Phase 10: v2 rename and task-board revision

New user direction required a naming and topology update:

1. `go-go-os-composition` renamed to `wesen-os`.
2. `hypercard-inventory-chat` renamed to `go-go-app-inventory`.
3. First execution plan reframed as composition of:
   - `go-go-os`
   - `go-go-gepa`
   - `go-go-app-inventory`
   into `wesen-os`.

Commands run:

```bash
docmgr doc add --ticket GEPA-09-REPO-SPLIT-ARCHITECTURE --doc-type design-doc --title "V2 wesen-os composition plan (go-go-os + go-go-gepa + go-go-app-inventory)"
find go-go-os/go-inventory-chat -maxdepth 3 -type f | sort
```

Outcome:

- Added v2 design doc with detailed phased task board and explicit extraction boundaries.
- Updated ticket index/tasks/changelog to make v2 doc the active implementation reference.

## Phase 11: backend-only split execution kickoff

Objective for this execution run:

1. create detailed backend-only execution tasks in ticket,
2. execute tasks one by one across the new repos,
3. commit each completed task slice,
4. keep an explicit commit-by-commit diary.

Execution task slices:

1. Task S1: ticket tasks + v2 plan finalized and committed.
2. Task S2: initialize `go-go-app-inventory` as extracted backend repo and move inventory backend sources with `mv`.
3. Task S3: initialize `wesen-os` backend host core and move host runtime sources with `mv`.
4. Task S4: wire inventory adapter in `wesen-os` to consume `go-go-app-inventory`.
5. Task S5: compile/test baseline and document remaining gaps.

This diary section will be updated after each task commit with:

- exact files moved,
- exact commit hash and message,
- validation commands and results.

## Phase 12: backend-only split execution (task-by-task with commits)

This phase executed the backend-only split directly in code across the target repos, with commits per slice and `mv`-first migration where possible.

### S1. Ticket/task baseline commit

Commit:

- `go-go-gepa@25b9212` - `docs(gepa-09): add v2 wesen-os backend split plan and task board`

Outcome:

- Ticket workspace captured v2 naming (`wesen-os`, `go-go-app-inventory`).
- Execution board prepared before code migration.

### S2. Move inventory backend from `go-go-os` into `go-go-app-inventory`

Primary move operations (representative):

```bash
mv go-go-os/go-inventory-chat/internal/inventorydb go-go-app-inventory/pkg/inventorydb
mv go-go-os/go-inventory-chat/internal/pinoweb go-go-app-inventory/pkg/pinoweb
mv go-go-os/go-inventory-chat/cmd/go-go-os-launcher/tools_inventory*.go go-go-app-inventory/pkg/inventorytools/
mv go-go-os/go-inventory-chat/cmd/hypercard-inventory-seed go-go-app-inventory/cmd/inventory-seed
```

Implementation notes:

- Initialized module in extracted repo:
  - `go mod init github.com/go-go-golems/go-go-app-inventory`
- Converted extracted tool registry into reusable package API:
  - `package main` -> `package inventorytools`
  - exported `InventoryToolNames` and `InventoryToolFactories`
- Updated imports to extracted package paths.

Commits:

- `go-go-app-inventory@45127d1` - `feat: extract inventory backend packages from go-go-os`
- `go-go-os@4f6c181` - `refactor: move inventory backend sources to go-go-app-inventory`

Validation:

```bash
cd go-go-app-inventory && GOWORK=off go test ./...
```

Result:

- Pass.

### S3. Move backend host + launcher runtime into `wesen-os`

Primary move operations (representative):

```bash
mv go-go-os/go-inventory-chat/internal/backendhost wesen-os/pkg/backendhost
mv go-go-os/go-inventory-chat/internal/launcherui wesen-os/pkg/launcherui
mv go-go-os/go-inventory-chat/internal/gepa wesen-os/pkg/gepa
mv go-go-os/go-inventory-chat/cmd/go-go-os-launcher wesen-os/cmd/wesen-os-launcher
```

Implementation notes:

- Initialized module:
  - `go mod init github.com/go-go-golems/wesen-os`
- Added local replace for development wiring:
  - `go mod edit -replace github.com/go-go-golems/go-go-app-inventory=../go-go-app-inventory`
- Rewrote imports from old in-tree paths to:
  - `github.com/go-go-golems/wesen-os/pkg/...`
  - `github.com/go-go-golems/go-go-app-inventory/pkg/...`
- Renamed command identifiers to `wesen-os-launcher`.

Commits:

- `wesen-os@59bd4c6` - `feat: move os backend host and launcher into wesen-os`
- `go-go-os@dc4dd17` - `refactor: remove moved backend host and launcher sources`

### S4. Test regression and fix

Issue discovered:

- `TestProfileAPI_CRUDRoutesAreMounted` failed with:
  - `unexpected profile API contract key: registry`

Root cause:

- Integration contract helper `assertProfileListItemContract` allowed list-item keys that omitted `registry`, but runtime payload now includes it.

Fix:

- Added `"registry"` to allowed keys in:
  - `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`

Validation:

```bash
cd wesen-os && GOWORK=off go test ./...
```

Result:

- Pass.

### S5. Post-move health check and remaining gaps

Sanity check:

```bash
cd go-go-os/go-inventory-chat && GOWORK=off go test ./...
```

Result:

- `./...` matched no packages (expected at current extraction state).

Known remaining backend-only gaps:

1. Formal host-agnostic `Component` interface in `go-go-app-inventory` still needs explicit package boundary.
2. `wesen-os/pkg/gepa` is still copied/migrated code and not yet replaced by adapter over `go-go-gepa` APIs.
3. Backend CI/smoke automation for multi-repo composition still pending.

## Phase 13: B1/B2 implementation (component API extraction)

Goal:

- remove direct inventory backend module implementation from `wesen-os`,
- move it into `go-go-app-inventory` as a host-agnostic component API,
- keep `wesen-os` on a thin adapter layer.

### Move and refactor details

`mv` operation:

```bash
mv wesen-os/cmd/wesen-os-launcher/inventory_backend_module.go \
   go-go-app-inventory/pkg/backendcomponent/component.go
```

Refactor results in `go-go-app-inventory`:

1. Introduced `pkg/backendcomponent` package with:
   - `AppManifest` contract
   - `Component` interface
   - `Options` struct
   - `NewInventoryBackendComponent(opts)` constructor
   - lifecycle and route-mount methods (`Manifest`, `MountRoutes`, `Init`, `Start`, `Stop`, `Health`)
2. Removed dependency on `wesen-os/pkg/backendhost` from inventory repo.
3. Added contract tests:
   - manifest contract assertions
   - lifecycle server-required guards
   - mount-route dependency guard checks

Refactor results in `wesen-os`:

1. Replaced inventory module implementation with adapter-only file:
   - wraps `go-go-app-inventory/pkg/backendcomponent`
   - maps component manifest to `backendhost.AppBackendManifest`
   - delegates lifecycle and route methods.
2. Preserved constant compatibility used by existing integration tests:
   - `inventoryBackendAppID = inventorycomponent.AppID`

### Commits

- `go-go-app-inventory@be6865d` - `feat: add host-agnostic inventory backend component API`
- `wesen-os@b126596` - `refactor: adapt wesen-os inventory module to component API`

### Validation

Commands:

```bash
cd go-go-app-inventory && GOWORK=off go test ./...
cd wesen-os && GOWORK=off go test ./...
```

Result:

- both pass.

## Phase 15: B4/B5 closure and remaining scope

After B3 code extraction completed, backend-only planning tasks were synchronized:

1. B4 completed by adding a concrete dependency/version matrix in the v2 design document, including current `wesen-os` pins and local `replace` strategy.
2. B5 marked complete based on existing enforced CI path:
   - `wesen-os/.github/workflows/push.yml` executes `go test ./...`
   - integration tests already assert `/api/os/apps`, inventory routes, and GEPA routes.

Remaining backend-only task:

- B7 (phase-2 external plugin-runtime handoff notes) is still pending and should be addressed as a follow-up documentation slice.

## Phase 16: B7 handoff document delivered

Created a dedicated phase-2 backend handoff document:

- `design-doc/03-phase-2-backend-plugin-runtime-handoff-notes.md`

Content delivered:

1. backend-only scope boundaries for phase-2
2. minimal plugin protocol surface to preserve current host semantics
3. migration sequence from in-process adapters to plugin-process modules
4. acceptance criteria and risk mitigations
5. kickoff deliverables checklist

Result:

- B7 marked complete in task board.
- Backend-only split board is now fully closed for this ticket phase.

## Phase 17: cleanup round kickoff (move generic host back to go-go-os)

New direction:

1. keep generic module mounting and web-serving host machinery in `go-go-os`,
2. keep `wesen-os` as composition launcher that registers app modules and starts runtime.

Execution plan for this round:

1. add cleanup task board (C1-C7),
2. move `backendhost` and `launcherui` packages from `wesen-os` to `go-go-os/go-inventory-chat` using `mv`,
3. rewire `wesen-os` imports/go.mod to consume moved generic packages from `go-go-os` module path,
4. run cross-repo compile/test validation and log commit evidence.

## Phase 18: cleanup round execution (C2-C6)

### C2/C3: backendhost move-back and rewire

`mv` operation:

```bash
mv wesen-os/pkg/backendhost go-go-os/go-inventory-chat/pkg/backendhost
```

Rewire in `wesen-os`:

1. Replaced imports from:
   - `github.com/go-go-golems/wesen-os/pkg/backendhost`
   to:
   - `github.com/go-go-golems/hypercard-inventory-chat/pkg/backendhost`
2. Added local replace entry in `wesen-os/go.mod` for development:
   - `replace github.com/go-go-golems/hypercard-inventory-chat => ../go-go-os/go-inventory-chat`

Commits:

- `go-go-os@b627d8e` - `feat(go-go-os): restore generic backendhost package`
- `wesen-os@ad3634e` - `refactor(wesen-os): consume backendhost from go-go-os module`

### C4/C5: launcherui move-back and rewire

`mv` operation:

```bash
mv wesen-os/pkg/launcherui go-go-os/go-inventory-chat/pkg/launcherui
```

Rewire in `wesen-os`:

1. Replaced imports from:
   - `github.com/go-go-golems/wesen-os/pkg/launcherui`
   to:
   - `github.com/go-go-golems/hypercard-inventory-chat/pkg/launcherui`

Commits:

- `go-go-os@02ff51d` - `feat(go-go-os): restore launcher UI web-serving package`
- `wesen-os@7bf47f7` - `refactor(wesen-os): consume launcherui from go-go-os module`

### C6: validation matrix

Commands:

```bash
cd go-go-os/go-inventory-chat && GOWORK=off go test ./...
cd wesen-os && GOWORK=off go test ./...
cd go-go-app-inventory && GOWORK=off go test ./...
cd go-go-gepa && GOWORK=off go test ./pkg/backendmodule
```

Result:

- all pass.

## Phase 21: directory rename + launcher script cleanup

User follow-up required one more hard-cut cleanup:

1. rename backend directory itself from `go-inventory-chat` to `go-go-os`,
2. remove stale launcher assembly scripts from `go-go-os` (they no longer own composition binary assembly),
3. ensure `go-go-os` contains no `wesen-os` mentions.

### Directory rename

`mv` operation:

```bash
mv go-go-os/go-inventory-chat go-go-os/go-go-os
```

### Script and docs cleanup in go-go-os

Actions:

1. removed stale scripts:
   - `scripts/build-go-go-os-launcher.sh`
   - `scripts/sync-launcher-ui.sh`
2. removed obsolete launcher assembly npm scripts from root `package.json`.
3. updated README references from `go-inventory-chat` to `go-go-os`.

### wesen-os path update

Updated local replace:

- from `../go-go-os/go-inventory-chat`
- to `../go-go-os/go-go-os`

### Commits

- `go-go-os@6d4302a` - `refactor(go-go-os): rename backend directory and drop launcher assembly scripts`
- `wesen-os@1bfdf2a` - `chore(wesen-os): update local go-go-os replace path`

## Phase 19: adjustment round kickoff

Follow-up direction changed two decisions from the prior cleanup round:

1. `launcherui` should remain in `wesen-os` (composition/frontend bundling repo),
2. `go-go-os/go-inventory-chat` module identity should be renamed from `hypercard-inventory-chat` to `go-go-os`.

Execution plan:

1. move `launcherui` back into `wesen-os` with `mv`,
2. rename module path in `go-go-os/go-inventory-chat/go.mod`,
3. rewire `wesen-os` imports and `go.mod` replace/require entries to the new module path,
4. rerun full validation matrix and log commits.

## Phase 20: adjustment execution (D2-D5)

### D2: move launcherui back to wesen-os

`mv` operation:

```bash
mv go-go-os/go-inventory-chat/pkg/launcherui wesen-os/pkg/launcherui
```

Outcome:

- `wesen-os` now owns launcher UI web-serving package again.
- `go-go-os/go-inventory-chat` no longer ships `pkg/launcherui`.

### D3: rename go-inventory-chat module identity

Changed module path:

- from `github.com/go-go-golems/hypercard-inventory-chat`
- to `github.com/go-go-golems/go-go-os`

File:

- `go-go-os/go-inventory-chat/go.mod`

### D4: rewire wesen-os imports and module replaces

Import rewires in `wesen-os`:

1. backendhost imports now use:
   - `github.com/go-go-golems/go-go-os/pkg/backendhost`
2. launcherui imports now use:
   - `github.com/go-go-golems/wesen-os/pkg/launcherui`

`go.mod` rewires in `wesen-os`:

1. dropped `hypercard-inventory-chat` require/replace
2. added replace:
   - `github.com/go-go-golems/go-go-os => ../go-go-os/go-inventory-chat`

### Commits

- `go-go-os@5a74c79` - `refactor(go-go-os): rename go module and remove launcherui package`
- `wesen-os@fee0b19` - `refactor(wesen-os): keep launcherui local and consume go-go-os backendhost`

### D5: validation matrix

Commands:

```bash
cd go-go-os/go-inventory-chat && GOWORK=off go test ./...
cd wesen-os && GOWORK=off go test ./...
cd go-go-app-inventory && GOWORK=off go test ./...
cd go-go-gepa && GOWORK=off go test ./pkg/backendmodule
```

Result:

- all pass.

### Blocker discovered for next task (B3)

Attempted pre-work scan for replacing `wesen-os/pkg/gepa` with a direct adapter over `go-go-gepa` exports showed no reusable backend module package currently exported by `go-go-gepa` (runner-centric `cmd/gepa-runner` code is present, but no app-backend component package yet).

Implication:

- B3 requires either:
  1. new exported module package in `go-go-gepa`, or
  2. continuing with transitional copied GEPA backend in `wesen-os` until that package exists.

## Phase 14: B3 implementation (GEPA adapter extraction completed)

The Phase 13 blocker was resolved in this run by extracting the GEPA backend core from `wesen-os` into `go-go-gepa`, then keeping `wesen-os` on a thin host adapter.

### Move and extraction details

`mv` operation:

```bash
mv wesen-os/pkg/gepa/* go-go-gepa/pkg/backendmodule/
```

Refactor in `go-go-gepa`:

1. Created `pkg/backendmodule` as an exported package for composition hosts.
2. Converted package to host-agnostic contracts:
   - added `Manifest` and reflection contract types in `contracts.go`
   - removed import dependency on `wesen-os/pkg/backendhost`
3. Preserved runtime/catalog/run-service behavior and tests in extracted package.

Refactor in `wesen-os`:

1. Replaced old in-tree GEPA implementation with adapter module (`pkg/gepa/module.go`).
2. Adapter maps `go-go-gepa/pkg/backendmodule` contracts to `wesen-os/pkg/backendhost` contracts.
3. Launcher API usage remained stable (`NewModule`, `ModuleConfig`).

### Commits

- `go-go-gepa@21635cc` - `feat: extract gepa backend module package for os adapters`
- `wesen-os@4d4a61c` - `refactor: adapt wesen-os gepa module to go-go-gepa backend package`

### Validation

Commands:

```bash
cd go-go-gepa && GOWORK=off go test ./pkg/backendmodule
cd wesen-os && GOWORK=off go test ./...
```

Result:

- both pass.
