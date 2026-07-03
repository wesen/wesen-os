# Tasks

## Phase 0 — Scope and guardrails

- [ ] Read `design-doc/01-implementation-guide-for-publishing-macos1-react-to-npmjs.md` completely before editing release config.
- [ ] Confirm the goal of this ticket is **public npmjs publication of `@go-go-golems/macos1-react` only**.
- [ ] Confirm `@go-go-golems/os-core` is **not** being migrated to npmjs in this ticket.
- [ ] Confirm the known same-scope cross-registry caveat is documented before release work begins.

## Phase 1 — Package manifest and publish artifact readiness

- [ ] Edit `workspace-links/go-go-os-frontend/packages/macos1-react/package.json`.
- [ ] Change `publishConfig.registry` from `https://npm.pkg.github.com` to `https://registry.npmjs.org`.
- [ ] Add `publishConfig.access = "public"`.
- [ ] Verify package metadata is suitable for a public npm package (`name`, `description`, `repository`, `homepage`, `bugs`, `license`, `README`).
- [ ] Run `npm run build:dist -w packages/macos1-react` from `workspace-links/go-go-os-frontend/`.
- [ ] Inspect `workspace-links/go-go-os-frontend/packages/macos1-react/dist/package.json`.
- [ ] Verify `dist/package.json` points to `dist/*.js` and `dist/*.d.ts` and still includes CSS side effects and subpath exports.

## Phase 2 — Publish command path and operator ergonomics

- [ ] Decide whether to reuse `scripts/packages/publish-github-package.mjs` unchanged or introduce a clearer generic/npmjs-specific wrapper.
- [ ] If introducing a wrapper or rename, implement it under `workspace-links/go-go-os-frontend/scripts/packages/`.
- [ ] Ensure the chosen publish helper still publishes from the package `dist/` directory, not from source.
- [ ] Dry-run the chosen publish helper locally for `packages/macos1-react` without changing the registry state.

## Phase 3 — npmjs workflow

- [ ] Create a new GitHub Actions workflow, e.g. `workspace-links/go-go-os-frontend/.github/workflows/publish-npmjs-macos1-react.yml`.
- [ ] Configure the workflow to publish to `https://registry.npmjs.org`.
- [ ] Use `workflow_dispatch` inputs for `npm_tag`, `version_suffix`, and `dry_run`.
- [ ] Configure authentication via `NODE_AUTH_TOKEN` backed by an npm secret such as `NPM_TOKEN`.
- [ ] Run `npm run typecheck -w packages/macos1-react` in the workflow.
- [ ] Run `npm run test -w packages/macos1-react` in the workflow.
- [ ] Run `npm run build:dist -w packages/macos1-react` in the workflow.
- [ ] Add a pack smoke step for `packages/macos1-react` before publishing.
- [ ] Ensure the workflow can perform a dry-run publish first.

## Phase 4 — Public consumer documentation

- [ ] Update `workspace-links/go-go-os-frontend/packages/macos1-react/README.md` for public npm consumption.
- [ ] Document the normal install path: `pnpm add @go-go-golems/macos1-react`.
- [ ] Document required theme import: `import '@go-go-golems/macos1-react/theme';`.
- [ ] Document required wrapper usage: `Macos1Theme`.
- [ ] Document recommended subpath imports for `/primitives`, `/shell`, and `/parts`.
- [ ] Explicitly state that `@go-go-golems/os-core` remains an internal/compatibility entrypoint and is not the recommended public package for new consumers.

## Phase 5 — Artifact and install validation

- [ ] Run `npm pack ./packages/macos1-react/dist` from `workspace-links/go-go-os-frontend/`.
- [ ] Inspect the tarball contents for JS, `.d.ts`, CSS, `README.md`, and `package.json`.
- [ ] Create a clean scratch consumer project outside the monorepo.
- [ ] Install the package from the produced tarball or published canary.
- [ ] Verify `import '@go-go-golems/macos1-react/theme'` resolves in the scratch app.
- [ ] Verify `Macos1Theme` resolves and applies styling.
- [ ] Verify at least one primitive import such as `Btn` resolves from `@go-go-golems/macos1-react/primitives`.
- [ ] Verify at least one shell import such as `WindowLayer` resolves from `@go-go-golems/macos1-react/shell`.

## Phase 6 — Release rehearsal and first publish

- [ ] Run the npmjs workflow in dry-run mode.
- [ ] Record the exact version/tag strategy for the first public publish (`next`, `canary`, or `latest`).
- [ ] Publish the first npmjs prerelease or release.
- [ ] Verify the package page on npmjs.org shows correct metadata and README.
- [ ] Verify a clean public install works without GitHub Packages `.npmrc` configuration.

## Phase 7 — Ticket bookkeeping and follow-up

- [ ] Update `reference/01-implementation-diary.md` with commands, results, and any errors encountered.
- [ ] Update `changelog.md` with release-engineering decisions and touched files.
- [ ] Add file relations with `docmgr doc relate` for the key files changed in this ticket.
- [ ] Run `docmgr doctor --ticket macos1-npm-publish --stale-after 30`.
- [ ] Create a follow-up ticket if the team decides to move `os-core` or the broader `@go-go-golems` scope to npmjs later.
