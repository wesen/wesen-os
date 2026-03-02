# Tasks

## Phase 0: Discovery And Ticket Setup

- [x] Confirm remaining OS-02 gaps from task checklist and current code.
- [x] Create OS-05 follow-up ticket workspace with implementation plan + diary.
- [x] Relate launcher/docs files that will be touched.

## Phase 1: Launcher Help Corpus Backend Wiring

- [x] Add launcher help-doc store loader that converts embedded glazed help sections into docs records.
- [x] Add `/api/os/help` endpoint returning launcher help TOC.
- [x] Add `/api/os/help/{slug}` endpoint returning one launcher help document.
- [x] Define stable launcher module id and URL patterns for help-backed docs records.

## Phase 2: Aggregate Docs Inclusion

- [x] Extend `/api/os/docs` aggregation to include launcher help corpus entries.
- [x] Ensure aggregate filtering works for launcher docs (`module=...`, `doc_type=...`, `topics=...`, `query=...`).
- [x] Ensure facets include launcher module/doc types/topics when help docs are loaded.

## Phase 3: Tests

- [x] Add integration coverage for `/api/os/help` and `/api/os/help/{slug}`.
- [x] Extend `/api/os/docs` integration tests to assert launcher help presence and module filtering.
- [x] Run targeted launcher integration tests and full `go test ./...` in `wesen-os`.

## Phase 4: OS-02 Closure Bookkeeping

- [x] Update OS-02 tasks/changelog to reflect launcher help aggregation completion.
- [x] Re-run `docmgr --root . doctor --ticket OS-02 --stale-after 30` and capture remaining warnings (if any).
- [x] Document closure evidence and residual follow-ups (if none, explicitly state none).

## Phase 5: Commit Hygiene

- [x] Commit ticket scaffolding + implementation plan/docs.
- [x] Commit backend endpoint implementation + tests.
- [x] Commit OS-02 closure/task/changelog/docmgr updates.
