---
Title: Investigation diary
Ticket: APP-02-WORKSPACE-COMPOSITION-REORG
Status: active
Topics:
    - wesen-os
    - frontend
    - architecture
    - tooling
    - pnpm-workspace
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/scripts/output/launcher-coupling-scan-20260305-150221.log
      Note: Successful launcher coupling scan captured for the ticket
    - Path: openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/scripts/output/workspace-topology-scan-20260305-150221.log
      Note: Successful topology scan captured for the ticket
    - Path: openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/scripts/run_launcher_coupling_scan.sh
      Note: Ticket-local launcher coupling scan used during investigation
    - Path: openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/scripts/run_workspace_topology_scan.sh
      Note: Ticket-local workspace topology scan used during investigation
    - Path: wesen-os/docs/startup-playbook.md
      Note: Operational symptoms and documented split-repo expectations
    - Path: wesen-os/scripts/setup-workspace.sh
      Note: Current setup automation showing repo cloning and install assumptions
ExternalSources: []
Summary: Chronological research diary covering ticket setup, evidence gathering, failure analysis, design decisions, and delivery steps for the clean workspace composition plan.
LastUpdated: 2026-03-05T15:00:00-05:00
WhatFor: Preserve the exact implementation and research trail so another engineer can continue or review the work.
WhenToUse: When reviewing how the APP-02 workspace reorganization design was derived or when repeating the research flow on a future workspace ticket.
---


# Diary

## Goal

This diary captures how the APP-02 workspace-composition design package was assembled: the ticket setup, the repository scans, the concrete failure chain that motivated the redesign, the experiments stored under `scripts/`, and the final documentation and delivery workflow.

## Step 1: Create The Ticket And Snapshot The Workspace

The first step was to create a new ticket dedicated to the workspace-organization question and make sure the resulting deliverable would live in the active `docmgr` root for this workspace. The active root turned out to be `openai-app-server/ttmp`, not `wesen-os/ttmp`, so the ticket was created there to keep the documentation consistent with the current repository configuration.

After the ticket existed, I added two ticket-local research scripts under `scripts/` so the analysis would be reproducible. These scripts snapshot the current multi-repo layout and the launcher coupling points instead of relying on unstructured terminal memory.

### Prompt Context

**User prompt (verbatim):** "do the cleanest one. Create a new ticket, do an extensive planning document, upload to remarkable. Keep a diary.

Create a detailed analysis / design / implementation guide that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a new `docmgr` ticket focused on the cleanest reorganization of the split-repo workspace, write a long-form architecture and migration plan for new engineers, keep a detailed diary, and upload the final bundle to reMarkable.

**Inferred user intent:** Replace the current ad hoc understanding of how `wesen-os` composes sibling repos with a durable, intern-friendly architecture reference and a concrete migration plan.

**Commit (code):** N/A (not committed in this turn)

### What I did

- Ran `docmgr status --summary-only` to confirm the active docs root.
- Created ticket `APP-02-WORKSPACE-COMPOSITION-REORG`.
- Added a primary design doc and a diary doc.
- Added:
  - `scripts/run_workspace_topology_scan.sh`
  - `scripts/run_launcher_coupling_scan.sh`

### Why

- The docs root mattered because this workspace contains multiple nested repos with separate `ttmp/` directories.
- The research scripts were necessary because the task asked for in-depth research with experiments stored in the ticket.

### What worked

- `docmgr ticket create-ticket` created the expected ticket structure under `openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os`.
- `docmgr doc add` created the design doc and diary documents with correct frontmatter and ticket association.

### What didn't work

- The first version of the research scripts calculated the repository root incorrectly.
- Exact failure output from the first run:

```text
sed: can't read /home/manuel/workspaces/2026-03-02/go.work: No such file or directory
```

- Exact failure output from the coupling scan:

```text
rg: /home/manuel/workspaces/2026-03-02/wesen-os/apps/os-launcher: No such file or directory (os error 2)
rg: /home/manuel/workspaces/2026-03-02/wesen-os/scripts: No such file or directory (os error 2)
rg: /home/manuel/workspaces/2026-03-02/wesen-os/docs: No such file or directory (os error 2)
rg: /home/manuel/workspaces/2026-03-02/wesen-os/go.mod: No such file or directory (os error 2)
```

### What I learned

- Ticket-local scripts are useful only if they compute paths relative to the real workspace root, not just the ticket root.
- The active documentation root for this workspace is not necessarily the repo whose code is being analyzed most heavily.

### What was tricky to build

- The ticket lives inside `openai-app-server/ttmp/...`, while the code under study spans sibling repos like `wesen-os` and `go-go-os-frontend`.
- That means relative path math inside ticket scripts is easy to get wrong by one directory level.
- I corrected the scripts to compute `REPO_ROOT` from `scripts/../../../../../../../` and reran them successfully.

### What warrants a second pair of eyes

- The ticket location inside `openai-app-server/ttmp` is correct for `docmgr`, but another engineer may prefer a future workspace-specific docs root if this kind of cross-repo architecture work becomes common.

### What should be done in the future

- Add a tiny shared helper or template for ticket-local scripts that need to locate the surrounding multi-repo workspace root.

### Code review instructions

- Start with:
  - `openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/scripts/run_workspace_topology_scan.sh`
  - `openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/scripts/run_launcher_coupling_scan.sh`
- Validate by running both scripts and confirming they emit paths under `scripts/output/`.

### Technical details

- Commands run:

```bash
docmgr status --summary-only
docmgr ticket create-ticket --ticket APP-02-WORKSPACE-COMPOSITION-REORG --title "Reorganize Split-Repo Workspace Composition for Wesen-OS" --topics wesen-os,frontend,architecture,tooling,pnpm-workspace
docmgr doc add --ticket APP-02-WORKSPACE-COMPOSITION-REORG --doc-type design-doc --title "Clean Workspace Composition Architecture, Migration Plan, and Intern Guide"
docmgr doc add --ticket APP-02-WORKSPACE-COMPOSITION-REORG --doc-type reference --title "Investigation diary"
```

## Step 2: Trace The Actual Coupling And Failure Chain

The next step was to move from general suspicion to file-backed evidence. I inspected the launcher’s Vite config, Vitest config, TypeScript paths, startup docs, workspace scripts, app package manifests, backend contracts, and `desktop-os` launcher contracts. The goal was to answer one precise question: is the current pain mostly “bad docs”, or is there a real architecture problem?

The answer was clearly architectural. The frontend host already has good runtime contracts in `desktop-os`, but `wesen-os` bypasses those contracts operationally by importing sibling app source trees and app internals directly.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Build a factual architectural case for a cleaner organization, not just a high-level opinion.

**Inferred user intent:** Understand whether the current split-repo setup is fundamentally misorganized and, if so, where the sharp edges really are.

**Commit (code):** N/A (not committed in this turn)

### What I did

- Inspected:
  - `go.work`
  - `wesen-os/package.json`
  - `wesen-os/pnpm-workspace.yaml`
  - `go-go-os-frontend/package.json`
  - `go-go-os-frontend/pnpm-workspace.yaml`
  - `wesen-os/apps/os-launcher/vite.config.ts`
  - `wesen-os/apps/os-launcher/vitest.config.ts`
  - `wesen-os/apps/os-launcher/tsconfig.json`
  - `wesen-os/apps/os-launcher/src/app/modules.tsx`
  - `wesen-os/apps/os-launcher/src/app/store.ts`
  - `go-go-os-frontend/packages/desktop-os/src/contracts/*`
  - `go-go-os-backend/pkg/backendhost/*`
  - `wesen-os/cmd/wesen-os-launcher/main.go`
- Ran the two ticket-local scan scripts successfully after fixing their path logic.

### Why

- I needed evidence for three distinct claims:
  - backend contracts are already relatively clean;
  - frontend runtime contracts are already relatively clean;
  - the composition layer between them is too path-driven.

### What worked

- The scans confirmed that:
  - `desktop-os` has a clear `LaunchableAppModule` contract,
  - `backendhost` has a clear `AppBackendModule` contract,
  - `wesen-os` duplicates alias maps across Vite, Vitest, and TypeScript,
  - `modules.tsx` and `store.ts` reach into app internals,
  - some app packages already expose `./launcher`,
  - others do not.

### What didn't work

- Earlier in the investigation, before this ticket was created, the launcher failed in a way that was directly relevant to the architecture problem.
- Exact user-observed frontend failure:

```text
Failed to resolve import "react" from "../../../go-go-os-frontend/packages/engine/src/components/shell/windowing/useWindowInteractionController.ts". Does the file exist?
```

- Additional exact failures from the same class:

```text
Failed to resolve import "react/jsx-dev-runtime" from "../../../go-go-os-frontend/packages/engine/src/components/shell/windowing/WindowSurface.tsx". Does the file exist?
Failed to resolve import "react/jsx-dev-runtime" from "../../../go-go-os-frontend/packages/engine/src/components/shell/windowing/WindowResizeHandle.tsx". Does the file exist?
Failed to resolve import "react/jsx-dev-runtime" from "../../../go-go-os-frontend/packages/engine/src/components/shell/windowing/WindowTitleBar.tsx". Does the file exist?
```

- After tightening React resolution to the launcher app’s own install, the next build failure was:

```text
[vite:load-fallback] Could not load /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/public.ts (imported by src/app/modules.tsx): ENOENT: no such file or directory
```

- TypeScript then showed the wider dependency-graph mismatch, including:

```text
src/app/modules.tsx(4,41): error TS2307: Cannot find module '@hypercard/arc-agi-player/launcher' or its corresponding type declarations.
src/app/modules.tsx(8,38): error TS2307: Cannot find module '@hypercard/sqlite/launcher' or its corresponding type declarations.
```

### What I learned

- The launcher’s failures are not random.
- They line up exactly with the places where `wesen-os` assumes:
  - sibling repo presence,
  - sibling source layout,
  - sibling package install layout,
  - static availability of optional apps.

### What was tricky to build

- The system has two layers that look similar but are actually different:
  - runtime contracts,
  - workspace composition contracts.
- The runtime contracts are mostly sound.
- The composition contracts are where the architecture breaks down.
- It would have been easy to conflate the two and conclude that `desktop-os` needed a redesign, but the evidence showed the real problem was how `wesen-os` consumes packages and app modules.

### What warrants a second pair of eyes

- The proposed `LauncherAppIntegration` wrapper should be reviewed by whoever owns `desktop-os` to confirm it fits the long-term package API strategy.

### What should be done in the future

- Add explicit package export conventions for every launcher-capable app.
- Ban host imports from `src/features/**` or `src/launcher/module` outside the owning package.

### Code review instructions

- Start with:
  - `wesen-os/apps/os-launcher/vite.config.ts`
  - `wesen-os/apps/os-launcher/vitest.config.ts`
  - `wesen-os/apps/os-launcher/tsconfig.json`
  - `wesen-os/apps/os-launcher/src/app/modules.tsx`
  - `wesen-os/apps/os-launcher/src/app/store.ts`
- Compare them against:
  - `go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts`
  - `go-go-os-frontend/packages/desktop-os/src/registry/createAppRegistry.ts`
  - `go-go-os-frontend/packages/desktop-os/src/store/createLauncherStore.ts`

### Technical details

- Commands run included:

```bash
rg -n "go-go-os-frontend|go-go-app-arc-agi-3|go-go-app-sqlite|go-go-app-inventory" wesen-os/apps/os-launcher wesen-os/scripts wesen-os/docs wesen-os/go.mod
nl -ba wesen-os/apps/os-launcher/src/app/modules.tsx | sed -n '1,220p'
nl -ba wesen-os/apps/os-launcher/src/app/store.ts | sed -n '1,220p'
nl -ba go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts | sed -n '1,220p'
nl -ba go-go-os-backend/pkg/backendhost/module.go | sed -n '1,220p'
```

## Step 3: Write The Architecture Plan, Bookkeeping, And Delivery Bundle

Once the evidence was clear, I translated it into a long-form design document aimed at a new intern. The document intentionally separates current-state explanation from proposed architecture so that a new engineer can learn the system before being told to change it.

This step also included ticket bookkeeping, doc relations, changelog updates, validation, and reMarkable delivery so the work product would be usable beyond this one terminal session.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Deliver a finished research package, not just notes.

**Inferred user intent:** Make the architectural recommendation durable, reviewable, and accessible on reMarkable.

**Commit (code):** N/A (not committed in this turn)

### What I did

- Wrote:
  - the primary design document,
  - this diary,
  - ticket overview and task list,
  - changelog entries,
  - related-file mappings.
- Ran:
  - `docmgr doctor --ticket APP-02-WORKSPACE-COMPOSITION-REORG --stale-after 30`
  - `remarquee status`
  - `remarquee cloud account --non-interactive`
  - `remarquee upload bundle --dry-run ...`
  - `remarquee upload bundle ...`
  - `remarquee cloud ls ... --long --non-interactive`

### Why

- The deliverable is only useful if it is validated and easy to retrieve later.

### What worked

- The long-form design was structured around evidence, target design, phases, APIs, and risks.
- The ticket-local scripts and logs gave the document an audit trail.
- `docmgr doctor --ticket APP-02-WORKSPACE-COMPOSITION-REORG --stale-after 30` passed cleanly after adding the missing topic vocabulary.
- The reMarkable bundle upload completed successfully and the remote directory listing showed the uploaded document.

### What didn't work

- N/A at the time of writing this section. Any validation or upload failures should be appended here if they occur during final delivery.

### What I learned

- The ecosystem already has most of the right runtime abstractions; the main missing layer is a first-class workspace composition model.

### What was tricky to build

- The hardest part of this step was balancing two documentation goals:
  - onboarding clarity for a new engineer,
  - enough technical specificity for a migration owner to act on the plan.

### What warrants a second pair of eyes

- The proposed rollout order should be reviewed by whoever owns release engineering for `wesen-os`, because introducing a new top-level workspace root affects developer onboarding and CI assumptions.

### What should be done in the future

- Follow the migration phases in order, starting with standardizing `./launcher` exports and reducing host imports from app internals.

### Code review instructions

- Read:
  - the design doc first,
  - this diary second,
  - then the two scan logs in `scripts/output/`.
- Verify that each major recommendation is anchored to at least one concrete file or error in the repository.

### Technical details

- Ticket-local outputs referenced by the final doc:
  - `scripts/output/workspace-topology-scan-20260305-150221.log`
  - `scripts/output/launcher-coupling-scan-20260305-150221.log`
- Validation and delivery commands:

```bash
docmgr doctor --ticket APP-02-WORKSPACE-COMPOSITION-REORG --stale-after 30
remarquee status
remarquee cloud account --non-interactive
remarquee upload bundle --dry-run /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/index.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/design-doc/01-clean-workspace-composition-architecture-migration-plan-and-intern-guide.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/reference/01-investigation-diary.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/tasks.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/changelog.md --name "APP-02 Workspace Composition Reorganization" --remote-dir "/ai/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG" --toc-depth 2
remarquee upload bundle /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/index.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/design-doc/01-clean-workspace-composition-architecture-migration-plan-and-intern-guide.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/reference/01-investigation-diary.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/tasks.md /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/changelog.md --name "APP-02 Workspace Composition Reorganization" --remote-dir "/ai/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG" --toc-depth 2
remarquee cloud ls /ai/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG --long --non-interactive
```

- Delivery result:

```text
OK: uploaded APP-02 Workspace Composition Reorganization.pdf -> /ai/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG
[f]	APP-02 Workspace Composition Reorganization
```
