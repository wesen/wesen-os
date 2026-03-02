---
Title: App-Agnostic Stack Chat and VM Debug View in hypercard-runtime
Ticket: OS-04-APP-AGNOSTIC-RUNTIME-DEBUG
Status: active
Topics:
    - backend
    - frontend
    - documentation
    - reflection
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-01/sqlite-app/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Current inventory-specific debug composition baseline.
    - Path: /home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/hypercard/debug/RuntimeCardDebugWindow.tsx
      Note: Current shared stack debug component targeted for decoupling.
    - Path: /home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/chat-runtime/src/chat/debug/EventViewerWindow.tsx
      Note: Current chat event viewer component.
    - Path: /home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/chat-runtime/src/chat/debug/TimelineDebugWindow.tsx
      Note: Current chat timeline debug component.
    - Path: /home/manuel/workspaces/2026-03-01/sqlite-app/go-go-os-frontend/packages/hypercard-runtime/src/features/pluginCardRuntime/pluginCardRuntimeSlice.ts
      Note: Current plugin VM runtime state used for future VM debug panel.
ExternalSources: []
Summary: Planning ticket documenting how to move stack/chat/vm debug orchestration from inventory-specific launcher glue into app-agnostic hypercard-runtime APIs.
LastUpdated: 2026-03-01T19:48:00-05:00
WhatFor: Provide a later-implementation blueprint for reusable runtime debug surfaces.
WhenToUse: Use before coding OS-04 extraction/migration work.
---

# App-Agnostic Stack Chat and VM Debug View in hypercard-runtime

## Overview

This ticket contains a planning-only architecture and implementation blueprint for extracting inventory-centric debug orchestration into reusable package APIs in `@hypercard/hypercard-runtime`.

## Key Documents

- `design-doc/01-design-and-implementation-plan-for-app-agnostic-runtime-debug-surfaces.md`
- `reference/01-investigation-diary.md`

## Status

- Analysis and planning: complete
- Implementation: intentionally deferred (for later)

## Scope Snapshot

- Define app-agnostic debug suite contracts for stack/chat/vm surfaces.
- Preserve existing inventory behavior while removing inventory-only orchestration from shared runtime surfaces.
- Provide phased migration plan and validation strategy.

## Tasks and Changelog

- See `tasks.md` for implementation backlog and readiness checklist.
- See `changelog.md` for planning milestones.

