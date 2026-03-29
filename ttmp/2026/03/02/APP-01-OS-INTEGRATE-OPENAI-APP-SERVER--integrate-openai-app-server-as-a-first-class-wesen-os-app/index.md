---
Title: Integrate OpenAI App Server as a First-Class Wesen-OS App
Ticket: APP-01-OS-INTEGRATE-OPENAI-APP-SERVER
Status: active
Topics:
    - openai-app-server
    - chat
    - backend
    - websocket
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: ""
LastUpdated: 2026-03-02T17:10:40-05:00
WhatFor: ""
WhenToUse: ""
---

# Integrate OpenAI App Server as a First-Class Wesen-OS App

## Overview

This ticket delivers a deep research/design package for integrating `openai-app-server` as a first-class app in the `wesen-os` / `go-go-os` ecosystem. It includes:

- evidence-backed architecture mapping across backendhost, launcher composition, frontend contracts, and chat/timeline runtime;
- reproducible experiment scripts and logs;
- a 10+ page implementation guide for intern onboarding;
- a strict chronological diary with exact failures, fixes, and delivery commands;
- docmgr validation and reMarkable bundle upload.

## Key Links

- Primary design guide:
  - `design-doc/01-openai-app-server-integration-architecture-gap-analysis-and-implementation-guide.md`
- Investigation diary:
  - `reference/01-investigation-diary.md`
- Experiment scripts:
  - `scripts/run_openai_app_server_gap_scan.sh`
  - `scripts/run_wesen_os_integration_playbook_scan.sh`
- Experiment outputs:
  - `scripts/output/openai-app-server-gap-scan-20260302-165623.log`
  - `scripts/output/openai-app-server-gap-scan-20260302-165652.log`
  - `scripts/output/wesen-os-playbook-scan-20260302-165652.log`
- reMarkable destination:
  - `/ai/2026/03/02/APP-01-OS-INTEGRATE-OPENAI-APP-SERVER/APP-01 OpenAI App Server Integration Research.pdf`

## Status

Current status: **active**

## Topics

- openai-app-server
- chat
- backend
- websocket

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
