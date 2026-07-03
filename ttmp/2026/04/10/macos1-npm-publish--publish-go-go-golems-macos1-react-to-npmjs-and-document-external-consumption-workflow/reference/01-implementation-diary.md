---
Title: Implementation diary
Ticket: macos1-npm-publish
Status: active
Topics:
    - react
    - npm
    - release-engineering
    - packaging
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Chronological diary for the npmjs publication work for @go-go-golems/macos1-react.
LastUpdated: 2026-04-10T00:25:00-04:00
WhatFor: Record findings, commands, failures, and release-engineering decisions while moving macos1-react to npmjs.
WhenToUse: Use when implementing or reviewing the npmjs publication work and when handoff context is needed.
---

# Implementation diary

## Goal

Track the implementation work required to publish `@go-go-golems/macos1-react` to npmjs.org and document the external-consumption workflow.

## Context

The package currently targets GitHub Packages, but the desired end state is a public npmjs package that external consumers can install without GitHub registry configuration.

The crucial caveat discovered up front is that `@go-go-golems/os-core` remains on GitHub Packages and now depends on `@go-go-golems/macos1-react`, so same-scope cross-registry usage must be documented carefully and should not be treated as the public default story.

## Quick Reference

### Ticket workspace

- Ticket root: `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/10/macos1-npm-publish--publish-go-go-golems-macos1-react-to-npmjs-and-document-external-consumption-workflow`
- Design doc: `design-doc/01-implementation-guide-for-publishing-macos1-react-to-npmjs.md`
- Tasks: `tasks.md`

### Key repo files

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/macos1-react/package.json`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-core/package.json`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/scripts/packages/publish-github-package.mjs`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml`

## Usage Examples

### 2026-04-10 — Ticket creation and initial findings

Created ticket `macos1-npm-publish` with a primary design document and this diary.

Initial file-backed findings:

- `packages/macos1-react/package.json` currently points at `https://npm.pkg.github.com` via `publishConfig.registry`.
- `packages/os-core/package.json` now depends on `@go-go-golems/macos1-react` via `workspace:*`.
- the repo already has GitHub Packages publication flow, but not an npmjs-specific flow for `macos1-react`.
- publishing only `macos1-react` to npmjs is reasonable, but it does **not** automatically create a simple public story for `os-core` because both packages share the `@go-go-golems` scope.

Working conclusion recorded in the design doc:

- ship `macos1-react` publicly on npmjs,
- keep `os-core` on GitHub Packages for now,
- document the cross-registry caveat clearly,
- do not expand this ticket into a full-scope registry migration.

## Related

- `design-doc/01-implementation-guide-for-publishing-macos1-react-to-npmjs.md`
- `tasks.md`
