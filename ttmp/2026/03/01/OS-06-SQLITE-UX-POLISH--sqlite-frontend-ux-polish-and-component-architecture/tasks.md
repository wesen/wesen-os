# Tasks

## Phase 1: Token Extraction and Component Split
- [x] Create `sqlite-ui/sqlite-workspace.css` with HyperCard-aligned data-part styles (replaced tokens.ts approach)
- [x] Create `sqlite-ui/types.ts` with shared type definitions (replaced primitives.ts approach)
- [x] Extract `WorkspaceHeader` component + story
- [x] Extract `WorkspaceLayout` component
- [x] Extract `QueryEditorPanel` component + story
- [x] Extract `ExecutionStatusPanel` component + story
- [x] Extract `ResultsPanel` component + story
- [x] Extract `QueryHistoryPanel` component + story
- [x] Extract `SavedQueriesPanel` component + story
- [x] Extract `IntentDebugPanel` component (collapsible) + story
- [x] Reduce `SqliteWorkspaceWindow.tsx` to orchestrator
- [x] Set up Storybook with HyperCardTheme wrapper
- [x] Create full workspace showcase story
- [x] Validate tests pass after extraction (9/9 passed)

## Phase 2: Interaction Polish
- [x] Add Ctrl+Enter keyboard shortcut for query execution
- [x] Add Escape shortcut to cancel execution
- [x] Apply explicit disabled button styling (via HyperCard btn :disabled CSS)
- [x] Add loading indicator (pulsing dot) during execution (via CSS animation on header status)
- [x] Move "Execute via Intent Bridge" into collapsible debug section
- [x] Add parameter mode helper text and placeholder examples
- [x] Add error category guidance text in status panel
- [x] Replace empty states with structured guidance messages
- [x] Add inline confirmation dialog for saved query delete

## Phase 3: Results Table and Data Legibility
- [x] Add sticky table header (via CSS position: sticky)
- [x] Add alternating row stripe backgrounds (via HyperCard table-row CSS)
- [x] Add row number column
- [x] Differentiate NULL rendering (italic, muted color, lowercase)
- [x] Show column type as inline badge
- [x] Make truncation warning actionable with guidance text
- [x] Render history timestamps (relative time + full ISO on hover)
- [x] Show error_summary on failed history entries

## Phase 4: HyperCard Alignment
- [x] Update pluginBundle.vm.js button labels to match workspace ("Execute Query", "Run Seed Pipeline")
- [x] Align query card status text with workspace conventions ("Idle", "Executing query...", "Queued: N")
- [x] Align results card empty state with workspace ("No results yet. Execute a query to see results here.")
- [x] Align seed card terminology with workspace ("Idle", "Executing seed...", "Queued: N")

## Done
- [x] Codebase exploration and UX audit
- [x] Design document written
- [x] Phase 1 committed (446613b)
- [x] Phase 2-3 improvements incorporated during Phase 1 extraction
- [x] Phase 4 HyperCard alignment completed
