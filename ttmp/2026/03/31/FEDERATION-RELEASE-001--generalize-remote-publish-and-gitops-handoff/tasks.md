# Tasks

## Phase 0: Freeze The Reusable Pattern

- [x] Document the generic release flow:
  - source repo builds remote
  - uploads immutable artifacts
  - computes manifest URL
  - opens GitOps PR
  - merge triggers rollout
- [x] Separate app-specific inputs from generic mechanics:
  - remote id
  - source dir
  - public base URL
  - target config path
  - target app/registry key
- [x] Write a detailed design/reference guide for the reusable remote-release template.
- [x] Add a replay helper that captures the current inventory-specific flow as the baseline.

## Phase 1: Generalize Source-Repo Inputs

- [x] Define a reusable `deploy/gitops-targets.json` shape for remote-manifest targets.
- [x] Define how source repos declare:
  - remote id
  - object-storage upload prefix
  - GitOps destination file
  - JSON path or logical target inside host registry
- [x] Decide whether the patch helper lives:
  - in each source repo
  - in a shared helper package/repo
  - or as a template in the K3s repo

## Phase 2: Generalize GitOps Patching

- [x] Design a generic patch helper that updates one remote entry in `federation.registry.json` inside YAML.
- [x] Prove the patch helper against the current `wesen-os` configmap shape on a temp copy.
- [ ] Make it work for:
  - `inventory`
  - future apps like `sqlite` or `gepa`
- [x] Avoid hardcoding `inventory` strings in the reusable path.
- [x] Define idempotent PR update behavior.

## Phase 3: Turn The Workflow Into A Template

- [x] Extract the current `go-go-app-inventory` workflow shape into a reusable template.
- [x] Decide whether the reusable template should live:
  - as a GitHub reusable workflow
  - as copied source-repo files with docs
  - as a k3s-side template/reference package
- [x] Add standard secret bootstrap docs:
  - object storage credentials
  - `GITOPS_PR_TOKEN`
  - platform package version variables if needed
- [x] Promote the first ticket-side docs/examples/helpers into `../infra-tooling` as the shared home.
- [x] Make `go-go-app-inventory` consume the extracted helper path in dry-run mode using:
  - repo-local `deploy/federation-gitops-targets.json`
  - `infra-tooling` checkout in CI
  - shared `update_federation_gitops_target.py`
- [x] Add a shared PR-capable federation GitOps helper to `infra-tooling`.
- [x] Switch `go-go-app-inventory` to the PR-capable shared helper while preserving workflow-dispatch dry-run mode.
- [x] Write a detailed intern-facing failure-analysis guide for the first real `infra-tooling` consumption failure.
- [x] Publish the extracted `infra-tooling` contents to GitHub `main`.
- [x] Temporarily pin the inventory workflow checkout `ref` to the branch that actually contains the extracted helpers until the shared repo PR merges.
- [x] Remove the temporary inventory workflow checkout pin after `infra-tooling` `main` contains the extracted helpers and prove the workflow against `main`.
- [x] Reintroduce a temporary inventory workflow checkout pin for the next `infra-tooling` feature branch and prove the branch workflow with the PR-capable helper.
- [x] Remove the second temporary inventory workflow checkout pin after `infra-tooling` `main` contains the PR-capable helper and prove the workflow against `main`.
- [x] Exercise the first real shared-helper GitOps PR creation path and capture the exact blocker.
- [x] Replace the temporary read-only `GITOPS_PR_TOKEN` in `go-go-app-inventory` with split tokens:
  - `K3S_REPO_READ_TOKEN` for checkout
  - `GITOPS_PR_TOKEN` for push + PR creation
- [x] Prove the first successful real shared-helper GitOps PR creation path from `go-go-app-inventory`.
- [x] Resolve the first post-creation merge conflict on the resulting K3s PR and keep the newest immutable manifest URL.

## Phase 4: Define K3s-Side Reuse

- [x] Decide what belongs in the K3s repo as reusable reference material:
  - docs
  - example host config layout
  - template `federation.registry.json` entry shape
  - maybe helper scripts
- [x] Avoid putting source-repo CI logic into the K3s repo.
- [ ] Add docs that explain how a new app opts into the shared remote-release pattern.

## Phase 5: Prove Reuse

- [ ] Apply the generalized pattern to a second app.
- [ ] Confirm the second app does not need inventory-specific workflow edits.
- [ ] Update docs with the final “how to onboard a new federated app” recipe.
