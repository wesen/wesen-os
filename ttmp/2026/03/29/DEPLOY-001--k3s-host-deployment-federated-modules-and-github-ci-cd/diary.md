# Diary

## 2026-03-29: Ticket Creation And Architecture Synthesis

This ticket was created because the package-publishing work in `NPM-PUBLISH-001` answered only the first third of the deployment story. We now have proof that the shared platform packages can be published and consumed from GitHub Packages, but the user’s desired end-state is larger:

- run `wesen-os` on K3s,
- load selected modules at runtime through Module Federation,
- drive the whole pipeline from GitHub CI/CD.

### Context I reviewed

- `package.json`
- `.gitmodules`
- `pnpm-workspace.yaml`
- `apps/os-launcher/package.json`
- `apps/os-launcher/vite.config.ts`
- `apps/os-launcher/tsconfig.published.json`
- `.github/workflows/verify-launcher-canary-consumption.yml`
- `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml`
- `workspace-links/go-go-os-frontend/scripts/packages/publish-github-package-set.mjs`
- `workspace-links/go-go-os-frontend/scripts/packages/package-sets.mjs`
- `workspace-links/go-go-app-inventory/.github/workflows/verify-platform-canary-consumption.yml`
- `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/*`

### Core conclusion

The deployment target must be split into three artifact planes:

1. npm packages
   - shared build-time platform libraries such as `@go-go-golems/os-core`
2. container images
   - deployable host image for `wesen-os`
3. static federation assets
   - browser-loadable manifests and chunks for app remotes

Trying to collapse those into one plane would create the wrong system. GitHub Packages is right for npm artifacts, but wrong for runtime browser chunks. K3s is right for running services, but not for hosting each frontend remote as if it were a backend microservice. Federation wants static versioned assets and a registry/manifest model.

### Tricky point discovered immediately

`docmgr` in this workspace is configured against a sibling repository root, not this repo’s local `ttmp/` tree. I used it only long enough to confirm that mismatch, removed the misplaced ticket workspace, and then created the ticket structure directly under this repo:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd`

That keeps the deliverables next to the rest of the `wesen-os` ticket work.

### Output of this step

- `index.md`
- `tasks.md`
- `design/01-k3s-host-federation-and-github-cicd-guide.md`
- `sources/reference-links.md`
- `changelog.md`

### What should happen next

- Review the deployment model and confirm the first federated remote.
- Add concrete implementation tasks into the active engineering backlog.
- Then start actual code work in this order:
  - host Docker image
  - GHCR workflow
  - K3s manifests
  - first federated remote
  - remote asset hosting and runtime registry

## 2026-03-29: Task 1, Host Build Surface Audit

I started the implementation program with the narrowest possible slice that still de-risks the rest of the work: identify exactly how the current launcher is built, where the frontend assets land, how they become embedded in the Go binary, and what existing smoke/build scripts can be reused in a future Docker image.

### Files reviewed directly

- `package.json`
- `scripts/build-wesen-os-launcher.sh`
- `scripts/launcher-ui-sync.sh`
- `scripts/smoke-wesen-os-launcher.sh`
- `cmd/wesen-os-launcher/main.go`
- `pkg/launcherui/handler.go`
- `pkg/launcherui/dist/.embedkeep`
- `apps/os-launcher/package.json`
- `apps/os-launcher/vite.config.ts`
- `apps/os-launcher/tsconfig.published.json`

### Key findings

- The current launcher already has a stable three-step packaging chain:
  - build the React frontend
  - sync `apps/os-launcher/dist` into `pkg/launcherui/dist`
  - build the Go binary
- The Go binary serves the embedded SPA through `pkg/launcherui.Handler()`.
- `pkg/launcherui/handler.go` uses `//go:embed all:dist`, so any production image that builds the binary must ensure `pkg/launcherui/dist` is populated before `go build`.
- `cmd/wesen-os-launcher/main.go` mounts the embedded SPA at `/` and wires the backend modules in the same binary. That strongly suggests the first container implementation should package the combined Go launcher service, not split frontend and backend into separate containers prematurely.
- The repo already has a good binary smoke test:
  - `scripts/smoke-wesen-os-launcher.sh`
  - this should become part of the image-validation pipeline later
- There is no existing `Dockerfile`, `.dockerignore`, `deploy/k8s/`, Helm chart, or Kustomize base in the repo yet.

### Output of this step

- Added ticket script:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/01-audit-host-build-surface.sh`
- Generated and committed audit artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/01-host-build-surface-audit.md`

### Why this matters

This audit turns the next Docker task from guesswork into a concrete build recipe. The first host image should almost certainly do this:

1. install Node dependencies
2. build `apps/os-launcher`
3. sync launcher UI into `pkg/launcherui/dist`
4. build `cmd/wesen-os-launcher`
5. run the existing smoke test or an image-adapted equivalent

That is a materially better starting point than inventing a static-file-only container and discovering later that the runtime contract actually depends on the combined Go launcher process.

## 2026-03-29: Task 2, Self-Contained Go Workspace

The first attempt at a container-friendly build immediately exposed a bigger infrastructure problem than the missing `Dockerfile`.

### The blocker

The root `go.work` still depended on sibling directories outside this repository:

- `../geppetto`
- `../go-go-os-chat`
- `../pinocchio`

That is acceptable on one developer workstation. It is not acceptable for:

- GitHub Actions
- Docker image builds
- reproducible deployment pipelines

If the repo checkout itself is not self-contained, every downstream deployment artifact becomes fragile.

### What I tested

- `go env CGO_ENABLED GOOS GOARCH`
- `npm run launcher:binary:build`
- `GOWORK=off go build -o /tmp/wesen-os-launcher-gowork-off ./cmd/wesen-os-launcher`
- `GOWORK=off go list -m -versions github.com/go-go-golems/go-go-os-chat`
- `GOWORK=off go list -m -versions github.com/go-go-golems/geppetto`
- `GOWORK=off go list -m -versions github.com/go-go-golems/pinocchio`

### What I learned

- The normal local launcher build succeeds.
- The root binary currently builds with `CGO_ENABLED=1`, which matters for the future image builder.
- `GOWORK=off` initially failed because `go.mod` still pinned `github.com/go-go-golems/go-go-os-chat` to `v0.0.0`.
- After updating to `v0.0.1`, the deeper issue became visible:
  - the current app/backend stack still expects local Geppetto surfaces not available in the older dependency graph assumed by the root repo
- In other words, the root build was reproducible only if the sibling repos happened to exist on disk.

### Decision

For this deployment program, the pragmatic fix is to move those implicit sibling dependencies under `workspace-links/` as tracked submodules and rewrite `go.work` to reference only repo-local paths.

### Changes in this step

- Added new tracked submodules:
  - `workspace-links/geppetto`
  - `workspace-links/pinocchio`
  - `workspace-links/go-go-os-chat`
- Rewrote `go.work` from `../...` references to `./workspace-links/...`
- Rewrote the `go-go-os-chat` replace path in `go.work`
- Updated the root module graph toward the current published dependency line:
  - `github.com/go-go-golems/go-go-os-chat v0.0.1`
  - newer `geppetto`, `pinocchio`, and transitive versions in `go.mod`

### Output of this step

- Ticket script:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/02-check-repo-local-go-work.sh`
- Generated check artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/02-repo-local-go-work-check.md`

### Why this matters

This is the actual prerequisite for the Dockerfile task. A deployment image built from this repo must be able to reconstruct the same Go dependency graph from the repo checkout plus tracked submodules, not from undocumented sibling directories outside version control.

## 2026-03-29: reMarkable Delivery

After the ticket content was written, I bundled the main deliverables into a single PDF for reMarkable delivery:

- `index.md`
- `design/01-k3s-host-federation-and-github-cicd-guide.md`
- `tasks.md`
- `diary.md`
- `sources/reference-links.md`

### Commands used

- `remarquee status`
- `remarquee upload bundle --dry-run ... --name "DEPLOY-001 Deployment and Federation Guide" --remote-dir "/ai/2026/03/29/DEPLOY-001" --toc-depth 2`
- `remarquee upload bundle ... --name "DEPLOY-001 Deployment and Federation Guide" --remote-dir "/ai/2026/03/29/DEPLOY-001" --toc-depth 2`
- `remarquee cloud ls /ai/2026/03/29 --long --non-interactive`
- `remarquee cloud ls /ai/2026/03/29/DEPLOY-001/ --long --non-interactive`

### Results

- `remarquee status` returned `remarquee: ok`
- the dry-run succeeded
- the real upload succeeded
- remote verification confirmed:
  - `/ai/2026/03/29/DEPLOY-001/DEPLOY-001 Deployment and Federation Guide`

### Note

An initial `remarquee cloud ls /ai/2026/03/29/DEPLOY-001 --long --non-interactive` returned `Error: no matches for 'DEPLOY-001'`. Listing the parent folder first showed that the directory existed; repeating the command with a trailing slash worked:

- `/ai/2026/03/29/DEPLOY-001/`

That was a path lookup quirk, not an upload failure.
