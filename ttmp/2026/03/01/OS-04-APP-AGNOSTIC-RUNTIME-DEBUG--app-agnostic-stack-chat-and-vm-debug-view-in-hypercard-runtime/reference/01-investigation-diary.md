---
Title: Investigation diary
Ticket: OS-04-APP-AGNOSTIC-RUNTIME-DEBUG
Status: active
Topics:
    - backend
    - frontend
    - documentation
    - reflection
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: |-
        Primary evidence for inventory-specific debug wiring and command/instance conventions.
        Primary file inspected for inventory command/menu/window debug glue
    - Path: ../../../../../../../go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx
      Note: Inspected as existing app-agnostic tooling app pattern
    - Path: ../../../../../../../go-go-os-frontend/packages/chat-runtime/src/chat/debug/EventViewerWindow.tsx
      Note: |-
        Reusable chat event viewer component and behavior contract.
        Inspected for reusable chat debug behavior
    - Path: ../../../../../../../go-go-os-frontend/packages/chat-runtime/src/chat/debug/TimelineDebugWindow.tsx
      Note: |-
        Reusable chat timeline debug component.
        Inspected for reusable timeline debug behavior
    - Path: ../../../../../../../go-go-os-frontend/packages/hypercard-runtime/src/features/pluginCardRuntime/pluginCardRuntimeSlice.ts
      Note: |-
        VM/runtime intent timeline and pending queue contracts for proposed VM panel.
        Inspected for VM timeline and pending intent contracts
    - Path: ../../../../../../../go-go-os-frontend/packages/hypercard-runtime/src/hypercard/debug/RuntimeCardDebugWindow.tsx
      Note: |-
        Evidence for residual owner app coupling in shared runtime debug component.
        Inspected for ownerAppId hardcode and stack selection behavior
ExternalSources: []
Summary: Chronological diary of the OS-04 planning investigation and deliverable authoring.
LastUpdated: 2026-03-01T19:43:00-05:00
WhatFor: Preserve command history, architectural findings, and handoff context for implementation later.
WhenToUse: Use when implementing OS-04 or reviewing why this design recommendation was chosen.
---


# Diary

## Goal

This diary captures the investigation and documentation work for planning an app-agnostic stack/chat/vm debug surface in `hypercard-runtime`, based on current inventory behavior.

## Step 1: Map current debug architecture and coupling boundaries

I started by reading the newly created OS-04 ticket workspace and then collecting line-anchored evidence from inventory, hypercard-runtime, chat-runtime, desktop shell contracts, and launcher module APIs. The focus was to separate reusable runtime primitives from inventory-only composition glue.

The main result of this step was a concrete architecture map that showed most coupling is in inventory launcher orchestration, not in core debug components themselves.

### Prompt Context

**User prompt (verbatim):** "create a separate ticket and analyze in detail how to create an app independent stack/chat/vm debug view, inspired by the current one, in the app agnostic hypercard-runtime package. Add detailed implementation plan. This is  for later."

**Assistant interpretation:** Create a new ticket-level design deliverable (planning only) that explains how to extract inventory debug UX into a reusable package-level runtime debug suite.

**Inferred user intent:** Prepare a high-confidence implementation blueprint that can be executed later by another engineer/intern without rediscovering architecture details.

**Commit (code):** N/A (documentation-only in this step)

### What I did

- Inspected OS-04 workspace files and confirmed only a stub design doc existed.
- Loaded skill references (`ticket-research-docmgr-remarkable`, `diary`, `docmgr`) to align format and bookkeeping requirements.
- Collected line-number evidence from key files with `nl -ba`, `sed`, and `rg`.
- Verified desktop composition extension points in engine (`DesktopContribution`, `WindowContentAdapter`, runtime menu registration).
- Verified launcher module integration APIs in desktop-os (`LaunchableAppModule`, `LauncherHostContext`, app-key rendering).
- Verified current hypercard-tools launcher pattern and typed runtime-card editor routing for analogy.

### Why

- The requested deliverable must be evidence-backed, not speculative.
- A robust implementation plan requires understanding exactly where inventory-specific logic currently resides and where reusable contracts already exist.

### What worked

- `rg` and `nl -ba` gave fast, precise architecture evidence.
- Existing package boundaries were clear enough to define a phased extraction strategy.
- Prior GEPA tickets provided useful direction for app-agnostic tooling patterns.

### What didn't work

- Initial `docmgr` command failed due root mismatch:

```bash
cd /home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os && \
docmgr doc add --ticket OS-04-APP-AGNOSTIC-RUNTIME-DEBUG --doc-type reference --title "Investigation diary"
```

- Error observed:

```text
Error: failed to find ticket directory: ticket not found: OS-04-APP-AGNOSTIC-RUNTIME-DEBUG
```

### What I learned

- `docmgr` was resolving to a different docs root by default from `.ttmp.yaml` context.
- Passing explicit `--root /home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/ttmp` is required for this workspace.

### What was tricky to build

- The tricky part was distinguishing true package coupling from app-level policy.
- Symptoms: many `inventory.*` strings appear near reusable components, making boundaries look blurrier than they are.
- Resolution approach: classify by layer:
  - shell contracts (engine): generic,
  - debug components (chat-runtime/hypercard-runtime): mostly generic,
  - orchestration (inventory launcher): app-specific.

### What warrants a second pair of eyes

- Whether conversation resolver should remain app-provided vs standardized in chat-runtime.
- Whether to ship a tabbed debug hub immediately or stage it behind per-window shared builders first.

### What should be done in the future

- Implementation ticket should begin by locking behavior with regression tests before moving orchestration code.

### Code review instructions

- Start with the design doc architecture sections and verify each claim against cited files.
- Cross-check inventory command/wiring references in `renderInventoryApp.tsx`.
- Confirm proposed extraction points match launcher APIs (`DesktopContribution`, `renderWindow`).

### Technical details

- Key commands used:

```bash
rg -n "RuntimeCardDebugWindow|EventViewerWindow|TimelineDebugWindow|CHAT_COMMAND_PREFIX|INVENTORY_APP_ID" \
  go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx -S

nl -ba go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx | sed -n '320,1120p'
nl -ba go-go-os-frontend/packages/hypercard-runtime/src/hypercard/debug/RuntimeCardDebugWindow.tsx | sed -n '1,320p'
nl -ba go-go-os-frontend/packages/chat-runtime/src/chat/debug/EventViewerWindow.tsx | sed -n '1,340p'
nl -ba go-go-os-frontend/packages/chat-runtime/src/chat/debug/TimelineDebugWindow.tsx | sed -n '1,360p'
```

## Step 2: Author the design deliverable and ticket bookkeeping artifacts

After gathering evidence, I wrote the full planning document with architecture analysis, API sketches, pseudocode, diagrams, risks, and phased implementation guidance for later execution. I also updated ticket metadata files (`index`, `tasks`, `changelog`) to reflect analysis completion and deferred implementation.

This step converts raw exploration into an intern-usable implementation guide.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Finalize a detailed design/implementation guide in the separate ticket and keep diary traceability.

**Inferred user intent:** Have a ready-to-execute blueprint now, with actual coding deferred to a later ticket execution phase.

**Commit (code):** N/A (documentation-only step)

### What I did

- Replaced the design doc stub with a detailed implementation blueprint.
- Added architecture diagrams and pseudocode integration snippets.
- Added proposed API contracts for debug suite factory/render helpers.
- Added phased plan from decoupling through migration and validation.
- Updated ticket files:
  - `index.md`
  - `tasks.md`
  - `changelog.md`
- Created this diary and documented the root mismatch pitfall and workaround.

### Why

- The request explicitly asked for detailed analysis and implementation planning for later work.
- A future implementer needs both conceptual rationale and concrete file-level steps.

### What worked

- Existing inventory behavior gave a strong reference baseline.
- Existing runtime state contracts already support a future VM debug pane.
- Desktop contribution contracts are sufficient for reusable factory-based integration.

### What didn't work

- No additional blockers beyond the `docmgr --root` issue in Step 1.

### What I learned

- The largest blocker to portability is orchestration duplication, not component quality.
- A shared factory + render helper design is the minimal viable extraction pattern.

### What was tricky to build

- Balancing two goals:
  - preserve exact existing behavior for inventory,
  - avoid carrying inventory naming conventions into the shared API.
- I resolved this by making app-specific naming/config explicit in `RuntimeDebugSuiteOptions`.

### What warrants a second pair of eyes

- Proposed instance id codec shape (`debug~...`) and backward compatibility impact.
- Proposed command prefix defaults vs preserving existing inventory command ids.

### What should be done in the future

- Implement phases incrementally with tests at each extraction step.

### Code review instructions

- Read design doc sections in this order:
  1. Current-State Architecture
  2. Gap Analysis
  3. Proposed Architecture
  4. API Reference
  5. Detailed Implementation Plan
- Verify that every planned migration step has a corresponding source file target.

### Technical details

- Files written/updated in this step:

```text
/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/ttmp/2026/03/01/OS-04-APP-AGNOSTIC-RUNTIME-DEBUG--app-agnostic-stack-chat-and-vm-debug-view-in-hypercard-runtime/design-doc/01-design-and-implementation-plan-for-app-agnostic-runtime-debug-surfaces.md
/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/ttmp/2026/03/01/OS-04-APP-AGNOSTIC-RUNTIME-DEBUG--app-agnostic-stack-chat-and-vm-debug-view-in-hypercard-runtime/index.md
/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/ttmp/2026/03/01/OS-04-APP-AGNOSTIC-RUNTIME-DEBUG--app-agnostic-stack-chat-and-vm-debug-view-in-hypercard-runtime/tasks.md
/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/ttmp/2026/03/01/OS-04-APP-AGNOSTIC-RUNTIME-DEBUG--app-agnostic-stack-chat-and-vm-debug-view-in-hypercard-runtime/changelog.md
/home/manuel/workspaces/2026-03-01/sqlite-app/wesen-os/ttmp/2026/03/01/OS-04-APP-AGNOSTIC-RUNTIME-DEBUG--app-agnostic-stack-chat-and-vm-debug-view-in-hypercard-runtime/reference/01-investigation-diary.md
```

