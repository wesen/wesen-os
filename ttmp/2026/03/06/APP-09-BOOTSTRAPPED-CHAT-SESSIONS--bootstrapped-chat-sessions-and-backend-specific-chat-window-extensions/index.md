---
Title: Bootstrapped Chat Sessions and Backend-Specific Chat Window Extensions
Ticket: APP-09-BOOTSTRAPPED-CHAT-SESSIONS
Status: active
Topics:
    - architecture
    - backend
    - chat
    - wesen-os
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx
      Note: Current shared chat window mixes shell behavior, profile UI, and startup assumptions
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.ts
      Note: Current runtime hook always reads shared profile state and therefore leaks selection across chat types
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx
      Note: APP-05 assistant chat-with-app implementation is the first concrete bootstrapped chat session
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Inventory chat wrapper demonstrates backend-specific header controls and timeline renderers
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go
      Note: Assistant backend bootstrap endpoint shows the backend-specific conversation-start seam
ExternalSources: []
Summary: Supersede APP-08 with a broader plan that makes chat session startup explicitly bootstrapped, cleans up profile/runtime selection policy, removes unused registry from the active frontend model, and formalizes backend-specific chat window extensions on top of a reusable chat shell. The first implementation slice is landed, and the follow-up clean cutover to explicit `profile` selection with no ambient cookie fallback is now implemented and live-verified.
LastUpdated: 2026-03-06T15:35:00-05:00
WhatFor: Use this ticket to redesign and incrementally implement the chat frontend/backend contract now that APP-05 proves bootstrapped Chat With App works and now that multiple chat styles must coexist without leaking profile or startup state.
WhenToUse: Use when implementing or reviewing reusable chat window architecture, backend-specific chat bootstrap endpoints, profile/runtime selection policy, header extensions, or the separation between bootstrapped chat sessions and the common chat transcript shell.
---

# Bootstrapped Chat Sessions and Backend-Specific Chat Window Extensions

## Overview

APP-09 supersedes APP-08.

APP-08 was correctly identifying one naming problem around `profile`, `registry`, and `runtime_key`, but the real issue is larger: the system now has at least two distinct chat types with different startup semantics:

- inventory chat, which wants selectable profiles and app-specific controls
- assistant Chat With App, which wants a fixed no-frills runtime bootstrapped by app context

The current shared chat window does not model that distinction cleanly. It still treats profile selection as a built-in feature, it still uses shared frontend selection state as an implicit startup input, and it does not have a first-class bootstrapped conversation-start contract.

This ticket defines the replacement architecture:

- explicit backend-specific bootstrap/init steps before a chat session starts
- a reusable `ChatWindowShell`-style component that owns transcript/timeline/send behavior only
- backend-specific wrappers/extensions for header controls, timeline renderers, and startup metadata
- a slimmer frontend runtime contract that removes unused registry from the active UI model
- explicit separation between fixed-runtime chats and selectable-profile chats

## Key Links

- [Design doc](./design-doc/01-intern-guide-bootstrapped-chat-sessions-and-chat-window-extensibility-plan.md)
- [Investigation diary](./reference/01-investigation-diary.md)
- [Tasks](./tasks.md)
- [Changelog](./changelog.md)
- Superseded ticket: `APP-08-PROFILE-RUNTIME-CONTRACT-ALIGNMENT`

## Status

Current status: **active**

Current state:

- ticket created
- detailed replacement design documented
- APP-05 used as the live proof point and motivation for the redesign
- first implementation slice landed and verified:
  - explicit chat profile policy (`none`, `fixed`, `selectable`)
  - no built-in profile selector in the base chat shell
  - no active frontend registry handling
  - wrapper-owned inventory selector/suggestions
  - assistant app-chat explicitly no-profile/no-frills
- clean cutover landed and verified:
  - explicit `profile` is now the only active frontend/backend selector input
  - legacy current-profile cookie route is disabled for assistant and inventory
  - shared resolver no longer accepts ambient `chat_profile` cookie state
  - assistant app-chat was live-smoke-tested with a stale `chat_profile=inventory` cookie and still resolved the assistant runtime correctly

## Topics

- architecture
- backend
- chat
- wesen-os

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Structure

- design/ - Architecture and design documents
- design-doc/ - Main implementation and redesign documents
- reference/ - Prompt packs, API contracts, context summaries
- playbooks/ - Command sequences and test procedures
- scripts/ - Temporary code and tooling
- various/ - Working notes and research
- archive/ - Deprecated or reference-only artifacts
