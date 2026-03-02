---
Title: ""
Ticket: ""
Status: ""
Topics: []
DocType: ""
Intent: ""
Owners: []
RelatedFiles:
    - Path: ../../../../../../../go-go-app-sqlite/apps/sqlite/src/components/SqliteWorkspaceWindow.tsx
      Note: Primary refactor target - monolithic 500+ line component
    - Path: ../../../../../../../go-go-app-sqlite/apps/sqlite/src/domain/hypercard/runtimeState.ts
      Note: Redux state slice - read-only reference for status/queue terminology
    - Path: ../../../../../../../go-go-app-sqlite/apps/sqlite/src/domain/pluginBundle.vm.js
      Note: HyperCard card UI definitions - Phase 4 terminology changes
    - Path: ../../../../../../../go-go-app-sqlite/apps/sqlite/src/launcher/module.tsx
      Note: Launcher module - read-only reference for window/menu wiring
    - Path: ../../../../../../../go-go-app-sqlite/pkg/doc/topics/02-sqliteapp-ux-polish-playbook.md
      Note: Original UX polish playbook - directional context
ExternalSources: []
Summary: ""
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---






# SQLite Frontend UX Polish Implementation Design

## Executive Summary

The SQLite workspace frontend (`SqliteWorkspaceWindow.tsx`, ~500 lines) is a functional but monolithic React component that handles query editing, execution, result display, history browsing, saved query management, and HyperCard intent debugging in a single file with entirely inline styles. This design document specifies a concrete implementation plan to restructure the frontend into extracted subcomponents backed by a shared design token system, improve interaction clarity and feedback, enhance data table legibility, and align HyperCard card UX with workspace conventions.

The work is scoped strictly to frontend presentation and component architecture. No backend HTTP contracts, API routes, Redux action types, or HyperCard runtime queue semantics change.

## Problem Statement

The current `SqliteWorkspaceWindow` is a single-file implementation that combines state orchestration, data fetching, event handling, and rendering for six distinct UI regions. This creates several concrete problems:

1. **Maintenance friction**: Every visual change requires navigating a ~500-line file to find the right inline style block among dozens of nearly identical `CSSProperties` objects.

2. **Style inconsistency**: Colors, spacing, border radii, and typography are hardcoded as string literals scattered across the component. The same blue (`#1f365d`) appears in 3 places, the same border color (`#d6dce8`) in 8 places, and the same font stack in 4 places with no shared constant.

3. **User confusion on execution paths**: Two buttons ("Execute Query" and "Execute via Intent Bridge") are presented side-by-side with no explanation of when to use which. The intent bridge is a developer debugging feature that should be visually subordinated.

4. **Weak feedback states**: Loading is indicated only by text ("Executing query...") with no visual weight. Disabled states on buttons during execution have no visible style change beyond the browser default. Cancel has a destructive style but is only enabled during execution with no transition.

5. **Results table limitations**: No sticky header on scroll, no row striping, no column type indicators beyond tiny text, no sort affordance, and NULL values display as the string "NULL" without differentiation from actual string data.

6. **Empty states lack guidance**: "No history entries yet." and "No saved queries yet." provide no call-to-action. Users cannot tell if the system is broken or simply unused.

7. **HyperCard dialect mismatch**: The workspace says "Execute Query" and shows "Executing query...", while the card VM says "Execute" and shows "Runner idle" / "Running: query". The terms are close but not aligned.

8. **No destructive action confirmation**: Deleting a saved query fires immediately with no confirmation dialog, undo, or even visual hesitation.

## Current-State Architecture

### Component Tree (current)

```
App.tsx
  SqliteWorkspaceWindow (apiBasePrefix)
    [inline] header
    [inline] query editor panel
    [inline] status panel
    [inline] results panel
    [inline] history panel
    [inline] saved queries panel
    [inline] hypercard intent reference panel
```

Source: `go-go-app-sqlite/apps/sqlite/src/components/SqliteWorkspaceWindow.tsx`

### Style Constants (current, all inline)

| Token | Value | Used in |
|---|---|---|
| Panel background | `linear-gradient(140deg, #ffffff 0%, #f5f7fb 100%)` | `panelStyle` (all 7 panels) |
| Panel border | `1px solid #d6dce8` | `panelStyle`, table container, history items, saved query items |
| Panel radius | `12` | `panelStyle` |
| Button border | `1px solid #395078` | `buttonStyle` |
| Button text | `#1f365d` | `buttonStyle` |
| Destructive border | `#7f1d1d` | `destructiveButtonStyle` |
| Success bg | `#f0fdf4` | status panel (inline) |
| Error bg | `#fff1f2` | status panel (inline) |
| Warning bg | `#fff7ed` | truncation warning (inline) |
| Info bg | `#eff6ff` | intent result (inline) |
| Monospace font | `ui-monospace, SFMono-Regular, Menlo, monospace` | textarea (x2), table cells (x1), code elements |
| Body font size | `13` | status text, buttons |
| Small font size | `12` | labels, history items, saved query items |

Source: `SqliteWorkspaceWindow.tsx` lines 93-112 (panelStyle, buttonStyle, destructiveButtonStyle)

### State Variables (current)

The component manages 18 `useState` hooks:

| Group | Variables |
|---|---|
| Editor | `sqlText`, `rowLimitInput`, `parameterMode`, `paramsEditorText` |
| Execution | `queryResponse`, `lastIntentResult`, `uiError`, `isExecuting`, `activeRequestId`, `abortController` |
| History | `historyFilter`, `historyItems`, `historyTotal`, `isHistoryLoading` |
| Saved queries | `savedQueries`, `isSavedLoading`, `selectedSavedQueryId`, `savedQueryName`, `savedQuerySchemaVersion` |

Source: `SqliteWorkspaceWindow.tsx` lines 116-137

### Execution Paths

1. **Direct query** (`executeQuery`): POST to `{apiBase}/query` with abort support. Returns `QueryResponse`. Updates history on success.
2. **Intent bridge** (`executeViaIntentBridge`): Calls `handleSqliteQueryIntent()` which goes through `runSqliteHypercardQueryIntent()` in `intentBridge.ts`, which also POSTs to the same `/query` endpoint but normalizes the response into the intent contract format (`SqliteQueryIntentResult`). The workspace then reverse-maps it back to `QueryResponse`. This path exists for debugging HyperCard intent execution, not for normal user queries.

Source: `SqliteWorkspaceWindow.tsx` lines 168-243; `domain/hypercard/intentBridge.ts`

### HyperCard Card Definitions

Cards are defined in `pluginBundle.vm.js` using a `defineStackBundle` API with `ui.panel`, `ui.text`, `ui.input`, `ui.button`, `ui.badge`, `ui.table`, and `ui.row` primitives.

| Card | Purpose | Key UX elements |
|---|---|---|
| `home` | Navigation hub | 3 buttons: Run Query Card, Results Card, Seed Card |
| `query` | SQL input + execution | Text inputs for SQL, row limit, params JSON. Execute button. Queue/runner badges. |
| `results` | Display last query result | Error badge, table, row count, statement type. |
| `seed` | Run seed profile | Run Seed button, queue badge, step report table. |

Source: `domain/pluginBundle.vm.js`; card metadata in `domain/stack.ts` lines 10-15

## Gap Analysis

### G1: No Design Token System

**Impact**: Every style change requires hunting through inline objects. Adding dark mode or a new theme is infeasible without extracting a token layer first.

**Evidence**: `panelStyle` at line 93, `buttonStyle` at line 100, `destructiveButtonStyle` at line 109, plus 20+ additional inline `style={}` blocks with hardcoded hex colors.

### G2: Monolithic Component

**Impact**: Cognitive load for any change is high. Testing individual panels is impossible without rendering the entire workspace.

**Evidence**: Single component at 500+ lines, 18 state variables, 12 callback functions, 7 distinct UI panels all in one render return.

### G3: Confusing Dual Execution Buttons

**Impact**: Users without backend knowledge cannot distinguish "Execute Query" from "Execute via Intent Bridge". Both do the same thing (run SQL) but through different code paths. The intent bridge is a developer debugging tool that should be visually separated.

**Evidence**: Lines 370-376, two buttons with equal visual weight, no explanatory text.

### G4: Insufficient Loading and Disabled States

**Impact**: Users cannot tell if a long-running query is progressing or stalled. Disabled buttons rely on browser-default disabled styling which is often subtle.

**Evidence**: `isExecuting` state toggles button `disabled` prop (lines 370-377) but no visual style change is applied. Status text at line 349 changes but has low visual weight.

### G5: Results Table Lacks Analysis Affordances

**Impact**: For queries returning more than ~15 rows, the table scrolls off screen with no sticky header. Users lose column context. NULL values look identical to the string "NULL".

**Evidence**: Table at lines 396-426, no `position: sticky` on `thead`, no row striping, `String(row[column.name] ?? 'NULL')` at line 421.

### G6: Empty States Are Dead Ends

**Impact**: New users see "No history entries yet." with no guidance on what to do next. The saved queries empty state is similarly bare.

**Evidence**: Lines 460 and 511.

### G7: No Destructive Action Confirmation

**Impact**: Clicking "Delete Selected" on a saved query immediately sends a DELETE request with no confirmation, no undo, and no visual indication that this is irreversible.

**Evidence**: `deleteSavedQuery` callback (lines 317-341) fires directly on click.

### G8: HyperCard Copy Inconsistency

**Impact**: Users switching between workspace and card windows encounter different terminology for the same operations.

| Concept | Workspace term | Card term |
|---|---|---|
| Run a query | "Execute Query" | "Execute" |
| Idle state | "Idle" | "Runner idle" |
| Running state | "Executing query..." | "Running: query" |
| Cancel | "Cancel Request" | (not available) |

**Evidence**: `SqliteWorkspaceWindow.tsx` line 349 vs. `pluginBundle.vm.js` query card render function.

### G9: History Items Lack Timestamps

**Impact**: Users cannot tell when a historical query was executed. The `created_at` field exists in `QueryHistoryEntry` but is not rendered.

**Evidence**: Interface definition at line 66 includes `created_at`, but the history item button (lines 440-458) does not display it.

### G10: Parameter Mode UX Is Minimal

**Impact**: When switching between parameter modes, the editor resets to `[]` or `{}` with no explanation of expected format. No inline example or placeholder text for named params.

**Evidence**: Lines 359-368, textarea has no placeholder text. Parameter mode select at line 350 resets editor content.

## Proposed Solution

### Architecture: Extracted Component Tree

```
SqliteWorkspaceWindow (orchestrator: state + async handlers)
  <WorkspaceHeader />
  <WorkspaceLayout>
    <QueryEditorPanel />
    <ExecutionStatusPanel />
    <ResultsPanel />
    <QueryHistoryPanel />
    <SavedQueriesPanel />
    <IntentDebugPanel />     (collapsible, developer-oriented)
  </WorkspaceLayout>
```

New file structure:

```
apps/sqlite/src/components/
  SqliteWorkspaceWindow.tsx          (orchestrator, ~120 lines)
  sqlite-ui/
    tokens.ts                        (design tokens)
    primitives.ts                    (shared styled elements)
    WorkspaceHeader.tsx
    WorkspaceLayout.tsx
    QueryEditorPanel.tsx
    ExecutionStatusPanel.tsx
    ResultsPanel.tsx
    QueryHistoryPanel.tsx
    SavedQueriesPanel.tsx
    IntentDebugPanel.tsx
    ConfirmDialog.tsx                (reusable confirmation)
```

### Design Tokens

```typescript
// apps/sqlite/src/components/sqlite-ui/tokens.ts

export const color = {
  // Surfaces
  pageBg: '#f8fbff',
  panelBg: 'linear-gradient(140deg, #ffffff 0%, #f5f7fb 100%)',
  panelBorder: '#d6dce8',
  inputBorder: '#b7c2d6',

  // Text
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#475569',
  textDisabled: '#94a3b8',

  // Semantic
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  successText: '#14532d',
  errorBg: '#fff1f2',
  errorBorder: '#fecaca',
  errorText: '#7f1d1d',
  warningBg: '#fff7ed',
  warningBorder: '#fcd34d',
  warningText: '#92400e',
  infoBg: '#eff6ff',
  infoBorder: '#bfdbfe',
  infoText: '#1e3a8a',

  // Interactive
  buttonText: '#1f365d',
  buttonBorder: '#395078',
  buttonBg: 'linear-gradient(180deg, #f8fafc 0%, #e8eefb 100%)',
  buttonHoverBg: 'linear-gradient(180deg, #e8eefb 0%, #d8e2f6 100%)',
  buttonDisabledBg: '#e2e8f0',
  destructiveBorder: '#7f1d1d',
  destructiveText: '#7f1d1d',
  destructiveBg: 'linear-gradient(180deg, #fff5f5 0%, #ffe5e5 100%)',

  // Selection
  selectedBg: '#e8f0ff',
  selectedBorder: '#1d4ed8',
  hoverBg: '#f1f5f9',

  // Table
  headerBg: '#e9efff',
  rowStripeBg: '#f8fafc',
  nullText: '#94a3b8',
} as const;

export const space = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
} as const;

export const font = {
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: 'system-ui, -apple-system, sans-serif',
  sizeXs: 10,
  sizeSm: 11,
  sizeMd: 12,
  sizeLg: 13,
  sizeXl: 14,
  sizeTitle: 20,
} as const;
```

### Key UI Improvements

#### 1. Query Editor Panel

- Move "Execute via Intent Bridge" into a collapsible "Developer Tools" section at the bottom of the page, visually subordinated with a muted border and smaller text.
- Add placeholder text to the params textarea: `[1, "alice"]` for positional, `{"minimum_id": 1}` for named.
- Add a subtle helper line below parameter mode selector: "Use ? placeholders for positional, :name for named parameters."
- Show a pulsing dot or spinner icon next to "Executing..." status.
- Apply explicit disabled styling (grayed background, muted text) to buttons during execution.

#### 2. Execution Status Panel

- Replace the flat text banner with a structured status card that displays:
  - Statement type badge (SELECT/INSERT/UPDATE/DELETE/CREATE)
  - Row count with label
  - Duration with label
  - Correlation ID in a copyable code block
- For errors, add an "error category" badge (validation/syntax/execution/timeout/permission) with category-specific guidance text:
  - validation: "Check your SQL syntax and parameter format."
  - syntax: "The database could not parse this SQL statement."
  - execution: "The query ran but encountered a runtime error."
  - timeout: "The query exceeded the statement timeout. Try adding a LIMIT clause."
  - permission: "This operation is not allowed on this database."

#### 3. Results Table

- Add sticky `thead` with `position: sticky; top: 0; z-index: 1`.
- Add alternating row backgrounds using the `rowStripeBg` token.
- Differentiate NULL values: render in italic with the `nullText` color token and display "null" (lowercase) instead of "NULL".
- Show column type as a small badge next to the column name (e.g., `INTEGER`, `TEXT`) instead of below it.
- Add a row number column (#) on the left for orientation during scroll.
- Make the truncation warning more actionable: "Results truncated at {limit} rows. Increase the row limit or add a WHERE clause to narrow results."

#### 4. Query History Panel

- Display `created_at` timestamp on each history item, formatted as relative time (e.g., "2 min ago") with full ISO on hover/title.
- Add a visual icon/dot indicator for success (green) vs error (red) status instead of relying on text color alone.
- Show the error summary for failed queries in the history item (it exists in `QueryHistoryEntry.error_summary` but is not rendered).

#### 5. Saved Queries Panel

- Add a confirmation step for delete: show a small inline confirmation ("Delete 'Weekly Sales Snapshot'? [Confirm] [Cancel]") that replaces the delete button temporarily.
- When a saved query is selected, highlight it with a left border accent in addition to the background color change.
- Display the saved query's `updated_at` as relative time.

#### 6. HyperCard Card Alignment

Update `pluginBundle.vm.js` terminology:

| Current | Proposed |
|---|---|
| "Execute" button | "Execute Query" |
| "Runner idle" | "Idle" |
| "Running: query" / "Running: seed" | "Executing query..." / "Running seed..." |
| "Queue: N" | "Queued: N" |
| "Run Seed" | "Run Seed Pipeline" |

#### 7. Empty States

Replace bare text with structured empty states:

- **No results**: "No results yet. Write a SQL query above and click Execute Query to see results here."
- **No history**: "No query history. Executed queries will appear here with their status and timing."
- **No saved queries**: "No saved queries. Execute a query, give it a name, and click Create Saved to bookmark it for later."
- **No seed report**: "No seed runs yet. Click Run Seed Pipeline to populate the database with sample data."

#### 8. Keyboard Shortcuts

- `Ctrl+Enter` / `Cmd+Enter` in the SQL textarea: execute query.
- `Escape` while executing: cancel request.

No other keyboard shortcuts to keep scope minimal.

## Phased Implementation Plan

### Phase 1: Token Extraction and Component Split (no visual changes)

**Goal**: Refactor the monolith into extracted components with a shared token system, producing identical rendered output.

**Files to create**:
- `apps/sqlite/src/components/sqlite-ui/tokens.ts` - design tokens as above
- `apps/sqlite/src/components/sqlite-ui/primitives.ts` - shared `panelStyle()`, `buttonStyle()`, `inputStyle()` functions that consume tokens
- `apps/sqlite/src/components/sqlite-ui/WorkspaceHeader.tsx` - header extraction
- `apps/sqlite/src/components/sqlite-ui/WorkspaceLayout.tsx` - two-column grid layout
- `apps/sqlite/src/components/sqlite-ui/QueryEditorPanel.tsx` - editor panel
- `apps/sqlite/src/components/sqlite-ui/ExecutionStatusPanel.tsx` - status/error display
- `apps/sqlite/src/components/sqlite-ui/ResultsPanel.tsx` - results table
- `apps/sqlite/src/components/sqlite-ui/QueryHistoryPanel.tsx` - history list
- `apps/sqlite/src/components/sqlite-ui/SavedQueriesPanel.tsx` - saved query CRUD
- `apps/sqlite/src/components/sqlite-ui/IntentDebugPanel.tsx` - intent bridge + example (collapsible)

**Files to modify**:
- `apps/sqlite/src/components/SqliteWorkspaceWindow.tsx` - reduce to orchestrator that imports and composes subcomponents

**Validation**: Visual diff should show zero pixel changes. Run existing tests:
```bash
pnpm dlx vitest run --config apps/sqlite/vitest.config.ts
```

### Phase 2: Interaction Polish

**Goal**: Improve feedback, copy, and affordances.

**Changes in order**:

1. **Keyboard shortcuts**: Add `Ctrl+Enter` handler on SQL textarea, `Escape` handler on document during execution.
2. **Button disabled styling**: Apply `buttonDisabledBg` and `textDisabled` tokens when `disabled` is true.
3. **Loading indicator**: Add a CSS animation keyframe for a pulsing dot next to "Executing query..." text.
4. **Execute via Intent Bridge**: Move into `IntentDebugPanel` (collapsible, default collapsed).
5. **Parameter helper text**: Add placeholder and hint text to parameter mode editor.
6. **Error category guidance**: Add helper text per error category in `ExecutionStatusPanel`.
7. **Empty states**: Replace bare text with structured empty state messages.
8. **Destructive confirmation**: Add inline confirmation for saved query delete.

**Files affected**: All `sqlite-ui/*.tsx` components from Phase 1.

### Phase 3: Results Table and Data Legibility

**Goal**: Make the core data display surface scannable and trustworthy.

**Changes**:

1. **Sticky header**: Add `position: sticky; top: 0` to `thead tr`.
2. **Row striping**: Apply `rowStripeBg` to even rows.
3. **Row numbers**: Add `#` column with auto-incrementing row index.
4. **NULL rendering**: Render null/undefined as italic "null" in `nullText` color.
5. **Column type badges**: Display database type as inline badge next to column name.
6. **Truncation warning**: Make actionable with specific guidance text.
7. **History timestamps**: Render `created_at` as relative time with full ISO on hover.
8. **History error summary**: Show `error_summary` on failed history entries.

**Files affected**: `ResultsPanel.tsx`, `QueryHistoryPanel.tsx`.

### Phase 4: HyperCard Alignment

**Goal**: Align card terminology with workspace.

**Changes**:

1. Update `pluginBundle.vm.js` button labels and status text per the mapping table above.
2. Review `query` card render function for consistency with `QueryEditorPanel` labels.
3. Review `results` card render function for consistency with `ResultsPanel` empty state text.
4. Review `seed` card render function for consistency with workspace status conventions.

**Files affected**: `domain/pluginBundle.vm.js`.

**Constraint**: Card primitives (`ui.text`, `ui.button`, etc.) are limited compared to full React. Apply only terminology changes; do not attempt to replicate workspace visual polish in the card VM.

## Testing and Validation Strategy

### Automated

Run existing tests after each phase:
```bash
cd go-go-app-sqlite
pnpm dlx vitest run --config apps/sqlite/vitest.config.ts \
  apps/sqlite/src/domain/hypercard/runtimeState.test.ts \
  apps/sqlite/src/launcher/module.test.tsx
```

### Manual Checklist (per phase)

1. Launch SQLite from desktop launcher icon.
2. Execute `SELECT id, name FROM people ORDER BY id LIMIT 20` - verify results render.
3. Execute malformed SQL (`SELECT * FORM people`) - verify error display with category.
4. Execute with row limit of 2 - verify truncation warning.
5. Switch to positional params, enter `[1]` with `SELECT * FROM people WHERE id = ?`.
6. Switch to named params, enter `{"min": 1}` with `SELECT * FROM people WHERE id >= :min`.
7. Enter invalid JSON params - verify validation error.
8. Click Cancel during execution (use a slow query or inspect network).
9. Check history panel shows entries with timestamps.
10. Create, update, and delete a saved query (verify confirmation on delete).
11. Restore a query from history and re-execute.
12. Open SQLite HyperCard home card from menu.
13. Navigate to query card, execute, check results card.
14. Navigate to seed card, run seed, verify report.
15. Verify terminology matches between workspace and cards.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Component extraction introduces render regressions | Medium | Medium | Phase 1 targets zero visual change; diff screenshots before/after |
| Inline style approach limits CSS capabilities (sticky, hover, keyframes) | Medium | Low | Use a minimal `<style>` tag or CSS module for the few properties that require pseudo-elements or keyframes |
| HyperCard card primitives cannot express all desired UX improvements | Low | Low | Phase 4 scope is limited to terminology; no visual parity attempted |
| Token system adds indirection for a small app | Low | Low | Tokens are a flat object, not a runtime theme engine; overhead is ~1 import per file |

## Alternatives Considered

1. **CSS Modules or Tailwind**: Would provide better hover/focus/animation support but introduces build toolchain changes. The current app uses zero CSS files; adding a CSS pipeline is out of scope.

2. **shadcn/ui or Radix**: Component libraries would give polished primitives but add significant dependency weight and require adapting to the wesen-os launcher rendering model. Not justified for a single app.

3. **Keep monolithic component, just improve styles**: Lower effort but leaves the maintenance and testing problems unsolved. Rejected because the component is already at the limit of single-file manageability.

## Open Questions

1. Should the "Execute via Intent Bridge" button be removed entirely from the workspace, or kept as a developer debug feature? Current recommendation: keep but move to collapsible debug section.

2. Should saved queries support folders/tags for organization? Current recommendation: out of scope; revisit if saved query count exceeds ~20 in practice.

3. Should the results table support column sorting? Current recommendation: out of scope for this ticket; the backend does not support server-side sort and client-side sort on large result sets could be slow.

## Key File References

| File | Role |
|---|---|
| `go-go-app-sqlite/apps/sqlite/src/components/SqliteWorkspaceWindow.tsx` | Current monolithic workspace component (primary refactor target) |
| `go-go-app-sqlite/apps/sqlite/src/components/SqliteHypercardIntentRunner.tsx` | HyperCard job runner (read-only for this ticket) |
| `go-go-app-sqlite/apps/sqlite/src/domain/pluginBundle.vm.js` | Card UI definitions (Phase 4 terminology changes) |
| `go-go-app-sqlite/apps/sqlite/src/domain/stack.ts` | Card stack definition (read-only) |
| `go-go-app-sqlite/apps/sqlite/src/domain/hypercard/runtimeState.ts` | Redux state for HyperCard queue (read-only) |
| `go-go-app-sqlite/apps/sqlite/src/domain/hypercard/intentContract.ts` | Intent type definitions (read-only) |
| `go-go-app-sqlite/apps/sqlite/src/domain/hypercard/intentBridge.ts` | Intent API bridge (read-only) |
| `go-go-app-sqlite/apps/sqlite/src/domain/hypercard/runtimeHandlers.ts` | Intent handler wiring (read-only) |
| `go-go-app-sqlite/apps/sqlite/src/launcher/module.tsx` | Launcher module registration (read-only) |
| `go-go-app-sqlite/apps/sqlite/src/launcher/renderSqliteApp.tsx` | Window routing (read-only) |
| `go-go-app-sqlite/apps/sqlite/src/App.tsx` | Standalone dev entry point (read-only) |
