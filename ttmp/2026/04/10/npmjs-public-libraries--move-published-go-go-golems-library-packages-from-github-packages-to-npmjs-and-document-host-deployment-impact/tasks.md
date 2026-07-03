# Tasks

## Phase 0 — Scope and migration boundary

- [ ] Read `design-doc/01-detailed-guide-for-migrating-published-go-go-golems-libraries-from-github-packages-to-npmjs.md` completely before editing release config.
- [ ] Confirm the migration set is **all non-app packages** under `workspace-links/go-go-os-frontend/packages/*`.
- [ ] Confirm app packages are **not** part of the npmjs migration.
- [ ] Confirm downstream source app repos that install published platform versions (`go-go-app-inventory`, `go-go-app-sqlite`, and any similar repos) are treated as in-scope consumers that must be updated.
- [ ] Confirm the k3s host runtime and federated-manifest runtime contract are being validated for impact, not redesigned.

## Phase 1 — Package inventory and release order

- [ ] Inventory the package set and confirm the package names for all `workspace-links/go-go-os-frontend/packages/*` directories.
- [ ] Document and verify the dependency-aware publish order for:
  - [ ] `@go-go-golems/macos1-react`
  - [ ] `@go-go-golems/os-core`
  - [ ] `@go-go-golems/os-chat`
  - [ ] `@go-go-golems/os-repl`
  - [ ] `@go-go-golems/os-scripting`
  - [ ] `@go-go-golems/os-ui-cards`
  - [ ] `@go-go-golems/os-confirm`
  - [ ] `@go-go-golems/os-shell`
  - [ ] `@go-go-golems/os-widgets`
  - [ ] `@go-go-golems/os-kanban`
- [ ] Add a new public-library package set in `workspace-links/go-go-os-frontend/scripts/packages/package-sets.mjs`.

## Phase 2 — Switch package manifests to npmjs

- [ ] Edit all library package manifests under `workspace-links/go-go-os-frontend/packages/*/package.json`.
- [ ] Change `publishConfig.registry` from `https://npm.pkg.github.com` to `https://registry.npmjs.org` for each package.
- [ ] Add `publishConfig.access = "public"` for each package.
- [ ] Verify each package has acceptable public metadata (`description`, `repository`, `homepage`, `bugs`, `license`, `README`).
- [ ] Run `npm run build:dist -w <package>` for each package in the public set.
- [ ] Inspect each generated `dist/package.json` and confirm the rewritten runtime/type targets are correct.

## Phase 3 — Publish helper and workflow cleanup

- [ ] Decide whether to keep the existing helper names (`publish-github-package*.mjs`) or rename them to generic names.
- [ ] If renaming, update helper entrypoints and all internal callers.
- [ ] Add an npmjs-oriented GitHub Actions workflow for the public library package set.
- [ ] Ensure the workflow supports `package_set`, `npm_tag`, `version_suffix`, and `dry_run`.
- [ ] Configure npmjs auth using an npm token or chosen trusted-publishing mechanism.
- [ ] Ensure the workflow still publishes from package `dist/` directories only.

## Phase 4 — Validation of packaged library artifacts

- [ ] Run typecheck for all packages in the public set.
- [ ] Run tests for packages that define a test script.
- [ ] Run `npm pack` against each package `dist/` artifact or against a curated subset that proves the packaging model.
- [ ] Verify tarballs include JS, `.d.ts`, CSS, and `README.md` where expected.
- [ ] Run install smoke checks using the built/published packages.

## Phase 5 — Consumer docs and README updates

- [ ] Update public-facing READMEs to teach npmjs installation instead of GitHub Packages installation.
- [ ] Document recommended direct imports for `@go-go-golems/macos1-react`.
- [ ] Document compatibility imports for `@go-go-golems/os-core` where still relevant.
- [ ] Remove or rewrite GitHub-Packages-specific install instructions for public consumers.
- [ ] Add a note explaining that apps remain out of scope and are not the reusable package surface.

## Phase 6 — Update downstream federated source-repo release workflows

- [ ] Update `workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml` to install platform libraries from npmjs instead of GitHub Packages.
- [ ] Update `workspace-links/go-go-app-sqlite/.github/workflows/publish-federation-remote.yml` to install platform libraries from npmjs instead of GitHub Packages.
- [ ] Audit other source repos for the same pattern and update them if present.
- [ ] Remove GitHub-Packages-only `.npmrc` setup where it is no longer needed for the public library set.
- [ ] Update workflow descriptions/help text that currently say “install from GitHub Packages”.
- [ ] Validate that `platform_version` still works as a published platform version concept after migration.

## Phase 7 — Federated remote and k3s impact validation

- [ ] Build at least one federated remote app against the npmjs-published platform package set.
- [ ] Preferably validate both inventory and sqlite remote builds.
- [ ] Dry-run remote artifact publication to object storage.
- [ ] Dry-run GitOps federation target patch/PR steps.
- [ ] Confirm the generated manifest URL shape is unchanged.
- [ ] Verify the host runtime contract remains the same:
  - [ ] launcher fetches `/api/os/federation-registry`
  - [ ] registry still points at remote manifest URLs
  - [ ] host still loads remote manifests and remote entry chunks from object storage
- [ ] Confirm there is no required change to `deploy/k8s/wesen-os/configmap.yaml` or host runtime code solely because the library registry moved to npmjs.

## Phase 8 — First coordinated npmjs release rehearsal

- [ ] Run a dry-run npmjs publish for the public library package set.
- [ ] Choose and record the coordinated version/tag strategy (`next`, `canary`, or `latest`).
- [ ] Publish the first coordinated prerelease or release to npmjs.
- [ ] Verify package pages and metadata on npmjs.org.
- [ ] Verify external install in a clean scratch project without GitHub Packages `.npmrc` config.

## Phase 9 — Bookkeeping and handoff

- [ ] Update `reference/01-implementation-diary.md` with commands run, what worked, and any failures.
- [ ] Update `changelog.md` with major release-engineering decisions.
- [ ] Relate key files with `docmgr doc relate`.
- [ ] Run `docmgr doctor --ticket npmjs-public-libraries --stale-after 30`.
- [ ] Upload the ticket bundle to reMarkable.
- [ ] Create follow-up tickets for any deferred items such as helper renaming, trusted publishing, or app-specific cleanup.
