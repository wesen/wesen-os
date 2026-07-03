---
Title: Move published @go-go-golems library packages from GitHub Packages to npmjs and document host deployment impact
Ticket: npmjs-public-libraries
Status: active
Topics:
    - frontend
    - architecture
    - react
    - npm
    - packaging
    - release-engineering
    - k3s
    - federation
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: ""
LastUpdated: 2026-04-10T09:40:00.198329542-04:00
WhatFor: ""
WhenToUse: ""
---

# Move published @go-go-golems library packages from GitHub Packages to npmjs and document host deployment impact

## Overview

This ticket tracks a coordinated migration of the published non-app `@go-go-golems` library packages from GitHub Packages to npmjs. It also documents the impact on downstream federated app source repos and explains why the k3s host runtime is mostly affected at build-time boundaries rather than through any runtime registry fetch of npm packages.

## Key Links

- **Design doc**: `design-doc/01-detailed-guide-for-migrating-published-go-go-golems-libraries-from-github-packages-to-npmjs.md`
- **Implementation diary**: `reference/01-implementation-diary.md`
- **Tasks**: `tasks.md`
- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field

## Status

Current status: **active**

Current working conclusion:

- all reusable library packages under `workspace-links/go-go-os-frontend/packages/*` should migrate together to npmjs
- app packages remain out of scope
- downstream federated source repos are in scope because they install published platform packages during CI
- k3s host runtime behavior should be validated but is not expected to require a redesign

## Topics

- frontend
- architecture
- react
- npm
- packaging
- release-engineering
- k3s
- federation

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
