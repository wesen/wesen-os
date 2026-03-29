---
Title: Chat With App via Module Documentation Context
Ticket: APP-03-CHAT-WITH-APP
Status: active
Topics:
    - chat
    - documentation
    - frontend
    - openai-app-server
    - wesen-os
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Primary frontend entry point for the feature.
    - Path: go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx
      Note: Reused chat window component.
    - Path: go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Reference implementation for launcher-hosted chat windows.
    - Path: go-go-os-backend/pkg/docmw/docmw.go
      Note: Module docs contract used as the source of grounded context.
    - Path: wesen-os/cmd/wesen-os-launcher/main.go
      Note: Current backend composition root and assistant-backend dependency.
ExternalSources: []
Summary: Ticket workspace for researching and planning a right-click `Chat With App` feature that opens a chat-runtime window grounded in the selected app's documentation.
LastUpdated: 2026-03-05T20:17:26.033812743-05:00
WhatFor: Planning and tracking the architecture, risks, and implementation sequence for documentation-grounded app chat in wesen-os.
WhenToUse: Use when reviewing APP-03 status or starting implementation work for the feature.
---

# Chat With App via Module Documentation Context

## Overview

This ticket studies how to let a user right-click an app and open a dedicated chat window that is grounded in that app's published module documentation.

The research conclusion is:

1. The frontend portion should live in `apps-browser`.
2. The chat window should reuse `ChatConversationWindow`.
3. The selected app's docs should be attached through a backend bootstrap contract, not shoved into each prompt from the frontend.
4. The feature depends on a mounted assistant backend, which is not present in the current `wesen-os` composition yet.

## Key Links

- Design doc: [design-doc/01-intern-guide-chat-with-app-architecture-design-and-implementation-plan.md](./design-doc/01-intern-guide-chat-with-app-architecture-design-and-implementation-plan.md)
- Diary: [reference/01-investigation-diary.md](./reference/01-investigation-diary.md)
- Tasks: [tasks.md](./tasks.md)
- Changelog: [changelog.md](./changelog.md)

## Status

Current status: **active research/design completed; implementation pending**

Current recommendation:

1. Treat APP-01 assistant-backend integration as a prerequisite.
2. Then implement the apps-browser command/window plus backend docs bootstrap route.

## Topics

- chat
- documentation
- frontend
- openai-app-server
- wesen-os

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Structure

- `design-doc/`
  - Primary intern-facing architecture and implementation guide.
- `reference/`
  - Investigation diary and continuation notes.
- `tasks.md`
  - Research completion and future implementation checklist.
- `changelog.md`
  - Ticket-level activity log and design decisions.
