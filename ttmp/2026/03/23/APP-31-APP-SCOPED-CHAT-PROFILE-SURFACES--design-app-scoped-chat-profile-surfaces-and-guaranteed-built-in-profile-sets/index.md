---
Title: Design app-scoped chat/profile surfaces and guaranteed built-in profile sets
Ticket: APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES
Status: active
Topics:
    - architecture
    - wesen-os
    - pinocchio
    - profiles
    - frontend
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Ticket workspace for designing app-scoped chat/profile surfaces in wesen-os, with guaranteed inventory built-in profiles and app-owned profile visibility rules."
LastUpdated: 2026-03-23T10:59:00-04:00
WhatFor: "Analyze and design how wesen-os chat/profile endpoints should become app-scoped at the profile-surface layer, with guaranteed built-in profile sets such as inventory/default/analyst/assistant for the inventory chat app."
WhenToUse: "Use when changing inventory chat profile selection, designing app-specific chat/profile APIs, or deciding how built-in app profiles and operator-supplied Pinocchio registries should interact."
---

# Design app-scoped chat/profile surfaces and guaranteed built-in profile sets

## Overview

This ticket explains a mismatch in the current `wesen-os` chat architecture:

- HTTP routes are already namespaced per app under `/api/apps/<app-id>/...`
- but the profile registry injected into those app endpoints is still shared across apps
- and the inventory-specific profiles (`default`, `inventory`, `analyst`, `assistant`) are not guaranteed runtime data today because they only exist in launcher test fixtures

The goal of this ticket is to give a detailed design and implementation guide for a cleaner model:

- each chat-facing app keeps its own `/chat` and `/api/chat/profiles` surface
- each app owns which profiles are visible and selectable on that surface
- each app can ship guaranteed built-in profiles as real registry data
- operator-provided Pinocchio registries can still participate, but through explicit app-scoped rules instead of indiscriminate sharing

## Key Links

- Primary design doc:
  `design-doc/01-intern-guide-to-app-scoped-chat-profile-surfaces-and-inventory-built-in-profiles.md`
- Diary:
  `reference/01-investigation-diary.md`
- Related previous ticket:
  `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/index.md`

## Status

Current status: **active**

## Topics

- architecture
- wesen-os
- pinocchio
- profiles
- frontend

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Deliverable Summary

This workspace now contains:

- an intern-facing architecture/design/implementation guide for app-scoped chat/profile surfaces,
- a diary that records the investigation path and exact findings,
- a detailed explanation of why inventory profiles are missing at runtime today,
- a concrete implementation direction that preserves namespaced app endpoints while removing the shared-profile-surface mistake.

## Structure

- design/ - Architecture and design documents
- reference/ - Prompt packs, API contracts, context summaries
- playbooks/ - Command sequences and test procedures
- scripts/ - Temporary code and tooling
- various/ - Working notes and research
- archive/ - Deprecated or reference-only artifacts
