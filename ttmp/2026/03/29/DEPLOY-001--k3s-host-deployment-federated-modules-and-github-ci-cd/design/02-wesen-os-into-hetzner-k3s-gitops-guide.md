# Moving `wesen-os` Into The Hetzner K3s GitOps Repo

## 1. Why This Guide Exists

The first implementation pass for `DEPLOY-001` proved the host-side pieces inside the `wesen-os` repository:

- a production Dockerfile
- a local smoke path
- a GHCR publish workflow
- an initial Kubernetes manifest set
- a staging deploy workflow

That was the right first move because it made the host deployable in principle.

It is not the final ownership model.

After reading the Hetzner K3s repository docs, the correct long-term structure is clearer:

- `wesen-os` should remain the source repository that builds and publishes the host artifact
- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s` should be the canonical cluster-side GitOps repository that declares how `wesen-os` runs on the cluster

This guide explains that split and gives an implementation plan for migrating the Kubernetes deployment ownership into the K3s repo without losing the work already done.

## 2. The Canonical Model From The K3s Repo

The Hetzner repo is explicit about the control-plane split.

Key sources:

- [README.md](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/README.md)
- [docs/source-app-deployment-infrastructure-playbook.md](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md)
- [docs/public-repo-ghcr-argocd-deployment-playbook.md](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/public-repo-ghcr-argocd-deployment-playbook.md)
- [docs/app-packaging-and-gitops-pr-standard.md](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md)
- [docs/argocd-app-setup.md](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/argocd-app-setup.md)

The cluster repo’s operating model is:

```text
source repo
  -> test and build in CI
  -> publish immutable image to GHCR
  -> open GitOps PR against infra repo
  -> reviewer merges
  -> Argo CD reconciles cluster
  -> Kubernetes rolls the workload
```

That means:

- the source repo owns code, tests, Docker packaging, image publishing, and GitOps PR automation
- the GitOps repo owns Kubernetes manifests, namespace topology, ingress, runtime secret/config shape, and the pinned image reference
- the cluster owns the actual rollout and runtime behavior

## 3. What This Means For `wesen-os`

`wesen-os` should own:

- [Dockerfile](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/Dockerfile)
- [publish-host-image.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/.github/workflows/publish-host-image.yml)
- [deploy-host-to-k3s.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/.github/workflows/deploy-host-to-k3s.yml) as a temporary bridge or operator helper
- future `deploy/gitops-targets.json`
- future GitOps PR updater script

The Hetzner K3s repo should own:

- `gitops/kustomize/wesen-os/...`
- `gitops/applications/wesen-os.yaml`
- cluster hostname/TLS shape
- namespace ownership
- pull-secret strategy if the GHCR package is private
- runtime config shape for the deployed host

The implication is simple:

- the Kubernetes manifests that were first authored in `wesen-os/deploy/k8s/wesen-os` are useful as a draft
- but the canonical manifests should move into the Hetzner GitOps repo

## 4. The Existing GitOps Layout We Need To Fit Into

The K3s repo uses this pattern:

```text
gitops/
  applications/
    <app>.yaml
  kustomize/
    <app>/
      namespace.yaml
      deployment.yaml
      service.yaml
      ingress.yaml
      kustomization.yaml
      ...
```

Examples:

- [gitops/kustomize/pretext](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/pretext)
- [gitops/kustomize/artifacts](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/artifacts)
- [gitops/kustomize/coinvault](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/coinvault)
- [gitops/applications/pretext.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/pretext.yaml)
- [gitops/applications/coinvault.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/coinvault.yaml)

Important conventions:

- Kustomize is the preferred current deployment format.
- The Argo `Application` points at the Kustomize path in this repo.
- Public stateless apps use simple namespace/deployment/service/ingress packages.
- More complex apps layer in service accounts, Vault/VSO integration, bootstrap jobs, and persistent volumes.

For `wesen-os`, the first reasonable category is:

- public stateless-ish app with mounted config

Not yet:

- Vault/VSO-heavy private-secrets app
- database bootstrap job app
- shared data service

## 5. The Recommended Migration Sequence

Do the migration in this order.

### Step 1: Preserve the app-side artifact pipeline in `wesen-os`

Keep and refine:

- Docker build
- image smoke validation
- GHCR publish workflow

Do not move those into the cluster repo.

Why:

- the K3s docs are clear that the source repo owns packaging and publishing
- the GitOps repo should not become a build system

### Step 2: Move the canonical Kubernetes package into the Hetzner repo

Create:

```text
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/
  namespace.yaml
  configmap.yaml
  deployment.yaml
  service.yaml
  ingress.yaml
  kustomization.yaml
```

This package should be adapted from the draft manifests currently in:

- [deploy/k8s/wesen-os](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/deploy/k8s/wesen-os)

but normalized to the cluster repo’s patterns:

- namespace manifest
- Argo sync-wave annotations where appropriate
- `ingressClassName: traefik`
- `cert-manager.io/cluster-issuer: letsencrypt-prod`
- explicit labels matching the repo’s conventions

### Step 3: Keep the package safe before it is live

Before adding an Argo `Application`, render it locally:

```bash
cd /home/manuel/code/wesen/2026-03-27--hetzner-k3s
kubectl kustomize gitops/kustomize/wesen-os
```

Why:

- this lets us land the package safely in Git before the live cluster starts reconciling it
- the K3s docs explicitly recommend local render validation before pointing Argo at a path

### Step 4: Decide the GHCR pull strategy

The docs draw a hard line here:

- public repo + public package: simplest path
- private package: needs a pull-secret pattern

For `wesen-os`, answer this before enabling Argo rollout:

1. Will `ghcr.io/wesen/wesen-os` be publicly pullable?
2. If not, will we:
   - make it public
   - add a pull secret in the cluster repo
   - or use a temporary node-local import bridge

Long-term recommendation:

- if possible, keep the host image public and avoid unnecessary pull-secret complexity

If private pulls are required later, follow the same category-2 pattern used by apps such as CoinVault:

- `ServiceAccount`
- image pull secret
- Vault/VSO integration if credentials should be centrally managed

### Step 5: Decide the runtime config source in GitOps terms

The deployed host needs:

- `--profile default`
- `--profile-registries <path>`
- `--arc-enabled=false` for the first image

In the K3s repo that should become:

- a `ConfigMap` for the initial profile registry file
- possibly later a Vault/VSO-managed secret if the config becomes sensitive

For now, the simplest safe form is:

- mounted `ConfigMap`
- deployment args pointing at `/config/profiles.runtime.yaml`

### Step 6: Add the Argo `Application`

Once the package renders and the image reference strategy is clear, add:

```text
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/wesen-os.yaml
```

Pattern:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: wesen-os
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  destination:
    server: https://kubernetes.default.svc
    namespace: wesen-os
  source:
    repoURL: https://github.com/wesen/2026-03-27--hetzner-k3s.git
    targetRevision: main
    path: gitops/kustomize/wesen-os
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

Why delay this step:

- once the `Application` exists, the cluster will try to deploy the workload
- we want the manifests and image-pull strategy settled first

### Step 7: Normalize the image pinning model

The cluster repo docs strongly prefer immutable image pins in GitOps.

That means:

- publishing convenience tags such as `main` is fine
- the GitOps deployment should eventually pin a concrete SHA tag or digest

Recommended progression:

1. bootstrap with `ghcr.io/wesen/wesen-os:sha-<sha>` if digest plumbing is not ready
2. move to digest pinning in GitOps once the first real GHCR push is verified

### Step 8: Add source-repo GitOps target metadata

Once the K3s-side manifest path is real, add to `wesen-os`:

```text
deploy/gitops-targets.json
scripts/open_gitops_pr.py
```

The target should point at the K3s repo and the `wesen-os` deployment manifest there.

Conceptually:

```json
{
  "targets": [
    {
      "name": "wesen-os-staging",
      "gitops_repo": "wesen/2026-03-27--hetzner-k3s",
      "gitops_branch": "main",
      "manifest_path": "gitops/kustomize/wesen-os/deployment.yaml",
      "container_name": "wesen-os"
    }
  ]
}
```

### Step 9: Let CI open GitOps PRs instead of deploying directly

The desired steady state is:

- `wesen-os` CI builds and publishes the image
- `wesen-os` CI opens a PR against the Hetzner repo
- the GitOps repo merge becomes the reviewable deployment decision
- Argo reconciles after merge

That matches the K3s repo’s documented standard and keeps runtime state reviewable in Git.

## 6. What Should Stay In `wesen-os`

These should stay in the source repo:

- Dockerfile
- image build and smoke scripts
- GHCR publish workflow
- artifact provenance and metadata logic
- deployment target metadata
- GitOps PR automation
- local/dev deployment helpers if useful

These should become secondary or draft-only in `wesen-os`:

- the current `deploy/k8s/wesen-os/` package

Once the cluster repo package exists, the `wesen-os` copy should be treated as:

- a migration draft
- or removed if it risks drift

## 7. What Should Move To The Hetzner Repo

These should be canonical there:

- namespace manifest
- deployment manifest
- service manifest
- ingress manifest
- runtime config configmap
- optional pull-secret/serviceaccount plumbing
- Argo `Application`

## 8. Recommended First Execution Slices

The safest implementation order is:

1. Add this guide and expand `DEPLOY-001` tasks.
2. Create `gitops/kustomize/wesen-os/` in the Hetzner repo.
3. Render-validate it with `kubectl kustomize`.
4. Decide public vs private GHCR pull mode.
5. Add `gitops/applications/wesen-os.yaml`.
6. Run the first GHCR publish.
7. Roll the first staging deployment through Argo.
8. Add `deploy/gitops-targets.json` and GitOps PR automation in `wesen-os`.

## 9. Pseudocode For The Final Delivery Loop

```text
on push to main in wesen-os:
  run tests
  build host image
  push ghcr image with immutable tag
  open PR in hetzner-k3s repo:
    update gitops/kustomize/wesen-os/deployment.yaml image field

on merge in hetzner-k3s repo:
  Argo CD notices git change
  Argo syncs gitops/kustomize/wesen-os
  Kubernetes rolls Deployment
  staging URL serves new host version
```

## 10. Concrete File Targets

### In `wesen-os`

- [Dockerfile](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/Dockerfile)
- [publish-host-image.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/.github/workflows/publish-host-image.yml)
- future:
  - `deploy/gitops-targets.json`
  - `scripts/open_gitops_pr.py`

### In Hetzner K3s repo

- new:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/*`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/wesen-os.yaml`

### Reference examples in Hetzner K3s repo

- [gitops/kustomize/pretext](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/pretext)
- [gitops/kustomize/artifacts](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/artifacts)
- [gitops/applications/pretext.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/pretext.yaml)
- [gitops/applications/artifacts.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/artifacts.yaml)

## 11. Bottom Line

The Kubernetes ownership should move to the Hetzner GitOps repo.

The source repo should keep building and publishing the host artifact.

The cluster repo should become the source of truth for how `wesen-os` runs.

That is the clean split the K3s docs are already teaching, and it is the right path to standardize now before Module Federation adds another layer of deployment complexity.
