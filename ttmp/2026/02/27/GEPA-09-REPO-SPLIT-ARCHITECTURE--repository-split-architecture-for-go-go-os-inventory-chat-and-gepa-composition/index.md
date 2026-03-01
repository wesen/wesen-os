---
Title: Repository split architecture for wesen-os composition of go-go-os, go-go-gepa, and go-go-app-inventory
Ticket: GEPA-09-REPO-SPLIT-ARCHITECTURE
Status: complete
Topics:
    - architecture
    - go-go-os
    - frontend
    - inventory-chat
    - gepa
    - plugins
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: go-go-gepa/ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--repository-split-architecture-for-go-go-os-inventory-chat-and-gepa-composition/design-doc/01-repository-split-blueprint-and-implementation-roadmap.md
      Note: V1 split architecture document
    - Path: go-go-gepa/ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--repository-split-architecture-for-go-go-os-inventory-chat-and-gepa-composition/design-doc/02-v2-wesen-os-composition-plan-go-go-os-go-go-gepa-go-go-app-inventory.md
      Note: V2 renamed topology and detailed execution task board
    - Path: go-go-gepa/ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--repository-split-architecture-for-go-go-os-inventory-chat-and-gepa-composition/reference/01-research-diary-repo-split-architecture.md
      Note: Chronological research diary
ExternalSources: []
Summary: Research ticket for splitting into a v2 composition model with wesen-os composing go-go-os, go-go-gepa, and go-go-app-inventory.
LastUpdated: 2026-02-28T14:27:55.489446386-05:00
WhatFor: Track repository split research outcomes and execution starting point, including v2 rename and task plan.
WhenToUse: Use as navigation entry for implementation planning and architecture review, especially for v2 execution.
---



# Repository split architecture for wesen-os composition of go-go-os, go-go-gepa, and go-go-app-inventory

## Overview

This ticket captures architecture research for a hard-cut migration to:

1. source repo: `go-go-os`,
2. source repo: `go-go-gepa`,
3. source repo: `go-go-app-inventory` (extracted inventory backend),
4. composition repo: `wesen-os`.

## Primary deliverables

- Design doc v1: `design-doc/01-repository-split-blueprint-and-implementation-roadmap.md`
- Design doc v2: `design-doc/02-v2-wesen-os-composition-plan-go-go-os-go-go-gepa-go-go-app-inventory.md`
- Diary: `reference/01-research-diary-repo-split-architecture.md`

## Current status

- Architecture research complete for initial split plan and v2 renamed topology.
- Implementation not started in this ticket.

## Tasks

See [tasks.md](./tasks.md).

## Changelog

See [changelog.md](./changelog.md).
