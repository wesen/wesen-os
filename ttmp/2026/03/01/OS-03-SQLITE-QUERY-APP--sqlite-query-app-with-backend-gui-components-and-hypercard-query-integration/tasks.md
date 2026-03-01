# Tasks

## TODO

- [x] Create ticket workspace in `wesen-os/ttmp` with design-doc and diary documents
- [x] Read `wesen-os` docs and map backend/frontend/hypercard integration boundaries with file-backed evidence
- [x] Analyze inventory and platform contracts to derive reusable sqlite app implementation patterns
- [x] Write detailed intern-facing design/analysis/implementation guide with prose, bullets, pseudocode, diagrams, API references, and file references
- [x] Maintain chronological diary entries during the investigation and authoring process
- [x] Update related file mappings and changelog entries in ticket bookkeeping
- [x] Run `docmgr doctor` and resolve any metadata/vocabulary issues
- [x] Upload document bundle to reMarkable (dry-run first), then verify remote listing

## Implementation Backlog (`go-go-app-sqlite`)

## Phase 0: App Scaffolding and Wiring

- [x] Create `go-go-app-sqlite` app skeleton with launcher entrypoint and package metadata.
- [x] Define launcher module manifest (`id`, app name, icon, desktop order, launch mode, state key).
- [x] Add TS/monorepo workspace wiring so `go-go-app-sqlite` builds with existing app packages.
- [x] Add `@hypercard/sqlite/launcher` import path aliasing where required in `wesen-os`.
- [x] Register module in [modules.tsx](/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/apps/os-launcher/src/app/modules.tsx).
- [x] Add minimal render fallback window (`unknown instance`) for invalid/malformed app instance IDs.

## Phase 1: Backend SQLite Runtime

- [x] Implement backend config contract (`dbPath`, read-only toggle, default row limit, statement timeout).
- [x] Add CLI/env/config resolution for DB path and ensure startup logs print effective DB target.
- [x] Validate DB path mode: create file if missing (when configured to auto-create).
- [x] Validate DB path mode: fail fast with actionable error on invalid path or permissions.
- [x] Validate DB path mode: enforce explicit read-only connection behavior and messaging.
- [x] Add migration bootstrap path and initial schema for app metadata tables (`query_history`, `saved_queries`).
- [x] Add DB lifecycle management (`open`, `ping/verify`, graceful close on shutdown).

## Phase 2: Query API Surface

- [x] Implement `POST /api/apps/sqlite/query` endpoint with request schema validation.
- [x] Enforce parameterized query contract (SQL text + positional/named params).
- [x] Block unsupported multi-statement payloads unless explicitly enabled.
- [x] Add result shaping: column metadata envelope.
- [x] Add result shaping: row payload envelope.
- [x] Add result shaping: execution metadata (`duration_ms`, `row_count`, truncation flags).
- [x] Enforce row cap and payload-size cap with deterministic truncation metadata.
- [x] Add structured error mapping (`validation`, `permission`, `syntax`, `execution`, `timeout`).
- [x] Add request correlation IDs in logs for query troubleshooting.

## Phase 3: History and Saved Queries

- [x] Implement history write path after each query execution (status, timing, preview, error summary).
- [x] Implement history read endpoint with pagination/filtering.
- [x] Implement saved query CRUD endpoints (`create`, `list`, `update`, `delete`).
- [x] Add schema/version fields for saved queries to support future evolution.
- [x] Add validation for query name uniqueness (or explicit duplicate policy).

## Phase 4: Frontend App Window and Workbench

- [x] Implement app launcher window routing for `go-go-app-sqlite` instances.
- [x] Build query editor panel (SQL input, parameter editor, execute button, clear/reset).
- [x] Build results panel (column headers, row grid/table, empty state, truncation indicators).
- [x] Build error/status panel with structured backend error rendering.
- [x] Build query history panel with click-to-restore query text/params.
- [x] Build saved query panel with create/update/delete interactions.
- [x] Add loading/disabled states for in-flight requests and cancellation UX if supported.

## Phase 5: HyperCard Integration

- [x] Define HyperCard intent contract for query execution (intent name, payload schema, result schema).
- [x] Implement intent-to-backend query bridge in app runtime domain handlers.
- [x] Add response normalization for HyperCard consumers (consistent success/error payload envelopes).
- [x] Add explicit guardrails for intent-based execution (same policy limits as UI path).
- [x] Add integration example card/action demonstrating query invocation from HyperCard.

## Phase 6: Security and Guardrails

- [x] Implement statement policy layer (`allowlist`/`denylist`, read-only enforcement).
- [x] Enforce timeout and cancellation policy for long-running queries.
- [x] Add response redaction hooks for sensitive columns/fields (if configured).
- [x] Add audit-log hooks for executed SQL metadata (without leaking sensitive values by default).
- [x] Add rate/throughput safeguards for repeated query submissions (basic throttling or queueing).

## Phase 7: Testing and Validation

- [x] Add backend unit tests for request validation and query policy enforcement.
- [x] Add backend integration tests against temporary DB files for query execution and history/saved queries.
- [x] Add migration tests for metadata schema bootstrap.
- [ ] Add `wesen-os` composition integration test that asserts sqlite module is mounted in launcher runtime (`/api/os/apps` contains `sqlite`).
- [ ] Add `wesen-os` integration test that exercises sqlite namespaced endpoint routing (`/api/apps/sqlite/health` and one query endpoint roundtrip).
- [ ] Add frontend component tests for editor/results/history/saved query UI behaviors.
- [ ] Add frontend integration test for execute-query happy path and error path.
- [ ] Add launcher/module smoke test to confirm app icon launch, window rendering, and sqlite discoverability in Apps Browser app inventory.
- [ ] Add HyperCard integration test for intent execution roundtrip and normalized response mapping.

## Phase 8: Operational Docs and Handoff

- [x] Write developer runbook for local setup (`dbPath`, sample DB creation, launch commands).
- [x] Write operator runbook for production-like config, DB file management, and failure recovery.
- [x] Add troubleshooting section entry for DB open failures.
- [x] Add troubleshooting section entry for migration failures.
- [x] Add troubleshooting section entry for query timeout errors.
- [x] Add troubleshooting section entry for malformed intent payloads.
- [x] Update OS-03 design doc with final implemented file paths and API contracts after code lands.
- [x] Update OS-03 diary and changelog with implementation commits and validation evidence.

## Phase 9: `wesen-os` Backend Composition and App Discoverability

- [ ] Add sqlite backend module wrapper package in `wesen-os` (adapter implementing `backendhost.AppBackendModule` around `go-go-app-sqlite` backend component/runtime).
- [ ] Register sqlite backend module in `cmd/wesen-os-launcher/main.go` module list so it is included in lifecycle startup and namespaced route mounting.
- [ ] Thread sqlite runtime configuration through launcher flags/env (`dbPath`, read-only, row limit, statement timeout, and policy-related config).
- [ ] Decide and document required-app semantics: whether sqlite is in default `required-apps` or optional by default; implement choice in launcher defaults.
- [ ] Ensure sqlite reflection/manifest metadata appears via `/api/os/apps` and `/api/os/apps/sqlite/reflection` where supported.
- [ ] Update launcher smoke script to assert sqlite backend discoverability and route health (not only frontend launch behavior).
- [ ] Update startup/runbook docs in `wesen-os` and OS-03 references to include sqlite backend composition and verification commands.
