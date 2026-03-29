# NPM-PUBLISH-001 Postmortem And Intern Guide

## Audience And Intent

This document is for a new engineer joining the project after the `NPM-PUBLISH-001` migration work started. It is deliberately written as both:

- a postmortem of what we actually changed,
- and a textbook on how the system works, why the migration was needed, and how to continue it safely.

If you read only one document to get oriented on the npm publishing effort, read this one first. Then read:

- `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/tasks.md`
- `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/diary.md`
- `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/package-identity-matrix.md`

## Executive Summary

We started from a workspace-linked frontend ecosystem that behaved like a monorepo but was not yet honest about package boundaries. The runtime host, app repos, TypeScript configs, and Vite aliases routinely pointed directly into sibling `src/` trees. That was convenient for local development, but it meant the packages were not actually publishable or consumable as registry artifacts.

The migration so far has done five foundational things:

1. Renamed the public scope from `@hypercard/*` to `@go-go-golems/*`.
2. Renamed the core platform packages to a stable `os-*` vocabulary.
3. Renamed the package folders to match the public package names so the filesystem no longer lied about the package identities.
4. Added a staged publish pipeline that builds packages into `dist/`, rewrites manifests for publish use, rewrites internal `workspace:*` references in staged manifests, and smoke-tests packed/installable artifacts.
5. Added the first manual GitHub Packages canary workflow for `@go-go-golems/os-core`.

The central architectural lesson is simple:

- local workspace development wants source-path shortcuts,
- published npm packages need dist artifacts and honest public entrypoints,
- browser federation needs static URLs for manifests and chunks,
- therefore npm package publishing and federation asset hosting are related but different concerns.

Do not collapse those concerns into one mechanism.

## What The System Is

At a high level, this system is a desktop-style frontend platform split across several repositories. The code we touched most in this migration lives in:

- `wesen-os`
  - host repo
  - owns the launcher application and ticket docs
- `workspace-links/go-go-os-frontend`
  - shared frontend platform packages and demo apps
- `workspace-links/go-go-app-inventory`
  - real external consumer app used as the first downstream publish proof

The launcher host in `wesen-os` still depends on many `workspace:*` packages today. You can see that directly in `apps/os-launcher/package.json:20-183`. The launcher is therefore a good integration checkpoint, but not yet the final "published consumer" target.

The platform repo `go-go-os-frontend` is the publish center. Its root workspace scripts show the intended v1 publish flow in `workspace-links/go-go-os-frontend/package.json:8-21`:

- `build:publish-v1`
- `pack:smoke-v1`
- `install:smoke-v1`

The v1 public platform contracts are recorded in `package-identity-matrix.md:5-41`:

- `@go-go-golems/os-core`
- `@go-go-golems/os-shell`
- `@go-go-golems/os-scripting`
- `@go-go-golems/os-ui-cards`
- `@go-go-golems/os-chat`
- `@go-go-golems/os-repl`
- `@go-go-golems/os-widgets`
- `@go-go-golems/os-kanban`
- `@go-go-golems/os-confirm`

## Core Vocabulary

You need to understand these terms before touching the migration.

### Workspace Package

A package resolved through npm or pnpm workspace wiring, often with `workspace:*` dependencies. This is the current local development mode in many repos.

Example:

- `apps/os-launcher/package.json:31-44`
- `workspace-links/go-go-app-inventory/apps/inventory/package.json:35-42`

### Source Alias

A TypeScript or Vite alias that points directly into another repo's or package's `src/` tree.

Example:

- `workspace-links/go-go-os-frontend/packages/os-ui-cards/tsconfig.json:17-26`
- `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.json:11-37`
- `workspace-links/go-go-app-inventory/tooling/vite/createHypercardViteConfig.ts:57-68`

### Publish Boundary

The set of files that a package consumer should be able to install and use without reaching into sibling source code. In this migration, that means:

- compiled JS in `dist/`
- declaration files in `dist/`
- copied runtime assets such as CSS and `.vm.js`
- a `dist/package.json` whose entrypoints point at those artifacts

### Staged Publish Manifest

The generated `dist/package.json` that is safe to publish, distinct from the package-root `package.json` that remains source-first for local development.

### Downstream Consumer

A repo or app that uses the platform packages from outside the package repo. Inventory is the first real proof case.

### Federation

Future browser-time loading of remote code and assets. This is not the same thing as npm package publishing.

## Repository Topology

```text
wesen-os/
  apps/os-launcher/                       host app
  ttmp/.../NPM-PUBLISH-001.../           ticket docs
  workspace-links/
    go-go-os-frontend/                   platform package repo
      packages/os-*/
      apps/*
      scripts/packages/*
      .github/workflows/*
    go-go-app-inventory/                 downstream consumer app
      apps/inventory/
      tooling/vite/
```

The direction of dependency is:

```text
go-go-os-frontend packages
        |
        v
  downstream apps and hosts
  - inventory
  - os-launcher

future:
  npm registry distributes installable packages
  static asset host distributes browser federation assets
```

## The Original Problems

Before this migration, the system had several forms of structural dishonesty.

### Problem 1: Package Names And Folder Names Diverged

The public package names moved to `@go-go-golems/os-*`, but the folders still used historical names like `engine`, `desktop-os`, and `hypercard-runtime`. That made every build and packaging discussion more confusing than necessary.

### Problem 2: Consumers Bypassed Package Boundaries

Package tsconfigs often mapped imports directly to sibling source directories. For example:

- `workspace-links/go-go-os-frontend/packages/os-ui-cards/tsconfig.json:17-21`
- `workspace-links/go-go-os-frontend/packages/os-scripting/tsconfig.json:17-24`

Inventory did the same thing across repos:

- `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.json:11-37`

That means the import `@go-go-golems/os-core` did not really mean "use the public package". It often meant "go read another source tree directly."

### Problem 3: Manifests Were Not Publish-Ready

The package manifests were still source-first. For example, `workspace-links/go-go-os-frontend/packages/os-core/package.json:29-39` shows:

- `exports` pointing at `./src/*`
- `main` pointing at `src/index.ts`
- `types` pointing at `src/index.ts`

That is acceptable for a workspace-only setup and wrong for a published package.

### Problem 4: Runtime Assets Needed Special Handling

Some packages need more than compiled TypeScript:

- CSS themes
- `.vm.js` runtime bootstrap/prelude files
- generated JSON metadata in later steps

Those assets do not appear automatically just because `tsc` ran.

### Problem 5: GitHub Packages And Federation Were Easy To Confuse

GitHub Packages distributes npm artifacts. Browser federation wants versioned manifests and chunk URLs that the browser can fetch. Those are different transport surfaces.

This is captured explicitly in `package-identity-matrix.md:22-27`.

## The Rename Mapping

The rename map is stable and should be treated as part of the public contract:

- `engine` -> `os-core`
- `desktop-os` -> `os-shell`
- `hypercard-runtime` -> `os-scripting`
- `ui-runtime` -> `os-ui-cards`
- `chat-runtime` -> `os-chat`
- `repl` -> `os-repl`
- `rich-widgets` -> `os-widgets`
- `kanban-runtime` -> `os-kanban`
- `confirm-runtime` -> `os-confirm`

The corresponding package names are the `@go-go-golems/os-*` equivalents.

## What We Actually Changed

This section is the postmortem core.

### Phase A: Rename Public Identities

We first changed imports and manifests from `@hypercard/*` to `@go-go-golems/*`, and aligned the platform names to the `os-*` vocabulary. The launcher host was the fastest integration checkpoint because it exercises a broad slice of the system.

Important consequence:

- the migration was not just a search-and-replace,
- it surfaced real type issues and contract drift,
- those had to be fixed to keep the host green.

### Phase B: Rename Package Folders

We then renamed package folders in `go-go-os-frontend` so the path names matched the public package identities:

```text
packages/engine             -> packages/os-core
packages/desktop-os         -> packages/os-shell
packages/hypercard-runtime  -> packages/os-scripting
packages/ui-runtime         -> packages/os-ui-cards
packages/chat-runtime       -> packages/os-chat
packages/repl               -> packages/os-repl
packages/rich-widgets       -> packages/os-widgets
packages/kanban-runtime     -> packages/os-kanban
packages/confirm-runtime    -> packages/os-confirm
```

Why this mattered:

- it removed the mental split between "real public identity" and "old local folder name",
- it made publish tooling easier to reason about,
- it flushed out hardcoded path assumptions across multiple repos.

### Phase C: Build Packages Into `dist/` Without Trusting Sibling `src/`

The most important technical work lives in `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs:8-253`.

This script does three jobs:

1. build the current package with a temporary tsconfig,
2. rewrite workspace path mappings so package imports resolve to sibling `dist` types instead of sibling `src`,
3. generate a publish-ready `dist/package.json`.

The key idea is in `buildWorkspacePackagePaths()` and `writeBuildTsconfig()`:

- the script scans sibling workspace packages,
- reads their manifest exports,
- rewrites `src` targets to `dist` declaration targets,
- injects those rewritten paths into a temporary build tsconfig.

That lets package-local dist builds compile against the public boundary shape instead of pulling in sibling source files.

#### Why This Was Necessary

Consider `workspace-links/go-go-os-frontend/packages/os-ui-cards/tsconfig.json:17-26`.

It explicitly maps:

- `@go-go-golems/os-core` -> `../os-core/src`
- `@go-go-golems/os-scripting` -> `../os-scripting/src`

That is convenient during development. It is also exactly why package-local builds were not honest. TypeScript would walk outside the package's own `rootDir` and compile against foreign source trees.

### Phase D: Stage Publish Manifests In `dist/`

We did not simply flip the package-root manifests to published mode. Instead, the staged build writes a distinct publish manifest into `dist/package.json`.

Why this split exists:

- source manifests still support local linked development,
- staged manifests describe real npm artifacts,
- local development safety still benefits from `private: true` in the source manifests.

You can see the source-side metadata in `workspace-links/go-go-os-frontend/packages/os-core/package.json:2-62` and the generation logic in `build-dist.mjs:267-323`.

### Phase E: Add Pack And Install Smoke Tests

Two scripts turned "looks publishable" into "behaves publishable":

- `workspace-links/go-go-os-frontend/scripts/packages/pack-smoke.mjs:9-50`
- `workspace-links/go-go-os-frontend/scripts/packages/install-smoke.mjs:19-101`

The pack smoke proves that individual tarballs can be built and that forbidden artifacts are not leaking into them.

The install smoke proves that packed tarballs can be installed into a clean temporary fixture with only the necessary peer packages.

This was an important milestone because it moved the migration from "manifest theory" to "artifact reality".

### Phase F: Prove A Real Downstream Consumer

Inventory became the first external consumer proof. Its app manifest now declares the platform packages it truly imports in `workspace-links/go-go-app-inventory/apps/inventory/package.json:28-47`.

We added:

- `typecheck:published` in `package.json:13-27`
- `tsconfig.published.json:1-13`
- a two-mode Vite resolver in `createHypercardViteConfig.ts:45-95`

This was important because the migration needed to prove more than package-local packing. It had to prove that a real app can build in a mode that does not depend on sibling source trees.

### Phase G: Tighten Publish Metadata

We added package metadata such as:

- `license`
- `author`
- `repository.directory`
- `homepage`
- `bugs`
- `publishConfig.registry`
- `files`

Example:

- `workspace-links/go-go-os-frontend/packages/os-core/package.json:4-28`

This is what makes the staged manifests credible as registry artifacts instead of anonymous build output.

### Phase H: Fix Compiled Test Leakage

This is the sort of detail an intern should learn to care about.

After adding `files` allowlists, the pack smoke failed because compiled `*.test.js` and `*.test.d.ts` files were still present in `dist/`. That failure was not noise. It was exactly the kind of leak a publish pipeline is supposed to catch.

The fix was to remove ignored publish artifacts during dist staging:

- `build-dist.mjs:20-21`
- `build-dist.mjs:43-57`
- `build-dist.mjs:274-279`
- `build-dist.mjs:335-344`

This is a good lesson:

- once you make a publish surface explicit, hidden junk becomes visible,
- and that is a sign that your checks are getting better, not worse.

### Phase I: Add The First GitHub Packages Canary Workflow

The first workflow is intentionally narrow:

- file: `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml:1-77`
- helper: `workspace-links/go-go-os-frontend/scripts/packages/publish-github-package.mjs:1-112`

It only allows `packages/os-core` today. That is deliberate. `os-core` has no internal workspace dependencies in its runtime dependency graph, so it is the safest first package to publish.

The workflow sequence is:

1. install dependencies with pnpm,
2. typecheck the selected package,
3. run its tests,
4. build `dist/`,
5. run pack smoke,
6. publish from `dist/`, optionally with a canary suffix and optionally as a dry run.

## The Most Important Design Decisions

### Decision 1: Publish From The Source Repo

We chose:

- publish from `go-go-os-frontend`,
- link GitHub Packages artifacts back to that source repository,
- do not create a separate distribution repo for npm artifacts.

Why:

- package ownership is clearest in the source repo,
- `repository.directory` can point to the owning package path,
- GitHub Actions can use `GITHUB_TOKEN` for same-repo publish,
- it avoids inventing another layer of synchronization.

### Decision 2: Keep Source Manifests `private`, Publish From `dist/`

This is not accidental inconsistency. It is an explicit safety boundary.

Why:

- package-root manifests still point to `src/*`,
- local development still benefits from workspace-private safety,
- `dist/package.json` is the real published artifact manifest.

If you change this later, do it because release tooling became more mature, not because you dislike the asymmetry aesthetically.

### Decision 3: Separate npm Distribution From Federation

Do not let anyone tell you that GitHub Packages alone solves federation.

GitHub Packages provides:

- versioned npm installs
- install-time metadata
- CI-consumable package distribution

Federation needs:

- browser-reachable URLs
- remote manifests or remote entries
- JS chunks and static assets
- CORS and cache control
- potentially integrity metadata

That is why the ticket keeps object storage/CDN work in later phases.

## How The Build Pipeline Works

This is the most important operational section for an intern.

### Source Manifest Vs Staged Publish Manifest

Source package:

```json
{
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

Staged publish manifest:

```json
{
  "exports": {
    ".": "./index.js"
  },
  "main": "./index.js",
  "types": "./index.d.ts",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

The build script is responsible for this transformation.

### `build-dist.mjs` Pseudocode

```text
function buildDist(packageDir):
  clean dist/
  read package.json and tsconfig.json
  read all workspace packages
  collect their public export targets
  rewrite sibling package paths from src -> dist declaration targets
  write temporary tsconfig with rewritten paths
  run tsc against the temporary tsconfig
  delete compiled test/story artifacts from dist
  copy non-TS assets (.css, .vm.js) into dist
  synthesize dist/package.json for publish use
  write dist/.npmignore
  copy package README if present
```

Relevant implementation points:

- path rewrite: `build-dist.mjs:59-85`
- workspace export discovery: `build-dist.mjs:88-211`
- temporary build tsconfig: `build-dist.mjs:213-253`
- artifact cleanup: `build-dist.mjs:274-279`
- publish manifest synthesis: `build-dist.mjs:296-323`

### Artifact Flow Diagram

```text
package root
  src/
  package.json (source-first, private)
  tsconfig.json (dev/source aliases)
          |
          v
  build-dist.mjs
    - rewrites paths for build time
    - runs tsc
    - removes compiled tests/stories
    - copies CSS and .vm.js
    - writes dist/package.json
          |
          v
  dist/
    *.js
    *.d.ts
    *.css
    *.vm.js
    package.json (publish-ready)
    .npmignore
```

## How Smoke Validation Works

### Pack Smoke

Purpose:

- prove `npm pack` succeeds,
- inspect the tarball file list,
- fail if tests or Storybook artifacts leaked into the package.

Relevant file:

- `workspace-links/go-go-os-frontend/scripts/packages/pack-smoke.mjs:18-49`

This is a "shape" check. It does not prove a real consumer can install or run the package.

### Install Smoke

Purpose:

- prove packed tarballs can install in a clean fixture,
- prove the dependency metadata is sufficient for a basic install.

Relevant file:

- `workspace-links/go-go-os-frontend/scripts/packages/install-smoke.mjs:37-101`

This is an "installability" check. It is stronger than pack smoke and weaker than a real downstream app proof.

### Downstream Consumer Proof

Purpose:

- prove a real external app can build against packed platform packages.

Relevant files:

- `workspace-links/go-go-app-inventory/apps/inventory/package.json:13-27`
- `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.published.json:1-13`
- `workspace-links/go-go-app-inventory/tooling/vite/createHypercardViteConfig.ts:45-95`

This is the most convincing proof we have so far short of a full launcher published-mode cutover.

## How Consumer Resolution Works

Inventory now has two modes:

1. `workspace`
   - use linked source aliases for local development
2. `published`
   - use installed package resolution

This behavior lives in `createHypercardViteConfig.ts:45-68`.

### Resolution Logic Pseudocode

```text
if GO_GO_OS_FRONTEND_RESOLUTION is explicitly set:
  use that mode
else if ../../../go-go-os-frontend exists:
  use workspace mode
else:
  use published mode
```

Why this matters:

- local engineers can still work with linked source trees,
- external verification can run without those aliases,
- the migration can be incremental instead of all-or-nothing.

### Published TypeScript Mode

The inventory app now has:

- `tsconfig.json` for linked-source development
- `tsconfig.published.json` for installed-package verification

Compare:

- linked-source mode: `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.json:11-37`
- published mode: `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.published.json:1-13`

That difference is one of the cleanest teaching examples in the whole ticket.

## How GitHub Packages Publishing Works

The current canary workflow is the beginning of Phase 4, not the end of it.

### Workflow Contract

Current workflow file:

- `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml:1-77`

Important parts:

- manual trigger: `workflow_dispatch`
- permissions:
  - `contents: read`
  - `packages: write`
- Node registry setup:
  - `registry-url: https://npm.pkg.github.com`
  - `scope: @go-go-golems`
- auth:
  - `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`

### Publish Helper Contract

The helper script:

- `workspace-links/go-go-os-frontend/scripts/packages/publish-github-package.mjs:10-112`

Responsibilities:

- parse the package directory and publish options,
- optionally append a prerelease suffix,
- publish from `dist/`,
- restore the original staged manifest after publish.

### Why Only `os-core` Right Now

Because `os-core` has no internal platform runtime dependencies in its `dependencies` block. Compare with:

- `workspace-links/go-go-os-frontend/packages/os-core/package.json:47-55`
- `workspace-links/go-go-os-frontend/packages/os-scripting/package.json`
- `workspace-links/go-go-os-frontend/packages/os-shell/package.json`

Publishing a more interconnected package set requires coordinated version rewriting for internal dependencies. The canary workflow deliberately avoids pretending that problem is solved.

## Knowledge Every Intern Must Learn

This is the teaching checklist.

### 1. Workspace Convenience Is Not The Same As Package Honesty

When you map imports to sibling `src` trees, you are optimizing for convenience. That is acceptable only if you remember that you are bypassing the public package contract.

If you forget that, you will produce packages that "work on my machine" and fail anywhere else.

### 2. Published Packages Are About Artifacts, Not Just Source

Real packages are more than `.ts` files:

- they include built JS,
- declaration files,
- copied assets,
- a clean manifest,
- and sometimes carefully curated exclusions.

### 3. Every Stronger Validation Layer Teaches You Something Different

- typecheck proves code-level compatibility
- pack smoke proves tarball shape
- install smoke proves registry-style installability
- downstream consumer proof proves real external usability
- actual registry canary proves CI/runtime package publishing

Do not confuse one with another.

### 4. GitHub Packages Has A Permission Model

Interns should read the official GitHub docs we referenced during this work:

- GitHub Actions Node package publishing:
  - https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages
- GitHub Packages access and visibility:
  - https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility

Why these matter:

- they explain when `GITHUB_TOKEN` is enough,
- they explain package visibility and repository linkage,
- they explain why other repos may need `Manage Actions access` to install private or internal packages in CI.

### 5. Federation Is A Different Distribution Problem

Interns should internalize this sentence:

> npm packages are for install-time reuse; federation assets are for browser-time loading.

This is why later ticket phases mention object storage and CDN-like concerns.

## Common Failure Modes

### Failure Mode: `TS6305`, `TS6059`, Or Other Cross-Package Type Build Errors

Likely cause:

- package-local builds are still resolving into sibling `src` trees instead of sibling `dist` entrypoints.

Where to look:

- package `tsconfig.json`
- `build-dist.mjs`
- package `exports`

### Failure Mode: Tarball Contains Tests Or Stories

Likely cause:

- compiled test or story files were emitted into `dist/`,
- allowlists or ignores are too loose,
- artifact cleanup is missing.

Where to look:

- `build-dist.mjs`
- `pack-smoke.mjs`

### Failure Mode: Consumer Builds Only In Workspace Mode

Likely cause:

- the consumer still has TypeScript `paths` or Vite aliases pointing to source trees,
- or it is importing a platform package without declaring it in `dependencies`.

Where to look:

- consumer `package.json`
- consumer `tsconfig.json`
- consumer published-mode tsconfig
- Vite config

### Failure Mode: GitHub Actions Publish Works But Another Repo Cannot Install

Likely cause:

- GitHub package visibility is wrong,
- linked repository access is not set correctly,
- the consuming repo lacks `Manage Actions access`.

Where to look:

- GitHub package settings page
- official GitHub package access docs

## Runbooks

### Runbook: Rebuild The Full v1 Publish Set

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend
npm run build:publish-v1
```

### Runbook: Repack The Canary Set

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend
npm run pack:smoke-v1
```

### Runbook: Reinstall The Canary Set In A Clean Fixture

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend
npm run install:smoke-v1
```

### Runbook: Dry-Run A GitHub Packages Canary Publish

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend
npm run build:dist -w packages/os-core
node scripts/packages/publish-github-package.mjs \
  packages/os-core \
  --tag canary \
  --version-suffix canary.local \
  --dry-run
```

### Runbook: Verify Inventory In Published Mode

High-level sequence:

1. build the v1 platform publish artifacts,
2. install inventory dependencies,
3. install packed platform tarballs,
4. run published-mode typecheck,
5. run published-mode Vite build.

Files to inspect before repeating the proof:

- `workspace-links/go-go-app-inventory/apps/inventory/package.json:13-47`
- `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.published.json:1-13`
- `workspace-links/go-go-app-inventory/tooling/vite/createHypercardViteConfig.ts:45-95`

## What We Learned

### Technical Lessons

- Folder names matter because humans debug with paths.
- Package honesty requires artifact-level validation, not just TypeScript success.
- `files` allowlists are only as good as the cleanliness of the build output.
- A downstream consumer proof often reveals missing dependency declarations that workspace aliases were hiding.
- The first publish workflow should be narrow and reliable, not generic and fragile.

### Process Lessons

- Separate commits by concern:
  - rename
  - build scaffolding
  - smoke validation
  - consumer proof
  - metadata tightening
  - workflow addition
- Keep a diary because the failure modes are subtle and easy to rediscover the hard way.
- Update tasks as decisions become real, not just when code changes.

## What Is Still Not Done

The migration is not finished. Important unfinished items include:

- replacing remaining source-first entrypoints completely in the publish model
- deciding the release-time version rewrite strategy for intra-repo package dependencies
- broadening the publish workflow beyond `os-core`
- proving `wesen-os` itself can operate cleanly in a published-package mode
- deciding the final versioning/release mechanism
- implementing the federation/static-hosting phases later

This document explains how we got here. It does not claim the ticket is complete.

## Recommended Reading Order For A New Intern

1. Read this document front-to-back.
2. Read `package-identity-matrix.md`.
3. Skim `tasks.md` for the open phases.
4. Read the latest diary steps around package metadata and GitHub Packages.
5. Inspect these files directly:
   - `workspace-links/go-go-os-frontend/package.json`
   - `workspace-links/go-go-os-frontend/packages/os-core/package.json`
   - `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs`
   - `workspace-links/go-go-os-frontend/scripts/packages/pack-smoke.mjs`
   - `workspace-links/go-go-os-frontend/scripts/packages/install-smoke.mjs`
   - `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml`
   - `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.json`
   - `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.published.json`
   - `workspace-links/go-go-app-inventory/tooling/vite/createHypercardViteConfig.ts`
6. Read the official GitHub docs linked above.
7. Only then try to extend the workflow or convert another package.

## Suggested Intern Exercises

These are safe ways to learn the system without immediately changing the release path.

### Exercise 1: Trace One Package End To End

Pick `@go-go-golems/os-core` and answer:

- what does its source manifest say,
- what does its staged dist manifest say,
- what assets does it ship,
- what would a consumer import from it.

### Exercise 2: Compare Linked And Published Consumer Modes

Compare:

- `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.json`
- `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.published.json`

Write down exactly what assumptions disappear in published mode.

### Exercise 3: Explain Why Federation Is Not Solved By npm

Use the package matrix and the GitHub docs to write a short note answering:

- what npm registry publishing solves,
- what browser federation still needs separately.

## References

### Internal Files

- `apps/os-launcher/package.json:1-183`
- `workspace-links/go-go-os-frontend/package.json:1-42`
- `workspace-links/go-go-os-frontend/packages/os-core/package.json:1-63`
- `workspace-links/go-go-os-frontend/packages/os-ui-cards/tsconfig.json:1-27`
- `workspace-links/go-go-os-frontend/packages/os-scripting/tsconfig.json:1-29`
- `workspace-links/go-go-os-frontend/scripts/packages/build-dist.mjs:1-344`
- `workspace-links/go-go-os-frontend/scripts/packages/pack-smoke.mjs:1-50`
- `workspace-links/go-go-os-frontend/scripts/packages/install-smoke.mjs:1-101`
- `workspace-links/go-go-os-frontend/scripts/packages/publish-github-package.mjs:1-112`
- `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml:1-77`
- `workspace-links/go-go-app-inventory/apps/inventory/package.json:1-66`
- `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.json:1-38`
- `workspace-links/go-go-app-inventory/apps/inventory/tsconfig.published.json:1-13`
- `workspace-links/go-go-app-inventory/tooling/vite/createHypercardViteConfig.ts:1-95`
- `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/tasks.md`
- `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/diary.md`
- `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/package-identity-matrix.md:1-73`

### External References

- GitHub Actions tutorial: publishing Node.js packages
  - https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages
- GitHub Packages access control and visibility
  - https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
