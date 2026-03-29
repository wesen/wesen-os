# Tasks

## Phase 0: Freeze The Deployment Model

- [ ] Confirm the three delivery planes are independent and intentional:
  - npm packages for build-time platform libraries
  - container images for deployable services
  - static assets for browser-time federation remotes
- [ ] Confirm the first production host remains `apps/os-launcher`.
- [ ] Confirm the first federated remote candidate:
  - recommended: `inventory`
  - alternatives: `sqlite` or another lower-risk app if inventory is still too broad
- [ ] Confirm the first runtime environments:
  - local development
  - staging
  - production
- [ ] Confirm naming and DNS layout:
  - host app domain
  - remote asset domain
  - API/backend domain
- [ ] Confirm the registry/storage split:
  - GitHub Packages for npm
  - GHCR for images
  - Hetzner Object Storage for remote manifests and chunks

## Phase 1: Containerize The Host

- [x] Audit the current host build surface, binary entrypoint, frontend embed path, and existing smoke/build scripts.
- [x] Make the root Go workspace self-contained inside this repository so CI and Docker builds do not depend on sibling checkouts outside the repo.
- [x] Add a production `Dockerfile` for the `wesen-os` host.
- [x] Decide that the first production image packages the combined Go launcher backend plus embedded frontend shell.
- [x] Add a `.dockerignore`.
- [x] Add a repo-local image build helper script under this ticket.
- [x] Produce deterministic frontend builds for `apps/os-launcher`.
- [x] Decide final image naming:
  - `ghcr.io/wesen/wesen-os:<git-sha>`
  - `ghcr.io/wesen/wesen-os:main`
  - release tags later
- [x] Add a local smoke command:
  - build image
  - run image
  - probe health or entry page
- [x] Document the runtime environment variables required by the host.

## Phase 2: Publish The Host Image To GHCR

- [x] Land `.github/workflows/publish-host-image.yml` on `wesen/wesen-os` `main` so GitHub registers the workflow.
- [x] Add a GitHub Actions workflow that:
  - checks out submodules
  - installs Node dependencies
  - builds the launcher
  - builds the Docker image
  - pushes to GHCR
- [x] Consolidate the host publish workflow to the same two-job model used by `draft-review`:
  - publish the image in the source repo
  - then open a GitOps PR against the K3s repo
- [x] Add `deploy/gitops-targets.json` to `wesen-os`.
- [x] Add `scripts/open_gitops_pr.py` to `wesen-os`.
- [x] Use immutable tags keyed by git SHA.
- [x] Optionally add mutable tags:
  - `main`
  - `staging`
  - `latest` only if explicitly desired
- [x] Add provenance/metadata labels.
- [x] Decide whether production deploys use tags or digests:
  - recommended: digests for deployment manifests
- [x] After the first real host image publish, verify the GHCR package is publicly pullable at the pinned image ref.
- [ ] Verify K3s can pull the GHCR image using its registry credentials.
- [ ] Run the new GitOps-PR job on GitHub and verify it opens or updates the expected PR against `wesen/2026-03-27--hetzner-k3s`.

## Phase 3: Define K3s Deployment For The Host

- [x] Create a deployment directory:
  - recommended: `deploy/k8s/wesen-os/`
- [x] Add:
  - `deployment.yaml`
  - `service.yaml`
  - `ingress.yaml`
  - `configmap.yaml`
  - `secret.example.yaml` or external secret wiring docs
- [x] Decide whether to use raw manifests, Kustomize, or Helm:
  - recommended: Kustomize if the setup stays modest
  - Helm if cross-environment templating becomes substantial
- [x] Add health endpoints or other probe targets for readiness/liveness.
- [x] Decide where host config lives:
  - environment variables
  - config file mounted from ConfigMap
  - generated remote registry JSON
- [x] Add a GitHub Actions deployment workflow that applies manifests to staging.
- [ ] Add manual approval or environment protection before production rollout.
- [ ] Demote `.github/workflows/deploy-host-to-k3s.yml` to a documented break-glass/manual operator path rather than the normal release path.

## Phase 3B: Move Canonical Host GitOps Into Hetzner K3s Repo

- [x] Push the Hetzner K3s repo branch that contains the new `wesen-os` package and Argo `Application`, then open a PR there.
- [x] Add a `wesen-os` Kustomize package under:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/`
- [x] Normalize that package to repo conventions:
  - `namespace.yaml`
  - `configmap.yaml`
  - `deployment.yaml`
  - `service.yaml`
  - `ingress.yaml`
  - `kustomization.yaml`
- [x] Render-validate the new package with:
  - `kubectl kustomize gitops/kustomize/wesen-os`
- [x] Decide whether the cluster will pull `ghcr.io/wesen/wesen-os` publicly or via image pull secret.
- [ ] If private pull is required, add the cluster-side service account / pull-secret pattern in the Hetzner repo.
- [x] Add:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/wesen-os.yaml`
- [x] Validate Argo ownership shape before enabling live sync:
  - source path
  - destination namespace
  - sync policy
- [x] Once the first real GHCR image exists, pin the K3s deployment to an immutable image ref.
- [ ] Decide whether to remove or demote the draft manifests in `wesen-os/deploy/k8s/wesen-os/` after the K3s repo becomes canonical.
- [ ] Merge the pinned-image `wesen-os` GitOps PR in `/home/manuel/code/wesen/2026-03-27--hetzner-k3s` after the deployment manifest is updated away from `:main`.

## Phase 4: Define The Federation Contract

- [ ] Decide the remote loading format:
  - Module Federation manifest (`mf-manifest.json`) preferred
  - `remoteEntry.js` only if manifest mode is not workable in current tooling
- [ ] Freeze the minimum remote contract:
  - remote id
  - version
  - manifest URL
  - exposed entrypoint(s)
  - compatible platform package range
  - shared singleton policy
  - health/status metadata
- [ ] Freeze the host contract:
  - how remotes are registered
  - how they expose their launcher entry
  - what happens on timeout or load failure
  - how auth/session context reaches the remote
- [ ] Decide which dependencies are shared singletons:
  - `react`
  - `react-dom`
  - possibly `redux` / `react-redux`
  - possibly selected `@go-go-golems/os-*` packages
- [ ] Decide how remote capability metadata is stored:
  - static registry JSON
  - generated registry from CI
  - backend-served registry

## Phase 5: Build The First Federated Remote

- [ ] Pick the first remote repo.
- [ ] Add module federation build configuration there.
- [ ] Add a stable exposed entrypoint for the host:
  - for example `./launcher`
- [ ] Ensure the remote no longer depends on sibling-source aliases.
- [ ] Build a versioned manifest plus chunks.
- [ ] Add a local dev mode that still works before full CDN/K3s rollout.
- [ ] Validate the host can load the remote in a local or staging environment.

## Phase 6: Host Remote Assets On Hetzner Object Storage

- [ ] Define bucket/container layout, for example:
  - `remotes/<remote-id>/<version>/mf-manifest.json`
  - `remotes/<remote-id>/<version>/assets/*`
- [ ] Configure CORS for the host domain.
- [ ] Set caching policy:
  - immutable cache headers on versioned assets
  - short-lived cache or no-cache on moving aliases, if any
- [ ] Decide whether to expose a moving alias like `stable/current`.
- [ ] Add a GitHub Actions workflow in each remote repo that uploads remote assets after build.
- [ ] Add rollback rules:
  - old versions remain available
  - host registry can be flipped back to an older manifest URL

## Phase 7: Teach The Host To Load Remotes Dynamically

- [ ] Add a remote registry loader to `apps/os-launcher`.
- [ ] Decide remote registry source:
  - static JSON shipped with the host
  - environment-generated JSON
  - backend-served config endpoint
- [ ] Add client-side timeout/retry/failure UI.
- [ ] Add tracing/logging so remote load failures are diagnosable.
- [ ] Add feature flags so staging can enable a remote before production.
- [ ] Add a degraded mode when a remote is absent:
  - hide launcher entry
  - show unavailable state
  - fallback to built-in module only where explicitly intended

## Phase 8: End-To-End CI/CD

- [ ] Platform package workflow:
  - publish `@go-go-golems/os-*` packages
- [ ] Host image workflow:
  - build and push `wesen-os` image
- [ ] Host deploy workflow:
  - apply K3s manifests
- [ ] Remote asset workflow:
  - build federation remote
  - upload to Hetzner
- [ ] Runtime verification workflow:
  - deploy to staging
  - probe host
  - probe remote registry
  - load first remote
- [ ] Add promotion workflow from staging to production.

## Phase 9: Operational Hardening

- [ ] Add version compatibility checks between host and remote.
- [ ] Add rollback playbooks for:
  - bad npm package publish
  - bad GHCR image
  - bad remote asset rollout
  - bad remote registry config
- [ ] Add monitoring/alerts for:
  - host unavailable
  - remote manifest fetch failures
  - remote chunk load failures
  - backend API failures
- [ ] Add runbooks for credential rotation:
  - GitHub tokens
  - GHCR auth
  - Hetzner object storage credentials
  - K3s kubeconfig or deploy credentials

## Phase 10: Documentation And Onboarding

- [ ] Keep this ticket guide current as architecture becomes concrete.
- [ ] Add repo-local READMEs for Docker/K3s/federation operations.
- [ ] Add an intern-focused walkthrough for:
  - package plane
  - image plane
  - remote asset plane
- [ ] Add diagrams showing the final flow from merge to running system.
- [ ] Update the Hetzner K3s repo docs to make the core handoff explicit:
  - source repo CI publishes image
  - CI opens GitOps PR
  - reviewer merges GitOps PR
  - Argo CD syncs cluster state
- [ ] Add a short top-level deployment-model page in `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/`.
- [ ] Update `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md` so the GitHub -> GitOps PR flow appears near the top.
- [ ] Update `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md` with a “most common misunderstanding” section:
  - publishing to GHCR is not deployment
  - Argo only acts on GitOps repo changes
  - the CI-created GitOps PR is the deployment handoff
- [ ] Update `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/public-repo-ghcr-argocd-deployment-playbook.md` with the same explicit sequence.
- [ ] Add one concrete reference implementation section in the K3s docs that points at:
  - `draft-review`
  - `deploy/gitops-targets.json`
  - `scripts/open_gitops_pr.py`
  - the GitOps deployment manifest
  - the Argo `Application`
