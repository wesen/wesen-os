# Shared Federation GitOps PR Helper

## Purpose

This note documents the next step after the first `infra-tooling` extraction succeeded:

- dry-run validation against a checked-out GitOps repo was useful
- but it was not enough for a reusable release pipeline

The reusable system also needs a shared way to:

1. clone the private GitOps repo
2. patch one remote entry inside `federation.registry.json`
3. commit the change on a deterministic branch
4. push that branch
5. open or reuse a GitHub PR

That is what the new shared helper does.

## Where The Logic Lives

The implementation lives in:

- [open_federation_gitops_pr.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/open_federation_gitops_pr.py)

It builds on the existing low-level patcher:

- [patch_federation_registry_target.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/patch_federation_registry_target.py)

And it complements, rather than replaces, the image-oriented helper:

- [open_gitops_pr.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/gitops/open_gitops_pr.py)

## Why A New Helper Was Needed

The earlier shared helper:

- [update_federation_gitops_target.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/update_federation_gitops_target.py)

was intentionally limited to one use case:

- patch a real checked-out GitOps file
- print the diff
- restore the file

That was enough to validate the structure and keep mutation risk low during the first extraction. It was not enough to run the full reusable workflow on `main`.

The gap looked like this:

```text
before:
  app repo publishes manifest
  -> app repo dry-runs GitOps diff
  -> human still has to do the actual PR step elsewhere

after:
  app repo publishes manifest
  -> shared helper patches GitOps target
  -> shared helper pushes deterministic branch
  -> shared helper opens or reuses PR
```

## Control Flow

The new helper supports two operating modes.

### Mode 1: Dry-run against a local checkout

This is used in CI validation for workflow-dispatch dry runs.

```text
source repo workflow
  -> checkout source repo
  -> checkout infra-tooling
  -> checkout private GitOps repo
  -> call open_federation_gitops_pr.py
       with --gitops-repo-dir .gitops --dry-run
  -> helper patches target file
  -> helper prints unified diff
  -> helper restores file
```

### Mode 2: Real PR creation

This is the real release path for pushes to `main` or workflow-dispatch with `dry_run=false`.

```text
source repo workflow
  -> checkout source repo
  -> checkout infra-tooling
  -> publish remote artifact
  -> compute immutable manifest URL
  -> call open_federation_gitops_pr.py
       with --push --open-pr
  -> helper clones private GitOps repo using GH_TOKEN
  -> helper patches target file
  -> helper creates deterministic branch
  -> helper commits target-file change
  -> helper pushes branch
  -> helper opens PR or detects an existing open PR
```

## Inputs

The helper reads target metadata from:

- [federation-gitops-targets.json](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json)

Current required fields are:

- `name`
- `kind`
- `remote_id`
- `gitops_repo`
- `gitops_branch`
- `target_file`
- `config_key`

This keeps the source repo-specific information outside the shared code.

## Branch Naming

The helper creates deterministic branch names using:

- remote id
- target name
- version fragment derived from the manifest URL

Example shape:

```text
automation/federation-inventory-wesen-os-inventory-prod-sha-1a32286
```

This matters for idempotence. If the same manifest URL is published twice, the helper can detect an already-open PR for the same branch and avoid creating duplicates.

## PR Body

The helper writes a federation-specific PR body that records:

- remote id
- manifest URL
- target file
- config key
- source repo and source commit when running inside GitHub Actions
- workflow run URL when available
- rollback guidance

That keeps the GitOps PR reviewable without needing to inspect the source repo workflow logs.

## Inventory Workflow Migration

The first consumer migration is:

- [publish-federation-remote.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml)

Important behavior:

### For workflow dispatch with `dry_run=true`

- checkout private GitOps repo
- run the new helper with:
  - `--gitops-repo-dir .gitops`
  - `--dry-run`
- skip real PR creation step

### For pushes to `main` or `dry_run=false`

- skip the local GitOps checkout
- run the same helper with:
  - `--push`
  - `--open-pr`

So the same shared helper now covers both safe validation and the real mutation path.

## Temporary Publication Bridge

At the moment of this slice, the new helper lives on the next `infra-tooling` branch, not yet on `infra-tooling` `main`.

So the inventory workflow temporarily reintroduces:

- `ref: task/os-openai-app-server`

on the `infra-tooling` checkout.

That is a publication bridge only. It should be removed once the corresponding `infra-tooling` PR lands on `main`, exactly like the previous extraction bridge.

## Validation Performed

Local validation:

- `python3 -m py_compile` on the new helper and related scripts
- local dry-run against the real K3s checkout
- workflow YAML parse with `yq`

GitHub validation:

- inventory workflow branch run:
  - `23851087827`

That run proved:

- the source repo can check out the branch-hosted shared helper
- build the remote artifact
- publish in dry-run mode
- use the PR-capable shared helper in dry-run mode successfully

The real PR-creation path is now implemented, but it has not yet been exercised on a live non-dry-run branch in this ticket slice.

## Next Step

The next bounded step after this document is:

1. merge the `infra-tooling` PR that adds the shared helper
2. remove the temporary `infra-tooling` branch pin from the inventory workflow
3. rerun dry-run once against `infra-tooling` `main`
4. then execute the first real GitOps PR creation through the shared helper path
