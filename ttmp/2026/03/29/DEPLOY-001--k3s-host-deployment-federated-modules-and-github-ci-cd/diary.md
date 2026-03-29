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
