---
Title: Phase 2 npm half — completion and handoff report
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: review
Topics:
    - wesen-os
    - npm
    - packaging
    - release-engineering
    - frontend
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/go-go-os-frontend/packages/os-core/src/theme/classic.css
      Note: Chicago dropped from --hc-font-family; released as os-core 0.1.4 (commit ec19a1c7)
    - Path: Dockerfile
      Note: production path runs pnpm install --frozen-lockfile then launcher:binary:build (published mode)
    - Path: apps/os-launcher/package.json
      Note: 7 os-* deps switched to published caret ranges (os-shell kept workspace:*); build -> published mode + build:linked added
    - Path: apps/os-launcher/src/theme/launcher-shell-overrides.css
      Note: temporary Chicago font override removed; full-bleed rules kept
    - Path: apps/os-launcher/vite.config.ts
      Note: GO_GO_OS_FRONTEND_RESOLUTION switch (workspace/published) + published package aliasing
ExternalSources: []
Summary: 'Boss-facing handoff report for the Phase 2 npm half of the wesen-os migration: os-core font fix published (0.1.4), the launcher switched to published @go-go-golems/os-* npm packages (7 of 8), and the one held-back package (os-shell) explained. Includes what changed, how it was verified, what remains, and decisions needed.'
LastUpdated: 2026-07-03T18:50:00-07:00
WhatFor: Hand the Phase 2 npm work back to a manager for sign-off, and give the next engineer a precise continuation point.
WhenToUse: Read this before reviewing the task/2026-07-os-launcher-published-npm-deps branch, before merging Phase 2, or before scoping the os-shell follow-on.
---






# Phase 2 npm half — completion and handoff report

> **One-line status:** Done and verified, with one justified deviation. The desktop font is fixed at the source, seven of eight `@go-go-golems/os-*` packages now come from npm, and the production (Docker/CI) image builds green. The eighth package (`os-shell`) is intentionally held back on the workspace link for a documented reason. A branch is ready for PR; awaiting go-ahead to push.

## 1. Executive summary

This is the npm half of **Phase 2** of the wesen-os migration (ticket `WESEN-OS-STOCKTAKE-2026-07`). The Go backend and the assistant UI were already ported on `task/2026-07-upgrade-stack`; this task moved the launcher's frontend dependencies off the git-submodule workspace link and onto published npm packages, and fixed the desktop font (the unwanted "Chicago" typeface) at its source rather than via a local override.

Two outcomes ship from this work:

1. **`@go-go-golems/os-core@0.1.4`** is published to npm with the Chicago font removed from all three theme token files. Every os-core consumer — not just wesen-os — now gets the corrected font stack.
2. **The wesen-os launcher** (`apps/os-launcher`) now resolves seven of its eight `@go-go-golems/os-*` dependencies from the npm registry instead of the local submodule, and its production build is configured to consume those published packages. The Docker/CI image build — the real gate — is green.

The work is on branch `task/2026-07-os-launcher-published-npm-deps` (one commit, `7caa3c9`), branched off `task/2026-07-upgrade-stack`. The os-core release is already merged and published upstream (`ec19a1c7` on `go-go-golems/go-go-os-frontend` main).

### What we need from the boss

- **Decision: push the branch / open a PR** against `task/2026-07-upgrade-stack`. The commit is local only; nothing has been pushed to the wesen-os remote yet.
- **Aware: one package (`os-shell`) stayed on the workspace link** for a hard technical reason (Section 4). This is a deliberate, documented choice, not an oversight; finishing the full 8-of-8 switch is a small follow-on.

## 2. What was asked

> "Publish the os-core font fix and switch wesen-os to published npm packages."

Two parts, per the implementation guide (`design-doc/02`):

- **Part A** — in the canonical `go-go-os-frontend` repo: drop "Chicago" from the font stack in three os-core theme files, bump and release the package through the existing trusted-publishing workflow (do not build a new pipeline).
- **Part B** — in wesen-os: change the launcher's `@go-go-golems/os-*` dependencies from `workspace:*` to published semver ranges, remove the temporary Chicago override, and verify the build/binary/Docker image.

## 3. What was delivered

### Part A — os-core font fix + publish ✅ (merged & live)

All work in the canonical repo `~/code/wesen/go-go-golems/go-go-os-frontend`, merged to `main` as `ec19a1c7`.

| Step | Result |
|---|---|
| Drop Chicago from the 3 theme files | Done → `"Geneva", "Helvetica Neue", Helvetica, Arial, sans-serif`. `grep -rn Chicago packages/os-core/src/theme/` returns nothing. |
| Bump version | `0.1.3 → 0.1.4` (its own version for the font change; `0.1.3` had previously only been published under the `next` tag). |
| Local validation | typecheck, 193 unit tests, `build:dist`, pack-smoke, and the publish helper dry-run — all green. |
| CI dry-run | Run `28685599158` — green. |
| Real publish (`CONFIRM_LATEST`) | Run `28685628617` — green. |
| **`npm view @go-go-golems/os-core version`** | **`0.1.4`** (latest). |

### Part B — wesen-os switched to published npm ✅ (on branch, verified)

On branch `task/2026-07-os-launcher-published-npm-deps`, commit `7caa3c9` (3 files: `apps/os-launcher/package.json`, `apps/os-launcher/src/theme/launcher-shell-overrides.css`, `pnpm-lock.yaml`).

- **Seven `os-*` deps moved to published caret ranges:**

  | Package | Range | Package | Range |
  |---|---|---|---|
  | os-core | `^0.1.4` | os-repl | `^0.1.6` |
  | os-chat | `^0.1.1` | os-ui-cards | `^0.1.3` |
  | os-scripting | `^0.1.3` | os-widgets | `^0.1.3` |
  | os-kanban | `^0.1.4` | | |

- **`os-shell` stayed on `workspace:*`** — see Section 4.
- The six app packages (`crm`, `todo`, `book-tracker-debug`, `apps-browser`, `hypercard-tools`, `inventory`) correctly remain `workspace:*` — they are not published and were out of scope.
- The launcher's default `build` now runs in **published resolution mode** (so Docker/CI reads os-core 0.1.4 dist from `node_modules`); a `build:linked` script was added for workspace-source dev.
- The temporary Chicago `--hc-font-family` override was removed from `launcher-shell-overrides.css`; the full-bleed desktop rules were kept.

## 4. The one deviation: `os-shell` held back (read this)

The guide assumed all eight `os-*` packages could move to npm. **Seven could; `os-shell` could not.** This is a hard, verified technical constraint, not a judgement call.

- The launcher and the inventory app both reference a type called **`FederatedAppHostContract`** from `@go-go-golems/os-shell`.
- That type is **unreleased**: it exists only in the `a554dc3` feature branch pinned in the wesen-os submodule. It is **not** in `go-go-os-frontend` main, and **not** in published `os-shell@0.1.1`.
- It is used as a *type-only* import, so the production Vite build (which strips types) succeeds either way — but switching `os-shell` to npm would point its types at the published `.d.ts`, which lacks the symbol.
- Moving `os-shell` to npm therefore requires the federation API to be merged to `go-go-os-frontend` main and published first. That is a small, well-scoped upstream task (Section 7).

There is a second, related finding worth flagging: the launcher's TypeScript typecheck (`tsc`) currently **fails** on `FederatedAppHostContract`. We confirmed this is **pre-existing on `task/2026-07-upgrade-stack`** (it fails identically at clean HEAD, before any of our changes) and is **not caused by this work**. It should be fixed alongside the os-shell release.

> **Why this is still a good outcome:** the package that needed the font fix (os-core) and the bulk of the launcher's frontend surface (7 packages) are now hermetic npm deps and the production image builds against them. `os-shell` remaining linked is the same state it was in before; nothing regressed.

## 5. How it was verified

Every gate the guide asked for, plus the Docker image build:

| Check | Result |
|---|---|
| `pnpm install` + committed `pnpm-lock.yaml` | Green; lockfile committed. |
| Launcher os-* resolve from **npm** (not link) | Confirmed in lockfile + `node_modules`: os-core `0.1.4`, os-shell `link:` (intended). The early `pnpm why` "link:" lines were transitive paths through workspace apps, not the launcher's own deps. |
| Published-mode frontend build | Green — 1482 modules, ~4.9s. |
| Built/served CSS has the Chicago-free font | `--hc-font-family: "Geneva", "Helvetica Neue", Helvetica, Arial, sans-serif;` in the bundled `index-*.css`. |
| `pnpm install --frozen-lockfile` | Green (the unforgiving check Docker/CI use). |
| `go build ./cmd/wesen-os-launcher` | Green — 86 MB binary. |
| **`docker build .`** (full CI path) | **Green** — image `wesen-os-launcher:npm-switch`. Frozen-lockfile install → published-mode frontend build → Go binary, all succeeded. |
| Runtime smoke (ran the binary, opened in browser) | Desktop boots (HTTP 200); classic-Mac desktop renders correctly (menu bar, bordered desktop, app icons, "Launcher Home" window with classic chrome); font is "modern anti-aliased Geneva/Helvetica rather than bitmap Chicago" (vision-confirmed). |

> Two things deliberately **not** claimed: (1) the assistant **prompt round-trip** was not re-exercised here — it requires the LLM backend; the assistant *window* mounts and the frontend render is confirmed, and the Go side is unchanged by this task. (2) Four residual "Chicago" tokens remain in the built CSS, but they are a **different** variable (`--mac-font`, the os-widgets control-room/system-modeler widget-art themes) — out of scope for this task, which targeted only the os-core desktop `--hc-font-family` tokens.

## 6. Two things the guide got wrong (corrected on the fly)

Both were discovered during execution and handled without asking; recorded here so the guide (`design-doc/02`) can be corrected.

1. **The workspace-glob narrowing recommended in §5 does not work.** Eight workspace-linked apps (not just the launcher) consume `os-*` via `workspace:*`; removing the `workspace-links/*/packages/*` glob strands all of them (`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`). It is also unnecessary: the submodule's `os-*` packages are all at version `0.1.0`, which satisfies none of the `^0.1.x` caret ranges, so pnpm already resolves the launcher's `os-*` from npm while the other apps keep their links. **Action taken:** globs left untouched (verified clean against HEAD).
2. **The submodule pin is stale, so the default build had to change.** The submodule is pinned to `a554dc3`, whose `os-*` are at `0.1.0` and whose os-core still references Chicago. The launcher's Vite config auto-detects "workspace mode" when the submodule is present, which would alias os-core to that stale source — silently rebuilding the *old* (Chicago) CSS and defeating the point of publishing 0.1.4. **Action taken:** made the launcher's default `build` use published resolution mode (`GO_GO_OS_FRONTEND_RESOLUTION=published`), which reads the npm dist. This is what makes the Docker build actually ship the fix.

## 7. What remains (follow-ons)

In rough priority order:

1. **Push branch + open PR** (awaiting decision) — merge `task/2026-07-os-launcher-published-npm-deps` into `task/2026-07-upgrade-stack`.
2. **Unblock `os-shell` (small upstream task):** merge the `a554dc3` federation work (incl. `FederatedAppHostContract`) into `go-go-os-frontend` main and publish a new `os-shell`; then switch the launcher's `os-shell` to the published range and fix the pre-existing `tsc` failure. This completes the 8-of-8 switch.
3. **Full submodule removal** (still out of scope here): additionally requires the launcher's app dependencies (`crm`, `todo`, `book-tracker-debug`, plus `apps-browser`/`hypercard-tools`/`inventory` from sibling repos) to be published or vendored. Tracked as a separate follow-on.
4. **Correct `design-doc/02`** §2.2 and §5 to reflect Sections 6.1–6.2 above (the glob-narrowing recommendation and the build-mode requirement).
5. **Phase 3 (ship)** remains the next *phase*: local smoke, k3s `profiles.runtime.yaml` config migration, image build/merge/Argo sync, and the production bake.

## 8. Decision record

**DR-Phase2-npm-1 — Published ranges for 7 os-* deps; `os-shell` held on `workspace:*`.**
- *Context:* 7 of 8 os-* packages are publishable and version-current; `os-shell` exposes an unreleased federation type consumed by the launcher + inventory app.
- *Decision:* Switch the 7 to npm now; keep `os-shell` linked until its federation API ships upstream.
- *Rationale:* Maximizes the win (os-core font fix + hermetic frontend deps + green production build) without blocking on an upstream release, and regresses nothing.
- *Consequences:* Submodule stays (its apps still feed crm/todo/etc., and its `os-shell` feeds the launcher). Full removal is a follow-on.
- *Status:* accepted (implemented, verified).

## 9. References (key files)

- **os-core release (canonical repo):** `packages/os-core/src/theme/{classic.css,desktop/theme/macos1.css,desktop/tokens.css}`, `packages/os-core/package.json`; commit `ec19a1c7`.
- **wesen-os switch (this branch):** `apps/os-launcher/package.json`, `apps/os-launcher/src/theme/launcher-shell-overrides.css`, `pnpm-lock.yaml`; commit `7caa3c9`.
- **Resolution mechanism:** `apps/os-launcher/vite.config.ts` (`GO_GO_OS_FRONTEND_RESOLUTION`), `apps/os-launcher/tsconfig.published.json`.
- **Guide (needs §2.2/§5 correction per Section 6):** `design-doc/02-npm-package-publishing-and-consumer-switchover-implementation-guide.md`.
- **Primary analysis:** `design-doc/01-…md` §5.6(4) (no-Chicago decision).
- **npm:** `@go-go-golems/os-core@0.1.4` (latest), dist-tags `{ latest: 0.1.4, next: 0.1.3 }`.
