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
