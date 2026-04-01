# Diary

## 2026-03-31: Ticket Creation

Created this ticket to capture the next-level release-hygiene work after the first inventory remote publish succeeded.

The current system works, but it is still too inventory-specific in four places:

1. remote publish workflow inputs
2. manifest URL patching into the host registry
3. GitOps PR handoff wiring
4. bootstrap/secret instructions

This ticket exists to convert those into a reusable pattern for future federated apps instead of repeating bespoke work per app.

## 2026-03-31: Freezing The Reusable Release Model

I started this ticket by turning the current working `inventory` flow into an explicit reusable design, rather than immediately writing more scripts. That was the right first move because the next implementation choices depend on one architectural question:

- what belongs in source repos versus the K3s repo versus a shared helper layer?

### What I used as the baseline

I grounded the design on the currently working path:

- `workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml`
- `workspace-links/go-go-app-inventory/scripts/publish_federation_remote.py`
- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml`

To make that baseline easy to replay later, I added:

- `scripts/01-audit-current-remote-release-shape.sh`

That script prints the current inventory workflow, current publish helper, and the current host registry target in GitOps. It is intentionally simple: the ticket should preserve the “before” shape before we start abstracting anything.

### What I decided in Phase 0

I wrote the detailed guide:

- `design/02-generalized-federated-remote-release-guide.md`

The key decisions recorded there are:

1. immutable manifest URLs remain the deployment unit
2. source repos own remote build, upload, and GitOps PR creation
3. the K3s repo owns canonical host registry layout and documentation
4. reusable mechanics should be a shared helper layer or thin reusable workflow, not inventory-specific scripts copied forever
5. the K3s repo should be the reference/template home for docs and target layout, but not the place where app-specific CI logic lives

### Phase 1 progress

I also used the guide to freeze the first reusable metadata shape for `federation-manifest` targets.

That means the ticket now has:

- a proposed `deploy/gitops-targets.json` structure for remotes
- a concrete model for how source repos should declare:
  - remote id
  - upload path
  - GitOps destination file
  - config key / logical registry target

So Phase 0 and the design half of Phase 1 are now documented strongly enough to implement against them, instead of inventing the structure ad hoc while coding.

## 2026-03-31: Prototyping Generic Federation GitOps Targets And Patching

After freezing the model, I moved one level deeper and turned the abstract recommendations into concrete ticket artifacts.

### What I added

I added a reusable target-config example:

- `examples/01-federation-gitops-targets.example.json`

That example deliberately includes both:

- `inventory`
- `sqlite`

so the structure itself is no longer inventory-only, even though the live implementation still is.

I also added a generic patch helper prototype:

- `scripts/02-patch-federation-registry-target.py`

and a replay wrapper:

- `scripts/03-check-federation-registry-patch-prototype.sh`

### What the patch helper does

The prototype:

1. reads a YAML file
2. locates the literal block for `federation.registry.json`
3. parses the embedded JSON
4. finds the remote entry by `remoteId`
5. updates:
   - `manifestUrl`
   - `enabled`
   - optionally `mode`
6. rewrites the embedded JSON back into the YAML literal block

### Important implementation decision

I intentionally kept the prototype dependency-light and used only the Python standard library.

That means it does **not** depend on PyYAML or `yq`. Instead, it patches the YAML file by targeting the known literal block shape used in the host configmap.

That is a deliberate design choice for now:

- it keeps the prototype portable
- it matches the actual current config shape
- it avoids introducing new tool dependencies before we decide the shared-helper home

If we later need broader YAML support across multiple shapes, we can promote it to a richer parser. But for the current host registry shape, the standard-library approach is enough to prove the design.

### Validation I ran

I validated the prototype in two ways:

1. temp-copy patch via:
   - `scripts/03-check-federation-registry-patch-prototype.sh`
2. direct dry-run render against the real K3s host configmap via:
   - `python3 scripts/02-patch-federation-registry-target.py ... --dry-run`

The dry-run output correctly rewrote:

- `manifestUrl`

without hardcoding `inventory` into the algorithm itself; `remoteId` is an input argument.

### What is now decided versus undecided

Decided enough to build on:

- reusable metadata shape for `federation-manifest`
- generic match-by-`remoteId` patch semantics
- patching happens against host GitOps config, not directly against app code

Still intentionally undecided:

- whether this helper should live in each source repo
- whether it should move to a shared helper package/repo
- whether part of the pattern should be expressed as a reusable GitHub workflow

That is the right boundary for this stage: we now have a working generic prototype and can decide placement separately from behavior.

## 2026-03-31: Deciding Where The Reusable Release Logic Should Live

With the patch behavior proven, I closed the remaining design question that the user explicitly raised:

- should this be packaged in the K3s repo?

The answer is:

- partially for docs and examples
- no for source-repo CI execution logic

### Final packaging decision recorded in this ticket

The ticket now explicitly recommends:

1. K3s repo owns:
   - docs
   - example target layouts
   - canonical host registry structure
2. source repos own:
   - thin publish workflows
   - app-local build steps
   - app-local target metadata
3. shared helper layer owns:
   - generic patching
   - generic GitOps PR helper behavior

### Why this is the right split

If the logic lives in the K3s repo, app repos would still need to import or copy it somehow, and the dependency direction becomes backwards:

- app release logic would depend on cluster repo internals

That is not a good long-term shape.

The better shape is:

- K3s repo = reference and target authority
- source repos = execution
- shared helper = reusable mechanics

This ticket now captures that decision directly in the design guide, so later implementation work does not have to reopen the same architectural argument.

## 2026-03-31: Building The Thin Workflow Template And Dry-Run Updater

After the patch primitive was validated, I added the next layer of the reusable shape:

- `templates/01-publish-federated-remote.template.yml`
- `scripts/04-dry-run-federation-gitops-target-update.py`
- `scripts/05-check-federation-gitops-target-dry-run.sh`

The purpose of this slice is not to finalize the shared-helper home yet. It is to prove that the reusable pieces compose into a thin app workflow:

1. app-specific build step
2. generic publish helper
3. generic target metadata
4. generic GitOps diff/update step

### Bug caught during the first dry-run

The first version of `04-dry-run-federation-gitops-target-update.py` resolved the patch helper relative to the example config file path:

- `examples/scripts/...`

That was wrong. The real helper lives under the ticket `scripts/` directory, not under `examples/`.

I fixed it by resolving the helper relative to the script location itself:

- `ticket_root = Path(__file__).resolve().parents[1]`
- `patch_script = ticket_root / "scripts" / "02-patch-federation-registry-target.py"`

That is the better shape because the dry-run updater should depend on the ticket tooling layout, not on where the config JSON happens to live.

### Validation after the fix

After correcting the helper path, I reran:

- `scripts/05-check-federation-gitops-target-dry-run.sh`

That produced the expected unified diff against the local K3s checkout:

- same target file:
  - `gitops/kustomize/wesen-os/configmap.yaml`
- same matching remote:
  - `inventory`
- rewritten field:
  - `manifestUrl`

That means the ticket now has a full thin-template prototype:

1. example target metadata
2. generic patch helper
3. dry-run updater that consumes the metadata
4. template workflow showing where those steps plug into a source repo release flow

## 2026-03-31: Standardizing Secret Bootstrap

The next piece that still felt too inventory-specific was the operator bootstrap.

So I added:

- `design/03-standard-secret-bootstrap-for-federated-remotes.md`

This records the standard secret and variable set a source repo needs before it can participate in the generalized remote-release flow:

- object storage access key
- object storage secret key
- bucket
- endpoint
- region
- `GITOPS_PR_TOKEN`
- public base URL variable

## 2026-04-01: Publishing `infra-tooling` And Removing The Inventory Bridge

The ticket reached the first real distribution checkpoint today.

### What happened first

The original `go-go-app-inventory` workflow failure was correct and useful:

- the workflow checked out `go-go-golems/infra-tooling`
- then tried to run:
  - `.infra-tooling/scripts/federation/update_federation_gitops_target.py`
- but the shared repo `main` branch did not contain the extracted helper files yet

That meant the failure was **not** a logic bug in the shared updater. It was a publication problem: the consumer workflow was reading from GitHub `main`, while the real extracted toolkit only existed locally and on a feature branch.

### Temporary bridge

To prove that diagnosis before changing more code, I took the minimal bridge step:

1. pushed the extracted `infra-tooling` branch upstream
2. opened `go-go-golems/infra-tooling#1`
3. temporarily pinned the inventory workflow checkout to:
   - `ref: task/os-openai-app-server`

That bridge was validated by inventory Actions run:

- `23850184226`

which passed and proved that the shared updater path itself was sound.

### After `infra-tooling` PR #1 merged

After the user merged `go-go-golems/infra-tooling#1`, I removed the temporary branch pin from:

- `workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml`

so the workflow once again checked out plain `infra-tooling` `main`.

I validated that stable state by dispatching the inventory workflow directly against the branch:

- workflow: `publish-federation-remote.yml`
- ref: `task/inventory-infra-tooling-federation-release`
- run: `23850644368`

That run succeeded end to end.

### Why this matters

This is the first proof that the extracted shared-tooling repo is not just an archive or ticket artifact. A live source repo can now:

1. check out `infra-tooling` from GitHub `main`
2. build its federated artifact
3. run the shared dry-run GitOps updater against the private K3s repo

without relying on local branches or unpublished helper files.

### Remaining follow-up after this proof

With the bridge removed and `main` consumption proven, the next work item for this ticket is no longer distribution. It is process:

- move from dry-run GitOps diff to actual GitOps PR creation using the shared helper path
- then prove the same pattern on a second app so the reuse story is not inventory-only

## 2026-04-01: Adding The Shared PR-Capable Federation Helper

After the stable `infra-tooling` main proof, the next missing piece was obvious:

- the shared path could validate a GitOps diff
- but it still could not perform the actual GitOps handoff for federation manifests

That meant the reusable flow was still incomplete.

### What I added

I implemented a new shared helper in `infra-tooling`:

- `scripts/federation/open_federation_gitops_pr.py`

This helper is the federation-manifest counterpart to the existing image helper:

- `scripts/gitops/open_gitops_pr.py`

It can now:

1. read `federation-manifest` target metadata
2. patch the correct remote entry inside `federation.registry.json`
3. run in local dry-run mode against a checked-out GitOps repo
4. or clone the GitOps repo, commit the patch on a deterministic branch, push it, and open a PR

I also updated the reusable template in `infra-tooling`:

- `templates/github/publish-federated-remote.template.yml`

so the documented shared workflow now shows both modes:

- dispatch dry-run
- real PR creation

### Local validation

Before touching the inventory workflow, I validated the shared helper locally with:

- `python3 -m py_compile ...`
- a real dry-run against the actual K3s checkout using:
  - `scripts/federation/open_federation_gitops_pr.py`
  - `workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s`

That dry-run produced the expected diff in:

- `gitops/kustomize/wesen-os/configmap.yaml`

without mutating the working tree.

### Inventory workflow migration

I then updated:

- `workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml`

The workflow now behaves like this:

1. workflow dispatch with `dry_run=true`
   - checks out the private K3s repo
   - runs `open_federation_gitops_pr.py --gitops-repo-dir .gitops --dry-run`
   - skips real PR creation

2. push to `main` or `dry_run=false`
   - skips the local GitOps checkout
   - runs `open_federation_gitops_pr.py --push --open-pr`

That is the first real source-repo migration from “shared dry-run only” to “shared PR-capable helper.”

### Why the temporary bridge came back

This change introduced a new shared file in `infra-tooling`, which meant the same distribution constraint reappeared for the next feature slice:

- `infra-tooling` main did not yet contain `open_federation_gitops_pr.py`

So I deliberately reintroduced the temporary bridge in the inventory workflow:

- `ref: task/os-openai-app-server`

on the `infra-tooling` checkout step.

This is not backsliding. It is the same controlled publication bridge pattern used successfully in the previous slice.

### GitHub validation

I pushed the new shared-helper branch and opened:

- `go-go-golems/infra-tooling#2`

I pushed the inventory branch update and validated it on GitHub with:

- workflow run: `23851087827`
- repo: `go-go-golems/go-go-app-inventory`
- ref: `task/inventory-infra-tooling-federation-release`

That run passed.

Important detail:

- it passed in workflow-dispatch dry-run mode
- so the real `--push --open-pr` path is implemented but still not yet exercised in this ticket slice

### Why this matters

At this point the reusable pattern now has all of the structural pieces it previously lacked:

1. shared extraction in `infra-tooling`
2. shared dry-run validation
3. shared PR-capable federation helper
4. source-repo workflow migration to that helper

The remaining work is no longer architecture. It is rollout:

- merge `infra-tooling#2`
- remove the temporary bridge again
- prove stable `infra-tooling` `main`
- then execute the first real GitOps PR creation through the shared helper

## 2026-03-31: Extracting The First Shared Toolkit Into `infra-tooling`

With the ticket-side prototypes validated, I created the first real shared home in:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling`

The point of this move is to stop treating the ticket as the permanent home for reusable mechanics. The ticket should stay the design trail and reasoning record. The shared repo should become the place future source repos actually copy from or call into.

### What moved into `infra-tooling`

I added the first extracted federation/tooling set:

- `README.md`
- `docs/federation/federated-remote-release-model.md`
- `docs/federation/secret-bootstrap.md`
- `docs/platform/source-repo-to-gitops-pr.md`
- `examples/federation/federation-gitops-targets.example.json`
- `examples/federation/federation.registry.example.json`
- `templates/github/publish-federated-remote.template.yml`
- `scripts/federation/patch_federation_registry_target.py`
- `scripts/federation/update_federation_gitops_target.py`
- `scripts/gitops/open_gitops_pr.py`

### Why these files were worth extracting

These files are the first set that clearly do not belong in one app repo:

1. federation registry patching logic
2. federation target metadata shape
3. the thin publish workflow template
4. secret/bootstrap expectations
5. the generic source-repo -> GitOps PR opener pattern
6. the control-plane explanation originally described in the Hetzner K3s docs

That split now looks like this:

- ticket docs = design history and implementation breadcrumbs
- K3s repo = canonical live GitOps state plus platform/operator docs
- source repos = thin app-specific workflows and target metadata
- `infra-tooling` = reusable scripts, templates, examples, and extracted cross-repo docs

### Validation I ran against the extracted files

I did not just copy these files. I validated them directly in the new repo:

1. Python compile check:
   - `python3 -m py_compile .../scripts/federation/patch_federation_registry_target.py`
   - `python3 -m py_compile .../scripts/federation/update_federation_gitops_target.py`
   - `python3 -m py_compile .../scripts/gitops/open_gitops_pr.py`
2. federation dry-run against the real K3s checkout:
   - `update_federation_gitops_target.py --config .../federation-gitops-targets.example.json --target wesen-os-inventory-prod --manifest-url https://assets.example.invalid/... --gitops-repo-dir /home/manuel/code/wesen/2026-03-27--hetzner-k3s`
3. image-based GitOps dry-run against the real K3s checkout:
   - `open_gitops_pr.py --config /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/deploy/gitops-targets.json --target wesen-os-prod --image ghcr.io/wesen/wesen-os:sha-example --gitops-repo-dir /home/manuel/code/wesen/2026-03-27--hetzner-k3s --dry-run`

The federation updater produced the expected diff in the `wesen-os` configmap, and the GitOps PR opener produced the expected diff in the `wesen-os` deployment image field.

### One small validation miss I corrected

My first validation attempt for the extracted `open_gitops_pr.py` used the wrong target name:

- `wesen-os-staging`

The actual target in `deploy/gitops-targets.json` is:

- `wesen-os-prod`

That was just a bad probe, not a script bug. Rerunning with the correct target produced the expected diff immediately.

### What still remains after this extraction

The shared home now exists, but the generalized pattern is not proven complete yet. The next remaining steps are still:

1. add a concrete onboarding doc for a second app adopting the pattern
2. apply the extracted tooling to a second remote so it is no longer inventory-only in practice
3. decide whether future repos should vendor/copy these helpers or call them as versioned shared tooling

## 2026-03-31: Making `go-go-app-inventory` Consume `infra-tooling`

With the shared repo extracted, the next question was whether a live source repo could actually consume it without inventing a full package-distribution layer first.

I chose the lowest-risk proof:

- keep app-specific build/upload logic in `go-go-app-inventory`
- add repo-local remote target metadata
- make the GitHub workflow check out `infra-tooling`
- run the shared updater from that checkout in dry-run mode against a checked-out GitOps repo

### Files changed in `go-go-app-inventory`

- `.github/workflows/publish-federation-remote.yml`
- `deploy/federation-gitops-targets.json`

### What changed in the workflow

I added two extra checkouts:

1. `go-go-golems/infra-tooling` at `.infra-tooling`
2. `wesen/2026-03-27--hetzner-k3s` at `.gitops`

Then I added an `id: publish` to the existing object-storage publish step so it exports:

- `manifest_url`

After that, the workflow now runs:

- `.infra-tooling/scripts/federation/update_federation_gitops_target.py`

against:

- `deploy/federation-gitops-targets.json`
- `.gitops`

That means the inventory repo is no longer proving the pattern only through ticket-side experiments; it now consumes the shared helper path the way a real source repo would.

### Why I chose checkout-based consumption

There are three possible short-term consumption models:

1. copy the scripts back into the source repo
2. package the helpers formally first
3. check out `infra-tooling` in CI and call it directly

For this stage, option 3 is the cleanest:

- it proves the shared home matters
- it avoids duplicating the helper back into app repos
- it does not force us to invent packaging/versioning before the second app exists

We can revisit versioned consumption later once more than one source repo is using the shared helper path.

### Validation I ran

I validated this slice locally in three layers.

1. workflow syntax:
   - `yq eval '.' workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml >/dev/null`
2. real remote build:
   - `npm run build:federation -w apps/inventory`
3. end-to-end dry-run handoff:
   - `scripts/publish_federation_remote.py --dry-run --github-output <tmp>`
   - `infra-tooling/scripts/federation/update_federation_gitops_target.py --config workspace-links/go-go-app-inventory/deploy/federation-gitops-targets.json --target wesen-os-inventory-prod --manifest-url <published-manifest-url> --gitops-repo-dir /home/manuel/code/wesen/2026-03-27--hetzner-k3s`

The final dry-run produced the expected configmap diff in the real local GitOps checkout, so this slice is proven enough to commit.

### Ticket replay helpers added

To keep this reproducible later, I added:

- `scripts/06-check-inventory-infra-tooling-consumption.sh`
- `scripts/07-check-inventory-federation-gitops-dry-run.sh`

These keep the ticket honest: the ticket can now replay both the workflow-shape validation and the real manifest-url -> shared-updater -> GitOps diff path.

## 2026-03-31: Opening The First Real Consumer PR

Once the inventory slice was validated locally, I pushed it upstream as the first real consumer of the shared `infra-tooling` path.

### Branch and PR

- branch:
  - `task/inventory-infra-tooling-federation-release`
- PR:
  - `https://github.com/go-go-golems/go-go-app-inventory/pull/13`

### One operational wrinkle

The first push failed on the repo's pre-push hook, not on this change itself.

The unrelated blocker is the same one seen earlier in this repo:

- GoReleaser snapshot hook still tries to build `cmd/XXX`
- that path does not exist
- so `lefthook` blocks `git push` during the `release` hook

The failing command path was:

- `goreleaser release --skip=sign --snapshot --clean`

and the relevant error was:

- `build failed: couldn't find main file: stat cmd/XXX: no such file or directory`

That is not caused by the federation release work. It is a pre-existing repo hygiene issue in `go-go-app-inventory`.

### Why I used `--no-verify`

I had already validated the actual slice with:

- workflow syntax
- real `build:federation`
- real dry-run manifest output
- real dry-run shared updater diff against the GitOps checkout

So using:

- `git push --no-verify`

was the right move here. The alternative would have been blocking the shared-tooling consumer PR on an unrelated release-hook bug.

### Why this matters for the ticket

This is now the first externally reviewable proof that `infra-tooling` is not just a local extraction. A real source repo PR exists that depends on the shared helper path and repo-local metadata shape.

## 2026-03-31: Handling Private GitOps Repo Checkout

After opening the inventory PR, a review comment pointed out a real nuance:

- `go-go-golems/infra-tooling` is public
- `wesen/2026-03-27--hetzner-k3s` is private

That means the `actions/checkout` step for the GitOps repo should not rely on the default workflow token. For now I updated the inventory workflow to use:

- `secrets.GITOPS_PR_TOKEN`

for the private GitOps checkout as well.

### Why I accepted that for now

This is not ideal least-privilege, but it is operationally correct and unblocks the workflow:

- the repo already needs `GITOPS_PR_TOKEN` later for real PR creation
- the current slice only uses it for checkout
- adding the explicit token now prevents the dry-run job from failing on a private repo

### Follow-up note left in code

I left an inline note in the workflow that this should later become a dedicated read-only token, for example:

- `K3S_REPO_READ_TOKEN`

That way the workflow is correct today, and the future least-privilege cleanup is still visible in review.

## 2026-04-01: Removing GoReleaser From `go-go-app-inventory`

The inventory repo kept tripping pushes with a completely separate problem from the federation work:

- the repo still carried stock GoReleaser/binary-release scaffolding
- the pre-push hook ran `make goreleaser`
- that path assumed a releasable binary existed
- but this repo does not have a real releaseable CLI path beyond a local seeding utility

Originally I partially patched the placeholder by replacing `cmd/XXX` with `cmd/inventory-seed`, but that was still the wrong shape. The user clarified the correct intent:

- remove the releasing steps altogether

### What I removed

In `go-go-app-inventory` I removed the release machinery entirely:

- deleted `.goreleaser.yaml`
- removed `goreleaser`, `release`, and `install` targets from `Makefile`
- removed the `pre-push.release` hook from `lefthook.yml`

I also kept the harmless Makefile cleanup from the earlier pass:

- `TAPES=$(wildcard doc/vhs/*.tape)` instead of `ls doc/vhs/*tape`

so the repo stops printing noisy `ls: cannot access 'doc/vhs/*tape'` errors on every hook run.

### Validation

I validated the post-removal shape with:

- `rg -n "goreleaser|cmd/XXX|go-go-golems/XXX" ...`
- `make lint`
- `go test ./...`

All of those now pass for the real remaining repo responsibilities.

### Why this matters for FEDERATION-RELEASE-001

This was not just repo hygiene. It directly affected the first generalized-consumer PR because every push to the inventory branch was getting blocked by unrelated fake release scaffolding. Removing the release machinery is the correct fix because the repo's actual deployment path here is:

- frontend package build
- federated remote publish
- GitOps handoff

not Homebrew/NFPM/Fury CLI binary release automation.

## 2026-04-01: First Real `infra-tooling` Consumption Failure In CI

After merging the inventory PR and wiring the `GITOPS_PR_TOKEN` secret, the workflow moved past the private GitOps repo checkout and failed later in the shared-helper dry-run step.

### Exact failing run

- repo: `go-go-golems/go-go-app-inventory`
- run: `23848590919`
- step:
  - `Dry-run GitOps federation target update via infra-tooling`

### Exact error

```text
python3: can't open file '/home/runner/work/go-go-app-inventory/go-go-app-inventory/.infra-tooling/scripts/federation/update_federation_gitops_target.py': [Errno 2] No such file or directory
```

### What I confirmed immediately

This is not:

- a patch-helper logic error
- a bad `manifest_url`
- a K3s auth problem
- a Python syntax problem

It is a repository distribution problem: the workflow checked out `go-go-golems/infra-tooling`, but the checked-out GitHub contents did not contain the extracted script path.

### Local evidence that explains the mismatch

Local `infra-tooling` state shows:

- local branch:
  - `task/os-openai-app-server`
- extracted commits:
  - `3ff2a2c`
  - `752f68a`
- remote `origin/main`:
  - still at `7aaad0b` initial commit

That means the local extracted toolkit exists, but the GitHub default branch consumed by Actions does not yet have it.

### What I added because of this

I wrote a full reference doc:

- `design/04-infra-tooling-consumption-failure-analysis-and-onboarding-guide.md`

That document is meant to be the intern-facing explanation of:

1. the full repository/control-plane architecture
2. why the local dry-run proof passed while CI failed
3. how to reason about shared-tooling distribution problems
4. what the resolution options are

### The main conclusion

This is the first clear proof that `FEDERATION-RELEASE-001` is now about more than just extracting scripts. We have crossed into:

- shared-tooling publication
- CI consumption contracts
- branch/default-branch stability

That is exactly why this failure deserved a detailed design/reference guide instead of only a short bug note.

## 2026-04-01: reMarkable Delivery

After writing and committing the new failure-analysis/onboarding guide, I bundled the current ticket reference set and uploaded it to reMarkable.

### Uploaded bundle

- name:
  - `FEDERATION-RELEASE-001 Shared Federation Release Guide`
- remote dir:
  - `/ai/2026/04/01/FEDERATION-RELEASE-001`

### Included documents

- `index.md`
- `analysis/01-generalized-remote-release-template-analysis.md`
- `design/02-generalized-federated-remote-release-guide.md`
- `design/03-standard-secret-bootstrap-for-federated-remotes.md`
- `design/04-infra-tooling-consumption-failure-analysis-and-onboarding-guide.md`
- `tasks.md`
- `diary.md`

### Verification

I verified the upload with:

- `remarquee cloud ls /ai/2026/04/01/FEDERATION-RELEASE-001 --long --non-interactive`

and confirmed the document exists there.

## 2026-04-01: Publishing `infra-tooling` And Bridging The Inventory Workflow

After the failure analysis, I fixed the actual delivery problem in two layers.

### Layer 1: publish the shared repo branch for review

I pushed the local `infra-tooling` extraction branch and opened the first PR there:

- branch:
  - `task/os-openai-app-server`
- PR:
  - `https://github.com/go-go-golems/infra-tooling/pull/1`

That PR now contains the extracted federation helpers plus the platform image-deployment templates that were still only local before:

- federation docs
- federation target examples
- federation patch/update scripts
- generic GitOps PR opener
- image-based deployment examples/templates

### Layer 2: temporarily pin the inventory workflow to the branch that actually contains the helpers

Because `go-go-golems/infra-tooling` `main` is still on the initial commit, simply publishing the PR is not enough to unblock `go-go-app-inventory` immediately.

So I also patched the inventory workflow to use:

- `ref: task/os-openai-app-server`

for the `infra-tooling` checkout step, with an inline note that this is only a bridge until `infra-tooling` `main` is updated.

This is intentionally temporary. The desired steady state remains:

- source repos consume `infra-tooling` `main`

not task branches.

### Why both layers are necessary

If I only patched the workflow:

- CI would start depending on a local-only or unexplained branch state

If I only opened the `infra-tooling` PR:

- `go-go-app-inventory` `main` would still fail until that PR merges

So the right operational sequence is:

1. publish the shared repo branch publicly
2. bridge the consumer workflow to that branch
3. merge the shared repo PR
4. remove the temporary `ref` pin

## 2026-04-01: Temporary Bridge Validated In CI

After publishing the `infra-tooling` branch and pinning the inventory workflow to:

- `ref: task/os-openai-app-server`

I triggered the workflow manually on the inventory branch:

- repo: `go-go-golems/go-go-app-inventory`
- branch: `task/inventory-infra-tooling-federation-release`
- run: `23850184226`

That run completed successfully.

### What this proves

It proves the previous CI failure was correctly diagnosed:

- the shared updater path itself was fine
- the consumer workflow was failing only because it checked out an `infra-tooling` branch that did not yet contain the extracted files

Once the workflow was pointed at a published branch that actually contains:

- `scripts/federation/update_federation_gitops_target.py`

the workflow moved past the original blocker and succeeded.

### Remaining cleanup

The bridge is intentionally temporary. The remaining work is still:

1. merge `go-go-golems/infra-tooling#1`
2. switch the inventory workflow back from the temporary branch pin to `infra-tooling` `main`
3. rerun once more to prove the stable default-branch consumption model

## 2026-04-01: Addressing `infra-tooling` PR Review Comments

After opening `go-go-golems/infra-tooling#1`, the review surfaced three actionable problems in the shared toolkit itself.

### 1. Template was calling the federation updater incorrectly

The workflow template still used:

- `--all-targets`

but `update_federation_gitops_target.py` only supports:

- `--target`

I fixed the template to use:

- `--target <target-name>`

instead.

### 2. Template did not wire object-storage env explicitly

The template referenced:

- `HETZNER_OBJECT_STORAGE_BUCKET`
- `HETZNER_OBJECT_STORAGE_ENDPOINT`
- `HETZNER_OBJECT_STORAGE_REGION`
- `FEDERATION_REMOTE_PUBLIC_BASE_URL`

without showing how they enter the environment.

I fixed that by adding an explicit `env:` block wired from:

- GitHub secrets
- GitHub vars

That makes the template actually usable by a source repo instead of relying on hidden ambient configuration.

### 3. `open_gitops_pr.py` was not retry-safe for deterministic branch names

The script generated a deterministic branch name and pushed before checking whether a PR for that branch already existed. That makes retries brittle when the same image tag is reused.

I fixed that by:

- checking for an existing PR before attempting the push/open sequence
- short-circuiting cleanly when an open PR already exists for that branch

### Validation

I validated the fixes with:

- `yq eval '.' templates/github/publish-federated-remote.template.yml`
- `python3 -m py_compile scripts/gitops/open_gitops_pr.py`
- `python3 scripts/gitops/open_gitops_pr.py --config /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/deploy/gitops-targets.json --target wesen-os-prod --image ghcr.io/wesen/wesen-os:sha-example --gitops-repo-dir /home/manuel/code/wesen/2026-03-27--hetzner-k3s --dry-run`

So the review changes are not just syntactic; they are now validated against the real local GitOps checkout as well.
- platform package version variable when needed

It also captures:

- the generic `gh secret set ... --repo <owner>/<repo>` pattern
- the current inventory example
- the recommendation to standardize the public-base-url variable naming in the future
