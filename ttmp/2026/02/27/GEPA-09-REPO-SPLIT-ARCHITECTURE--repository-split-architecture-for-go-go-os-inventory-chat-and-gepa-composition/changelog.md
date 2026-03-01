# Changelog

## 2026-02-27

- Initial workspace created
- Added design document `design-doc/01-repository-split-blueprint-and-implementation-roadmap.md`
- Added investigation diary `reference/01-research-diary-repo-split-architecture.md`
- Documented 3-repo target split, no-compatibility cut, API contracts, and composition bootstrap sequence

## 2026-02-27

Completed deep pre-implementation research for 3-repo split (frontend, inventory-chat, composition) with no-backwards-compatibility migration, API contracts, and initialization sequence.

### Related Files

- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--repository-split-architecture-for-go-go-os-inventory-chat-and-gepa-composition/design-doc/01-repository-split-blueprint-and-implementation-roadmap.md — Primary architecture deliverable
- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--repository-split-architecture-for-go-go-os-inventory-chat-and-gepa-composition/reference/01-research-diary-repo-split-architecture.md — Research diary with command trace

## 2026-02-27

- Added V2 design update with renamed topology:
  - composition repo renamed to `wesen-os`
  - inventory backend extraction target renamed to `go-go-app-inventory`
- Reframed first-plan composition inputs to:
  - `go-go-os`
  - `go-go-gepa`
  - `go-go-app-inventory`
- Added detailed phased implementation task board for v2 execution.

## 2026-02-27

Added v2 renamed plan for wesen-os composition and go-go-app-inventory backend extraction, including detailed phased task board and reMarkable delivery.

### Related Files

- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--repository-split-architecture-for-go-go-os-inventory-chat-and-gepa-composition/design-doc/02-v2-wesen-os-composition-plan-go-go-os-go-go-gepa-go-go-app-inventory.md — V2 primary plan
- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--repository-split-architecture-for-go-go-os-inventory-chat-and-gepa-composition/tasks.md — Task list synced with v2 execution

## 2026-02-27

Executed backend-only split tasks with commit-by-commit progress across repos and `mv`-first extraction.

### Commits produced

- `go-go-app-inventory@45127d1` — extracted inventory backend packages from `go-go-os`
- `go-go-os@4f6c181` — removed/moved inventory backend sources after extraction
- `wesen-os@59bd4c6` — moved backend host + launcher runtime into composition repo
- `go-go-os@dc4dd17` — removed/moved backend host + launcher sources after extraction

### Validation

- `cd go-go-app-inventory && GOWORK=off go test ./...` passed
- `cd wesen-os && GOWORK=off go test ./...` passed (after profile contract test key update)

### Related Files

- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--repository-split-architecture-for-go-go-os-inventory-chat-and-gepa-composition/tasks.md
- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--repository-split-architecture-for-go-go-os-inventory-chat-and-gepa-composition/reference/01-research-diary-repo-split-architecture.md

## 2026-02-27

Implemented B1/B2 backend extraction tasks:

- moved inventory backend module implementation out of `wesen-os` and into `go-go-app-inventory` as host-agnostic component API
- replaced `wesen-os` inventory module with adapter over extracted component
- added component contract tests (manifest/lifecycle/route guard checks)

### Commits produced

- `go-go-app-inventory@be6865d` — `feat: add host-agnostic inventory backend component API`
- `wesen-os@b126596` — `refactor: adapt wesen-os inventory module to component API`

### Validation

- `cd go-go-app-inventory && GOWORK=off go test ./...` passed
- `cd wesen-os && GOWORK=off go test ./...` passed

### Notes

- Pre-work on B3 found no currently exported reusable GEPA backend module package in `go-go-gepa`; documented as blocker/options in diary.

## 2026-02-27

Resolved B3 by extracting GEPA backend core into `go-go-gepa` and switching `wesen-os` to adapter mode.

### Commits produced

- `go-go-gepa@21635cc` — `feat: extract gepa backend module package for os adapters`
- `wesen-os@4d4a61c` — `refactor: adapt wesen-os gepa module to go-go-gepa backend package`

### Validation

- `cd go-go-gepa && GOWORK=off go test ./pkg/backendmodule` passed
- `cd wesen-os && GOWORK=off go test ./...` passed

### Notes

- `wesen-os/pkg/gepa` now contains adapter-only host integration code.
- GEPA backend behavior/tests live in `go-go-gepa/pkg/backendmodule`.

## 2026-02-27

Closed B4/B5 planning tasks in ticket docs:

- added explicit dependency/version matrix to v2 design doc
- marked backend smoke pipeline complete using existing `go test ./...` CI + integration endpoint coverage

## 2026-02-27

Closed B7 with phase-2 backend plugin-runtime handoff notes document:

- `design-doc/03-phase-2-backend-plugin-runtime-handoff-notes.md`

## 2026-02-27

Started and executed cleanup round to move generic host/mounting web-serving machinery back to `go-go-os`.

### Commits produced

- `go-go-gepa@f1b5c9c` — added cleanup task board and diary kickoff
- `go-go-os@b627d8e` — restored `pkg/backendhost`
- `wesen-os@ad3634e` — rewired backendhost imports to `go-go-os` module
- `go-go-os@02ff51d` — restored `pkg/launcherui`
- `wesen-os@7bf47f7` — rewired launcherui imports to `go-go-os` module

### Validation

- `go-go-os/go-inventory-chat`: `GOWORK=off go test ./...` passed
- `wesen-os`: `GOWORK=off go test ./...` passed
- `go-go-app-inventory`: `GOWORK=off go test ./...` passed
- `go-go-gepa/pkg/backendmodule`: `GOWORK=off go test ./pkg/backendmodule` passed

## 2026-02-27

Applied adjustment round:

- kept `launcherui` in `wesen-os` (moved back from `go-go-os/go-inventory-chat`)
- renamed `go-go-os/go-inventory-chat` module path to `github.com/go-go-golems/go-go-os`
- rewired `wesen-os` to import `github.com/go-go-golems/go-go-os/pkg/backendhost`

### Commits produced

- `go-go-gepa@8f97a30` — adjustment task board + diary kickoff
- `go-go-os@5a74c79` — module rename + launcherui removal
- `wesen-os@fee0b19` — launcherui local + backendhost import/replace rewiring

## 2026-02-27

Applied final rename cleanup requested:

- renamed backend directory `go-go-os/go-inventory-chat` -> `go-go-os/go-go-os`
- removed stale launcher assembly scripts from `go-go-os`
- updated local replace path in `wesen-os`

### Commits produced

- `go-go-os@6d4302a` — directory rename + launcher script cleanup
- `wesen-os@1bfdf2a` — replace path update to new directory

## 2026-02-28

Cleanup: all ticket tasks complete; closing ticket.

