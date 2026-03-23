---
Title: Reorganize Split-Repo Workspace Composition for Wesen-OS
Ticket: APP-02-WORKSPACE-COMPOSITION-REORG
Status: active
Topics:
    - wesen-os
    - frontend
    - architecture
    - tooling
    - pnpm-workspace
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Research and planning package for replacing brittle sibling-path launcher composition with a clean top-level workspace and package-based app integration model.
LastUpdated: 2026-03-05T15:00:00-05:00
WhatFor: Track and deliver the APP-02 workspace-composition redesign package.
WhenToUse: When reviewing the proposed clean organization for wesen-os and related frontend app repositories.
---

# Reorganize Split-Repo Workspace Composition for Wesen-OS

## Overview

This ticket contains a detailed architecture and migration guide for reorganizing the current split-repo `wesen-os` composition model into a cleaner top-level workspace with package-based launcher integration.

The deliverable includes:

1. an evidence-backed design document for new engineers,
2. a strict chronological diary,
3. ticket-local research scripts,
4. captured scan logs,
5. docmgr bookkeeping and reMarkable delivery metadata.

## Key Links

- Primary design guide:
  - `design-doc/01-clean-workspace-composition-architecture-migration-plan-and-intern-guide.md`
- Investigation diary:
  - `reference/01-investigation-diary.md`
- Research scripts:
  - `scripts/run_workspace_topology_scan.sh`
  - `scripts/run_launcher_coupling_scan.sh`
- Research outputs:
  - `scripts/output/workspace-topology-scan-20260305-150221.log`
  - `scripts/output/launcher-coupling-scan-20260305-150221.log`
- reMarkable destination:
  - `/ai/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG/APP-02 Workspace Composition Reorganization.pdf`

## Status

Current status: **active**

## Topics

- wesen-os
- frontend
- architecture
- tooling
- pnpm-workspace

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Structure

- design-doc/ - Architecture and migration guide
- reference/ - Investigation diary
- scripts/ - Research scripts and output logs
- playbooks/ - Reserved for any future rollout playbooks
- archive/ - Reserved for superseded artifacts
