---
Title: Frontend split execution plan and package graph
Ticket: GEPA-10-FRONTEND-SPLIT-CLEANUP
Status: active
Topics:
    - architecture
    - frontend
    - go-go-os
    - go-go-app-inventory
    - wesen-os
    - bundling
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../go-go-os/README.md
      Note: Platform package ownership and boundaries after split
    - Path: ../../../../../../../go-go-os/.github/workflows/launcher-ci.yml
      Note: CI no longer treats launcher as go-go-os responsibility
    - Path: ../../../../../../../go-go-app-inventory/README.md
      Note: Inventory domain + frontend ownership boundary
    - Path: ../../../../../../../wesen-os/README.md
      Note: Composition runbook and launcher assembly commands
    - Path: ../../../../../../../wesen-os/.github/workflows/launcher-frontend-ci.yml
      Note: Launcher frontend CI now runs from composition repo
    - Path: ../../../../../../../wesen-os/package.json
      Note: Canonical launcher build/sync/smoke script pipeline
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/main.go
      Note: Runtime composition and backend module mount sequence
    - Path: ../../../../../../../wesen-os/pkg/launcherui/handler.go
      Note: Embedded launcher dist serving contract
ExternalSources: []
Summary: 'Finalized frontend split: platform in go-go-os, inventory app in go-go-app-inventory, launcher bundling/runtime ownership in wesen-os.'
LastUpdated: 2026-02-27T22:40:00-05:00
WhatFor: Primary implementation plan and handoff reference for GEPA-10 frontend split.
WhenToUse: Use as onboarding guide and operating manual for the split architecture.
---

# Frontend split execution plan and package graph

## Executive summary

GEPA-10 establishes a 3-repo ownership model and removes launcher assembly ownership from `go-go-os`.

Final state:

1. `go-go-os` owns shared frontend platform packages and backend host contracts.
2. `go-go-app-inventory` owns the inventory domain and inventory frontend package.
3. `wesen-os` owns launcher frontend composition, dist sync/embed, and runtime assembly/smoke flow.

This is now implemented and validated through Phase 4 migration work plus Phase 5 docs/CI handoff.

## Final repo topology

```text
<workspace>/
  go-go-os/
    packages/
      engine/
      desktop-os/
      confirm-runtime/
    apps/
      todo/
      crm/
      book-tracker-debug/
    go-go-os/
      pkg/backendhost/

  go-go-app-inventory/
    apps/
      inventory/
    pkg/
      inventorydb/
      inventorytools/
      pinoweb/
      ...

  wesen-os/
    apps/
      os-launcher/
    pkg/
      launcherui/dist/
    cmd/
      wesen-os-launcher/
    scripts/
      launcher-ui-sync.sh
      build-wesen-os-launcher.sh
      smoke-wesen-os-launcher.sh
```

## Package relationship graph

```text
+--------------------+                        +---------------------------+
|      go-go-os      |                        |   go-go-app-inventory     |
|--------------------|                        |---------------------------|
| @hypercard/engine  |<-------------------+   | @hypercard/inventory      |
| @hypercard/desktop-os                    |   |  - exports ./launcher     |
| @hypercard/confirm-runtime               |   |  - exports ./reducers     |
| demo apps (todo/crm/book-tracker-debug)  |   +-------------+-------------+
+--------------------+                                     |
                                                            |
                                                            v
                                           +----------------+----------------+
                                           |            wesen-os             |
                                           |----------------------------------|
                                           | @hypercard/os-launcher           |
                                           | - composes inventory + platform   |
                                           | - builds dist + syncs embed       |
                                           | - serves runtime binary           |
                                           +----------------+------------------+
                                                            |
                                                            v
                                           +-----------------------------------+
                                           |      wesen-os-launcher binary      |
                                           | / -> launcher UI                   |
                                           | /api/os/apps -> module manifest    |
                                           | /api/apps/<app>/... -> namespaced  |
                                           +-----------------------------------+
```

## Initialization sequence (final composition runtime)

```text
1) Build phase (wesen-os)
   npm run launcher:frontend:build
   npm run launcher:ui:sync
   go build ./cmd/wesen-os-launcher

2) Runtime bootstrap (wesen-os-launcher)
   - construct inventory backend module
   - construct GEPA backend module
   - register modules in backendhost registry
   - run lifecycle startup (required apps)

3) Route mount phase
   - mount /api/os/apps manifest endpoint
   - mount /api/apps/<app-id>/... namespaced routes
   - mount launcher UI handler at /

4) Serve
   - frontend reads /api/os/apps
   - frontend uses namespaced inventory/gepa endpoints
```

Pseudo-flow:

```go
registry := backendhost.NewModuleRegistry(inventoryModule, gepaModule)
lifecycle := backendhost.NewLifecycleManager(registry)
_ = lifecycle.Startup(ctx, backendhost.StartupOptions{RequiredAppIDs: []string{"inventory"}})

mux := http.NewServeMux()
backendhost.RegisterAppsManifestEndpoint(mux, registry)
for _, module := range registry.Modules() {
    backendhost.MountNamespacedRoutes(mux, module.Manifest().AppID, module.MountRoutes)
}
mux.Handle("/", launcherui.Handler())
```

## Phase status

### Phase 0: baseline and safety rails

Complete.

- Baseline build/test captured.
- Coupling map and script drift captured in diary.

### Phase 1: inventory frontend ownership move

Complete.

- `apps/inventory` moved from `go-go-os` to `go-go-app-inventory` via `mv`.
- New inventory frontend workspace bootstrapped and validated.

### Phase 2: public API boundary for inventory

Complete.

- Public exports added:
  - `@hypercard/inventory`
  - `@hypercard/inventory/launcher`
  - `@hypercard/inventory/reducers`
- Launcher code/tests updated to block direct `src/*` imports.

### Phase 3: launcher frontend move to wesen-os

Complete.

- `apps/os-launcher` moved to `wesen-os` via `mv`.
- Cross-repo aliasing and React identity issues resolved.
- `wesen-os` launcher build/test green.

### Phase 4: dist + binary assembly ownership in wesen-os

Complete.

- Added script pipeline in `wesen-os`:
  - `launcher:frontend:build`
  - `launcher:ui:sync`
  - `launcher:binary:build`
  - `launcher:smoke`
- Added explicit temp `--profile-registries` handling in smoke script due hard-cutover requirement.
- Removed obsolete launcher smoke/build wiring from `go-go-os`.

### Phase 5: docs/CI handoff

Complete for this ticket pass.

- READMEs updated in all three repos with final ownership boundaries.
- `go-go-os` CI updated to platform-centric jobs.
- `wesen-os` CI now includes launcher frontend build/test workflow.
- Ticket docs updated with final package graph and startup sequence.

## Operating runbook

### Local launcher assembly and smoke checks

```bash
# from wesen-os
npm install
npm run launcher:binary:build
npm run launcher:smoke
```

### Local frontend iteration

```bash
# go-go-os (platform)
npm install
npm run build
npm run test

# go-go-app-inventory (inventory app)
npm install
npm run build

# wesen-os (launcher host)
npm install
npm run build
npm run test
```

## Risks and follow-up notes

1. `wesen-os` launcher frontend currently uses cross-repo source aliasing; this is correct for active split work but still assumes a multi-repo workspace checkout.
2. Release/version pinning across repos should be formalized later (explicitly deferred).
3. External plugin extraction can now proceed on top of this split without re-entangling platform/app ownership.

## References

1. `../tasks.md`
2. `../reference/01-frontend-split-execution-diary.md`
3. `../../../../../../../go-go-os/README.md`
4. `../../../../../../../go-go-app-inventory/README.md`
5. `../../../../../../../wesen-os/README.md`
