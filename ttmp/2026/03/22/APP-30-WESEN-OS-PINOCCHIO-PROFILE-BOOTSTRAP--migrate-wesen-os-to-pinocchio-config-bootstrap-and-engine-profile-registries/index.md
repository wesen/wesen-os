---
Title: Migrate wesen-os to Pinocchio config/bootstrap and engine-profile registries
Ticket: APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP
Status: active
Topics:
    - architecture
    - wesen-os
    - pinocchio
    - geppetto
    - profiles
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Ticket workspace for researching and planning the migration that makes wesen-os use Pinocchio bootstrap and Geppetto engine-profile registries instead of the old mixed runtime profile model."
LastUpdated: 2026-03-23T00:08:00-04:00
WhatFor: "Plan and explain the migration that moves wesen-os from legacy mixed runtime profiles to Pinocchio bootstrap plus Geppetto engine-profile registries while preserving the current app/runtime behavior expected by the launcher and frontend."
WhenToUse: "Use when updating wesen-os, go-go-os-chat, or inventory backend chat/profile wiring to follow the current Geppetto and Pinocchio profile architecture."
---

# Migrate wesen-os to Pinocchio config/bootstrap and engine-profile registries

## Overview

This ticket documents how to move `wesen-os` off the old mixed `geppetto/pkg/profiles` runtime model and onto the current split model:

- Geppetto resolves engine settings from engine-profile registries.
- Pinocchio owns config/bootstrap and profile-registry discovery.
- `wesen-os` owns application runtime policy such as prompts, middleware enablement, and tool allowlists.

The goal is not only to "make it compile" but to give a clear migration path for the launcher, the shared OS-chat packages, the inventory backend module, and the frontend profile API surface.

## Key Links

- Primary design doc:
  `design-doc/01-intern-guide-to-migrating-wesen-os-to-pinocchio-config-and-engine-profile-registries.md`
- Implementation postmortem:
  `design-doc/02-implementation-postmortem.md`
- Diary:
  `reference/01-investigation-diary.md`
- Prior related workspace:
  `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/02/27/GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML--wesen-os-startup-fails-due-implicit-legacy-profiles-yaml-fallback`

## Status

Current status: **active**

## Topics

- architecture
- wesen-os
- pinocchio
- geppetto
- profiles

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Deliverable Summary

This workspace now contains:

- an intern-facing migration/design/implementation guide,
- a detailed implementation postmortem explaining the final architecture and migration order,
- a chronological diary of the investigation and writing process,
- file-anchored evidence across `geppetto`, `pinocchio`, `wesen-os`, `go-go-os-chat`, and `go-go-os-frontend`,
- the final simplified contract for this migration: read/select profile APIs only, with no profile CRUD compatibility layer.

## Structure

- design/ - Architecture and design documents
- reference/ - Prompt packs, API contracts, context summaries
- playbooks/ - Command sequences and test procedures
- scripts/ - Temporary code and tooling
- various/ - Working notes and research
- archive/ - Deprecated or reference-only artifacts
