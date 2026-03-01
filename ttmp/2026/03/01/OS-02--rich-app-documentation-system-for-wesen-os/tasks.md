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

- [ ] Add inventory docs source directory under module ownership (`pkg/backendmodule/docs/`).
- [ ] Author initial inventory docs pages:
- [ ] `overview.md`
- [ ] `api-reference.md`
- [ ] `profiles-and-runtime.md`
- [ ] `troubleshooting.md`
- [ ] Load docs store in inventory backend module init path.
- [ ] Mount module-local docs routes (`/docs`, `/docs/{slug}`) in inventory module.
- [ ] Expose `DocStore()` from inventory module.
- [ ] Add inventory module tests:
- [ ] docs loader initialization
- [ ] docs TOC endpoint
- [ ] docs slug endpoint
- [ ] manifest docs hint integration expectations

## Phase 4: ARC-AGI Docs Rollout (`go-go-app-arc-agi-3`)

- [ ] Add ARC docs source directory (`pkg/backendmodule/docs/`).
- [ ] Migrate/split current ARC guide into structured pages:
- [ ] `overview.md`
- [ ] `session-lifecycle.md`
- [ ] `api-reference.md`
- [ ] `runtime-modes.md`
- [ ] Load docs store in ARC module startup/init.
- [ ] Mount ARC docs routes (`/docs`, `/docs/{slug}`).
- [ ] Expose `DocStore()` from ARC module.
- [ ] Update ARC reflection docs links to point to docs endpoints where applicable.
- [ ] Add ARC tests for docs routes and reflection/docs consistency.

## Phase 5: GEPA Docs Rollout (`go-go-gepa`)

- [ ] Add GEPA docs source directory (`pkg/backendmodule/docs/`).
- [ ] Author initial GEPA docs pages:
- [ ] `overview.md`
- [ ] `scripts-and-runs.md`
- [ ] `api-reference.md`
- [ ] Load docs store in GEPA module startup/init.
- [ ] Mount GEPA docs routes (`/docs`, `/docs/{slug}`).
- [ ] Expose `DocStore()` from GEPA module.
- [ ] Keep `wesen-os/pkg/gepa/module.go` adapter thin (mapping only).
- [ ] Add GEPA tests for docs routes and store exposure.

## Phase 6: Composition Aggregation Endpoint (`wesen-os`)

- [ ] Add composition docs endpoint implementation:
- [ ] Create `cmd/wesen-os-launcher/docs_endpoint.go`.
- [ ] Register `GET /api/os/docs` in launcher mux wiring.
- [ ] Aggregate docs across documentable modules.
- [ ] Add query filters:
- [ ] `query`
- [ ] `topics`
- [ ] `doc_type`
- [ ] `module`
- [ ] Return facets:
- [ ] topics
- [ ] doc_types
- [ ] modules
- [ ] Optionally include launcher help docs corpus (if available in-memory at startup).
- [ ] Add tests in `cmd/wesen-os-launcher/docs_endpoint_test.go`.

## Phase 7: Integration And Regression Testing (`wesen-os`)

- [ ] Extend `main_integration_test.go`:
- [ ] `/api/os/apps` contains docs hints for inventory/arc-agi/gepa
- [ ] `/api/apps/inventory/docs` returns TOC
- [ ] `/api/apps/arc-agi/docs` returns TOC
- [ ] `/api/apps/gepa/docs` returns TOC
- [ ] `/api/os/docs` returns aggregated results
- [ ] `/api/os/docs` filters by module/topic/doc_type/query
- [ ] Ensure existing reflection endpoints still pass
- [ ] Ensure inventory chat/ws/timeline/profile/confirm routes still pass

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

- [ ] `go test ./...` passes in:
- [ ] `go-go-os-backend`
- [ ] `go-go-app-inventory`
- [ ] `go-go-app-arc-agi-3`
- [ ] `go-go-gepa`
- [ ] `wesen-os`
- [ ] Manual smoke confirms docs endpoints for all three apps.
- [ ] `docmgr doctor --ticket OS-02` passes.
- [ ] Ticket diary/changelog/index reflect final implementation state and handoff notes.
