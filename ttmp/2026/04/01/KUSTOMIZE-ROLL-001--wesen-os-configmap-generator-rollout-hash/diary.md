# Diary

## 2026-04-01: Ticket Creation

This ticket was created immediately after the first live federated-remote rollout for `wesen-os`.

The production symptom was clear:

1. the GitOps `ConfigMap` had the new `federation.registry.json`
2. Argo had reconciled the manifest
3. but `https://wesen-os.yolo.scapegoat.dev/api/os/federation-registry` still served the old manifest URL

The reason was the current Deployment shape:

- the config files are mounted with `subPath`
- `subPath` mounts do not hot-update inside a running pod when the backing `ConfigMap` changes

So even though the cluster desired state was correct, the running pod still had the old file content until a manual rollout restart happened.

This ticket exists to replace that fragile operational behavior with a Kustomize-native rollout trigger pattern and, at the same time, document Kustomize well enough that a new intern can understand what the package is doing and why.

The guide in this ticket is intentionally tied to the real package:

- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os`

instead of teaching Kustomize in the abstract.

I also added:

- `scripts/01-audit-current-wesen-os-kustomize.sh`

to replay the current package shape and verify the starting point before any implementation work begins.

After writing the ticket bundle, I uploaded it to reMarkable as:

- `KUSTOMIZE-ROLL-001 Kustomize Config Generator Guide`

under:

- `/ai/2026/04/01/KUSTOMIZE-ROLL-001`

and verified the upload with:

- `remarquee cloud ls /ai/2026/04/01/KUSTOMIZE-ROLL-001`

## 2026-04-01: Breaking The Refactor Into Real Implementation Slices

Before changing the live Kustomize package, I tightened the task list into actual implementation checkpoints rather than leaving it at a design-outline level.

That matters because this refactor has two distinct risks:

1. changing the rendered Kubernetes objects
2. changing the runtime mount behavior inside the container

So the execution plan now explicitly separates:

- design decisions
- K3s package edits
- render validation
- later Argo/rollout validation

The first code slice I am taking is intentionally narrow:

- create real config source files
- switch to `configMapGenerator`
- preserve the sync-wave annotation
- replace `subPath` mounts with a `/config` directory mount
- validate the rendered output before any GitOps rollout happens

That is the right boundary because it proves the Kustomize mechanics first without mixing in cluster debugging yet.

## 2026-04-01: First K3s Package Refactor Slice

I created a dedicated K3s feature branch for this work:

- `task/kustomize-roll-001-wesen-os-config-generator`

Then I applied the first implementation slice directly to:

- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os`

### What changed

I converted the package from a handwritten inline ConfigMap to generator-backed source files:

- added:
  - `config/profiles.runtime.yaml`
  - `config/federation.registry.json`
- updated:
  - `kustomization.yaml`
  - `deployment.yaml`
- removed:
  - `configmap.yaml`

### Exact design choices used

I intentionally chose the clean Kustomize-native shape described in the guide:

1. `configMapGenerator` with logical name:
   - `wesen-os-config`
2. `generatorOptions.annotations` to preserve:
   - `argocd.argoproj.io/sync-wave: "0"`
3. Deployment still references the logical name:
   - `wesen-os-config`
4. Kustomize rewrites that to the generated hashed name
5. The container now mounts:
   - `/config`
   instead of two `subPath` file mounts

This preserves the runtime file paths the process already expects:

- `/config/profiles.runtime.yaml`
- `/config/federation.registry.json`

without keeping the `subPath` behavior that caused the stale live config problem.

### Validation

I validated the rendered output with:

- `kubectl kustomize gitops/kustomize/wesen-os`
- `git diff -- gitops/kustomize/wesen-os`

The rendered output showed the exact result we wanted:

- generated ConfigMap name:
  - `wesen-os-config-559tk88gt5`
- Deployment volume reference rewritten to:
  - `wesen-os-config-559tk88gt5`
- container args unchanged:
  - `--profile-registries=/config/profiles.runtime.yaml`
  - `--federation-registry=/config/federation.registry.json`
- volume mount now:
  - `mountPath: /config`

That means the rollout-triggering mechanism is now present at render time.

I also added a replay helper:

- `scripts/02-check-generated-configmap-rollout-shape.sh`

to make those assertions easy to re-run later without manually scanning the rendered YAML.

### Why this slice is important

This is the first point where the ticket has moved from “design advice” to an actual Kustomize-native implementation.

The important thing is that the change is still local and reviewable:

- no cluster mutation yet
- no Argo behavior assumptions yet
- just a clean rendered-package proof that the generated-name rollout mechanism now exists
