---
Title: Fix HyperCard Tools Runtime Surface Mounting packId Regression
Ticket: WOS-02-HYPERCARD-TOOLS-MOUNTING
Status: active
Topics:
    - wesen-os
    - hypercard
    - runtime
    - frontend
    - bugfix
    - documentation
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: ""
LastUpdated: 2026-04-06T17:06:22-04:00
WhatFor: Explain and fix the HyperCard Tools runtime surface mounting failure caused by missing surface packId metadata.
WhenToUse: Use when tracing why a launcher app opens a runtime error window instead of mounting its QuickJS-backed surface bundle.
---

# Fix HyperCard Tools Runtime Surface Mounting packId Regression

## Overview

This ticket documents and scopes the failure where the `HyperCard Tools` desktop icon opens a window that immediately reports `Runtime surface packId is required for surface: home`. The current work in this ticket is an evidence-backed architecture guide for a new intern, plus a concrete implementation plan for the actual code fix and the missing regression tests.

## Key Links

- Design doc: [design-doc/01-intern-guide-to-hypercard-tools-runtime-surface-mounting-packid-validation-and-the-home-surface-failure.md](./design-doc/01-intern-guide-to-hypercard-tools-runtime-surface-mounting-packid-validation-and-the-home-surface-failure.md)
- Diary: [reference/01-investigation-diary.md](./reference/01-investigation-diary.md)
- HyperCard Tools launcher entry: [/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx)
- HyperCard Tools runtime bundle: [/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js)
- QuickJS runtime loader: [/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/runtimeService.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/runtimeService.ts)

## Status

Current status: **active**

## Topics

- wesen-os
- hypercard
- runtime
- frontend
- bugfix
- documentation

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
