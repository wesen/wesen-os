---
Title: Intern Implementation Plan - SQLite HyperCard VM Stack, Query and Seed Cards, and Icon Context Launch
Ticket: ""
Status: ""
Topics:
    - backend
    - frontend
    - js-vm
    - documentation
DocType: design-doc
Intent: ""
Owners: []
RelatedFiles:
    - Path: ../../../../../../../go-go-app-sqlite/apps/sqlite/src/components/SqliteHypercardIntentRunner.tsx
      Note: Implements Phase B host execution bridge
    - Path: ../../../../../../../go-go-app-sqlite/apps/sqlite/src/domain/hypercard/runtimeState.ts
      Note: Implements Phase B queue and state transitions
    - Path: ../../../../../../../go-go-app-sqlite/apps/sqlite/src/domain/pluginBundle.vm.js
      Note: VM card behavior contract
    - Path: ../../../../../../../go-go-app-sqlite/apps/sqlite/src/domain/stack.ts
      Note: Stack metadata and VM bundle binding
    - Path: ../../../../../../../go-go-app-sqlite/apps/sqlite/src/launcher/module.tsx
      Note: Launcher contribution seam for sqlite stack launch
ExternalSources: []
Summary: ""
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---



# Executive Summary

This ticket introduces a second interaction surface for `go-go-app-sqlite`: a HyperCard VM stack implemented in JavaScript and rendered through the shared HyperCard runtime. The existing React workspace stays intact; the new stack gives users card-based flows for writing SQL, running queries, viewing results, and seeding sample data.

The stack is launched from the sqlite app icon right-click menu via existing `Open New` behavior (`icon.open-new.sqlite`). The runtime card handlers cannot call HTTP directly, so we add a host-side intent queue and runner in the sqlite module that executes backend requests and feeds results back into Redux-projected domain state.

# Problem Statement

Today sqlite has one UI surface: a React workspace window. There is no sqlite-owned HyperCard stack, so we cannot:

- Launch sqlite card sessions from icon context.
- Demonstrate VM card authoring patterns for DB workflows.
- Reuse intent contracts (`sqlite.query.execute`) in runtime cards.
- Provide a seed flow in card UX.

A naive implementation that emits runtime domain intents without host-side execution would dispatch plain Redux actions but never call backend APIs. We need explicit host orchestration for async query/seed execution.

# Architecture Context

Relevant runtime and launcher seams:

- `go-go-app-sqlite/apps/sqlite/src/launcher/module.tsx`
- `go-go-app-sqlite/apps/sqlite/src/domain/hypercard/intentBridge.ts`
- `go-go-os-frontend/packages/engine/src/components/shell/windowing/useDesktopShellController.tsx`
- `go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/PluginCardSessionHost.tsx`
- `go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/pluginIntentRouting.ts`

Key existing behavior:

- Right-click icon default menu already emits `icon.open-new.<iconId>`.
- `pluginIntentRouting` maps domain intents to plain Redux actions (`type: <domain>/<actionType>`).
- VM handlers are synchronous and only emit intents; no direct `fetch` in VM bootstrap.
- `selectProjectedRuntimeDomains` exposes non-core Redux slices to `globalState.domains` inside VM cards.

# Proposed Solution

Implement sqlite VM cards with a host execution bridge.

## 1. Stack and VM cards

Create sqlite stack artifacts:

- `domain/stack.ts`
- `domain/pluginBundle.ts`
- `domain/pluginBundle.vm.js`

Initial cards:

- `home`: entry and quick actions
- `query`: SQL input + params + row limit + run
- `results`: latest result/error metadata + table
- `seed`: apply deterministic schema/sample data pipeline

## 2. Launcher integration

Add sqlite contributions:

- command handler for `icon.open-new.sqlite`
- command handler for `sqlite.card.open.<cardId>`
- window adapter rendering `PluginCardSessionHost` for sqlite stack card windows
- optional top-menu entries for quick card opening

## 3. Host-side intent queue and runner

Add sqlite module state for runtime jobs and results.

Intent flow:

1. VM card emits `dispatchDomainAction('sqlite', 'query.execute', payload)` or `seed.execute`.
2. `pluginIntentRouting` dispatches Redux action `sqlite/query.execute` or `sqlite/seed.execute`.
3. sqlite reducer enqueues typed job.
4. sqlite intent runner React component claims queued jobs and executes backend operations.
5. runner dispatches success/failure actions and normalized result data.
6. VM cards read `globalState.domains.app_sqlite.hypercard` and render status/results.

## 4. Seed pipeline

No `/seed` backend endpoint exists, so seed is executed by sequential `/query` calls with single statements.

Example pipeline:

- `CREATE TABLE IF NOT EXISTS people (...)`
- `DELETE FROM people`
- multiple `INSERT INTO people ...`

Each step captures success/failure and correlation metadata.

# Data Model Sketch

```text
app_sqlite
└─ hypercard
   ├─ jobsById: Record<JobId, Job>
   ├─ queue: JobId[]
   ├─ runningJobId: JobId | null
   ├─ lastQueryResult: QueryResult | null
   ├─ lastQueryError: QueryError | null
   ├─ lastSeedReport: SeedReport | null
   └─ lastUpdatedAt: string | null
```

Job discriminated union:

```ts
type HypercardJob =
  | { id: string; type: 'query'; payload: SqliteQueryIntentPayload; status: 'queued'|'running'|'succeeded'|'failed'; ... }
  | { id: string; type: 'seed'; payload: SeedPayload; status: 'queued'|'running'|'succeeded'|'failed'; ... }
```

# Detailed Implementation Plan

## Phase A - Scaffolding and launch wiring

1. Add sqlite stack definitions and VM bundle import.
2. Add card window payload builder.
3. Add `createContributions` in sqlite launcher module.
4. Wire `icon.open-new.sqlite` to open sqlite home card.
5. Add sqlite card adapter with `PluginCardSessionHost`.

Deliverable: sqlite card windows can be opened from icon context, even before query execution is wired.

## Phase B - Intent queue and host execution

1. Extend sqlite launcher slice state with hypercard queue/result structures.
2. Handle `sqlite/query.execute` and `sqlite/seed.execute` actions via reducer paths.
3. Build `SqliteHypercardIntentRunner` component.
4. Implement job claim/run/complete transitions.
5. Implement query execution via `handleSqliteQueryIntent`.
6. Implement seed execution via ordered `/query` calls.

Deliverable: VM cards trigger real backend execution and get deterministic result/error state.

## Phase C - VM card UX and tests

1. Implement query card UI/handlers.
2. Implement results card UI bound to projected domain state.
3. Implement seed card progress/outcome UI.
4. Add tests for reducer transitions and launcher command routing.
5. Add tests for intent runner failure/success handling.

Deliverable: complete functional sqlite card stack with validated host bridge behavior.

## Phase D - Docs and validation

1. Run typecheck/test commands and capture exact output.
2. Update sqlite package docs with VM card architecture and launch behavior.
3. Update ticket diary + changelog with commit hashes per milestone.

Deliverable: reproducible runbook and intern-friendly maintenance documentation.

# Pseudocode

```ts
// reducer side
onAction('sqlite/query.execute', payload) {
  enqueue({ type: 'query', payload, status: 'queued' })
}

// runner side
while (hasQueuedJob() && !runningJobId) {
  job = claimNextQueuedJob()
  if (job.type === 'query') {
    result = await handleSqliteQueryIntent(...)
    dispatch(jobSuccess or jobFailure)
  }
  if (job.type === 'seed') {
    report = await runSeedPipeline(...)
    dispatch(seedSuccess or seedFailure)
  }
}
```

# Sequence Diagram

```text
User -> Card(query): click Run
Card(query) -> VM handler: onRun
VM handler -> plugin runtime: dispatchDomainAction('sqlite','query.execute',payload)
plugin runtime -> Redux: action type = sqlite/query.execute
Redux(sqlite reducer) -> Queue: enqueue job
IntentRunner -> Queue: claim queued job
IntentRunner -> Backend: POST /api/apps/sqlite/query
Backend -> IntentRunner: query result/error
IntentRunner -> Redux(sqlite reducer): job complete + lastQueryResult/lastQueryError
Redux projected domains -> PluginCardSessionHost: globalState.domains.app_sqlite changed
PluginCardSessionHost -> VM card render: results re-render
```

# Design Decisions

- Keep existing React workspace window; do not replace it.
- Use VM JS cards (`pluginBundle.vm.js`) to align with HyperCard runtime model.
- Use host-side queue/runner for async execution; do not mutate runtime core APIs in this ticket.
- Use `icon.open-new.sqlite` as primary right-click launch path (already present in shell defaults).

# Alternatives Considered

1. Add direct async HTTP in VM runtime.
- Rejected for this ticket: larger runtime API change, wider blast radius.

2. Add dedicated backend `/seed` endpoint.
- Deferred: current `/query` API can support seed via statement sequence.

3. Replace sqlite workspace with cards.
- Rejected: unnecessary regression risk; both surfaces can coexist.

# Risks and Mitigations

- Duplicate runner processing with multiple windows.
  - Mitigation: explicit job claim transition (`queued -> running`) in reducer, single running job invariant.
- VM card state drift from host state shape changes.
  - Mitigation: typed contract file + shared selectors + tests.
- Seed statements failing midway.
  - Mitigation: return step-indexed failure report and partial progress metadata.

# Testing Strategy

- Unit: reducer queue lifecycle and invariants.
- Unit: intent runner async success/failure and error mapping.
- Integration-ish: launcher command routing and adapter render condition.
- Manual: right-click sqlite icon -> Open New -> query + results + seed cards.

# Intern Checklist

- Start with `tasks.md` and complete in order.
- Make small focused commits per phase.
- After each commit:
  - check off task(s),
  - append diary step,
  - add changelog entry with commit hash.

# References

- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-sqlite/apps/sqlite/src/launcher/module.tsx`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-sqlite/apps/sqlite/src/domain/hypercard/intentBridge.ts`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/pluginIntentRouting.ts`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/runtime-host/PluginCardSessionHost.tsx`
- `/home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/engine/src/components/shell/windowing/useDesktopShellController.tsx`
