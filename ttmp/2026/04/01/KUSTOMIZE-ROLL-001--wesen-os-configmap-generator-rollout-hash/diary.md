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
