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
