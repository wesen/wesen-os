# Diary

## Goal

This diary captures the implementation checkpoints for `NPM-PUBLISH-001`, starting with the hard-cut rename from `@hypercard/*` to `@go-go-golems/*` and the compile fixes needed to keep the launcher green.

## Step 1: Hard-Cut Rename Checkpoint

This step converted the active launcher path and linked frontend/app repos from the old `@hypercard/*` names to the final `@go-go-golems/*` names, including the `os-*` platform package mapping. The work was broader than a pure search-and-replace because the rename exposed a few type and contract mismatches that had to be fixed before the launcher could typecheck again.

The checkpoint was committed as a set of focused repo-local commits, then pinned from the root `wesen-os` repo. That keeps the root history honest about which linked repo versions the launcher rename depends on, instead of burying everything in one oversized commit.

### Prompt Context

**User prompt (verbatim):** "ok, let's go. (no need to rename in ttmp/ folders)."

**Assistant interpretation:** Apply the rename in live code and configuration, but leave the ticket workspace under `ttmp/` untouched.

**Inferred user intent:** Move the codebase onto the final published package names without breaking the working launcher path.

**Commit (code):** `3b03d37` — "Rename launcher integration to @go-go-golems packages"

### What I did

- Renamed the live launcher integration in `apps/os-launcher` from `@hypercard/*` imports to the final `@go-go-golems/*` package names and `os-*` platform aliases.
- Renamed the linked platform repo `workspace-links/go-go-os-frontend` and committed it as `bd55597` (`Rename frontend packages to @go-go-golems os-*`).
- Renamed the linked ARC bridge repo `workspace-links/go-go-app-arc-agi-3` and committed it as `f89e40e` (`Align arc-agi-player with renamed runtime packages`).
- Renamed the linked sqlite app repo `workspace-links/go-go-app-sqlite` and committed it as `0bdadf6` (`Rename sqlite app dependencies to @go-go-golems`).
- Renamed the linked inventory app repo `workspace-links/go-go-app-inventory` and committed it as `8bbca5e` (`Rename inventory app dependencies to @go-go-golems`).
- Fixed reducer seed/materialization typing in `workspace-links/go-go-os-frontend/packages/rich-widgets/src/*State.ts` so the renamed launcher path no longer failed on missing `initialized` fields.
- Fixed `workspace-links/go-go-os-frontend/packages/rich-widgets/src/index.ts` to re-export `StreamLauncherProps` and `SteamLauncherProps` from the correct `types.ts` modules.
- Fixed readonly docs metadata typing in `workspace-links/go-go-os-frontend/packages/hypercard-runtime/src/repl/hypercardReplDriver.ts` so generated VM metadata could flow into the REPL bundle library without mutable-array type errors.
- Fixed the ARC bridge contract drift by moving the runtime action path to `surfaceId` while preserving `cardId` as a compatibility alias in `workspace-links/go-go-app-arc-agi-3/apps/arc-agi-player/src/bridge/contracts.ts`, `ArcPendingIntentEffectHost.tsx`, and `middleware.ts`.
- Refreshed stale lockfiles after the rename, including `workspace-links/go-go-app-sqlite/pnpm-lock.yaml`, so no live `@hypercard/*` references remained outside excluded directories.

### Why

- The published npm namespace is `@go-go-golems/*`, not `@hypercard/*`, so the rename had to happen before any packaging/publishing work.
- The launcher is the fastest integration checkpoint because it exercises package imports, aliases, runtime registration, and linked app/module contracts in one place.
- Committing each linked repo separately avoids losing dependency boundaries inside a single root-level commit.

### What worked

- `pnpm install` at the root restored workspace resolution for the renamed packages after `npm install` failed on `workspace:*`.
- The launcher typecheck was brought back to green after the type and contract fixes.
- A final search confirmed there were no `@hypercard/*` references left outside excluded directories such as `ttmp`, `node_modules`, and `dist`.

### What didn't work

- `npm install` at the repo root failed with `EUNSUPPORTEDPROTOCOL Unsupported URL Type "workspace:"`, so the rename validation had to switch to `pnpm install`.
- The first `npm run typecheck` in `apps/os-launcher` failed on transitive errors from renamed dependencies, including:
  - `node_modules/@go-go-golems/os-kanban/node_modules/@go-go-golems/os-widgets/src/...` missing `initialized` fields in state materializers
  - `src/app/hypercardReplModule.tsx(72,3)` readonly docs metadata incompatibility
  - `workspace-links/go-go-app-arc-agi-3/apps/arc-agi-player/src/bridge/...` `cardId` vs `surfaceId` runtime-action mismatch
- `workspace-links/go-go-os-frontend` had untracked generated `.js`/`.map` artifacts under `packages/engine/src/**` after local build/typecheck work; those had to be deleted before committing so the repo-local rename commit stayed reviewable.

### What I learned

- The rename itself was mechanically straightforward, but compile fallout concentrated in a few weak contracts: reducer seed discrimination, readonly generated metadata, and the ARC bridge’s outdated runtime action shape.
- The launcher path is a good integration target for this migration because it catches real package/consumer mismatches earlier than package-local builds alone.
- Lockfiles in linked repos can keep stale old-scope references even after all source/package manifests have been renamed.

### What was tricky to build

- The `os-widgets` state modules were using property-presence checks like `'chartType' in seed` to detect a fully materialized state object. After the rename-triggered typecheck pass, TypeScript correctly pointed out that those guards still admitted partial seed shapes, which made the reducer return type unsound. The fix was to discriminate on `'initialized' in seed` instead, because that field only exists on the fully materialized runtime state.
- The ARC bridge was still writing runtime actions with `cardId`, while `os-scripting` now expects `surfaceId`. The symptom was a type failure in the launcher and ARC bridge repos; the safe fix was to move the runtime action payload to `surfaceId` but continue deriving `cardId` as a compatibility alias in bridge metadata so downstream UI code does not silently lose context.
- The root repo depends on submodule pointers, not submodule file content. That means the clean checkpoint required repo-local commits first, then a root commit that pins those SHAs. Doing that in the wrong order would have left the root commit pointing at dirty, unrepeatable linked worktrees.

### What warrants a second pair of eyes

- The ARC bridge compatibility path now carries both `surfaceId` and `cardId` metadata; reviewers should confirm no remaining consumer assumes `cardId` is authoritative for runtime routing.
- The `os-widgets` fixes were intentionally minimal and local to the launcher-blocking errors. A broader pass on publishability and package-local type/build isolation is still warranted before Phase 1 packaging work.
- The repo still has unrelated untracked items outside this ticket scope (`.claude/`, `docs/window-resize-behavior.md`), which were deliberately left out of commits.

### What should be done in the future

- Build the package identity matrix for the first publish wave and decide which app packages are v1 publish candidates versus workspace-only examples.
- Convert publishable platform packages away from `private: true` and `src/*` exports toward `dist/*` outputs with explicit `files` allowlists.
- Add package smoke tests that install packed artifacts instead of relying on sibling-source aliasing.

### Code review instructions

- Start in `apps/os-launcher/package.json`, `apps/os-launcher/tsconfig.json`, `apps/os-launcher/vite.config.ts`, and `apps/os-launcher/src/app/hypercardReplModule.tsx` to review the root host rename.
- Then review `workspace-links/go-go-os-frontend/packages/hypercard-runtime/src/repl/hypercardReplDriver.ts` and `workspace-links/go-go-os-frontend/packages/rich-widgets/src/index.ts` plus the touched `*State.ts` files for the compile-fix layer.
- Then review `workspace-links/go-go-app-arc-agi-3/apps/arc-agi-player/src/bridge/ArcPendingIntentEffectHost.tsx` and `workspace-links/go-go-app-arc-agi-3/apps/arc-agi-player/src/bridge/middleware.ts` for the `surfaceId` migration.
- Validate with:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher && npm run typecheck`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os && rg -n --glob '!ttmp/**' --glob '!workspace-links/**/ttmp/**' --glob '!**/node_modules/**' --glob '!**/dist/**' '@hypercard/' .`

### Technical details

- Root checkpoint commit: `3b03d375c21a1679523994701fd34e92d6601218`
- Linked repo commits:
  - `bd55597a6f0888da40c70441db866c6f29a3dd17` (`go-go-os-frontend`)
  - `f89e40ebb90b56df4e424f1100eaeb8f8e5bbfa6` (`go-go-app-arc-agi-3`)
  - `0bdadf6c94b2045bc60eb3dcdd47701a0c8a3a23` (`go-go-app-sqlite`)
  - `8bbca5e091e58e4566641acff423334fedecd7b3` (`go-go-app-inventory`)
- Commands used during validation and cleanup:
  - `npm install` at repo root -> failed with `EUNSUPPORTEDPROTOCOL Unsupported URL Type "workspace:"`
  - `pnpm install` at repo root -> succeeded
  - `cd apps/os-launcher && npm run typecheck` -> initially failed, later passed
  - `cd workspace-links/go-go-app-sqlite && pnpm install` -> refreshed stale lockfile rename references
  - `cd workspace-links/go-go-os-frontend && git ls-files --others --exclude-standard -z | xargs -0 rm -f` -> removed generated untracked artifacts before commit

## Step 2: Freeze The Publish Matrix

This step turned the live manifests into a concrete publish matrix for the migration. Instead of keeping the next phases implicit, it records exactly which packages are v1 public contracts, which app packages ship later, and what still blocks each package from becoming publishable.

The output is intentionally ticket-local documentation rather than a risky package-manifest refactor. The audit exposed that the most immediate publish blockers are structural and shared across packages: `private: true`, `src/*` exports, `workspace:*` dependency leakage, and missing dist asset-copy steps for CSS and `.vm.js` files.

### Prompt Context

**User prompt (verbatim):** "ok let's go on. make sure to commit at proper intervals and keeping a diary."

**Assistant interpretation:** Continue the migration in bounded steps, keep commits focused, and document each checkpoint so the work can be reviewed and resumed cleanly.

**Inferred user intent:** Advance the ticket without losing the implementation trail or letting the commit history turn into an unreviewable blob.

**Commit (code):** N/A (documentation-only step)

### What I did

- Parsed the current package manifests for the nine v1 platform packages and the six later-wave app packages.
- Wrote `package-identity-matrix.md` to capture:
  - package name
  - owning repo
  - source path
  - artifact kind
  - public entrypoints
  - runtime assets that must ship
  - current publish blockers
- Updated `tasks.md` to mark these planning/contract decisions complete:
  - package identity matrix
  - public contract vs internal implementation decision
  - frozen v1 publish set
  - app packages publish later

### Why

- The rename is done, so the next risk is uncontrolled scope in the publish work. Freezing the matrix prevents accidental expansion of the first release wave.
- The current package manifests are inconsistent with npm publishing, but the blockers are shared enough that they should be solved systematically rather than package-by-package by memory.

### What worked

- The live manifests already contain enough information to freeze the package ownership and entrypoint map without guessing.
- The audit made the next technical slice obvious: build/package preparation for the nine `os-*` platform packages first, then app packages later.

### What didn't work

- N/A. This step was a manifest/documentation audit and did not hit a tooling failure.

### What I learned

- The publish wave boundary is now concrete: platform packages first, app packages later.
- Several packages need non-TypeScript runtime assets copied into `dist`, especially:
  - CSS entrypoints in `os-core`, `os-chat`, `os-repl`, `os-widgets`, `os-kanban`
  - `.vm.js` assets in `os-scripting`, `os-ui-cards`, `os-kanban`
- The common blockers are more important than any one package-specific tweak, which argues for shared build/publish tooling in the next slice.

### What was tricky to build

- The tricky part here was drawing a clean line between “public contract” and “current implementation layout.” Some packages expose stable public subpaths already, but those subpaths still point at `src/*`, which is fine for the linked workspace and wrong for publishing. The matrix therefore had to record both the intended contract and the current blocker without pretending the package is ready just because the name is final.

### What warrants a second pair of eyes

- The classification of `os-widgets`, `os-kanban`, and `os-ui-cards` as v1 public contracts should be reviewed against the desired long-term API surface. They are part of the agreed first wave, but their public exports may still be wider than intended.
- The “app packages later” decision should be revisited once the platform publish path is green, especially for `@go-go-golems/inventory`, which is the strongest external-consumer proof case.

### What should be done in the future

- Add a shared dist-build helper that copies CSS and `.vm.js` assets for publishable packages.
- Add publish metadata and `files` allowlists to the nine v1 platform packages.
- Choose the workspace-dependency version rewrite strategy before removing `private: true`.

## Step 4: Rename Package Directories To Match Public Package Names

This step renames the `go-go-os-frontend/packages/*` directories so the filesystem layout matches the already-frozen public package names. The goal is to stop carrying the old internal folder names (`engine`, `hypercard-runtime`, `ui-runtime`, and so on) after the package rename is already complete at the manifest/import level.

This is a path migration across multiple repos, not just a local cleanup. The linked app repos, launcher host, docs, project references, and lockfiles all encode the old folder names and need to move together.

### Prompt Context

**User prompt (verbatim):** "can we rename the folders to match package names too?" / "alright do it"

**Assistant interpretation:** Rename the frontend package directories to `os-*` names and fix every live path reference that depends on those folder names.

**Inferred user intent:** Make the repo layout match the published contract so packaging and future maintenance stop mixing old local names with new public package names.

### Planned work

- Rename the nine platform package folders in `workspace-links/go-go-os-frontend/packages/`.
- Update repo-local TS project references, workspace scripts, and docs inside `go-go-os-frontend`.
- Update cross-repo path references in `wesen-os`, `go-go-app-inventory`, `go-go-app-sqlite`, and `go-go-app-arc-agi-3`.
- Refresh any lockfiles or generated metadata that encode the old folder paths.
- Re-run targeted validation and capture any fallout before moving back to package-local dist builds.

### What I did

- Renamed the nine platform package directories in `workspace-links/go-go-os-frontend/packages/` so the repo layout now matches the public `@go-go-golems/os-*` package identities.
- Updated repo-local project references, package scripts, Storybook aliases, docs, tests, and helper scripts inside `go-go-os-frontend` to use the new folder names.
- Updated cross-repo path references in:
  - `wesen-os`
  - `go-go-app-inventory`
  - `go-go-app-sqlite`
  - `go-go-app-arc-agi-3`
- Refreshed workspace metadata and lockfiles where needed with `pnpm install` in:
  - `workspace-links/go-go-os-frontend`
  - `workspace-links/go-go-app-sqlite`
  - the root `wesen-os` repo
- Fixed the direct sibling-source rename leaks that remained after the folder move:
  - package-local `tsconfig.json` references such as `../engine/src`
  - `os-ui-cards` and `os-kanban` runtime-registration tests importing old sibling folders directly
  - `os-repl` Storybook helpers importing `../../rich-widgets/...`

### Why

- The public package rename was already complete at the manifest/import level, but the filesystem still encoded the old internal names. That mismatch made the package graph harder to reason about during publish work.
- The publish migration now depends on package-local dist builds and cross-repo resolution staying honest. Carrying old folder names would keep leaking the pre-rename mental model into every build/debugging step.

### What worked

- The live codebase no longer references the old package folder names outside excluded directories such as `ttmp`, `node_modules`, and `dist`.
- `pnpm install` in the root repo re-linked the moved frontend packages so `apps/os-launcher` could resolve the renamed paths again.
- Targeted validation after the folder move succeeded for:
  - `cd workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-core`
  - `cd workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-repl`
  - `cd apps/os-launcher && npm run typecheck`

### What didn't work

- `npm install` still fails in repos that use `workspace:*`, including:
  - `workspace-links/go-go-os-frontend`
  - `workspace-links/go-go-app-inventory`
  with `EUNSUPPORTEDPROTOCOL Unsupported URL Type "workspace:"`; those repos still need `pnpm install`.
- `pnpm install` in `workspace-links/go-go-app-inventory` still fails because the inventory repo expects platform packages like `@go-go-golems/os-chat@workspace:*` to exist inside its own workspace:
  - `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND In apps/inventory: "@go-go-golems/os-chat@workspace:*" is in the dependencies but no package named "@go-go-golems/os-chat" is present in the workspace`
- `cd workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-ui-cards` still fails, but the failure is now back in the publish-boundary layer rather than the folder-rename layer:
  - `TS7016` declaration-resolution failures against `@go-go-golems/os-core/dist/*`

### What I learned

- The folder rename itself was mostly mechanical, but it revealed two distinct classes of hidden coupling:
  - hardcoded filesystem paths across repos and docs
  - package-local sibling-source imports/references that never went through package names at all
- Once the root workspace links were refreshed, the launcher path remained stable. That is a good sign that the rename slice is clean and the remaining failures are genuinely about publishability.
- `go-go-app-inventory` is still structurally tied to a local workspace model for platform packages. That is a separate blocker from folder naming and belongs in the broader package-consumption migration.

### What was tricky to build

- The broad path rewrite was not enough by itself because some test and tsconfig references used sibling relative paths like `../engine/src` and `../../hypercard-runtime/src` instead of `packages/...` paths. Those leaks only surfaced after the folder move broke them.
- The first launcher typecheck after the rename failed for a misleading reason: the source changes were correct, but the root workspace install layer still pointed at deleted package directories. Re-running `pnpm install` at the root fixed that immediately.

### What warrants a second pair of eyes

- The Storybook alias cleanup in `go-go-os-frontend`, `go-go-app-sqlite`, and `go-go-app-inventory` touched hidden `.storybook` files that the earlier public-package rename had missed.
- The `os-ui-cards` dist-build failure should be reviewed as the first post-rename packaging blocker. It now points at missing declaration coverage for `os-core/dist` rather than old folder names.

### What should be done in the future

- Fix the `os-core` dist declaration/export shape so dependent packages like `os-chat` and `os-ui-cards` can resolve typed imports from `dist/*`.
- Decide how `go-go-app-inventory` should consume platform packages during local development, because its current `workspace:*` setup is not independently installable.
- Continue Phase 1A from the new folder layout instead of carrying more legacy-path compatibility shims.

### Code review instructions

- Start with the package-folder move in `workspace-links/go-go-os-frontend/packages/` and confirm the new names align with the public package identities.
- Review `workspace-links/go-go-os-frontend/tsconfig.json`, `workspace-links/go-go-os-frontend/package.json`, `workspace-links/go-go-os-frontend/.storybook/*`, and the package-local `tsconfig.json` files for the path/reference rewrite.
- Then review the cross-repo consumer updates in:
  - `apps/os-launcher/tsconfig.json`
  - `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.json`
  - `workspace-links/go-go-app-sqlite/apps/sqlite/tsconfig.json`
  - `workspace-links/go-go-app-arc-agi-3/apps/arc-agi-player/tsconfig.json`
- Validate with:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os && pnpm install`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && pnpm install`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-core`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-repl`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher && npm run typecheck`

### Technical details

- Root relink command:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os && pnpm install`
- Frontend relink command:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && pnpm install`
- SQLite relink command:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite && pnpm install`
- Remaining publish-boundary blocker after the folder rename:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-ui-cards`
  - current failure: `TS7016` on `@go-go-golems/os-core/dist/*` declarations

## Step 5: Fix Dist-Build Incremental State And Recover `os-scripting` Assets

This step moved the packaging work forward again after the folder-rename checkpoint. The immediate issue was that `build:dist` could succeed while silently omitting declaration files because TypeScript was reusing stale `.tsbuildinfo` state from prior temp builds. After fixing that, the build surfaced a second problem: the folder-rename sweep had accidentally removed `os-scripting` VM fixture files and raw-import typings, and had also over-rewritten a few internal `src/repl` imports.

The result is a much better packaging baseline: `os-core`, `os-chat`, `os-repl`, `os-scripting`, and `os-ui-cards` now build cleanly with `build:dist`, and the full `build:publish-v1` flow has advanced to the next real source-first resolution blocker in `os-widgets`.

### Prompt Context

**User prompt (verbatim):** "alright, add all the tasks necessary and then work on it one by one, committing at appropriate intervals, and keeping a diary."

**Assistant interpretation:** Continue past the folder rename into the next packaging blockers, keeping the task board and diary in sync and checkpointing the work in focused commits.

**Inferred user intent:** Keep pushing the migration forward in bounded technical slices rather than stopping after each narrow cleanup.

### What I did

- Traced the missing-declaration failure in `os-ui-cards` back to stale temp incremental state from `.tsconfig.build-dist.tmp.tsbuildinfo`.
- Updated `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs` so dist builds:
  - write to an explicit temp `.tsbuildinfo` path
  - delete that temp build-info file before the build
  - delete that temp build-info file after the build
- Verified the fix by showing that a clean `os-core` compile emits `.d.ts` files again once the temp build-info state is removed.
- Restored the accidentally removed `os-scripting` files from the pre-rename tree:
  - `src/raw-imports.d.ts`
  - `src/plugin-runtime/**/*.vm.js`
  - `src/runtime-host/fixtures/*.vm.js`
  - `src/runtime-packages/ui.package.vm.js`
- Repaired the internal `os-scripting` source imports that were wrongly rewritten from local `src/repl/*` to non-existent `src/os-repl/*`.
- Re-ran package-local dist builds and the aggregate publish flow.

### Why

- A dist build that emits JS but not declarations is worse than a hard failure because it leaves downstream packages resolving to JS-only artifacts with `any` types.
- The missing `os-scripting` VM fixtures and raw-import declarations were direct regressions from the folder rename and had to be restored before any meaningful packaging validation could continue.

### What worked

- The temp build-info cleanup fixed declaration emission for `os-core`.
- These package-local dist builds now pass:
  - `cd workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-core`
  - `cd workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-chat`
  - `cd workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-repl`
  - `cd workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-scripting`
  - `cd workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-ui-cards`
- The aggregate `build:publish-v1` flow now advances through:
  - `os-core`
  - `os-chat`
  - `os-repl`
  - `os-scripting`
  - `os-ui-cards`

### What didn't work

- The full publish build still stops in `os-widgets`:
  - `cd workspace-links/go-go-os-frontend && npm run build:publish-v1`
  - current failure: `../os-scripting/src/plugin-runtime/runtimeService.ts(12,34): error TS2307: Cannot find module './stack-bootstrap.vm.js?raw'...`
- That failure now points at a later source-first resolution path, likely through `os-widgets` importing `os-shell`, whose current package metadata still exports `src/*` and pulls `os-scripting/src` back into the build.

### What I learned

- The temp `.tsbuildinfo` files produced by the dist helper are part of the build contract. If they are not cleaned, they can make dist builds look green while emitting incomplete artifacts.
- The folder rename did not just break path strings. It also exposed how many runtime asset files in `os-scripting` are essential to tests, stories, and raw bundle imports.
- The next blocker is no longer “does dist build work at all?” It is now “how do workspace package imports resolve to built artifacts transitively instead of falling back to `src/*` package metadata?”

### What was tricky to build

- The misleading part was that `os-core` already appeared to build successfully, so the missing declarations looked like a package-resolution bug at first. It only became obvious after checking emitted files directly and noticing that TypeScript was leaving behind `.d.ts.map` files without the matching `.d.ts` outputs under stale incremental state.
- The rename regression in `os-scripting` came from two different failure modes at once:
  - asset files had disappeared from the moved package tree
  - internal local imports had been rewritten as if `src/repl` were another package folder

### What warrants a second pair of eyes

- The restored `os-scripting` asset set should be compared with the pre-rename tree to confirm nothing else runtime-relevant was dropped.
- The new `build-dist.mjs` cleanup behavior should be reviewed for any package that intentionally depends on persistent incremental state, although dist-builds should not.

### What should be done in the future

- Fix the next transitive source-first boundary so `os-widgets` can build without pulling `os-scripting/src` through `os-shell`.
- Then continue the full `build:publish-v1` flow through `os-kanban`, `os-confirm`, and `os-shell`.
- After the whole v1 set builds cleanly, switch the package manifests from `src/*` exports to `dist/*`.

### Code review instructions

- Start with `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs`.
- Then review the restored raw-import/runtime asset files under `workspace-links/go-go-os-frontend/packages/os-scripting/src/`.
- Then review the internal import repairs in:
  - `workspace-links/go-go-os-frontend/packages/os-scripting/src/hypercard/debug/jsSessionDebugRegistry.ts`
  - `workspace-links/go-go-os-frontend/packages/os-scripting/src/hypercard/task-manager/jsSessionSource.ts`
  - `workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.rerender.test.tsx`
- Validate with:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-scripting`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-ui-cards`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:publish-v1`

### Technical details

- Temp build-info files observed before the fix:
  - `packages/*/.tsconfig.build-dist.tmp.tsbuildinfo`
- Direct confirmation command used to isolate the declaration-emission problem:
  - `cd .../packages/os-core && rm -rf dist tsconfig.tsbuildinfo && npm exec -- tsc -p tsconfig.json --listEmittedFiles`
- Current aggregate build blocker after this step:
  - `os-widgets` pulls `os-shell`/`os-scripting` back through source-first package metadata during `build:publish-v1`

## Step 6: Make The Full V1 Dist-Build Chain Pass

This step closed the remaining Phase 1A build-isolation loop. After teaching the dist helper about workspace package exports, the remaining failure was simply dependency order: `os-widgets` imports `os-shell`, so `os-shell` has to be built before `os-widgets` once dist-builds resolve package imports to built artifacts instead of source.

With that order fixed, the full `build:publish-v1` script now passes end-to-end for the v1 platform package set.

### What I did

- Extended the shared dist-build helper to generate path aliases for all local workspace package exports, not just the aliases already present in the current package’s `tsconfig.json`.
- Kept explicit package-local `tsconfig` paths overriding the generated defaults where needed.
- Added robust temp-file cleanup around `.tsconfig.build-dist.tmp.json` and `.tsconfig.build-dist.tmp.tsbuildinfo` via `try/finally`.
- Reordered `workspace-links/go-go-os-frontend/package.json` `build:publish-v1` so `os-shell` builds before `os-widgets`.

### Why

- Once package imports resolve to `dist/*`, the build order has to follow real package dependencies. The previous order only worked while some dependencies still leaked through `src/*`.
- The helper needed to understand package exports transitively, otherwise a package like `os-widgets` could still resolve `os-shell` through package metadata and fall back into source trees.

### What worked

- These direct package-local dist builds now pass:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-shell`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/os-widgets`
- The full aggregate build now passes:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:publish-v1`
- There are currently no remaining package-local v1 dist-build failures.

### What I learned

- The important boundary is no longer “does the current package know how to rewrite its own tsconfig paths?” It is “can any workspace package import another workspace package without falling back to source-first package metadata?”
- Once that is true, the remaining issues become release-manifest problems rather than build-graph problems.

### What should be done in the future

- Switch the v1 package manifests from `src/*` entrypoints to `dist/*`.
- Add `files` allowlists so the built artifacts are actually publishable.
- Then start validating `npm pack` and clean external-consumer installs.

### Code review instructions

- Start with `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/package-identity-matrix.md`.
- Compare the v1 publish set there against `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/tasks.md`.
- Spot-check the current manifests in:
  - `workspace-links/go-go-os-frontend/packages/engine/package.json`
  - `workspace-links/go-go-os-frontend/packages/hypercard-runtime/package.json`
  - `workspace-links/go-go-os-frontend/packages/kanban-runtime/package.json`
  - `workspace-links/go-go-app-inventory/apps/inventory/package.json`

### Technical details

- Manifest fields checked in this step:
  - `name`
  - `private`
  - `exports`
  - `main`
  - `types`
  - `dependencies`
- Asset classes checked in this step:
  - `src/**/*.css`
  - `src/**/*.vm.js`
- Relevant command patterns:
  - package manifest audit via Node/JS file reads
  - asset audit via `find ... -path '*/src/*.vm.js' -o -path '*/src/**/*.vm.js' -o -path '*/src/*.css' -o -path '*/src/**/*.css'`

## Step 3: Add Shared Dist-Build Scaffolding

This step added the first reusable packaging helper in `go-go-os-frontend`: a `build:dist` script that runs a forced TypeScript build and then copies runtime CSS and `.vm.js` assets into `dist`. That gives the publishable packages a concrete mechanism for building package contents, instead of relying on `tsc -b` alone.

The helper did not finish publishability by itself. It validated cleanly on `os-core` and `os-repl`, but `os-ui-cards` still failed because its standalone build resolves sibling package source through the existing linked-workspace path assumptions. That failure is useful because it identifies the next structural packaging blocker with an exact command and error.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Continue the migration with small, reviewable implementation slices and keep the ticket diary current.

**Inferred user intent:** Make concrete forward progress toward published packages without mixing many risky changes into one commit.

**Commit (code):** `8db71ad` — "Add dist-build helper for publishable packages"

### What I did

- Added `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs`.
- Added `build:dist` scripts to the nine v1 platform package manifests in `go-go-os-frontend`.
- Added a root `build:publish-v1` convenience script in `workspace-links/go-go-os-frontend/package.json`.
- Tightened `workspace-links/go-go-os-frontend/packages/ui-runtime/src/UIRuntimeRenderer.tsx` callback typing so `os-ui-cards` is closer to standalone strict-mode builds.
- Validated successful dist builds for:
  - `@go-go-golems/os-core`
  - `@go-go-golems/os-repl`
- Captured the remaining `os-ui-cards` standalone build blocker for the next slice.

### Why

- Publishable packages need more than declarations and JS output; they also need runtime asset copying for CSS and `.vm.js` files.
- A shared helper prevents nine packages from growing nine near-identical post-build copy scripts.

### What worked

- `npm run build:dist -w packages/engine` succeeded and copied 10 asset files into `dist`.
- `npm run build:dist -w packages/repl` succeeded and copied 1 asset file into `dist`.
- The helper now forces a fresh `tsc -b --force` build, which is more appropriate for publish-prep than relying on incremental state.

### What didn't work

- `npm run build:dist -w packages/ui-runtime` still failed with:
  - `TS6305: Output file '.../packages/engine/dist/index.d.ts' has not been built from source file '.../packages/engine/src/index.ts'.`
- That means `os-ui-cards` is still crossing a source-level package boundary during standalone package builds, even after the shared helper was added.

### What I learned

- The asset-copy problem and the source-boundary problem are separate. The new helper solves the first one, but not the second.
- The next packaging refactor likely needs to address TypeScript path/reference behavior across the platform packages, not just package manifests.

### What was tricky to build

- The subtle part was making the helper useful for publish-prep rather than just “whatever `tsc -b` happened to leave in `dist`”. A normal incremental build can hide missing outputs behind stale project state, especially once `dist` directories get cleaned independently. Switching the helper to `tsc -b --force` makes the dist build more honest, but it also surfaced the deeper `TS6305` source-boundary issue immediately.

### What warrants a second pair of eyes

- The `build:publish-v1` script currently reflects the intended v1 package set, but several packages are still expected to fail until the cross-package build boundaries are corrected.
- The `os-ui-cards` failure should be reviewed together with `tsconfig.json` path/reference strategy across `os-core`, `os-scripting`, `os-ui-cards`, `os-shell`, `os-widgets`, and `os-kanban`.

### What should be done in the future

- Fix package-local TypeScript resolution so referenced platform packages build against publish-style boundaries rather than sibling source trees.
- Once that is green, switch package `exports`, `main`, and `types` from `src/*` to `dist/*`.
- After that, add `files` allowlists and package metadata for actual npm publishing.

### Code review instructions

- Start with `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs`.
- Then review the added `build:dist` and `build:publish-v1` scripts in:
  - `workspace-links/go-go-os-frontend/package.json`
  - `workspace-links/go-go-os-frontend/packages/*/package.json`
- Validate with:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/engine`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/repl`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:dist -w packages/ui-runtime`

### Technical details

- Linked repo commit:
  - `8db71adec71516a3e122fc46ead30d7c7ebdcd40` (`go-go-os-frontend`)
- Commands run in this step:
  - `npm run build:dist -w packages/engine`
  - `npm run build:dist -w packages/repl`
  - `npm run build:dist -w packages/ui-runtime`
- Observed good outputs:
  - `Copied 10 asset file(s) into dist.` for `os-core`
  - `Copied 1 asset file(s) into dist.` for `os-repl`

## Step 7: Stage Publish Manifests In `dist/` And Add Pack Smoke Checks

This step starts the publish-manifest layer without breaking the linked-workspace developer flow. Instead of flipping the live package manifests from `src/*` to `dist/*` immediately, the shared dist-build helper now writes a publish-ready `dist/package.json` for each package. That staged manifest rewrites runtime entrypoints to built `.js`, types to `.d.ts`, and `workspace:*` package references to concrete versions.

That keeps the root workspace packages source-first for local development while still producing package roots that can be packed and installed like published artifacts.

### What I did

- Extended `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs` to write `dist/package.json` after each successful dist build.
- Rewrote staged publish-manifest fields inside `dist/package.json`:
  - `exports`
  - `main`
  - `types`
  - `dependencies`
  - `peerDependencies`
  - `optionalDependencies`
- Kept the live workspace manifests unchanged so linked consumers do not silently switch to built artifacts during day-to-day development.
- Added `dist/.npmignore` generation to exclude `*.test.js` and `*.test.d.ts` from packed tarballs.
- Added `workspace-links/go-go-os-frontend/scripts/packages/pack-smoke.mjs` to run `npm pack --json` against staged package roots and fail if test artifacts leak into the tarball.
- Added `pack:smoke-v1` to `workspace-links/go-go-os-frontend/package.json` for the first publish canaries:
  - `packages/os-core`
  - `packages/os-repl`
  - `packages/os-scripting`

### Why

- Flipping the live package manifests to `dist/*` right now would force linked consumers like `apps/os-launcher` onto built artifacts and degrade the current source-linked local workflow before Phase 2 is ready.
- The staged manifest approach gives the migration a publishable artifact boundary now, without pretending the consumer side has already finished its local-dev versus published-package resolution split.
- Rewriting `workspace:*` versions in the staged manifests is necessary for any real pack/install verification.

### What worked

- `build:publish-v1` still passes end-to-end after the staged manifest generation was added.
- The staged manifests now produce publish-style package roots such as:
  - `packages/os-core/dist/package.json`
  - `packages/os-repl/dist/package.json`
  - `packages/os-scripting/dist/package.json`
- The staged manifests now rewrite internal workspace dependencies to concrete versions, for example:
  - `@go-go-golems/os-scripting` -> `@go-go-golems/os-core: "0.1.0"`
  - `@go-go-golems/os-widgets` -> `@go-go-golems/os-shell: "0.1.0"` in `peerDependencies`
- `npm pack` now succeeds against the staged package roots for the first canaries, and the resulting tarballs do not contain test artifacts.
- The scripted smoke check now passes:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run pack:smoke-v1`

### What didn't work

- Running `npm run build:dist -w packages/os-widgets` in isolation after changing the helper still failed until `os-shell` had been rebuilt first, because the dist-build path still depends on real package order for transitive package consumers.
- That is acceptable for the current migration slice because `build:publish-v1` already encodes the correct order, but it means “standalone package dist build from arbitrary stale dependency state” is still not a supported contract.

### What I learned

- The right short-term publish boundary is not “change every live manifest now.” It is “generate the publish manifest in `dist/` and treat that as the artifact contract.”
- `workspace:*` leakage is best solved at the staged manifest boundary for now, because that is the manifest that `npm pack` and later publish workflows should consume.
- `.npmignore` at the staged package root is a simple way to keep test outputs out of tarballs without having to finish a broader `files` allowlist design first.

### What warrants a second pair of eyes

- The staged manifest approach is intentionally conservative; reviewers should confirm that preserving source-first live manifests is the right tradeoff until the consumer-side resolution split lands.
- The dependency-order sensitivity around `os-widgets` should be reviewed so future validation scripts do not accidentally imply arbitrary out-of-order package dist builds are supported.

### What should be done in the future

- Expand the staged-pack smoke coverage to more v1 packages after deciding which ones should be the next canaries.
- Add a clean external fixture install that consumes the packed tarballs with no workspace links.
- Fill in the remaining publish metadata (`repository`, `homepage`, `bugs`, `license`, ownership) before GitHub Packages publishing.

### Code review instructions

- Start with `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs`.
- Then review `workspace-links/go-go-os-frontend/scripts/packages/pack-smoke.mjs`.
- Then review the new `pack:smoke-v1` script in `workspace-links/go-go-os-frontend/package.json`.
- Validate with:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run build:publish-v1`
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run pack:smoke-v1`

### Technical details

- Key staged outputs now written by `build:dist`:
  - `dist/package.json`
  - `dist/.npmignore`
  - `dist/README.md` when a package-level README exists
- First smoke-packed tarballs:
  - `@go-go-golems/os-core@0.1.0`
  - `@go-go-golems/os-repl@0.1.0`
  - `@go-go-golems/os-scripting@0.1.0`

## Step 8: Install Packed Canaries In A Clean Fixture

This step moves validation one level closer to a real publish consumer. Producing a tarball is useful, but it still leaves open the question of whether a fresh project can install the packed artifacts without relying on workspace links or unresolved `workspace:*` references.

The answer is now yes for the first canary set.

### What I did

- Added `workspace-links/go-go-os-frontend/scripts/packages/install-smoke.mjs`.
- Added `install:smoke-v1` to `workspace-links/go-go-os-frontend/package.json`.
- The install smoke script now:
  - creates a fresh temp fixture project under `/tmp`
  - packs staged `dist/` package roots for the selected canaries
  - installs those tarballs into the fixture with the required React/Redux peer packages
  - verifies the expected top-level package installs via `npm ls --depth=0 --json`
  - removes the fixture and temporary tarballs on success
- Validated the first clean-fixture install set:
  - `packages/os-core`
  - `packages/os-chat`
  - `packages/os-repl`
  - `packages/os-scripting`

### Why

- A staged publish manifest is only useful if a real consumer can install it without access to the monorepo workspace.
- `os-scripting` is the right canary here because it exercises rewritten internal package dependencies on top of `os-core`, `os-chat`, and `os-repl`.

### What worked

- The clean fixture install now passes with:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run install:smoke-v1`
- The canary tarballs install into a fresh temp project with no workspace links.
- The staged manifest rewrite for internal package versions is sufficient for a real `npm install` path on the canary set.

### What I learned

- The migration is now beyond “artifact shape looks plausible.” The canary package set can actually be consumed as packed npm artifacts.
- The next missing proof is downstream composition, not package install mechanics. We still need at least one real app/host consumer to install against packed platform packages rather than source links.

### What warrants a second pair of eyes

- The install smoke currently verifies installability and package presence, not runtime import/execution in Node or browser bundlers. That is the right scope for this step, but it should not be confused with a full consumer integration proof.
- The peer dependency set in the fixture is currently minimal and tuned to the canary packages; that list may need to expand as more packages join the install smoke.

### What should be done in the future

- Add the first downstream consumer smoke case, likely against a small fixture or one of the linked app repos in published-package mode.
- Decide whether the fixture should stay script-owned and ephemeral or graduate into a checked-in sample consumer once the publish path stabilizes.

### Code review instructions

- Start with `workspace-links/go-go-os-frontend/scripts/packages/install-smoke.mjs`.
- Then review the `install:smoke-v1` script in `workspace-links/go-go-os-frontend/package.json`.
- Validate with:
  - `cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend && npm run install:smoke-v1`

### Technical details

- First clean-fixture install set:
  - `@go-go-golems/os-core`
  - `@go-go-golems/os-chat`
  - `@go-go-golems/os-repl`
  - `@go-go-golems/os-scripting`

## Step 9: Prove Inventory Against Packed Platform Packages

This step closes the first real downstream-consumer proof. The inventory app is the right target because it is a true external consumer of the platform packages rather than the package repo itself, and it imports enough of the runtime stack to make the validation meaningful.

The stable code changes here are in the inventory repo itself:

- declare the platform packages that inventory actually imports
- add a published-mode TypeScript config with no workspace path aliases
- make Vite aliasing switchable between workspace-source mode and published-package mode

### What I did

- Added missing direct platform dependencies to `workspace-links/go-go-app-inventory/apps/inventory/package.json`:
  - `@go-go-golems/os-core`
  - `@go-go-golems/os-shell`
  - `@go-go-golems/os-confirm`
- Added `typecheck:published` to `workspace-links/go-go-app-inventory/apps/inventory/package.json`.
- Added `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.published.json` with no linked-workspace `paths` or project `references`.
- Updated `workspace-links/go-go-app-inventory/tooling/vite/createHypercardViteConfig.ts` so frontend resolution now has two modes:
  - `workspace` mode for linked local development
  - `published` mode for package-consumer resolution
- Verified inventory against packed platform tarballs in a temp fixture by:
  - building the v1 platform dist artifacts in `go-go-os-frontend`
  - installing inventory’s normal dependencies in the fixture
  - layering packed platform tarballs into the fixture
  - running published-mode typecheck
  - running published-mode Vite build

### Why

- The migration needed one proof that a real downstream app can stop resolving `../../../go-go-os-frontend/packages/*/src` and still build against packed platform artifacts.
- Inventory was also surfacing a real package-contract problem: it imported `os-core`, `os-shell`, and `os-confirm` without declaring them.

### What worked

- Inventory published-mode typecheck passed in the temp fixture:
  - `npm run typecheck:published`
- Inventory published-mode Vite build passed in the temp fixture:
  - `GO_GO_OS_FRONTEND_RESOLUTION=published npm exec -- vite build`
- That fixture used packed platform tarballs rather than any source-path aliases from `go-go-os-frontend`.

### What didn't work

- Fresh-fixture npm install automation is still flaky in a way that is not specific to the publish migration itself:
  - `codemirror@6.0.2` tries to run `cm-buildhelper` during some fresh npm installs
  - npm Arborist is also unstable when layering multiple interdependent local tarballs in one step
- I attempted to stabilize that as a checked-in smoke harness, but it remained unreliable enough that I dropped the wrapper from the committed surface instead of committing a broken script.

### What I learned

- The consumer-side package assumptions were not fully honest before this step. Inventory’s manifest was missing three platform dependencies that source-path aliasing had been hiding.
- The published-mode split is real now for inventory:
  - TypeScript can run with no workspace path aliases
  - Vite can resolve either from linked source or installed packages based on mode
- The package graph itself is good enough for a real downstream app build; the remaining friction is around fresh-fixture npm automation stability.

### What warrants a second pair of eyes

- The newly declared inventory dependencies (`os-core`, `os-shell`, `os-confirm`) should be reviewed as a package-contract correction rather than a migration-only workaround.
- The Vite resolution mode switch in `createHypercardViteConfig.ts` is intentionally minimal; reviewers should confirm that the default auto-detection remains correct for local engineers who still use the linked frontend repo.

### What should be done in the future

- Stabilize an automated downstream packed-platform smoke script once the fresh-fixture npm install path is less flaky.
- Reuse the same published-mode resolution pattern in `wesen-os` and any other app repos that still assume `go-go-os-frontend/packages/*/src`.

### Code review instructions

- Start with:
  - `workspace-links/go-go-app-inventory/apps/inventory/package.json`
  - `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.published.json`
  - `workspace-links/go-go-app-inventory/tooling/vite/createHypercardViteConfig.ts`
- Then review the exact manual validation sequence recorded below.

### Technical details

- Manual downstream-consumer proof used inventory in a temp fixture and succeeded with this sequence:
  - `pnpm install --ignore-scripts` for the app’s normal dependencies
  - `npm install --no-save --legacy-peer-deps --ignore-scripts <packed os-core..os-confirm tarballs>`
  - `npm run typecheck:published`
  - `GO_GO_OS_FRONTEND_RESOLUTION=published npm exec -- vite build`
- The successful published-mode build emitted a full production Vite output, including the QuickJS wasm assets, from the inventory fixture.
