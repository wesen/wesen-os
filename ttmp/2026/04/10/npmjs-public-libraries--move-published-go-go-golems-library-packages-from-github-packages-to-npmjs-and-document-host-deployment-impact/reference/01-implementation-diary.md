---
Title: Implementation diary
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
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Chronological diary for the npmjs migration analysis covering the public library package set, downstream federated app source repos, and host deployment impact.
LastUpdated: 2026-04-10T00:55:00-04:00
WhatFor: Record evidence, commands, decisions, and validation steps for the coordinated npmjs migration.
WhenToUse: Use when implementing the migration or when future reviewers need to understand why the registry strategy expanded from a single-package move to a full library-set migration.
---

# Implementation diary

## Goal

Track the investigation and implementation context for moving the published `@go-go-golems` library packages from GitHub Packages to npmjs in one coordinated migration.

## Context

The triggering question was whether the cleanest path, in order to avoid registry hacks, would be to move everything public at once rather than publishing only `macos1-react` to npmjs. The agreed answer was yes: all non-app library packages should move together, while app packages remain out of scope.

A second requirement was to explain how this affects compiled federated modules on k3s. The key architectural finding is that the migration mostly affects **build-time dependency installation in source app repos**, not the host’s **runtime manifest loading plane**.

## Quick Reference

### Ticket workspace

- Ticket root: `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/10/npmjs-public-libraries--move-published-go-go-golems-library-packages-from-github-packages-to-npmjs-and-document-host-deployment-impact`
- Design doc: `design-doc/01-detailed-guide-for-migrating-published-go-go-golems-libraries-from-github-packages-to-npmjs.md`
- Tasks: `tasks.md`

### Main code evidence gathered

#### Library publish system
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/package.json`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/scripts/packages/publish-github-package.mjs`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/scripts/packages/package-sets.mjs`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml`

#### Host runtime and deployment
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/federation_registry_endpoint.go`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/federationRegistry.ts`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/loadFederatedAppContracts.ts`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/deploy/k8s/wesen-os/configmap.yaml`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/deploy/k8s/wesen-os/deployment.yaml`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/.github/workflows/deploy-host-to-k3s.yml`

#### Downstream federated app source repos
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/.github/workflows/publish-federation-remote.yml`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json`

## Usage Examples

### 2026-04-10 — Initial expansion from single-package npmjs ticket to full library migration

The earlier single-package ticket (`macos1-react` to npmjs only) surfaced the same-scope cross-registry problem: if `macos1-react` moved to npmjs while the rest of the reusable `@go-go-golems` libraries stayed on GitHub Packages, consumer configuration would become hacky and confusing.

The user then clarified the desired operating rule:

- everything public except app packages should move together

That changed the appropriate ticket scope from:

- “publish `macos1-react` to npmjs”

to:

- “migrate the whole published library package family to npmjs”

### 2026-04-10 — Key architectural conclusion about k3s and federated remotes

Observed from code and deployment files:

- the k3s host runtime serves `/api/os/federation-registry` from a JSON file on disk
- launcher bootstrap uses that registry to fetch remote manifests and dynamic-import remote entries from object storage
- downstream app repos such as inventory and sqlite install published platform packages during CI before building `dist-federation`

Conclusion:

- npmjs migration affects the **platform library installation path used by source app CI**
- it does **not** fundamentally change the host’s remote-manifest runtime contract

That distinction is now captured explicitly in the design doc as three delivery planes:

1. npm package plane
2. host image plane
3. remote asset plane

## Related

- `design-doc/01-detailed-guide-for-migrating-published-go-go-golems-libraries-from-github-packages-to-npmjs.md`
- `tasks.md`
