---
Title: Generic App Chat Bootstrap and Context Injection
Ticket: APP-05-GENERIC-APP-CHAT-BOOTSTRAP
Status: active
Topics:
    - backend
    - chat
    - documentation
    - wesen-os
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: 2026/03/05/APP-04-OS-CHAT-PLATFORM--extract-shared-os-chat-platform-and-migrate-inventory/design-doc/01-intern-guide-shared-os-chat-platform-extraction-inventory-migration-and-wesen-os-mounting.md
      Note: Platform prerequisite guide referenced by this ticket
    - Path: 2026/03/05/APP-05-GENERIC-APP-CHAT-BOOTSTRAP--generic-app-chat-bootstrap-and-context-injection/design-doc/01-scope-note-generic-app-chat-bootstrap-and-context-injection.md
      Note: Scope note for the bootstrap follow-up
ExternalSources: []
Summary: Track and document the implemented OS feature that starts assistant chats about arbitrary apps by resolving docs/reflection context and bootstrapping conversations.
LastUpdated: 2026-03-06T14:40:00-05:00
WhatFor: Track the implemented Chat With App feature built on top of the mounted shared assistant backend, including assistant bootstrap routes, conv_id-scoped context injection, and the apps-browser to assistant-window handoff.
WhenToUse: Use this ticket when reviewing or extending generic app-chat bootstrap, docs/reflection context assembly, assistant window opening from apps-browser, or the minimal shared hook in go-go-os-chat that makes conv_id-scoped context possible.
---


# Generic App Chat Bootstrap and Context Injection

## Overview

This ticket is intentionally separate from APP-04. APP-04 was the platform extraction/migration/mount ticket; APP-05 is the feature ticket that now uses that platform to bootstrap app-specific assistant conversations with documentation and reflection context.

APP-05 is no longer just a placeholder. The assistant backend, shared chatservice, and launcher docs surfaces now exist, so this ticket contains the concrete intern-facing design and next implementation sequence.

## Key Links

- [Scope note](./design-doc/01-scope-note-generic-app-chat-bootstrap-and-context-injection.md)
- [Revised guide](./design-doc/02-intern-guide-chat-with-app-after-os-chat-extraction.md)
- [Investigation diary](./reference/01-investigation-diary.md)
- [Tasks](./tasks.md)
- [Changelog](./changelog.md)

## Status

Current status: **implemented and verified**

## Topics

- backend
- chat
- documentation
- wesen-os

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Structure

- design/ - Architecture and design documents
- reference/ - Prompt packs, API contracts, context summaries
- playbooks/ - Command sequences and test procedures
- scripts/ - Temporary code and tooling
- various/ - Working notes and research
- archive/ - Deprecated or reference-only artifacts
