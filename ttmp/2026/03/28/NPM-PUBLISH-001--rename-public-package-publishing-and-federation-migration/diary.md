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
