# infra-tooling Consumption Failure Analysis and Onboarding Guide

This guide explains the current shared federation release system in enough detail for a new intern to:

1. understand what the system is trying to do,
2. understand why the latest `go-go-app-inventory` GitHub Actions run failed,
3. understand how the involved repositories fit together,
4. know where to look when debugging similar failures in the future,
5. and know what the implementation options are for stabilizing the shared `infra-tooling` consumption model.

This document is deliberately more detailed than a normal ticket note. It is meant to be a reference and onboarding chapter, not just a short bug summary.

## Executive Summary

The failing job is:

- repo: `go-go-golems/go-go-app-inventory`
- workflow: `publish-federation-remote`
- run: `23848590919`
- failing step:
  - `Dry-run GitOps federation target update via infra-tooling`

The exact error was:

```text
python3: can't open file '/home/runner/work/go-go-app-inventory/go-go-app-inventory/.infra-tooling/scripts/federation/update_federation_gitops_target.py': [Errno 2] No such file or directory
```

That means:

- the workflow successfully checked out the `infra-tooling` repository into `.infra-tooling`
- but the checked-out GitHub version of `infra-tooling` did not contain `scripts/federation/update_federation_gitops_target.py`

The most important conclusion is:

- the failure is not caused by the updater script logic itself
- the failure is caused by a mismatch between the workflow’s expectations and the published contents of the `infra-tooling` repository on GitHub

In plain language:

- locally, we extracted reusable scripts/docs into `../infra-tooling`
- but on GitHub, `go-go-golems/infra-tooling` `main` still appears to be missing those extracted files
- so the workflow checked out a real repo that was still too empty to satisfy the path it was asked to run

## The System Being Built

There are four repositories involved in the current federated release path.

### 1. Source application repo

Current example:

- [go-go-app-inventory](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory)

This repo owns:

- the app code
- the remote build
- the object-storage upload workflow
- the repo-local metadata that says which host config entry should be updated

Relevant files:

- [publish-federation-remote.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml)
- [publish_federation_remote.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/scripts/publish_federation_remote.py)
- [federation-gitops-targets.json](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json)

### 2. Shared tooling repo

Current extracted home:

- [infra-tooling](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling)

This repo is supposed to own the reusable mechanics that do not belong in one app repo:

- shared federation target patching
- shared GitOps PR opening
- reusable templates
- reusable cross-repo docs

Relevant extracted files:

- [README.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/README.md)
- [federated-remote-release-model.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/docs/federation/federated-remote-release-model.md)
- [source-repo-to-gitops-pr.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/docs/platform/source-repo-to-gitops-pr.md)
- [patch_federation_registry_target.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/patch_federation_registry_target.py)
- [update_federation_gitops_target.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/update_federation_gitops_target.py)
- [open_gitops_pr.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/gitops/open_gitops_pr.py)

### 3. GitOps repo

Current target:

- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s`

This repo owns desired deployment state:

- [configmap.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml)
- [deployment.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml)

For federation, the most important current target is:

- the embedded `federation.registry.json` block in [configmap.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml)

### 4. Host repo

Current host:

- [wesen-os](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os)

This repo owns the running launcher/host behavior:

- the host runtime registry endpoint
- the remote loading logic
- the deployment package and host image

Relevant host-side files:

- [federationRegistry.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/federationRegistry.ts)
- [loadFederatedAppContracts.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/loadFederatedAppContracts.ts)
- [bootstrapLauncherApp.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/bootstrapLauncherApp.ts)
- [federation_registry_endpoint.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/federation_registry_endpoint.go)

## The Intended Release Flow

The intended generalized flow is:

```text
go-go-app-inventory
  -> build dist-federation/
  -> publish immutable object-storage files
  -> compute manifest URL
  -> use shared infra-tooling helper to patch GitOps target
  -> open or update GitOps PR
  -> merge PR
  -> Argo reconciles
  -> deployed wesen-os loads remote
```

Here is the same flow grouped by control plane:

```text
Source repo plane
  build remote
  upload remote
  decide manifest URL

Shared tooling plane
  patch host registry target
  open or update GitOps PR

GitOps plane
  store desired manifest URL

Cluster plane
  host serves registry
  host loads remote-manifest
```

## What the Current Workflow Actually Does

The relevant workflow section in:

- [publish-federation-remote.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml)

now does this:

```yaml
- uses: actions/checkout@v6
  with:
    repository: go-go-golems/infra-tooling
    path: .infra-tooling

- uses: actions/checkout@v6
  with:
    repository: wesen/2026-03-27--hetzner-k3s
    path: .gitops
    token: ${{ secrets.GITOPS_PR_TOKEN }}

- run: python3 scripts/publish_federation_remote.py ...

- run: python3 .infra-tooling/scripts/federation/update_federation_gitops_target.py ...
```

So the key contract is:

- `go-go-app-inventory` assumes `.infra-tooling/scripts/federation/update_federation_gitops_target.py` exists after checkout

That contract is what broke.

## The Exact Failure

The failed log says:

```text
python3: can't open file '/home/runner/work/go-go-app-inventory/go-go-app-inventory/.infra-tooling/scripts/federation/update_federation_gitops_target.py': [Errno 2] No such file or directory
```

This lets us eliminate several wrong hypotheses immediately.

### What the failure is not

It is not:

- a JSON parsing failure
- a GitOps target metadata bug
- a K3s checkout permissions failure
- an object-storage publish failure
- a Python syntax error in the updater
- a bad `manifest_url` value

### What the failure actually means

It means the file path did not exist in the checked-out repository content.

In pseudocode:

```python
checkout("go-go-golems/infra-tooling", path=".infra-tooling")

expected = ".infra-tooling/scripts/federation/update_federation_gitops_target.py"
if not exists(expected):
    fail("No such file or directory")
```

That is a repository state / distribution problem.

## Why This Happened

The most likely root cause is visible from the local repo state:

- local branch in `infra-tooling`:
  - `task/os-openai-app-server`
- local extracted commits:
  - `3ff2a2c` `Extract shared federation and GitOps tooling`
  - `752f68a` `Ignore Python cache artifacts`
- remote `origin/main`:
  - still at initial commit `7aaad0b`

In other words:

```text
local infra-tooling branch contains extracted scripts
!=
GitHub infra-tooling main consumed by Actions
```

This is the most important operational lesson of this failure:

- “extracted locally” is not the same as “available to CI”

The workflow consumed the GitHub repository, not the local working copy.

## Why the Dry-Run Worked Locally But Failed in CI

Locally, we validated against:

- [update_federation_gitops_target.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/update_federation_gitops_target.py)

Those validations passed because the local filesystem really contained the extracted files.

Examples we already ran:

```bash
python3 ../infra-tooling/scripts/federation/update_federation_gitops_target.py \
  --config workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json \
  --target wesen-os-inventory-prod \
  --manifest-url https://.../mf-manifest.json \
  --gitops-repo-dir /home/manuel/code/wesen/2026-03-27--hetzner-k3s
```

CI, however, used:

```bash
python3 .infra-tooling/scripts/federation/update_federation_gitops_target.py ...
```

where `.infra-tooling` was created by a GitHub checkout of `go-go-golems/infra-tooling`.

If `origin/main` does not yet contain the extraction, CI sees an empty or nearly empty repo and fails.

This is the core architecture lesson:

- local proof validates code
- CI proof validates distribution

Both are necessary, and this run failed at the distribution layer.

## Diagram: Where the Missing File Lives

```text
Local workstation
  /home/manuel/workspaces/.../infra-tooling/
    scripts/federation/update_federation_gitops_target.py   <-- exists

GitHub Actions runner
  /home/runner/work/go-go-app-inventory/go-go-app-inventory/.infra-tooling/
    scripts/federation/update_federation_gitops_target.py   <-- missing
```

This is not a path typo between local and CI. It is a repository content mismatch.

## Design Options for Fixing This Class of Failure

There are several valid ways to resolve this.

### Option A: Push `infra-tooling` extraction to `main`

This is the simplest and most stable operational model.

Process:

1. open PR from `infra-tooling` branch
2. merge extraction into `go-go-golems/infra-tooling` `main`
3. let source repos keep checking out default branch

Pros:

- simplest workflow YAML
- easiest for interns to reason about
- no branch pinning in workflow
- shared helper is truly published

Cons:

- requires that `infra-tooling` itself be treated as a real maintained repo

### Option B: Pin workflow to a non-default `ref`

For example:

```yaml
- uses: actions/checkout@v6
  with:
    repository: go-go-golems/infra-tooling
    ref: task/os-openai-app-server
    path: .infra-tooling
```

Pros:

- unblocks quickly before `main` is merged

Cons:

- bad long-term stability
- future readers may not know why a task branch is pinned
- branch deletion breaks CI

This is acceptable only as a short bridge.

### Option C: Vendor/copy the helper into each source repo

Pros:

- no cross-repo checkout dependency
- no separate shared repo availability issue

Cons:

- defeats the purpose of extracting shared mechanics
- drift returns quickly
- every bugfix must be copied repeatedly

This is the least attractive long-term option.

### Option D: Package shared tooling as a release artifact

Examples:

- Python package
- tarball download
- reusable GitHub Action
- reusable workflow

Pros:

- strongest long-term distribution boundary

Cons:

- highest implementation cost right now
- overkill before the second or third consumer is stable

For the current project stage, this is probably premature.

## Recommended Resolution

For this system right now, the recommended path is:

1. push the extracted `infra-tooling` contents to GitHub
2. merge them into `go-go-golems/infra-tooling` `main`
3. rerun the `go-go-app-inventory` workflow
4. only use branch pinning if a temporary bridge is absolutely needed

This keeps the workflow simple and aligned with what we want the long-term model to be:

- source repos consume stable shared tooling from the default branch of a real shared repo

## What a New Intern Should Check First When This Breaks

When a source repo fails in the “consume shared tooling” phase, the first debugging checklist should be:

1. Is the external repo public or private?
   - if private, does checkout have a token?
2. Does the checked-out repo actually contain the expected file path?
3. Is the workflow checking out the correct branch/ref?
4. Did the local extraction ever get pushed/merged?
5. Is the workflow calling a path that still matches the repo layout?

In shell terms:

```bash
gh repo view go-go-golems/infra-tooling
gh run view <run-id> --log-failed
git -C ../infra-tooling log --oneline --decorate
git -C ../infra-tooling branch -vv
```

If the local branch is ahead of `origin/main`, that is already a major clue.

## Operational Debug Recipe

### Step 1: confirm the failing step

Use:

```bash
gh run view 23848590919 --repo go-go-golems/go-go-app-inventory --log-failed
```

### Step 2: confirm local shared repo state

Use:

```bash
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling log --oneline --decorate -n 6
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling branch -vv
```

### Step 3: compare local branch to consumed branch

If output shows something like:

```text
task/os-openai-app-server 752f68a
origin/main               7aaad0b
```

then CI and local are not consuming the same repository state.

### Step 4: choose a stabilization path

Preferred:

```text
push infra-tooling branch -> open PR -> merge to main -> rerun source repo workflow
```

Bridge:

```text
pin workflow checkout ref to the branch that actually contains the helper
```

## Pseudocode for the Correct Stable Model

```python
def source_repo_publish_remote():
    build_remote()
    manifest_url = upload_remote_and_get_manifest_url()

    shared = checkout_repo("go-go-golems/infra-tooling", ref="main")
    gitops = checkout_repo("wesen/2026-03-27--hetzner-k3s", token=GITOPS_PR_TOKEN)

    run(
        f"{shared}/scripts/federation/update_federation_gitops_target.py",
        config="deploy/federation-gitops-targets.json",
        target="wesen-os-inventory-prod",
        manifest_url=manifest_url,
        gitops_repo_dir=gitops,
    )

    run(
        f"{shared}/scripts/gitops/open_gitops_pr.py",
        ...
    )
```

The key invariant is:

```python
assert shared_repo_contains_required_helper()
```

Without that invariant, the rest of the flow is irrelevant.

## API and Tooling References

### GitHub Actions workflow under discussion

- [publish-federation-remote.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml)

### Shared updater expected by the workflow

- [update_federation_gitops_target.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/update_federation_gitops_target.py)

### Shared patch helper called by the updater

- [patch_federation_registry_target.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/patch_federation_registry_target.py)

### Repo-local target metadata consumed by the updater

- [federation-gitops-targets.json](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json)

### Real GitOps target being patched

- [configmap.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml)

### Ticket docs that define the broader reusable model

- [01-generalized-remote-release-template-analysis.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/analysis/01-generalized-remote-release-template-analysis.md)
- [02-generalized-federated-remote-release-guide.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/design/02-generalized-federated-remote-release-guide.md)
- [03-standard-secret-bootstrap-for-federated-remotes.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/design/03-standard-secret-bootstrap-for-federated-remotes.md)

## Recommended Next Tasks

1. Push the extracted `infra-tooling` contents to GitHub and open a PR there.
2. Merge `infra-tooling` extraction to `main`.
3. Rerun `go-go-app-inventory` workflow.
4. If immediate unblock is needed before merge, pin the `infra-tooling` checkout `ref` temporarily.
5. Once the shared repo is stable, move from dry-run GitOps diff to actual GitOps PR creation.

## Bottom Line

The failure teaches the right lesson for this ticket:

- building reusable infrastructure is not just about extracting code locally
- it is also about publishing that shared layer in a way CI can actually consume

The current failure is the first real proof that `FEDERATION-RELEASE-001` has crossed from design work into distribution and lifecycle management.
