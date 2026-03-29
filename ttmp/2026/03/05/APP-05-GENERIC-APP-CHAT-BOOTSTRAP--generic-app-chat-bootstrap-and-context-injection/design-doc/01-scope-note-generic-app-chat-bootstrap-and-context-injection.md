---
Title: 'Scope note: generic app chat bootstrap and context injection'
Ticket: APP-05-GENERIC-APP-CHAT-BOOTSTRAP
Status: active
Topics:
    - backend
    - chat
    - documentation
    - wesen-os
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: 2026/03/05/APP-03-CHAT-WITH-APP--chat-with-app-via-module-documentation-context/design-doc/01-intern-guide-chat-with-app-architecture-design-and-implementation-plan.md
      Note: Prior feature analysis that motivates the bootstrap ticket
    - Path: 2026/03/05/APP-04-OS-CHAT-PLATFORM--extract-shared-os-chat-platform-and-migrate-inventory/design-doc/01-intern-guide-shared-os-chat-platform-extraction-inventory-migration-and-wesen-os-mounting.md
      Note: Platform prerequisite for this bootstrap ticket
ExternalSources: []
Summary: Scope note for the later generic app-chat bootstrap work that will build on APP-04.
LastUpdated: 2026-03-05T21:03:42.643040942-05:00
WhatFor: Define the scope and dependencies for the later app-chat bootstrap/context ticket without duplicating the main APP-04 platform guide.
WhenToUse: Use this note when planning the future 'chat with app' bootstrap implementation after the shared assistant backend exists.
---


# Scope note: generic app chat bootstrap and context injection

## Executive Summary

This ticket is the follow-on to APP-04. Once the shared assistant backend exists and inventory has proven the shared backend layer, APP-05 will add a generic bootstrap flow that starts a conversation for a selected app and attaches app documentation/context before the first user turn.

## Problem Statement

APP-03 established the product idea: right-click an app, choose "chat with app," and open a dedicated chat window seeded with the app's documentation/module context. That feature should not be implemented directly against inventory-specific backend code. It needs a generic assistant backend first.

Therefore APP-05 depends on APP-04.

## Proposed Solution

Expected shape after APP-04:

- `wesen-os` serves one shared assistant backend module, likely `/api/apps/assistant`
- the frontend can open `ChatConversationWindow` instances pointed at that module
- APP-05 adds a bootstrap endpoint/service that:
  - identifies the selected app
  - resolves documentation/reflection/component-browser context
  - creates or seeds a conversation
  - returns the `conv_id` and any initial metadata needed by the chat window

The likely UX entry point remains the apps browser / component browser context menu, as already explored in APP-03.

## Design Decisions

- Keep APP-05 separate from APP-04 so platform extraction and feature bootstrap are reviewed independently.
- Reuse the shared assistant backend rather than inventing per-app chat servers.
- Resolve docs/context server-side so the client does not need to assemble large context payloads itself.

## Alternatives Considered

### Implement bootstrap directly in inventory-style app backends

Rejected because it would duplicate backend logic and work against the goal of one OS chat platform.

### Put app context assembly entirely in the frontend

Rejected because documentation lookup, normalization, and persistence are better handled server-side.

## Implementation Plan

Planned future phases:

1. Confirm APP-04 assistant module contract and final route naming.
2. Design the bootstrap endpoint request/response contract.
3. Add server-side docs/reflection/context resolution for a selected app.
4. Integrate the apps browser context menu and chat-window open flow.
5. Persist the bootstrap context by `conv_id`.
6. Validate that the first assistant response demonstrably uses the app documentation context.

## Open Questions

1. Which docs source should be authoritative: module docs, reflection docs, component browser docs, or a merged source?
2. Should bootstrap create the conversation eagerly, or return a seed payload that the first `/chat` call persists?
3. Which backend route shape is best: `/api/apps/assistant/api/bootstrap/app-chat`, `/api/apps/assistant/api/bootstrap/module-chat`, or another name?

## References

- APP-03: chat with app via module documentation context
- APP-04: shared OS chat platform extraction, inventory migration, and assistant-module mounting
