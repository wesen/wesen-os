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
