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

## 2026-03-29: Task 3, First Host Dockerfile

With the repo-local Go workspace in place, I could finally add the first real host image definition.

### Decision

The first image packages the combined launcher process:

- embedded frontend shell
- namespaced backend modules
- one runtime binary

I explicitly did **not** split the frontend into a separate static webserver image yet, because the current build and runtime contract is already centered on the combined Go launcher binary and its embedded SPA assets.

### Files added

- `Dockerfile`
- `.dockerignore`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/03-build-host-image.sh`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/03-host-image-build-check.md`

### Dockerfile shape

- stage 1: `golang:1.26.1-bookworm`
  - source of the Go toolchain
- stage 2: `node:22-bookworm-slim`
  - install build-essential and git
  - copy the Go toolchain in
  - run `npm ci`
  - run `npm run launcher:binary:build`
- stage 3: `debian:bookworm-slim`
  - install `ca-certificates` and `tini`
  - add non-root user
  - copy the built launcher binary
  - default entrypoint:
    - `/usr/local/bin/wesen-os-launcher wesen-os-launcher --addr=:8091 --arc-enabled=false`

### Why `--arc-enabled=false` by default

The ARC runtime is not yet part of the production image contract. Leaving it on by default would make the first image far more fragile. The safe first host image should boot with the core module set even if ARC remains an optional later concern.

### Why the image uses the combined binary

The current packaging chain already assumes:

1. Vite build for `apps/os-launcher`
2. sync into `pkg/launcherui/dist`
3. Go binary build from `cmd/wesen-os-launcher`

The Dockerfile now formalizes that existing chain instead of inventing a different deployment model.

### First build failures and fixes

The first image build did not pass immediately. That was expected, and the failure sequence was useful:

1. `npm ci` failed in the builder stage with:
   - `EUNSUPPORTEDPROTOCOL Unsupported URL Type "workspace:"`
2. I switched the image builder to:
   - `corepack enable`
   - `corepack prepare pnpm@10.17.1 --activate`
   - `pnpm install --frozen-lockfile`
3. The next image build failed because `pnpm-lock.yaml` was stale relative to the current workspace.
4. I refreshed the root lockfile with:
   - `pnpm install`
5. The next image build succeeded.

### Validation result

- local image tag:
  - `wesen-os:deploy-001`
- local image ID:
  - `sha256:c46ede3516ac1c5b1bf79f306a200c4c5363708e698f13a276d1f71923ec637f`
- approximate local size:
  - `180MB`

### Ticket artifact

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/03-host-image-build-check.md`

The next task after this checkpoint should be the image smoke run:

- start the container
- probe `/`
- probe `/api/os/apps`
- verify the default `--arc-enabled=false` startup path is healthy

## 2026-03-29: Task 4, Local Host Image Smoke Command

I turned the local image smoke check into a real reproducible ticket script and used it to debug the first container runtime failures instead of treating them as abstract “Docker problems.” That mattered because the image itself was mostly correct; the real issues were a mixture of launcher runtime requirements and a couple of subtle shell-script mistakes in the harness.

This step closes the first end-to-end local deployment proof for `DEPLOY-001`: build the image, run it locally, probe the embedded SPA and backend app registry, and preserve enough logs in the artifact to make failures diagnosable.

### Prompt Context

**User prompt (verbatim):** "`let's go, task by task, committing as we go, keeping a detailed diary so that we can retrace our path at the end. Keep all scripts in the scripts/ folder of the ticket with XX-... prefix as well`"

**Assistant interpretation:** Continue the deployment ticket incrementally, checkpoint each meaningful slice in git, and maintain enough diary detail that the path can be reconstructed later.

**Inferred user intent:** Build the deployment system in small auditable steps, avoiding undocumented trial-and-error.

**Commit (code):** `8f6a220` — `Add host image smoke validation`

### What I did

- Added ticket script:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/04-smoke-host-image.sh`
- Added generated validation artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/04-host-image-smoke-check.md`
- Reproduced the container failure first with a retained manual debug container instead of `--rm`, so the actual startup logs stayed available.
- Updated the smoke script so it:
  - creates a temporary profile registry file
  - mounts it into the container
  - explicitly passes `--addr=:8091` and `--arc-enabled=false`
  - probes `/` and `/api/os/apps`
  - records container state, exit code, and logs in the output artifact
  - suppresses repetitive `curl` connection-noise during readiness polling
- Reran the smoke script until it produced a passing artifact.

### Why

- The first production image needs a single-command local proof before adding GHCR and K3s layers on top.
- The launcher has a nontrivial runtime contract:
  - it requires a profile registry source
  - it can optionally boot ARC, which pulls in `dagger`
- A smoke script that hides those requirements or loses logs on exit is not useful enough for future CI/CD work.

### What worked

- A retained debug run immediately exposed the true runtime failure:
  - `Error: start backend module lifecycle: init module "arc-agi": dagger binary is not available: exec: "dagger": executable file not found in $PATH`
- Passing `--arc-enabled=false` explicitly to `docker run` produced a healthy container:
  - `/` returned `200`
  - `/api/os/apps` returned `200`
  - the app registry included `inventory`, `sqlite`, `assistant`, and `gepa`
- The final smoke artifact recorded a `PASS` result with running container state and startup logs.

### What didn't work

- The first smoke attempt failed before startup because no profile registry was provided:
  - `validation error (profile-settings.profile-registries): must be configured (hard cutover: no profile-file fallback)`
- After adding a mounted profile registry file, the container still failed because the temp file permissions were too restrictive:
  - `open /tmp/profiles.runtime.yaml: permission denied`
- After fixing permissions, the container still failed because the smoke `docker run` arguments replaced the image `CMD`, silently dropping the Dockerfile default `--arc-enabled=false`:
  - `init module "arc-agi": dagger binary is not available: exec: "dagger": executable file not found in $PATH`
- The next smoke rerun still failed because the script called `cleanup` before `docker run`, which deleted the temp profile file. Docker then created a directory mount at that path:
  - `read /tmp/profiles.runtime.yaml: is a directory`
- One rerun failed for a purely local reason because the manual debug container was still holding the test port:
  - `Bind for 127.0.0.1:18091 failed: port is already allocated.`

### What I learned

- For this image, launcher boot requires a runtime profile registry even in a minimal local smoke scenario.
- `docker run IMAGE arg1 arg2 ...` replaces `CMD` but preserves `ENTRYPOINT`; this is easy to forget and directly affected whether ARC was disabled.
- A smoke harness should never rely on `--rm` if the main goal is to debug startup failures. Retaining the container state long enough to collect logs is materially more useful.
- The first healthy image contract is now concrete:
  - mount a profile registry file
  - pass `--arc-enabled=false`
  - probe `/` and `/api/os/apps`

### What was tricky to build

- The trickiest issue was not the image itself but the interaction between Docker CLI semantics and our launcher defaults. The Dockerfile declared `CMD ["--addr=:8091","--arc-enabled=false"]`, but the smoke command added its own launcher flags after the image name, which replaced that `CMD` entirely. That made the container look like it was “ignoring” the Dockerfile even though Docker was behaving correctly.
- The other sharp edge was the cleanup flow in the smoke script. I initially reused a single `cleanup()` function both to clear stale containers before the run and to tear down temporary files on exit. That removed the just-created temp profile file before `docker run`, causing Docker to mount a directory instead of the intended file. The symptom (`is a directory`) looked like a container issue, but the cause was the order of operations in the harness itself.

### What warrants a second pair of eyes

- The image runtime interface is still easy to misuse because adding `docker run ... extra-flags` can unintentionally replace useful default `CMD` flags.
- The smoke script currently proves the minimal healthy path, but it does not yet exercise richer backend endpoints the way `scripts/smoke-wesen-os-launcher.sh` does for the local binary.
- The profile bootstrap requirement is now explicit in the smoke harness, but we still need to document the intended production mechanism for providing profile registries in containers/Kubernetes.

### What should be done in the future

- Decide whether to keep the current Docker interface or add an entrypoint wrapper that preserves defaults more safely.
- Extend image smoke validation to cover at least one namespaced backend endpoint beyond `/api/os/apps`.
- Document runtime configuration for profile registries before writing K3s manifests.

### Code review instructions

- Start with:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/04-smoke-host-image.sh`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/04-host-image-smoke-check.md`
- Validate with:
  - `IMAGE_TAG=wesen-os:deploy-001 ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/04-smoke-host-image.sh`
- Review the failure history in this step if you want to understand why the harness passes `--arc-enabled=false` explicitly instead of assuming the Dockerfile `CMD` survives.

### Technical details

- Manual retained debug command used to preserve logs:

```bash
PROFILE_FILE=$(mktemp "${TMPDIR:-/tmp}/wesen-os-profiles.XXXXXX.yaml")
cat > "$PROFILE_FILE" <<'YAML'
slug: smoke
profiles:
  default:
    slug: default
    runtime:
      step_settings_patch:
        ai-chat:
          ai-engine: gpt-4.1-mini
YAML
chmod 644 "$PROFILE_FILE"

docker run --name wesen-os-debug-smoke \
  -p 127.0.0.1:18091:8091 \
  -v "$PROFILE_FILE:/tmp/profiles.runtime.yaml:ro" \
  -d wesen-os:deploy-001 \
  --addr=:8091 \
  --arc-enabled=false \
  --profile default \
  --profile-registries /tmp/profiles.runtime.yaml
```

- Key runtime proof points from the final passing artifact:
  - root route returned HTML containing `<div id="root"></div>`
  - `/api/os/apps` returned `200`
  - startup logs showed the launcher listening on `:8091`

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
