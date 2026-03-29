# K3s Host Deployment, Federated Modules, And GitHub CI/CD Guide

## 1. Why This Ticket Exists

This document is the next-step architecture guide after `NPM-PUBLISH-001`.

That earlier ticket proved that the shared frontend platform can become real published packages:

- `@go-go-golems/os-core`
- `@go-go-golems/os-shell`
- `@go-go-golems/os-scripting`
- `@go-go-golems/os-chat`
- `@go-go-golems/os-repl`
- `@go-go-golems/os-ui-cards`
- `@go-go-golems/os-widgets`
- `@go-go-golems/os-kanban`
- `@go-go-golems/os-confirm`

It also proved that consumers can install those packages from GitHub Packages in published mode.

That solved the build-time dependency problem. It did not solve the runtime deployment problem.

The user’s desired end-state is larger:

- `wesen-os` should run as a deployable service on K3s,
- individual app modules should be deployable independently and loaded by the browser at runtime,
- GitHub Actions should automate package publishing, container publishing, remote-asset deployment, and rollout.

This document explains how to get there, and it is written for a new intern who needs to understand both the current codebase and the target architecture.

## 2. The Current System, In Plain English

Today the repo already has the beginnings of the right split, but not the final deployment architecture.

What already exists:

- A root composition repo, `wesen-os`, which currently hosts `apps/os-launcher`.
- A linked frontend platform repo under `workspace-links/go-go-os-frontend`.
- Linked app repos under `workspace-links/`, including inventory and sqlite.
- Published-mode verification workflows proving that the launcher and at least one consumer can install platform packages from GitHub Packages.

The current code anchors are:

- `package.json`
- `.gitmodules`
- `pnpm-workspace.yaml`
- `apps/os-launcher/package.json`
- `apps/os-launcher/vite.config.ts`
- `apps/os-launcher/tsconfig.published.json`
- `.github/workflows/verify-launcher-canary-consumption.yml`
- `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml`
- `workspace-links/go-go-app-inventory/.github/workflows/verify-platform-canary-consumption.yml`

The important point is that the package layer now exists, but the deployment layer is still mostly conceptual.

## 3. The Three Delivery Planes

If you only remember one thing from this document, remember this:

The final system has three artifact planes, not one.

### 3.1 Package Plane

This is for build-time dependencies:

- `@go-go-golems/os-core`
- `@go-go-golems/os-shell`
- `@go-go-golems/os-scripting`
- and related packages

These should be published to GitHub Packages as npm packages.

Consumers install them during `npm install` or `pnpm install`.

### 3.2 Container Plane

This is for deployable services.

At minimum:

- the `wesen-os` host should be built as a container image
- that image should be pushed to GitHub Container Registry (`ghcr.io`)
- K3s should deploy it using a `Deployment`

### 3.3 Runtime Asset Plane

This is for browser-loaded remotes.

Module Federation remotes are not installed by npm at runtime. The browser fetches them as static assets from URLs. That means the real runtime artifact is something like:

- `mf-manifest.json`
- `remoteEntry.js`
- and the chunk files they reference

Those assets should be hosted on a static object store or CDN, such as Hetzner Object Storage.

## 4. Why These Planes Must Stay Separate

The wrong instinct is to say: "We already have GitHub Packages, so maybe it can just serve the app modules too."

That would be mixing build-time and runtime distribution.

Here is the separation:

- npm package publish is for developers and CI installing dependencies
- federation asset hosting is for browsers loading remote code at runtime
- container image publish is for Kubernetes pulling executable service images

Each plane has a different consumer:

- package plane consumer: `npm`, `pnpm`, CI
- container plane consumer: Kubernetes container runtime
- runtime asset plane consumer: the browser

They are not interchangeable.

## 5. Current Repository Topology

Here is the current high-level layout:

```text
wesen-os/
  apps/
    os-launcher/                  current host shell app
  .github/workflows/
    verify-launcher-canary-consumption.yml
  workspace-links/
    go-go-os-frontend/            shared platform packages + package publishing workflows
    go-go-app-inventory/          one downstream consumer and future remote candidate
    go-go-app-sqlite/             another future remote candidate
    go-go-app-arc-agi-3/          another future remote candidate
    go-go-os-backend/             backend services/tooling
```

The Git submodule wiring is visible in `.gitmodules`.

That matters operationally because:

- the root repo is the composition layer
- the frontend platform repo owns shared package release logic
- app repos may eventually own their own remote build-and-upload workflows

## 6. Current Technical State

The current launcher already has a two-mode model:

- workspace mode
- published mode

That is visible in:

- `apps/os-launcher/vite.config.ts`
- `apps/os-launcher/tsconfig.published.json`
- `.github/workflows/verify-launcher-canary-consumption.yml`

This is important because it proves the host can already stop depending on sibling source trees for the shared platform packages.

Similarly, the platform package publishing logic already exists in:

- `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml`
- `workspace-links/go-go-os-frontend/scripts/packages/publish-github-package-set.mjs`
- `workspace-links/go-go-os-frontend/scripts/packages/package-sets.mjs`

That means the package layer is no longer hypothetical. It is the base that the deployment architecture can now build on.

## 7. The Target End-State

The intended system should eventually look like this:

```text
                       +-----------------------------+
                       |  GitHub Actions             |
                       |-----------------------------|
                       | package publish             |
                       | image build + push          |
                       | remote asset upload         |
                       | deploy to K3s               |
                       +-------------+---------------+
                                     |
             +-----------------------+------------------------+
             |                        |                        |
             v                        v                        v
  +---------------------+   +---------------------+   +----------------------+
  | GitHub Packages     |   | GHCR                |   | Hetzner Object       |
  | npm.pkg.github.com  |   | ghcr.io             |   | Storage / CDN        |
  |---------------------|   |---------------------|   |----------------------|
  | @go-go-golems/os-*  |   | wesen-os image      |   | mf-manifest.json     |
  | build-time libs     |   | backend images      |   | remote chunks/assets |
  +---------------------+   +---------------------+   +----------------------+
                                      |                        ^
                                      v                        |
                           +---------------------+             |
                           | K3s Cluster         |             |
                           |---------------------|             |
                           | wesen-os host       |-------------+
                           | backends/APIs       | fetches remote manifests
                           +---------------------+ and chunks in browser
```

The host should not bundle every app forever. Instead:

- the host provides shell, routing, launch surface, shared runtime, and remote loader
- the remote provides app-specific UI and behavior

## 8. The Recommended Architecture

## 8.1 Host Responsibilities

The host should own:

- top-level shell layout
- launcher windowing and registration
- auth/session bootstrap
- remote registry loading
- error handling and degraded-mode UX
- shared singleton dependencies
- routing or launch orchestration

The host should not own:

- every app’s source code forever
- every app’s deployment lifecycle
- every remote’s asset publication

## 8.2 Remote Responsibilities

Each remote should own:

- its app UI
- its app-specific state and features
- its remote build
- its asset upload workflow
- its compatibility declaration against shared platform/runtime packages

## 8.3 Shared Platform Responsibilities

The shared `@go-go-golems/os-*` packages should own:

- reusable UI/runtime primitives
- shell abstractions
- scripting/runtime layers
- versioned contracts consumed by host and remotes

## 9. The First Practical Rollout

Do not try to federate everything at once.

The sensible rollout is:

1. containerize the host
2. deploy the host to K3s
3. keep most apps bundled or linked initially
4. federate one non-core app first
5. harden remote loading, rollback, and observability
6. migrate more apps over time

The first remote should not be the most mission-critical, most entangled app in the system. A lower-risk remote is a better proof target.

Recommended first remote:

- `inventory`, if its app contract is sufficiently narrow

Fallback candidates:

- `sqlite`
- another smaller app module if inventory still pulls too much host-specific structure

## 10. Host Container Design

The host image should be built around `apps/os-launcher`.

There are two main implementation patterns:

### Pattern A: Static frontend only

- build Vite assets
- serve them with nginx, Caddy, or similar
- keep backend APIs elsewhere

### Pattern B: Combined frontend + Go launcher/backend service

- build Vite assets
- embed or serve them from the Go service
- package that service in the container

Given the current repo’s scripts such as:

- `package.json` scripts
- `scripts/build-wesen-os-launcher.sh`
- `scripts/launcher-ui-sync.sh`

Pattern B may fit the current codebase better if the launcher already assumes a Go-hosted runtime or backend coupling.

The guide does not force that decision, but it does force you to make it explicitly.

### Recommended Files To Add

```text
Dockerfile
.dockerignore
deploy/k8s/wesen-os/deployment.yaml
deploy/k8s/wesen-os/service.yaml
deploy/k8s/wesen-os/ingress.yaml
deploy/k8s/wesen-os/configmap.yaml
.github/workflows/build-and-push-wesen-os-image.yml
.github/workflows/deploy-wesen-os-staging.yml
```

### Host Build Pseudocode

```text
checkout repo + submodules
install node dependencies
install go dependencies if needed
build launcher frontend
assemble runtime files
build docker image
push image to ghcr.io
```

Example shell-level pseudocode:

```sh
pnpm install
npm run build -w apps/os-launcher
docker build -t ghcr.io/wesen/wesen-os:${GIT_SHA} .
docker push ghcr.io/wesen/wesen-os:${GIT_SHA}
```

## 11. K3s Deployment Design

K3s is lightweight Kubernetes, not a fundamentally different deployment model. Treat it as Kubernetes with a lighter operational footprint.

At minimum the host deployment needs:

- `Deployment`
- `Service`
- `Ingress`
- environment/config injection
- readiness and liveness probes

### Suggested Layout

```text
deploy/
  k8s/
    wesen-os/
      base/
        deployment.yaml
        service.yaml
        ingress.yaml
        configmap.yaml
      overlays/
        staging/
          kustomization.yaml
          patch-image.yaml
          patch-config.yaml
        production/
          kustomization.yaml
          patch-image.yaml
          patch-config.yaml
```

### Example Logical Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wesen-os
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: host
          image: ghcr.io/wesen/wesen-os:sha-abc123
          ports:
            - containerPort: 8080
          env:
            - name: REMOTE_REGISTRY_URL
              value: https://assets.example.com/registry/staging.json
```

### Why Digests Matter

Deploying by image digest is safer than deploying by mutable tags.

Good:

- `ghcr.io/wesen/wesen-os@sha256:...`

Less safe:

- `ghcr.io/wesen/wesen-os:main`

Tags are useful for humans. Digests are better for reproducible cluster state.

## 12. Federation Design

Module Federation needs a stable host-to-remote contract.

The contract should answer:

- how the host discovers remotes
- what URL the host fetches
- which module is exposed
- what shared dependencies must be singleton
- how compatibility is validated
- what the user sees when a remote fails

### Recommended Runtime Contract

Each remote should publish metadata like:

```json
{
  "id": "inventory",
  "version": "0.1.0",
  "manifestUrl": "https://assets.example.com/remotes/inventory/0.1.0/mf-manifest.json",
  "exposes": {
    "./launcher": "./src/launcher/public.ts"
  },
  "platformRange": "^0.1.0",
  "shared": {
    "react": { "singleton": true },
    "react-dom": { "singleton": true }
  }
}
```

That exact JSON shape does not have to be final, but the design discipline does.

### Why Manifest Mode Is Preferable

A manifest-based flow is easier to inspect, version, and registry-drive than a purely implicit remote-entry-only design.

For this ticket, prefer:

- `mf-manifest.json`

over:

- only `remoteEntry.js`

unless tooling constraints force the latter.

## 13. Remote Registry Design

The host needs a source of truth telling it which remotes exist in which environment.

There are three realistic options:

### Option A: Static JSON bundled into the host image

Pros:

- simple
- deterministic

Cons:

- every remote registry update requires a host rebuild/redeploy

### Option B: Environment-provided JSON URL

Pros:

- host can stay constant while remote registry changes
- staging and production can differ safely

Cons:

- extra config management required

### Option C: Backend-served registry endpoint

Pros:

- dynamic and centrally controlled

Cons:

- adds backend dependency and more moving parts

Recommended first implementation:

- Option B: environment-provided registry URL

That preserves separation without forcing an unnecessary backend service.

### Example Registry

```json
{
  "env": "staging",
  "remotes": [
    {
      "id": "inventory",
      "version": "0.1.0-canary.1",
      "manifestUrl": "https://assets.example.com/remotes/inventory/0.1.0-canary.1/mf-manifest.json",
      "enabled": true
    }
  ]
}
```

## 14. Hetzner Object Storage Design

The static remote assets need:

- versioned paths
- CORS
- immutable caching on versioned assets
- safe rollback

### Recommended Path Layout

```text
remotes/
  inventory/
    0.1.0-canary.1/
      mf-manifest.json
      assets/...
  sqlite/
    0.1.0-canary.1/
      mf-manifest.json
      assets/...
registry/
  staging.json
  production.json
```

### Caching Rules

For versioned assets:

- long max-age
- immutable

For environment registry documents like `staging.json`:

- short TTL or no-cache

That way:

- old versions stay fetchable
- rollback is just a registry change

### Why Object Storage Fits Better Than Kubernetes For Remotes

Federation remotes are static browser assets. They do not need to be "running" unless they depend on a backend API. Serving them from object storage is usually simpler and cheaper than packaging each remote as its own web server deployment.

## 15. GitHub Actions Architecture

The final GitHub Actions topology should have multiple pipelines, each with a narrow responsibility.

## 15.1 Platform Package Workflow

Already started in `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml`.

Final responsibilities:

- test platform packages
- build dist artifacts
- pack smoke
- publish to GitHub Packages

## 15.2 Host Image Workflow

New workflow to add in the root repo:

```text
.github/workflows/build-and-push-wesen-os-image.yml
```

Responsibilities:

- checkout with submodules
- install dependencies
- build launcher/host
- build Docker image
- push to GHCR

## 15.3 Host Deploy Workflow

New workflow to add:

```text
.github/workflows/deploy-wesen-os-staging.yml
.github/workflows/deploy-wesen-os-production.yml
```

Responsibilities:

- pull exact image digest or tag
- apply K8s manifests
- wait for rollout
- run post-deploy validation

## 15.4 Remote Build And Upload Workflow

Per app repo:

```text
.github/workflows/build-and-publish-remote.yml
```

Responsibilities:

- install published platform packages
- build remote federation assets
- upload to Hetzner
- optionally update a registry document or emit deployment metadata

## 15.5 Runtime Validation Workflow

This should be an explicit workflow, not an afterthought.

Responsibilities:

- fetch host URL
- verify shell boot
- fetch remote registry
- attempt remote load
- fail loudly if registry or chunk URLs are broken

## 16. Security And Permissions

There are several credential domains:

- GitHub Packages publish/read
- GHCR push/pull
- Hetzner object storage upload
- K3s deployment credentials

### Rules

- keep package publish credentials scoped to the publishing repo
- keep remote upload credentials scoped to the specific app repo where possible
- keep cluster deployment credentials only in the repo that owns cluster deploy
- use GitHub environment protection for production deploys

### GitHub Packages Access

One subtle point already surfaced in the previous ticket:

- Actions-based package consumption can fail even when publishing succeeded, if package visibility/repo access is not configured correctly

That means the deployment plan must include explicit package access validation, not just package publish validation.

## 17. Failure Modes To Design For

Many systems fail here because the "happy path" is designed and the rollback path is hand-waved away.

You need to design around at least these failures:

### 17.1 Bad npm Package Publish

Symptoms:

- consumers cannot install a platform package
- build breaks before deploy

Mitigation:

- versioned canary publish
- install verification before promotion

### 17.2 Bad Host Image

Symptoms:

- pods crash
- shell page fails to boot

Mitigation:

- staging deploy first
- readiness probes
- rollback to previous digest

### 17.3 Bad Remote Asset Upload

Symptoms:

- manifest 404
- chunk 404
- browser fails to load remote

Mitigation:

- immutable versioned asset paths
- separate registry pointer
- rollback by switching registry back to older version

### 17.4 Bad Registry Configuration

Symptoms:

- host points to wrong manifest URL
- incompatible remote version loaded

Mitigation:

- schema validation on registry
- compatibility fields
- pre-deploy smoke tests

## 18. Intern Mental Model

If you are a new engineer joining this project, learn the system in this order:

1. Learn the root composition repo.
2. Learn the platform package repo.
3. Learn one app repo end to end.
4. Learn the difference between build-time package reuse and runtime federation.
5. Learn the deployment chain from commit to running cluster.

### The Simple Story

The system is not "a monorepo with some packages."

It is becoming a platform with:

- shared SDK/runtime packages,
- a shell host,
- independent apps,
- separate build-time and runtime distribution channels.

That is the right mental frame.

## 19. Recommended First Concrete Code Additions

This is the minimum practical starting batch:

### In `wesen-os`

- `Dockerfile`
- `.dockerignore`
- `deploy/k8s/wesen-os/base/*`
- `deploy/k8s/wesen-os/overlays/staging/*`
- `.github/workflows/build-and-push-wesen-os-image.yml`
- `.github/workflows/deploy-wesen-os-staging.yml`

### In the first remote repo

- federation build config
- remote build workflow
- upload script
- environment-aware remote asset path configuration

### In the host

- remote registry loader module
- registry config type
- remote load/fallback UI

## 20. Suggested Host Runtime Loader Pseudocode

This is intentionally high-level. It describes behavior, not a final implementation.

```ts
type RemoteRecord = {
  id: string;
  version: string;
  manifestUrl: string;
  enabled: boolean;
  platformRange?: string;
};

type RemoteRegistry = {
  env: 'staging' | 'production';
  remotes: RemoteRecord[];
};

async function loadRemoteRegistry(url: string): Promise<RemoteRegistry> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`remote registry fetch failed: ${response.status}`);
  }
  const json = await response.json();
  validateRegistry(json);
  return json;
}

async function installRemote(remote: RemoteRecord) {
  if (!remote.enabled) {
    return { status: 'disabled' };
  }

  assertPlatformCompatibility(remote.platformRange);

  const manifest = await fetchManifest(remote.manifestUrl);
  const moduleFactory = await loadFederatedModule(manifest, './launcher');
  return moduleFactory();
}

async function bootstrapRemoteApps() {
  const registry = await loadRemoteRegistry(import.meta.env.VITE_REMOTE_REGISTRY_URL);

  for (const remote of registry.remotes) {
    try {
      const mod = await installRemote(remote);
      registerRemoteLauncher(remote.id, mod);
    } catch (error) {
      reportRemoteFailure(remote, error);
      registerRemoteUnavailableState(remote.id, error);
    }
  }
}
```

## 21. Suggested GitHub Actions Flow Pseudocode

### Package Workflow

```text
on merge/tag
  -> typecheck packages
  -> test packages
  -> build dist
  -> pack smoke
  -> publish npm packages
```

### Host Image Workflow

```text
on merge to main
  -> checkout submodules
  -> install deps
  -> build launcher host
  -> docker build
  -> docker push ghcr.io
  -> emit image digest
```

### Host Deploy Workflow

```text
manual or protected environment promotion
  -> choose image digest
  -> kubectl apply / kustomize build
  -> wait for rollout
  -> run host smoke checks
```

### Remote Workflow

```text
on merge in remote repo
  -> install deps
  -> build remote
  -> upload manifest + chunks to Hetzner
  -> update staging registry or emit version record
  -> run remote availability check
```

## 22. Example File Reference Map For The Intern

Start here when reading the codebase:

- `package.json`
  - root scripts and workspace composition
- `.gitmodules`
  - which repos are linked into the composition layer
- `pnpm-workspace.yaml`
  - package workspace scope
- `apps/os-launcher/package.json`
  - launcher scripts and direct dependencies
- `apps/os-launcher/vite.config.ts`
  - current workspace-versus-published resolution logic
- `apps/os-launcher/tsconfig.published.json`
  - published package mode
- `.github/workflows/verify-launcher-canary-consumption.yml`
  - current proof that the host can build against published platform packages
- `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml`
  - current canary package publishing flow
- `workspace-links/go-go-os-frontend/scripts/packages/publish-github-package-set.mjs`
  - ordered package set publish logic
- `workspace-links/go-go-app-inventory/.github/workflows/verify-platform-canary-consumption.yml`
  - downstream consumer proof

## 23. Recommended Order Of Implementation

If I were handing this to an intern with supervision, I would assign the implementation in this order:

1. Add the host Dockerfile and local runbook.
2. Add the host image GHCR workflow.
3. Add staging K3s manifests and one deploy workflow.
4. Add a remote registry loader to the host.
5. Convert one app repo into a federation remote.
6. Add Hetzner asset upload workflow for that remote.
7. Wire the host to load the remote in staging.
8. Add smoke checks, rollback procedures, and production gates.

That order matters because it isolates failure domains:

- first get the host deployable,
- then get remotes deployable,
- then join them.

## 24. Things Not To Do

- Do not use npm package publishing as a substitute for browser runtime asset hosting.
- Do not deploy every remote as a separate Kubernetes service unless it truly needs a server.
- Do not federate every app at once.
- Do not make remote discovery implicit and undocumented.
- Do not skip rollback design.
- Do not make production depend on mutable unversioned asset URLs if avoidable.

## 25. Practical Definition Of Done

This overall program is done only when all of the following are true:

- `wesen-os` builds and pushes a host image to GHCR from GitHub Actions
- staging K3s deploys that image successfully
- at least one app remote builds and uploads federation assets to Hetzner from GitHub Actions
- the host loads that remote from a versioned manifest URL at runtime
- rollback from a bad remote can be achieved by changing the registry, without rebuilding the host
- rollback from a bad host image can be achieved by redeploying a previous image digest

## 26. Official References

These are the core external references used for this design:

- GitHub Actions publishing Node.js packages:
  - https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages
- GitHub Packages access control and visibility:
  - https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
- GitHub Container Registry:
  - https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Actions deployment guidance:
  - https://docs.github.com/en/actions/deployment
- K3s installation:
  - https://docs.k3s.io/installation
- K3s private registry configuration:
  - https://docs.k3s.io/installation/private-registry
- Hetzner Object Storage:
  - https://docs.hetzner.com/storage/object-storage/
- Module Federation manifest configuration:
  - https://module-federation.io/configure/manifest
- Module Federation remotes configuration:
  - https://module-federation.io/configure/remotes
- Module Federation configuration overview:
  - https://module-federation.io/configure/

## 27. Final Summary

The package work proved that the platform can be versioned and consumed cleanly.

The deployment work now needs to finish the picture by separating:

- build-time package distribution,
- deploy-time service distribution,
- browser-time remote distribution.

That is the actual system you are building.
