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
