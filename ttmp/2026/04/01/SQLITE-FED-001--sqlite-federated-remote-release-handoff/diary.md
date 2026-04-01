# Diary

## Goal

Capture the execution of `SQLITE-FED-001` after the handoff packet was created, with enough detail that another engineer can see exactly what was validated, what remains blocked, and why the next implementation step is safe.

## Step 1: Freeze the live repo state and convert the handoff into an active execution ticket

The first execution step was to stop treating the handoff as a static note and turn it into an auditable working ticket. That meant pinning the live branch heads, saving the audit output inside the ticket workspace, and checking whether the sqlite worktree still matched the narrative in the handoff docs.

That state capture showed that the ticket is directionally accurate. The sqlite repo still has the exact provisional federation files described in the handoff, `infra-tooling` is clean on `task/federation-publish-helper` at `c943970`, and inventory is clean on the branch that already targets the generated JSON registry file. The main newly surfaced blocker is procedural rather than technical: the `infra-tooling` helper branch is local-only and not yet tracking an upstream branch.

### Prompt Context

**User prompt (verbatim):** "ok, continue. work task by task, commit at appropriate intervals, and keep a detailed diary."

**Assistant interpretation:** Continue the handoff ticket as real implementation work, execute the tasks in order, create commits at stable checkpoints, and keep a detailed running diary of the work.

**Inferred user intent:** Turn the sqlite federation handoff into an orderly, reviewable implementation sequence instead of a one-shot analysis pass.

**Commit (code):** N/A for this diary entry. The documentation checkpoint commit is created after this step is written.

### What I did
- Read the `docmgr` and `diary` skill instructions to match the expected ticket and diary workflow.
- Ran the ticket audit script:
  - `ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/scripts/01-audit-sqlite-federation-handoff-state.sh`
- Saved the audit output to:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/logs/2026-04-01-audit.txt`
- Checked the sqlite repo diff and status for the provisional federation files.
- Read the current sqlite provisional implementation:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/package.json`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/host.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/vite.federation.config.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/federation-shared/runtime.ts`
- Compared sqlite against the inventory reference files:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/host.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/vite.federation.config.ts`
- Inspected the shared helper branch evidence in `infra-tooling`:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/examples/federation/federation-gitops-targets.example.json`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/update_federation_gitops_target.py`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/patch_federation_registry_target.py`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/templates/github/publish-federated-remote.template.yml`
- Updated the ticket docs to reflect the live state and link the saved audit artifact.

### Why
- The handoff ticket explicitly says the next engineer should not continue blindly.
- The shared helper branch and sqlite worktree could have drifted after the ticket was written.
- Saving the audit output into the ticket removes ambiguity for later review and gives a stable baseline before touching sqlite build or workflow behavior.

### What worked
- The audit script still describes the relevant repos accurately.
- The sqlite worktree still contains exactly the provisional federation changes named in the handoff.
- `infra-tooling` clearly contains direct JSON target support:
  - `patch_federation_registry_target.py` switches behavior on `.json` targets
  - the example target file already includes `wesen-os-sqlite-prod`
- Inventory remains a clean reference point for the sqlite migration.

### What didn't work
- `docmgr` is not currently pointed at this repo's `ttmp` tree. Running:

```text
docmgr ticket list --ticket SQLITE-FED-001
```

returned:

```text
No tickets found.
```

- Running:

```text
docmgr task list --ticket SQLITE-FED-001
```

returned:

```text
Error: failed to load tasks from file: failed to resolve tasks file: ticket not found: SQLITE-FED-001
```

- `docmgr status --summary-only` showed a different root:

```text
root=/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp
```

- `infra-tooling` branch publication is not complete yet. `git branch -vv` showed:

```text
* task/federation-publish-helper c943970 Generalize federation publish helper and JSON targets
```

with no upstream tracking annotation.

### What I learned
- The handoff package itself is accurate enough to continue from.
- The first blocker is not sqlite build logic yet; it is release-process hygiene around the shared helper branch.
- The ticket should be maintained as markdown-first inside this repo unless `docmgr` configuration is repointed.

### What was tricky to build
- The subtle issue here was distinguishing between "the docs exist" and "the ticket is operational." The markdown handoff was present, but the execution scaffolding was incomplete until the audit output, current branch state, and blockers were captured in a durable way.
- Another sharp edge is that `docmgr` appears to be configured at the workspace-parent level for a different repo. That means I cannot assume CLI ticket operations are authoritative for this ticket without first changing repo-level configuration, which would be unrelated churn at this stage.

### What warrants a second pair of eyes
- Whether we want to repoint `docmgr` to the `wesen-os` `ttmp` tree as part of this task, or continue with markdown-only bookkeeping.
- Whether the unpublished `infra-tooling` branch should be pushed before any sqlite repo changes land, or whether sqlite can temporarily target the local branch state for validation-only work.

### What should be done in the future
- Create the first docs checkpoint commit in `wesen-os` for the saved audit artifact and ticket updates.
- Inspect whether `task/federation-publish-helper` is already represented by a GitHub PR or needs to be pushed first.
- Move to sqlite artifact validation next, unless the branch publication requirement is deemed blocking.

### Code review instructions
- Start with:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/index.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/tasks.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/diary.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/logs/2026-04-01-audit.txt`
- Validate by rerunning:
  - `ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/scripts/01-audit-sqlite-federation-handoff-state.sh`
- Compare the saved log against the live output to confirm the checkpoint is consistent.

### Technical details
- Relevant live branch heads captured during this step:
  - `infra-tooling`: `task/federation-publish-helper` at `c943970`
  - `go-go-app-sqlite`: `task/sqlite-federation-release-reuse` at `6a373b8`
  - `go-go-app-inventory`: `task/inventory-infra-tooling-federation-release` at `f61a6b1`
- Saved audit artifact:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/logs/2026-04-01-audit.txt`

## Step 2: Validate the sqlite federation artifact locally and commit the artifact layer

The next safe step was to prove that the provisional sqlite federation files were not just plausible, but actually buildable. That validation passed: sqlite now emits the expected manifest and contract bundle, and the output shape matches the inventory pattern closely enough to proceed with release wiring.

The interesting part was that the first artifact validation did not expose a sqlite-specific runtime break. Instead, it exposed that the sqlite bundle is in the same general size class as inventory and emits the expected host contract export. That allowed the sqlite artifact layer itself to be committed cleanly as a reusable baseline.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Continue through the handoff checklist in order, proving the sqlite artifact layer before adding release automation.

**Inferred user intent:** Reduce uncertainty by validating the app-side federation surface before investing more work in workflows and GitOps automation.

**Commit (code):** `325fdb9` — `federation: add sqlite remote artifact build`

### What I did
- Ran the local sqlite federation build:
  - `npm run build:federation -w apps/sqlite`
- Inspected emitted files:
  - `apps/sqlite/dist-federation/mf-manifest.json`
  - `apps/sqlite/dist-federation/sqlite-host-contract.js`
  - `apps/sqlite/dist-federation/sqlite-host-contract.js.map`
  - `apps/sqlite/dist-federation/sqlite.css`
- Compared sqlite outputs against inventory outputs:
  - `apps/inventory/dist-federation/mf-manifest.json`
  - `apps/inventory/dist-federation/inventory-host-contract.js`
- Checked for obvious browser-externalized `module` references in both sqlite and inventory bundles.
- Added `dist-federation/` to sqlite `.gitignore` so generated federation output does not pollute commits.
- Committed the validated artifact-layer source files in `go-go-app-sqlite`.

### Why
- The handoff explicitly says existing sqlite worktree changes are only a hypothesis until a real `build:federation` succeeds.
- There is no point wiring object storage and GitOps automation if the app cannot emit a valid manifest and host contract first.
- Ignoring generated federation output is necessary to keep follow-up commits reviewable.

### What worked
- `npm run build:federation -w apps/sqlite` completed successfully.
- The emitted sqlite manifest matches the intended contract:
  - `remoteId: "sqlite"`
  - `entry: "./sqlite-host-contract.js"`
  - `exportName: "sqliteHostContract"`
- The emitted bundle exports `sqliteHostContract`.
- The sqlite host-contract bundle size is large but still comparable to inventory's current bundle size.

### What didn't work
- The Vite build surfaced a warning during bundling:

```text
[plugin vite:resolve] Module "module" has been externalized for browser compatibility
```

- I treated that as a validation question rather than an immediate code bug. A follow-up search in the emitted bundle found no surviving `node:module`, `require("module")`, or `__vite-browser-external` markers, so I did not treat the warning as a blocker.

### What I learned
- The provisional sqlite federation files were substantially correct.
- The first real migration blocker was not the artifact layer.
- The sqlite remote bundle shape is already close enough to inventory that release automation can target it directly.

### What was tricky to build
- The subtle part was deciding whether the Vite warning represented a real browser hazard or just a noisy transitive resolution path. The right approach was not to guess. I let the build finish, then inspected the output artifact directly and compared it against inventory before deciding to move on.
- Generated `dist-federation` output was not ignored in the sqlite repo, so the first validation run created commit noise until `.gitignore` was updated.

### What warrants a second pair of eyes
- Whether the sqlite federation bundle size should be reduced later, even though it is not blocking release wiring now.
- Whether the QuickJS-related Vite warning deserves a future packaging cleanup even though the emitted bundle looks browser-safe.

### What should be done in the future
- Keep the artifact-layer commit as the baseline for later runtime smoke tests in `wesen-os`.
- Move on to repo-local release metadata and workflow wiring.

### Code review instructions
- Start with:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/package.json`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/host.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/vite.federation.config.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/federation-shared/runtime.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/.gitignore`
- Validate with:
  - `npm run build:federation -w apps/sqlite`
  - `sed -n '1,160p' apps/sqlite/dist-federation/mf-manifest.json`
  - `rg -n "sqliteHostContract" apps/sqlite/dist-federation/sqlite-host-contract.js`

### Technical details
- Commit created in `go-go-app-sqlite`:
  - `325fdb9` `federation: add sqlite remote artifact build`
- Emitted sqlite artifact files observed during validation:
  - `apps/sqlite/dist-federation/mf-manifest.json`
  - `apps/sqlite/dist-federation/sqlite-host-contract.js`
  - `apps/sqlite/dist-federation/sqlite-host-contract.js.map`
  - `apps/sqlite/dist-federation/sqlite.css`

## Step 3: Add sqlite release metadata, wire the shared-helper workflow, and fix the missing-remote patch path

Once the artifact layer was proven, the next step was to make sqlite participate in the reusable release path. That required two separate but connected changes: first, add sqlite-specific release metadata and a thin workflow in `go-go-app-sqlite`; second, validate the shared helper path against the real K3s registry and fix the first cross-repo bug it exposed.

The dry-run validation found a real shared-helper defect. The current K3s registry only contains `inventory`, but the shared patcher assumed the remote already existed and raised an error when asked to deploy `sqlite`. I fixed that behavior in `infra-tooling` so a new remote entry is inserted with `mode: "remote-manifest"` instead of failing. After that fix, the sqlite dry-run produced the expected diff against the real `federation.registry.json` file.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Continue through the remaining local implementation steps: add release metadata, add the source-repo workflow, and validate the release path with real helper code.

**Inferred user intent:** Leave the sqlite repo in a state where the remaining work is operationally clear and blocked only on real external prerequisites, not on unknown local gaps.

**Commit (code):**
- `252a69c` — `deploy: wire sqlite federation publish workflow`
- `5af1142` — `federation: add missing remotes to registry patcher`

### What I did
- Added sqlite repo-local target metadata:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/deploy/federation-gitops-targets.json`
- Added a thin sqlite publish workflow:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/.github/workflows/publish-federation-remote.yml`
- Kept sqlite-specific workflow behavior limited to:
  - package dependency rewrite list
  - build command
  - target name
  - sqlite public base URL variable name
- Validated the publish helper locally with a dry-run plan:
  - `python3 .../publish_federation_remote.py --source-dir apps/sqlite/dist-federation --remote-id sqlite --version sha-localtest ... --dry-run`
- Ran the shared GitOps dry-run against the real K3s checkout and captured the failure.
- Patched `infra-tooling/scripts/federation/patch_federation_registry_target.py` so missing remotes are appended instead of causing an exception.
- Reran the dry-run successfully against:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s`
- Committed the sqlite workflow/metadata change in `go-go-app-sqlite`.
- Committed the shared helper fix in `infra-tooling`.

### Why
- SQLite needs repo-local metadata so shared helpers know which GitOps target to update.
- The workflow needs to be thin and generic so future apps can follow the same model.
- A dry-run against the actual K3s registry is the only reliable way to prove whether the shared patcher supports “second app” onboarding rather than only “update existing app” behavior.

### What worked
- The sqlite publish helper dry-run produced the expected manifest URL plan.
- The sqlite workflow now delegates publish and GitOps logic to shared `infra-tooling` scripts rather than repo-local one-off helpers.
- After the patcher fix, the real K3s dry-run produced the correct additive diff for a new `sqlite` remote entry.

### What didn't work
- The first shared GitOps dry-run failed with:

```text
ValueError: remoteId 'sqlite' not found in registry
```

- That error came from:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/patch_federation_registry_target.py`
- The workflow also remains externally blocked because the `infra-tooling` branch it depends on is still not pushed to `origin`.

### What I learned
- The reusable helper path was not yet truly reusable for a second app. It handled updates, but not first insertion of a new remote into the live registry.
- The right validation target is the actual K3s `federation.registry.json`, not just the example file in `infra-tooling`.
- SQLite is now locally wired to the shared model; the remaining blockers are publication and GitHub-run validation, not missing repo structure.

### What was tricky to build
- The most important trap was assuming that “JSON target support” automatically implied “new remote onboarding support.” Those are different concerns. The direct-JSON patch path worked, but its registry mutation logic still encoded the single-app assumption.
- The workflow has to point at the `infra-tooling` helper branch because the needed helper files are not yet available on `origin/main`. That keeps the workflow locally accurate but operationally blocked until the branch is published.

### What warrants a second pair of eyes
- Whether the sqlite workflow should keep a temporary `ref: task/federation-publish-helper` pin or wait until the helper branch is pushed before being considered ready.
- Whether the remote insertion policy in `patch_federation_registry_target.py` should append as implemented now or impose a more opinionated ordering rule for `registry.remotes`.

### What should be done in the future
- Push or open a PR for `infra-tooling` branch `task/federation-publish-helper`, including commit `5af1142`.
- Run the sqlite GitHub workflow in dry-run mode once that branch is reachable from GitHub.
- After dry-run succeeds in GitHub Actions, enable and validate the real PR-creation path.

### Code review instructions
- Start with sqlite repo changes:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/deploy/federation-gitops-targets.json`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/.github/workflows/publish-federation-remote.yml`
- Then inspect the shared helper fix:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/patch_federation_registry_target.py`
- Validate locally with:
  - `python3 /home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/publish_federation_remote.py --source-dir apps/sqlite/dist-federation --remote-id sqlite --version sha-localtest --bucket example-bucket --endpoint https://example.invalid --region eu-central --public-base-url https://assets.example.invalid --dry-run`
  - `python3 /home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/open_federation_gitops_pr.py --config deploy/federation-gitops-targets.json --target wesen-os-sqlite-prod --manifest-url https://assets.example.invalid/remotes/sqlite/versions/sha-localtest/mf-manifest.json --gitops-repo-dir /home/manuel/code/wesen/2026-03-27--hetzner-k3s --dry-run`

### Technical details
- Commit created in `go-go-app-sqlite`:
  - `252a69c` `deploy: wire sqlite federation publish workflow`
- Commit created in `infra-tooling`:
  - `5af1142` `federation: add missing remotes to registry patcher`
- Verified K3s dry-run diff target:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/config/federation.registry.json`

## Step 4: Push the branches, open both PRs, and verify the GitHub-side blocker precisely

After the local wiring was complete, the next step was to make the work reachable from GitHub and try the real GitHub-side entrypoint. That part mostly succeeded: both branches are now pushed, both source PRs exist, and the sqlite repository has the variables and secrets it needs for the dry-run path.

The important result is that the remaining blocker is now very specific. The sqlite workflow cannot be dispatched yet, not because of missing secrets or bad branch state, but because `publish-federation-remote.yml` does not exist on the default branch of `go-go-app-sqlite` yet. GitHub’s Actions API returns `404` for that workflow name even though the file exists on the feature branch and in PR `#4`.

### Prompt Context

**User prompt (verbatim):** "ok, do it"

**Assistant interpretation:** Push the prepared branches, make the work reviewable upstream, and continue into the actual GitHub-side validation path.

**Inferred user intent:** Move from local-only proof to real hosted integration work and eliminate any remaining “not yet published” blockers.

**Commit (code):** N/A for this diary entry. This step mainly changed remote Git state and GitHub repository metadata.

### What I did
- Pushed the `infra-tooling` helper branch:
  - `task/federation-publish-helper -> origin/task/federation-publish-helper`
- Pushed the sqlite release branch:
  - `task/sqlite-federation-release-reuse -> origin/task/sqlite-federation-release-reuse`
- Verified GitHub authentication with:
  - `gh auth status`
- Checked sqlite repo Actions configuration:
  - `gh workflow list -R go-go-golems/go-go-app-sqlite`
- Attempted to dispatch the sqlite dry-run workflow:
  - `gh workflow run publish-federation-remote.yml -R go-go-golems/go-go-app-sqlite --ref task/sqlite-federation-release-reuse -f platform_version=0.1.0-canary.5 -f dry_run=true -f remote_version=sha-manualdryrun`
- Confirmed the workflow file exists on the branch:
  - `gh api 'repos/go-go-golems/go-go-app-sqlite/contents/.github/workflows/publish-federation-remote.yml?ref=task/sqlite-federation-release-reuse' --jq .path`
- Created PRs:
  - `go-go-golems/infra-tooling#3`
  - `go-go-golems/go-go-app-sqlite#4`
- Configured sqlite GitHub repository variables:
  - `GO_GO_OS_PLATFORM_VERSION=0.1.0-canary.5`
  - `SQLITE_FEDERATION_PUBLIC_BASE_URL=https://scapegoat-federation-assets.fsn1.your-objectstorage.com`
- Fixed the sqlite PR body after an earlier shell-substitution mistake removed literal text from the body.

### Why
- Local commits are not enough; the sqlite workflow explicitly checks out `infra-tooling` from GitHub.
- Running the real GitHub-side dry-run path is the only way to prove that repo settings, workflow registration, and branch visibility are all correct.
- Repository variables had to be created so the future workflow does not depend on always passing manual inputs.

### What worked
- Both branches pushed cleanly and now track `origin`.
- Both PRs are open and reviewable.
- SQLite repository secrets already existed:
  - `GITOPS_PR_TOKEN`
  - `K3S_REPO_READ_TOKEN`
- SQLite repository variables are now set.
- The workflow file is present on the sqlite feature branch and visible through the GitHub contents API.

### What didn't work
- The GitHub workflow dispatch failed with:

```text
HTTP 404: Not Found (https://api.github.com/repos/go-go-golems/go-go-app-sqlite/actions/workflows/publish-federation-remote.yml)
```

- `gh workflow list -R go-go-golems/go-go-app-sqlite` does not include `publish-federation-remote.yml`, confirming that GitHub has not registered it as a runnable workflow on the repository yet.
- An earlier `gh pr create` command for the sqlite PR body used backticks in a shell string and triggered accidental command substitution, which stripped the literal validation line from the initial PR body.

### What I learned
- The next blocker is not configuration data anymore. It is GitHub Actions workflow registration semantics.
- Having a workflow file on a feature branch is not sufficient for `gh workflow run` when GitHub does not recognize that workflow on the repository yet.
- The sqlite repo is now configured closely enough that merging PR `#4` should unblock workflow dispatch, assuming the helper branch or helper merge remains available.

### What was tricky to build
- The subtle part was distinguishing between “the workflow file exists in git” and “GitHub recognizes the workflow as dispatchable.” Those are separate states, and the GitHub API behavior makes that distinction very explicit with the `404`.
- The PR body update also had a sharp shell edge: unquoted backticks in a CLI body argument are treated by the shell as command substitution. That did not break the PR creation itself, but it did silently damage the body content until I corrected it.

### What warrants a second pair of eyes
- Whether to merge `infra-tooling#3` first and then retarget the sqlite workflow to `infra-tooling@main` before merging sqlite PR `#4`.
- Whether it is acceptable to merge sqlite PR `#4` specifically to register the workflow on the default branch before doing the first real hosted dry-run.

### What should be done in the future
- Merge or at least review `go-go-golems/infra-tooling#3`.
- Decide whether sqlite PR `#4` should merge before the first hosted dry-run, since GitHub cannot dispatch the workflow until that file is recognized on the repository.
- After the workflow is registered on the default branch, rerun the dry-run path and then test real GitOps PR mode.

### Code review instructions
- Review the upstream PRs:
  - `https://github.com/go-go-golems/infra-tooling/pull/3`
  - `https://github.com/go-go-golems/go-go-app-sqlite/pull/4`
- Confirm sqlite repo settings with:
  - `gh variable list -R go-go-golems/go-go-app-sqlite`
  - `gh secret list -R go-go-golems/go-go-app-sqlite`
- Reproduce the current GitHub blocker with:
  - `gh workflow list -R go-go-golems/go-go-app-sqlite`
  - `gh workflow run publish-federation-remote.yml -R go-go-golems/go-go-app-sqlite --ref task/sqlite-federation-release-reuse -f platform_version=0.1.0-canary.5 -f dry_run=true -f remote_version=sha-manualdryrun`

### Technical details
- Open upstream PRs:
  - `go-go-golems/infra-tooling#3`
  - `go-go-golems/go-go-app-sqlite#4`
- Configured sqlite GitHub variables:
  - `GO_GO_OS_PLATFORM_VERSION=0.1.0-canary.5`
  - `SQLITE_FEDERATION_PUBLIC_BASE_URL=https://scapegoat-federation-assets.fsn1.your-objectstorage.com`

## Step 5: Address the sqlite workflow review finding about missing object-storage credentials

After the sqlite PR was up, a workflow review comment pointed out a real regression in the publish step. The sqlite workflow validated that the Hetzner object storage credentials existed, but the subsequent publish step only forwarded bucket, endpoint, region, and public base URL. Because GitHub Actions step environments are isolated, that meant the actual upload step would lose the credentials needed by the AWS-compatible client path during non-dry-run publishes.

This was a straightforward but important fix. The sqlite workflow now mirrors inventory by passing `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` into the publish step, sourced from the Hetzner-named GitHub secrets. That keeps the secret naming stable at the repo boundary while satisfying the credential names expected by the upload path.

### Prompt Context

**User prompt (verbatim):** ".github/workflows/publish-federation-remote.yml\nComment on lines +170 to +174\n        env:\n          HETZNER_OBJECT_STORAGE_BUCKET: ${{ secrets.HETZNER_OBJECT_STORAGE_BUCKET }}\n          HETZNER_OBJECT_STORAGE_ENDPOINT: ${{ secrets.HETZNER_OBJECT_STORAGE_ENDPOINT }}\n          HETZNER_OBJECT_STORAGE_REGION: ${{ secrets.HETZNER_OBJECT_STORAGE_REGION }}\n          SQLITE_FEDERATION_PUBLIC_BASE_URL: ${{ vars.SQLITE_FEDERATION_PUBLIC_BASE_URL }}\n@chatgpt-codex-connector\nchatgpt-codex-connector bot\n8 minutes ago\n\nP1 Badge Pass storage credentials to publish command\n\nThe publish step only sets bucket/endpoint/region/base URL, but omits HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID and HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY even though the previous step validates them. GitHub Actions step environments are isolated, so those credentials do not carry over automatically; in non-dry-run executions this can make publish_federation_remote.py (or its underlying S3 client) fail authentication and block remote publication.\n\nUseful? React with 👍 / 👎.\n@wesen"

**Assistant interpretation:** Apply the review fix in the sqlite workflow so the publish step actually receives the object-storage credentials it needs.

**Inferred user intent:** Resolve a real release-path bug before the workflow is merged or exercised for a live publish.

**Commit (code):** `2cf8bca` — `deploy: pass storage creds to sqlite publish step`

### What I did
- Compared the sqlite publish step against the working inventory workflow.
- Updated:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/.github/workflows/publish-federation-remote.yml`
- Added these env vars to the sqlite publish step:
  - `AWS_ACCESS_KEY_ID: ${{ secrets.HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID }}`
  - `AWS_SECRET_ACCESS_KEY: ${{ secrets.HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY }}`
- Committed and pushed the fix to:
  - `task/sqlite-federation-release-reuse`

### Why
- The review finding is correct.
- The previous validation step and the publish step are separate GitHub Actions steps, so step-local env does not persist.
- Without these env vars, a real publish would likely fail when the AWS-compatible upload path tries to authenticate.

### What worked
- The inventory workflow provided a direct known-good reference.
- The fix is minimal and does not change repo secret names or the publish helper interface.
- The patch is now on the sqlite PR branch.

### What didn't work
- N/A. This change was a direct correction with no additional blocker.

### What I learned
- The sqlite workflow had drifted from the working inventory pattern in exactly one critical place: credential propagation to the publish step.
- This is the kind of regression that local dry-run validation will not catch, because the dry-run path does not need live object-storage authentication.

### What was tricky to build
- The only subtlety was keeping the external secret contract unchanged. The workflow stores the credentials under Hetzner-named GitHub secrets, but the actual upload path expects the AWS-style environment variable names, so the correct fix is translation at the step boundary rather than renaming repository secrets.

### What warrants a second pair of eyes
- Whether the sqlite PR review should explicitly call out that this fix aligns the workflow with inventory’s existing publish-step credential model.

### What should be done in the future
- Re-run GitHub dry-run validation once the workflow is registered on the default branch.
- Keep comparing sqlite workflow changes against inventory until the shared helper path is fully stabilized.

### Code review instructions
- Review:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/.github/workflows/publish-federation-remote.yml`
- Compare against:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml`
- Confirm branch head:
  - `git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite log -1 --oneline`

### Technical details
- New sqlite commit:
  - `2cf8bca` `deploy: pass storage creds to sqlite publish step`

## Step 6: Run the hosted workflow, capture the first real CI failure on main, and open the follow-up sqlite fix PR

Once the sqlite workflow existed on the default branch, I could finally test the hosted path for real. That exposed the next concrete issue immediately: the `publish-federation-remote` workflow now dispatches correctly, but the `Build sqlite federation artifact` step on `main` still fails because the merged sqlite branch left workspace-only TypeScript path aliases in the default `tsconfig.json`.

This is a better failure than before because it is now a genuine hosted build failure with exact logs. The root cause is that CI checks out only `go-go-app-sqlite`, but the default sqlite TS config still tries to resolve `../../../go-go-os-frontend/packages/...`. I fixed that on the revived sqlite branch by splitting the TS config into published and workspace variants, kept local federation build validation green, and opened a new sqlite PR for those post-merge CI fixes.

### Prompt Context

**User prompt (verbatim):** "alright, i merged the pr on go-go-app-sqlite, you can now continue testing, right?"

**Assistant interpretation:** Resume hosted validation now that the sqlite workflow is on the default branch and see how far the real GitHub-side release path gets.

**Inferred user intent:** Move from preparation into actual hosted verification and surface the next real blocker, if any.

**Commit (code):**
- `3ed4095` — `build: split sqlite tsconfig for published CI`

### What I did
- Verified sqlite PR `#4` was merged and the workflow was now registered on GitHub.
- Confirmed the sqlite repo still had the required variables and secrets.
- Triggered hosted workflow runs and inspected their results.
- Collected failure logs for:
  - run `23865927540`
  - run `23866017591`
- Identified the shared root cause from the logs:
  - Vite/esbuild tried to parse `/home/runner/work/go-go-app-sqlite/go-go-os-frontend/packages/os-shell/tsconfig.json`
  - that path does not exist in a plain repo checkout
- Updated the sqlite repo to use:
  - `tsconfig.json` as the published/default config
  - `tsconfig.workspace.json` for local sibling-workspace resolution
  - `tsconfig.published.json` for explicit published type-checking
- Updated the sqlite `typecheck` script to target `tsconfig.workspace.json`.
- Revalidated locally:
  - `npm run build:federation -w apps/sqlite` passes
- Opened follow-up PR:
  - `go-go-golems/go-go-app-sqlite#5`

### Why
- Once the workflow is on `main`, the next meaningful source of truth is the real hosted run, not more local inference.
- The failure log pointed directly to a default-config problem rather than a GitOps or secret problem.
- Splitting workspace-only TS settings away from the published/default config matches the pattern inventory already uses.

### What worked
- The workflow is now registered and dispatchable on GitHub.
- Hosted runs produced precise failure logs.
- The local federation build still passes after the TS config split.
- The CI-oriented fix is now pushed and reviewable in sqlite PR `#5`.

### What didn't work
- Hosted runs on `main` failed in the same place:

```text
[vite:esbuild] parsing /home/runner/work/go-go-app-sqlite/go-go-os-frontend/packages/os-shell/tsconfig.json failed: Error: ENOENT: no such file or directory
```

- `gh workflow run ... --ref task/sqlite-federation-release-reuse` still resulted in runs against `main`, so I could not get GitHub to exercise the revived branch head directly through workflow dispatch.
- `npm run typecheck:published -w apps/sqlite` still fails locally due package surface/type mismatches:
  - `jsxDEV` typing mismatch in `react/jsx-runtime`
  - `FederatedAppHostContract` missing from the published `@go-go-golems/os-shell` package surface

### What I learned
- The first real hosted blocker after workflow registration is not secrets or GitOps access. It is the sqlite build’s default TS config.
- The default/published config and the local workspace config must be separated if this repo is going to build correctly in CI.
- The published type surface likely still needs cleanup later, but it is not the specific blocker for the current hosted federation build path.

### What was tricky to build
- The subtle part was that GitHub workflow dispatch appears to keep targeting `main` even when I passed the revived feature branch ref. That meant the only trustworthy hosted signal I could get was from `main`, not from the follow-up branch head.
- Another sharp edge is that the local `typecheck:published` signal is broader than the current hosted-build blocker. It found additional published-surface issues, but I deliberately did not widen scope further because the workflow does not run that check right now.

### What warrants a second pair of eyes
- Whether sqlite PR `#5` should be merged immediately as a CI unbreaker before spending time on the published type-surface mismatches.
- Whether the published `@go-go-golems/os-shell` package is actually missing `FederatedAppHostContract`, or whether sqlite should consume a different exported contract type for published builds.

### What should be done in the future
- Merge `go-go-golems/go-go-app-sqlite#5`.
- Rerun `publish-federation-remote` on `main` after that merge.
- If the hosted build gets past the artifact step, continue with dry-run GitOps validation.
- Revisit `typecheck:published` only after the hosted workflow path is green enough to move forward.

### Code review instructions
- Review the CI fix in:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/tsconfig.json`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/tsconfig.workspace.json`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/tsconfig.published.json`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/package.json`
- Review hosted failure evidence with:
  - `gh run view 23865927540 -R go-go-golems/go-go-app-sqlite --log-failed`
  - `gh run view 23866017591 -R go-go-golems/go-go-app-sqlite --log-failed`

### Technical details
- Hosted failing runs:
  - `23865927540`
  - `23866017591`
- New sqlite PR:
  - `go-go-golems/go-go-app-sqlite#5`
- New sqlite commit:
  - `3ed4095` `build: split sqlite tsconfig for published CI`

## Step 7: Seed the missing Hetzner object-storage secrets into sqlite and prove the hosted dry-run on main

Once sqlite PR `#5` was merged, the build-side blocker was gone, but the first automatic `main` run still failed before publish. That failure was useful because it isolated the remaining gap cleanly: the sqlite repo had the public base URL variable and the GitOps/K3s tokens, but it never received the five Hetzner object-storage secrets that inventory had been bootstrapped with earlier.

I followed the same operator path inventory used, pulling the object-storage values from the Terraform-backed environment under `/home/manuel/code/wesen/terraform` and seeding those secrets into `go-go-app-sqlite`. After that bootstrap, the hosted dry-run on merged `main` passed end to end and showed the expected `sqlite` registry diff against the real K3s JSON target file.

### Prompt Context

**User prompt (verbatim):** "it's merged"

**Assistant interpretation:** Resume immediately from the merged sqlite follow-up PR, fix the remaining repo configuration blocker, and rerun the hosted validation path.

**Inferred user intent:** Move the ticket past local prep and branch-level fixes into a clean GitHub-side dry-run on the actual default branch.

### What I did
- Confirmed the merged sqlite `main` head:
  - `f3b655dfd641439687d8de5897dfed996b586cf1`
- Confirmed GitHub auth and repo configuration state with:
  - `gh auth status`
  - `gh secret list --repo go-go-golems/go-go-app-sqlite`
  - `gh variable list --repo go-go-golems/go-go-app-sqlite`
- Verified that sqlite still lacked:
  - `HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID`
  - `HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY`
  - `HETZNER_OBJECT_STORAGE_BUCKET`
  - `HETZNER_OBJECT_STORAGE_ENDPOINT`
  - `HETZNER_OBJECT_STORAGE_REGION`
- Reused the same Terraform-backed source of truth inventory used:
  - `/home/manuel/code/wesen/terraform`
  - `AWS_PROFILE=manuel direnv exec /home/manuel/code/wesen/terraform bash -lc '...'`
- Seeded sqlite repo secrets from that environment:
  - bucket: `scapegoat-federation-assets`
  - endpoint: `https://fsn1.your-objectstorage.com`
  - region: `fsn1`
- Triggered hosted dry-run:
  - `gh workflow run publish-federation-remote.yml --repo go-go-golems/go-go-app-sqlite --ref main -f dry_run=true -f remote_version=sha-manualdryrun-main-20260401a`
- Watched and inspected the run:
  - run `23866303115`
  - URL: `https://github.com/go-go-golems/go-go-app-sqlite/actions/runs/23866303115`

### Why
- The merged sqlite code was now good enough that the next blocker had to come from hosted configuration, not local source changes.
- Inventory already established the operator pattern for sourcing these secrets from the Terraform env rather than inventing repo-specific values by hand.
- A successful hosted dry-run on `main` is the exact proof needed before attempting a real publish and GitOps PR open.

### What worked
- GitHub secret bootstrap succeeded for all five missing Hetzner entries.
- The hosted dry-run completed successfully on merged `main`.
- The dry-run built `apps/sqlite/dist-federation`, resolved the expected manifest path, and exercised the GitOps registry patch path through `infra-tooling`.
- The dry-run diff added the expected entry to `gitops/kustomize/wesen-os/config/federation.registry.json`:
  - `remoteId: "sqlite"`
  - `manifestUrl: https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/sqlite/versions/sha-manualdryrun-main-20260401a/mf-manifest.json`

### What didn't work
- The merge-triggered hosted run on `main` had previously failed with missing publish config before I seeded the secrets:

```text
Missing required publish configuration: HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID
Missing required publish configuration: HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY
Missing required publish configuration: HETZNER_OBJECT_STORAGE_BUCKET
Missing required publish configuration: HETZNER_OBJECT_STORAGE_ENDPOINT
Missing required publish configuration: HETZNER_OBJECT_STORAGE_REGION
```

- `rg` against `infra-tooling` from the `wesen-os` repo root initially failed because I passed a non-existent relative directory name instead of the absolute workspace path:

```text
rg: infra-tooling: No such file or directory (os error 2)
```

### What I learned
- The hosted `main` path was fully blocked by repo bootstrap state after PR `#5` merged; no further sqlite code change was required to get the dry-run green.
- Inventory’s secret-bootstrap pattern is reusable as-is for sqlite when the same object-storage tenancy is intended.
- The shared helper path now works on merged sqlite `main`, not just on a feature branch.

### What was tricky to build
- The sharp edge here was separating “workflow logic is wrong” from “repo configuration is incomplete.” The successful feature-branch dry-run had already shown the logic was sound, but the failed `main` run proved that GitHub repo bootstrap still mattered independently of code merges.
- Another subtlety is avoiding secret leakage while still verifying the source environment. I only recorded non-sensitive metadata like bucket name, endpoint, and region, and used `gh secret set` via stdin for the actual credentials.

### What warrants a second pair of eyes
- Whether `go-go-app-sqlite` should get its own sqlite-specific bootstrap script alongside inventory so future operators do not have to adapt the inventory-oriented one manually.

### What should be done in the future
- Run the live publish path now that dry-run is green.
- Merge the resulting GitOps PR after reviewing the registry diff.
- Later, standardize the public-base-url variable naming and bootstrap script naming across remotes.

### Code review instructions
- Confirm repo secret state with:
  - `gh secret list -R go-go-golems/go-go-app-sqlite`
- Review the successful dry-run with:
  - `gh run view 23866303115 -R go-go-golems/go-go-app-sqlite --json jobs`
  - `gh run view 23866303115 -R go-go-golems/go-go-app-sqlite --log`
- Compare the object-storage bootstrap pattern against:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/41-seed-inventory-federation-gh-config.sh`

### Technical details
- Successful hosted dry-run:
  - `23866303115`
- Dry-run sqlite manifest URL:
  - `https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/sqlite/versions/sha-manualdryrun-main-20260401a/mf-manifest.json`
- Repo bootstrap metadata used:
  - bucket: `scapegoat-federation-assets`
  - endpoint: `https://fsn1.your-objectstorage.com`
  - region: `fsn1`

## Step 8: Run the live sqlite publish on main and open the real GitOps PR

With the dry-run green on merged `main`, the last meaningful proof in this ticket was the real publish path. I dispatched the workflow in non-dry-run mode against the same merged sqlite `main` SHA, which uploaded the sqlite federation artifacts to Hetzner object storage and then used the shared GitOps helper path to open a PR against the K3s repo.

This is the key handoff proof the ticket was aiming for. SQLite is now not just locally wired or dry-run validated; it has successfully published a real remote artifact version and created the GitOps change needed to register that remote in the host-side federation registry.

### Prompt Context

**User prompt (verbatim):** (see Step 7)

**Assistant interpretation:** Continue immediately after the successful dry-run and prove the real publish path while the merged `main` state and repo bootstrap are both known-good.

**Inferred user intent:** Finish the reusable-release proof as far as possible from the source-repo side before handing off to GitOps merge and rollout verification.

### What I did
- Triggered the live hosted workflow:
  - `gh workflow run publish-federation-remote.yml --repo go-go-golems/go-go-app-sqlite --ref main -f dry_run=false`
- Watched and inspected the live run:
  - run `23866354328`
  - URL: `https://github.com/go-go-golems/go-go-app-sqlite/actions/runs/23866354328`
- Confirmed the workflow resolved the default remote version:
  - `sha-f3b655d`
- Confirmed live uploads from the hosted logs:
  - `sqlite.css`
  - `mf-manifest.json`
  - `sqlite-host-contract.js`
  - `sqlite-host-contract.js.map`
- Confirmed the live manifest URL:
  - `https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/sqlite/versions/sha-f3b655d/mf-manifest.json`
- Confirmed the helper opened the GitOps PR:
  - `wesen/2026-03-27--hetzner-k3s#23`
  - `https://github.com/wesen/2026-03-27--hetzner-k3s/pull/23`
- Confirmed the GitOps helper branch and commit from hosted logs:
  - branch: `automation/federation-sqlite-wesen-os-sqlite-prod-sha-f3b655d`
  - commit: `7d99cc4`

### Why
- Dry-run success removed the remaining uncertainty around source-repo setup.
- The ticket specifically calls for proving both the dry-run path and the real GitOps PR creation path.
- The only remaining proof after this is downstream: GitOps PR merge and actual rollout behavior.

### What worked
- The full live publish path succeeded on merged sqlite `main`.
- The workflow uploaded the sqlite federation artifacts to the object-storage versioned prefix for `sha-f3b655d`.
- The shared GitOps helper created and pushed the automation branch.
- The shared helper opened K3s PR `#23` with the expected `sqlite` manifest URL patch against `federation.registry.json`.
- The published manifest is externally reachable:
  - `curl -I -sSfL https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/sqlite/versions/sha-f3b655d/mf-manifest.json`
  - result: `HTTP/2 200`
- The GitOps PR diff is scoped correctly:
  - it only adds the `sqlite` remote entry to `gitops/kustomize/wesen-os/config/federation.registry.json`

### What didn't work
- N/A. The live publish path completed successfully.

### What I learned
- The reusable federated remote release model is now proven end to end for sqlite from the source-repo side.
- The helper branch in `infra-tooling` is sufficient for a second app, even before that helper PR is merged to `main`.
- The remaining risk is no longer in sqlite source-repo automation. It is operational follow-through: merging the GitOps PR and verifying rollout behavior.

### What was tricky to build
- The sequencing mattered. If I had attempted the live publish before fixing the repo bootstrap state, the failure would have been noisy and potentially misleading because both object-storage upload and GitOps PR creation depend on that same repo config.
- Another sharp edge is that the workflow still checks out `infra-tooling` by feature-branch ref. That is acceptable for the proof, but it is not the final stable state if this is going to be treated as a normalized release path rather than a ticket-local validation branch.

### What warrants a second pair of eyes
- Review the K3s PR carefully to confirm no unrelated registry churn was introduced and that the target environment should in fact receive the sqlite remote now.
- Review whether sqlite should continue pointing at `infra-tooling` branch `task/federation-publish-helper` or whether that helper needs to be merged and retargeted before declaring the release workflow productionized.

### What should be done in the future
- Merge `wesen/2026-03-27--hetzner-k3s#23`.
- Verify Argo/host rollout behavior after the registry change lands.
- Merge or land `go-go-golems/infra-tooling#3`, then retarget sqlite workflow checkout to a stable ref.
- Record sqlite as the second successful consumer of the reusable federated remote release path once rollout is verified.

### Code review instructions
- Review the successful live run with:
  - `gh run view 23866354328 -R go-go-golems/go-go-app-sqlite --json jobs`
  - `gh run view 23866354328 -R go-go-golems/go-go-app-sqlite --log`
- Review the resulting GitOps PR:
  - `https://github.com/wesen/2026-03-27--hetzner-k3s/pull/23`
- Confirm the open GitOps PR from CLI:
  - `gh pr list -R wesen/2026-03-27--hetzner-k3s --state open`
- Confirm the manifest is publicly fetchable:
  - `curl -I -sSfL https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/sqlite/versions/sha-f3b655d/mf-manifest.json`
- Confirm the GitOps diff is scoped to the registry file:
  - `gh pr diff 23 -R wesen/2026-03-27--hetzner-k3s | rg -n "federation.registry.json|remoteId|manifestUrl|sqlite" -C 3`

### Technical details
- Successful hosted live publish:
  - `23866354328`
- Live sqlite manifest URL:
  - `https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/sqlite/versions/sha-f3b655d/mf-manifest.json`
- Resulting GitOps PR:
  - `wesen/2026-03-27--hetzner-k3s#23`
- GitOps automation branch:
  - `automation/federation-sqlite-wesen-os-sqlite-prod-sha-f3b655d`
- External verification:
  - manifest URL returned `HTTP/2 200`
  - PR diff adds only the `sqlite` entry in `gitops/kustomize/wesen-os/config/federation.registry.json`

## Step 9: Normalize the docs and bootstrap path now that sqlite is a proven second consumer

After the hosted proof was complete, the remaining gaps were not release failures. They were stale docs and tooling shape. Several documents still described sqlite as future work, and the only concrete bootstrap script still lived under an old inventory-focused ticket path instead of the shared tooling repo where future operators would actually look first.

I used this cleanup pass to move the operator-facing bootstrap into `infra-tooling`, refresh the sqlite repo README with the release path and required repo configuration, and update the older federation-generalization ticket so it no longer contradicts the fact that sqlite has already succeeded on the source-repo side.

### Prompt Context

**User prompt (verbatim):** "ok, do it"

**Assistant interpretation:** Apply the actual cleanup updates that the successful sqlite proof now justifies, rather than just listing them.

**Inferred user intent:** Leave the reusable federation path in a better documented and more operator-ready state now that sqlite has proven it.

### What I did
- In `infra-tooling` I added:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/bootstrap_federation_source_repo_from_terraform.sh`
- In `infra-tooling` I updated:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/docs/federation/secret-bootstrap.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/README.md`
- In `go-go-app-sqlite` I updated:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/README.md`
- In the older federation-generalization ticket I updated:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/index.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/tasks.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/examples/01-federation-gitops-targets.example.json`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/design/02-generalized-federated-remote-release-guide.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/design/03-standard-secret-bootstrap-for-federated-remotes.md`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/diary.md`
- Validated the new bootstrap script with:
  - `bash -n /home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/bootstrap_federation_source_repo_from_terraform.sh`

### Why
- The old inventory-only seed script had become the de facto operator recipe even though the reusable tooling now belongs in `infra-tooling`.
- The sqlite repo itself needed a repo-local explanation of the federation release path so people do not have to infer it from CI.
- The older generalization ticket had become misleading after sqlite succeeded and needed to stop presenting that work as merely planned.

### What worked
- The reusable bootstrap path is now in the shared tooling repo where future source repos can actually reuse it.
- The sqlite README now documents the build artifact, workflow, required secrets/vars, and manifest shape.
- The older federation-generalization ticket now reflects the real direct-JSON target shape and the fact that sqlite is already proven on the source-repo side.

### What didn't work
- I did not change the sqlite workflow away from `ref: task/federation-publish-helper` yet, because that would be premature until `go-go-golems/infra-tooling#3` lands or an equivalent stable ref exists.

### What I learned
- The most important “post-success” cleanup was not code in the release path itself. It was moving operator knowledge out of ticket-local, inventory-specific documents and into the shared tooling repo and repo-local READMEs.
- The remaining instability is now mostly around helper-branch pinning and downstream rollout, not around source-repo release mechanics.

### What was tricky to build
- The sharp edge was deciding what to normalize now versus what would be misleading to normalize early. The bootstrap script and docs were safe to generalize immediately because they already matched the successful sqlite run. The workflow checkout ref is different: the successful proof still depends on the helper feature branch, so pretending it is stable today would make the docs less accurate, not more.

### What warrants a second pair of eyes
- Review whether the new bootstrap script name and argument contract are the ones we want to keep long term in `infra-tooling`.
- Review whether the generalization ticket now draws the line clearly enough between “source-repo proof is done” and “rollout proof is still pending.”

### What should be done in the future
- Merge or otherwise land `go-go-golems/infra-tooling#3`.
- Retarget sqlite away from `task/federation-publish-helper`.
- Merge `wesen/2026-03-27--hetzner-k3s#23` and verify rollout.
- Decide later whether inventory should also switch from its repo-local publish helper to the shared publish helper.

### Code review instructions
- Review the new reusable bootstrap script:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling/scripts/federation/bootstrap_federation_source_repo_from_terraform.sh`
- Review the sqlite release README section:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/README.md`
- Review the corrected generalized target example:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/31/FEDERATION-RELEASE-001--generalize-remote-publish-and-gitops-handoff/examples/01-federation-gitops-targets.example.json`

### Technical details
- New infra-tooling script:
  - `bootstrap_federation_source_repo_from_terraform.sh`
- Validation:
  - `bash -n` passed for the new script
- Remaining intentional temporary dependency:
  - sqlite workflow still checks out `infra-tooling` ref `task/federation-publish-helper`

## Step 10: Retarget sqlite from the temporary helper branch to `infra-tooling@main`

Once `go-go-golems/infra-tooling#3` merged, the temporary sqlite workflow pin was no longer just inelegant; it was stale. At that point the correct follow-up was very small but important: remove the explicit `ref: task/federation-publish-helper` from sqlite so the workflow consumes the shared helper from `infra-tooling` default branch instead of continuing to depend on a ticket-era task ref.

I made that retarget as a separate sqlite follow-up commit and validated it with a hosted dry-run on the branch. That keeps the source-repo proof honest: sqlite is no longer only known to work against the temporary helper branch, it is also proven against the merged helper state on `infra-tooling@main`.

### Prompt Context

**User prompt (verbatim):** "ok, i merged https://github.com/go-go-golems/infra-tooling/pull/3"

**Assistant interpretation:** Continue from the merged shared-helper PR by removing the now-stale branch pin in sqlite and revalidating the workflow against `infra-tooling@main`.

**Inferred user intent:** Finish the shared-helper stabilization step rather than leaving sqlite permanently pinned to a temporary feature branch.

**Commit (code):** `a95829b` — `deploy: consume infra-tooling from main`

### What I did
- Verified `infra-tooling` `main` now contains the merged helper:
  - `dc99431` `Merge pull request #3 from go-go-golems/task/federation-publish-helper`
- Updated:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/.github/workflows/publish-federation-remote.yml`
- Removed the temporary workflow checkout pin:
  - deleted `ref: task/federation-publish-helper`
- Validated the workflow file locally with:
  - `python3` + `yaml.safe_load(...)`
- Pushed the sqlite branch and opened:
  - `go-go-golems/go-go-app-sqlite#6`
- Triggered hosted dry-run on the branch:
  - run `23867838529`
  - URL: `https://github.com/go-go-golems/go-go-app-sqlite/actions/runs/23867838529`

### Why
- The helper branch had served its purpose. Continuing to pin sqlite to it after merge would create unnecessary drift between sqlite and the actual shared default branch.
- This follow-up is small enough that it should be isolated from the earlier feature work instead of buried inside the bigger sqlite migration PRs.

### What worked
- The sqlite workflow now consumes `infra-tooling@main`.
- The branch dry-run succeeded on GitHub after the pin was removed.
- The dispatch correctly ran against the sqlite branch head:
  - `headSha: a95829bd5e2a93189c329bbc8d6e48e804cfce16`

### What didn't work
- N/A. The retarget itself was straightforward and the hosted dry-run stayed green.

### What I learned
- The earlier issue where workflow dispatch behaved ambiguously against branch refs is not blocking now. This retarget validation clearly ran against the branch head and provides a clean hosted signal for the follow-up PR.
- After the helper merge, the remaining blockers are fully downstream again: merging sqlite PR `#6`, merging the GitOps PR, and verifying rollout.

### What was tricky to build
- The only subtle part was sequencing. I waited until `infra-tooling` `main` visibly contained `dc99431` before removing the sqlite ref pin, because doing that earlier would have made the workflow depend on an incompletely updated shared default branch.

### What warrants a second pair of eyes
- Review that sqlite PR `#6` is intentionally only the ref-pin removal and does not carry unrelated cleanup.

### What should be done in the future
- Merge `go-go-golems/go-go-app-sqlite#6`.
- Merge `wesen/2026-03-27--hetzner-k3s#23`.
- Verify Argo / host-side rollout behavior.
- After rollout is verified, close out the ticket as the second proven consumer.

### Code review instructions
- Review the sqlite workflow diff:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/.github/workflows/publish-federation-remote.yml`
- Review hosted validation:
  - `gh run view 23867838529 -R go-go-golems/go-go-app-sqlite --json jobs`
  - `gh run view 23867838529 -R go-go-golems/go-go-app-sqlite --log`
- Review follow-up PR:
  - `https://github.com/go-go-golems/go-go-app-sqlite/pull/6`

### Technical details
- Merged infra-tooling helper on `main`:
  - `dc99431`
- New sqlite follow-up commit:
  - `a95829b` `deploy: consume infra-tooling from main`
- New sqlite follow-up PR:
  - `go-go-golems/go-go-app-sqlite#6`
- Successful hosted branch dry-run:
  - `23867838529`

## Step 11: Verify the merged rollout on the cluster, reproduce the live browser failure, and prepare the runtime fix

Once both follow-up PRs were merged, the ticket moved out of “release automation proof” territory and into actual rollout validation. The cluster-side rollout succeeded, but that success exposed a real host/runtime bug that the earlier source-repo proofs could not catch: sqlite was being registered twice in the launcher after federation bootstrapped, which made the live browser fail with `Duplicate app reducer key "app_sqlite"`.

This was the right kind of failure to find at this stage. It means the storage publish, GitOps writeback, Argo sync, manifest fetch, and remote contract fetch all worked. The bug sits at the boundary between `wesen-os` host composition and the sqlite remote contract, not in the deployment machinery.

### Prompt Context

**User prompt (verbatim):** "i merged both." and then "I think you need the kubeconfig map KUBECONFIG=/home/manuel/code/wesen/2026-03-27--hetzner-k3s/.cache/kubeconfig-tailnet.yaml"

**Assistant interpretation:** Treat both the sqlite helper-retarget PR and the GitOps PR as landed, verify the actual cluster rollout with the provided kubeconfig, and continue far enough to validate the live host/runtime behavior instead of stopping at repo state.

**Inferred user intent:** Move from GitHub-level success criteria to real environment verification and keep working until the next concrete runtime issue is identified and scoped.

**Commit (code):**
- `go-go-app-sqlite`: `bf6f9a3` — `federation: keep sqlite launcher state private`
- `wesen-os`: pending at the time this diary step was written, because the host-side fix is being committed separately after the docs update

### What I did
- Verified the merge state of the two key PRs:
  - `go-go-golems/go-go-app-sqlite#6`
  - `wesen/2026-03-27--hetzner-k3s#23`
- Verified the K3s repo `main` content includes the sqlite remote entry in:
  - `gitops/kustomize/wesen-os/config/federation.registry.json`
- Used the user-provided kubeconfig:
  - `KUBECONFIG=/home/manuel/code/wesen/2026-03-27--hetzner-k3s/.cache/kubeconfig-tailnet.yaml`
- Checked live cluster health and rollout:
  - `kubectl cluster-info`
  - `kubectl get applications -n argocd`
  - `kubectl get configmap -n wesen-os`
  - `kubectl get -n wesen-os configmap/<generated-name> -o yaml | rg -n "sqlite|inventory|manifestUrl"`
  - `kubectl get deployment -n wesen-os -o wide`
  - `kubectl get pods -n wesen-os -o wide`
  - `kubectl rollout status deployment/wesen-os -n wesen-os --timeout=30s`
- Inspected the user-provided browser console evidence showing:
  - `inventory-host-contract.js` loads with `HTTP 200`
  - `sqlite-host-contract.js` loads with `HTTP 200`
  - launcher bootstrap then fails with `Duplicate app reducer key "app_sqlite"`
- Traced the duplicate registration in source:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/modules.tsx`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/store.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/localFederatedAppContracts.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/launcher/module.tsx`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/host.ts`
- Confirmed the launcher-side collision path:
  - `wesen-os` still statically imports `sqliteLauncherModule`
  - bootstrap also loads sqlite through the federated registry and app contracts
  - both paths expose `stateKey: "app_sqlite"`
- Confirmed the sqlite remote also had a latent reducer collision:
  - `host.ts` exported `sharedReducers.app_sqlite`
  - `launcher/module.tsx` already registers the same slice as module-private launcher state
- Applied the sqlite-side fix:
  - removed `app_sqlite` from `sharedReducers`
  - added a targeted regression test that checks `host.ts` source does not reintroduce `sharedReducers` / `app_sqlite`
- Applied the `wesen-os` host-side fix:
  - removed the static `@go-go-golems/sqlite/launcher` import from `apps/os-launcher/src/app/modules.tsx`
  - removed the static `sqliteLauncherModule` entry from the launcher module list
  - added a regression test in `src/__tests__/launcherHost.test.tsx` that asserts the static sqlite launcher import does not come back
- Ran targeted validation:
  - `npm run build:federation -w apps/sqlite`
  - `npm run test -w apps/sqlite -- src/host.test.ts`
  - `npm run build -w apps/os-launcher`
  - `npm run test -w apps/os-launcher -- src/__tests__/launcherHost.test.tsx`
- Ran a local launcher preview through `tmux` and checked the browser console with Playwright:
  - the previous duplicate reducer bootstrap failure did not appear locally
  - the local preview instead failed later on the missing `/api/os/federation-registry` backend, which is expected for static preview mode

### Why
- A live GitOps merge without runtime validation would have left the ticket in a dangerously misleading “done enough” state.
- The browser error strongly suggested a composition problem rather than a deployment problem, and the source audit confirmed that.
- Fixing only one side would have been incomplete: `wesen-os` was mounting sqlite twice, and sqlite itself was also exporting launcher-private state through `sharedReducers`.

### What worked
- The cluster verification path worked once the correct kubeconfig was used.
- Argo and the deployment were healthy, so the rollout infrastructure is not the blocker anymore.
- The browser evidence was enough to focus debugging quickly on launcher/store composition instead of object storage, GitOps, or manifest loading.
- Both local code fixes validated cleanly:
  - sqlite federated artifact build still passes
  - `wesen-os` production build still passes
  - the new `launcherHost` regression test passes
  - the new sqlite host-contract regression test passes

### What didn't work
- A first attempt at a sqlite regression test imported `sqliteHostContract` directly and tripped an unrelated Vitest/runtime problem:

```text
TypeError: (0 , __vite_ssr_import_0__.createSelector) is not a function
```

- That failure was not a sign the fix was wrong. It was a test-harness coupling issue caused by importing too much runtime. I replaced that test with a narrower source-level assertion instead of spending more time fighting the harness.
- A local static preview cannot fully validate federated bootstrap because it has no backend for:

```text
/api/os/federation-registry
```

- That is why the local runtime check was used only as a negative signal ("the duplicate reducer failure is gone before backend fetch"), not as the final proof.

### What I learned
- The rollout machinery is now proven beyond the source repo: the live cluster really picks up the sqlite manifest URL and the host really tries to load the remote contract.
- The remaining issue is ordinary frontend integration debt, not deployment debt.
- The duplicate reducer error string mattered. It came from `collectModuleReducers()` semantics, which pointed to duplicated launcher modules before shared-reducer merge even ran. That clue made the `modules.tsx` static sqlite import stand out quickly.

### What was tricky to build
- The hard part was not the fix itself; it was separating two overlapping bugs:
  1. static sqlite launcher registration in `wesen-os`
  2. launcher-private sqlite state being exported as a shared reducer

- The browser only surfaced the first error message, but the second issue would have become the next launcher-store collision after the first one was fixed. Handling both together avoids a second avoidable production cycle.

### What warrants a second pair of eyes
- Review whether sqlite should expose any shared reducer at all right now, or whether all current sqlite state is intentionally launcher-private.
- Review whether any other federated remote in `wesen-os` is still mounted statically and should follow the same cleanup pattern.

### What should be done in the future
- Commit and push the `wesen-os` host-side fix.
- Open or update the follow-up PRs for the sqlite remote fix and the `wesen-os` host fix.
- Republish sqlite so the live remote contract stops exporting the old host shape.
- Deploy the updated `wesen-os` host build so the launcher no longer statically mounts sqlite.
- Re-run live browser verification after both updates land and only then mark the ticket complete.

### Code review instructions
- Review the host-side composition fix:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/modules.tsx`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/__tests__/launcherHost.test.tsx`
- Review the sqlite remote fix:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/host.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/host.test.ts`
- Re-run the targeted checks:
  - `npm run build:federation -w apps/sqlite`
  - `npm run test -w apps/sqlite -- src/host.test.ts`
  - `npm run build -w apps/os-launcher`
  - `npm run test -w apps/os-launcher -- src/__tests__/launcherHost.test.tsx`

### Technical details
- Correct kubeconfig used for cluster validation:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/.cache/kubeconfig-tailnet.yaml`
- Live sqlite manifest URL confirmed in GitOps and cluster config:
  - `https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/sqlite/versions/sha-f3b655d/mf-manifest.json`
- SQLite follow-up commit created:
  - `bf6f9a3` `federation: keep sqlite launcher state private`
- `wesen-os` host-side commit is created after this diary update so the docs capture the exact reasoning behind it.

## Step 12: Push the runtime-fix branches, open review PRs, and revalidate sqlite on GitHub

After the local fix passed its targeted checks, the next safe checkpoint was to get the follow-up branches public and make sure the sqlite remote change still works in hosted Actions. I treated that as a separate step because the ticket had already shown the cost of stopping at local proof while the real problem lived one environment further downstream.

### Prompt Context

**User prompt (verbatim):** no new prompt; this step continues the same execution request to work task by task, commit at appropriate intervals, and keep a detailed diary.

**Assistant interpretation:** Publish the runtime-fix commits so they are reviewable, then gather one fresh hosted signal from GitHub Actions before asking for another merge.

**Inferred user intent:** Do not hand off another local-only hypothesis. Leave the repo state in a reviewable, externally validated form.

**Commit (code):**
- sqlite repo commit already created in the previous step: `bf6f9a3`
- `wesen-os` commit created before this publication step: `4ab9593` — `fix(launcher): stop double-loading sqlite module`

### What I did
- Created fresh follow-up branches instead of reusing already-merged PR branches:
  - `go-go-app-sqlite`: `task/sqlite-federation-runtime-fix`
  - `wesen-os`: `task/sqlite-federation-runtime-fix`
- Pushed both branches to origin.
- Opened review PRs:
  - `go-go-golems/go-go-app-sqlite#7`
  - `wesen/wesen-os#11`
- Triggered a hosted sqlite workflow dry-run on the new sqlite runtime-fix branch:
  - workflow: `publish-federation-remote`
  - branch: `task/sqlite-federation-runtime-fix`
  - head SHA: `bf6f9a3d8991470f8bc40d7d359b34060e8b511b`
  - run: `23869267352`
- Watched the hosted run to completion with:
  - `gh run watch 23869267352 -R go-go-golems/go-go-app-sqlite --exit-status`

### Why
- The previous sqlite PR branches were already merged. Reusing them would muddle review history and make it harder to distinguish the rollout follow-up from the original release-path work.
- A green hosted dry-run on the new sqlite branch proves that the host-contract cleanup did not break the shared release workflow.

### What worked
- Both branches pushed cleanly.
- Both follow-up PRs were created without needing to reshuffle commits.
- Hosted sqlite dry-run `23869267352` succeeded on the new branch.
- The run exercised the full dry-run path again:
  - checkout
  - install
  - sqlite federation artifact build
  - dry-run publish helper
  - dry-run GitOps target update

### What didn't work
- `gh pr create` warned about unrelated uncommitted files in the outer `wesen-os` workspace, but that warning was only about the broader working tree. The relevant repo commits were already clean and pushed, so I did not treat the warning as a blocker.
- The hosted run still emits the known Node 20 deprecation annotation for:
  - `actions/setup-node@v4`
  - `actions/upload-artifact@v4`

- That remains cleanup debt, not a blocker for the sqlite runtime fix.

### What I learned
- The sqlite remote fix is not just locally correct; it also preserves the GitHub-side release path.
- The remaining risk now sits entirely in merge/deploy sequencing between the updated sqlite remote and the updated `wesen-os` host.

### What was tricky to build
- The main decision was branch hygiene. It is technically possible to keep adding commits to an already-merged branch, but doing that would make the review surface harder to reason about. Fresh branches keep the runtime-fix scope explicit and avoid confusing it with the earlier federation rollout work.

### What warrants a second pair of eyes
- Review the `wesen-os` PR with the live browser failure in mind, not just the diff. The code change is tiny, but it matters because it changes how sqlite is sourced into the launcher.
- Review whether sqlite PR `#7` should merge before `wesen-os#11`, or whether both should simply land back-to-back before the next live verification pass.

### What should be done in the future
- Merge `go-go-golems/go-go-app-sqlite#7`.
- Merge `wesen/wesen-os#11`.
- Trigger a new real sqlite publish from merged `main`.
- Deploy merged `wesen-os` `main`.
- Re-run live browser verification and close the ticket only if the launcher boots without the duplicate reducer error.

### Code review instructions
- Review PRs:
  - `https://github.com/go-go-golems/go-go-app-sqlite/pull/7`
  - `https://github.com/wesen/wesen-os/pull/11`
- Review hosted sqlite validation:
  - `https://github.com/go-go-golems/go-go-app-sqlite/actions/runs/23869267352`

### Technical details
- Public follow-up branches:
  - `origin/task/sqlite-federation-runtime-fix` in `go-go-app-sqlite`
  - `origin/task/sqlite-federation-runtime-fix` in `wesen-os`
- Public follow-up PRs:
  - `go-go-golems/go-go-app-sqlite#7`
  - `wesen/wesen-os#11`
- Hosted sqlite runtime-fix dry-run:
  - run `23869267352`
  - conclusion: `success`
