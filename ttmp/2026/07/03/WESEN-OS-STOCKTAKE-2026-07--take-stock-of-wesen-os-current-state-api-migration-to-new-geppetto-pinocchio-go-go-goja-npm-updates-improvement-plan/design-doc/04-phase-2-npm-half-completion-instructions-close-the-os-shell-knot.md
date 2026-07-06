---
Title: 'Phase 2 npm half — completion instructions (close the os-shell knot)'
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
Summary: "Corrected, complete instructions to finish the Phase 2 npm half. Supersedes the premature 'done' framing of design-doc/03. Closes the os-shell blocker by lifting the 11-line FederatedAppHostContract type to go-go-os-frontend main and publishing os-shell 0.1.2, which also collapses the split os-core, greens the typecheck, and lets the launcher fully leave the submodule's packages. Adds the verification the handoff skipped (assistant round-trip, window interaction) and records what stays for Phase 4 (os-chat)."
LastUpdated: 2026-07-03T20:30:00-07:00
WhatFor: "Give the engineer an exact, ordered path to actually close Phase 2's npm half."
WhenToUse: "Read instead of design-doc/03's 'follow-ons' before touching os-shell or opening the Phase 2 PR."
---

# Phase 2 npm half — completion instructions (close the os-shell knot)

## 0. Why this document exists

The handoff report (`design-doc/03`) marks the npm half "done and verified, with one justified deviation." It is not done. The "deviation" — os-shell held on the workspace link — is not a clean deferral; it cascades into four unresolved problems, and nothing has been pushed. This document is the corrected, complete path. Read it instead of `design-doc/03` §7.

### What is actually true (verified 2026-07-03)

Done and good:
- `@go-go-golems/os-core@0.1.4` is published with Chicago removed. Real win, keep it.
- 7 of 8 `os-*` deps are on published caret ranges; the Docker/CI image builds green.

Not done:
1. **Nothing is pushed.** Branch `task/2026-07-os-launcher-published-npm-deps` (commit `7caa3c9`) exists only locally, on top of the also-unmerged `task/2026-07-upgrade-stack`.
2. **os-shell is blocked on a type**, and that type is trivially fixable (see §1) — the report treated it as a vague follow-on.
3. **The launcher runs on a split os-core.** Because os-shell stays linked, the lockfile resolves two copies: launcher → os-core `0.1.4` (npm), os-shell → os-core `0.1.0` (submodule link). os-core owns desktop windowing/theme/store. "Desktop renders" does not clear a dual-package hazard.
4. **The launcher typecheck (`tsc`) is red** on `FederatedAppHostContract` (pre-existing, but unaddressed and entangled with os-shell).
5. **The assistant round-trip was never re-verified** on this branch (report admits it).
6. Out of scope but must be tracked: **os-chat is still wired into the launcher** (`store.ts` mounts its SEM reducers; `main.tsx` imports its theme). That is Phase 4 (os-chat retirement), not Phase 2 — but it means the launcher currently bundles both chat stacks.

### The key finding that makes this small

`FederatedAppHostContract` is an **11-line pure TypeScript interface** — no runtime code:

```ts
// packages/os-shell/src/contracts/federatedAppHostContract.ts
import type { RuntimeBundleDefinition } from '@go-go-golems/os-core';
import type { Reducer } from '@reduxjs/toolkit';
import type { LaunchableAppModule } from './launchableAppModule';

export interface FederatedAppHostContract {
  remoteId: string;
  launcherModule: LaunchableAppModule;
  sharedReducers?: Record<string, Reducer>;
  docsMetadata?: Record<string, unknown>;
  runtimeBundles?: readonly RuntimeBundleDefinition[];
}
```

It is committed on the submodule branch `task/js-runtime-manager` (commit `2561acc`, "Add federated app host contract type") but was never merged to `origin/main` and is not on the `a554dc3` pin. Published `os-shell@0.1.1` lacks it; the only reason the launcher typechecks against it today is a **stale built `dist/…d.ts` artifact** left in the submodule working tree. Federation is used at runtime (`apps/os-launcher/src/app/modules.tsx:28` spreads `listRuntimeFederatedLauncherModules()`), so the type stays — **do not cut federation; lift the type to main and publish.** Lifting an 11-line interface + one index export is a ~10-minute upstream change.

## 1. Part A (upstream) — publish os-shell with the federation contract

All in the **canonical repo** `~/code/wesen/go-go-golems/go-go-os-frontend` (clean `main` == `origin/main`). Do **not** work from the workspace submodule (see `design-doc/02` §4 callout).

1. **Add the interface to os-shell source.** Cherry-pick the source commit, or recreate it by hand (it is 11 lines):

   ```bash
   cd ~/code/wesen/go-go-golems/go-go-os-frontend
   git fetch origin
   git checkout main && git pull
   git cherry-pick 2561acc      # adds src/contracts/federatedAppHostContract.ts + os-shell/src/index.ts export
   # If it conflicts (index.ts drift), just add the file and the export line by hand.
   ```

   Confirm on main: `grep -rn FederatedAppHostContract packages/os-shell/src/` shows the definition and a re-export in `packages/os-shell/src/index.ts`.

2. **Verify os-shell typechecks** (`RuntimeBundleDefinition` must exist in the os-core the repo builds against — it does on main):

   ```bash
   pnpm --filter @go-go-golems/os-shell run typecheck
   ```

3. **Bump os-shell 0.1.1 → 0.1.2**, refresh the lockfile:

   ```bash
   node -e "const fs=require('fs');const p='packages/os-shell/package.json';const j=JSON.parse(fs.readFileSync(p));j.version='0.1.2';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
   pnpm install --lockfile-only && pnpm install --frozen-lockfile
   ```

   os-shell depends on os-core as `workspace:*`, which the publish tooling rewrites to the concrete built version (`scripts/packages/build-dist.mjs`). Ensure the repo's `packages/os-core/package.json` is at `0.1.4` before building os-shell so its published os-core range dedupes with the launcher's `^0.1.4` (os-core `0.1.4` is already on npm; the range just needs to be compatible).

4. **Local validation, then publish** through the existing workflow (same drill as os-core in `design-doc/02` §4):

   ```bash
   pnpm --filter @go-go-golems/os-shell run build:dist
   node scripts/packages/pack-smoke.mjs packages/os-shell
   node scripts/packages/publish-npm-package-set.mjs --package packages/os-shell --tag latest --dry-run
   git add packages/os-shell/src packages/os-shell/package.json packages/os-core/package.json pnpm-lock.yaml
   git commit -m "os-shell: add FederatedAppHostContract type; release 0.1.2"
   git push origin HEAD:main
   # CI dry-run, then real publish with CONFIRM_LATEST — exact gh commands in design-doc/02 §4 steps 6-7.
   ```

5. **Confirm:** `npm view @go-go-golems/os-shell version` → `0.1.2`, and the tarball ships the type:

   ```bash
   npm pack @go-go-golems/os-shell@0.1.2 --dry-run 2>&1 | grep -i federat
   ```

## 2. Part B (wesen-os) — complete the 8/8 switch and collapse the split

On branch `task/2026-07-os-launcher-published-npm-deps` (continue the colleague's commit; do not start fresh).

1. **Move os-shell to the published range** in `apps/os-launcher/package.json`:
   `"@go-go-golems/os-shell": "^0.1.2"` (was `workspace:*`).

2. `pnpm install` and **commit the lockfile.**

3. **Verify the os-core split is gone** — this is the whole point:

   ```bash
   pnpm why @go-go-golems/os-core --filter @go-go-golems/os-launcher
   ```

   Expect a **single** os-core `0.1.4` from the registry, and **no** `link:` / `0.1.0`. If a `0.1.0` link still appears, another launcher-consumed package still pulls os-core via a workspace link — trace and resolve before proceeding.

4. **The typecheck must go green** now that os-shell types come from npm and export the contract:

   ```bash
   pnpm --filter @go-go-golems/os-launcher run typecheck          # must exit 0
   pnpm --filter @go-go-golems/os-launcher run typecheck:published
   ```

   If it still fails on `FederatedAppHostContract`, the published os-shell 0.1.2 did not include it — return to Part A step 5.

5. **Confirm no launcher `os-*` resolves from the submodule.** With all eight on npm, `workspace-links/go-go-os-frontend/packages/*` is no longer a launcher build input (the app links crm/todo/book-tracker-debug remain — expected). You need not remove the submodule; verify the launcher build reads npm dist (the `build:published`/vite `GO_GO_OS_FRONTEND_RESOLUTION` mechanism the colleague added).

## 3. Part C — the verification the handoff skipped

Rendering was checked; behavior was not. Do both against a **real** engine profile (`~/.config/pinocchio/profiles.yaml` has a working `default` → gpt-5-nano).

1. Build the full binary and run it:

   ```bash
   pnpm --filter @go-go-golems/os-launcher run build
   npm run launcher:ui:sync
   go build -o /tmp/wesen-os-launcher ./cmd/wesen-os-launcher
   /tmp/wesen-os-launcher wesen-os-launcher --addr :18099 --arc-enabled=false --profile default
   ```

2. **Assistant round-trip (the real gate):** open the Assistant window, send a prompt, confirm a *model reply* entity appears (not just the user echo). This exercises the assistant window inside the os-shell-managed desktop — the surface most at risk from the (now-collapsed) os-core split.

3. **Window-manager interaction:** open two app windows, use a right-click context menu, launch an app from an icon. This is what a dual-os-core would break silently; confirm it works with the unified os-core.

4. Re-confirm the font (no Chicago in bundled CSS `--hc-font-family`) and the full-bleed desktop — both already landed; just don't regress.

## 4. Part D — land it, and record the boundary

1. **Push the branch and open the PR** into `task/2026-07-upgrade-stack`. Also decide whether that branch is itself ready for `wesen/wesen-os` main — Phases 1+2 have been sitting unpushed (see Phase 3 in the primary plan).
2. **State in the PR** that **os-chat is still a launcher dependency** (`store.ts` SEM reducers, `main.tsx` theme). This is intentional and belongs to **Phase 4** (os-chat retirement, Decision D7), not Phase 2. Do not let "Phase 2 done" read as "os-chat removed."
3. Correct `design-doc/02` §2.2/§5 and mark `design-doc/03` superseded by this document (the glob-narrowing recommendation was wrong — `design-doc/03` §6.1 — and the "done" status was premature).

## 5. Definition of done (all must hold)

- [ ] `npm view @go-go-golems/os-shell version` → `0.1.2`; tarball `.d.ts` exports `FederatedAppHostContract`.
- [ ] `apps/os-launcher/package.json`: all eight `os-*` on published `^` ranges; `pnpm-lock.yaml` committed.
- [ ] `pnpm why @go-go-golems/os-core --filter @go-go-golems/os-launcher` shows a single `0.1.4`, no `link:`/`0.1.0`.
- [ ] `pnpm --filter @go-go-golems/os-launcher run typecheck` exits 0.
- [ ] `docker build .` green (frozen-lockfile install → published frontend build → Go binary).
- [ ] Assistant round-trip produces a real model reply in the browser; window/context-menu interaction works.
- [ ] Branch pushed, PR open; PR notes os-chat is retained pending Phase 4.

## 6. Explicitly NOT in this task

- **Full submodule removal.** Still blocked on the app packages (`crm`, `todo`, `book-tracker-debug`, `apps-browser`, `hypercard-tools`, `inventory`) being published or vendored. Separate follow-on.
- **os-chat retirement.** Phase 4 (Decision D7).
- **Phase 3 deploy** (k3s `profiles.runtime.yaml` migration, image ship, Argo sync, bake). Separate phase.

## 7. References

- `design-doc/02` — the publishing mechanism (workflow, trusted identity, package sets, `gh workflow run` commands). Valid except §2.2/§5.
- `design-doc/03` — the premature handoff report this supersedes; §5 (verification) and §8 (decision record) remain accurate; §7 (follow-ons) is replaced by this doc.
- go-go-os-frontend `task/js-runtime-manager` `2561acc` — the source of the 11-line contract to lift.
- `apps/os-launcher/src/app/{modules.tsx,loadFederatedAppContracts.ts,localFederatedAppContracts.ts,bootstrapLauncherApp.ts}` — the launcher's federation consumers of the type.
- `apps/os-launcher/src/app/store.ts`, `apps/os-launcher/src/main.tsx` — the retained os-chat wiring (Phase 4).
