# Tasks

## Phase 0 - Baseline and Safety Rails

- [x] `GEPA10-00` Capture baseline build/test status in `go-go-os`, `go-go-app-inventory`, and `wesen-os`; record in diary.
- [x] `GEPA10-01` Build current frontend dependency map (`apps/os-launcher` imports, workspace package graph).
- [x] `GEPA10-02` Document known stale script references and pre-existing breakpoints (example: missing `launcher:binary:build` in `go-go-os` root scripts).

## Phase 1 - Move Inventory Frontend Ownership

- [x] `GEPA10-10` Bootstrap JS workspace in `go-go-app-inventory` (`package.json`, `pnpm-workspace.yaml`, root `tsconfig.json`).
- [x] `GEPA10-11` Move `go-go-os/apps/inventory` to `go-go-app-inventory/apps/inventory` using `mv`.
- [x] `GEPA10-12` Rewire inventory package scripts and TypeScript references in `go-go-app-inventory`.
- [x] `GEPA10-13` Remove `apps/inventory` references from `go-go-os` root workspace/build scripts.
- [x] `GEPA10-14` Verify inventory package can run `dev`, `build`, and tests in `go-go-app-inventory`.

## Phase 2 - Stabilize App Public API Contracts

- [x] `GEPA10-20` Add explicit public launcher/reducer exports in `@hypercard/inventory`.
- [x] `GEPA10-21` Replace launcher source-path imports (`@hypercard/inventory/src/*`) with package export imports.
- [x] `GEPA10-22` Add/adjust tests proving launcher works with only public inventory exports.
- [x] `GEPA10-23` Add guardrail grep/test to prevent new `@hypercard/inventory/src/*` imports.

## Phase 3 - Move Launcher Frontend to wesen-os

- [x] `GEPA10-30` Bootstrap JS workspace in `wesen-os` (`package.json`, `pnpm-workspace.yaml`, root `tsconfig.json`).
- [x] `GEPA10-31` Run dependency wiring spike in `wesen-os` to validate cross-repo package resolution strategy.
- [x] `GEPA10-32` Move `go-go-os/apps/os-launcher` to `wesen-os/apps/os-launcher` using `mv`.
- [x] `GEPA10-33` Rewire launcher dependencies to consume `go-go-os` platform packages and `go-go-app-inventory` app package.
- [x] `GEPA10-34` Ensure `wesen-os/apps/os-launcher` runs `dev`, `build`, and tests.

## Phase 4 - Dist and Binary Assembly Ownership in wesen-os

- [x] `GEPA10-40` Add `launcher:frontend:build` script in `wesen-os`.
- [x] `GEPA10-41` Add `launcher:ui:sync` script to copy launcher dist into `wesen-os/pkg/launcherui/dist`.
- [x] `GEPA10-42` Add `launcher:binary:build` script chaining frontend build, sync, and Go binary build.
- [x] `GEPA10-43` Add/update smoke script in `wesen-os` validating root UI and namespaced backend endpoints.
- [x] `GEPA10-44` Remove obsolete launcher build/sync scripts from `go-go-os` and validate docs/scripts are coherent.

## Phase 5 - Docs, CI, and Handoff

- [x] `GEPA10-50` Update READMEs across all repos with final ownership boundaries and run instructions.
- [x] `GEPA10-51` Add or adjust CI jobs so launcher frontend build runs from `wesen-os`.
- [x] `GEPA10-52` Produce final package relationship diagram and startup sequence snippet in the ticket.
- [x] `GEPA10-53` Keep detailed migration diary with commands, failures, and resolutions.
- [x] `GEPA10-54` Run `docmgr doctor --ticket GEPA-10-FRONTEND-SPLIT-CLEANUP --stale-after 30` and resolve warnings.
