---
title: Investigation Diary
doc-type: reference
status: active
intent: long-term
ticket: os-widgets
date: 2026-04-08
author: pi coding agent
topics:
  - widgets
  - theme
  - styling
  - macos1
  - architecture
  - react
description: >-
  Chronological investigation diary for the widget package architecture
  study. Records commands, findings, decisions, and verification steps.
---

# Investigation Diary

**Ticket:** os-widgets  
**Date:** 2026-04-08  
**Purpose:** Widget Package Architecture Analysis and Extraction Feasibility Study

---

## Investigation Log

### 2026-04-08 10:00 — Ticket Created

Created ticket `os-widgets` with title "Widget Package Architecture Analysis and Extraction Feasibility Study".

```bash
docmgr ticket create-ticket --ticket os-widgets \
  --title "Widget Package Architecture Analysis and Extraction Feasibility Study" \
  --topics widgets,theme,styling,macos1,architecture,react
```

Created design doc and investigation diary.

### 2026-04-08 10:05 — Package Discovery

Started by exploring the workspace structure. Found the monorepo at:

```
/workspace-links/go-go-os-frontend/packages/
├── os-core/           # Core desktop widgets, theming, shell primitives
├── os-widgets/        # Rich widget primitives, launcher modules
├── os-shell/          # App manifests, launch surfaces
├── os-repl/           # Terminal and REPL UI components
├── os-chat/           # Shared chat UI and state primitives
├── os-kanban/         # Kanban runtime modules
├── os-confirm/        # plz-confirm integration components
├── os-ui-cards/        # UI node schema and React renderer
└── os-scripting/      # QuickJS runtime, plugin support
```

Key command:
```bash
ls -la /workspace-links/go-go-os-frontend/packages/
```

### 2026-04-08 10:10 — os-core Architecture Discovery

Explored `os-core` package structure:

```
os-core/src/
├── parts.ts           # PARTS constant (80+ part names)
├── types.ts           # TypeScript types
├── index.ts           # Main barrel export
├── parts.ts           # PARTS constant enum
├── desktop-core.ts     # Desktop core exports
├── desktop-react.ts    # Desktop React exports
├── desktop-theme-macos1.ts  # macos1 theme loader
├── theme/
│   ├── index.ts       # Loads all CSS, exports HyperCardTheme
│   ├── HyperCardTheme.tsx  # Scoping React component
│   ├── classic.css    # Optional theme overlay
│   ├── modern.css     # Optional theme overlay
│   └── desktop/
│       ├── tokens.css      # 250 lines of CSS custom properties
│       ├── primitives.css  # 868 lines of widget CSS
│       ├── shell.css       # 200 lines of window chrome CSS
│       ├── animations.css  # 20 lines of keyframes
│       ├── syntax.css      # 50 lines of syntax highlighting
│       └── theme/
│           └── macos1.css  # 20 lines of macos1 overrides
└── components/
    ├── widgets/       # 50+ base widget components
    └── shell/
        └── windowing/  # Desktop shell (NOT extractable)
```

Key files read:
- `os-core/src/parts.ts` — PARTS constant enum
- `os-core/src/theme/HyperCardTheme.tsx` — Scoping component
- `os-core/src/theme/index.ts` — CSS import aggregation
- `os-core/src/theme/desktop/tokens.css` — All design tokens
- `os-core/src/theme/desktop/primitives.css` — All widget CSS

### 2026-04-08 10:20 — Theming System Analysis

**Finding:** The theming system is a **pure CSS custom property system** with no JavaScript dependencies.

**Key insight:** All 100+ tokens are defined on the `[data-widget="hypercard"]` selector. This means any component inside a `<div data-widget="hypercard">` has access to the entire token system.

**Token categories discovered:**
- Layout tokens (`--hc-width`, `--hc-font-family`, etc.)
- Color tokens (`--hc-color-bg`, `--hc-color-fg`, etc.)
- Button tokens (`--hc-btn-*`)
- Interactive tokens (`--hc-context-menu-*`, `--hc-dropdown-*`, etc.)
- Window chrome tokens (`--hc-window-*`)

**macos1 theme:** A thin 20-line overlay that overrides base tokens for the macOS-1 aesthetic.

**CSS file sizes:**
- `tokens.css`: ~250 lines
- `primitives.css`: ~868 lines
- `shell.css`: ~200 lines
- `macos1.css`: ~20 lines
- **Total: ~1,340 lines of CSS**

### 2026-04-08 10:30 — Base Widget Primitives Analysis

**Finding:** 50+ base widget components in `os-core/src/components/widgets/`, all using the `PARTS` constant for CSS binding.

**Widget inventory:**
- AlertDialog, Btn, Checkbox, Chip, ContextMenu
- DataTable, DetailView, DisclosureTriangle, DropdownMenu
- FieldRow, FilePickerDropzone, FilterBar, FormView
- GridBoard, HaloTarget, ImageChoiceGrid, ListBox, ListView
- MenuGrid, ProgressBar, RadioButton, RatingPicker
- ReportView, RequestActionBar, SchemaFormRenderer
- SelectableDataTable, SelectableList, TabControl
- Toast, ToolPalette

**Key pattern discovered:**
```tsx
// Components use data-part attribute with PARTS constant
<div data-part={PARTS.checkbox} data-state={checked ? 'checked' : undefined}>
  <div data-part={PARTS.checkboxMark}>{checked ? '✕' : ''}</div>
</div>

// CSS matches via attribute selector
[data-part="checkbox"] { /* styles */ }
```

**Benefits of this pattern:**
1. Type safety via TypeScript const assertion
2. Searchability across codebase
3. Refactoring via single constant change
4. CSS encapsulation

### 2026-04-08 10:40 — os-widgets Rich Widgets Analysis

**Finding:** 20+ complex stateful widgets with their own Redux slices.

**Widget categories:**
- LogViewer, ChartView, MacWrite, MacRepl, NodeEditor
- Oscilloscope, LogicAnalyzer, MacCalendar, MacSlides
- GraphNavigator, MacCalc (spreadsheet), DeepResearch
- GameFinder, RetroMusicPlayer, StreamLauncher, SteamLauncher
- YouTubeRetro (with CRT scanline effects!), ChatBrowser
- SystemModeler, ControlRoom (industrial instruments!)
- MermaidEditor, MacBrowser

**Redux slice pattern discovered:**
```typescript
export const LOG_VIEWER_STATE_KEY = 'logViewer';
export const logViewerSlice = createSlice({
  name: LOG_VIEWER_STATE_KEY,
  initialState: createLogViewerStateSeed(),
  reducers: { /* ... */ },
});
export const logViewerActions = logViewerSlice.actions;
export const logViewerReducer = logViewerSlice.reducer;
```

**RICH_PARTS constant:** ~500 part names with prefixed namespaces (st*, yt*, sl*, etc.)

### 2026-04-08 10:50 — Shell System Analysis

**Finding:** The desktop shell system is NOT suitable for extraction — it's a 1221-line state machine managing windows, menus, icons, drag/resize, and context menus.

**Files identified as NOT extractable:**
- `useDesktopShellController.tsx` — 1221 lines
- `WindowLayer.tsx`, `WindowSurface.tsx`, `WindowTitleBar.tsx` — ~600 lines
- `DesktopMenuBar.tsx`, `desktopMenuRuntime.tsx` — ~600 lines
- App registry system in `os-shell/` — ~500 lines

### 2026-04-08 11:00 — Extraction Feasibility Assessment

**Tier 1 (Easily extractable):** ~5,800 lines
- CSS tokens and primitives
- PARTS constant
- HyperCardTheme component
- 50+ base widgets
- Shared primitives

**Tier 2 (Extractable with refactoring):** ~2,500 lines
- Redux slices (need decoupling from os-core)

**Tier 3 (NOT extractable):** ~7,500 lines
- Desktop shell state machine
- Window management
- App registry

**Recommendation:** Extract in phases:
1. Theme package (`@go-go-golems/hypercard-theme`)
2. Base primitives package (`@go-go-golems/hypercard-primitives`)
3. Rich primitives package (`@go-go-golems/hypercard-rich`)
4. Redux-enabled widgets (optional, complex)

### 2026-04-08 11:10 — Design Doc Writing

Wrote comprehensive 700+ line design document covering:
- Executive summary
- Problem statement
- Current-state architecture (three-layer design)
- Gap analysis
- Proposed package structure
- API references
- Implementation phases
- Testing strategy
- Risks and open questions

### 2026-04-08 11:30 — Bookkeeping Updates

```bash
# Related files to ticket
docmgr doc relate \
  --doc "2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md" \
  --file-note "/workspace-links/go-go-os-frontend/packages/os-core/src/parts.ts:PARTS constant enum - source of truth for data-part attributes"

docmgr doc relate \
  --doc "2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md" \
  --file-note "/workspace-links/go-go-os-frontend/packages/os-core/src/theme/desktop/tokens.css:Design tokens - 100+ CSS custom properties"

docmgr doc relate \
  --doc "2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md" \
  --file-note "/workspace-links/go-go-os-frontend/packages/os-core/src/theme/desktop/primitives.css:Widget CSS - 868 lines of data-part selectors"

docmgr doc relate \
  --doc "2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md" \
  --file-note "/workspace-links/go-go-os-frontend/packages/os-widgets/src/parts.ts:RICH_PARTS constant - 500+ rich widget part names"

# Changelog
docmgr changelog update --ticket os-widgets \
  --entry "Created comprehensive architecture analysis document with extraction feasibility study" \
  --file-note "/openai-app-server/ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md"

docmgr changelog update --ticket os-widgets \
  --entry "Identified three extraction tiers: easily extractable (~5.8K lines), refactoring needed (~2.5K lines), not extractable (~7.5K lines)" \
  --file-note "/workspace-links/go-go-os-frontend/packages/os-core/src/parts.ts"

docmgr changelog update --ticket os-widgets \
  --entry "Discovered CSS custom property theming system with 100+ tokens in tokens.css" \
  --file-note "/workspace-links/go-go-os-frontend/packages/os-core/src/theme/desktop/tokens.css"

docmgr changelog update --ticket os-widgets \
  --entry "Discovered macos1 theme as thin 20-line overlay on base tokens" \
  --file-note "/workspace-links/go-go-os-frontend/packages/os-core/src/theme/desktop/theme/macos1.css"
```

### 2026-04-08 11:40 — Validation

```bash
# Validate docs
docmgr doctor --ticket os-widgets --stale-after 30
```

### 2026-04-08 11:45 — reMarkable Upload

```bash
# Dry-run
remarquee upload bundle --dry-run \
  "2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md" \
  "2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/reference/01-investigation-diary.md" \
  --name "Widget Package Architecture Analysis" \
  --remote-dir "/ai/2026/04/08/os-widgets" \
  --toc-depth 2

# Real upload
remarquee upload bundle \
  "2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md" \
  "2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/reference/01-investigation-diary.md" \
  --name "Widget Package Architecture Analysis" \
  --remote-dir "/ai/2026/04/08/os-widgets" \
  --toc-depth 2

# Verify
remarquee cloud ls /ai/2026/04/08/os-widgets --long --non-interactive
```

### 2026-04-08 12:30 — Design Review Corrections

Revisited the design after a review pass and corrected several inaccuracies.

**What changed:**
- Standardized the proposed package name to `@go-go-golems/macos1-react`
- Switched the public theme wrapper name from `HyperCardTheme` to **`Macos1Theme`**
- Documented a compatibility migration path from `data-widget="hypercard"` to `data-widget="macos1"`
- Updated the package plan to include **all of `os-widgets`**, not just the stateless rich primitives
- Corrected the dependency model: the package is no longer described as React-only once all of `os-widgets` is included
- Added the missing shell support files (`useContentMinSize.ts`, extracted window scope provider)
- Added API/export guidance to avoid name collisions such as the duplicate `ProgressBar`
- Recorded that `ButtonGroup.tsx` currently imports `Btn` from `@go-go-golems/os-core` and will need local-package rewiring during extraction

**Files re-checked:**
- `os-widgets/src/index.ts`
- `os-widgets/src/theme/index.ts`
- `os-widgets/src/launcher/modules.tsx`
- `os-widgets/package.json`
- `os-core/src/components/shell/windowing/DesktopShellView.tsx`
- `os-core/src/components/shell/windowing/useContentMinSize.ts`
- `os-core/src/theme/HyperCardTheme.tsx`

**Key conclusion:** the single-package plan is still sound, but it is now correctly framed as a broader UI package with two usage tiers:
1. pure UI consumption (`theme`, `primitives`, `widgets`, `shell`)
2. launcher/runtime integration (`launcher` subpath, coupled to `os-core` + `os-shell`)

### 2026-04-08 12:45 — Risks / Open Questions Tightened

Refined the back section of the design doc so it matches the broadened single-package scope.

**Changes made:**
- replaced generic risks with package-specific ones:
  - selector migration risk (`data-widget="hypercard"` → `data-widget="macos1"`)
  - API sprawl in a single package
  - launcher/runtime coupling
  - export collisions
  - larger Storybook/test matrix
- updated alternatives so they reflect the current decision pressure around keeping `launcher` inside the single package
- rewrote open questions around:
  - compatibility window for legacy HyperCard selector/name
  - whether to keep a deprecated alias export
  - whether launcher should be treated as public or workspace-specific
  - whether `--hc-*` token prefixes should remain
  - whether published exports should point to `dist/` or source
- expanded the references section to mention:
  - `os-widgets/src/index.ts`
  - `os-widgets/src/launcher/modules.tsx`
  - `os-widgets/src/theme/index.ts`
  - `os-core/src/components/shell/windowing/useContentMinSize.ts`

**Why this matters:** the earlier risk section still sounded like a smaller theme/primitives package. The new wording now matches the actual proposal: a larger single package with both UI and runtime-adjacent subpaths.

### 2026-04-08 13:00 — Scope Narrowed Back to Primitive-Only os-widgets Subset

The scope changed again after clarifying that the package should **not** include all of `os-widgets`.

**Updated design decision:**
- keep `os-core` theme, base widgets, and presentational shell primitives in scope
- include **only** the primitive-like subset from `os-widgets/src/primitives/` if useful
- exclude feature widgets, reducers, launcher modules, and other runtime-coupled `os-widgets` surfaces

**Approved `os-widgets` subset:**
- `Sparkline.tsx`
- `ModalOverlay.tsx`
- `SearchBar.tsx`
- `LabeledSlider.tsx`
- `CommandPalette.tsx`
- `WidgetToolbar.tsx`
- `WidgetStatusBar.tsx`
- `EmptyState.tsx`
- `ButtonGroup.tsx`
- `Separator.tsx`

**Explicit exclusions:**
- `os-widgets/src/primitives/ProgressBar.tsx` (collides with `os-core` `ProgressBar`)
- all feature widget directories
- all reducers / `STATE_KEY` exports
- launcher modules
- Storybook helpers

**Additional implementation note:** `ButtonGroup.tsx` currently imports `Btn` from `@go-go-golems/os-core` and will need a local import rewrite in the extracted package.

### 2026-04-08 13:05 — Detailed Tasks Added to Ticket

Added a concrete task list to `tasks.md` covering:
- package naming and selector migration
- package scaffold and exports
- theme extraction
- base widget extraction
- shell extraction + support files
- narrow rich primitive extraction
- explicit exclusions
- import cleanup (`ButtonGroup`)
- os-core rewiring
- verification/test coverage

Used `docmgr task add --ticket os-widgets ...` to create 16 actionable tasks.

### 2026-04-09 09:10 — Ticket Moved and Tasks Restructured for Intern Onboarding

The ticket workspace was moved under the current repo to:

`ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/`

To make the work friendlier for a new intern, I rewrote the implementation plan and task list to be:
- **phase-based** instead of a flat list
- **path-specific** instead of abstract
- explicit about **what not to move**
- explicit about the exact approved `os-widgets` subset

**Updated docs:**
- `ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md`
- `ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/tasks.md`

**Implementation phases now documented:**
1. Scope freeze and file inventory
2. Package scaffold and exports
3. Theme extraction and rename to `Macos1Theme`
4. Base primitive extraction from `os-core`
5. Narrow rich primitive extraction from `os-widgets`
6. Shell primitive extraction from `os-core`
7. Integration, validation, and doc hygiene

**Important intern-facing clarifications added:**
- repo root path conventions
- target package path: `workspace-links/go-go-os-frontend/packages/macos1-react/`
- exact source file paths for each copy step
- explicit exclusions such as `os-widgets/src/primitives/ProgressBar.tsx` and `useDesktopShellController.tsx`
- post-copy cleanup requirement for `ButtonGroup.tsx`

---

## What Worked

1. **Three-layer architecture was clearly visible** — the horizontal layering (theming → base widgets → rich widgets) made the extraction plan obvious.

2. **PARTS constant is a great pattern** — the TypeScript const assertion with `as const` provides type safety and searchability.

3. **CSS custom properties are ideal for theming** — no runtime dependency, works with any framework, supports runtime overrides.

4. **File organization is consistent** — each widget has its own directory with component + state + CSS + stories.

## What Didn't Work

1. **Could not find rich-widgets package** — searched for a separate `rich-widgets` package but found it's actually part of `os-widgets/src/`.

2. **Shell system is too coupled** — the `useDesktopShellController.tsx` (1221 lines) is too complex to extract.

## What Was Tricky to Build

1. **Understanding the full widget inventory** — needed to count and categorize 50+ base widgets + 20+ rich widgets.

2. **Determining extraction boundaries** — the line between "easily extractable" and "needs refactoring" was sometimes blurry.

3. **Documenting the API references** — needed to provide concrete usage examples for each layer.

---

## Code Review Instructions

To verify the findings in this document:

1. **Review PARTS constant** (`os-core/src/parts.ts`):
   - Check all part names match CSS selectors
   - Verify no duplicate names
   - Confirm TypeScript const assertion is used

2. **Review tokens.css** (`os-core/src/theme/desktop/tokens.css`):
   - Count total CSS custom properties
   - Check for missing tokens in certain categories
   - Verify token naming convention consistency

3. **Review primitives.css** (`os-core/src/theme/desktop/primitives.css`):
   - Verify all `data-part` selectors have corresponding PARTS constant
   - Check for unused CSS rules
   - Verify data-state variations are covered

4. **Review macos1.css** (`os-core/src/theme/desktop/theme/macos1.css`):
   - Check which tokens it overrides
   - Verify it only adds overrides, no new rules

5. **Review widget components** (`os-core/src/components/widgets/*.tsx`):
   - Verify PARTS constant is used (not hardcoded strings)
   - Check accessibility attributes (role, aria-*)
   - Verify data-state handling is consistent

6. **Review Redux slices** (`os-widgets/src/*/state.ts`):
   - Check for os-core dependencies that would prevent extraction
   - Verify STATE_KEY naming consistency
   - Check createStateSeed() patterns

---

*Diary entry completed: 2026-04-08 12:00*

---

## Step 1: Phase 0 — Scope Freeze and Phase 1 — Package Scaffold

**Date:** 2026-04-09
**Author:** pi coding agent
**Commit:** `52e5c37`

### Prompt Context

**User prompt (verbatim):** "Work on docmgr ticket @ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/. Read the design doc, and then work on the tasks for phase 0 and phase 1. Keep a diary as you work. Commit at appropriate intervals."

**Assistant interpretation:** Read the design doc, scope freeze Phase 0 tasks, then implement Phase 1 scaffold for the new `macos1-react` package.

**Inferred user intent:** Begin extraction of widget primitives into a standalone package, starting with scope verification and scaffold creation.

### What I did

- Read design doc (`01-widget-package-architecture-analysis-and-extraction-feasibility-study.md`) completely
- Read investigation diary (`01-investigation-diary.md`)
- Verified all 10 approved `os-widgets` subset files exist
- Verified `os-core/src/theme/desktop/` CSS files exist
- Created package directory structure under `packages/macos1-react/src/`
- Created `package.json` with subpath exports and CSS side effects
- Created `tsconfig.json` matching `os-core` conventions
- Created `README.md` with usage examples
- Created stub index files for all subpaths (`theme`, `primitives`, `rich`, `shell`, `parts`)
- Created stub `Macos1Theme.tsx` (stub version to be replaced in Phase 2)
- Created stub `parts.ts` and `richParts.ts`
- Created `public-types.ts` for shell components
- Verified TypeScript compiles successfully (`npx tsc --noEmit`)
- Committed in `go-go-os-frontend` repo: `52e5c37`

### Why

Phase 0 ensures no scope creep before implementation. Phase 1 scaffold establishes the target package structure before copying files in later phases.

### What worked

- Package structure matches the design doc exactly
- TypeScript compilation succeeds with no errors
- Subpath exports are correctly configured
- CSS side effects configured to prevent tree-shaking

### What didn't work

- N/A for this phase (scaffold only)

### What I learned

- The package naming convention uses `@go-go-golems/` scope
- os-core uses `moduleResolution: bundler` in tsconfig
- CSS side effects need explicit `sideEffects` array in package.json

### What was tricky to build

- Ensuring the package.json exports match the directory structure exactly
- Matching os-core conventions for tsconfig settings

### What warrants a second pair of eyes

- Verify the `sideEffects` array is correct for CSS imports
- Verify the subpath exports cover all needed entry points

### What should be done in the future

- Phase 2: Copy and transform theme files, rename `HyperCardTheme` → `Macos1Theme`
- Phase 3: Copy base widgets from `os-core`
- Phase 4: Copy approved `os-widgets` primitive subset
- Phase 5: Copy shell primitives

### Code review instructions

1. Review `packages/macos1-react/package.json`:
   - Verify all subpath exports are correct
   - Verify `sideEffects` includes `**/*.css`
   - Verify peer dependencies are minimal

2. Review `packages/macos1-react/tsconfig.json`:
   - Verify `jsx: react-jsx` is set
   - Verify `composite: true` for project references

3. Run TypeScript check:
   ```bash
   cd packages/macos1-react && npx tsc --noEmit
   ```

### Technical details

**Package structure created:**
```
packages/macos1-react/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts
    ├── theme/
    │   ├── index.ts
    │   └── Macos1Theme.tsx
    ├── primitives/
    │   └── index.ts
    ├── rich/
    │   └── index.ts
    ├── shell/
    │   ├── index.ts
    │   └── public-types.ts
    └── parts/
        ├── index.ts
        ├── parts.ts
        └── richParts.ts
```

**Subpath exports configured:**
- `.` → `./src/index.ts`
- `./theme` → `./src/theme/index.ts`
- `./primitives` → `./src/primitives/index.ts`
- `./rich` → `./src/rich/index.ts`
- `./shell` → `./src/shell/index.ts`
- `./parts` → `./src/parts/index.ts`

*Diary entry completed: 2026-04-09*