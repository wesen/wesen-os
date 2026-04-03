# SQLite Federated Release Handoff Guide

## Overview

This guide is written for a new intern who needs to continue the sqlite migration without relying on oral history.

The migration is not “make sqlite build with Vite.” The real goal is:

- make sqlite behave like inventory in the federated release system

That means sqlite needs to move through the same release planes:

1. source repo builds a browser-loadable remote artifact
2. source repo uploads that artifact to object storage
3. source repo uses shared automation from `infra-tooling`
4. source repo opens a GitOps PR against the private K3s repo
5. Argo rolls the host config forward
6. `wesen-os` loads the remote via `remote-manifest`

The most important lesson from the inventory work is that this is a multi-repo system. If you only study the sqlite repo, you will miss critical pieces.

## The Four Repositories You Need To Understand

### 1. The App Repo: `go-go-app-sqlite`

Path:

- [go-go-app-sqlite](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite)

This repo owns:

- sqlite application code
- the federated host contract entrypoint
- the app-specific federation build config
- the source-repo workflow that publishes the remote
- repo-local metadata describing which GitOps target should be updated

This repo should not own:

- the generic GitOps patch/open-PR logic
- cluster manifests for `wesen-os`

### 2. The Shared Tooling Repo: `infra-tooling`

Path:

- [infra-tooling](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling)

This repo owns:

- reusable federation publish helper logic
- reusable GitOps target patch/update/open-PR helpers
- reusable workflow template examples
- generalized docs about the release model

This repo exists so that:

- inventory-specific shell/python snippets do not get copied into every app repo
- the release pattern can be reused by sqlite and future apps

### 3. The GitOps Repo: `2026-03-27--hetzner-k3s`

Path:

- [2026-03-27--hetzner-k3s](/home/manuel/code/wesen/2026-03-27--hetzner-k3s)

This repo owns:

- the host deployment manifests
- the host federation registry file
- Argo-tracked desired state

For the current migration, the most important target file is:

- [federation.registry.json](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/config/federation.registry.json)

This file is now the canonical host-side registry state.

### 4. The Host Repo: `wesen-os`

Path:

- [wesen-os](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os)

This repo matters because it already contains:

- the launcher-side remote registry/runtime loader
- the historical ticket trail for inventory
- the host deployment and K3s migration docs

You do not need to implement sqlite release automation here, but you do need this repo’s ticket trail to understand what was already proven.

## End-To-End Control Flow

The right mental model is:

```text
go-go-app-sqlite CI
  -> build dist-federation
  -> upload mf-manifest.json + sqlite-host-contract.js
  -> produce immutable manifest URL
  -> run shared helper from infra-tooling
  -> patch K3s federation.registry.json
  -> push GitOps branch
  -> open GitOps PR
  -> merge PR
  -> Argo syncs wesen-os package
  -> wesen-os serves updated /api/os/federation-registry
  -> browser fetches sqlite manifest from object storage
  -> browser imports sqlite host contract
```

The key design principle is:

- the app repo is the producer
- the K3s repo is the desired-state target
- the host consumes whatever the GitOps state says

## What Inventory Already Proved

Inventory is the first complete proof that this model works.

It already proved:

- thin app workflow + shared helper is feasible
- private K3s repo checkout can be done with `K3S_REPO_READ_TOKEN`
- real GitOps PR creation can be done with `GITOPS_PR_TOKEN`
- immutable manifest URLs are the right release unit
- the host federation registry can be updated through GitOps
- the browser can load a remote from object storage

This is why sqlite should not invent a new pattern. It should reuse the inventory pattern with sqlite-specific metadata and build behavior.

The best concrete inventory reference files are:

- [deploy/federation-gitops-targets.json](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json)
- [publish-federation-remote.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml)

## Current Partial SQLite Work

There is already partial local sqlite work that tries to mirror inventory:

- [apps/sqlite/src/host.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/host.ts)
- [apps/sqlite/vite.federation.config.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/vite.federation.config.ts)
- [apps/sqlite/src/federation-shared](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/federation-shared)
- modified [apps/sqlite/package.json](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/package.json)

The intended artifact shape appears to be:

- `dist-federation/mf-manifest.json`
- `dist-federation/sqlite-host-contract.js`

The intended manifest contract currently looks like:

```json
{
  "version": 1,
  "remoteId": "sqlite",
  "compatiblePlatformRange": "^0.1.0",
  "contract": {
    "entry": "./sqlite-host-contract.js",
    "exportName": "sqliteHostContract"
  }
}
```

That is directionally correct, but it has not yet been validated against a real build or the host loader.

## The Most Important Recent Change

If you remember only one thing from this guide, remember this:

Older federation GitOps work updated:

- `gitops/kustomize/wesen-os/configmap.yaml`

Current federation GitOps work must update:

- [gitops/kustomize/wesen-os/config/federation.registry.json](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/config/federation.registry.json)

This changed because `KUSTOMIZE-ROLL-001` converted the deployment to a generated-config layout. The old target assumptions are now stale.

That is why `infra-tooling` had to be updated, and why sqlite should start from the new target shape immediately.

## Shared Helper State

The currently relevant `infra-tooling` branch is:

- `task/federation-publish-helper`

The important current head is:

- `c943970` `Generalize federation publish helper and JSON targets`

That branch includes the work sqlite needs:

- generic remote publish helper:
  - [publish_federation_remote.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/publish_federation_remote.py)
- generic target patch/update helper:
  - [patch_federation_registry_target.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/patch_federation_registry_target.py)
  - [update_federation_gitops_target.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/update_federation_gitops_target.py)
- generic PR creation helper:
  - [open_federation_gitops_pr.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/open_federation_gitops_pr.py)

These helpers now understand direct JSON target files, which is essential after the Kustomize migration.

## Recommended Implementation Order

Do not start by writing a workflow. Start by validating layers from the bottom up.

### Step 1. Freeze And Publish The Shared Helper Layer

Before sqlite can consume the generalized helper path, make sure the `infra-tooling` branch is in a reviewable/published state.

Check:

- is `c943970` already pushed?
- is there a PR?
- does the shared example target file already show the sqlite JSON target path?

Relevant files:

- [examples/federation/federation-gitops-targets.example.json](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/examples/federation/federation-gitops-targets.example.json)
- [templates/github/publish-federated-remote.template.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/templates/github/publish-federated-remote.template.yml)

### Step 2. Validate The SQLite Artifact Locally

Treat the existing sqlite worktree changes as a hypothesis, not a finished design.

Run:

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite
npm run build:federation -w apps/sqlite
```

Then inspect:

- does `dist-federation/` exist?
- does `mf-manifest.json` contain the expected remote id and export name?
- is `sqlite-host-contract.js` emitted?

Pseudocode for the validation logic:

```text
if build:federation fails:
  fix sqlite artifact layer first
else:
  inspect manifest
  inspect entry artifact
  compare to inventory shape
```

### Step 3. Add Repo-Local Release Metadata

Once the artifact is real, add:

- `deploy/federation-gitops-targets.json`

This file should follow the same shape inventory now uses, but with:

- `remote_id: "sqlite"`
- target name like `wesen-os-sqlite-prod`
- `target_file: "gitops/kustomize/wesen-os/config/federation.registry.json"`

Example shape:

```json
{
  "targets": [
    {
      "name": "wesen-os-sqlite-prod",
      "kind": "federation-manifest",
      "remote_id": "sqlite",
      "gitops_repo": "wesen/2026-03-27--hetzner-k3s",
      "gitops_branch": "main",
      "target_file": "gitops/kustomize/wesen-os/config/federation.registry.json"
    }
  ]
}
```

### Step 4. Add The Source-Repo Workflow

After that, add a thin workflow to sqlite that:

1. checks out sqlite repo
2. checks out `infra-tooling`
3. optionally checks out K3s repo for dry-run validation
4. builds the federation artifact
5. uploads the artifact through the shared helper
6. calls the shared GitOps updater/PR helper

This workflow should not embed sqlite-specific patch logic. The sqlite-specific information should live in:

- app build command
- repo-local target metadata
- workflow inputs/environment

### Step 5. Dry-Run First

Before enabling push/open-PR:

- use the read-only private repo checkout
- run the shared updater in dry-run mode
- inspect the diff against the real K3s checkout

Only after dry-run succeeds should you enable:

- `--push`
- `--open-pr`

### Step 6. Real GitOps PR Creation

When dry-run is stable:

- use `GITOPS_PR_TOKEN` for real GitOps push/open-PR
- let the workflow open the deterministic PR branch against the K3s repo

The expected end state is:

```text
sqlite source repo run
  -> emits immutable manifest URL
  -> opens GitOps PR
  -> PR updates federation.registry.json by adding/updating remoteId "sqlite"
```

## Practical Pitfalls

### Pitfall 1. Updating The Wrong K3s File

Do not target:

- `gitops/kustomize/wesen-os/configmap.yaml`

Target:

- [gitops/kustomize/wesen-os/config/federation.registry.json](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/config/federation.registry.json)

### Pitfall 2. Copying Inventory’s Old Local Helper Path

Inventory evolved through several iterations. Some older ticket history references:

- repo-local scripts
- old embedded-JSON patch logic
- temporary infra-tooling branch pins

Do not reconstruct those historical states unless you are debugging them.

SQLite should start from the current generalized path.

### Pitfall 3. Treating The Existing SQLite Worktree As Validated

There is useful work already present, but it is not proven yet. Build and inspect it first.

### Pitfall 4. Recreating Shared Logic In The App Repo

If you find yourself writing a sqlite-specific Python patcher for K3s JSON, stop. That logic belongs in `infra-tooling`.

## Debugging Checklist

If sqlite migration fails, debug in this order:

1. artifact layer
2. metadata layer
3. shared helper layer
4. auth layer
5. GitOps PR layer

Concrete checks:

- does `npm run build:federation -w apps/sqlite` pass?
- does `mf-manifest.json` name `sqlite` correctly?
- does repo-local target metadata point to the JSON file?
- does dry-run against private K3s checkout succeed?
- does the workflow have:
  - `K3S_REPO_READ_TOKEN`
  - `GITOPS_PR_TOKEN`

## Suggested First Commands For The Intern

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os
ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/scripts/01-audit-sqlite-federation-handoff-state.sh
```

Then:

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite
npm run build:federation -w apps/sqlite
find apps/sqlite/dist-federation -maxdepth 2 -type f | sort
sed -n '1,160p' apps/sqlite/dist-federation/mf-manifest.json
```

Then compare sqlite against inventory:

- [apps/inventory/src/host.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/host.ts)
- [apps/inventory/vite.federation.config.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/vite.federation.config.ts)
- [deploy/federation-gitops-targets.json](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json)

## Handoff Recommendation

The next engineer should not try to finish the whole migration in one jump.

The safe order is:

1. publish or review the shared helper branch in `infra-tooling`
2. validate the partial sqlite federation artifact work locally
3. add sqlite repo-local target metadata
4. add a thin workflow that consumes `infra-tooling`
5. prove dry-run against the private K3s repo
6. then enable real GitOps PR creation

If those steps are followed in order, sqlite should become the second clean reuse proof for the federated release system.
