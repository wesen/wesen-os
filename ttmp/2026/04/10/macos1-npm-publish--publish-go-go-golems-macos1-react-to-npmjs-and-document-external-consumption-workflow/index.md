---
Title: Publish @go-go-golems/macos1-react to npmjs and document external consumption workflow
Ticket: macos1-npm-publish
Status: active
Topics:
    - react
    - npm
    - release-engineering
    - packaging
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: ""
LastUpdated: 2026-04-10T00:11:36.453825325-04:00
WhatFor: ""
WhenToUse: ""
---

# Publish @go-go-golems/macos1-react to npmjs and document external consumption workflow

## Overview

This ticket tracks the release-engineering work needed to publish `@go-go-golems/macos1-react` to npmjs.org as a public package, while keeping the existing GitHub Packages workflow for internal packages intact. The main output is a detailed intern-oriented implementation guide plus a phased task list.

## Key Links

- **Design doc**: `design-doc/01-implementation-guide-for-publishing-macos1-react-to-npmjs.md`
- **Implementation diary**: `reference/01-implementation-diary.md`
- **Tasks**: `tasks.md`
- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field

## Status

Current status: **active**

Current working conclusion:

- `@go-go-golems/macos1-react` should become the public npmjs package
- `@go-go-golems/os-core` should remain on GitHub Packages for now
- same-scope cross-registry caveats must be documented explicitly rather than hidden

## Topics

- react
- npm
- release-engineering
- packaging

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
