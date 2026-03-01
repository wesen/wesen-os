# Tasks

## Completed Discovery

- [x] Analyze existing OS-02 proposed designs against current backend host and module code.
- [x] Produce a backend-focused implementation plan with file-level phases and API contracts.
- [x] Create and maintain a detailed investigation diary for this ticket step.
- [x] Refresh startup playbook for reliable backend+frontend tmux startup and dependency/bootstrap prerequisites.

## Phase 1: Core Contracts And Parser (`go-go-os-backend`)

- [x] Add `pkg/docmw` package scaffold:
- [x] Create `pkg/docmw/docmw.go` with `ModuleDoc`, `DocStore`, parse/load helpers.
- [x] Create `pkg/docmw/vocabulary.go` for optional topic/doc_type vocabulary checks.
- [x] Create `pkg/docmw/vocabulary.yaml` with initial shared vocabulary.
- [x] Add deterministic slug/order sorting in doc store.
- [x] Add strict required-frontmatter checks (`Title`, `DocType`).
- [x] Add parser support for `Topics`, `Summary`, `SeeAlso`, `Order`.
- [x] Add TOC projection helper that excludes large `Content`.
- [x] Add HTTP route helpers for module-local docs endpoints:
- [x] `GET /docs`
- [x] `GET /docs/{slug}`
- [x] Add tests in `pkg/docmw/docmw_test.go`:
- [x] parse success for valid frontmatter+markdown
- [x] parse failure for missing required fields
- [x] slug collision behavior
- [x] sort order behavior
- [x] route handler response contracts

## Phase 2: Host Manifest Extension (`go-go-os-backend/pkg/backendhost`)

- [x] Add optional `DocumentableAppBackendModule` interface in `module.go`.
- [x] Add manifest docs hint model in `manifest_endpoint.go`:
- [x] `available`
- [x] `url`
- [x] `count`
- [x] `version`
- [x] Enrich `/api/os/apps` output with docs hint when module implements documentable interface.
- [x] Keep reflection behavior unchanged.
- [x] Extend backendhost tests:
- [x] docs hint present for documentable module
- [x] docs hint absent for non-documentable module
- [x] docs hint coexists with reflection hint

## Phase 3: Inventory Docs Rollout (`go-go-app-inventory`)

- [x] Add inventory docs source directory under module ownership (`pkg/backendmodule/docs/`).
- [x] Author initial inventory docs pages:
- [x] `overview.md`
- [x] `api-reference.md`
- [x] `profiles-and-runtime.md`
- [x] `troubleshooting.md`
- [x] Load docs store in inventory backend module init path.
- [x] Mount module-local docs routes (`/docs`, `/docs/{slug}`) in inventory module.
- [x] Expose `DocStore()` from inventory module.
- [x] Add inventory module tests:
- [x] docs loader initialization
- [x] docs TOC endpoint
- [x] docs slug endpoint
- [x] manifest docs hint integration expectations

## Phase 4: ARC-AGI Docs Rollout (`go-go-app-arc-agi-3`)

- [x] Add ARC docs source directory (`pkg/backendmodule/docs/`).
- [x] Migrate/split current ARC guide into structured pages:
- [x] `overview.md`
- [x] `session-lifecycle.md`
- [x] `api-reference.md`
- [x] `runtime-modes.md`
- [x] Load docs store in ARC module startup/init.
- [x] Mount ARC docs routes (`/docs`, `/docs/{slug}`).
- [x] Expose `DocStore()` from ARC module.
- [x] Update ARC reflection docs links to point to docs endpoints where applicable.
- [x] Add ARC tests for docs routes and reflection/docs consistency.

## Phase 5: GEPA Docs Rollout (`go-go-gepa`)

- [x] Add GEPA docs source directory (`pkg/backendmodule/docs/`).
- [x] Author initial GEPA docs pages:
- [x] `overview.md`
- [x] `scripts-and-runs.md`
- [x] `api-reference.md`
- [x] Load docs store in GEPA module startup/init.
- [x] Mount GEPA docs routes (`/docs`, `/docs/{slug}`).
- [x] Expose `DocStore()` from GEPA module.
- [x] Keep `wesen-os/pkg/gepa/module.go` adapter thin (mapping only).
- [x] Add GEPA tests for docs routes and store exposure.

## Phase 6: Composition Aggregation Endpoint (`wesen-os`)

- [x] Add composition docs endpoint implementation:
- [x] Create `cmd/wesen-os-launcher/docs_endpoint.go`.
- [x] Register `GET /api/os/docs` in launcher mux wiring.
- [x] Aggregate docs across documentable modules.
- [x] Add query filters:
- [x] `query`
- [x] `topics`
- [x] `doc_type`
- [x] `module`
- [x] Return facets:
- [x] topics
- [x] doc_types
- [x] modules
- [ ] Optionally include launcher help docs corpus (if available in-memory at startup).
- [x] Add `/api/os/docs` behavior tests (implemented in launcher integration tests).

## Phase 7: Integration And Regression Testing (`wesen-os`)

- [x] Extend `main_integration_test.go`:
- [x] `/api/os/apps` contains docs hints for inventory/arc-agi/gepa
- [x] `/api/apps/inventory/docs` returns TOC
- [x] `/api/apps/arc-agi/docs` returns TOC
- [x] `/api/apps/gepa/docs` returns TOC
- [x] `/api/os/docs` returns aggregated results
- [x] `/api/os/docs` filters by module/topic/doc_type/query
- [x] Ensure existing reflection endpoints still pass
- [x] Ensure inventory chat/ws/timeline/profile/confirm routes still pass

## Phase 8: Frontend Handshake Tasks (Backend-Ready Contract Support)

- [ ] Update `go-go-os-frontend/apps/apps-browser/src/domain/types.ts` for manifest `docs` hint.
- [ ] Update `go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts` for docs endpoint fetchers.
- [ ] Add frontend rendering states:
- [ ] docs available
- [ ] docs unavailable
- [ ] docs endpoint error
- [ ] Add frontend tests for docs hint rendering and docs page navigation.

## Phase 9: Documentation And Operational Runbooks

- [ ] Update backend developer guide with docs contract details and examples.
- [ ] Update full-app tutorial with docs endpoint integration pattern.
- [ ] Add curl smoke snippets for:
- [ ] `/api/os/apps`
- [ ] `/api/apps/{id}/docs`
- [ ] `/api/apps/{id}/docs/{slug}`
- [ ] `/api/os/docs`
- [ ] Add troubleshooting section for common failures:
- [ ] missing embedded docs files
- [ ] malformed frontmatter
- [ ] empty docs index
- [ ] cross-repo dependency/setup drift

## Final Acceptance Gates

- [x] `go test ./...` passes in:
- [x] `go-go-os-backend`
- [x] `go-go-app-inventory`
- [x] `go-go-app-arc-agi-3`
- [x] `go-go-gepa`
- [x] `wesen-os`
- [ ] Manual smoke confirms docs endpoints for all three apps.
- [ ] `docmgr doctor --ticket OS-02` passes.
- [ ] Ticket diary/changelog/index reflect final implementation state and handoff notes.
