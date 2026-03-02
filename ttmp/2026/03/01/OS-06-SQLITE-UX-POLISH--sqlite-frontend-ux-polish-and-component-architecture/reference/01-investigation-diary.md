---
Title: Investigation Diary
Ticket: OS-06-SQLITE-UX-POLISH
Status: active
Topics:
    - sqlite
    - ux
    - frontend
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Chronological diary of the SQLite frontend UX polish analysis and design phase."
LastUpdated: 2026-03-01T19:18:55.621212617-05:00
WhatFor: "Track investigation decisions, evidence gathered, and design rationale."
WhenToUse: "Reference during implementation to understand why specific design choices were made."
---

# Investigation Diary

## Goal

Capture the analysis and design process for OS-06-SQLITE-UX-POLISH: restructuring the SQLite frontend workspace into extracted components with improved interaction feedback, data legibility, and HyperCard card alignment.

## Step 1: Codebase Exploration and UX Audit

Explored the entire SQLite frontend codebase to understand the current component architecture, state management patterns, style approach, and HyperCard integration surface before writing any design recommendations.

### Prompt Context

**User prompt (verbatim):** "Read @go-go-app-sqlite/pkg/doc/topics/02-sqliteapp-ux-polish-playbook.md . It's really jsut a vague set of directions. YOu job is to improve the sqlite app frontend view, you have pretty much free reign. Analyze and all that, then make your own implementation design document and add to ticket and upload to remarkable"

**Assistant interpretation:** Read the UX polish playbook as context, then independently analyze the SQLite frontend, create a concrete implementation design document, register it in a docmgr ticket, and upload the bundle to reMarkable.

**Inferred user intent:** Get a thorough, evidence-based design document that can drive actual implementation of UX improvements, not just a restatement of the playbook's suggestions.

### What I did

- Read the UX polish playbook (`02-sqliteapp-ux-polish-playbook.md`) for directional context.
- Read every frontend source file in `apps/sqlite/src/`:
  - `components/SqliteWorkspaceWindow.tsx` (500+ lines, monolithic)
  - `components/SqliteHypercardIntentRunner.tsx` (intent runner with seed support)
  - `components/SqliteUnknownWindow.tsx` (fallback)
  - `launcher/module.tsx` (launcher registration, menus, card adapters)
  - `launcher/renderSqliteApp.tsx` (window routing)
  - `launcher/public.ts` (re-export)
  - `domain/pluginBundle.vm.js` (card UI definitions for home/query/results/seed)
  - `domain/pluginBundle.ts` (raw import wrapper)
  - `domain/stack.ts` (card stack definition)
  - `domain/hypercard/runtimeState.ts` (Redux slice, queue, job lifecycle)
  - `domain/hypercard/intentContract.ts` (intent type definitions)
  - `domain/hypercard/intentBridge.ts` (fetch-based intent execution)
  - `domain/hypercard/runtimeHandlers.ts` (handler wiring)
  - `domain/hypercard/exampleCard.ts` (example action/note)
  - `App.tsx`, `main.tsx` (standalone entry points)

### Why

The playbook is directional ("make it feel faster, clearer, easier to trust") but does not contain line-level evidence or concrete implementation specifications. Without reading every source file, the design document would restate the playbook rather than ground recommendations in actual code structure.

### What worked

- Reading files in parallel (all domain files, all component files simultaneously) made the exploration fast.
- The codebase is well-organized with clear file boundaries between domain logic and presentation, even though the presentation is monolithic.
- Type definitions in `runtimeState.ts` and `intentContract.ts` are thorough, making it easy to understand the data shapes flowing through the UI.

### What didn't work

- N/A (exploration phase, no code changes).

### What I learned

1. **The workspace component manages 18 useState hooks** covering 4 distinct concerns (editor, execution, history, saved queries). This is the primary driver of the monolith problem.
2. **Two execution paths share the same visual weight** but serve different purposes. `executeQuery` is the user-facing path; `executeViaIntentBridge` is a developer debugging tool that round-trips through the intent contract normalization layer and then maps back.
3. **Style constants are duplicated, not shared**: `#d6dce8` appears 8 times, `#1f365d` 3 times, the monospace font stack 4 times, all as inline string literals.
4. **History entries have `created_at` and `error_summary` fields** that are defined in the TypeScript interface but never rendered in the UI.
5. **Card terminology diverges from workspace terminology** in small but noticeable ways ("Execute" vs "Execute Query", "Runner idle" vs "Idle").
6. **No CSS files exist in the project at all** - everything is inline `CSSProperties`. This means pseudo-elements, hover states, and keyframe animations require either a `<style>` injection or a CSS module addition.

### What was tricky to build

N/A (analysis phase).

### What warrants a second pair of eyes

- The decision to keep inline styles (via token functions) rather than introducing CSS modules. The current project has zero CSS files; adding a CSS pipeline could have build implications in the wesen-os launcher dev setup.
- Whether "Execute via Intent Bridge" should be completely removed or just visually subordinated. The design recommends keeping it in a collapsible debug section.

### What should be done in the future

- After Phase 1 (component extraction), validate with a screenshot diff that the rendered output is identical pixel-for-pixel.
- Consider adding Storybook or a minimal visual regression test for the extracted components.

### Code review instructions

- Start with the design document: `design/01-sqlite-frontend-ux-polish-implementation-design.md`
- Key sections to review: Gap Analysis (G1-G10), Proposed Solution architecture, Phased Implementation Plan
- Cross-reference gaps against source files listed in Key File References

### Technical details

**Files analyzed (with line counts)**:

| File | Lines | Role |
|---|---|---|
| SqliteWorkspaceWindow.tsx | ~500 | Primary refactor target |
| SqliteHypercardIntentRunner.tsx | ~160 | Read-only for this ticket |
| pluginBundle.vm.js | ~180 | Phase 4 terminology changes |
| runtimeState.ts | ~250 | Read-only (Redux state) |
| intentContract.ts | ~80 | Read-only (types) |
| intentBridge.ts | ~120 | Read-only (fetch bridge) |
| module.tsx | ~180 | Read-only (launcher wiring) |

**Style constant inventory** (extracted from SqliteWorkspaceWindow.tsx):

- 3 shared `CSSProperties` objects: `panelStyle`, `buttonStyle`, `destructiveButtonStyle`
- 20+ additional inline `style={}` blocks with hardcoded values
- 8 unique hex colors used in borders
- 4 unique background gradients
- 4 instances of the monospace font stack

## Step 2: Component Extraction with HyperCard Design System Alignment

Extracted the monolithic SqliteWorkspaceWindow into 7 panel components aligned with the go-go-os-frontend HyperCard design system, set up Storybook, and incorporated Phases 2-3 improvements during extraction rather than as separate passes.

### Prompt Context

**User prompt (verbatim):** (see Step 1) + "Ok, create all the tasks in the ticket, and then work on it task by task as you go, commit at appropriate times, keep a diary." + "adjust the style right from the get go, to match the macos component system. Add a lot of storybook stories as you go" + "Look at go-go-os-frontend, that's what we could be aligning to"

**Assistant interpretation:** Implement all four phases of the design document, but align with go-go-os-frontend's HyperCard theme system (CSS variables, data-part selectors) instead of creating a standalone token system, and add Storybook stories for each component.

**Inferred user intent:** Get a working, well-tested implementation that visually integrates with the existing wesen-os desktop shell aesthetic, with Storybook as a development and review tool.

**Commit (code):** 446613b — "feat(sqlite): extract workspace into HyperCard-aligned component architecture with Storybook"

### What I did

1. Explored `go-go-os-frontend/packages/engine/src/theme/` to understand the HyperCard design system:
   - `tokens.css`: `--hc-*` CSS custom properties under `[data-widget="hypercard"]`
   - `primitives.css`: `data-part` selectors for buttons, tables, fields, etc.
   - `shell.css`: Window chrome and desktop shell
   - `animations.css`: Shared keyframe animations (`hc-pulse`, `hc-fade-in`)
   - Widget components (`Btn.tsx`, `DataTable.tsx`, etc.): Use `data-part`/`data-state`/`data-variant` attributes

2. Pivoted from the original design document's inline token approach to HyperCard's CSS variable + `data-part` pattern. Deleted the initially created `tokens.ts` file.

3. Set up pnpm workspace and Storybook:
   - Created `pnpm-workspace.yaml` referencing both `apps/*` and `../go-go-os-frontend/packages/*`
   - Installed `@storybook/react-vite` 10.x at the root
   - Created `.storybook/main.ts` with Vite aliases for `@hypercard/*` packages
   - Created `.storybook/preview.ts` with `HyperCardTheme` wrapper decorator

4. Created `sqlite-workspace.css` with `data-part` selectors for workspace-specific UI:
   - `sqlite-workspace`, `sqlite-header`, `sqlite-panel`, `sqlite-layout`
   - `sqlite-status` with `data-state` variants (success/error/idle)
   - `sqlite-results-wrapper` with sticky header
   - `sqlite-history-item`, `sqlite-saved-item` with hover and selection states
   - `sqlite-null-value`, `sqlite-row-number`, `sqlite-truncation-warning`
   - `sqlite-empty-state` with hint text
   - `sqlite-confirm-delete` for inline delete confirmation
   - `sqlite-intent-debug` for collapsible developer section

5. Extracted 7 panel components with stories:
   - `WorkspaceHeader` (3 stories: Idle, Executing, WithRequestId)
   - `QueryEditorPanel` (5 stories: Default, WithPositionalParams, WithNamedParams, Executing, InteractiveEditor)
   - `ExecutionStatusPanel` (5 stories: Idle, Success, ValidationError, SyntaxError, TimeoutError)
   - `ResultsPanel` (6 stories: Empty, WithData, WithNullValues, Truncated, PayloadTruncated, NoRows, InsertResult)
   - `QueryHistoryPanel` (4 stories: WithItems, EmptyHistory, FilteredSuccess, Loading)
   - `SavedQueriesPanel` (3 stories: WithQueries, WithSelected, EmptyList)
   - `IntentDebugPanel` (3 stories: Collapsed, WithSuccessResult, WithErrorResult)

6. Rewrote `SqliteWorkspaceWindow.tsx` as orchestrator (~340 lines of state/handlers, zero rendering logic) that composes all subcomponents.

7. Incorporated Phase 2 and 3 improvements during extraction rather than as separate passes:
   - Ctrl+Enter keyboard shortcut in QueryEditorPanel
   - Escape to cancel in orchestrator (useEffect keydown listener)
   - Error category guidance hints in ExecutionStatusPanel
   - Structured empty states in all panels
   - NULL value differentiation in ResultsPanel
   - Row numbers in ResultsPanel
   - Sticky table headers via CSS
   - History timestamps with relative time
   - History error summaries displayed
   - Delete confirmation in SavedQueriesPanel
   - Intent bridge in collapsible debug section
   - Parameter placeholders and hints in QueryEditorPanel

### Why

The original design document planned 4 sequential phases. However, since the user asked to "adjust the style right from the get go" and align with HyperCard, it was more efficient to incorporate all visual improvements during the extraction pass rather than creating identical copies first and then modifying them.

### What worked

- Using HyperCard's existing `data-part` CSS pattern made the components immediately consistent with the rest of the wesen-os UI.
- The pnpm workspace approach (including `../go-go-os-frontend/packages/*`) resolved the `workspace:*` protocol issue that blocked npm install.
- Storybook started successfully on first try after configuration.
- All 9 existing tests (4 reducer + 5 launcher) passed without modification.

### What didn't work

- Initial attempt to use npm install failed because `workspace:*` protocol in `apps/sqlite/package.json` is pnpm-specific.
- First attempt at tokens.ts created an inline CSSProperties-based token system that didn't align with HyperCard's CSS variable approach. Had to delete and pivot.
- TypeScript caught two issues in new code: `JSX.Element` return type (needed `ReactNode`) and a story missing required `args`.

### What I learned

1. HyperCard's design system uses `[data-widget="hypercard"]` as the scoping root with `data-part`/`data-state`/`data-variant` attribute selectors — no CSS classes anywhere.
2. The pnpm workspace protocol `workspace:*` requires all referenced packages to be discoverable in the pnpm workspace graph. Adding `../go-go-os-frontend/packages/*` to pnpm-workspace.yaml solved this.
3. Storybook 10.x with `@storybook/react-vite` needs the same Vite aliases as the app's vite.config.ts to resolve cross-repo packages.

### What was tricky to build

The cross-repo dependency resolution for Storybook was the main friction point. The SQLite app's `package.json` uses `workspace:*` for `@hypercard/engine`, `@hypercard/desktop-os`, and `@hypercard/hypercard-runtime`, but these packages live in `go-go-os-frontend`, not in `go-go-app-sqlite`. The solution was creating a `pnpm-workspace.yaml` that spans both repos and configuring Storybook's Vite with aliases matching the existing wesen-os launcher setup.

### What warrants a second pair of eyes

- The `sqlite-workspace.css` file creates ~40 new `data-part` selectors in the `sqlite-*` namespace. These should be reviewed for consistency with HyperCard's naming conventions.
- The orchestrator still manages 18 useState hooks. A future improvement could extract these into custom hooks or a useReducer.
- Pre-existing TypeScript errors in `runtimeState.ts` (Redux toolkit `extraReducers` builder type mismatch) are not addressed.

### What should be done in the future

- Add visual regression testing (screenshot comparison) for Storybook stories.
- Consider extracting the 18 useState hooks into a `useSqliteWorkspace` custom hook.
- Fix the pre-existing TypeScript errors in `runtimeState.ts`.

### Code review instructions

- Start with the CSS: `apps/sqlite/src/components/sqlite-ui/sqlite-workspace.css`
- Then review each panel component + its story
- Finally review the orchestrator: `apps/sqlite/src/components/SqliteWorkspaceWindow.tsx`
- Run Storybook: `cd go-go-app-sqlite && pnpm run storybook`
- Run tests: `cd go-go-app-sqlite/apps/sqlite && npx vitest run --config vitest.config.ts`

### Technical details

**New files created (18)**:

| File | Lines | Purpose |
|---|---|---|
| `.storybook/main.ts` | 30 | Storybook config with Vite aliases |
| `.storybook/preview.ts` | 27 | HyperCardTheme wrapper |
| `sqlite-ui/sqlite-workspace.css` | 280 | CSS with data-part selectors |
| `sqlite-ui/types.ts` | 55 | Shared TypeScript interfaces |
| `sqlite-ui/index.ts` | 18 | Barrel export |
| `sqlite-ui/WorkspaceHeader.tsx` | 32 | Header component |
| `sqlite-ui/WorkspaceLayout.tsx` | 10 | Two-column grid |
| `sqlite-ui/QueryEditorPanel.tsx` | 140 | SQL editor + params |
| `sqlite-ui/ExecutionStatusPanel.tsx` | 70 | Status/error display |
| `sqlite-ui/ResultsPanel.tsx` | 100 | Data table with enhancements |
| `sqlite-ui/QueryHistoryPanel.tsx` | 95 | History list with timestamps |
| `sqlite-ui/SavedQueriesPanel.tsx` | 125 | CRUD with delete confirmation |
| `sqlite-ui/IntentDebugPanel.tsx` | 70 | Collapsible debug section |
| `sqlite-ui/*.stories.tsx` (7) | ~120 each | Storybook stories |

**Orchestrator reduction**: SqliteWorkspaceWindow.tsx went from ~500 lines of mixed state+rendering to ~340 lines of pure state management + composition.

## Step 3: HyperCard Card Terminology Alignment

Updated all four HyperCard card definitions in pluginBundle.vm.js to use the same terminology as the workspace panels.

### Prompt Context

**User prompt (verbatim):** (same as Step 2)

**Assistant interpretation:** Complete Phase 4 of the implementation plan.

**Inferred user intent:** Ensure users don't encounter conflicting UX language when switching between workspace and card windows.

**Commit (code):** bc6aa3e — "feat(sqlite): align HyperCard card terminology with workspace and add showcase story"

### What I did

- Updated query card: "Execute" -> "Execute Query", "Queue: N" -> "Queued: N", "Running: query" -> "Executing query...", "Runner idle" -> "Idle"
- Updated results card: "No rows yet. Run a query first." -> "No results yet. Execute a query to see results here."
- Updated seed card: "Run Seed" -> "Run Seed Pipeline", "No seed run completed yet." -> structured guidance, "No seed report yet." -> guidance text
- Created full workspace showcase story (FullWorkspace + ErrorWorkspace) showing all panels composed together

### Why

The design document identified 6 terminology mismatches between workspace and card UI. Aligning them ensures users have a consistent mental model regardless of which UI path they use.

### What worked

- Changes were minimal and well-scoped to text strings in the card render functions.
- All 9 tests still pass after the changes.

### What didn't work

- N/A (straightforward text changes).

### What I learned

- Card primitives (`ui.text`, `ui.button`, `ui.badge`) are intentionally limited compared to full React. Terminology alignment is the main UX lever available for cards.

### What was tricky to build

- N/A (simple string replacements).

### What warrants a second pair of eyes

- The `\u2026` unicode ellipsis in the card badges ("Executing query\u2026") — verify this renders correctly in the card VM runtime.

### What should be done in the future

- N/A for this step.

### Code review instructions

- Review `apps/sqlite/src/domain/pluginBundle.vm.js` for the terminology changes
- Review `apps/sqlite/src/components/sqlite-ui/SqliteWorkspaceShowcase.stories.tsx` for the showcase story

## Related

- [Design Document](../design/01-sqlite-frontend-ux-polish-implementation-design.md)
- [UX Polish Playbook](../../../../../../go-go-app-sqlite/pkg/doc/topics/02-sqliteapp-ux-polish-playbook.md)
