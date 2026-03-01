# Tasks

## Completed

- [x] Create ticket workspace `GEPA-09-REPO-SPLIT-ARCHITECTURE`
- [x] Map current backend host contracts and lifecycle behavior
- [x] Map current frontend launcher/module contracts and runtime assumptions
- [x] Identify split blockers and coupling points (build, embed, imports, routing)
- [x] Produce long-form architecture design document (10+ pages target)
- [x] Produce chronological research diary with command evidence
- [x] Produce v2 renamed topology design for `wesen-os` + `go-go-app-inventory`
- [x] Produce detailed execution task board for first-plan implementation

## Backend-Only Split Execution Board (Detailed)

### Completed in this run

- [x] S1: Finalize backend-only task decomposition in ticket docs and commit workspace baseline.
  - Evidence: `go-go-gepa@25b9212` (`docs(gepa-09): add v2 wesen-os backend split plan and task board`)
- [x] S2: Extract inventory backend source from `go-go-os/go-inventory-chat` into `go-go-app-inventory` using `mv` for source-preserving history.
  - Evidence: `go-go-app-inventory@45127d1` (`feat: extract inventory backend packages from go-go-os`)
  - Evidence: `go-go-os@4f6c181` (`refactor: move inventory backend sources to go-go-app-inventory`)
- [x] S3: Extract generic backend host + launcher + GEPA host package from `go-go-os` into `wesen-os` using `mv`.
  - Evidence: `wesen-os@59bd4c6` (`feat: move os backend host and launcher into wesen-os`)
  - Evidence: `go-go-os@dc4dd17` (`refactor: remove moved backend host and launcher sources`)
- [x] S4: Rewire imports and module dependencies for cross-repo build and run validation.
  - `wesen-os` import rewrites to `go-go-app-inventory/pkg/*`
  - `wesen-os` module init + local replace for `go-go-app-inventory`
- [x] S5: Fix integration contract regression (`registry` key in profile list items) and re-run tests.
  - Validation: `cd wesen-os && GOWORK=off go test ./...` passes

### Pending backend tasks (next commits)

- [x] B1: Introduce an explicit host-agnostic `Component` API package in `go-go-app-inventory` (instead of direct launcher-level wiring).
  - Evidence: `go-go-app-inventory@be6865d` (`feat: add host-agnostic inventory backend component API`)
  - Evidence: `wesen-os@b126596` (`refactor: adapt wesen-os inventory module to component API`)
- [x] B2: Add inventory component manifest/lifecycle/route-contract tests in `go-go-app-inventory` to harden repo boundary.
  - Evidence: `go-go-app-inventory/pkg/backendcomponent/component_test.go`
- [x] B3: Replace copied `wesen-os/pkg/gepa` internals with adapter over `go-go-gepa` exported APIs.
  - Evidence: `go-go-gepa@21635cc` (`feat: extract gepa backend module package for os adapters`)
  - Evidence: `wesen-os@4d4a61c` (`refactor: adapt wesen-os gepa module to go-go-gepa backend package`)
- [x] B4: Add explicit dependency/version matrix docs for `wesen-os` consuming `go-go-gepa` and `go-go-app-inventory`.
  - Evidence: `design-doc/02-v2-wesen-os-composition-plan-go-go-os-go-go-gepa-go-go-app-inventory.md` (dependency/version matrix section)
- [x] B5: Add backend smoke pipeline in `wesen-os` CI for `/api/os/apps`, `/api/apps/inventory/*`, and `/api/apps/gepa/*`.
  - Evidence: `.github/workflows/push.yml` runs `go test ./...`
  - Evidence: `cmd/wesen-os-launcher/main_integration_test.go` covers `/api/os/apps`, inventory routes, and GEPA routes
- [x] B6: Remove stale empty directories in `go-go-os/go-inventory-chat` and document residual ownership boundary.
  - Note: directories were untracked empties and were removed locally; no git diff was produced.
- [x] B7: Prepare phase-2 extraction handoff notes (generic external plugin runtime), backend-only scope.
  - Evidence: `design-doc/03-phase-2-backend-plugin-runtime-handoff-notes.md`

## Plan Reference

- `design-doc/02-v2-wesen-os-composition-plan-go-go-os-go-go-gepa-go-go-app-inventory.md`

## Cleanup Round: Generic Host Back To `go-go-os`

### Goal

Move generic module mounting + web-serving host machinery out of `wesen-os` and back into `go-go-os/go-inventory-chat`, leaving `wesen-os` as composition/registration runtime.

### Tasks

- [x] C1: Add cleanup task board and diary section for this round.
- [x] C2: Move `pkg/backendhost` from `wesen-os` to `go-go-os/go-inventory-chat/pkg/backendhost` using `mv`.
  - Evidence: `go-go-os@b627d8e` (`feat(go-go-os): restore generic backendhost package`)
- [x] C3: Rewire `wesen-os` imports/go.mod to consume `github.com/go-go-golems/hypercard-inventory-chat/pkg/backendhost`.
  - Evidence: `wesen-os@ad3634e` (`refactor(wesen-os): consume backendhost from go-go-os module`)
- [x] C4: Move `pkg/launcherui` from `wesen-os` to `go-go-os/go-inventory-chat/pkg/launcherui` using `mv`.
  - Evidence: `go-go-os@02ff51d` (`feat(go-go-os): restore launcher UI web-serving package`)
- [x] C5: Rewire `wesen-os` imports/go.mod to consume `github.com/go-go-golems/hypercard-inventory-chat/pkg/launcherui`.
  - Evidence: `wesen-os@7bf47f7` (`refactor(wesen-os): consume launcherui from go-go-os module`)
- [x] C6: Run compile/test validation across `go-go-os/go-inventory-chat`, `wesen-os`, `go-go-app-inventory`, and `go-go-gepa/pkg/backendmodule`.
  - Validation: all target test commands pass.
- [x] C7: Update diary/changelog with commit-by-commit cleanup log.

## Adjustment Round: Launcher UI In `wesen-os` + Module Rename

### Goal

Apply follow-up correction:

1. keep `launcherui` package in `wesen-os` (frontend bundling/composition responsibility),
2. rename `go-go-os/go-inventory-chat` Go module path from `hypercard-inventory-chat` to `go-go-os`.

### Tasks

- [x] D1: Add adjustment task board and diary kickoff for this correction round.
- [x] D2: Move `pkg/launcherui` back from `go-go-os/go-inventory-chat` to `wesen-os` using `mv`.
  - Evidence: `wesen-os@fee0b19` (`refactor(wesen-os): keep launcherui local and consume go-go-os backendhost`)
  - Evidence: `go-go-os@5a74c79` (`refactor(go-go-os): rename go module and remove launcherui package`)
- [x] D3: Rename module path in `go-go-os/go-inventory-chat/go.mod` to `github.com/go-go-golems/go-go-os`.
  - Evidence: `go-go-os@5a74c79`
- [x] D4: Rewire `wesen-os` imports/go.mod replaces to consume `github.com/go-go-golems/go-go-os/pkg/backendhost` while using local `wesen-os/pkg/launcherui`.
  - Evidence: `wesen-os@fee0b19`
- [x] D5: Run full validation matrix and update diary/changelog with commit evidence.
- [x] D6: Rename backend directory from `go-inventory-chat` to `go-go-os` and remove stale launcher assembly scripts from `go-go-os`.
  - Evidence: `go-go-os@6d4302a` (`refactor(go-go-os): rename backend directory and drop launcher assembly scripts`)
  - Evidence: `wesen-os@1bfdf2a` (`chore(wesen-os): update local go-go-os replace path`)
