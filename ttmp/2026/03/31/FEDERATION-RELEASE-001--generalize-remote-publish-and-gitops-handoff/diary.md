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
- platform package version variable when needed

It also captures:

- the generic `gh secret set ... --repo <owner>/<repo>` pattern
- the current inventory example
- the recommendation to standardize the public-base-url variable naming in the future
