---
Title: Investigation Diary
Ticket: WOS-02-HYPERCARD-TOOLS-MOUNTING
Status: active
Topics:
    - wesen-os
    - hypercard
    - runtime
    - frontend
    - bugfix
    - documentation
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: apps/os-launcher/src/__tests__/launcherHost.test.tsx
      Note: Launcher host test covers payload wiring but not HyperCard Tools bundle loading
    - Path: vocabulary.yaml
      Note: Shared docmgr vocabulary file needed a parse fix before ticket tooling could run
    - Path: workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.test.ts
      Note: New direct regression test added during implementation
    - Path: workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/runtimeService.integration.test.ts
      Note: Existing QuickJS integration coverage exercises valid fixtures but not the broken HyperCard Tools bundle
ExternalSources: []
Summary: ""
LastUpdated: 2026-04-06T17:06:22-04:00
WhatFor: Record the reproduction, code archaeology, docmgr setup issues, and delivery steps for the HyperCard Tools runtime mounting regression.
WhenToUse: Use when continuing this fix, reviewing the evidence, or reconstructing why the design doc recommends explicit per-surface packId values.
---



# Investigation Diary

## Goal

Capture exactly how the HyperCard Tools runtime mounting failure was reproduced, what code paths were inspected, what environment/tooling issues appeared during the investigation, and how to review or continue the work.

## Step 1: Reproduce the Failure and Map the Runtime Contract

The first step was to prove that the user-reported bug still existed in the running launcher and then trace the actual production code path instead of guessing from the error string alone. This mattered because HyperCard/runtime/session terminology is easy to blur together, and the fix needs to target the exact contract violation, not a convenient nearby abstraction.

The reproduction confirmed that the desktop icon route was healthy up to the point where QuickJS attempted to read runtime bundle metadata. From there, the investigation became a contract-mapping exercise: identify who creates the window payload, who owns the runtime session, where bundle metadata is read, and why `packId` is required before any render can happen.

### Prompt Context

**User prompt (verbatim):** "Create a new docmgr ticket to fix the issue with mounting certain hypercard tools / runtime surfaces. 

When I go to http://localhost:5173/ which is running wesen-os, and I double click on the hypercard tools icon, I get a new window with the error: \"Runtime surface packId is required for surface: home\" and the console log 

 content.js:1:838260
[QuickJSRuntimeService] Created service instance 
Object { instanceId: \"runtime-service-2\", options: {…} }
runtimeService.ts:124:13
[QuickJSRuntimeService] Loading runtime bundle 
Object { instanceId: \"runtime-service-1\", stackId: \"os-launcher\", sessionId: \"session-1\", packageIds: (2) […], codeLength: 28297, beforeSessions: [] }
runtimeService.ts:173:13
[QuickJSRuntimeService] Loaded runtime bundle 
Object { instanceId: \"runtime-service-1\", stackId: \"os-launcher\", sessionId: \"session-1\", declaredPackageIds: (2) […], surfaces: (6) […], afterSessions: (1) […] }
runtimeService.ts:200:15
[QuickJSRuntimeService] Loading runtime bundle 
Object { instanceId: \"runtime-service-1\", stackId: \"hypercardToolsUiDslDemo\", sessionId: \"hypercard-tools-session:workspace-d1b456f0-499b-4def-ae4f-276b63c42062\", packageIds: (1) […], codeLength: 39254, beforeSessions: (1) […] }
​
beforeSessions: Array [ \"session-1\" ]
​
​
0: \"session-1\"
​
​
length: 1
​
​
<prototype>: Array []
​
codeLength: 39254
​
instanceId: \"runtime-service-1\"
​
packageIds: Array [ \"ui\" ]
​
​
0: \"ui\"
​
​
length: 1
​
​
<prototype>: Array []
​
sessionId: \"hypercard-tools-session:workspace-d1b456f0-499b-4def-ae4f-276b63c42062\"
​
stackId: \"hypercardToolsUiDslDemo\"
​
<prototype>: Object { … }
runtimeService.ts:173:13
[QuickJSRuntimeService] Failed to load runtime bundle 
Object { instanceId: \"runtime-service-1\", stackId: \"hypercardToolsUiDslDemo\", sessionId: \"hypercard-tools-session:workspace-d1b456f0-499b-4def-ae4f-276b63c42062\", packageIds: (1) […], message: \"Error: Runtime surface packId is required for surface: home\" }
<anonymous code>:1:145535
    overrideMethod <anonymous code>:1
    loadRuntimeBundle runtimeService.ts:210
[RuntimeSurfaceSessionHost] Failed to load or recover runtime session 
Object { sessionId: \"hypercard-tools-session:workspace-d1b456f0-499b-4def-ae4f-276b63c42062\", bundleId: \"hypercardToolsUiDslDemo\", recoveringReadySession: false, message: \"Error: Runtime surface packId is required for surface: home\" }
​
bundleId: \"hypercardToolsUiDslDemo\"
​
message: \"Error: Runtime surface packId is required for surface: home\"
​
recoveringReadySession: false
​
sessionId: \"hypercard-tools-session:workspace-d1b456f0-499b-4def-ae4f-276b63c42062\"
​
<prototype>: Object { … }

---

Create a detailed analysis and explanation of the issue at play here, for a new intern who knows absolutely nothing about the system, especially runtimes and packags and runtime service and sessions and all that. 

Create a detailed analysis / design / implementation guide that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a new docmgr ticket, investigate the real bug behind the HyperCard Tools runtime mounting failure, write an intern-friendly architecture and implementation guide, and deliver the result to reMarkable.

**Inferred user intent:** Leave behind a continuation-ready ticket that both explains the system and gives a future engineer a concrete path to implement the actual fix safely.

### What I did
- Ran `docmgr status --summary-only` to find the active docs root.
- Searched for the error string and the HyperCard Tools bundle id with `rg`.
- Read the key runtime files with `nl -ba ... | sed -n ...`:
  - `runtimeService.ts`
  - `stack-bootstrap.vm.js`
  - `RuntimeSurfaceSessionHost.tsx`
  - `runtimeSessionManager.ts`
  - `pluginBundle.vm.js`
  - `pluginBundle.authoring.d.ts`
  - `module.tsx`
  - `stack.ts`
- Opened `http://localhost:5173/` in Playwright and reproduced the real UI failure by dispatching a `dblclick` event on the `HyperCard Tools` icon.
- Collected browser snapshot and console evidence showing the `packId` failure on the `home` surface.
- Ran a focused Vitest command for nearby launcher/runtime suites.
- Created a new `docmgr` ticket, design doc, and diary doc.

### Why
- The user explicitly asked for a new ticket and for an explanation aimed at a new intern.
- The runtime bug could plausibly have been caused by missing package registration, wrong launcher wiring, or a stale session path, so I verified the code path instead of assuming the cause from the string alone.

### What worked
- Playwright reproduction proved the launcher still fails in the running app and showed the same error the user reported.
- `rg` and line-anchored file reads quickly narrowed the issue to `stack-bootstrap.vm.js` and the HyperCard Tools bundle source.
- The runtime architecture was consistent enough across files to build a clean intern-facing explanation.
- After fixing the shared `docmgr` vocabulary parse error, ticket creation and doc creation worked normally.

### What didn't work
- `docmgr vocab list` initially failed with:

```text
Error: failed to load vocabulary: failed to parse vocabulary file: yaml: line 55: could not find expected ':'
```

- Inspecting `/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/vocabulary.yaml` showed a stray trailing line `low-up handoff` after the `completed` status entry. I removed that line so vocabulary-aware commands could run again.
- Running:

```bash
pnpm -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os exec vitest run apps/os-launcher/src/__tests__/launcherHost.test.tsx apps/os-launcher/src/domain/pluginBundle.test.ts
```

  failed partly because `apps/os-launcher/src/__tests__/launcherHost.test.tsx` imports a module graph that expects `@go-go-golems/arc-agi-player/launcher`, which is not available in this checkout:

```text
Error: Cannot find package '@go-go-golems/arc-agi-player/launcher' imported from '/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/modules.tsx'
```

### What I learned
- The failure is not about runtime package installation. The launcher correctly registers `UI_RUNTIME_PACKAGE` and `UI_CARD_V1_RUNTIME_SURFACE_TYPE`.
- The failure happens while QuickJS is computing runtime bundle metadata, before the first surface render.
- `packageIds` and `packId` are distinct concepts. The bundle can correctly install `ui` and still be invalid because a surface has no `packId`.
- The HyperCard Tools authoring declaration file is stale enough that it permits authoring a bundle the runtime will reject.

### What was tricky to build
- The word `home` appears in multiple bundles, which makes it tempting to suspect a global collision. The actual model is bundle-local, so the shared name is noise, not cause.
- The launcher-side `RuntimeBundleDefinition` and the QuickJS-side runtime bundle source look similar enough that it is easy to assume the static TypeScript metadata is the source of truth. It is not. The crash comes from the VM bundle source string.
- `docmgr` was configured against a parent workspace docs root, not the repo-local `ttmp`, so the new ticket had to be created there and then related back to `wesen-os` files.

### What warrants a second pair of eyes
- Whether the team wants explicit `packId` on every surface or a small helper function that stamps `ui.card.v1` onto each surface definition.
- Whether there are other hand-authored VM bundles with the same omission that should be scanned in one follow-up pass.
- Whether the launcher-host test should be stabilized in this workspace or whether the regression should live only in a direct HyperCard Tools bundle test.

### What should be done in the future
- Add a direct HyperCard Tools runtime bundle test.
- Consider a small lint/schema pass for bundle-authored VM files so `packId` omissions are caught before runtime.
- Consider a short repository sweep for other runtime bundles missing `packId`.

### Code review instructions
- Start with the design doc in this ticket, then inspect:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/plugin-runtime/stack-bootstrap.vm.js`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx`
- Validate the reasoning by confirming:
  - the bundle source lacks `packId`,
  - the bootstrap requires `surface.packId`,
  - the host later depends on the resolved surface type id to validate and render trees.

### Technical details
- Browser reproduction endpoint: `http://localhost:5173/`
- Key Playwright observation: the `HyperCard Tools` dialog body rendered `Runtime error: Error: Runtime surface packId is required for surface: home`
- Key runtime call chain:

```text
icon.open.hypercard-tools
  -> hypercardToolsLauncherModule.buildLaunchWindow()
  -> RuntimeSurfaceSessionHost
  -> RuntimeSessionManager.ensureSession()
  -> QuickJSRuntimeService.loadRuntimeBundle()
  -> stack-bootstrap getMeta()
  -> normalizeRuntimeSurfacePackId('home', undefined)
  -> throw
```

## Step 2: Write the Ticket Deliverables and Package Them for Delivery

After the runtime contract was clear, the second step was to turn the investigation into durable ticket artifacts. The user did not ask for a quick bug note; they asked for an intern-ready guide with prose, diagrams, pseudocode, API references, file anchors, and delivery to reMarkable. That meant the deliverable had to be written as onboarding documentation, not just as a short bug summary.

This step also required basic ticket bookkeeping so a future engineer can continue from the docs root without reconstructing context from the terminal transcript. After the docs were written, I validated the ticket with `docmgr doctor` and then uploaded the full bundle to reMarkable, verifying that the remote directory contained the generated PDF.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Convert the findings into a clean design doc and delivery bundle stored under a new ticket.

**Inferred user intent:** Make the investigation durable, teachable, and easy to hand off.

### What I did
- Created ticket `WOS-02-HYPERCARD-TOOLS-MOUNTING`.
- Created a primary design doc and a diary document under that ticket.
- Updated `index.md`, `tasks.md`, and `changelog.md` so the ticket reflects current progress and outstanding implementation work.
- Related the ticket content back to the runtime, launcher, and bundle files in the design doc references.
- Prepared the ticket bundle for `docmgr doctor` and reMarkable upload.

### Why
- A design doc without task state and changelog context becomes stale quickly.
- The user asked for the result to be stored in the ticket and uploaded, so the docs had to be arranged as a coherent ticket workspace, not as ad hoc notes.

### What worked
- The docmgr workspace structure was sufficient once the vocabulary parse error was repaired.
- The resulting design doc cleanly separates:
  - system primer,
  - failure path,
  - root cause,
  - implementation plan,
  - testing plan,
  - alternatives.
- `docmgr doctor --ticket WOS-02-HYPERCARD-TOOLS-MOUNTING --stale-after 30` passed cleanly.
- `remarquee upload bundle` succeeded and `remarquee cloud ls /ai/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING --long --non-interactive` showed the uploaded bundle.

### What didn't work
- N/A beyond the tooling issues already captured in Step 1.

### What I learned
- The design doc is much clearer when it explicitly teaches the difference between `packageIds` and `packId` before discussing the failure.
- The bug explanation becomes easier for a new engineer once the flow is organized as launcher layer -> session layer -> QuickJS layer -> render layer.

### What was tricky to build
- The hardest writing problem was balancing architecture orientation with precise fix guidance. Too much local detail makes the guide unreadable for a new intern; too little detail makes the implementation steps untrustworthy.
- The best compromise was to define terms early, then tie every major claim to a concrete file anchor.

### What warrants a second pair of eyes
- The final implementation recommendations should be reviewed by whoever owns the HyperCard bundle authoring conventions, because the helper-vs-explicit-field choice is mostly a maintainability decision.

### What should be done in the future
- Once the code fix is merged, update this ticket changelog and mark the remaining fix/test tasks complete.

### Code review instructions
- Read the main design doc first.
- Confirm the task list accurately separates completed documentation work from pending implementation work.
- If implementing immediately, start in `pluginBundle.vm.js`, then `pluginBundle.authoring.d.ts`, then add the direct regression test.

### Technical details
- Ticket path:

```text
/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING--fix-hypercard-tools-runtime-surface-mounting-packid-regression
```

- Primary docs:

```text
design-doc/01-intern-guide-to-hypercard-tools-runtime-surface-mounting-packid-validation-and-the-home-surface-failure.md
reference/01-investigation-diary.md
```

- Validation and delivery commands:

```bash
docmgr doctor --ticket WOS-02-HYPERCARD-TOOLS-MOUNTING --stale-after 30
remarquee upload bundle /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING--fix-hypercard-tools-runtime-surface-mounting-packid-regression/index.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING--fix-hypercard-tools-runtime-surface-mounting-packid-regression/design-doc/01-intern-guide-to-hypercard-tools-runtime-surface-mounting-packid-validation-and-the-home-surface-failure.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING--fix-hypercard-tools-runtime-surface-mounting-packid-regression/reference/01-investigation-diary.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING--fix-hypercard-tools-runtime-surface-mounting-packid-regression/tasks.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING--fix-hypercard-tools-runtime-surface-mounting-packid-regression/changelog.md --name "WOS-02 HyperCard Tools packId Mounting Guide" --remote-dir "/ai/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING" --toc-depth 2
remarquee cloud ls /ai/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING --long --non-interactive
```

## Quick Reference

### Root cause in one sentence

The HyperCard Tools QuickJS bundle declares runtime surfaces without `packId`, but the runtime bootstrap now requires `surface.packId` for every surface so it can compute `surfaceTypes` and later validate/render the returned tree.

### Smallest correct code fix

```js
const UI_CARD_PACK_ID = 'ui.card.v1';

surfaces: {
  home: {
    packId: UI_CARD_PACK_ID,
    render({ state }) { ... },
    handlers: { ... },
  },
}
```

### Best regression test shape

```ts
registerRuntimePackage(UI_RUNTIME_PACKAGE);
registerRuntimeSurfaceType(UI_CARD_V1_RUNTIME_SURFACE_TYPE);

const bundle = await service.loadRuntimeBundle(
  'hypercardToolsUiDslDemo',
  'hypercard-tools@test',
  ['ui'],
  HYPERCARD_TOOLS_DEMO_PLUGIN_BUNDLE,
);

expect(bundle.surfaceTypes?.home).toBe('ui.card.v1');
```

## Usage Examples

### If you are the engineer implementing the fix

1. Edit `pluginBundle.vm.js`.
2. Edit `pluginBundle.authoring.d.ts`.
3. Add the direct runtime bundle test.
4. Reproduce the desktop click path in the browser.

### If you are reviewing the fix

1. Check that every HyperCard Tools surface now has `packId`.
2. Check that the authoring types require `packId`.
3. Check that the new test loads the real HyperCard Tools bundle, not just a fixture.
4. Check that the browser no longer shows the runtime error window.

## Related

- Design doc: [../design-doc/01-intern-guide-to-hypercard-tools-runtime-surface-mounting-packid-validation-and-the-home-surface-failure.md](../design-doc/01-intern-guide-to-hypercard-tools-runtime-surface-mounting-packid-validation-and-the-home-surface-failure.md)
- Ticket index: [../index.md](../index.md)

## Step 3: Implement the Fix, Add a Direct Regression Test, and Verify the Real Launcher Path

The third step converted the ticket from analysis into an actual code fix. The implementation stayed intentionally narrow: repair the HyperCard Tools bundle contract, tighten the authoring contract, add a direct test against the real bundle, and then verify the original launcher click path in the browser before finalizing the git history.

This was also the point where the repository layout mattered operationally. The changed source files live inside the `workspace-links/go-go-os-frontend` submodule, so there had to be one commit inside that submodule and a second commit in the parent `wesen-os` repo to advance the submodule pointer. The ticket docs themselves live outside those git repos, so they were updated in place but not committed.

### Prompt Context

**User prompt (verbatim):** "Ok, add tasks to the ticket, and the implement one by one ,c ommitting at appropriate intervals, keeping a detailed diary."

**Assistant interpretation:** Complete the remaining implementation work in sequence, keep the ticket state current, and make focused commits instead of one large mixed checkpoint.

**Inferred user intent:** Finish the real bug, not just the research, while preserving a clean handoff trail.

### What I did
- Updated the ticket task list to track the concrete implementation steps.
- Changed `apps/hypercard-tools/src/domain/pluginBundle.vm.js` so every surface is wrapped in a `uiCardSurface(...)` helper that stamps `packId: 'ui.card.v1'`.
- Changed `apps/hypercard-tools/src/domain/pluginBundle.authoring.d.ts` so `PluginCardDef` requires `packId`.
- Added `apps/hypercard-tools/src/domain/pluginBundle.test.ts`, a direct QuickJS regression test for the real HyperCard Tools bundle.
- Ran:

```bash
pnpm -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os exec vitest run workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.test.ts
```

- Reopened `http://localhost:5173/` in Playwright, triggered a `dblclick` on `HyperCard Tools`, and verified the catalog UI rendered.
- Committed the code change inside the submodule:

```text
9be7b78 — fix(hypercard-tools): declare runtime surface pack ids
```

- Committed the parent repo submodule pointer update:

```text
542a205 — chore(submodule): bump go-go-os-frontend for hypercard-tools runtime fix
```

### Why
- The missing `packId` was a bundle contract bug, so the fix belonged in the bundle source rather than in the runtime host.
- The authoring declaration file needed to move with the runtime contract so future edits fail earlier.
- The most reliable regression coverage for this issue is a direct QuickJS bundle load, because that is where the bug originally occurred.

### What worked
- The helper-based `uiCardSurface(...)` change fixed all HyperCard Tools surfaces in one place without repeating the pack id literal on every surface.
- The new direct bundle test passed and confirmed `surfaceTypes.home === 'ui.card.v1'`.
- Browser verification showed the exact user-facing outcome we wanted: the runtime error window disappeared and the catalog UI rendered.
- The split commit strategy worked cleanly once I committed inside the submodule first and then advanced the parent repo pointer.

### What didn't work
- The first version of the new test used a package import:

```ts
import { UI_CARD_V1_RUNTIME_SURFACE_TYPE, UI_RUNTIME_PACKAGE } from '@go-go-golems/os-ui-cards';
```

  and failed in this checkout with:

```text
Error: Cannot find package '@go-go-golems/os-ui-cards' imported from '/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.test.ts'
```

- I fixed that by switching the test to a local workspace-relative import:

```ts
import { UI_CARD_V1_RUNTIME_SURFACE_TYPE, UI_RUNTIME_PACKAGE } from '../../../../packages/os-ui-cards/src/runtimeRegistration';
```

- Attempting to commit the changed files from the top-level repo failed because the paths belong to the `workspace-links/go-go-os-frontend` submodule:

```text
fatal: Pathspec 'workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js' is in submodule 'workspace-links/go-go-os-frontend'
```

  The correct sequence was:
  1. commit inside `workspace-links/go-go-os-frontend`,
  2. then commit the updated submodule pointer in `wesen-os`.

### What I learned
- The direct bundle test is the right regression layer for this bug. It exercises the exact loader contract that failed in production.
- The repository structure matters for execution, not just for explanation. Nested workspace paths do not imply a single git ownership boundary.
- Once `packId` became explicit in the bundle, the browser path recovered without any runtime-host workaround.

### What was tricky to build
- The first test failure looked like an implementation bug but was actually a workspace-resolution issue. The runtime code was fine; the test import path was not portable in this checkout.
- The commit flow was also easy to get wrong because the files appear under the top-level tree but are owned by a submodule repo.

### What warrants a second pair of eyes
- Whether the helper-based form in `pluginBundle.vm.js` is the preferred long-term style, or whether the team wants explicit `packId` fields on each surface literal.
- Whether the new test should switch back to package imports once workspace package resolution is standardized for this repo.

### What should be done in the future
- Add similar direct bundle-load tests for other hand-authored runtime bundles.
- Consider adding a schema/lint pass for VM bundle source so missing `packId` fails before runtime.

### Code review instructions
- Review the submodule commit first:
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.authoring.d.ts`
  - `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.test.ts`
- Then review the parent repo commit and confirm it only updates `workspace-links/go-go-os-frontend` to the new submodule revision.
- Validate with the direct Vitest command and with the launcher browser path.

### Technical details
- Submodule commit hash:

```text
9be7b7800e4ec52a07eee49da70bae76f5242e49
```

- Parent repo commit hash:

```text
542a205f0087ecb49ef7e934f02b46db796a4e98
```

- Final browser observation:

```text
HyperCard Tools window body renders "HyperCard Tools - UI DSL Demo Catalog"
instead of "Runtime surface packId is required for surface: home".
```

<!-- Link to related documents or resources -->
