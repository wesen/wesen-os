# Diary

## Goal

Capture the step-by-step path from package publishing work into a full `wesen-os` deployment model, including the later migration of canonical Kubernetes ownership into the Hetzner K3s GitOps repository.

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

## 2026-03-29: Task 5, Launcher Build Determinism

Before moving on to GHCR publishing, I checked whether the launcher frontend output is actually reproducible across repeated clean builds. That question is easy to answer badly by eyeballing hashed filenames; it is better answered by running the build twice from a clean `dist/` state and comparing normalized per-file digests.

The result was positive: the current `apps/os-launcher` production build is deterministic under the current toolchain and repository state. I turned that into a reusable ticket script so later deployment work can cite a concrete proof instead of an informal assumption.

### Prompt Context

**User prompt (verbatim):** (same as Step 4)

**Assistant interpretation:** Continue the deployment work in bounded, auditable increments and keep committing/recording what each slice proves.

**Inferred user intent:** Build toward K3s/GitHub deployment with confidence that each prerequisite is validated, not just assumed.

**Commit (code):** `5a3f94b` — `Check launcher build determinism`

### What I did

- Added ticket script:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/05-check-launcher-build-determinism.sh`
- Added generated proof artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/05-launcher-build-determinism-check.md`
- Audited the launcher build inputs:
  - `apps/os-launcher/package.json`
  - `apps/os-launcher/vite.config.ts`
  - `scripts/build-wesen-os-launcher.sh`
- Searched for obvious nondeterminism sources like embedded timestamps, git metadata, or randomized build-time IDs.
- Ran two clean `npm run build` cycles for `apps/os-launcher` and compared normalized relative-file SHA-256 digests across the resulting `dist/` trees.

### Why

- Reproducible frontend output makes the later container and GHCR steps easier to reason about.
- If the launcher build were nondeterministic, image digests and deployment diffs would become noisier and harder to trust.
- This is exactly the kind of prerequisite that is cheap to measure early and annoying to discover late.

### What worked

- Two clean launcher builds produced identical relative-file hash lists.
- The final artifact captured:
  - the exact file digests
  - an empty diff
  - the tail of both Vite build logs
- The generated `vmmeta` step did not inject observable nondeterminism into the built `dist/` output in this scenario.

### What didn't work

- My first quick comparison falsely reported a mismatch because I hashed files using their absolute temp-directory paths:
  - `/tmp/.../dist-1/...`
  - `/tmp/.../dist-2/...`
- That made the diff noisy even though the file contents were identical.
- Re-running the comparison with relative paths inside each copied `dist/` tree fixed the measurement and showed the build was actually deterministic.

### What I learned

- The correct question is not “did the hashed filenames stay the same?” but “did the normalized output tree stay byte-identical?”
- The current launcher build is deterministic enough for the next deployment steps, even with:
  - `vmmeta:generate`
  - Vite asset hashing
  - the current dependency graph
- The Vite build still emits large-chunk warnings, but those are performance/packaging concerns, not determinism failures.

### What was tricky to build

- The subtle part here was measurement, not implementation. A naive comparison used `shasum` output that included the full temp file paths. Because those paths differ across runs, the comparison looked like a determinism failure even though the file contents matched exactly. The fix was to compute digests from inside each copied `dist/` directory and compare relative path entries only.
- This is a good reminder for later CI work: reproducibility checks need normalized paths and stable comparison formats, otherwise the harness itself creates false negatives.

### What warrants a second pair of eyes

- The proof currently covers repeated clean builds on this machine and workspace state; it does not yet prove cross-machine reproducibility.
- The build logs still show large bundle warnings and browser-externalization warnings for the QuickJS packaging path; those are not blockers for determinism, but they may matter for runtime performance and later image size work.
- If any build-time environment variables get introduced later, this proof should be rerun rather than assumed to remain valid.

### What should be done in the future

- Reuse this determinism script in CI if we decide reproducibility should become an enforced invariant.
- Investigate the large launcher chunks separately as a performance/packaging follow-up.
- Re-run this proof after any significant Vite config or generated-metadata pipeline changes.

### Code review instructions

- Start with:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/05-check-launcher-build-determinism.sh`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/05-launcher-build-determinism-check.md`
- Validate with:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/05-check-launcher-build-determinism.sh`
- If you want to reproduce the false-negative trap, compare absolute-path `shasum` output from two temp directories and watch the paths, not the file bytes, create the diff.

### Technical details

- Normalized digest loop used by the final script:

```bash
(
  cd "$DIST_COPY"
  find . -type f | LC_ALL=C sort | while read -r path; do
    shasum -a 256 "$path"
  done
)
```

- Relevant build chain under test:
  - `apps/os-launcher/package.json`:
    - `prebuild -> npm run vmmeta:generate`
    - `build -> vite build`
  - `apps/os-launcher/vite.config.ts`
  - generated outputs under `apps/os-launcher/dist`

## 2026-03-29: Task 6, Host Image Naming Decision

With the local image and smoke path proven, I locked down the host image naming policy instead of leaving it as a vague “something under GHCR.” That decision needs to be concrete before the first GHCR workflow is written, otherwise the workflow, deployment manifests, and rollback docs will each invent slightly different names and tags.

I encoded the decision as a ticket-local resolver script rather than a prose-only note so the forthcoming workflow can reuse the same logic and so the ticket preserves the exact inputs that drove the naming choice.

### Prompt Context

**User prompt (verbatim):** (same as Step 4)

**Assistant interpretation:** Keep advancing the deployment ticket in small committed slices and document each decision clearly enough to reconstruct later.

**Inferred user intent:** Avoid implicit deployment conventions; turn them into explicit, reviewable decisions before automation depends on them.

**Commit (code):** `eef13b2` — `Define host image tagging plan`

### What I did

- Added ticket script:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/06-resolve-host-image-tags.sh`
- Added generated decision artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/06-host-image-tagging-plan.md`
- Read the actual git remote from this repo:
  - `git@github.com:wesen/wesen-os`
- Derived the canonical image repository from that remote:
  - `ghcr.io/wesen/wesen-os`
- Chose the tag policy:
  - always publish an immutable full-SHA tag
  - optionally publish a short-SHA convenience tag
  - only publish the mutable `main` tag from the default branch
  - deploy Kubernetes using image digests rather than mutable tags

### Why

- The GHCR workflow and the later K3s manifests need a shared answer to “what image name are we talking about?”
- Tag policy is part of rollback design. If immutable tags do not exist, you lose straightforward traceability.
- It is safer to reserve moving tags like `main` for the default branch than to let arbitrary branches overwrite a shared mutable reference.

### What worked

- The repo remote resolved cleanly to `wesen/wesen-os`.
- The tagging policy fits the deployment guide that was already drafted:
  - canonical repo: `ghcr.io/wesen/wesen-os`
  - immutable tag: `:sha-<full-sha>`
  - convenience tag: `:sha-<short-sha>`
  - mutable default-branch tag: `:main`
- The generated artifact also captured the suggested OCI labels for the future workflow:
  - `org.opencontainers.image.source`
  - `org.opencontainers.image.revision`
  - `org.opencontainers.image.title`

### What didn't work

- Nothing failed technically in this step; the real risk was ambiguity, not a command error.
- The only non-final aspect is that the `main` tag cannot be demonstrated from this task branch because the current branch is:
  - `task/os-openai-app-server`

### What I learned

- The simplest workable rule set is also the most operationally useful:
  - immutable tags for traceability
  - one carefully controlled mutable tag for convenience
  - digest pinning for actual deployment
- A branch-scoped preview tag is still useful for non-main testing, but it should be clearly separate from `main`.

### What was tricky to build

- The subtlety here was deciding what belongs in the naming policy versus the deployment policy. Tags are useful for publishing and discovery, but actual Kubernetes rollout should use image digests after push. If those concerns get conflated, people start deploying mutable tags directly, which makes rollback and incident analysis harder.
- The other subtlety was deriving the canonical image repository from the repo’s real GitHub origin rather than hardcoding it in prose. That keeps the ticket artifact grounded in actual repo state and gives the future CI workflow something deterministic to mirror.

### What warrants a second pair of eyes

- Whether we want to keep both full-SHA and short-SHA tags, or collapse to just full-SHA plus digest.
- Whether preview branches should publish branch-scoped tags at all, or whether preview image publishing should wait until the GHCR workflow is stable.
- The OCI label set is intentionally minimal; we may want to add creation timestamp/provenance labels in the GHCR workflow step.

### What should be done in the future

- Reuse this naming policy in the GHCR workflow so the implementation matches the ticket decision.
- Emit OCI labels and capture the pushed digest in the workflow output.
- Use the digest, not the mutable tag, once K3s manifests are added.

### Code review instructions

- Start with:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/06-resolve-host-image-tags.sh`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/06-host-image-tagging-plan.md`
- Validate with:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/06-resolve-host-image-tags.sh`
- Confirm the derived repository matches `git remote get-url origin`.

### Technical details

- Current repo remote:

```text
git@github.com:wesen/wesen-os
```

- Current chosen refs for this branch state:
  - immutable: `ghcr.io/wesen/wesen-os:sha-<full-sha>`
  - convenience: `ghcr.io/wesen/wesen-os:sha-<short-sha>`
  - preview: `ghcr.io/wesen/wesen-os:branch-<sanitized-branch>-<short-sha>`
  - default-branch mutable tag later: `ghcr.io/wesen/wesen-os:main`

## 2026-03-29: Task 7, Host Runtime Config Audit

I closed out Phase 1 by documenting the launcher’s actual runtime configuration contract. The important outcome here is that the host is not primarily an “env-var configured app”; its mandatory startup input is profile bootstrap configuration, and the cleanest production path is to provide that through an explicit mounted config file plus flags.

This step matters because K3s manifests and GHCR workflows need a stable answer to “what config must exist at runtime?” Without that, the next deployment work would be guessing which values belong in environment variables, which belong in CLI flags, and which are only development conveniences.

### Prompt Context

**User prompt (verbatim):** (same as Step 4)

**Assistant interpretation:** Keep advancing the ticket in committed slices and preserve enough detail in the diary to reconstruct the implementation path later.

**Inferred user intent:** Make deployment work reproducible and reviewable, especially around configuration contracts that are easy to misremember.

**Commit (code):** `0977670` — `Audit host runtime config`

### What I did

- Added ticket script:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/07-audit-host-runtime-config.sh`
- Added generated audit artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/07-host-runtime-config-audit.md`
- Collected launcher help output from:
  - `go run ./cmd/wesen-os-launcher wesen-os-launcher --help`
- Grepped repo code for direct env-var usage and profile-bootstrap env references.
- Collapsed the results into:
  - required runtime inputs for the first container
  - optional-but-important flags
  - direct env vars
  - frontend/dev-only env vars
  - deployment interpretation for K3s

### Why

- The next deployment steps need a crisp boundary between:
  - required runtime configuration
  - optional tuning knobs
  - local-development-only environment variables
- The smoke-task debugging already proved that profile bootstrap config is the real required runtime input.
- It is better to encode that lesson now than to rediscover it while debugging a failing K3s deployment later.

### What worked

- The audit confirmed the key operational conclusion:
  - there is no large required env-var surface for the launcher binary itself
  - the main required runtime input is profile registry configuration
- The audit also separated development-only frontend env vars from real host runtime inputs:
  - `INVENTORY_CHAT_BACKEND`
  - `GO_GO_OS_FRONTEND_RESOLUTION`
- The final report gives a clean first-container contract:
  - `--addr=:8091`
  - `--arc-enabled=false`
  - `--profile default`
  - `--profile-registries /config/profiles.runtime.yaml`

### What didn't work

- Nothing failed operationally in this step; the complexity was interpretive.
- The only place I was deliberately conservative was AI provider credentials and inference settings. The help output exposes many related flags, but this audit does not overclaim a complete env-variable contract for all provider integrations.

### What I learned

- The launcher’s runtime contract is better described as “flags plus profile bootstrap” than “environment variables.”
- `PINOCCHIO_PROFILE` and `PINOCCHIO_PROFILE_REGISTRIES` matter because of the profile bootstrap layer, even though they are not directly read in the same obvious way as `PINOCCHIO_WEBCHAT_DEBUG`.
- The first production container should keep using explicit mounted configuration rather than relying on workstation defaults under `~/.config/pinocchio/profiles.yaml`.

### What was tricky to build

- The tricky part was drawing the line between direct env-var reads, inherited config behavior from libraries, and plain CLI flags. A naive grep for `os.Getenv` would have found only a tiny piece of the real contract and would have missed the actual startup requirement: `--profile-registries` or its profile-bootstrap equivalent.
- The other subtlety was not to confuse frontend dev env vars with backend production config. `INVENTORY_CHAT_BACKEND` and `GO_GO_OS_FRONTEND_RESOLUTION` matter for Vite and published-mode testing, but they are not part of the runtime contract for the deployed launcher binary.

### What warrants a second pair of eyes

- Whether we want to standardize on flags-only container configuration or allow selected env-to-flag wiring in the future K3s manifests.
- Whether AI provider credentials should be normalized into a clearer deployment contract before production rollout.
- Whether ARC config should remain entirely flag-driven or move behind a separate config surface if/when ARC becomes part of production.

### What should be done in the future

- Reuse this runtime-config summary when writing:
  - the GHCR workflow
  - K3s `Deployment` and `ConfigMap`
  - staging smoke/runbook docs
- Decide how profile registry files are generated or mounted per environment.
- Revisit the config surface once production secrets and persistence are introduced.

### Code review instructions

- Start with:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/07-audit-host-runtime-config.sh`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/07-host-runtime-config-audit.md`
- Validate with:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/07-audit-host-runtime-config.sh`
- Spot-check the conclusions against:
  - `cmd/wesen-os-launcher/main.go`
  - `cmd/wesen-os-launcher/profile_bootstrap.go`

### Technical details

- Direct repo grep highlights:
  - `PINOCCHIO_WEBCHAT_DEBUG`
  - `PINOCCHIO_PROFILE`
  - `PINOCCHIO_PROFILE_REGISTRIES`
  - `INVENTORY_CHAT_BACKEND`
  - `GO_GO_OS_FRONTEND_RESOLUTION`
- Operational first-container interpretation:

```text
wesen-os-launcher wesen-os-launcher \
  --addr=:8091 \
  --arc-enabled=false \
  --profile default \
  --profile-registries /config/profiles.runtime.yaml
```

## 2026-03-29: Task 8, GHCR Host Publish Workflow

With Phase 1 closed, I moved into Phase 2 and added the first real GitHub Actions workflow for building and publishing the host image. The workflow is intentionally safe: it can publish automatically on `main`, but manual dispatches default to build-only unless `push_image` is explicitly enabled.

This task is the point where the Dockerfile, image naming decision, and runtime contract all become operationally relevant. The workflow now encodes those earlier decisions instead of leaving them as ticket prose only.

### Prompt Context

**User prompt (verbatim):** (same as Step 4)

**Assistant interpretation:** Keep executing the deployment plan incrementally, committing and documenting each step in a way that can be retraced later.

**Inferred user intent:** Turn the deployment ticket into working automation, not just architecture notes.

**Commit (code):** `da33d21` — `Add GHCR host publish workflow`

### What I did

- Added workflow:
  - `.github/workflows/publish-host-image.yml`
- Added ticket validation script:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/08-check-host-publish-workflow.sh`
- Added generated workflow check artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/08-host-publish-workflow-check.md`
- Designed the workflow to:
  - check out submodules recursively
  - install dependencies with `pnpm`
  - build the launcher binary
  - derive GHCR tags/labels
  - build the Docker image
  - optionally push to GHCR
- Added tag policy directly to the workflow:
  - immutable `sha-...` tags
  - mutable `main` tag only on the default branch
- Added OCI labels:
  - `org.opencontainers.image.source`
  - `org.opencontainers.image.revision`
  - `org.opencontainers.image.title`
- Validated the workflow YAML locally with `yq`.

### Why

- The host image now has a local build and smoke path; the next logical step is to make image publishing reproducible in CI.
- The workflow is the first place where all earlier deployment decisions converge:
  - repo-local workspace
  - Dockerfile
  - deterministic launcher build
  - GHCR naming
  - digest-oriented deployment policy
- Making manual dispatches build-only by default reduces the chance of accidental registry writes while the workflow is still being hardened.

### What worked

- The workflow YAML parsed cleanly.
- The expected action chain is present:
  - `actions/checkout@v4`
  - `pnpm/action-setup@v4`
  - `actions/setup-node@v4`
  - `docker/login-action@v3`
  - `docker/metadata-action@v5`
  - `docker/build-push-action@v6`
- The workflow encodes the chosen tag policy directly, rather than requiring downstream readers to infer it from ticket docs.
- The build/push step is gated behind:
  - `github.event_name == 'push' || inputs.push_image == true`

### What didn't work

- There was no technical failure in this slice.
- The one unresolved item is not workflow syntax but external infrastructure:
  - we have not yet proven that K3s can pull from GHCR with the target credentials

### What I learned

- The workflow can stay relatively simple because the Dockerfile already encapsulates the combined host build.
- A guarded manual-dispatch path is useful during early deployment work: it gives us a CI build/test surface before we enable more routine registry writes.
- The ticket-side validation script is a worthwhile pattern even for YAML-only changes because it leaves behind an artifact showing exactly what was added.

### What was tricky to build

- The main design choice was balancing safety with real automation. A workflow that always pushes on manual dispatch is too easy to misuse while the pipeline is still evolving, but a workflow that never pushes manually is awkward for branch testing. The current compromise is deliberate: manual dispatch defaults to build-only, while `main` pushes publish automatically.
- The other subtlety was keeping tag policy consistent with the earlier naming decision. It is easy for the workflow to drift into one-off tag choices unless the immutable SHA tag, `main` tag, and digest-oriented deployment rule are all encoded together.

### What warrants a second pair of eyes

- Whether the path filters on the workflow are too broad or too narrow.
- Whether we want to add an explicit smoke or container run step inside this workflow before the first real push.
- Whether preview branch publishing should eventually get a dedicated branch-scoped tag path rather than manual build-only testing.

### What should be done in the future

- Merge and run the workflow on GitHub.
- Verify the first published digest in GHCR.
- Prove K3s can authenticate to GHCR and pull that image.
- Consider adding a container smoke step inside the workflow once the first publish is stable.

### Code review instructions

- Start with:
  - `.github/workflows/publish-host-image.yml`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/08-check-host-publish-workflow.sh`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/08-host-publish-workflow-check.md`
- Validate locally with:
  - `yq eval '.' .github/workflows/publish-host-image.yml >/dev/null`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/08-check-host-publish-workflow.sh`

### Technical details

- Current workflow shape:

```text
checkout recursive
-> setup pnpm + node
-> pnpm install --frozen-lockfile
-> npm run launcher:binary:build
-> docker metadata
-> docker build/push
```

- Current encoded image refs:
  - immutable: `ghcr.io/wesen/wesen-os:sha-<sha>`
  - mutable on default branch: `ghcr.io/wesen/wesen-os:main`

## 2026-03-29: Task 9, Initial K3s Host Manifests

After the GHCR workflow, the next concrete deployment step was to put the first Kubernetes shape into the repo instead of leaving K3s as a future concept. I chose a modest Kustomize base under `deploy/k8s/wesen-os/`, which is enough structure for staging/prod overlays later without paying Helm complexity up front.

This is the first point where the deployment story becomes visible as actual cluster resources: a `Deployment`, `Service`, `Ingress`, runtime `ConfigMap`, and placeholder image-pull secret contract.

### Prompt Context

**User prompt (verbatim):** (same as Step 4)

**Assistant interpretation:** Keep implementing the deployment plan slice by slice, with commits and diary entries that make the path reviewable later.

**Inferred user intent:** Turn the deployment ticket into a real runnable stack, not just build/publish automation.

**Commit (code):** `2d77ce6` — `Add initial K3s host manifests`

### What I did

- Added Kustomize deployment bundle:
  - `deploy/k8s/wesen-os/kustomization.yaml`
  - `deploy/k8s/wesen-os/configmap.yaml`
  - `deploy/k8s/wesen-os/deployment.yaml`
  - `deploy/k8s/wesen-os/service.yaml`
  - `deploy/k8s/wesen-os/ingress.yaml`
  - `deploy/k8s/wesen-os/secret.example.yaml`
- Added ticket validation script:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/09-render-k8s-host-manifests.sh`
- Added generated render artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/09-k8s-host-manifest-render.md`
- Configured the deployment to:
  - use `ghcr.io/wesen/wesen-os:main` for now
  - mount `/config/profiles.runtime.yaml` from a ConfigMap
  - disable ARC explicitly
  - expose port `8091`
  - mount writable `/app/data` via `emptyDir`
  - use `ghcr-creds` as the image pull secret
- Added probes:
  - readiness: `GET /api/os/apps`
  - startup: `GET /api/os/apps`
  - liveness: `GET /`
- Validated the bundle with:
  - `kubectl kustomize deploy/k8s/wesen-os`

### Why

- The GHCR workflow alone does not define how the host runs in-cluster.
- The runtime-config audit already identified the right initial container contract:
  - explicit profile registry file
  - ARC disabled
  - port `8091`
- Kustomize is a good fit for the current scope because we need composition and future overlays, but not full templating complexity yet.

### What worked

- `kubectl kustomize` rendered the full bundle successfully.
- The generated manifests line up with earlier decisions:
  - image repo/taging policy
  - mounted profile registry config
  - digest-oriented future deployment plan
  - GHCR pull secret contract
- The deployment now has a concrete readiness/liveness strategy rather than a hand-wavy “add health checks later.”

### What didn't work

- Nothing failed in rendering.
- The unresolved operational gap is still external:
  - the manifests assume an existing `ghcr-creds` secret, but we have not yet proven real cluster auth against GHCR
- The current `ConfigMap` profile registry is only a starter example; it is not yet an environment-specific managed config source.

### What I learned

- The host config decision becomes much clearer once written into manifests: profile bootstrap belongs in a mounted config file, not hidden user-home defaults.
- A single Kustomize base is enough to express the first deployment shape while still leaving room for future staging/prod overlays.
- Using `emptyDir` for `/app/data` is acceptable for the first cluster bundle, but it makes the persistence tradeoff explicit rather than accidental.

### What was tricky to build

- The main design tension was how much future infrastructure to bake in now. It would have been easy to overbuild with Helm, multi-env overlays, or secret managers before the first cluster shape existed. I kept the base small and explicit: one namespace, one deployment, one config source, one pull-secret contract.
- Another subtlety was choosing probe targets. The launcher does not expose a dedicated `/healthz`, so I used `GET /api/os/apps` for readiness/startup because it exercises backend module registration, while `GET /` is sufficient for liveness because it confirms the embedded shell is still being served.

### What warrants a second pair of eyes

- Whether `imagePullPolicy: IfNotPresent` is the right default before we switch manifests to digests.
- Whether the placeholder `Ingress` host and Traefik annotation match the actual cluster ingress setup we intend to use.
- Whether `/app/data` should move to a persistent volume sooner rather than later for staging.

### What should be done in the future

- Add a deployment workflow that applies this Kustomize bundle.
- Replace `:main` in real deployments with image digests after the first GHCR publish.
- Decide how environment-specific profile registries are authored and mounted.
- Revisit persistence once staging expectations are clearer.

### Code review instructions

- Start with:
  - `deploy/k8s/wesen-os/kustomization.yaml`
  - `deploy/k8s/wesen-os/deployment.yaml`
  - `deploy/k8s/wesen-os/configmap.yaml`
  - `deploy/k8s/wesen-os/service.yaml`
  - `deploy/k8s/wesen-os/ingress.yaml`
  - `deploy/k8s/wesen-os/secret.example.yaml`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/09-render-k8s-host-manifests.sh`
- Validate with:
  - `kubectl kustomize deploy/k8s/wesen-os`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/09-render-k8s-host-manifests.sh`

### Technical details

- First cluster runtime contract embedded in the manifest args:

```text
--addr=:8091
--arc-enabled=false
--profile=default
--profile-registries=/config/profiles.runtime.yaml
```

- Current placeholder ingress host:
  - `wesen-os.example.com`

- Current placeholder pull secret:
  - `ghcr-creds`

## 2026-03-29: Task 10, Staging K3s Deploy Workflow

Once the Kustomize base existed, the next missing piece was the deployment action that can take a published image and move it into the cluster. I added that as a manual staging workflow so the first cluster rollout can be deliberate and image-ref-driven instead of coupled to mutable tags.

This keeps the deployment model consistent with the earlier image policy: publish by tag, deploy by explicit image ref or digest.

### Prompt Context

**User prompt (verbatim):** (same as Step 4)

**Assistant interpretation:** Keep progressing through the deployment backlog in small verified steps and document each step clearly.

**Inferred user intent:** Turn K3s deployment from a design doc into an executable CI/CD path, while preserving a reviewable trail.

**Commit (code):** `56950b4` — `Add staging K3s deploy workflow`

### What I did

- Added workflow:
  - `.github/workflows/deploy-host-to-k3s.yml`
- Added ticket validation script:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/10-check-k3s-deploy-workflow.sh`
- Added generated workflow check artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/10-k3s-deploy-workflow-check.md`
- Designed the workflow to:
  - run manually via `workflow_dispatch`
  - require an explicit `image_ref`
  - target the `staging` GitHub environment
  - decode `KUBECONFIG_B64`
  - `kubectl apply -k deploy/k8s/wesen-os`
  - pin the deployment image with `kubectl set image`
  - wait for rollout completion

### Why

- Publishing an image is only half of delivery; we also need a repeatable deployment path.
- Requiring an explicit `image_ref` prevents accidental deploys of whatever mutable tag happens to exist at the moment.
- Using a `staging` environment now creates a natural place to attach environment protection later, even before production rollout exists.

### What worked

- The workflow YAML parsed successfully.
- The workflow contains the expected cluster-deploy anchors:
  - environment `staging`
  - kubeconfig setup
  - `kubectl apply -k`
  - `kubectl set image`
  - `kubectl rollout status`
- The deployment path is compatible with digest-first rollout because `image_ref` accepts the full reference directly.

### What didn't work

- There was no local syntax failure.
- The remaining blockers are external/integration-level:
  - no real `KUBECONFIG_B64` secret has been exercised yet
  - no published GHCR digest has been wired through this workflow yet
  - no live cluster rollout has been attempted from Actions yet

### What I learned

- Keeping the workflow manual and image-ref-driven is a good early compromise: it is real deployment automation without forcing a premature auto-deploy policy.
- `kubectl apply -k` plus `kubectl set image` is enough for the first staging workflow; we do not need a more elaborate release controller yet.
- GitHub environment wiring is useful even before production exists because it gives the workflow a stable semantic target.

### What was tricky to build

- The important design choice was how to inject the image reference. I avoided making the base Kustomize bundle itself branch- or digest-specific. Instead, the workflow applies the checked-in manifests and then pins the `Deployment` image explicitly. That keeps the manifest base readable while still supporting digest-based rollout.
- Another subtlety was not to overclaim success. The workflow is structurally valid and operationally plausible, but until a real kubeconfig and GHCR image are used, the remaining risk is credential and cluster integration, not YAML.

### What warrants a second pair of eyes

- Whether `kubectl set image` is the right first deployment mutation strategy or whether we should move to environment-specific overlays sooner.
- Whether the staging environment should already enforce manual approval in GitHub, not just exist as a named environment.
- Whether the workflow should run a post-rollout probe against the service or ingress once cluster networking is known.

### What should be done in the future

- Add the real `KUBECONFIG_B64` staging secret.
- Run the workflow with an actual GHCR image digest after the first publish lands.
- Decide whether to add environment protection rules for `staging` immediately or reserve that for `production`.
- Add a smoke/probe step after rollout once the staging ingress host is finalized.

### Code review instructions

- Start with:
  - `.github/workflows/deploy-host-to-k3s.yml`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/10-check-k3s-deploy-workflow.sh`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/10-k3s-deploy-workflow-check.md`
- Validate locally with:
  - `yq eval '.' .github/workflows/deploy-host-to-k3s.yml >/dev/null`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/10-check-k3s-deploy-workflow.sh`

### Technical details

- Current workflow shape:

```text
checkout
-> configure kubeconfig from secret
-> kubectl apply -k deploy/k8s/wesen-os
-> kubectl set image deployment/wesen-os wesen-os=<image_ref>
-> kubectl rollout status
```

- Expected runtime input:
  - `image_ref`, preferably `ghcr.io/wesen/wesen-os@sha256:...`

## 2026-03-29: Step 11, GitOps Migration Guide And Task Expansion

After reading the Hetzner K3s repo’s own onboarding and GitOps playbooks, I documented the migration path from the temporary `wesen-os`-local Kubernetes package to the canonical cluster-owned GitOps package. This was necessary because the first implementation pass proved deployability, but it also made the ownership boundary visible: the cluster repo, not the app repo, should own the long-term Kubernetes source of truth.

I wrote that migration guide into the active ticket and expanded the task board with a dedicated Phase `3B` so the next implementation work can be tracked explicitly instead of being implied by chat context.

### Prompt Context

**User prompt (verbatim):** "Ok, create an implementation guide for all this so that we have a reference for later, the nadd detailed tasks to the ticket and then get to work."

**Assistant interpretation:** Write a concrete migration guide for moving `wesen-os` deployment ownership into the Hetzner K3s GitOps repo, add the corresponding detailed tasks to `DEPLOY-001`, and then start implementing that plan.

**Inferred user intent:** Create a durable reference for the cluster-repo migration and immediately turn it into tracked execution work.

### What I did

- Read and synthesized the Hetzner K3s repo’s canonical docs:
  - `README.md`
  - `docs/source-app-deployment-infrastructure-playbook.md`
  - `docs/public-repo-ghcr-argocd-deployment-playbook.md`
  - `docs/app-packaging-and-gitops-pr-standard.md`
  - `docs/argocd-app-setup.md`
- Added a new ticket design doc:
  - `design/02-wesen-os-into-hetzner-k3s-gitops-guide.md`
- Updated:
  - `index.md`
  - `tasks.md`
- Added a dedicated migration phase:
  - `Phase 3B: Move Canonical Host GitOps Into Hetzner K3s Repo`

### Why

- The first implementation pass placed the initial K8s manifests in `wesen-os` because that was the fastest way to prove the host deployment shape.
- The K3s repo docs make the long-term model explicit:
  - source repo owns build/publish
  - GitOps repo owns Kubernetes state
  - Argo CD reconciles from the GitOps repo
- Without writing that down in the ticket, the next cross-repo work would be easy to perform but harder to explain or review later.

### What worked

- The docs were consistent about the ownership split.
- The migration guide could therefore be concrete rather than speculative:
  - move Kustomize package into `gitops/kustomize/wesen-os`
  - later add `gitops/applications/wesen-os.yaml`
  - only then wire GitOps PR automation from `wesen-os`
- The new Phase `3B` tasks now make that path visible in the ticket.

### What didn't work

- No technical command failed in this step.
- The only open issue is execution ordering:
  - we should not add the Argo `Application` until the Kustomize package is present, render-valid, and the image-pull strategy is decided

### What I learned

- The Hetzner repo is already opinionated enough that we should follow its patterns rather than inventing a parallel `wesen-os`-specific deployment model.
- The right place for canonical cluster state is the GitOps repo even if the first draft was authored elsewhere.
- The `wesen-os` repo should eventually own GitOps PR automation, not long-term cluster manifests.

### What was tricky to build

- The main subtlety was separating “proof-of-concept manifests” from “canonical manifests.” The local package under `wesen-os/deploy/k8s/wesen-os` is still useful as a draft and as a record of how the deployment shape was discovered, but if it remains unqualified it risks drifting from the GitOps repo later.
- The other subtlety was deciding the safe order of work. The Kustomize package can be created in the Hetzner repo immediately, but the Argo `Application` should wait until the image-pull mode and first real image reference are clear.

### What warrants a second pair of eyes

- Whether Phase `3B` should stay inside `DEPLOY-001` or later be split into a K3s-repo-local ticket if the cross-repo work becomes much larger.
- Whether the final `wesen-os` copy of the draft manifests should be removed entirely or kept as a non-canonical reference.

### What should be done in the future

- Implement the first `Phase 3B` slice now:
  - create `gitops/kustomize/wesen-os` in the Hetzner repo
  - render-validate it
- Then decide image visibility / pull-secret strategy before adding the Argo `Application`.

### Code review instructions

- Start with:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/design/02-wesen-os-into-hetzner-k3s-gitops-guide.md`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/tasks.md`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/index.md`

### Technical details

- Key external repo paths the guide centers:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/<app>/`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/<app>.yaml`
- First concrete target for `wesen-os`:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/`

## 2026-03-29: Step 12, First Hetzner GitOps Package For `wesen-os`

With the migration guide and Phase `3B` task list in place, I started the actual cross-repo implementation by creating the first canonical Kustomize package in the Hetzner K3s repo. I stopped deliberately before adding an Argo `Application`, because the safe next checkpoint is “render-valid package exists in the cluster repo,” not “cluster starts trying to deploy it immediately.”

This gives us the first real transfer of Kubernetes ownership from the `wesen-os` draft manifests to the GitOps repo while keeping the live rollout risk controlled.

### Prompt Context

**User prompt (verbatim):** (same as Step 11)

**Assistant interpretation:** After documenting the migration path, start implementing it immediately, task by task.

**Inferred user intent:** Make the cluster repo the real home of the deployment shape, but do it in a staged and auditable way.

### What I did

- Added a new Kustomize package in the Hetzner repo:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/kustomization.yaml`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/namespace.yaml`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/service.yaml`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/ingress.yaml`
- Followed the repo’s conventions:
  - namespace manifest with Argo sync-wave
  - Kustomize package under `gitops/kustomize/<app>`
  - Traefik ingress
  - `letsencrypt-prod` issuer annotation
  - `IfNotPresent` image pull policy
- Kept the current image reference provisional:
  - `ghcr.io/wesen/wesen-os:main`
- Added ticket render helper:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/11-render-hetzner-k3s-wesen-os-package.sh`
- Added render artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/11-hetzner-k3s-wesen-os-package-render.md`
- Committed the K3s-repo slice as:
  - Hetzner repo commit `04328a4` — `Add wesen-os GitOps package`

### Why

- The docs in the Hetzner repo make the target ownership model unambiguous: the canonical cluster package belongs there.
- Adding the package without adding the Argo `Application` lets us validate the manifest shape safely before the cluster starts reconciling it.
- This is the smallest real slice that proves we can move from “draft manifests in the app repo” to “canonical manifests in the GitOps repo.”

### What worked

- The new package rendered successfully with:
  - `kubectl kustomize /home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os`
- The package lines up with the repo’s existing examples such as:
  - `pretext`
  - `artifacts`
- The deployment config remains aligned with the host runtime contract we already proved:
  - `--addr=:8091`
  - `--arc-enabled=false`
  - mounted profile registry config

### What didn't work

- The first version of the ticket render helper had a shell quoting bug because the markdown title contained backticks:
  - shell tried to execute `wesen-os` as a command
- The rendered manifest itself was fine; the bug was only in the reporting helper.
- I fixed the helper and reran the render artifact.

### What I learned

- The Hetzner repo’s package conventions are simple enough that the `wesen-os` host fits naturally as a standard Kustomize app package.
- We do not need the Argo `Application` yet to make real progress. The package-level checkpoint is valuable on its own.
- The first package can stay public-image-oriented for now; image-pull auth can be layered in later if the GHCR package ends up private.

### What was tricky to build

- The main design choice was what **not** to do yet. It would have been easy to add `gitops/applications/wesen-os.yaml` immediately, but that would have turned a manifest-shape task into a live rollout task before the GHCR image and pull-mode questions were settled.
- The other subtlety was deciding how much of the draft `wesen-os` manifest shape to carry over unchanged. I kept the runtime args, probes, config mount, and service shape, but normalized the package to the Hetzner repo’s conventions for namespace, ingress, labels, and sync-wave annotations.

### What warrants a second pair of eyes

- Whether `wesen-os.yolo.scapegoat.dev` is the right ingress hostname or only a temporary placeholder.
- Whether the initial image reference should stay `:main` until the first published SHA exists, or whether we should block even the package from landing until the SHA is known.
- Whether the config belongs in a `ConfigMap` long-term or should later move behind Vault/VSO.

### What should be done in the future

- Decide the GHCR pull strategy:
  - public image
  - or cluster pull secret
- Add `gitops/applications/wesen-os.yaml` only after that decision and after the first real image exists.
- Then wire `wesen-os` CI to propose GitOps image updates into the Hetzner repo.

### Code review instructions

- Start with:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/kustomization.yaml`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml`
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/ingress.yaml`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/11-render-hetzner-k3s-wesen-os-package.sh`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/11-hetzner-k3s-wesen-os-package-render.md`
- Validate with:
  - `kubectl kustomize /home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os`

### Technical details

- Current provisional image ref in the package:
  - `ghcr.io/wesen/wesen-os:main`
- Current provisional ingress host:
  - `wesen-os.yolo.scapegoat.dev`
- K3s repo commit:
  - `04328a41ed201a53457be163367accdf99db584c`

## 2026-03-29: Step 13, Add The `wesen-os` Argo CD Application Definition

Once the Kustomize package existed and I confirmed that `gitops/applications/*.yaml` are applied explicitly in this repo rather than auto-discovered by a root app-of-apps, it became safe to add the `Application` manifest itself. That is an important distinction: adding the file to Git does not, by itself, trigger a live rollout here.

This means we can finish the declarative GitOps shape now and reserve the actual cluster activation for a later, more controlled step.

### Prompt Context

**User prompt (verbatim):** (same as Step 11)

**Assistant interpretation:** Keep progressing through the Hetzner-repo migration in bounded slices, but avoid surprising live-cluster side effects.

**Inferred user intent:** Get the GitOps ownership structure in place while maintaining control over when the live cluster starts reconciling `wesen-os`.

### What I did

- Verified repo behavior by reading the docs and grepping the repo for how `gitops/applications/*.yaml` are introduced.
- Added:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/wesen-os.yaml`
- Added ticket validation helper:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/12-check-hetzner-k3s-wesen-os-application.sh`
- Added generated validation artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/12-hetzner-k3s-wesen-os-application-check.md`
- Committed the K3s-repo slice as:
  - Hetzner repo commit `1c80376` — `Add wesen-os Argo CD application`

### Why

- The K3s repo’s documented model is:
  - Kustomize package in `gitops/kustomize/<app>`
  - Argo `Application` in `gitops/applications/<app>.yaml`
- Without the `Application`, the package exists but the intended GitOps ownership shape is still incomplete.
- Adding the file now is useful because it captures the expected source path, destination namespace, and sync policy in Git, even before anyone applies it.

### What worked

- The new `Application` parsed as valid YAML.
- The validation helper confirmed the key ownership fields:
  - name: `wesen-os`
  - destination namespace: `wesen-os`
  - source repo: `https://github.com/wesen/2026-03-27--hetzner-k3s.git`
  - source path: `gitops/kustomize/wesen-os`
  - sync policy: automated prune + self-heal with `CreateNamespace=true` and `ServerSideApply=true`
- The repo investigation also confirmed that adding this file to Git does not itself apply it to the cluster.

### What didn't work

- Nothing failed technically in this step.
- The important limitation remains:
  - the `Application` exists in Git
  - but it has not been applied to the live cluster yet
  - and we should still resolve image pull mode before doing that

### What I learned

- The cluster repo’s activation model is safer than a root app-of-apps model for this slice because it lets us prepare declarative state without immediate reconciliation.
- With the package and application now both defined, the remaining activation blockers are operational rather than structural:
  - GHCR image availability
  - public vs private image pull mode
  - deliberate `kubectl apply` of the `Application`

### What was tricky to build

- The tricky part was validating the activation semantics before adding the file. If the repo had been auto-applying every `gitops/applications/*.yaml`, this step would have been too early. I explicitly checked the docs and repo patterns first so that the action stayed “declare intent in Git” rather than “accidentally deploy.”
- Another subtlety was not conflating “valid `Application` definition” with “safe to activate.” The manifest shape is correct now, but activation still depends on the image strategy being settled.

### What warrants a second pair of eyes

- Whether the `Application` should target `main` immediately or use a different revision strategy for early rollout testing.
- Whether we want to hold off on actually applying the `Application` until the deployment image is pinned to an immutable SHA instead of `:main`.
- Whether environment-specific overlays should exist before the first live apply, or whether a single staging-oriented path is enough.

### What should be done in the future

- Decide the GHCR pull mode.
- Publish the first real host image.
- Replace the provisional `:main` image ref with an immutable ref.
- Only then apply `gitops/applications/wesen-os.yaml` to the cluster and watch Argo converge.

### Code review instructions

- Start with:
  - `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/wesen-os.yaml`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/12-check-hetzner-k3s-wesen-os-application.sh`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/12-hetzner-k3s-wesen-os-application-check.md`
- Validate with:
  - `yq eval '.' /home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/applications/wesen-os.yaml >/dev/null`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/12-check-hetzner-k3s-wesen-os-application.sh`

### Technical details

- K3s repo commit:
  - `1c803762c59003e9cb86037d584e11dd88917a7a`
- Current source path recorded in the `Application`:
  - `gitops/kustomize/wesen-os`
- Current destination namespace:
  - `wesen-os`

## 2026-03-29: Step 14, Choose The Public GHCR Path For First Host Rollout

With the GitOps package and `Application` definition in place, the next unresolved branch in the implementation tree was image pull mode. I checked the actual GitHub repository visibility for `wesen/wesen-os` instead of assuming it from memory, then used that to choose the first rollout strategy.

The result is that the first intended path should be the simple public-GHCR flow, with one explicit follow-up still left open: after the first real image publish, confirm the GHCR package itself is publicly pullable in practice.

### Prompt Context

**User prompt (verbatim):** (same as Step 11)

**Assistant interpretation:** Keep advancing the migration by resolving real deployment decisions, not just creating file scaffolding.

**Inferred user intent:** Remove ambiguity from the deployment path so the next live rollout steps can proceed with fewer branch points.

### What I did

- Queried GitHub directly:
  - `gh repo view wesen/wesen-os --json visibility,isPrivate,url,nameWithOwner`
- Added ticket helper:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/13-check-wesen-os-repo-visibility.sh`
- Added generated reference artifact:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/13-wesen-os-repo-visibility-and-ghcr-path.md`
- Updated the task board to:
  - mark the public-vs-private pull decision complete
  - add an explicit follow-up to verify actual public pullability after the first image publish

### Why

- The K3s repo docs make the decision tree explicit:
  - public image path if possible
  - pull-secret path only if necessary
- It is better to choose the simple path when the repo supports it instead of prematurely building private-registry plumbing.
- The remaining risk is package visibility at GHCR, not source-repo visibility itself.

### What worked

- GitHub confirmed:
  - `visibility: PUBLIC`
  - `isPrivate: false`
- That is enough to choose the public GHCR path as the default first rollout strategy.
- The K3s package already aligns with that choice because it does not yet require a service account or image pull secret.

### What didn't work

- Nothing failed technically in this step.
- The one thing that remains unresolved is external runtime proof:
  - the repository is public
  - but the GHCR package still needs to be published and then tested for public pullability

### What I learned

- This decision is best made with an explicit repo-visibility check rather than informal memory.
- The source repo being public does not automatically prove the final GHCR package behavior, so the follow-up task to test anonymous pull remains important.
- The simplest path now is:
  - public repo
  - public GHCR image target
  - no pull secret for the first rollout unless verification says otherwise

### What was tricky to build

- The subtlety here was separating **intended path** from **proved runtime behavior**. It would be easy to overstate the result and say “public repo means no auth issues.” The correct conclusion is narrower: a public repo makes the public-image path the right default, but the package-level pull test still has to happen after the first publish.

### What warrants a second pair of eyes

- Whether we want to proactively document how to switch the `wesen-os` package to the private-image pull-secret pattern if the GHCR package does not come out publicly pullable.
- Whether the public-image policy is acceptable long-term for the host service, not just for the first rollout.

### What should be done in the future

- Run the first real host image publish.
- Test:
  - `docker pull ghcr.io/wesen/wesen-os:<pinned-ref>`
- If that fails anonymously, add the cluster-side pull-secret pattern before applying the Argo `Application`.

### Code review instructions

- Start with:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/13-check-wesen-os-repo-visibility.sh`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/13-wesen-os-repo-visibility-and-ghcr-path.md`
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/tasks.md`

### Technical details

- Raw GitHub result:

```json
{"isPrivate":false,"nameWithOwner":"wesen/wesen-os","url":"https://github.com/wesen/wesen-os","visibility":"PUBLIC"}
```

- Current chosen first-rollout strategy:
  - public GHCR image path
  - no cluster-side pull secret unless the first real pull test disproves that path

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

## 2026-03-29: Host Publish Workflow Registration Gap

After moving the canonical cluster manifests into the Hetzner K3s repo, the next critical path was the first real host image publish. Before trying to trigger that workflow, I checked whether GitHub had actually registered the workflow on the `wesen/wesen-os` repository.

### Why this check was necessary

GitHub Actions only exposes `workflow_dispatch` and file-based workflow lookups for workflows that exist on the repository’s default branch. A workflow file that only exists on a local branch or an unmerged feature branch does not count as “registered” for dispatch purposes.

We already hit that exact failure mode earlier on the package-publishing side, so it was worth checking explicitly instead of assuming the workflow had landed.

### Commands used

- `gh workflow list --repo wesen/wesen-os`
- `gh run list --repo wesen/wesen-os --workflow publish-host-image.yml --limit 5`
- `git ls-remote --heads origin`

I also added a ticket helper for this exact check:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/14-check-host-workflow-registration.sh`

and saved the result in:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/14-host-workflow-registration-check.md`

### Result

The workflow is **not** registered on GitHub yet.

- `gh workflow list` returned only:
  - `verify-launcher-canary-consumption`
- `gh run list --workflow publish-host-image.yml` returned:
  - `HTTP 404: Not Found (https://api.github.com/repos/wesen/wesen-os/actions/workflows/publish-host-image.yml)`

### What this means

The local/source-repo implementation work is ahead of `wesen/wesen-os` `main`. The publish workflow exists in the current branch, but GitHub cannot run it yet because the branch has not been merged.

That makes the next execution sequence explicit:

1. push the current `wesen-os` deployment branch
2. open a PR against `wesen/wesen-os`
3. merge that PR so GitHub registers `publish-host-image.yml`
4. run the first real host image publish
5. verify public pullability of the resulting GHCR image
6. pin the Hetzner K3s deployment to an immutable image ref

### What was tricky

The first version of the helper script wrote an incomplete artifact because `gh` error output was going to stderr while the artifact capture redirected only stdout. I fixed the helper to capture both streams, then reran it. I also briefly mistyped the ticket path on the second run and reran that cleanly. Those were tooling mistakes, not architecture issues, but they are worth recording so the artifact trail makes sense later.

### What should happen next

- push the current `task/os-openai-app-server` branch
- open the `wesen-os` PR for the host deployment work
- create a corresponding branch in the Hetzner K3s repo so the canonical GitOps package and Argo `Application` are reviewable there too

## 2026-03-29: Opened The Source And GitOps PRs

With the workflow-registration gap confirmed, I moved the work into reviewable GitHub state instead of leaving it stranded locally.

### Branches pushed

- source repo:
  - `task/os-openai-app-server`
- Hetzner K3s repo:
  - `task/deploy-001-wesen-os-gitops`

### PRs opened

- `wesen/wesen-os#5`
  - `https://github.com/wesen/wesen-os/pull/5`
- `wesen/2026-03-27--hetzner-k3s#5`
  - `https://github.com/wesen/2026-03-27--hetzner-k3s/pull/5`

I also added a ticket helper that snapshots both PRs:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/15-check-deploy-prs.sh`

with the captured output stored in:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/15-deploy-pr-check.md`

### Why this split matters

The two PRs serve different purposes and should stay separate:

- `wesen-os` owns:
  - host image build
  - GHCR publish workflow
  - repo-local deployment docs and ticket artifacts
  - transitional source-repo Kubernetes examples
- `2026-03-27--hetzner-k3s` owns:
  - canonical cluster Kustomize package
  - Argo CD `Application`
  - eventual immutable image pin used by the cluster

That is the architecture we want later anyway, so it is better to make the review split explicit now.

### Current PR state at creation time

Both PRs came up clean immediately:

- `wesen/wesen-os#5`
  - `mergeStateStatus: CLEAN`
- `wesen/2026-03-27--hetzner-k3s#5`
  - `mergeStateStatus: CLEAN`

### What should happen next

- merge `wesen/wesen-os#5` so GitHub registers `publish-host-image.yml`
- run the first real host image publish from GitHub Actions
- verify the published GHCR image is publicly pullable
- then update the Hetzner K3s package from the provisional `:main` image tag to an immutable digest or pinned SHA ref

## 2026-03-29: First Real Host Publish Failed On A Missing Tracked Directory

After merging `wesen/wesen-os#5`, GitHub registered both deployment workflows immediately:

- `deploy-host-to-k3s`
- `publish-host-image`

The first `publish-host-image` run started automatically on the merge to `main`:

- run: `https://github.com/wesen/wesen-os/actions/runs/23718680532`

### What failed

The run failed in `Build launcher binary`, before Docker build or GHCR push even started.

The key CI error was:

```text
reading directory src/domain/vm/docs: open src/domain/vm/docs: no such file or directory
```

That came from the launcher prebuild step:

- `apps/os-launcher/package.json`
  - `vmmeta:generate`

which calls:

- `go run ../../workspace-links/go-go-os-backend/cmd/go-go-os-backend vmmeta generate ... --docs-dir src/domain/vm/docs ...`

### Root cause

This was not a GitHub-specific problem. It was a repository-shape problem.

Locally, `apps/os-launcher/src/domain/vm/docs/` already existed on disk as an empty directory, so `npm run launcher:binary:build` passed. But Git does not track empty directories, and the repo did not contain any placeholder file there. In a clean GitHub Actions checkout, the directory simply did not exist.

So the build had an implicit dependency on a locally-present, untracked empty directory.

### Fix

I added a tracked placeholder file:

- `apps/os-launcher/src/domain/vm/docs/.gitkeep`

I also added a ticket helper to make this class of issue explicit:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/16-check-vm-doc-dirs.sh`

with the captured output stored in:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/16-vm-doc-dirs-check.md`

### Validation

After adding the tracked placeholder, this passed locally again:

- `npm run launcher:binary:build`

That is the correct validation for this slice because it exercises the exact failing path from CI:

1. launcher frontend prebuild
2. `vmmeta:generate`
3. UI sync
4. Go launcher binary build

### Important nuance

There is another empty VM docs directory in the inventory submodule:

- `workspace-links/go-go-app-inventory/apps/inventory/src/domain/vm/docs`

I checked it because it has the same structural smell, but I deliberately did **not** fold a submodule change into this host-publish repair slice. The immediate failure path was the launcher build in the root repo, so I kept the actual fix bounded to the root repository.

### What should happen next

- commit the launcher placeholder-directory fix
- push it as a small follow-up PR to `wesen/wesen-os`
- merge it
- rerun `publish-host-image`
- if that run succeeds, move immediately to digest capture and GHCR pull verification

## 2026-03-29: Second Host Publish Failed On Buildx Driver Configuration

The launcher placeholder fix did its job. After merging `wesen/wesen-os#6`, the rerun advanced through:

- dependency install
- launcher binary build
- GHCR login
- Docker metadata extraction

and then failed in the Docker push step:

- run: `https://github.com/wesen/wesen-os/actions/runs/23718753340`

### Exact failure

The critical line from the failed step was:

```text
ERROR: failed to build: Cache export is not supported for the docker driver.
```

The workflow currently asks Buildx to use GitHub Actions cache:

- `cache-from: type=gha`
- `cache-to: type=gha,mode=max`

but it never sets up a Buildx builder that supports that backend. On GitHub Actions, that left the workflow on the default `docker` driver, which does not support exporting cache to `type=gha`.

### Why this matters

This is a pipeline-configuration bug, not an application build bug. The repo itself built correctly this time. The failure moved later, which is exactly what we want from iterative CI repair work.

### Fix

The right fix is to add:

- `docker/setup-buildx-action@v3`

before the `docker/build-push-action@v6` step, so the workflow uses a proper Buildx builder instead of relying on the default Docker driver.

I also added a ticket helper for this failure capture:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/17-capture-host-publish-failure.sh`

### What should happen next

- patch `publish-host-image.yml` with an explicit Buildx setup step
- merge that fix
- rerun `publish-host-image`
- if the run succeeds, capture the published digest and verify public pull behavior

## 2026-03-29: First Successful Host Image Publish And Public Pull Proof

The third host publish attempt finally succeeded end to end:

- run: `https://github.com/wesen/wesen-os/actions/runs/23718834950`

This was the first run that included both CI repairs:

- tracked launcher VM docs directory
- explicit `docker/setup-buildx-action@v3`

### Published image ref

The immutable digest from the successful run is:

- `ghcr.io/wesen/wesen-os@sha256:751929d27806403965bc7998ed1e4dfec168b1ee81723535dd695b04b8e8fbf2`

The run also pushed these tags:

- `ghcr.io/wesen/wesen-os:main`
- `ghcr.io/wesen/wesen-os:sha-4a14ccc`

### Evidence captured

I added:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/18-capture-host-publish-success.sh`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/19-check-public-ghcr-pull.sh`

and used them to capture:

- run/digest proof
- anonymous pull proof

### Public pull verification

I checked the digest with an empty Docker config so no cached local credentials could influence the result.

The decisive command was effectively:

- `DOCKER_CONFIG=$(mktemp -d) docker pull ghcr.io/wesen/wesen-os@sha256:751929d27806403965bc7998ed1e4dfec168b1ee81723535dd695b04b8e8fbf2`

That succeeded.

This is the important operational conclusion: the cluster does **not** need a pull secret for the first `wesen-os` host rollout if it uses this public GHCR image path.

### Nuance

A direct raw HTTP probe against the registry manifest endpoint still returned `401 Unauthorized`. That is not the same thing as “the image is private”; registries commonly use an auth challenge and token flow for anonymous clients. The meaningful operational test is the anonymous Docker client pull, and that passed.

### What should happen next

- pin the Hetzner K3s deployment manifest to the immutable digest
- push that update into `wesen/2026-03-27--hetzner-k3s#5`
- then merge the GitOps PR

## 2026-03-29: Consolidating `wesen-os` To The `draft-review` GitOps-PR Model

After the first successful host publish, the main architectural question was no longer “can we build and publish the image?” It was “are we using the same operator model we already documented and proved elsewhere?”

The answer was: not yet.

### Why this follow-up was necessary

At this point `wesen-os` still had two separate deployment-era workflows:

- `.github/workflows/publish-host-image.yml`
- `.github/workflows/deploy-host-to-k3s.yml`

That shape is acceptable during early bring-up, but it is not the clean standard documented in the Hetzner K3s repo and already exercised by `draft-review`.

The standard model is:

```text
source repo CI
  -> publish immutable GHCR image
  -> open GitOps PR against the K3s repo
  -> reviewer merges PR
  -> Argo CD reconciles cluster
```

That flow keeps the control-plane boundaries clear:

- source repo owns build/publish logic
- GitOps repo owns desired deployment state
- Argo owns rollout

### What I reviewed before changing code

- `/home/manuel/code/wesen/2026-03-24--draft-review/.github/workflows/publish-image.yaml`
- `/home/manuel/code/wesen/2026-03-24--draft-review/deploy/gitops-targets.json`
- `/home/manuel/code/wesen/2026-03-24--draft-review/scripts/open_gitops_pr.py`
- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md`
- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md`
- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/public-repo-ghcr-argocd-deployment-playbook.md`
- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml`
- `.github/workflows/publish-host-image.yml`
- `.github/workflows/deploy-host-to-k3s.yml`

### Core conclusion

`draft-review` was not merely “another way to do it.” It is the correct normalization target for `wesen-os` too:

- keep image publishing in the source repo
- add `deploy/gitops-targets.json`
- add `scripts/open_gitops_pr.py`
- let the publish workflow open the GitOps PR itself
- leave the manual `kubectl` workflow only as a break-glass operator path

That is also the model another colleague expected to see in the docs, which is a useful signal: the current documentation still makes this too easy to miss.

### Changes made in this slice

I added the source-repo metadata that the GitOps PR flow needs:

- `deploy/gitops-targets.json`
- `scripts/open_gitops_pr.py`

The target metadata is intentionally minimal and points at the canonical cluster manifest:

- repo: `wesen/2026-03-27--hetzner-k3s`
- branch: `main`
- manifest: `gitops/kustomize/wesen-os/deployment.yaml`
- container: `wesen-os`

I then rewrote `.github/workflows/publish-host-image.yml` to follow the same structure as `draft-review`:

- top-level workflow permissions
- workflow concurrency
- `docker` job for build/publish
- `gitops-pr` job that runs only after `docker`
- shell-side empty-token check for `GITOPS_PR_TOKEN`

I also modernized the shared action versions while touching the file:

- `actions/checkout@v5`
- `actions/setup-node@v5`
- `docker/setup-buildx-action@v4`
- `docker/login-action@v4`
- `docker/metadata-action@v6`
- `docker/build-push-action@v7`
- `actions/setup-python@v6`

That change is not cosmetic. It also removes the earlier drift from the reference workflow and reduces the chance that future debugging gets obscured by old action-version behavior.

### Ticket helper scripts added for this step

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/20-compare-draft-review-publish-workflow.sh`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/21-check-open-gitops-pr-helper.sh`

These exist for two reasons:

1. they let us compare the local `wesen-os` workflow against the `draft-review` reference quickly
2. they let us dry-run the GitOps PR helper against the local Hetzner K3s checkout before depending on GitHub Actions

### Documentation work discovered during this slice

While reviewing the K3s docs and discussing the model, it became obvious that the GitHub -> GitOps PR handoff is still too implicit. The information exists, but it is too distributed across:

- the app-packaging standard
- the public-GHCR playbook
- the source-app deployment playbook

The ticket backlog now explicitly includes follow-up tasks to tighten that documentation:

- add a short top-level deployment-model page in the K3s repo
- move the GitHub -> GitOps PR flow nearer the top of the main app-packaging doc
- add a “most common misunderstanding” section explaining that GHCR publish is not deployment by itself
- add a concrete end-to-end reference section pointing at `draft-review`

This is worth doing only after the `wesen-os` source repo actually follows the same model. Otherwise the documentation would be ahead of the implementation and therefore less trustworthy.

### What should happen next

- dry-run `scripts/open_gitops_pr.py` locally against `/home/manuel/code/wesen/2026-03-27--hetzner-k3s`
- validate the updated workflow YAML
- commit the publish-success checkpoint and workflow-consolidation slice in bounded commits
- then push the branch and run the new `gitops-pr` job on GitHub

## 2026-03-29: Pinning The Hetzner GitOps Package To The Immutable `wesen-os` Digest

Once the source-repo workflow consolidation was committed, the next operational gap was in the GitOps repo itself.

The ticket prose already treated the K3s deployment as if it had been pinned to an immutable image, but the actual branch state in `/home/manuel/code/wesen/2026-03-27--hetzner-k3s` still needed to be checked carefully.

### What I found

The live feature branch was:

- `task/deploy-001-wesen-os-gitops`

and PR `#5` was still open:

- `https://github.com/wesen/2026-03-27--hetzner-k3s/pull/5`

The manifest no longer pointed at `:main`, but it still needed a final normalization step. The deployment file was effectively in this intermediate state:

- `ghcr.io/wesen/wesen-os:sha-4a14ccc`

That is better than `:main`, but it is still not the strongest deployment contract we want. The ticket guidance for this project is to use immutable image refs in manifests whenever possible.

### Decision

Pin the deployment to the exact digest produced by the successful host publish run:

- `ghcr.io/wesen/wesen-os@sha256:751929d27806403965bc7998ed1e4dfec168b1ee81723535dd695b04b8e8fbf2`

This is the right GitOps contract because:

- it cannot drift if tags are moved later
- it makes rollback and provenance simpler
- it matches the deployment policy we already wrote into the ticket tasks

### Validation

I added another helper script for the ticket record:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/22-check-k3s-wesen-os-image-pin.sh`

That helper does two things:

1. prints the current image line from `gitops/kustomize/wesen-os/deployment.yaml`
2. runs:
   - `kubectl kustomize /home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os`

The captured output lives in:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/22-k3s-wesen-os-image-pin-check.md`

The render validation succeeded, which means the digest pin did not break the Kustomize package.

### GitOps repo commit

I committed the Hetzner repo slice as:

- `4eed295` `Pin wesen-os deployment to published image digest`

### What should happen next

- push `task/deploy-001-wesen-os-gitops`
- update PR `#5`
- merge the GitOps PR once reviewed
- then run the new source-repo `gitops-pr` workflow path on GitHub so the next image bump happens automatically instead of by local manifest edit

## 2026-03-29: Pushing The Consolidated Source Flow And Updating The Open GitOps PR

After the source-repo and GitOps-repo slices were committed locally, I pushed both branches so the work could actually move through review.

### Source repo

Branch pushed:

- `task/deploy-001-draft-review-flow`

Draft PR opened:

- `https://github.com/wesen/wesen-os/pull/8`

That PR is the key handoff for the new automation path. Once it lands on `main`, `wesen-os` will stop depending on the manual deploy workflow as its primary deployment story and will instead follow the same release shape as `draft-review`:

- publish image
- then open GitOps PR

### GitOps repo

Updated branch pushed:

- `task/deploy-001-wesen-os-gitops`

Existing PR carrying the digest pin:

- `https://github.com/wesen/2026-03-27--hetzner-k3s/pull/5`

I also verified through `gh pr view` that the new commit is present on that PR:

- `4eed295` `Pin wesen-os deployment to published image digest`

### Why this matters for documentation later

This is exactly the point where the K3s docs can become more concrete. We now have all of the real pieces needed for an intern-facing end-to-end example:

- source workflow consolidation PR in `wesen-os`
- GitOps PR in the Hetzner repo
- immutable GHCR digest
- local validation helpers
- a direct `draft-review` comparison artifact

That means the later documentation update can point at real repositories and real pull requests instead of describing an intended future system.

### What should happen next

- review and merge `wesen/wesen-os#8`
- review and merge `wesen/2026-03-27--hetzner-k3s#5`
- then observe the first GitHub run of the new `gitops-pr` job on `wesen-os`
- once that is green, start the K3s doc update slice with concrete examples from these PRs

## 2026-03-29: Tightening The K3s Docs Around The One-Time Argo Bootstrap Step

After checking the current K3s docs again, the conclusion changed slightly but not completely.

### What I found on re-read

The initial `kubectl apply -f gitops/applications/...` step was already documented in several concrete examples:

- `README.md`
- `docs/argocd-app-setup.md`
- `docs/coinvault-k3s-deployment-playbook.md`

So the problem was not “the docs never mention `kubectl apply`.”

The real problem was more specific:

- the docs did not clearly teach the generic rule
- they did not say bluntly that a brand-new file under `gitops/applications/` is only Git state until the `Application` object exists in the cluster once
- they also did not say explicitly that this repo does not currently have an app-of-apps or `ApplicationSet` layer that auto-creates every new `Application`

That is exactly why the `wesen-os` rollout question was easy to get wrong even after reading the docs.

### Docs updated

I patched the K3s repo directly in these files:

- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/README.md`
- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md`
- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md`
- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/public-repo-ghcr-argocd-deployment-playbook.md`

### What the new text says

The new wording now makes all of these points explicit:

- publishing to GHCR is not deployment by itself
- merging a GitOps PR is not sufficient if the `Application` object does not exist yet
- this repo does not currently auto-materialize new `Application` objects from `gitops/applications/`
- the first rollout of a new app includes a one-time bootstrap step:
  - `kubectl apply -f gitops/applications/<app>.yaml`
  - `kubectl -n argocd annotate application <app> argocd.argoproj.io/refresh=hard --overwrite`
- after that, normal GitOps PR merges are enough because Argo already has the `Application` object

### Ticket helper and validation artifact

I added another ticket helper:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/23-check-k3s-doc-bootstrap-instructions.sh`

and captured its output in:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/23-k3s-doc-bootstrap-instruction-check.md`

That artifact is intentionally simple: it proves the new bootstrap-language anchors now exist in the main docs that operators are likely to read first.

### K3s repo commit

The documentation fix was committed and pushed on the K3s repo as:

- `ec2537b` `Clarify one-time Argo application bootstrap`

### What still remains

The docs are better now, but there are still higher-level doc tasks left open:

- a short top-level deployment-model page
- a concrete reference implementation section that points at `draft-review`, `deploy/gitops-targets.json`, `scripts/open_gitops_pr.py`, and the matching GitOps manifests

Those are still worth doing, but the immediate shortcoming that caused confusion in the `wesen-os` rollout path is now addressed directly.

## 2026-03-29: Federation Kickoff, Inventory Contract Audit

With `wesen-os` live on K3s, the deployment half of `DEPLOY-001` is no longer the critical path. I switched the ticket focus to the first real federation step: make one app consumable through a single explicit host contract before introducing runtime remote loading.

### Why start here

The host still consumes app code in a package-linked way. That is expected today, but it is not yet shaped like a future federated remote. The key smell I wanted to remove first was “host reaches into several unrelated public entrypoints for one app.”

`inventory` was already the agreed first remote candidate, so I treated it as the first contract-hardening target.

### Files reviewed in this audit

- `apps/os-launcher/src/app/modules.tsx`
- `apps/os-launcher/src/app/store.ts`
- `apps/os-launcher/src/app/registerAppsBrowserDocs.ts`
- `apps/os-launcher/src/app/hypercardReplModule.tsx`
- `apps/os-launcher/src/app/runtimeDebugModule.tsx`
- `apps/os-launcher/src/app/taskManagerModule.tsx`
- `apps/os-launcher/src/__tests__/launcherHost.test.tsx`
- `workspace-links/go-go-app-inventory/apps/inventory/package.json`
- `workspace-links/go-go-app-inventory/apps/inventory/src/index.ts`
- `workspace-links/go-go-app-inventory/apps/inventory/src/reducers.ts`
- `workspace-links/go-go-app-inventory/apps/inventory/src/launcher/public.ts`
- `workspace-links/go-go-app-inventory/apps/inventory/src/domain/vmmeta.ts`
- `workspace-links/go-go-os-frontend/packages/os-shell/src/index.ts`
- `workspace-links/go-go-os-frontend/packages/os-shell/src/contracts/launchableAppModule.ts`
- `workspace-links/go-go-os-frontend/packages/os-shell/src/store/createLauncherStore.ts`

### What I found

The host currently depends on `inventory` through three separate public surfaces:

- `@go-go-golems/inventory/launcher`
  - for `inventoryLauncherModule`
  - for `inventoryStack`
- `@go-go-golems/inventory/reducers`
  - for `inventoryReducer`
  - for `salesReducer`
- `@go-go-golems/inventory`
  - for `INVENTORY_VM_PACK_METADATA`

That fragmentation shows up in several host files:

- `apps/os-launcher/src/app/modules.tsx`
- `apps/os-launcher/src/app/store.ts`
- `apps/os-launcher/src/app/registerAppsBrowserDocs.ts`
- `apps/os-launcher/src/app/hypercardReplModule.tsx`
- `apps/os-launcher/src/app/runtimeDebugModule.tsx`
- `apps/os-launcher/src/app/taskManagerModule.tsx`

This is still a valid package API, but it is the wrong shape for the future remote-loading story. A federated remote wants one stable host-facing contract. The host should not need to know that launcher state, docs metadata, and runtime bundles live behind different import paths.

### Decision for the first implementation slice

The first federation-enabling code change should be deliberately small:

1. add a generic host-contract type to `@go-go-golems/os-shell`
2. add a dedicated `@go-go-golems/inventory/host` export
3. move the inventory host-facing values behind one contract object
4. switch `apps/os-launcher` to consume that contract everywhere
5. tighten host tests so they enforce the new single-entrypoint rule

That does **not** make inventory a real remote yet. It is still statically linked package code. But it gives us the right abstraction boundary so the later Module Federation loader can replace one import surface instead of many unrelated ones.

### Ticket helper added

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/25-audit-inventory-host-surface.sh`

This helper is intentionally small and boring. Its only job is to capture the current import surface and public exports so later diary/doc updates can compare “before” and “after” without hand-reconstructing the audit.

### What happens next

- update the task board with concrete inventory-federation slices
- add the shared host-contract type in `os-shell`
- add the dedicated inventory host export
- switch the host imports
- run host tests and typechecks

## 2026-03-29: First Federation Code Slice, Collapse Inventory To One Host Contract

After the audit, I implemented the first real code step toward federation. The scope was intentionally narrow: do not add dynamic loading yet, do not add Module Federation config yet, and do not redesign the launcher. Just replace the fragmented `inventory` host surface with one explicit contract boundary.

### Design decision

I chose a dedicated package subpath:

- `@go-go-golems/inventory/host`

That subpath now acts as the single launcher-facing boundary for `inventory`. This is the same shape we are likely to want later when the app stops being linked locally and starts being loaded through a remote entrypoint or manifest-backed host contract.

To avoid making the contract inventory-specific, I also added a generic type in `@go-go-golems/os-shell`:

- `FederatedAppHostContract`

It currently includes:

- `remoteId`
- `launcherModule`
- `sharedReducers`
- `docsMetadata`
- `runtimeBundles`

That is enough for the current launcher integration points and small enough to evolve safely later.

### Files changed

In `go-go-os-frontend`:

- `workspace-links/go-go-os-frontend/packages/os-shell/src/contracts/federatedAppHostContract.ts`
- `workspace-links/go-go-os-frontend/packages/os-shell/src/index.ts`

In `go-go-app-inventory`:

- `workspace-links/go-go-app-inventory/apps/inventory/src/host.ts`
- `workspace-links/go-go-app-inventory/apps/inventory/package.json`

In `wesen-os`:

- `apps/os-launcher/src/app/modules.tsx`
- `apps/os-launcher/src/app/store.ts`
- `apps/os-launcher/src/app/registerAppsBrowserDocs.ts`
- `apps/os-launcher/src/app/hypercardReplModule.tsx`
- `apps/os-launcher/src/app/runtimeDebugModule.tsx`
- `apps/os-launcher/src/app/taskManagerModule.tsx`
- `apps/os-launcher/src/app/runtimeDebugModule.test.tsx`
- `apps/os-launcher/src/__tests__/launcherHost.test.tsx`

### What changed in behavior

Before this step, the host reached into:

- `@go-go-golems/inventory/launcher`
- `@go-go-golems/inventory/reducers`
- `@go-go-golems/inventory`

After this step, the production host code reaches into:

- `@go-go-golems/inventory/host`

The contract object carries the same data the launcher previously pulled from three separate entrypoints:

- launcher module
- shared reducers
- docs metadata
- runtime stack bundle

That is a better pre-federation shape because the future runtime loader only needs to replace one stable boundary.

### One failure along the way

The implementation passed `apps/os-launcher` typecheck immediately, but the first focused test run failed:

- command:
  - `npm run test -w apps/os-launcher -- --run runtimeDebugModule registerAppsBrowserDocs launcherHost`
- failure:
  - `runtimeDebugModule.test.tsx` timed out after 5000ms

The root cause was not a real runtime regression. I had updated the production import path to `@go-go-golems/inventory/host` but left one test mock on the old path:

- stale mock:
  - `vi.mock('@go-go-golems/inventory/launcher', ...)`

That meant the test imported the real module graph instead of the stubbed host contract. After switching the mock to:

- `vi.mock('@go-go-golems/inventory/host', ...)`

the focused test set passed cleanly.

### Validation

Commands run:

- `npm run typecheck -w apps/os-launcher`
- `npm run typecheck -w workspace-links/go-go-app-inventory/apps/inventory`
- `npm run test -w apps/os-launcher -- --run runtimeDebugModule registerAppsBrowserDocs launcherHost`

All three passed after the mock-path correction.

### Ticket helper added

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/26-validate-inventory-host-contract.sh`

This helper reruns the exact narrow validation loop for this slice and also prints the launcher’s remaining `inventory` import surface so future diary/doc work can verify that the collapse stayed intact.

### What this does not solve yet

This is still package-linked composition, not real runtime federation.

The remaining gaps are now clearer than before:

- the host still statically imports `inventory`
- there is no manifest or remote registry yet
- there is no runtime timeout/failure UX for a missing remote
- there is no object-storage upload flow yet

That is fine. The point of this slice was to create the correct contract boundary before we introduce runtime loading machinery.

## 2026-03-29: Second Federation Code Slice, Centralize The Launcher-Side Seam

The first code slice got the host onto `@go-go-golems/inventory/host`, but the integration knowledge was still spread across several launcher files. That is better than before, but still not the best seam for future remote loading.

So the next step was to move the launcher-side package touchpoint into one local registry/adapter file:

- `apps/os-launcher/src/app/localFederatedAppContracts.ts`

### Why this matters

For future federation, the host should eventually be able to swap:

- “import local package contract”

for:

- “load remote contract from manifest/remote module”

If package knowledge is spread across `modules.tsx`, `store.ts`, `registerAppsBrowserDocs.ts`, `hypercardReplModule.tsx`, `runtimeDebugModule.tsx`, and `taskManagerModule.tsx`, that later swap becomes tedious and error-prone.

By centralizing that package touchpoint into one local adapter file, the host now has a much clearer seam:

- launcher production code reads from `localFederatedAppContracts.ts`
- that local file is the only production place that imports `@go-go-golems/inventory/host`

That is still not dynamic federation, but it is the correct host-side structure for getting there.

### Files changed

- `apps/os-launcher/src/app/localFederatedAppContracts.ts`
- `apps/os-launcher/src/app/modules.tsx`
- `apps/os-launcher/src/app/store.ts`
- `apps/os-launcher/src/app/registerAppsBrowserDocs.ts`
- `apps/os-launcher/src/app/hypercardReplModule.tsx`
- `apps/os-launcher/src/app/runtimeDebugModule.tsx`
- `apps/os-launcher/src/app/taskManagerModule.tsx`
- `apps/os-launcher/src/__tests__/launcherHost.test.tsx`

### New local adapter responsibilities

The new file owns these helper surfaces:

- `inventoryLocalContract`
- `localFederatedAppContracts`
- `listLocalFederatedLauncherModules()`
- `collectLocalFederatedSharedReducers()`
- `listLocalFederatedDocsMounts()`
- `listLocalFederatedRuntimeBundles()`

That means the rest of the launcher now consumes:

- launcher modules
- reducers
- docs mounts
- runtime bundles

through local helpers instead of importing the inventory package directly.

### One type issue I had to fix

The first version of `listLocalFederatedDocsMounts()` widened metadata to `Record<string, unknown>`. That broke `apps/os-launcher` typecheck because `createVmmetaSurfaceDocsMount()` wants `VmmetaMetadata`, which requires `packId`.

The fix was to keep the local docs-mount metadata typed from the actual inventory contract:

- `metadata: typeof inventoryLocalContract.docsMetadata`

That preserved the concrete metadata shape without inventing a new cross-package docs type in the wrong place.

### Validation

Commands run:

- `npm run typecheck -w apps/os-launcher`
- `npm run test -w apps/os-launcher -- --run runtimeDebugModule registerAppsBrowserDocs launcherHost`
- `rg -n "@go-go-golems/inventory(?:/host|/launcher|/reducers|\\b)" apps/os-launcher/src apps/os-launcher/src/__tests__`

Results:

- launcher typecheck passed
- focused launcher tests passed
- production launcher imports now point at `localFederatedAppContracts.ts` instead of importing `inventory` directly

There are still a couple of test-only imports of `inventory`, which is acceptable for now. The important change is that the production launcher code now has one local seam where inventory package knowledge lives.

### Ticket helper added

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/27-audit-local-federated-contract-seam.sh`

This helper exists so later documentation can show the exact transition from:

- many production imports of `@go-go-golems/inventory/*`

to:

- one local seam file plus a couple of tests

without relying on memory.

### What should happen next

The next real step should stop being about TypeScript packaging shape and start becoming about runtime behavior:

- define the concrete remote registry format the host will read
- add a host-side loader interface that can return local contracts now and remote contracts later
- then wire the first `inventory` remote implementation path on top of that interface

## 2026-03-29: Third Federation Code Slice, Introduce The Host Registry Shape

With the launcher-side seam centralized, the next step was to stop treating the list of local contracts as an unstructured constant and instead give the host an explicit registry shape.

I added:

- `apps/os-launcher/src/app/federationRegistry.ts`

This defines:

- `FederatedRemoteMode`
- `FederatedRemoteRegistryEntry`
- `FederatedRemoteRegistry`
- `DEFAULT_LOCAL_FEDERATION_REGISTRY`

### Why this matters

Before this step, the host could list local contracts, but there was no configuration model describing *why* a contract was present or how it was meant to be loaded.

Now the launcher has an explicit registry entry for `inventory`:

- `remoteId: 'inventory'`
- `mode: 'local-package'`
- `enabled: true`
- `contractExport: '@go-go-golems/inventory/host'`

That is still static and local, but it is much closer to the future runtime story. The only thing missing is the `remote-manifest` branch implementation.

### Resolver behavior

I updated `localFederatedAppContracts.ts` so it no longer assumes “all known contracts are always active.” Instead, it resolves contracts from `DEFAULT_LOCAL_FEDERATION_REGISTRY`.

Important behavior:

- disabled entries are skipped
- unknown local remote ids fail loudly
- non-local modes also fail loudly in the local resolver

That last point matters. Silent fallback would make the eventual remote-manifest migration much harder to debug.

### Validation

Commands run:

- `npm run typecheck -w apps/os-launcher`
- `npm run test -w apps/os-launcher -- --run launcherHost runtimeDebugModule registerAppsBrowserDocs`

Both passed.

### Ticket helper added

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/28-audit-federation-registry-shape.sh`

This helper prints both the new registry definition and the current local resolver so later docs can show the exact “registry exists, but remote-manifest mode is not implemented yet” state.

### State after this slice

The host now has three increasingly better layers:

1. remote app package exposes one host contract:
   - `@go-go-golems/inventory/host`
2. launcher has one local seam for package touchpoints:
   - `localFederatedAppContracts.ts`
3. launcher has an explicit registry/config shape:
   - `federationRegistry.ts`

That is enough structure to start the next real step:

- implement a remote-manifest loader path behind the same registry model

without rewriting the host again from scratch.

## 2026-03-30: Fourth Federation Code Slice, Add The First Manifest-Backed Loader

This is the first step that actually crosses from “better static structure” into “runtime federation mechanics.”

I added:

- `apps/os-launcher/src/app/loadFederatedAppContracts.ts`
- `apps/os-launcher/src/app/loadFederatedAppContracts.test.ts`
- `apps/os-launcher/src/app/fixtures/remoteInventoryContract.mjs`

and expanded:

- `apps/os-launcher/src/app/federationRegistry.ts`

### What this slice implements

The launcher now has an async loader that can resolve contracts from the registry in two modes:

1. `local-package`
   - resolve the contract from the local registry as before
2. `remote-manifest`
   - fetch a manifest JSON document
   - validate the manifest shape
   - resolve the entry URL relative to the manifest URL
   - dynamically import the remote module
   - extract the configured export
   - validate that the export looks like a `FederatedAppHostContract`

That means the host can now load a manifest-backed remote contract through the same top-level API, even though the production launcher is not yet wired to use this async path during startup.

### Manifest shape used in this step

I added a concrete host-side manifest model in `federationRegistry.ts`:

- `FederatedRemoteManifest`
- `FederatedRemoteManifestContract`

Current required fields:

- `version`
- `remoteId`
- `contract.entry`
- optional `contract.exportName`

This is a deliberately minimal bootstrap contract. It is enough to prove the runtime loading path without forcing the full CDN/build pipeline first.

### Why I treated this as valid progress even though it is not full Module Federation yet

The repo still has no producer-side federation build tooling installed, and there is no emitted `mf-manifest.json` from `inventory` yet. So the pragmatic move here was:

- keep the registry and manifest terminology aligned with the desired end-state
- implement the host loader mechanics now
- leave the producer-side build/output wiring for the next task

That gives us working host behavior we can test today instead of waiting for the entire producer pipeline to exist first.

### Validation

Commands run:

- `npm run typecheck -w apps/os-launcher`
- `npm run test -w apps/os-launcher -- --run loadFederatedAppContracts launcherHost runtimeDebugModule registerAppsBrowserDocs`

The new tests cover:

- loading enabled local-package contracts from the registry
- loading a manifest-backed contract through fetch + dynamic import
- failing when the remote manifest/exported contract does not match the expected `remoteId`

All passed.

### Ticket helper added

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/29-audit-federated-loader.sh`

This helper prints the registry shape, loader implementation, and loader tests together so later docs can show the exact first-runtime-loader state in one place.

### What this still does not do

This slice does **not** yet:

- build a real `inventory` manifest from a remote build
- upload remote assets to Hetzner
- wire the async loader into launcher startup
- add UI fallback behavior when a remote fails to load

Those are the next tasks.

## 2026-03-30: Fifth Federation Code Slice, Build A Real Inventory Artifact And Smoke It

The loader path existed after the previous step, but it was still only proven against synthetic manifests and fixture modules. The next thing I wanted was a real producer artifact from `inventory` that the launcher loader could consume without any fake module object in the middle.

### Producer build added

In `go-go-app-inventory`, I added:

- `workspace-links/go-go-app-inventory/apps/inventory/vite.federation.config.ts`
- `build:federation` in `workspace-links/go-go-app-inventory/apps/inventory/package.json`

I also refactored the shared Vite helper slightly so both the normal app build and the federation build can reuse the same frontend-resolution alias logic:

- `workspace-links/go-go-app-inventory/tooling/vite/createHypercardViteConfig.ts`

### What the new build emits

The federation build now writes:

- `dist-federation/mf-manifest.json`
- `dist-federation/inventory-host-contract.js`

Current manifest contents are intentionally minimal:

- `version`
- `remoteId`
- `compatiblePlatformRange`
- `contract.entry`
- `contract.exportName`

This is not full producer-side Module Federation yet. It is a minimal manifest-emitting remote artifact that matches the host loader we just built.

### Real smoke path

I added:

- `apps/os-launcher/src/app/loadFederatedAppContracts.real.test.ts`

This test is skipped unless `INVENTORY_FEDERATION_MANIFEST_FILE` is set. When enabled, it:

1. uses the real built `mf-manifest.json`
2. passes a file-backed fetcher into `loadFederatedAppContracts`
3. loads the real built `inventory-host-contract.js`
4. validates the loaded contract
5. calls `buildLaunchWindow()` on the loaded launcher module

So this is no longer a fake fixture pretending to be a producer build. It is the real inventory artifact going through the real host loader.

### Ticket helper added

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/30-real-inventory-federation-smoke.sh`

That helper does the full bounded operator loop:

1. `npm run build:federation -w workspace-links/go-go-app-inventory/apps/inventory`
2. set `INVENTORY_FEDERATION_MANIFEST_FILE`
3. run the explicit launcher real-smoke test

### Real results

The build succeeded and emitted:

- `dist-federation/mf-manifest.json`
- `dist-federation/inventory-host-contract.js`

The bundled contract file is currently large:

- about 2.6 MB uncompressed

That is expected for now because we are still bundling the entire host-contract graph rather than doing real shared singleton negotiation and remote chunk splitting.

There was also one Vite warning during the producer build:

- QuickJS-related code pulled in a browser-compat externalization warning for Node’s `module`

The build still completed, so I recorded it as a warning rather than a blocker. It likely reflects the current broad `inventory` dependency graph more than the federation build wrapper itself.

### Why I consider this “real enough”

This is the first point where we can truthfully say:

- the producer emits a real artifact
- the host loader consumes that real artifact
- the loaded contract can execute launcher behavior

It is still not the final browser/runtime deployment path, but it is no longer hypothetical.

### What remains

The next gaps are now very concrete:

- wire the async loader into actual launcher startup
- decide how the runtime registry source is provided
- reduce or explicitly manage shared dependencies instead of bundling the whole world into one contract file
- eventually replace this minimal manifest with the full remote build/deploy path

## 2026-03-30: Sixth Federation Code Slice, Bootstrap The Launcher Through `remote-manifest` And Capture The First Browser Runtime Blocker

After the real inventory artifact smoke, the next job was to stop treating the manifest-backed loader as a side utility and actually put it on the launcher startup path. I wanted the launcher to decide at boot whether it should load the local inventory contract or the remote-manifest version, and I wanted a real browser proof rather than only a Vitest fixture.

This step delivered that bootstrap wiring. It also gave us the first real browser-runtime failure after bootstrap: the launcher now boots through the remote contract path and shows the `Inventory` desktop entry, but opening the remote Inventory window crashes because the remote bundle still carries its own React/react-redux runtime instead of sharing the host singletons.

### Startup wiring added

I added a new launcher bootstrap entrypoint:

- `apps/os-launcher/src/app/bootstrapLauncherApp.ts`

Its responsibilities are:

1. reset any stale in-memory federated contracts
2. resolve the active registry from environment or from an explicit override
3. load the active contracts through `loadFederatedAppContracts`
4. install those contracts into runtime state
5. then load the real launcher modules (`store`, `registry`, `App`)

The actual browser entrypoint now uses that bootstrap:

- `apps/os-launcher/src/main.tsx`

So launcher startup is no longer hard-wired to only the local inventory package. It is now a two-step boot:

1. resolve/load federation contracts
2. load/render the real launcher app

### Runtime contract seam widened from “local-only” to “bootstrapped runtime”

To support that, I changed the previous local helpers in:

- `apps/os-launcher/src/app/localFederatedAppContracts.ts`

That file still knows how to resolve the local package contracts, but it now also owns the runtime-loaded contract list. The rest of launcher startup now reads from that runtime list instead of directly from the static local-package array:

- `apps/os-launcher/src/app/modules.tsx`
- `apps/os-launcher/src/app/store.ts`
- `apps/os-launcher/src/app/registerAppsBrowserDocs.ts`
- `apps/os-launcher/src/app/runtimeDebugModule.tsx`
- `apps/os-launcher/src/app/taskManagerModule.tsx`
- `apps/os-launcher/src/app/hypercardReplModule.tsx`

That is the key architectural shift in this slice. The launcher now has one consistent “federated contract runtime state” instead of a bunch of static imports that only happened to work for the local inventory package.

### Registry/env control added

I extended:

- `apps/os-launcher/src/app/federationRegistry.ts`

to support two practical browser-proof paths:

- `VITE_FEDERATION_REGISTRY_JSON`
- `VITE_INVENTORY_REMOTE_MANIFEST_URL`
- `VITE_INVENTORY_FEDERATION_ENABLED`

That let me point the launcher at a real manifest without inventing the final registry service yet. For this phase, the environment-driven registry is enough.

### Unit coverage added and reshaped

I added:

- `apps/os-launcher/src/app/bootstrapLauncherApp.test.ts`

Initially I tried to make this test import the real `App`, `store`, and `registry` modules after bootstrapping the remote manifest path. That hung repeatedly under Vitest, not because the federation decision logic was wrong, but because the test was pulling the entire launcher runtime graph through repeated module reloads.

The concrete failed command was:

- `npm run test -w apps/os-launcher -- --run bootstrapLauncherApp`

The repeated failure looked like:

- `Error: Test timed out in 5000ms.`
- then again after raising the timeout:
- `Error: Test timed out in 20000ms.`

I narrowed this down enough to see that the hanging portion was the “real launcher graph import under Vitest” piece, not the registry/manifest contract path itself. So I kept the unit test focused on the actual bootstrap orchestration by adding injectable module loaders to `bootstrapLauncherApp`. That way the test can still prove:

- remote manifest registry resolution
- contract loading
- runtime contract installation
- launcher registry creation from the bootstrapped contract

without pretending Vitest is a browser-runtime integration environment.

### Browser proof performed

I then ran a real browser proof instead of trusting the unit test alone.

The operator flow was:

1. build the real inventory federation artifact
2. copy it into a same-origin launcher static path:
   - `apps/os-launcher/public/__federation-smoke/inventory/`
3. start the launcher dev server with:
   - `VITE_INVENTORY_REMOTE_MANIFEST_URL=/__federation-smoke/inventory/mf-manifest.json`
4. open the launcher in a browser

The first browser run failed during bootstrap with:

- `TypeError: Failed to construct 'URL': Invalid base URL`

That came from resolving a relative manifest URL as if it were already absolute. I fixed that in:

- `apps/os-launcher/src/app/loadFederatedAppContracts.ts`

by normalizing the manifest URL against the browser location when necessary before resolving `contract.entry`.

The second browser run got further, but the loaded remote bundle failed with:

- `ReferenceError: process is not defined`

That came from the producer-side remote bundle still emitting raw `process.env.NODE_ENV` checks. I fixed that in:

- `workspace-links/go-go-app-inventory/apps/inventory/vite.federation.config.ts`

by defining:

- `process.env.NODE_ENV = "production"`

for the federation build.

### What the real browser proof now demonstrates

After those fixes, the launcher boots successfully through the remote-manifest path in the browser:

- launcher page loads
- no bootstrap error screen
- `Inventory` appears as a desktop icon from the remote-provided contract

This is the first real browser proof that the launcher is no longer relying on the local-package-only inventory path for startup.

### The next blocker we exposed

When I actually opened the Inventory window from that browser session, the window failed with:

- `Cannot read properties of null (reading 'useContext')`

This is the first real runtime boundary problem after bootstrap. It is the expected duplicate-singleton issue:

- the remote bundle currently includes its own React/react-redux runtime
- the host renders with its own Provider/React runtime
- the remote hook layer is therefore not using the same context instance as the host

So the system is now at a better place than before:

- bootstrap path works
- remote contract contributes launcher UI successfully
- the next failure is no longer in manifest loading
- the next failure is the shared-runtime contract between host and remote

### Validation performed

Commands that passed in this slice:

- `npm run typecheck -w apps/os-launcher`
- `npm run typecheck -w workspace-links/go-go-app-inventory/apps/inventory`
- `npm run test -w apps/os-launcher -- --run bootstrapLauncherApp`

Browser/operator proof:

- built inventory remote artifact
- served launcher with `VITE_INVENTORY_REMOTE_MANIFEST_URL`
- verified launcher boot + Inventory desktop icon in Playwright
- verified opening the Inventory window fails with the expected React/runtime singleton error

### Why this is still valid progress even though the Inventory window crashes

Before this slice, we did not know whether the next breakage would be:

- registry resolution
- manifest fetch
- relative URL handling
- dynamic import
- host contract validation
- launcher boot ordering

Now we do.

The browser proof shows that all of those layers are working. The first remaining blocker is the real architectural one we expected from the beginning: host/remote shared singletons.

That means the next task is not “make the bootstrap loader work.” It already works. The next task is:

- define and implement the shared-singleton strategy for browser remotes

### Ticket helpers added for this slice

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/31-prepare-launcher-remote-manifest-smoke.sh`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/32-clean-launcher-remote-manifest-smoke.sh`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/31-launcher-remote-manifest-browser-smoke.md`

## 2026-03-30: Seventh Federation Code Slice, Share React And React-Redux Between Host And Remote

The last browser proof ended at the first real runtime architecture problem: the launcher could boot through the remote manifest path, but opening an Inventory window crashed with a React hook/context error. At that point the system had proven that remote manifest loading worked; what had failed was the shared runtime boundary between host and remote.

I addressed that by installing a host-owned shared runtime before loading any remote contract, then making the inventory federation build alias `react`, `react/jsx-runtime`, and `react-redux` to shim modules that read from that host-installed runtime. This is still not full Module Federation plugin negotiation, but it is the first real singleton policy for browser remotes in this codebase.

### Host-side shared runtime installation

I added:

- `apps/os-launcher/src/app/federationSharedRuntime.ts`

That module imports the host's:

- `react`
- `react/jsx-runtime`
- `react-redux`

and installs them on:

- `globalThis.__WESEN_FEDERATION_SHARED__`

Then `bootstrapLauncherApp()` now calls `installFederationSharedRuntime()` before any remote manifest contract is loaded. That ordering matters. It ensures the remote bundle sees the shared runtime immediately when its top-level module body executes.

### Remote-side shim modules

In the inventory app, I added:

- `workspace-links/go-go-app-inventory/apps/inventory/src/federation-shared/runtime.ts`
- `workspace-links/go-go-app-inventory/apps/inventory/src/federation-shared/react.ts`
- `workspace-links/go-go-app-inventory/apps/inventory/src/federation-shared/react-jsx-runtime.ts`
- `workspace-links/go-go-app-inventory/apps/inventory/src/federation-shared/react-redux.ts`

These modules do not import the real runtime packages. Instead, they:

1. read `globalThis.__WESEN_FEDERATION_SHARED__`
2. throw a clear error if the host has not installed it
3. re-export the required runtime bindings from the host-owned module objects

This is what makes the remote bundle use the host's React/react-redux context instead of shipping and using its own copy.

### Producer build aliasing

I then updated:

- `workspace-links/go-go-app-inventory/apps/inventory/vite.federation.config.ts`

The federation build now aliases these exact imports:

- `react`
- `react/jsx-runtime`
- `react/jsx-dev-runtime`
- `react-redux`

to the shim modules above.

One subtle fix was necessary here: Vite alias matching had to be exact and ordered. A naive object alias for `react` caused `react/jsx-runtime` to resolve incorrectly as `react.ts/jsx-runtime`. I replaced that with exact regex aliases in array form so `react/jsx-runtime` and `react-redux` resolve correctly before the generic `react` match.

### Type/build failures during this step

Two concrete issues surfaced during the first shim pass.

#### TypeScript errors

The first inventory typecheck failed with:

- `Property 'jsxDEV' does not exist on type ... react/jsx-runtime`
- `Property 'unstable_useCacheRefresh' does not exist on type ... react`

These were not runtime blockers; they were over-eager shim exports that the installed type packages do not model. I removed those exports from the shims rather than widening the runtime contract unnecessarily.

#### Alias resolution failure

The first producer build failed with:

- `Could not load .../src/federation-shared/react.ts/jsx-runtime`

That was the alias ordering/matching bug described above. Converting to ordered exact aliases fixed it.

### Real browser result after the shared-runtime fix

I reran the full same-origin browser proof:

1. build the inventory federation artifact
2. sync it into `apps/os-launcher/public/__federation-smoke/inventory`
3. boot the launcher with:
   - `VITE_INVENTORY_REMOTE_MANIFEST_URL=/__federation-smoke/inventory/mf-manifest.json`
4. open the launcher in a browser
5. open the Inventory folder from the remote contract
6. open a child window from that remote folder

This time:

- the launcher booted
- the `Inventory` desktop icon appeared
- the `Inventory Folder` window rendered successfully
- the `Inventory Chat` child window rendered successfully

The previous crash:

- `Cannot read properties of null (reading 'useContext')`

is gone.

That means the duplicate React/react-redux runtime problem is resolved for this remote path.

### What still fails in the browser, and why

The remaining console errors are now backend/runtime integration errors rather than federation-rendering errors:

- `profile list request failed (500)`
- timeline/profile fetch failures under `/api/apps/inventory/api/...`
- websocket connection failures for the inventory backend

Those happen because this smoke only proves the frontend/remote integration path. It does not stand up the real inventory backend/chat websocket on `127.0.0.1:8091`.

This is a much better state to be in:

- frontend federation boundary is working
- runtime child windows render
- remaining failures are backend availability, not host/remote React isolation

### Validation performed

Commands run successfully:

- `npm run typecheck -w apps/os-launcher`
- `npm run typecheck -w workspace-links/go-go-app-inventory/apps/inventory`
- `npm run build:federation -w workspace-links/go-go-app-inventory/apps/inventory`
- `npm run test -w apps/os-launcher -- --run bootstrapLauncherApp loadFederatedAppContracts`

Manual/browser validation:

- launcher boot through remote manifest
- Inventory folder render
- Inventory Chat child window render

### Ticket helper added

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/33-audit-federation-shared-runtime.sh`

This helper prints the new host-side shared runtime installer, the inventory federation shims, and the producer federation config together so later docs can explain the singleton strategy from concrete files instead of prose alone.

## 2026-03-30: Eighth Federation Validation Slice, Prove The Remote Path Against The Live Inventory Backend

Once the browser-side singleton issue was fixed, the remaining question was whether the remote-manifest path still held up when the real backend was present instead of the earlier smoke environment. The key difference here is that this is no longer just a frontend/federation test. It exercises the launcher proxy, the inventory HTTP API, and the websocket path while the app UI is being supplied by the remote contract.

The user ran that proof and confirmed it works. That changed the state of the ticket in an important way: the first federated remote is no longer just an artifact-level or render-level proof. We now have a live browser proof that the host can boot through `remote-manifest`, render the remote-provided Inventory UI, and talk to the actual backend routes the app needs.

### What the successful operator path looked like

The working proof used the existing `wesen-os` launcher backend as the live inventory backend and the launcher Vite dev server as the frontend shell:

- backend:
  - `go run ./cmd/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091 --arc-enabled=false`
- remote artifact staging:
  - `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/31-prepare-launcher-remote-manifest-smoke.sh`
- frontend:
  - `INVENTORY_CHAT_BACKEND=http://127.0.0.1:8091`
  - `VITE_INVENTORY_REMOTE_MANIFEST_URL=/__federation-smoke/inventory/mf-manifest.json`
  - `npm run dev-public -w apps/os-launcher -- --port 4175`

That setup is important because it proves we do not need a separate one-off inventory dev backend just to validate the remote path. The normal launcher backend already provides the inventory routes the remote frontend expects.

### What this proof upgrades from “assumed” to “known”

Before this run, the backend-integrated part of the federation story was still only inferred from route shapes and proxy config.

After this run, we know:

- the launcher can boot from the remote manifest path
- the remote-provided Inventory launcher entry appears in the shell
- Inventory windows render through the remote bundle
- the live inventory backend path works through the launcher proxy
- the remaining work is no longer “prove this remote can function at all”
- the remaining work is now “package, host, and roll it out cleanly”

That is the moment where the next task should move from browser-local smoke scripts into real remote asset delivery.

## 2026-03-30: Ninth Federation Delivery Slice, Add The First Immutable Hetzner Object Storage Publish Path

After the live-backend proof, the next question was not about React or runtime correctness anymore. It was about deployment shape: where do the remote assets live, how are they published, and how do we make that path match the infrastructure conventions already forming in the Hetzner K3s repo.

I checked `/home/manuel/code/wesen/2026-03-27--hetzner-k3s` before adding anything new. The useful pattern was already there in the backup system documentation: Terraform owns the bucket, Vault owns the credentials, GitOps or automation jobs use S3-compatible uploads at runtime, and the source repo should not invent a second credential model just because the payload is frontend assets instead of SQL dumps. That is the model this slice now follows.

### Source-repo publish path added

In `workspace-links/go-go-app-inventory`, I added:

- `.github/workflows/publish-federation-remote.yml`
- `scripts/publish_federation_remote.py`
- `.gitignore` update for `dist-federation/`

The workflow now does the first real remote-delivery job:

1. check out the repo
2. install Go and Node
3. build `apps/inventory/dist-federation`
4. validate the federation artifact
5. upload it to an immutable object-storage prefix using AWS CLI against a Hetzner S3-compatible endpoint

The current immutable path contract is:

- object prefix:
  - `remotes/inventory/versions/<remote-version>/`
- manifest URL:
  - `<public-base-url>/remotes/inventory/versions/<remote-version>/mf-manifest.json`

That keeps the first rollout simple:

- immutable versioned artifacts
- no moving alias yet
- no registry rewrite step yet

### Why this follows the K3s repo instead of competing with it

The K3s repo already documents the object-storage model as:

- Terraform-owned infrastructure
- Vault-held runtime credentials
- S3-compatible runtime uploads

The remote publish path is now intentionally aligned with that:

- GitHub Actions in the source repo will consume object-storage credentials
- the destination is a versioned immutable prefix
- the host can later point at the manifest URL directly
- a future channel alias or registry document can be layered on afterward if needed

This is materially better than starting with a special-case upload script that only works from one laptop or that bakes provider-specific assumptions straight into the launcher.

### Validation performed

I validated three pieces locally before recording the step:

- Python syntax:
  - `python3 -m py_compile workspace-links/go-go-app-inventory/scripts/publish_federation_remote.py`
- workflow structure:
  - `yq eval '.' workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml >/dev/null`
- real artifact + dry-run publish plan:
  - `npm run build:federation -w apps/inventory`
  - `python3 scripts/publish_federation_remote.py --source-dir apps/inventory/dist-federation --remote-id inventory --version sha-localproof --bucket demo-bucket --endpoint https://example.invalid --region eu-central --public-base-url https://assets.example.invalid --dry-run`

The dry-run plan resolved exactly to:

- destination:
  - `s3://demo-bucket/remotes/inventory/versions/sha-localproof/`
- manifest URL:
  - `https://assets.example.invalid/remotes/inventory/versions/sha-localproof/mf-manifest.json`

That gives us a stable contract to document and to wire into the launcher later.

### Ticket helpers added for this slice

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/34-audit-k3s-object-storage-pattern.sh`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/35-check-inventory-federation-publish-path.sh`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/34-k3s-object-storage-pattern-audit.md`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/35-inventory-federation-publish-path-check.md`

### What still remains after this step

This does not yet finish the remote deployment story.

Still pending:

- decide and configure the real public base URL
- seed the real Hetzner Object Storage credentials into GitHub Actions
- run the first non-dry-run remote publish on GitHub
- configure CORS for the host domain
- decide whether the first runtime registry source is:
  - static JSON
  - env-generated JSON
  - backend-served config
- decide whether to add a moving alias path such as `staging/current`

The important point is that the system now has a real first publish path, not just a browser smoke setup under `apps/os-launcher/public/__federation-smoke`.

## 2026-03-30: Tenth Federation Runtime Slice, Move Registry Resolution Onto A Host-Served Endpoint

The object-storage publish workflow solved the producer side, but the host still had a structural weakness: remote discovery only came from frontend build-time env. That is acceptable for local smoke runs, but it is the wrong contract for a deployed host. A host image should be able to learn about remote manifests from runtime config, not only from the values that happened to exist when Vite bundled the SPA.

I addressed that by adding a small host-served federation-registry endpoint and teaching launcher bootstrap to consult it before falling back to the local-package default. The result is a better split of responsibility: the backend owns runtime-discoverable host config, the frontend still supports env overrides for development/proof flows, and the default local inventory path remains available when the endpoint is absent.

### Host endpoint added

I added:

- `cmd/wesen-os-launcher/federation_registry_endpoint.go`
- `cmd/wesen-os-launcher/federation_registry_endpoint_test.go`

and wired the endpoint into the launcher server in:

- `cmd/wesen-os-launcher/main.go`

The new endpoint is:

- `GET /api/os/federation-registry`

The server behavior is deliberately small and strict:

- if no `--federation-registry` path is configured, it returns `404`
- if the file does not exist, it returns `404`
- if the file exists but is invalid JSON, it returns `500`
- if the file exists and contains valid JSON, it serves that JSON as `application/json`

That shape matches the current phase of the rollout. We are not building a full remote-control plane yet. We are adding the smallest runtime configuration seam that can be mounted from the host config path later.

### Frontend bootstrap changes

In `apps/os-launcher`, I updated:

- `src/app/federationRegistry.ts`
- `src/app/bootstrapLauncherApp.ts`
- `src/app/federationRegistry.test.ts`

The launcher now resolves the registry in this order:

1. explicit `VITE_FEDERATION_REGISTRY_JSON`
2. explicit `VITE_INVENTORY_REMOTE_MANIFEST_URL`
3. fetch `/api/os/federation-registry`
4. if the endpoint is absent or unreachable, fall back to the local-package inventory registry

That ordering keeps all of the earlier proof paths working:

- local env overrides still work
- the manifest smoke path still works
- the deployed host now has a runtime-served path available

This matters because it lets us move from “remote URL baked into a frontend build” toward “remote URL supplied by host runtime config.”

### Why this was the right next step

At this point in the ticket, the system already had:

- a working remote-manifest browser path
- a working live-backend proof
- an immutable object-storage publish workflow

What it did not have was a stable runtime seam between those layers. Without that seam, each new remote URL would have to be injected directly through frontend build-time env, which is exactly the wrong direction once the host is deployed as a container on K3s.

This endpoint does not finish the runtime registry story, but it creates the right contract boundary:

- source repo publishes remote assets
- host runtime config points at the chosen registry data
- frontend asks the host what remotes exist

That is a much more defensible architecture than keeping federation discovery entirely inside Vite env knobs.

### Validation performed

I validated the new runtime registry path with:

- `go test ./cmd/wesen-os-launcher/...`
- `npm run typecheck -w apps/os-launcher`
- `npm run test -w apps/os-launcher -- --run federationRegistry bootstrapLauncherApp loadFederatedAppContracts`

I also added the replay helper:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/36-check-runtime-federation-registry-path.sh`

and captured it in:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/36-runtime-federation-registry-path-check.md`

### What is still missing after this slice

The endpoint exists, but it is not yet mounted into the deployed host config. That means the next deployment-oriented follow-up is:

- add `federation.registry.json` to the host config path
- mount it in the canonical K3s `wesen-os` package
- set the first staging remote manifest URL there

Once that is done, the host can stop relying on the special-case inventory manifest env override for real remote rollouts.

## 2026-03-30: Eleventh Federation Infrastructure Slice, Create The Terraform Stack For Federation Assets

The previous step ended with a real remote publish workflow, but it was still configured against placeholders because there was no canonical federation bucket yet. The user asked directly how I had found the bucket name, which surfaced an important reality: I had not found one. The earlier implementation was based on the storage model documented in the K3s repo, not on an already-provisioned federation bucket.

So this slice creates the missing infrastructure definition instead of pretending it already existed.

### What I checked before creating it

I reviewed the existing Terraform storage stacks under:

- `/home/manuel/code/wesen/terraform/storage/platform/k3s-backups/envs/prod`
- `/home/manuel/code/wesen/terraform/storage/apps/hair-booking/photos/envs/prod`

That comparison mattered because the backup bucket and the photo-upload bucket encode two different ideas:

- platform-owned storage
- app-oriented storage with suggested runtime policy outputs

Federation assets are closer to the second category operationally, but they are still platform-level infrastructure. So I created the new stack under:

- `/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod`

### The chosen stack contract

The new stack now exists in Terraform with default values:

- bucket name:
  - `scapegoat-federation-assets`
- region:
  - `fsn1`
- default public base URL placeholder:
  - `https://assets.example.invalid`

Important design choice: the bucket still defaults to private ACL. The stack does **not** assume that “public asset” means “public bucket ACL.” Instead, it outputs the policy material needed to make public object reads explicit, which is a better security posture and matches the way the rest of this platform prefers explicit control-plane boundaries.

### What the stack outputs

The stack now outputs:

- `bucket_name`
- `bucket_arn`
- `bucket_domain_name`
- `storage_endpoint_url`
- `storage_region`
- `public_base_url`
- `remote_prefixes`
- `suggested_ci_bucket_policy_json`
- `suggested_public_read_policy_json`

Those outputs are important because they turn the next operator steps into normal wiring instead of guesswork:

- CI can get a read/write object policy shape
- the public-read path is explicit
- the host/runtime docs can reference a concrete public base URL variable
- the remote prefix contract is written down in infrastructure, not just in frontend code

### Validation performed

I validated the new stack locally with:

- `terraform -chdir=/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod fmt`
- `terraform -chdir=/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod init -backend=false`
- `terraform -chdir=/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod validate`

The first `validate` failed before `init`, exactly because the provider had not been installed yet:

- `Error: Missing required provider`

That was expected and useful to record. After `init -backend=false`, validation passed cleanly.

### Commit recorded outside the source repo

Terraform repo commit:

- `1ae2402` — `Add federation asset bucket stack`

This matters because the federation rollout now depends on an external infrastructure repo state, not only on code inside `wesen-os` or `go-go-app-inventory`.

### Ticket helper added for replay

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/37-check-federation-bucket-terraform-stack.sh`
- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/various/37-federation-bucket-terraform-stack-check.md`

### What this unlocks next

Now the next steps are no longer “invent a storage stack.”

They are:

1. apply the Terraform stack with real Hetzner Object Storage credentials
2. decide the real public base URL
3. seed the resulting credentials into GitHub for the inventory publish workflow
4. seed the same credentials into the long-term ops path
5. mount a real `federation.registry.json` into the host config that points at the first hosted manifest URL

That is a materially better place than before because the infrastructure layer is now explicit and versioned.

## 2026-03-30 - Better Invalid Manifest Diagnostics For Launcher Bootstrap

While exercising the new remote-manifest bootstrap path, the launcher failed with a generic browser-side error:

- `Launcher bootstrap failed SyntaxError: JSON.parse: unexpected character at line 1 column 1 of the JSON data`

That error is too vague operationally. It tells us JSON parsing failed, but it does **not** tell us whether the root cause is:

- a bad `mf-manifest.json`
- an HTML 404/dev-server fallback page
- a wrong URL entirely
- or some other non-JSON payload

For federation, that distinction matters because the most common operator mistake is configuring the host to fetch a manifest URL that does not actually serve the manifest artifact.

### Code change

I updated:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/loadFederatedAppContracts.ts`

The loader no longer relies on an opaque `response.json()` path for manifest fetches. It now:

1. reads the raw response body with `response.text()`
2. parses that body with `JSON.parse(...)`
3. throws a richer error on failure that includes:
   - the remote id
   - the manifest URL
   - the original JSON parse error
   - the first bytes of the response body

So instead of a browser-only `SyntaxError`, the host now emits something much more actionable, along the lines of:

- `Remote manifest for "inventory" at <url> did not return valid JSON: ... Response starts with: <!doctype html> ...`

That is exactly what we need when the URL accidentally resolves to an HTML fallback page.

### Test fallout and fix

The targeted launcher tests initially failed after this change because the mocks still simulated only `response.json()` and returned an empty string for `response.text()`.

The failing command was:

- `npm run test -w apps/os-launcher -- --run loadFederatedAppContracts bootstrapLauncherApp`

The fix was to update the mocked manifest responses in:

- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/loadFederatedAppContracts.test.ts`
- `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/bootstrapLauncherApp.test.ts`

Both tests now return `JSON.stringify(manifest)` from `text()` so the mocks match the real fetch path.

### Validation performed

After updating the mocks, both checks passed:

- `npm run test -w apps/os-launcher -- --run loadFederatedAppContracts bootstrapLauncherApp`
- `npm run typecheck -w apps/os-launcher`

### Ticket helper added

To make this reproducible for operators, I added:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/38-check-remote-manifest-json.sh`

This helper fetches a manifest URL and prints:

- response headers
- a body preview
- whether the body parses as JSON
- `remoteId`
- `contract.entry`

That should make future “why did JSON parsing fail?” debugging much faster.

### Practical operator guidance from this incident

If the launcher reports an invalid manifest error, the first checks should now be:

1. inspect the exact manifest URL being used
2. open it directly in the browser or run:
   - `ttmp/.../scripts/38-check-remote-manifest-json.sh <manifest-url>`
3. confirm the response is actual JSON, not HTML
4. only then debug the remote entry itself

This is a small change, but it materially improves operability of the federation bootstrap path.
