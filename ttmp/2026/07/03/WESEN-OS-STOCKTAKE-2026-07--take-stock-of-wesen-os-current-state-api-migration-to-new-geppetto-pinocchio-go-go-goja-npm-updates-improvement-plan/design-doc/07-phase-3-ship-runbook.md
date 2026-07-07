---
Title: Phase 3 ship runbook — deploy the migrated stack to k3s
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
DocType: design-doc
Intent: short-term
Owners: []
RelatedFiles:
    - Path: deploy/k8s/wesen-os/configmap.yaml
      Note: In-repo ConfigMap; profiles.runtime.yaml migrated to the new engineprofiles format (commit 8e3f3d2).
    - Path: .github/workflows/publish-host-image.yml
      Note: Builds+pushes the GHCR image on push to main and auto-opens a GitOps image-bump PR.
    - Path: .github/workflows/deploy-host-to-k3s.yml
      Note: workflow_dispatch direct deploy (kubectl apply -k deploy/k8s/wesen-os + set image).
    - Path: scripts/open_gitops_pr.py
      Note: Auto-PR patches ONLY the deployment image; it does NOT touch profiles.runtime.yaml.
ExternalSources:
    - Repo wesen/2026-03-27--hetzner-k3s — gitops/kustomize/wesen-os/{deployment.yaml,config/profiles.runtime.yaml,config/federation.registry.json}
Summary: Ordered, validated steps to ship the migrated wesen-os (new geppetto/pinocchio/sessionstream stack + react-chat inventory window) to the Hetzner k3s cluster, including the mandatory coupled config migration.
LastUpdated: 2026-07-03T00:00:00-07:00
WhatFor: Hand off the outward-facing production deploy after the code migration and the config-format fix were prepared and validated in-repo.
WhenToUse: When shipping the current feature branches to wesen-os.yolo.scapegoat.dev.
---

# Phase 3 ship runbook

## 0. Status / what is already done

- Code migration (Phases 0–2 + the inventory react-chat window, design-doc/06) is committed and pushed on branch `task/2026-07-os-launcher-published-npm-deps` (+ submodule `task/2026-07-upgrade-stack`).
- **Config-format blocker found and fixed in-repo** (commit 8e3f3d2): `deploy/k8s/wesen-os/configmap.yaml` `profiles.runtime.yaml` migrated from the legacy `runtime.step_settings_patch.ai-chat.ai-engine` layout to the new `profiles.default.inference_settings.chat.engine` layout, and the unsupported `default_profile_slug` key dropped.

## 1. The finding you must not skip

The geppetto v0.13.3 engineprofiles YAML decoder does **not** hard-error on the legacy layout — it **silently ignores** the unknown `runtime:` block, so the profile resolves to the geppetto default engine. Measured with the launcher's own resolver:

```bash
# built from this branch: go build -o /tmp/wl ./cmd/wesen-os-launcher/
/tmp/wl wesen-os-launcher --profile-registries=<file> --profile=default \
  --print-inference-settings --inventory-db=/tmp/i.db --timeline-db=/tmp/t.db --turns-db=/tmp/u.db
```

- Legacy layout (current prod GitOps `config/profiles.runtime.yaml`) → `engine: gpt-4` for both assistant and inventory. **Production is running gpt-4, not the intended gpt-4.1-mini.**
- New layout (this branch's configmap) → `engine: gpt-4.1-mini` for both. ✅

The prod GitOps copy `gitops/kustomize/wesen-os/config/profiles.runtime.yaml` in `wesen/2026-03-27--hetzner-k3s` still has the legacy bug and must be migrated (step 3).

Validated new-format content:

```yaml
slug: cluster-default
display_name: Cluster Default
profiles:
  default:
    slug: default
    display_name: Default
    description: Cluster default chat profile.
    inference_settings:
      chat:
        engine: gpt-4.1-mini
```

## 2. Deploy topology (so the coupling is clear)

Two config sources exist; know which is authoritative:

- **Authoritative (continuous):** Argo CD syncs `wesen/2026-03-27--hetzner-k3s` `gitops/kustomize/wesen-os/` with `prune:true, selfHeal:true`. Its `kustomization.yaml` configMapGenerator builds `wesen-os-config` from `config/profiles.runtime.yaml` + `config/federation.registry.json`. **This is prod.**
- **Manual (one-shot):** `deploy-host-to-k3s.yml` (workflow_dispatch) does `kubectl apply -k deploy/k8s/wesen-os` + `set image`. Argo self-heal will revert anything that diverges from the GitOps repo, so treat this as break-glass only.

Pipeline: push to `main` in `wesen/wesen-os` → `publish-host-image.yml` builds `ghcr.io/wesen/wesen-os:sha-<sha>` and runs `scripts/open_gitops_pr.py` → auto-opens a PR on the GitOps repo bumping **only** `deployment.yaml` image. The config migration is **not** automated — you add it to that PR.

**Coupling rule:** the new image expects the new config, and the current config silently downgrades the model. Ship image + config **together** in one GitOps PR. Do not migrate the prod config ahead of the image, and do not bump the image without the config.

## 3. Ordered steps

1. **Land the code on `main`.** Open + merge PRs for `task/2026-07-os-launcher-published-npm-deps` (wesen/wesen-os) and its submodule branch `task/2026-07-upgrade-stack` (go-go-app-inventory). The submodule must merge first, then the pointer bump lands with the parent.
2. **Image build.** The push to `main` triggers `publish-host-image.yml` → image `ghcr.io/wesen/wesen-os:sha-<new>` and an auto GitOps image-bump PR. (Or run `publish-host-image.yml` via workflow_dispatch with `push_image=true`.)
3. **Add the config migration to the GitOps PR.** In `wesen/2026-03-27--hetzner-k3s`, replace `gitops/kustomize/wesen-os/config/profiles.runtime.yaml` with the §1 new-format content, in the **same** PR that bumps the image. The configMapGenerator content-hash suffix forces a rollout on config change.
4. **Federation assets (verify).** The inventory remote UI changed (react-chat window). If inventory is served as a federated remote, rebuild its module-federation bundle and update `config/federation.registry.json` `manifestUrl` (`.../inventory/versions/sha-1a32286/...` → new sha) in the same PR. Confirm whether the inventory federation bundle is rebuilt by CI or must be published manually to object storage before merging.
5. **Merge the GitOps PR** → Argo CD auto-syncs → rollout. Watch: `kubectl -n wesen-os rollout status deploy/wesen-os`.
6. **Verify:** `GET /api/os/apps` healthy; open Assistant + Inventory chat; confirm no old-endpoint 404s and a prompt round-trips; `GET /api/apps/inventory/api/chat/profiles` returns the profiles.

## 4. Known follow-on (do not be surprised)

Real inference in prod still needs an **LLM API key** mounted — the ConfigMap carries none (Decision D8, Phase 5: secret injection per the cluster's `app-runtime-secrets-and-identity-provisioning-playbook.md`). After this ship, model resolution is correct (gpt-4.1-mini) but a prompt will fail with "no API key for openai" until the key Secret is provisioned. Ship the format fix now; provision the key in Phase 5.

## 5. Rollback

Revert the image tag in `gitops/kustomize/wesen-os/deployment.yaml` (and the config change if needed) → Argo re-syncs the prior image. The prior known-good image is `ghcr.io/wesen/wesen-os:sha-13ce252`.
