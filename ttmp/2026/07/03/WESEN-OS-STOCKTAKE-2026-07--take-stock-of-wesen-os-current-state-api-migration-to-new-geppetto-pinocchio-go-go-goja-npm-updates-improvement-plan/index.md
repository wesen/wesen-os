---
Title: 'Take stock of wesen-os: current state, API migration to new geppetto/pinocchio/go-go-goja, npm updates, improvement plan'
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - wesen-os
    - geppetto
    - pinocchio
    - go-go-goja
    - deployment
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: ""
LastUpdated: 2026-07-03T12:00:48.445677451-07:00
WhatFor: ""
WhenToUse: ""
---

# Take stock of wesen-os: current state, API migration to new geppetto/pinocchio/go-go-goja, npm updates, improvement plan

## Overview

Stocktake of the wesen-os system after ~3 months of divergence between this workspace (created 2026-03-02, wesen-os app work up to 2026-04-09 on task branches) and the dependency mains in `~/code/wesen/go-go-golems` (geppetto/pinocchio/go-go-goja/go-go-os-* advanced through mid-June 2026). Deliverables:

1. An evidence-based map of what wesen-os is (architecture, apps, JS runtime, frontend, deployment to wesen-os.yolo.scapegoat.dev).
2. A migration guide to the newest geppetto/pinocchio/go-go-goja Go APIs and the published @go-go-golems npm packages.
3. An improvement plan, written as an onboarding guide for a new intern.

Primary document: [design-doc/01-wesen-os-stocktake-system-analysis-api-migration-guide-and-improvement-plan.md](./design-doc/01-wesen-os-stocktake-system-analysis-api-migration-guide-and-improvement-plan.md). Investigation history: [reference/01-investigation-diary.md](./reference/01-investigation-diary.md).

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field

## Status

Current status: **active**

## Topics

- wesen-os
- geppetto
- pinocchio
- go-go-goja
- deployment

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
