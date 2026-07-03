---
Title: Raw findings — k3s deployment of wesen-os.yolo.scapegoat.dev
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - wesen-os
    - deployment
DocType: reference
Intent: short-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Raw evidence sweep of /home/manuel/code/wesen/2026-03-27--hetzner-k3s: cluster shape, Argo CD gitops layout, wesen-os manifests, GHCR build pipeline, rollout procedure."
LastUpdated: 2026-07-03T12:30:00-07:00
WhatFor: "Provenance for the deployment sections of the main design doc."
WhenToUse: "When verifying or extending deployment claims in the design doc."
---

# Raw findings — k3s deployment (Explore agent report, 2026-07-03)

## 1. Cluster shape (Terraform)

Repo: `/home/manuel/code/wesen/2026-03-27--hetzner-k3s`

- **`main.tf`** — Single Hetzner Cloud node via `hcloud_server.node`. Provider `hetznercloud/hcloud ~> 1.49` (`versions.tf`). One `hcloud_ssh_key`, one `hcloud_firewall` (open 80/443 to world; 22 + optional 6443 restricted to `admin_cidrs`; also 5222 and 40000-40100 for XMPP). Server labels `role=k3s`, `stack=argocd-demo`. `lifecycle.ignore_changes = [user_data]` so re-applying does not reboot/reprovision.
- **`variables.tf` + `terraform.tfvars`** — Live values: `server_type = cpx42`, image default `ubuntu-24.04`, location default `fsn1`, `base_domain = scapegoat.dev`, `app_subdomain = k3s`, `acme_email = wesen@ruinwesen.com`, `allow_kube_api = false`, `repo_url = https://github.com/wesen/2026-03-27--hetzner-k3s.git`, `repo_revision = main`. **Note: `terraform.tfvars` contains a live-looking `hcloud_token` and `postgres_password` in plaintext.** Backups enabled (`server_backups_enabled = true`). k3s version unpinned (stable channel); `cert_manager_version = v1.20.0`.
- **k3s install method** — `cloud-init.yaml.tftpl` runs `/usr/local/bin/bootstrap-k3s-demo.sh` on first boot: installs Tailscale (but does NOT run `tailscale up` — done manually on the live node), writes `/etc/rancher/k3s/config.yaml`, installs k3s via `curl -sfL https://get.k3s.io`, then installs cert-manager (static manifest), installs Argo CD (`kubectl apply -n argocd -f stable/manifests/install.yaml`), imports a locally built demo image via `k3s ctr images import`, and applies a bootstrap Argo CD Application. So: **k3s + built-in Traefik + cert-manager + Argo CD, single node, non-HA.**
- **Tailscale** — Present for day-2 admin access. See `docs/tailscale-k3s-admin-access-playbook.md`, `scripts/get-kubeconfig-tailscale.sh`, `.envrc` (`kcfg-refresh`/`kcfg-use`).
- **Kubeconfigs in repo root**: `kubeconfig-91.98.46.169.yaml` (public IP), `kubeconfig-k3s-demo-1.tail879302.ts.net.yaml` (tailnet), `.cache/kubeconfig-tailnet.yaml`.

## 2. GitOps — Argo CD (not Flux)

`gitops/` layout: `applications/` (Argo `Application` CRs), `projects/` (`AppProject`s), `kustomize/<app>/` (per-app manifests), `charts/demo-stack` (Helm chart used only by TF bootstrap demo).

**wesen-os deployment definition** (all under `gitops/kustomize/wesen-os/`):

- **`gitops/applications/wesen-os.yaml`** — Argo `Application` `wesen-os`, `project: demo-apps`, source `path: gitops/kustomize/wesen-os` on repo `wesen/2026-03-27--hetzner-k3s@main`, destination namespace `wesen-os`. `syncPolicy.automated` with `prune: true`, `selfHeal: true`, `CreateNamespace=true`, `ServerSideApply=true`. Labels: `has-database=false`, `has-persistent-storage=false`, `has-ingress=true`.
- **`gitops/projects/demo-apps.yaml`** — AppProject `demo-apps` whitelists namespace `wesen-os` (among others).
- **`namespace.yaml`** — namespace `wesen-os`.
- **`deployment.yaml`** — Deployment `wesen-os`, **image `ghcr.io/wesen/wesen-os:sha-13ce252`** (current pinned tag), `imagePullPolicy: IfNotPresent`, 1 replica. Args: `--addr=:8091 --arc-enabled=false --profile=default --profile-registries=/config/profiles.runtime.yaml --federation-registry=/config/federation.registry.json`. Probes hit `/api/os/apps` and `/`. Resources 250m/512Mi → 1cpu/1Gi.
- **Volumes / persistence** — `launcher-config` = configMap `wesen-os-config`; `launcher-data` mounted at `/app/data` is an **`emptyDir` (ephemeral — no SQLite persistence; data lost on pod restart)**. No PVC.
- **`service.yaml`** — ClusterIP `wesen-os`, port 80 → targetPort `http` (8091).
- **`ingress.yaml`** — `ingressClassName: traefik`, host **`wesen-os.yolo.scapegoat.dev`**, TLS secret `wesen-os-tls`, annotation `cert-manager.io/cluster-issuer: letsencrypt-prod`.
- **TLS** — cert-manager `ClusterIssuer` `letsencrypt-prod` in `gitops/kustomize/platform-cert-issuer/clusterissuer.yaml` (ACME, HTTP01 over Traefik).
- **Config / env** — `kustomization.yaml` `configMapGenerator` produces `wesen-os-config` from `config/profiles.runtime.yaml` (default AI engine `gpt-4.1-mini`) and `config/federation.registry.json` (two remote-manifest federation remotes — `inventory` and `sqlite` — served from Hetzner object storage `scapegoat-federation-assets.fsn1.your-objectstorage.com`). **No Secret is wired into the wesen-os Deployment** — no env vars, no OpenAI key mount in GitOps manifests.

## 3. Image build + publish pipeline

Source repo: `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os` (GitHub `wesen/wesen-os`).

- **`Dockerfile`** — Multi-stage: `golang:1.26.1` toolchain copied into `node:22` builder, `CGO_ENABLED=1`, `pnpm install --frozen-lockfile`, `npm run launcher:binary:build` produces `build/wesen-os-launcher`; runtime stage `debian:bookworm-slim` with tini, non-root user `app`, exposes 8091, entrypoint runs the launcher binary. (`scripts/build-wesen-os-launcher.sh` is the build helper.)
- **CI publish** — `.github/workflows/publish-host-image.yml`: on push to `main` (path-filtered) builds and pushes **`ghcr.io/wesen/wesen-os`** with tags `sha-<short>`, `main`, `latest` (docker/metadata-action). `linux/amd64`, GHA cache.
- **GitOps handoff** — Second job `gitops-pr` runs `python3 scripts/open_gitops_pr.py --config deploy/gitops-targets.json --all-targets --image ghcr.io/wesen/wesen-os:sha-<short> --push --open-pr` using `secrets.GITOPS_PR_TOKEN`. `deploy/gitops-targets.json` target `wesen-os-prod` → gitops repo `wesen/2026-03-27--hetzner-k3s`, branch `main`, `manifest_path: gitops/kustomize/wesen-os/deployment.yaml`, `container_name: wesen-os`. CI opens a PR bumping the image tag; Argo auto-syncs after merge. History: `16fdadf chore(wesen-os-prod): bump wesen-os to sha-13ce252`, `97d2b5d ... sha-287a3b5`.
- **Alternate/manual deploy** — `.github/workflows/deploy-host-to-k3s.yml` (`workflow_dispatch`, `environment: staging`): decodes `KUBECONFIG_B64`, `kubectl apply -k deploy/k8s/wesen-os`, `kubectl set image` + `rollout status`. Uses the source repo's own `deploy/k8s/wesen-os/*` copy which is **stale** (placeholder `host: wesen-os.example.com`, `image: ghcr.io/wesen/wesen-os:main`) and bypasses Argo. Authoritative live definition = k3s repo's `gitops/kustomize/wesen-os/`.
- **Shared tooling** — `/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling` (branch `task/federation-publish-helper`): `README.md` documents "source-repo → GitOps PR" and "federation remote release" flows. Helpers: `.github/workflows/publish-ghcr-image.yml`, `templates/github/publish-image-ghcr.template.yml`, `actions/open-gitops-pr/`, `scripts/gitops/open_gitops_pr.py`, `scripts/gitops/validate_gitops_targets.py`, `scripts/federation/*` (publish_federation_remote.py, patch_federation_registry_target.py, open_federation_gitops_pr.py). wesen-os's `scripts/open_gitops_pr.py` is the vendored version.

## 4. Other apps on the cluster

From `gitops/applications/` (41 apps), same Argo Application + per-app kustomize pattern:
- **Demo-apps**: wesen-os, goja-kanban, artifacts, codebase-browser, draft-review, goja-auth-host-demo, go-go-course-workshops, atproto glossary (appview/go/node).
- **Prod apps**: coinvault, go-go-host, hair-booking, herold, xmpp, pyxis, foocamp-browse, retro-obsidian-publish, hello-world-workshops.
- **Static sites**: static-sites-host, dmeta-examples, go-go-os-examples, docs-yolo, rag-evaluation-storybook(+page).
- **Data services**: postgres, mysql, redis.
- **Platform-infra**: vault (+vault-secrets-operator, vault-backup, vault-kubernetes-auth), keycloak, monitoring/monitoring-extras/loki, traefik-observability, platform-cert-issuer, argocd-public, bluesky-pds.

## 5. Most relevant docs (k3s repo `docs/`)

1. `docs/app-deployment-pipeline.md` — end-to-end app deploy pipeline; classifies wesen-os as stateless demo app.
2. `docs/app-deployment-examples.md`
3. `docs/argocd-app-setup.md`
4. `docs/kustomize-generated-config-rollout-pattern.md` — the configMapGenerator pattern wesen-os uses.
5. `docs/cluster-architecture-overview.md` — lists `wesen-os → wesen-os.yolo.scapegoat.dev` (~line 272).
6. `docs/hetzner-k3s-server-setup.md`
7. `docs/tailscale-k3s-admin-access-playbook.md`
8. `docs/app-runtime-secrets-and-identity-provisioning-playbook.md` — how to add runtime secrets/API keys.
9. `docs/static-site-packaging-and-gitops-playbook.md`
10. `docs/operator-troubleshooting-faq.md`

Also: `ttmp/2026/05/26/K3S-OBS-MAINT--.../sources/inventory-*` (live cluster inventory naming wesen-os), `ttmp/2026/06/06/ARGOFCD-REORG--.../` (Argo app reorg).

## 6. "yolo" environment & DNS

- `yolo` is the single environment for this cluster: every app exposed at `<app>.yolo.scapegoat.dev`. `demo-apps` vs `prod-apps` is a criticality tier (Argo AppProject), not separate DNS/cluster. The `deploy-host-to-k3s.yml` `environment: staging` is only a GitHub environment label.
- DNS (README step 4): wildcard `*.yolo.scapegoat.dev → <server IPv4>` A record plus `k3s.scapegoat.dev`. Traefik routes by Host header; cert-manager issues per-host LE certs via HTTP01.

## 7. Shipping a new version today (procedure)

1. Merge change to `wesen/wesen-os` `main`.
2. `publish-host-image.yml` builds/pushes `ghcr.io/wesen/wesen-os:sha-<short>` and auto-opens a bump PR on `wesen/2026-03-27--hetzner-k3s` (requires `GITOPS_PR_TOKEN`).
3. Review/merge that PR (edits the `image:` line, like commit `16fdadf`).
4. Argo CD auto-syncs and rolls the Deployment; verify `kubectl -n wesen-os rollout status deployment/wesen-os` and `https://wesen-os.yolo.scapegoat.dev/api/os/apps`.
   - Manual fallback: `gh workflow run deploy-host-to-k3s.yml -f image_ref=...` (imperative, Argo self-heal later reverts), or edit the tag directly in `gitops/kustomize/wesen-os/deployment.yaml`.

## 8. Caveats flagged

- (a) `terraform.tfvars` holds plaintext `hcloud_token` + `postgres_password`.
- (b) wesen-os has no persistent volume and no secret injection in GitOps — anything requiring an OpenAI key or SQLite durability needs a Secret + PVC added.
- (c) source repo's `deploy/k8s/wesen-os/` copy is stale and not the source of truth.
