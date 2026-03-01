---
Title: Frontend split execution diary
Ticket: GEPA-10-FRONTEND-SPLIT-CLEANUP
Status: active
Topics:
    - architecture
    - frontend
    - go-go-os
    - go-go-app-inventory
    - wesen-os
    - bundling
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Chronological research and planning diary for GEPA-10 frontend split."
LastUpdated: 2026-02-27T22:50:00-05:00
WhatFor: "Track implementation-relevant findings, command outputs, and decisions."
WhenToUse: "Read before executing tasks; append entries during implementation."
---

# Frontend split execution diary

## Goal

Record a concrete, command-backed chronology for GEPA-10 so implementation can continue without re-discovery.

## Context

Ticket scope:

1. Keep engine/common frontend packages in `go-go-os`.
2. Move `apps/inventory` to `go-go-app-inventory`.
3. Move launcher bundling/dist responsibility to `wesen-os`.

## Quick Reference

### Key commands used during pre-research

```bash
cd go-go-os && nl -ba package.json | sed -n '1,260p'
cd go-go-os && nl -ba pnpm-workspace.yaml | sed -n '1,240p'
cd go-go-os && nl -ba apps/inventory/package.json | sed -n '1,260p'
cd go-go-os && nl -ba apps/os-launcher/package.json | sed -n '1,260p'
cd go-go-os && rg -n "@hypercard/inventory/src/" apps/os-launcher -S

cd wesen-os && ls -la
cd wesen-os && nl -ba pkg/launcherui/handler.go | sed -n '1,320p'
cd wesen-os && nl -ba cmd/wesen-os-launcher/main.go | sed -n '220,260p'

cd go-go-app-inventory && ls -la
cd go-go-app-inventory && rg --files | rg 'package.json$|apps/'
```

### Immediate findings to keep in mind

1. `go-go-os` is still the JS monorepo owner today.
2. `go-go-app-inventory` currently has no frontend workspace.
3. `wesen-os` has launcher UI embed handler but no frontend build workspace.
4. `go-go-os` has stale launcher script references that must be cleaned during migration.

## Usage Examples

### Chronology

1. 2026-02-27 19:05 ET - Ticket baseline inspection
   - Located ticket workspace:
     - `go-go-gepa/ttmp/2026/02/27/GEPA-10-FRONTEND-SPLIT-CLEANUP--frontend-split-and-bundling-migration-go-go-os-go-go-app-inventory-wesen-os`
   - Opened initial `tasks.md` and design doc; both were template-level and needed expansion.

2. 2026-02-27 19:10 ET - Frontend ownership verification in `go-go-os`
   - Evidence:
     - `go-go-os/package.json:9-18` builds `apps/inventory` and `apps/os-launcher`.
     - `go-go-os/pnpm-workspace.yaml:1-3` includes `packages/*` and `apps/*`.
     - `go-go-os/apps/os-launcher/package.json:14-19` depends on `@hypercard/inventory`.
   - Interpretation:
     - Frontend split has not yet occurred; this is still pre-migration state.

3. 2026-02-27 19:14 ET - Coupling analysis (launcher to inventory)
   - Evidence:
     - `go-go-os/apps/os-launcher/src/app/modules.tsx:4` imports inventory launcher module from app source.
     - `go-go-os/apps/os-launcher/src/app/store.ts:8-9` imports inventory reducers from source paths.
   - Interpretation:
     - Must introduce public exports in inventory package before/while moving repo boundaries.

4. 2026-02-27 19:18 ET - `wesen-os` readiness check
   - Evidence:
     - No `package.json`, no `pnpm-workspace.yaml`, no `apps/`.
     - `wesen-os/pkg/launcherui/handler.go:12-22` embeds `dist`.
     - `wesen-os/cmd/wesen-os-launcher/main.go:241-242` mounts launcher UI handler at root.
   - Interpretation:
     - Runtime side is ready; frontend build ownership is not bootstrapped yet.

5. 2026-02-27 19:22 ET - `go-go-app-inventory` readiness check
   - Evidence:
     - Repository contains Go command/package structure only; no JS workspace.
   - Interpretation:
     - Need to create JS workspace scaffolding before moving `apps/inventory`.

6. 2026-02-27 19:27 ET - Script drift check in `go-go-os`
   - Evidence:
     - `go-go-os/scripts/smoke-go-go-os-launcher.sh:58` invokes `npm run launcher:binary:build`.
     - That script key is absent in `go-go-os/package.json`.
   - Interpretation:
     - Existing script mismatch is a migration hazard and should be explicitly tracked in tasks.

7. 2026-02-27 19:32 ET - Planning decisions captured
   - Chosen structure:
     - platform packages remain in `go-go-os`.
     - inventory app frontend moves to `go-go-app-inventory`.
     - launcher frontend build/dist moves to `wesen-os`.
   - Added phased execution plan and granular task list for intern onboarding.

8. 2026-02-27 19:45 ET - `GEPA10-00` baseline build/test verification
   - `go-go-os`:
     - `npm run build` passed (Vite chunk-size warnings only; no build failures).
     - `npm run test` passed (non-failing warnings about selector memoization and test `act(...)` usage).
   - `go-go-app-inventory`:
     - `GOWORK=off go test ./...` passed.
   - `wesen-os`:
     - `GOWORK=off go test ./...` passed.
   - Interpretation:
     - Migration can proceed from a green baseline.

9. 2026-02-27 19:50 ET - `GEPA10-01` frontend dependency map snapshot
   - Command:
     - `cd go-go-os && rg -n "from '@hypercard/" apps/os-launcher/src -S`
   - Key findings:
     - Launcher imports multiple app internals via source paths:
       - `@hypercard/inventory/src/...`
       - `@hypercard/crm/src/...`
       - `@hypercard/todo/src/...`
       - `@hypercard/book-tracker-debug/src/...`
     - This confirms package-boundary cleanup is required for cross-repo movement.

10. 2026-02-27 19:52 ET - `GEPA10-02` stale script drift confirmation
   - Commands:
     - `cd go-go-os && nl -ba package.json | sed -n '1,220p'`
     - `cd go-go-os && nl -ba scripts/smoke-go-go-os-launcher.sh | sed -n '50,90p'`
   - Finding:
     - Smoke script invokes `npm run launcher:binary:build` (`scripts/smoke-go-go-os-launcher.sh:58`).
     - Root package scripts do not define `launcher:binary:build`.
   - Interpretation:
     - Script ownership and invocation path must be fixed during Phase 4/5 cleanup.

11. 2026-02-27 20:05 ET - `GEPA10-10` + `GEPA10-11` workspace bootstrap and move
   - Commands:
     - `mkdir -p go-go-app-inventory/apps`
     - `mv go-go-os/apps/inventory go-go-app-inventory/apps/`
   - Added frontend workspace scaffolding in `go-go-app-inventory`:
     - `package.json`
     - `pnpm-workspace.yaml`
     - `tsconfig.json`
     - `.storybook/*`
     - `tooling/vite/createHypercardViteConfig.ts`
   - Interpretation:
     - Inventory frontend ownership is now physically in `go-go-app-inventory`.

12. 2026-02-27 20:15 ET - `GEPA10-12` inventory package rewiring
   - Updated moved inventory app config:
     - `apps/inventory/tsconfig.json` paths/references now point to `../../../go-go-os/packages/*`.
     - Removed `workspace:*` dependencies for `@hypercard/*` from `apps/inventory/package.json`.
     - Updated build/typecheck scripts to use root-installed TypeScript binary path.
   - Updated local Vite helper alias paths in `go-go-app-inventory/tooling/vite/createHypercardViteConfig.ts`.

13. 2026-02-27 20:25 ET - `GEPA10-13` go-go-os root reference cleanup
   - Updated `go-go-os/package.json` scripts to remove `apps/inventory` build/storybook dependence.
   - Updated `go-go-os/tsconfig.json` references to remove `apps/inventory` and `apps/os-launcher`.
   - Updated `go-go-os/.storybook/main.ts` to remove inventory story directory.
   - Follow-up fix:
     - Updated `go-go-os/packages/engine/src/__tests__/storybook-app-smoke.test.ts` to remove hardcoded inventory story path.

14. 2026-02-27 20:35 ET - `GEPA10-14` validation run
   - `go-go-app-inventory`:
     - `npm install` passed.
     - `npm run build` passed after TypeScript script fix.
     - `timeout 20s npm run dev -w apps/inventory -- --host 127.0.0.1 --port 5179` showed Vite ready at `http://127.0.0.1:5179/`.
     - `GOWORK=off go test ./...` passed.
   - `go-go-os`:
     - `npm run build` passed.
     - `npm run test` initially failed due removed inventory story path, then passed after updating app smoke test.
   - Interpretation:
     - Phase 1 is complete and validated end-to-end for current boundaries.

15. 2026-02-27 20:50 ET - `GEPA10-20` public export surface in `@hypercard/inventory`
   - Added explicit package exports in `apps/inventory/package.json`:
     - `"./launcher"` -> `src/launcher/public.ts`
     - `"./reducers"` -> `src/reducers.ts`
   - Added new source files:
     - `apps/inventory/src/launcher/public.ts`
     - `apps/inventory/src/reducers.ts`
     - `apps/inventory/src/index.ts`

16. 2026-02-27 20:55 ET - `GEPA10-21` launcher import rewiring
   - Updated imports in `go-go-os/apps/os-launcher`:
     - `modules.tsx`: `@hypercard/inventory/launcher`
     - `store.ts`: `@hypercard/inventory/reducers`
   - Result:
     - No remaining direct inventory source-path imports in launcher app code.

17. 2026-02-27 20:58 ET - `GEPA10-22` + `GEPA10-23` test/guardrail updates
   - Updated `launcherHost.test.tsx`:
     - Added assertion that modules/store import only public inventory exports.
     - Added explicit negative assertions for `@hypercard/inventory/src/`.
     - Repointed file-read checks for inventory source files to new repo path (`go-go-app-inventory`).
   - Validation commands:
     - `go-go-app-inventory`: `npm run build`, `GOWORK=off go test ./...` -> pass
     - `go-go-os`: `npm run build`, `npm run test` -> pass
   - Interpretation:
     - Public API boundary is enforced and regression-guarded.

18. 2026-02-27 21:10 ET - `GEPA10-30` + `GEPA10-32` launcher workspace move to `wesen-os`
   - Commands:
     - `mkdir -p wesen-os/apps`
     - `mv go-go-os/apps/os-launcher wesen-os/apps/`
   - Added workspace bootstrap files in `wesen-os`:
     - `package.json`
     - `pnpm-workspace.yaml`
     - `tsconfig.json`
   - Interpretation:
     - Launcher frontend ownership moved physically into composition repo.

19. 2026-02-27 21:20 ET - `GEPA10-31` dependency wiring spike (first pass failures)
   - `wesen-os` `npm install` passed.
   - Initial `npm run build`/`npm run test` failed with:
     - TypeScript `TS6059` rootDir cross-repo import errors.
     - Module resolution failures for `@hypercard/*` and inventory subpath exports.
   - Outcome:
     - Adjusted launcher tsconfig and resolver strategy for cross-repo import mode.

20. 2026-02-27 21:35 ET - `GEPA10-33` cross-repo resolver rewiring
   - Updated `apps/os-launcher` in `wesen-os`:
     - `tsconfig.json` path mappings now point to:
       - `go-go-os/packages/*` (platform packages)
       - `go-go-os/apps/*` (todo/crm/book-tracker-debug)
       - `go-go-app-inventory/apps/inventory/src/*`
     - Added explicit inventory subpath mappings:
       - `@hypercard/inventory/launcher`
       - `@hypercard/inventory/reducers`
     - Replaced old shared Vite helper with local `vite.config.ts` tuned for composition repo aliases/proxy.
     - Updated `vitest.config.ts` aliases accordingly.

21. 2026-02-27 21:50 ET - `GEPA10-34` validation and test hardening
   - `wesen-os` build reached green first; tests still failed with invalid hook call (duplicate React instance behavior) and stale fixture paths.
   - Fixes applied:
     - Updated launcher host test fixture file paths to moved repo topology (`go-go-os/apps/*` and `go-go-app-inventory/apps/inventory/*`).
     - Added `resolve.dedupe` and explicit React/ReactDOM/ReactRedux aliasing to `go-go-os/packages/engine/node_modules/*` for single runtime identity during tests.
   - Final validation:
     - `wesen-os`: `npm run build` -> pass
     - `wesen-os`: `npm run test` -> pass (`4 files`, `24 tests`)
   - Interpretation:
     - Phase 3 complete with working launcher frontend in `wesen-os`.

22. 2026-02-27 22:05 ET - `GEPA10-40..43` launcher orchestration scripts in `wesen-os`
   - Added `wesen-os` root scripts:
     - `launcher:frontend:build`
     - `launcher:ui:sync`
     - `launcher:binary:build`
     - `launcher:smoke`
   - Added script files:
     - `scripts/launcher-ui-sync.sh` (syncs `apps/os-launcher/dist` -> `pkg/launcherui/dist`)
     - `scripts/build-wesen-os-launcher.sh` (builds `./cmd/wesen-os-launcher` into `build/wesen-os-launcher`)
     - `scripts/smoke-wesen-os-launcher.sh` (boot/run smoke and route checks)
   - Initial smoke failure (hard-cutover profile registry requirement):
     - launcher exited before readiness with:
       - `profile-settings.profile-registries must be configured (hard cutover: no profile-file fallback)`
   - Fix:
     - smoke script now writes a temp runtime registry YAML (`slug` + `profiles.default.runtime.step_settings_patch.ai-chat.ai-engine`) and passes:
       - `--profile default`
       - `--profile-registries <temp-registry-path>`
     - same flags applied to the required-apps negative-path startup check.
   - Validation:
     - `cd wesen-os && npm run launcher:binary:build` -> pass
     - `cd wesen-os && npm run launcher:smoke` -> pass
     - `cd wesen-os && npm run build` -> pass
     - `cd wesen-os && npm run test` -> pass
     - `cd wesen-os && GOWORK=off go test ./...` -> pass

23. 2026-02-27 22:15 ET - `GEPA10-44` launcher script ownership cleanup in `go-go-os`
   - Removed obsolete launcher smoke script from `go-go-os`:
     - `scripts/smoke-go-go-os-launcher.sh` (deleted)
   - Removed stale launcher frontend script key from `go-go-os/package.json`:
     - removed `launcher:frontend:build`
   - Replaced legacy launcher-focused Make targets with generic frontend targets:
     - `build`
     - `test`
     - `storybook-check`
   - Validation:
     - `cd go-go-os && npm run build` -> pass
     - `cd go-go-os && npm run test` -> pass
     - `cd go-go-os && GOWORK=off go test ./...` -> fails with expected non-module workspace error:
       - `pattern ./...: directory prefix . does not contain main module or its selected dependencies`
   - Interpretation:
     - Phase 4 complete: launcher build/dist/smoke ownership is in `wesen-os`; `go-go-os` no longer advertises launcher assembly/smoke as local responsibilities.

24. 2026-02-27 22:30 ET - `GEPA10-50` README ownership boundary updates across repos
   - Updated `go-go-os/README.md`:
     - now documents platform-only ownership and references launcher/inventory ownership in external repos.
   - Updated `go-go-app-inventory/README.md`:
     - now documents inventory domain + frontend package ownership and public package export surface.
   - Updated `wesen-os/README.md`:
     - now documents composition ownership, launcher assembly commands, and workspace prerequisites.
   - Interpretation:
     - onboarding/readme drift has been removed; newcomers now see the same split boundaries reflected in code and docs.

25. 2026-02-27 22:35 ET - `GEPA10-51` CI ownership adjustments
   - Updated `go-go-os/.github/workflows/launcher-ci.yml`:
     - removed launcher app/smoke assumptions,
     - replaced with platform frontend build/test and backendhost go tests.
   - Added `wesen-os/.github/workflows/launcher-frontend-ci.yml`:
     - checks out `go-go-os` + `go-go-app-inventory`,
     - installs frontend dependencies across repos,
     - runs launcher frontend build and tests from `wesen-os`.
   - Implementation note:
     - go-build/release dependency version pinning is intentionally deferred; this task keeps CI focused on frontend split ownership.

26. 2026-02-27 22:40 ET - `GEPA10-52..54` final ticket handoff doc updates + doctor
   - Rewrote design doc section flow to represent final architecture rather than pre-migration assumptions.
   - Added final package graph and runtime initialization sequence snippets.
   - Ran doctor:
     - `cd go-go-gepa && docmgr doctor --ticket GEPA-10-FRONTEND-SPLIT-CLEANUP --stale-after 30`
     - output: `✅ All checks passed`
   - Interpretation:
     - phase 5 handoff artifacts are now complete and consistent.

## Related

1. `../design-doc/01-frontend-split-execution-plan-and-package-graph.md`
2. `../tasks.md`
