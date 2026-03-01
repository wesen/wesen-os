---
Title: Phase 2 backend plugin-runtime handoff notes
Ticket: GEPA-09-REPO-SPLIT-ARCHITECTURE
Status: active
Topics:
    - architecture
    - plugins
    - backend
    - wesen-os
    - go-go-gepa
    - go-go-app-inventory
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: wesen-os/pkg/backendhost/module.go
      Note: Current in-process BackendModule host contract
    - Path: wesen-os/pkg/backendhost/lifecycle.go
      Note: Lifecycle sequencing semantics to preserve in plugin runtime
    - Path: wesen-os/pkg/gepa/module.go
      Note: GEPA adapter baseline for extraction
    - Path: go-go-app-inventory/pkg/backendcomponent/component.go
      Note: Inventory component baseline for extraction
    - Path: go-go-gepa/pkg/backendmodule/module.go
      Note: GEPA backend core baseline for extraction
ExternalSources: []
Summary: Handoff notes for phase-2 extraction from in-process backend modules to an external plugin runtime while preserving current backend host contracts.
LastUpdated: 2026-02-27T18:20:00-05:00
WhatFor: Provide concrete backend-only guidance for the next extraction step after repository split.
WhenToUse: Use when beginning external plugin runtime implementation in wesen-os.
---

# Phase 2 backend plugin-runtime handoff notes

## Scope

These notes define only backend phase-2 extraction work:

1. keep current `BackendModule` contract semantics,
2. move module execution boundary from in-process Go objects to external plugin processes,
3. preserve existing route and lifecycle behavior for clients.

Frontend federation/runtime concerns are explicitly out of scope for this handoff note.

## Current baseline (after B1-B5)

1. Inventory backend is host-agnostic in `go-go-app-inventory/pkg/backendcomponent`.
2. GEPA backend core is host-agnostic in `go-go-gepa/pkg/backendmodule`.
3. `wesen-os` uses adapter-only host modules for both inventory and GEPA.
4. Namespaced route and reflection model is already enforced under `/api/apps/<app-id>/*`.

## Phase-2 target

Replace direct in-process module calls with a plugin host bridge:

1. `wesen-os` keeps `backendhost.ModuleRegistry` and `LifecycleManager`.
2. module implementations become proxy modules that forward:
   - init/start/stop/health
   - HTTP route registration metadata
   - reflection metadata
   to plugin processes.
3. plugin process ownership lives in domain repos or dedicated plugin repos.

## Minimal backend protocol surface

Required plugin contract (conceptual):

1. `GetManifest() -> AppManifest`
2. `GetReflection() -> ReflectionDocument` (optional but strongly recommended)
3. `Init/Start/Stop/Health` lifecycle RPCs
4. `ServeHTTP` bridge for app-local routes (or route descriptor + handler transport)

For first extraction iteration, keep transport simple:

1. local process spawn by `wesen-os`
2. loopback HTTP between host and plugin process
3. no remote discovery yet

## Migration sequence (backend-only)

1. add `backendhost.PluginProcessModule` implementation in `wesen-os`.
2. implement one pilot plugin (`gepa`) behind the plugin process module.
3. run dual test matrix:
   - in-process GEPA adapter (current)
   - plugin-process GEPA adapter (new)
4. once parity is verified, switch default to plugin-process mode.
5. repeat for inventory backend if desired.

## Acceptance criteria

1. `/api/os/apps` manifest output remains schema-compatible.
2. `/api/os/apps/<app>/reflection` remains schema-compatible.
3. existing endpoint smoke tests keep passing with plugin-backed module:
   - inventory routes
   - gepa routes
4. lifecycle startup/required-app semantics remain unchanged.

## Risks and mitigations

1. Risk: lifecycle drift between in-process and plugin modes.
   - Mitigation: reuse `LifecycleManager` and keep module boundary adaptation only.
2. Risk: reflection schema drift.
   - Mitigation: add golden JSON contract tests for reflection payloads.
3. Risk: plugin startup latency impacts host boot.
   - Mitigation: explicit startup timeout per required module, fail fast.

## Deliverables checklist for phase-2 kickoff

1. `wesen-os` plugin process module interface and default implementation.
2. GEPA pilot plugin implementation and adapter wiring.
3. CI mode matrix (in-process + plugin-process) for backend integration tests.
4. Operator runbook documenting process startup, logs, and failure signals.
