---
Title: Rich App Documentation System for wesen-os
Ticket: OS-02
Status: complete
Topics:
    - documentation
    - apps-browser
    - reflection
    - frontend
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-backend/pkg/backendhost/module.go
      Note: Core backend host contract and optional interface extension point
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-backend/pkg/backendhost/manifest_endpoint.go
      Note: Manifest endpoint that will expose docs availability hints
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/cmd/wesen-os-launcher/main.go
      Note: Composition root where module docs aggregation endpoint will be mounted
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-app-inventory/pkg/backendmodule/module.go
      Note: Inventory module ownership point for docs loader, routes, and DocStore exposure
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/pkg/arcagi/module.go
      Note: ARC adapter targeted for docs rollout
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/pkg/gepa/module.go
      Note: GEPA adapter mapping targeted for direct docs exposure from go-go-gepa
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-gepa/pkg/backendmodule/module.go
      Note: Direct GEPA module ownership target for docs loader and docs routes
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/domain/types.ts
      Note: Frontend contract mirror impacted by new manifest docs hints
ExternalSources: []
Summary: Ticket workspace for OS-02. Includes exploratory design docs and a backend-focused rollout plan for adding module documentation endpoints, manifest docs hints, and aggregated docs search across inventory, arc-agi, and gepa.
LastUpdated: 2026-03-01T17:38:47.123304554-05:00
WhatFor: Track the design and implementation planning for rich app documentation support in the wesen-os backend ecosystem.
WhenToUse: Use this index to navigate OS-02 documents and identify the primary implementation plan for backend work.
---


# Rich App Documentation System for wesen-os

## Document Map

1. `design-doc/01-rich-app-documentation-system-design-exploration.md`
- Broad exploration of architecture options and long-term direction.

2. `design-doc/02-module-documentation-system-concrete-design.md`
- Initial concrete design for module docs middleware and aggregation.

3. `design-doc/03-backend-documentation-system-rollout-plan-inventory-arc-agi-gepa.md`
- Current implementation plan for backend scope (recommended starting point).

4. `reference/01-investigation-diary-backend-documentation-system.md`
- Chronological investigation diary with commands, findings, constraints, and review notes.

## Current Recommendation

For backend implementation work, start with:

- `design-doc/03-backend-documentation-system-rollout-plan-inventory-arc-agi-gepa.md`

It refines the earlier designs using current repository boundaries and runtime wiring evidence.
