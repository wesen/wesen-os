---
Title: wesen-os startup fails due implicit legacy profiles.yaml fallback
Ticket: GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML
Status: active
Topics:
    - bug
    - geppetto
    - pinocchio
    - profile-registry
    - config
    - wesen-os
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ttmp/2026/02/27/GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML--wesen-os-startup-fails-due-implicit-legacy-profiles-yaml-fallback/design-doc/01-bug-report-and-implementation-research-legacy-profiles-fallback-startup-failure.md
      Note: Detailed bug report and implementation research
    - Path: ttmp/2026/02/27/GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML--wesen-os-startup-fails-due-implicit-legacy-profiles-yaml-fallback/reference/01-investigation-diary.md
      Note: Chronological command-level diary
ExternalSources: []
Summary: ""
LastUpdated: 2026-02-27T22:52:55.297655456-05:00
WhatFor: Track, explain, and remediate startup failures caused by implicit loading of legacy profiles.yaml through geppetto middleware bootstrap.
WhenToUse: Use when commands built with geppetto profile middlewares fail with legacy runtime YAML errors, especially outside pinocchio.
---


# wesen-os startup fails due implicit legacy profiles.yaml fallback

## Overview

`wesen-os-launcher` fails to start on machines where `${XDG_CONFIG_HOME:-~/.config}/pinocchio/profiles.yaml` exists in legacy map format.

The immediate symptom is:

`validation error (registry): runtime YAML must be a single registry document (legacy profile-map format is not supported)`

This ticket documents the root cause and proposes source-level fixes in `geppetto`/`pinocchio`, with implementation phases and validation strategy.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field

## Status

Current status: **active**

Research status:

- Reproduced on current workstation.
- Root-cause traced to geppetto middleware bootstrap defaulting to `pinocchio/profiles.yaml`.
- Source-level remediation options defined and prioritized.

## Topics

- bug
- geppetto
- pinocchio
- profile-registry
- config
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
