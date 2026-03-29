# Tasks

## Complete

- [x] Read the existing split/composition and runtime-package guides that already define the intended architecture boundary.
- [x] Inspect the current `@hypercard/*` workspace packages, app packages, launcher host, Vite aliasing, and CI workflow.
- [x] Verify the current external constraints for GitHub Packages publishing and package access.
- [x] Write a migration task board that stages rename decisions, publishable npm packages, host consumption by version, and federation as separate cuts.
- [x] Confirm the target published npm scope is `@go-go-golems/*`.
- [x] Confirm the platform package rename map:
  - `@hypercard/engine` -> `@go-go-golems/os-core`
  - `@hypercard/desktop-os` -> `@go-go-golems/os-shell`
  - `@hypercard/hypercard-runtime` -> `@go-go-golems/os-scripting`
  - `@hypercard/ui-runtime` -> `@go-go-golems/os-ui-cards`
  - `@hypercard/chat-runtime` -> `@go-go-golems/os-chat`
  - `@hypercard/repl` -> `@go-go-golems/os-repl`
  - `@hypercard/rich-widgets` -> `@go-go-golems/os-widgets`
  - `@hypercard/kanban-runtime` -> `@go-go-golems/os-kanban`
  - `@hypercard/confirm-runtime` -> `@go-go-golems/os-confirm`

## Phase 0: Freeze Public Naming And Release Policy

- [x] Apply the hard-cut rename from `@hypercard/*` to `@go-go-golems/*` across package manifests, imports, docs, and examples.
- [x] Execute the agreed platform rename map:
  - `engine` -> `os-core`
  - `desktop-os` -> `os-shell`
  - `hypercard-runtime` -> `os-scripting`
  - `ui-runtime` -> `os-ui-cards`
  - `chat-runtime` -> `os-chat`
  - `repl` -> `os-repl`
  - `rich-widgets` -> `os-widgets`
  - `kanban-runtime` -> `os-kanban`
  - `confirm-runtime` -> `os-confirm`
- [x] Write a package identity matrix for every publishable artifact:
  - package name
  - owning repo
  - source path
  - exported entrypoints
  - whether it is a core package, app package, or runtime package
- [x] Decide which packages are first-class public contracts versus internal implementation packages.
- [x] Freeze the first publish set for v1:
  - `@go-go-golems/os-core`
  - `@go-go-golems/os-shell`
  - `@go-go-golems/os-chat`
  - `@go-go-golems/os-scripting`
  - `@go-go-golems/os-ui-cards`
  - `@go-go-golems/os-kanban`
  - `@go-go-golems/os-repl`
  - `@go-go-golems/os-widgets`
  - `@go-go-golems/os-confirm`
- [x] Decide whether app packages also publish in the same wave or later:
  - inventory app package under its final `@go-go-golems/*` name
  - apps browser package under its final `@go-go-golems/*` name
  - todo app package under its final `@go-go-golems/*` name
  - crm app package under its final `@go-go-golems/*` name
  - book-tracker-debug package under its final `@go-go-golems/*` name
  - hypercard-tools package under its final `@go-go-golems/*` name
- [x] Write the hard-cut rename map for every old import path, alias, README example, and docs/tutorial snippet:
  - `@hypercard/engine` -> `@go-go-golems/os-core`
  - `@hypercard/desktop-os` -> `@go-go-golems/os-shell`
  - `@hypercard/hypercard-runtime` -> `@go-go-golems/os-scripting`
  - `@hypercard/ui-runtime` -> `@go-go-golems/os-ui-cards`
  - `@hypercard/chat-runtime` -> `@go-go-golems/os-chat`
  - `@hypercard/repl` -> `@go-go-golems/os-repl`
  - `@hypercard/rich-widgets` -> `@go-go-golems/os-widgets`
  - `@hypercard/kanban-runtime` -> `@go-go-golems/os-kanban`
  - `@hypercard/confirm-runtime` -> `@go-go-golems/os-confirm`
  - source-path aliases -> package imports
- [x] Decide repository linkage strategy for GitHub Packages:
  - publish from the source repo and link package to that repo
  - do not add a separate distribution repo for the npm registry path
- [x] Record the rule that federation/distribution URLs are a separate concern from npm package registry URLs.

## Phase 1: Make Packages Actually Publishable

- [x] Phase 1A.0: Rename package directories to match the public package identities:
  - `packages/engine` -> `packages/os-core`
  - `packages/desktop-os` -> `packages/os-shell`
  - `packages/hypercard-runtime` -> `packages/os-scripting`
  - `packages/ui-runtime` -> `packages/os-ui-cards`
  - `packages/chat-runtime` -> `packages/os-chat`
  - `packages/repl` -> `packages/os-repl`
  - `packages/rich-widgets` -> `packages/os-widgets`
  - `packages/kanban-runtime` -> `packages/os-kanban`
  - `packages/confirm-runtime` -> `packages/os-confirm`
- [x] Phase 1A.0.1: Update all repo-local project references, scripts, and docs in `go-go-os-frontend` to the renamed package folders.
- [x] Phase 1A.0.2: Update all external consumer path references in `wesen-os`, `go-go-app-inventory`, `go-go-app-sqlite`, and `go-go-app-arc-agi-3`.
- [x] Phase 1A.0.3: Refresh lockfiles or generated workspace metadata that encode package folder paths.
- [x] Phase 1A.0.4: Re-run targeted typecheck/build validation after the folder moves and record any fallout.
- [ ] Phase 1A: Isolate package-local builds from sibling `src/` trees.
- [ ] Phase 1A.1: Inventory every publish-set package tsconfig/path mapping that points to another package's `src/`.
- [ ] Phase 1A.2: Decide the build-time resolution policy for workspace package imports:
  - temporary build-only tsconfig rewrite to `dist/*`
  - or package-local tsconfig split (`tsconfig.json` for dev, `tsconfig.build.json` for publish)
  - or another equivalent build-only mechanism
- [x] Phase 1A.3: Make `@go-go-golems/os-core` and `@go-go-golems/os-repl` build cleanly into `dist/` with copied runtime assets.
- [x] Phase 1A.4: Make `@go-go-golems/os-chat` and `@go-go-golems/os-scripting` build cleanly into `dist/` without source-tree leakage.
- [x] Phase 1A.5: Make `@go-go-golems/os-ui-cards`, `@go-go-golems/os-widgets`, `@go-go-golems/os-kanban`, `@go-go-golems/os-confirm`, and `@go-go-golems/os-shell` build cleanly into `dist/` in dependency order.
- [x] Phase 1A.6: Add one scripted `build:publish-v1` flow that builds the full v1 package set from a clean state.
- [x] Phase 1A.7: Record the exact remaining package-local build failures, if any, with commands and file references.
- [ ] Phase 1B: Finalize dist entrypoints and shipped assets.
- [x] Phase 1B.1: Generate publish-ready `dist/package.json` entrypoints that rewrite `main`, `types`, and `exports` from `src/*` to built artifacts for the v1 package set while leaving workspace-root manifests source-first for local dev.
- [ ] Phase 1B.2: Ensure all exported subpaths still resolve after the `dist/*` rewrite.
- [x] Phase 1B.3: Add explicit asset-copy coverage for:
  - CSS theme entrypoints
  - runtime `.vm.js` bootstrap/prelude files
  - generated JSON metadata if needed
- [ ] Phase 1C: Tighten published package manifests.
- [ ] Remove `private: true` from packages that will be published.
- [x] Add complete `repository`, `license`, `homepage`, `bugs`, and ownership metadata to each publishable `package.json`.
- [ ] Replace source-first entrypoints with built artifacts:
  - change `exports`, `main`, and `types` away from `src/*`
  - point them to `dist/*`
- [x] Add explicit `files` allowlists so publishes contain only the intended runtime assets.
- [ ] Audit every package for non-TypeScript runtime assets that must ship:
  - CSS files
  - `.vm.js` bootstrap/prelude files
  - generated JSON metadata
  - docs metadata helpers
- [ ] Add package-local build steps that emit clean ESM plus declarations into `dist/`.
- [ ] Ensure subpath exports continue to work after dist-output rewrite.
- [ ] Add pack/install smoke tests that consume packed tarballs rather than workspace source.
- [ ] Add an API-surface audit for each package so only supported exports remain public.
- [ ] Decide `peerDependencies` versus `dependencies` policy for shared React and Redux packages.
- [x] Eliminate `workspace:*` leakage from staged published dependency manifests.
- [x] Add a release-time rewrite/versioning strategy for intra-repo package references.
- [ ] Verify published packages can be installed in a fresh external fixture with no sibling-repo aliasing.
- [ ] Phase 1D: Add external-consumer verification.
- [x] Phase 1D.1: Add `npm pack` smoke checks for at least `os-core`, `os-repl`, and `os-scripting`.
- [x] Phase 1D.2: Add a clean fixture that installs packed tarballs with no workspace links.
- [x] Phase 1D.3: Verify at least one downstream package installs against packed platform packages rather than linked source.
- [ ] Stabilize a fully automated downstream packed-platform smoke flow; current proof is manual because fresh-fixture npm installs are flaky around `codemirror` install scripts and npm Arborist behavior with local tarballs.

## Phase 2: Replace Local Source Alias Assumptions In Consumers

- [ ] Inventory every place where `wesen-os` resolves `@hypercard/*` or `@go-go-golems/*` to sibling repo source paths.
- [ ] Inventory every place where app repos resolve frontend packages to `go-go-os-frontend/packages/*/src`.
- [ ] Replace Vite alias generation that points at source trees with a two-mode resolver:
  - local-dev workspace mode
  - published-package mode
- [ ] Replace TypeScript `paths` mappings that point to sibling `src` directories with publish-compatible resolution.
- [ ] Add a root composition switch that can run the launcher against installed package versions instead of linked source.
- [ ] Add one CI job that forbids accidental `src/` imports from external repos.
- [ ] Add one CI job that builds the launcher and inventory app against packed or published package artifacts.
- [ ] Update tutorials and developer docs so the public contract is package import plus exported subpaths only.

## Phase 3: Introduce Versioning And Release Tooling

- [ ] Choose the release/versioning mechanism for the frontend package repo:
  - Changesets
  - release-please
  - custom tag-driven workflow
- [ ] Define versioning policy:
  - lockstep versioning for all frontend packages
  - or independent versioning with explicit compatibility ranges
- [ ] Decide prerelease policy for architecture work that is not yet stable.
- [ ] Add automated changelog generation for published packages.
- [ ] Add release PR or release tag workflow for publish candidates.
- [ ] Add package provenance/signing policy where supported by the target registry.
- [ ] Add a release checklist that includes build, test, pack, install-smoke, and docs validation gates.

## Phase 4: Publish To GitHub Packages

- [ ] Create the GitHub Packages target namespace and confirm the owning user or organization.
- [x] Add `publishConfig.registry` or workflow-level registry configuration for `https://npm.pkg.github.com`.
- [ ] Ensure every published package is scoped to the chosen GitHub owner namespace and uses the `@go-go-golems/*` package names.
- [x] Add workflow permissions required for same-repo publishes:
  - `contents: read`
  - `packages: write`
- [ ] If publishing to a different destination repository, provision and store the required PAT instead of relying on `GITHUB_TOKEN`.
- [x] Decide whether packages inherit access from linked repositories or use explicit package permissions.
- [ ] Grant `Manage Actions access` to every repo that must install private/internal packages in CI.
  - current evidence:
    - local `gh` auth token lacks package-read scope for registry validation
    - `go-go-app-inventory` now has a consumer-validation workflow on branch `task/rewrite-runtime`, and draft PR `go-go-app-inventory#5` was opened to land it on the default branch so GitHub can dispatch it
- [x] Implement a publish workflow that only runs after package build/test/pack smoke checks pass.
- [x] Broaden the canary publish path to support at least one ordered dependent package chain, not just a single leaf package.
- [ ] Publish one canary package first and validate:
  - package visibility
  - package metadata
  - install from another repo
  - install in Actions
  - workflow file must first exist on the default branch so GitHub Actions can register and dispatch it
  - first successful real canary publish happened on 2026-03-29 for `os-shell-stack` as `0.1.0-canary.2`; remaining work is the post-publish validation matrix above
- [ ] Publish the first full frontend package set to GitHub Packages.
- [ ] Tag the release and record the exact published package/version matrix in the ticket.

## Phase 5: Convert `wesen-os` And App Repos To Versioned Consumption

- [ ] Add a package-consumption mode in `wesen-os` that installs the renamed `@go-go-golems/os-*` packages by version instead of requiring sibling repos.
- [ ] Convert `apps/os-launcher/package.json` dependencies from `workspace:*` to real version ranges in publish mode.
- [ ] Convert `go-go-app-inventory/apps/inventory/package.json` dependencies from `workspace:*` to real version ranges in publish mode.
- [ ] Decide which repos remain source-linked during active development and which become package consumers only.
- [ ] Create a documented local override workflow for engineers who need to patch a published package locally.
- [ ] Prove that `wesen-os` can build, test, and run with no `workspace-links/go-go-os-frontend` source aliasing.
- [ ] Prove that `go-go-app-inventory` can build, test, and run against published platform packages.
- [ ] Add a rollback procedure for bad package publishes:
  - pin previous versions
  - republish patch
  - invalidate remote asset manifests if needed

## Phase 6: Publish App Packages And Runtime Packs

- [ ] Make the inventory app package publishable under its final `@go-go-golems/*` name, with dist outputs and packaged generated VM metadata.
- [ ] Ensure published app packages expose only stable public entrypoints:
  - `.`
  - `./launcher`
  - `./reducers`
- [ ] Decide whether demo apps publish as true packages or remain workspace-only examples.
- [ ] Separate package-owned runtime metadata from host-owned registration logic where needed.
- [ ] Verify `@go-go-golems/os-kanban` and `@go-go-golems/os-ui-cards` stay host-registered and do not regress into side-effect registration.
- [ ] Add consumer smoke tests proving an external host can register runtime packages from installed npm artifacts.

## Phase 7: Federation Architecture Decision

- [ ] Decide the federation unit:
  - full app launcher module
  - runtime package bundle
  - both
- [ ] Decide the loading protocol:
  - Vite/Module Federation remote container
  - versioned remote ESM manifest without full module federation
- [ ] Write the remote contract for a federated module:
  - app id
  - version
  - exposed entrypoint
  - required shared dependencies
  - runtime package registrations
  - integrity metadata
- [ ] Define shared-singleton policy for React, React DOM, Redux, and host runtime registries.
- [ ] Define how a remote app declares reducers, docs metadata, launcher module, and runtime-pack registrations.
- [ ] Define host failure behavior for:
  - unreachable remote
  - version mismatch
  - incompatible shared dependency graph
  - missing runtime package registration
- [ ] Add a proof-of-concept federated remote for one non-critical app before touching inventory.
- [ ] Validate that the host can mount a remote app without reintroducing source-level package alias assumptions.

## Phase 8: Static Asset Distribution For Federation

- [ ] Separate npm package publishing from browser asset hosting in the architecture docs and release tooling.
- [ ] Decide the remote asset host for federated builds:
  - GitHub-hosted static delivery
  - Hetzner Object Storage
  - another CDN/object store
- [ ] If using Hetzner Object Storage, create the bucket layout and naming convention:
  - environment
  - app id
  - version
  - manifest path
  - chunk path
- [ ] Configure CORS for browser loading of remote manifests and chunks.
- [ ] Decide custom-domain strategy:
  - reverse proxy
  - S3 proxy
  - provider-native endpoint
- [ ] Add immutable versioned paths for remote entries and chunks.
- [ ] Add a signed or checksummed manifest so the host can verify the remote asset set before execution.
- [ ] Add cache invalidation policy for:
  - remote entry
  - manifest
  - chunk files
- [ ] Add retention/cleanup policy for stale remote versions.

## Phase 9: End-To-End Cutover

- [ ] Publish the stable core package set.
- [ ] Convert `wesen-os` to consume published versions in CI and production builds.
- [ ] Publish the first app package set.
- [ ] Land one federated remote in a staging environment.
- [ ] Add end-to-end tests that exercise:
  - package install and launcher startup
  - docs registration
  - runtime package registration
  - remote app load
  - remote failure fallback
- [ ] Remove obsolete alias-only composition code after the package-based path is proven.
- [ ] Update operator docs, onboarding docs, and release docs for the final model.

## Notes

- The task board originally treated the npm scope as undecided and used the current package basenames as placeholders. That was wrong. The target published scope is `@go-go-golems/*`, and the platform package rename is the concrete `os-*` map listed above.
- Current platform packages are not publishable yet: they are still `private`, export `src/*`, and rely on `workspace:*` plus sibling-repo Vite/TypeScript aliasing.
- GitHub Packages is a good fit for versioned internal npm distribution, but it should not be treated as the browser delivery mechanism for federated runtime assets.
- Federation should start only after package publishing and host consumption by version are stable; otherwise failures will mix package-contract issues with remote-loading issues.
