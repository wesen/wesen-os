---
Title: 'npm package publishing and consumer switchover: implementation guide'
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - wesen-os
    - npm
    - packaging
    - release-engineering
    - frontend
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Executable guide for the Phase 2 npm work: publish the os-core font fix, verify the published @go-go-golems/os-* set, switch wesen-os apps/os-launcher from workspace links to published semver ranges, and (partially) retire the go-go-os-frontend submodule. Written for a colleague to execute independently."
LastUpdated: 2026-07-03T18:30:00-07:00
WhatFor: "Hand a self-contained npm publishing + consumer-switch task to a colleague."
WhenToUse: "Before publishing any @go-go-golems/os-* package or switching wesen-os to published npm packages."
---

# npm package publishing and consumer switchover: implementation guide

## 1. Executive summary

This is the npm half of Phase 2 of the wesen-os migration (WESEN-OS-STOCKTAKE-2026-07). The Go backend and the assistant UI are already ported to chatapp/sessionstream on branch `task/2026-07-upgrade-stack`; what remains before that branch can merge is moving the launcher's frontend dependencies off git-submodule workspace links and onto published npm packages.

The task turned out **much smaller than the original April analysis assumed**. That analysis said three packages (os-scripting, os-ui-cards, os-confirm) were unpublished. As of 2026-07-03 they are all published and version-current. The only publishable package that is behind npm is **os-core** (repo `0.1.3`, npm `0.1.2`), and it needs one small change anyway — dropping the Chicago font from the theme tokens. So the real work is: (a) make the os-core font edit and release one new os-core version through the existing trusted-publishing workflow, (b) switch `wesen-os/apps/os-launcher` to consume the `@go-go-golems/os-*` packages by published range, and (c) verify and partially retire the submodule.

> Scoping note, read before estimating: the go-go-os-frontend submodule cannot be fully removed by this task alone. The launcher also consumes go-go-os-frontend *apps* (`crm`, `todo`, `book-tracker-debug`) and packages from *other* repos (`apps-browser`, `hypercard-tools`, `inventory`) through workspace-link globs. Those are not published to npm. This task moves the nine `@go-go-golems/os-*` packages to npm and leaves the app packages as workspace links; complete submodule removal is a follow-on that also needs the app packages published or vendored (§8).

## 2. Current state (measured 2026-07-03)

### 2.1 Publish status of the `@go-go-golems/os-*` set

Source repo: `~/code/wesen/go-go-golems/go-go-os-frontend` (main `77729a67`). All nine packages are `"private": false`, `publishConfig.access: public`, and trusted-publishing-enabled.

| Package | Repo version | npm latest | Action |
|---|---|---|---|
| @go-go-golems/os-core | **0.1.3** | **0.1.2** | **bump + font edit + publish** |
| @go-go-golems/os-shell | 0.1.1 | 0.1.1 | none (in sync) |
| @go-go-golems/os-chat | 0.1.1 | 0.1.1 | none |
| @go-go-golems/os-scripting | 0.1.3 | 0.1.3 | none |
| @go-go-golems/os-ui-cards | 0.1.3 | 0.1.3 | none |
| @go-go-golems/os-confirm | 0.1.1 | 0.1.1 | none |
| @go-go-golems/os-widgets | 0.1.3 | 0.1.3 | none |
| @go-go-golems/os-kanban | 0.1.4 | 0.1.4 | none |
| @go-go-golems/os-repl | 0.1.6 | 0.1.6 | none |

Reproduce the table:

```bash
cd ~/code/wesen/go-go-golems/go-go-os-frontend
for pkg in os-core os-shell os-chat os-scripting os-ui-cards os-confirm os-widgets os-kanban os-repl; do
  repo=$(node -e "console.log(require('./packages/'+process.argv[1]+'/package.json').version)" "$pkg")
  npmv=$(npm view @go-go-golems/$pkg version 2>/dev/null || echo NONE)
  echo "$pkg repo=$repo npm=$npmv"
done
```

### 2.2 What wesen-os consumes today

`wesen-os/apps/os-launcher/package.json` declares 16 `@go-go-golems/*` dependencies. They fall into three groups by where the pnpm workspace resolves them (root `package.json` workspace globs: `apps/*`, `workspace-links/*/packages/*`, `workspace-links/*/apps/*`):

| Consumed dep | Resolves from | Publishable now? |
|---|---|---|
| os-shell, os-core, os-chat, os-scripting, os-kanban, os-repl, os-ui-cards, os-widgets | `workspace-links/go-go-os-frontend/packages/*` | **yes — this task** |
| crm, todo, book-tracker-debug | `workspace-links/go-go-os-frontend/apps/*` | no (apps, unpublished) |
| apps-browser, hypercard-tools, inventory | other sibling repos' globs | no (other repos) |
| chat-overlay, chat-provider | already published (react-chat 0.2.1) | already on ranges |

Only the first row is in scope. All eight are currently `"workspace:*"`.

Inter-package deps inside go-go-os-frontend are also `workspace:*` (e.g. os-chat depends on os-core as `workspace:*`). This is safe to publish: the publish tooling rewrites `workspace:*` to the concrete version at pack time (`scripts/packages/build-dist.mjs:329-346`, `rewriteDependencyMap`). Consumers therefore receive real semver ranges, never a `workspace:` specifier.

## 3. The publishing mechanism (already built)

go-go-os-frontend has a complete, guarded trusted-publishing pipeline. Do not build a new one.

- **Workflow:** `.github/workflows/publish-npm.yml` — `workflow_dispatch` only, no push trigger.
- **Trusted identity (npmjs-side, do not change):** repository `go-go-golems/go-go-os-frontend`, workflow `publish-npm.yml`, environment `npm-production`. The job keeps `permissions: {contents: read, id-token: write}` and `environment: npm-production`; those are what OIDC trusted publishing checks. There is no `NPM_TOKEN` — provenance is via OIDC.
- **Inputs:** `package_set` (single | os-core | first-wave | shell-stack | vm-stack | all), `package_name` (when `package_set=single`), `npm_tag` (default `latest`), `dry_run` (default true), `skip_existing` (default true), `confirm_latest_publish` (must equal `CONFIRM_LATEST` for a real `latest` publish).
- **Package sets:** defined in `scripts/packages/package-sets.mjs`.
- **Publish helper:** `scripts/packages/publish-npm-package-set.mjs` — builds dist, pack-smokes, checks `npm view` for the version, skips existing when asked, and enforces the `CONFIRM_LATEST` guard even locally.
- **What the workflow does per package:** `pnpm install --frozen-lockfile` → `check:vm-sources` → typecheck → test (skipped if no test script) → `build:dist` → pack smoke → publish.
- **Full runbook:** `~/code/wesen/go-go-golems/go-go-os-frontend/ttmp/2026/05/11/npm-trusted-publishing-cicd--…/playbooks/01-npm-trusted-publishing-release-runbook.md`. This guide is the wesen-os-facing wrapper around that runbook.

## 4. Part A — the os-core font edit and release

### Decision: A1 — drop Chicago in os-core, not only in the wesen-os override

- **Context:** os-core's theme tokens list `Chicago` in `--hc-font-family` (three files). wesen-os currently patches this with a launcher-level override (`apps/os-launcher/src/theme/launcher-shell-overrides.css`, committed on `task/2026-07-upgrade-stack`). The user directed "no chicago font, replace with normal alternative" (design doc §5.6(4)).
- **Options:** (a) keep only the wesen-os override; (b) fix os-core at the source and republish, then remove the override.
- **Decision:** (b). The override is a stopgap; every other os-core consumer (and Storybook) should get the Chicago-free stack. This is also the change that justifies the os-core republish the repo already has staged (0.1.3).
- **Consequences:** one new os-core release; the wesen-os override can be deleted once the launcher consumes the new os-core (do that in Part B, not here).
- **Status:** proposed

### Steps

All in the **canonical repo** `~/code/wesen/go-go-golems/go-go-os-frontend` (clean `main` == `origin/main` at `77729a67`, os-core `0.1.3`).

> Do NOT publish from the workspace submodule `wesen-os/workspace-links/go-go-os-frontend`. Its local `main` (`c74347e`, April) has **genuinely diverged** from `origin/main`: it carries ~11 abandoned `macos1-react` extraction/showcase commits and is 48 commits behind origin. That is the incomplete os-core-compat facade that breaks the desktop CSS (why the launcher pins the submodule to `a554dc3`). It is already archived on the pushed branch `task/2026-04-widget-showcase-wip` (`9a1e267`). Do not merge it into `origin/main` and do not use it as the publish source — publishing from it would ship os-core `0.1.0` with the broken facade. The canonical repo is the only correct source; the divergence needs no reconciliation because Part B removes the submodule's `packages/*` from the build entirely.

1. **Edit the three font-family declarations** to a Chicago-free stack `"Geneva", "Helvetica Neue", Helvetica, Arial, sans-serif`:
   - `packages/os-core/src/theme/classic.css:4` — currently `'Chicago', 'Geneva', 'Helvetica', monospace`
   - `packages/os-core/src/theme/desktop/theme/macos1.css:3` — currently `"Geneva", "Chicago", "Monaco", monospace`
   - `packages/os-core/src/theme/desktop/tokens.css:9` — currently `"Geneva", "Chicago", "Monaco", monospace`

   Grep to confirm none remain: `grep -rn Chicago packages/os-core/src/theme/` should return nothing.

2. **Bump the version.** The repo is already at `0.1.3` while npm is at `0.1.2`, so `0.1.3` has never been published — you could publish `0.1.3` as-is with the font change, OR bump to `0.1.4`. Recommendation: bump to `0.1.4` so the font change has its own version and there is no ambiguity about what `0.1.3` contained.

   ```bash
   node -e "const fs=require('fs');const p='packages/os-core/package.json';const j=JSON.parse(fs.readFileSync(p));j.version='0.1.4';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
   ```

3. **Refresh the lockfile** (only if it changes):

   ```bash
   pnpm install --lockfile-only
   pnpm install --frozen-lockfile
   ```

4. **Local validation** before touching CI:

   ```bash
   pnpm --filter @go-go-golems/os-core run typecheck
   pnpm --filter @go-go-golems/os-core run test
   pnpm --filter @go-go-golems/os-core run build:dist
   node scripts/packages/pack-smoke.mjs packages/os-core
   node scripts/packages/publish-npm-package-set.mjs --package packages/os-core --tag latest --dry-run
   ```

5. **Commit + push to main** (project policy publishes from main):

   ```bash
   git add packages/os-core/src/theme/classic.css \
           packages/os-core/src/theme/desktop/theme/macos1.css \
           packages/os-core/src/theme/desktop/tokens.css \
           packages/os-core/package.json pnpm-lock.yaml
   git commit -m "os-core: drop Chicago from theme font stack; release 0.1.4"
   git push origin HEAD:main
   ```

6. **CI dry-run** (must pass before the real publish):

   ```bash
   gh workflow run publish-npm.yml --repo go-go-golems/go-go-os-frontend --ref main \
     -f package_set=single -f package_name=@go-go-golems/os-core \
     -f npm_tag=latest -f dry_run=true -f skip_existing=false -f confirm_latest_publish=''
   gh run list --repo go-go-golems/go-go-os-frontend --workflow publish-npm.yml --limit 3
   gh run watch <run-id> --repo go-go-golems/go-go-os-frontend --exit-status
   ```

7. **Real publish** (only after the dry-run is green):

   ```bash
   gh workflow run publish-npm.yml --repo go-go-golems/go-go-os-frontend --ref main \
     -f package_set=single -f package_name=@go-go-golems/os-core \
     -f npm_tag=latest -f dry_run=false -f skip_existing=false \
     -f confirm_latest_publish='CONFIRM_LATEST'
   ```

8. **Confirm:** `npm view @go-go-golems/os-core version` returns `0.1.4`.

No other package needs publishing. If, before you run this, the table in §2.1 has drifted (someone bumped another package's repo version above npm), publish those the same way — one package at a time, dry-run first.

## 5. Part B — switch wesen-os to published ranges

All in `~/code/wesen/wesen-os` (or the workspace checkout), on a branch off `task/2026-07-upgrade-stack`.

### Decision: B1 — published ranges for os-*, keep app packages linked

- **Context:** Only the eight `@go-go-golems/os-*` deps are publishable now (§2.2). The other six (`crm`, `todo`, `book-tracker-debug`, `apps-browser`, `hypercard-tools`, `inventory`) are apps or from other repos and remain workspace links.
- **Decision:** Replace only the os-* `workspace:*` specifiers with published caret ranges. Leave the rest as `workspace:*`.
- **Consequences:** The go-go-os-frontend submodule stays (its `apps/*` still feed crm/todo/book-tracker-debug) but its `packages/*` are no longer the resolution source for os-*. Full removal is a follow-on (§8).
- **Status:** proposed

### Steps

1. **Edit `apps/os-launcher/package.json`** — change these eight from `"workspace:*"` to published ranges (use the versions from §2.1, os-core `^0.1.4` after Part A):

   ```
   "@go-go-golems/os-core":     "^0.1.4",
   "@go-go-golems/os-shell":    "^0.1.1",
   "@go-go-golems/os-chat":     "^0.1.1",
   "@go-go-golems/os-scripting": "^0.1.3",
   "@go-go-golems/os-kanban":   "^0.1.4",
   "@go-go-golems/os-repl":     "^0.1.6",
   "@go-go-golems/os-ui-cards": "^0.1.3",
   "@go-go-golems/os-widgets":  "^0.1.3",
   ```

   Leave `crm`, `todo`, `book-tracker-debug`, `apps-browser`, `hypercard-tools`, `inventory` as `workspace:*`; leave `chat-overlay`/`chat-provider` as their existing `^0.2.1`.

2. **Guard against the pnpm workspace preferring the local link.** pnpm resolves `workspace:*` to the linked package, and a caret range against a package that *also* exists as a workspace member will still prefer the workspace copy. Two options:
   - (preferred) Narrow the root `package.json` `workspaces` and `pnpm-workspace.yaml` so `workspace-links/go-go-os-frontend/packages/*` is no longer a workspace member and pnpm resolves those from npm. Keep the `apps/*` glob (crm/todo/book-tracker-debug) and the other link repos' globs.
   - (alternative) Keep the glob but add `pnpm.overrides`/`resolutions`. The glob-narrowing is cleaner; prefer it.

   The root globs use `workspace-links/*/packages/*` (all link repos). Narrowing this without dropping the app-repo packages (go-go-app-inventory etc.) means replacing the `*` wildcard with explicit per-repo globs that exclude go-go-os-frontend/packages. Verify with `pnpm why @go-go-golems/os-core --filter @go-go-golems/os-launcher` that os-core resolves to a registry version, not a `link:` path.

3. **Make `build:published` the default build** for the launcher and keep a linked-dev script. The launcher already has `"build:published": "GO_GO_OS_FRONTEND_RESOLUTION=published vite build"` and a `tsconfig.published.json`. Once os-* come from npm, `build` and `build:published` converge; keep `build` as the published build and add a `build:linked` if a fast local-edit loop is still wanted.

4. **Install and build:**

   ```bash
   pnpm install
   pnpm --filter @go-go-golems/os-launcher run build
   ```

5. **Remove the now-redundant Chicago override.** Once the launcher consumes os-core `^0.1.4` (Chicago-free), delete the font line from `apps/os-launcher/src/theme/launcher-shell-overrides.css` (keep the full-bleed rules — those are wesen-os-specific).

## 6. Verification

1. **Dependency resolution:** `pnpm why @go-go-golems/os-core --filter @go-go-golems/os-launcher` shows `0.1.4` from the registry, no `link:`.
2. **Frontend build + typecheck:** `pnpm --filter @go-go-golems/os-launcher run build && pnpm --filter @go-go-golems/os-launcher run typecheck` green. Compare built CSS size against the pre-switch build to confirm no theme regression (§5.4 `sideEffects` hazard — every os-* `./theme` import must still emit CSS).
3. **Full binary:** `npm run launcher:ui:sync && go build ./cmd/wesen-os-launcher`, run it, and confirm in a browser that the desktop renders in full macos1 style with the Chicago-free font, and the assistant window still round-trips a prompt. (The Go side is unchanged by this task; this is a frontend-only regression check.)
4. **Docker parity:** `docker build .` from wesen-os root — the image build runs `pnpm install --frozen-lockfile`, so a stale lockfile fails here. This is the check the CI `publish-host-image` workflow also runs.

## 7. Risks and gotchas

- **Lockfile drift breaks the Docker/CI build.** Every dependency edit must be followed by `pnpm install` and a committed `pnpm-lock.yaml`; `--frozen-lockfile` in the image build is unforgiving. (This exact regression already bit the Phase 0 consolidation, PR #13.)
- **Theme side effects and tree-shaking.** os-* packages register CSS through side-effect imports (`./theme`). Verify the CSS is present in the published build; a `sideEffects: false` misconfiguration would silently drop it. `build-dist.mjs` keeps `**/*.css` in `files`, but confirm empirically (step 6.2).
- **`workspace:*` vs published range resolution.** The single most likely mistake is leaving the `workspace-links/go-go-os-frontend/packages/*` glob in place so pnpm keeps resolving os-* from the local submodule despite the caret ranges — you would publish nothing-consuming and not notice. Step 6.1 is the guard.
- **Trusted-publishing identity is exact.** Do not rename `publish-npm.yml`, change the `npm-production` environment, or drop `id-token: write` — any of these breaks OIDC and the publish fails with an auth error, not a clear message.
- **`CONFIRM_LATEST` guard.** A real `latest` publish requires `confirm_latest_publish=CONFIRM_LATEST`; without it the workflow exits non-zero at input validation. This is intentional.

## 8. Out of scope / follow-on

Full removal of the `workspace-links/go-go-os-frontend` submodule is **not** part of this task. It additionally requires the launcher's go-go-os-frontend *app* dependencies (`crm`, `todo`, `book-tracker-debug`) to be published or vendored, plus the non-frontend app packages (`apps-browser`, `hypercard-tools`, `inventory`) from their own repos. Those apps do not currently have publish configuration. Track that as a separate item; this task's win is that the eight os-* packages become hermetic npm deps and the Chicago font is fixed at the source.

## 9. References

**go-go-os-frontend (`~/code/wesen/go-go-golems/go-go-os-frontend`)**
- `.github/workflows/publish-npm.yml` — the publish workflow
- `scripts/packages/package-sets.mjs` — publishable sets
- `scripts/packages/publish-npm-package-set.mjs` — publish helper + guards
- `scripts/packages/build-dist.mjs:329-346` — `workspace:*` → version rewrite
- `docs/npm-publishing-playbook.md`, `ttmp/2026/05/11/npm-trusted-publishing-cicd--…/playbooks/01-npm-trusted-publishing-release-runbook.md` — the upstream runbook
- `packages/os-core/src/theme/{classic.css,desktop/theme/macos1.css,desktop/tokens.css}` — the three Chicago edits

**wesen-os (`~/code/wesen/wesen-os`, branch `task/2026-07-upgrade-stack`)**
- `apps/os-launcher/package.json` — the deps to switch
- `package.json`, `pnpm-workspace.yaml` — workspace globs to narrow
- `apps/os-launcher/package.json` `build:published` script + `tsconfig.published.json`
- `apps/os-launcher/src/theme/launcher-shell-overrides.css` — the temporary Chicago override to remove after the switch

**This ticket**
- `design-doc/01-…` §5.4 (npm drift), §5.6(4) (no-Chicago decision), Decision D4
- `various/03-raw-findings-go-go-goja-and-npm-packages.md` — the original (now partly stale) npm inventory
