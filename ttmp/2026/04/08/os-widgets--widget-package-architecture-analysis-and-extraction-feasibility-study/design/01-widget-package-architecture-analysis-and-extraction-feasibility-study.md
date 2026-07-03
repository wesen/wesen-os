---
Title: ""
Ticket: ""
Status: ""
Topics: []
DocType: ""
Intent: ""
Owners: []
RelatedFiles:
    - Path: workspace-links/go-go-os-frontend/packages/os-core/src/parts.ts
      Note: PARTS constant enum - source of truth for data-part attributes
    - Path: workspace-links/go-go-os-frontend/packages/os-core/src/theme/desktop/primitives.css
      Note: Widget CSS - 868 lines of data-part selectors
    - Path: workspace-links/go-go-os-frontend/packages/os-core/src/theme/desktop/tokens.css
      Note: Design tokens - 100+ CSS custom properties
    - Path: workspace-links/go-go-os-frontend/packages/os-widgets/src/parts.ts
      Note: RICH_PARTS constant - 500+ rich widget part names
ExternalSources: []
Summary: ""
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---





# Widget Package Architecture Analysis and Extraction Feasibility Study

**Ticket:** os-widgets  
**Date:** 2026-04-08  
**Author:** pi coding agent  
**Status:** Active  
**Intent:** Long-term  
**Topics:** widgets, theme, styling, macos1, architecture, react

---

## 1. Executive Summary

This document is an **architectural deep-dive and extraction feasibility study** for the widget and theming systems inside the `go-go-os-frontend` monorepo. The goal is to answer a specific question: **Can we reuse the "macos1" look-and-feel, the base widget primitives, and the rich widget components as a standalone React styling/theme package?**

The short answer is: **yes, with caveats, and with a recommended extraction plan that preserves the current monorepo structure while creating a new publishable package.**

Here's a summary of findings:

- **macos1 theming lives in `os-core`**: The entire visual language is expressed as CSS custom properties and attribute-based selectors in a small set of `.css` files. The theming system is already decoupled from the component logic and could be extracted as a standalone theme package.

- **Base widget primitives live in `os-core/src/components/widgets/`**: This directory contains 50+ atomic widget components (Checkbox, ContextMenu, DataTable, etc.) that use a data-part attribute convention to bind to CSS. They have no runtime dependencies beyond React.

- **Rich widget state and components live in `os-widgets`**: The complex stateful widgets (LogViewer, ChartView, MacSlides, SteamLauncher, etc.) are self-contained but carry tight coupling to Redux slices and os-core primitives.

- **The system is already designed for reuse**: The `PARTS` constant object in `os-core/src/parts.ts` provides a typed enum for CSS data-part attribute values, enabling consistent styling across all packages.

- **The extraction is not trivial**: The rich widgets have deep interdependencies. A naive "copy everything into a new package" approach would create maintenance nightmares. Instead, we recommend a phased extraction that separates concerns: **tokens/themes → base primitives → rich widget wrappers**.

---

## 2. Problem Statement and Scope

### 2.1 The Core Question

The user wants to understand if the widget styling and theming system in `go-go-os-frontend` can be **extracted into a standalone, publishable React package** that provides:

1. A theming system (CSS custom properties + data-part selectors)
2. A set of base widget primitives (Checkbox, Button, ContextMenu, etc.)
3. A set of rich, complex widgets (LogViewer, ChartView, etc.)

This would allow external React projects to consume the "macos1" aesthetic without pulling in the entire desktop shell, Redux state, or the complex widget bundles.

### 2.2 Scope of This Analysis

We analyzed the following packages and directories:

| Package | Path | Purpose |
|---------|------|---------|
| `os-core` | `workspace-links/go-go-os-frontend/packages/os-core/` | Core desktop widgets, theming, Redux helpers, shell primitives |
| `os-widgets` | `workspace-links/go-go-os-frontend/packages/os-widgets/` | Rich widget primitives, launcher modules, widget-specific CSS |
| `os-shell` | `workspace-links/go-go-os-frontend/packages/os-shell/` | App manifests, launch surfaces, app-registry |
| `os-repl` | `workspace-links/go-go-os-frontend/packages/os-repl/` | Terminal and REPL UI components |
| `os-chat` | `workspace-links/go-go-os-frontend/packages/os-chat/` | Shared chat UI and state primitives |
| `os-kanban` | `workspace-links/go-go-os-frontend/packages/os-kanban/` | Kanban runtime modules |
| `os-confirm` | `workspace-links/go-go-os-frontend/packages/os-confirm/` | plz-confirm integration components |
| `os-ui-cards` | `workspace-links/go-go-os-frontend/packages/os-ui-cards/` | UI node schema and React renderer |

### 2.3 Out of Scope

- Go backend integration (this is a frontend-only study)
- The entire desktop shell controller and window management system (this is too tightly coupled)
- The Kanban card DSL (this is a separate subsystem)
- The Scripting package (QuickJS runtime)

---

## 3. Current-State Architecture

### 3.1 The Three-Layer Design

The current architecture follows a **three-layer design**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Layer 3: Rich Widgets                        │
│    os-widgets/src/primitives/ (CommandPalette, Sparkline, etc.)     │
│    os-widgets/src/log-viewer/, chart-view/, steam-launcher/, etc.    │
├─────────────────────────────────────────────────────────────────────┤
│                     Layer 2: Base Widget Primitives                  │
│        os-core/src/components/widgets/ (Btn, Checkbox, etc.)        │
│        os-core/src/parts.ts (PARTS constant object)                 │
├─────────────────────────────────────────────────────────────────────┤
│                        Layer 1: Theming System                      │
│  os-core/src/theme/desktop/tokens.css, primitives.css, shell.css,     │
│  animations.css, syntax.css                                         │
│  os-core/src/theme/desktop/theme/macos1.css (the macos1 skin)        │
│  os-core/src/theme/HyperCardTheme.tsx (the React wrapper)            │
└─────────────────────────────────────────────────────────────────────┘
```

This is a **horizontal layering** where higher layers depend on lower layers, but lower layers are designed to be independently usable.

### 3.2 The Theming System (Layer 1)

#### 3.2.1 CSS Custom Properties as Design Tokens

The entire theming system is built on **CSS custom properties** (CSS variables) defined in `os-core/src/theme/desktop/tokens.css`. This is a standard modern approach that allows runtime theming without JavaScript.

**File:** `os-core/src/theme/desktop/tokens.css` (250 lines)

```css
/* The scoping root selector — all tokens live here */
[data-widget="hypercard"] {
  /* ── Layout ── */
  --hc-width: 100%;
  --hc-font-family: "Geneva", "Chicago", "Monaco", monospace;
  --hc-font-size: 11px;
  
  /* ── Color palette ── */
  --hc-color-bg: #fff;
  --hc-color-fg: #000;
  --hc-color-border: #000;
  --hc-color-muted: #777;
  
  /* ── Button tokens ── */
  --hc-btn-bg: #fff;
  --hc-btn-fg: #000;
  --hc-btn-border: 2px solid #000;
  --hc-btn-padding: 3px 10px;
  --hc-btn-shadow: 1px 1px 0 #000;
  
  /* ── Checkbox / RadioButton ── */
  --hc-check-size: 14px;
  --hc-check-border: 2px solid var(--hc-color-border);
  
  /* ── ContextMenu ── */
  --hc-context-menu-bg: rgba(255, 255, 255, 0.88);
  --hc-context-menu-min-width: 180px;
  --hc-context-menu-item-hover-bg: #0a6cff;
  --hc-context-menu-item-hover-fg: #fff;
  
  /* ... and 80+ more tokens */
}
```

**Key insight:** All 100+ tokens are defined on the `[data-widget="hypercard"]` selector. This means any component that renders inside a `<div data-widget="hypercard">` has access to the entire token system.

#### 3.2.2 Data-Part Attribute Selectors

Instead of CSS classes, components use `data-part` attributes. This is a **BEM-like convention** enforced through the `PARTS` constant:

**File:** `os-core/src/parts.ts` (150 lines)

```typescript
export const PARTS = {
  // Widget root
  root: 'hypercard',
  // Primitives
  btn: 'btn',
  chip: 'chip',
  toast: 'toast',
  // Window chrome
  windowFrame: 'window-frame',
  titleBar: 'title-bar',
  closeBox: 'close-box',
  // Checkbox
  checkbox: 'checkbox',
  checkboxMark: 'checkbox-mark',
  // RadioButton
  radioButton: 'radio-button',
  radioButtonDot: 'radio-button-dot',
  // ListBox
  listBox: 'list-box',
  listBoxItem: 'list-box-item',
  // ContextMenu
  contextMenu: 'context-menu',
  contextMenuItem: 'context-menu-item',
  contextMenuItemCheck: 'context-menu-item-check',
  contextMenuItemLabel: 'context-menu-item-label',
  contextMenuItemShortcut: 'context-menu-item-shortcut',
  contextMenuSeparator: 'context-menu-separator',
  // ... 90+ more part names
} as const;

export type PartName = (typeof PARTS)[keyof typeof PARTS];
```

**How it works in components:**

```tsx
// From os-core/src/components/widgets/Checkbox.tsx
export function Checkbox({ label, checked, onChange, disabled }: CheckboxProps) {
  return (
    <div
      data-part={PARTS.checkbox}
      data-state={disabled ? 'disabled' : checked ? 'checked' : undefined}
      role="checkbox"
      aria-checked={checked}
      onClick={disabled ? undefined : onChange}
    >
      <div data-part={PARTS.checkboxMark}>{checked ? '✕' : ''}</div>
      <span>{label}</span>
    </div>
  );
}
```

**CSS matching:**

```css
/* From os-core/src/theme/desktop/primitives.css */
[data-part="checkbox"] {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: var(--hc-font-family);
  font-size: 12px;
}
[data-part="checkbox-mark"] {
  width: var(--hc-check-size);
  height: var(--hc-check-size);
  border: var(--hc-check-border);
  background: var(--hc-check-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
}
```

**Benefits of this pattern:**
1. **Type safety**: TypeScript ensures you can't use a non-existent part name
2. **Searchability**: All usages of `PARTS.checkbox` can be found via grep
3. **Refactoring**: Renaming a part is a single constant change
4. **CSS encapsulation**: The `[data-part="..."]` selector prevents leakage

#### 3.2.3 The macos1 Theme Overlay

The `macos1` theme is a thin overlay that **overrides base tokens** to produce a specific visual style:

**File:** `os-core/src/theme/desktop/theme/macos1.css` (20 lines)

```css
/* macOS-1 desktop skin variables for HyperCard desktop shell */
[data-widget="hypercard"].theme-macos1 {
  --hc-font-family: "Geneva", "Chicago", "Monaco", monospace;
  --hc-font-size: 11px;
  --hc-border-radius: 0px;
  --hc-color-bg: #fff;
  --hc-color-fg: #000;
  --hc-color-border: #000;
  --hc-color-muted: #777;
  --hc-color-accent: #000;
  --hc-color-desktop-bg: #bfc8d8;
  --hc-window-shadow: 3px 3px 0 #000;
  --hc-window-border-radius: 3px;
}
```

**How to use it:**

```typescript
// From os-core/src/desktop-theme-macos1.ts
import './theme';
import './theme/desktop/theme/macos1.css';

export const DESKTOP_THEME_MACOS1 = 'theme-macos1';
```

```tsx
// Wrap your app in HyperCardTheme with the macos1 class
<HyperCardTheme theme="theme-macos1">
  <MyApp />
</HyperCardTheme>
```

The `HyperCardTheme` component (from `os-core/src/theme/HyperCardTheme.tsx`) provides the scoping root:

```tsx
export function HyperCardTheme({ children, theme, unstyled, themeVars }: HyperCardThemeProps) {
  if (unstyled) return <>{children}</>;
  return (
    <div data-widget="hypercard" className={theme} style={themeVars}>
      {children}
    </div>
  );
}
```

#### 3.2.4 CSS Files Organization

```
os-core/src/theme/
├── index.ts              # Re-exports HyperCardTheme, loads all CSS
├── HyperCardTheme.tsx    # React component for scoping root
├── classic.css           # Optional: classic theme overlay
├── modern.css           # Optional: modern theme overlay
└── desktop/
    ├── tokens.css        # All CSS custom properties (250 lines)
    ├── primitives.css    # All data-part CSS rules (868 lines)
    ├── shell.css         # Window chrome CSS (200 lines)
    ├── animations.css    # Keyframe animations (20 lines)
    ├── syntax.css        # CodeMirror/lezer token colors (50 lines)
    └── theme/
        ├── macos1.css    # macOS-1 visual override (20 lines)
        └── ...          # Future: windows11.css, linux.css, etc.
```

**File sizes:**
- `tokens.css`: ~250 lines (all design tokens)
- `primitives.css`: ~868 lines (all widget CSS)
- `shell.css`: ~200 lines (window chrome)
- `macos1.css`: ~20 lines (theme overlay)

**Total: ~1,340 lines of CSS** — very manageable for extraction.

### 3.3 The Base Widget Primitives (Layer 2)

#### 3.3.1 Widget Inventory

The base widget primitives are located in `os-core/src/components/widgets/`. There are **50+ components**:

| Component | Lines | Purpose |
|-----------|-------|---------|
| `AlertDialog.tsx` | ~60 | Modal alert dialog with icon |
| `Btn.tsx` | ~25 | Styled button with variants |
| `Checkbox.tsx` | ~30 | Checkbox with visual checkmark |
| `Chip.tsx` | ~20 | Small label/tag chip |
| `ContextMenu.tsx` | ~160 | Right-click context menu |
| `DataTable.tsx` | ~90 | Sortable data table |
| `DetailView.tsx` | ~70 | Read-only detail panel |
| `DisclosureTriangle.tsx` | ~40 | Collapsible section |
| `DropdownMenu.tsx` | ~80 | Dropdown select menu |
| `FieldRow.tsx` | ~80 | Label/value field row |
| `FilePickerDropzone.tsx` | ~160 | Drag-and-drop file picker |
| `FilterBar.tsx` | ~50 | Search/filter bar |
| `FormView.tsx` | ~60 | Form layout container |
| `GridBoard.tsx` | ~100 | Grid selection board |
| `HaloTarget.tsx` | ~110 | Draggable handles overlay |
| `ImageChoiceGrid.tsx` | ~90 | Image selection grid |
| `ListBox.tsx` | ~35 | Single-select list |
| `ListView.tsx` | ~130 | Multi-select list with state |
| `MenuGrid.tsx` | ~55 | Icon menu grid |
| `ProgressBar.tsx` | ~30 | Progress bar with stripe fill |
| `RadioButton.tsx` | ~30 | Radio button group |
| `RatingPicker.tsx` | ~110 | Star rating picker |
| `ReportView.tsx` | ~50 | Key/value report rows |
| `RequestActionBar.tsx` | ~75 | Action buttons bar |
| `SchemaFormRenderer.tsx` | ~160 | Dynamic schema-based form |
| `SelectableDataTable.tsx` | ~240 | Selectable data table |
| `SelectableList.tsx` | ~230 | Selectable list with search |
| `TabControl.tsx` | ~95 | Tabbed content control |
| `Toast.tsx` | ~20 | Toast notification |
| `ToolPalette.tsx` | ~40 | Tool selection grid |

Plus **55+ corresponding `.stories.tsx` files** for Storybook.

#### 3.3.2 Widget Component Patterns

**Pattern 1: Simple Stateless Widget**
```tsx
// Btn.tsx — minimal, no internal state
export function Btn({ variant, state, children }: BtnProps) {
  return (
    <button
      data-part={PARTS.btn}
      data-variant={variant}
      data-state={state}
    >
      {children}
    </button>
  );
}
```

**Pattern 2: Stateful Widget with Internal State**
```tsx
// DisclosureTriangle.tsx — toggles open/closed internally
export function DisclosureTriangle({ label, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-part={PARTS.disclosureTriangle} data-state={open ? 'open' : 'closed'}>
      <button onClick={() => setOpen(!open)}>
        <span data-part={PARTS.disclosureTriangleArrow}>
          {open ? '▼' : '▶'}
        </span>
        {label}
      </button>
      <div data-part={PARTS.disclosureTriangleContent}>
        {open && children}
      </div>
    </div>
  );
}
```

**Pattern 3: Controlled Widget with External State**
```tsx
// Checkbox.tsx — fully controlled via props
export function Checkbox({ checked, onChange, disabled }) {
  return (
    <div
      data-part={PARTS.checkbox}
      data-state={disabled ? 'disabled' : checked ? 'checked' : undefined}
      onClick={disabled ? undefined : onChange}
    >
      <div data-part={PARTS.checkboxMark}>{checked ? '✕' : ''}</div>
    </div>
  );
}
```

#### 3.3.3 Widget Export Structure

All widgets are exported via `os-core/src/components/widgets/index.ts`:

```typescript
export { AlertDialog } from './AlertDialog';
export { Btn } from './Btn';
export { Checkbox } from './Checkbox';
// ... 50 more
```

And then re-exported through `os-core/src/index.ts`:

```typescript
// ── Widgets ──
export * from './components/widgets';
// ── Theme ──
export { HyperCardTheme, type HyperCardThemeProps } from './theme/HyperCardTheme';
export * from './parts';
```

**Consumer API:**
```typescript
import { Checkbox, Btn, ContextMenu } from '@go-go-golems/os-core';
import '@go-go-golems/os-core/theme'; // Load all CSS
```

### 3.4 The Rich Widget Primitives (Layer 3)

#### 3.4.1 os-widgets Package Structure

The `os-widgets` package contains **20+ complex stateful widgets**, each with its own Redux slice:

```
os-widgets/src/
├── primitives/          # Simple shared primitives
│   ├── ButtonGroup.tsx
│   ├── CommandPalette.tsx
│   ├── EmptyState.tsx
│   ├── LabeledSlider.tsx
│   ├── ModalOverlay.tsx
│   ├── ProgressBar.tsx
│   ├── SearchBar.tsx
│   ├── Separator.tsx
│   ├── Sparkline.tsx
│   ├── WidgetStatusBar.tsx
│   ├── WidgetToolbar.tsx
│   └── useAnimationLoop.ts
├── log-viewer/          # Redux slice + component
├── chart-view/
├── mac-write/
├── repl/                # Imports from os-repl
├── node-editor/
├── oscilloscope/
├── calendar/
├── mac-slides/
├── logic-analyzer/
├── graph-navigator/
├── calculator/
├── deep-research/
├── game-finder/
├── music-player/
├── stream-launcher/
├── steam-launcher/
├── youtube-retro/
├── chat-browser/
├── system-modeler/
├── control-room/
├── mermaid-editor/
├── mac-browser/
├── parts.ts             # RICH_PARTS constant (~500 part names)
├── theme/               # Widget-specific CSS (~25 files)
│   ├── index.ts         # Imports all widget CSS
│   ├── primitives.css   # Shared primitive CSS
│   ├── rich-widgets-launcher.css
│   ├── sparkline.css
│   ├── log-viewer.css
│   ├── chart-view.css
│   └── ... (20 more widget-specific CSS files)
└── launcher/
    ├── modules.tsx      # App module registrations
    ├── RichWidgetsDesktop.stories.tsx
    └── richWidgetsLauncherState.ts
```

#### 3.4.2 Redux Slice Pattern

Each rich widget follows a consistent Redux pattern:

```typescript
// Example: log-viewer/logViewerState.ts
export const LOG_VIEWER_STATE_KEY = 'logViewer';

export interface LogViewerState {
  entries: LogEntry[];
  filter: LogLevel | null;
  selectedId: string | null;
}

export const logViewerSlice = createSlice({
  name: LOG_VIEWER_STATE_KEY,
  initialState: createLogViewerStateSeed(),
  reducers: {
    addEntry: (state, action: PayloadAction<LogEntry>) => {
      state.entries.push(action.payload);
    },
    setFilter: (state, action: PayloadAction<LogLevel | null>) => {
      state.filter = action.payload;
    },
    // ... more reducers
  },
});

export const logViewerActions = logViewerSlice.actions;
export const logViewerReducer = logViewerSlice.reducer;
```

**State seeding pattern:**

```typescript
export function createLogViewerStateSeed(): LogViewerState {
  return {
    entries: [],
    filter: null,
    selectedId: null,
  };
}
```

This allows embedding the widget state into a larger Redux store via `combineReducers`.

#### 3.4.3 Rich Parts System

Each widget has its own `data-part` namespace to avoid collisions:

**File:** `os-widgets/src/parts.ts` (~500 lines, ~250 part names)

```typescript
export const RICH_PARTS = {
  // Shared Primitives
  widgetToolbar: 'widget-toolbar',
  widgetStatusBar: 'widget-status-bar',
  modalOverlay: 'modal-overlay',
  sparkline: 'sparkline',

  // LogViewer
  lv: 'lv',
  lvTable: 'lv-table',
  lvRow: 'lv-row',
  lvCell: 'lv-cell',

  // ChartView
  cv: 'cv',
  cvCanvas: 'cv-canvas',
  cvControls: 'cv-controls',

  // SteamLauncher
  steamLauncher: 'steam-launcher',
  stGameRow: 'st-game-row',
  stDetail: 'st-detail',

  // YouTubeRetro
  youtubeRetro: 'youtube-retro',
  ytVideoCard: 'yt-video-card',
  ytPlayerWrap: 'yt-player-wrap',
  ytScanlines: 'yt-scanlines',  // CRT scanline effect!
  ytMovingScan: 'yt-moving-scan',
  ytVignette: 'yt-vignette',

  // ... 200+ more
} as const;

export type RichPartName = (typeof RICH_PARTS)[keyof typeof RICH_PARTS];
```

**Key insight:** The `RICH_PARTS` system uses **prefixed namespaces** (e.g., `st*` for Steam, `yt*` for YouTube, `sl*` for StreamLauncher) to prevent collisions.

### 3.5 The Shell System (Separate Concern)

#### 3.5.1 DesktopShell and Windowing

The desktop shell system is located in `os-core/src/components/shell/windowing/`:

```
windowing/
├── DesktopShellView.tsx          # Main shell React component (~80 lines)
├── DesktopMenuBar.tsx            # Top menu bar
├── DesktopIconLayer.tsx          # Desktop icon grid
├── WindowLayer.tsx               # Window z-order management
├── WindowSurface.tsx             # Window chrome (title bar, body)
├── WindowTitleBar.tsx           # Title bar with close button
├── useDesktopShellController.tsx # State machine (~1221 lines!)
├── useWindowInteractionController.tsx
├── contextActionRegistry.ts      # Context menu action registry
├── desktopContributions.ts       # App contribution system
├── desktopMenuRuntime.tsx        # Menu state management
├── dragOverlayStore.ts          # Drag state
└── types.ts                     # Shell types
```

**The DesktopShellController** is a **1221-line state machine** that manages:
- Window positions, z-order, focus
- Menu bar state
- Icon selection
- Context menus
- Drag and resize

**This is NOT suitable for extraction** — it's too tightly coupled to the runtime behavior.

#### 3.5.2 Entry Points

The package exports three entry points for shell integration:

```typescript
// os-core/src/index.ts
export * from './app';
export * from './cards';
export * from './components/widgets';

// os-core/src/desktop-core.ts
export * from './desktop/core';

// os-core/src/desktop-react.ts  
export * from './desktop/react';

// os-core/src/desktop-theme-macos1.ts
import './theme';
import './theme/desktop/theme/macos1.css';
export const DESKTOP_THEME_MACOS1 = 'theme-macos1';
```

---

## 4. Gap Analysis: What Can Be Extracted vs. What Should Be

### 4.1 Tier 1: Easily Extractable (No Redux, No Shell)

| Artifact | Location | Lines | Reason for Extractability |
|----------|----------|-------|---------------------------|
| CSS tokens | `os-core/src/theme/desktop/tokens.css` | ~250 | Pure CSS, no JS |
| CSS primitives | `os-core/src/theme/desktop/primitives.css` | ~868 | Pure CSS, no JS |
| CSS shell | `os-core/src/theme/desktop/shell.css` | ~200 | Pure CSS, no JS |
| CSS animations | `os-core/src/theme/desktop/animations.css` | ~20 | Pure CSS, no JS |
| CSS syntax | `os-core/src/theme/desktop/syntax.css` | ~50 | Pure CSS, no JS |
| macos1 theme | `os-core/src/theme/desktop/theme/macos1.css` | ~20 | Thin overlay |
| PARTS constant | `os-core/src/parts.ts` | ~150 | Pure TypeScript |
| HyperCardTheme | `os-core/src/theme/HyperCardTheme.tsx` | ~40 | React component |
| Base widgets | `os-core/src/components/widgets/*.tsx` | ~3,000 | Stateless React |
| Shared primitives | `os-widgets/src/primitives/*.tsx` | ~1,000 | Stateless React |
| Primitive CSS | `os-widgets/src/theme/primitives.css` | ~250 | Pure CSS |

**Total Tier 1: ~5,800 lines** (mostly CSS and stateless React)

### 4.2 Tier 2: Extractable with Refactoring (Has Redux)

| Artifact | Location | Lines | Refactoring Needed |
|----------|----------|-------|-------------------|
| LogViewer state | `os-widgets/src/log-viewer/logViewerState.ts` | ~150 | Decouple from os-core |
| ChartView state | `os-widgets/src/chart-view/chartViewState.ts` | ~100 | Decouple from os-core |
| MacWrite state | `os-widgets/src/mac-write/macWriteState.ts` | ~100 | Decouple from os-core |
| 20 more widget states | Various `*State.ts` files | ~2,000 | Each needs decoupling |

**Total Tier 2: ~2,500 lines** (Redux slices that need refactoring)

### 4.3 Tier 3: NOT Extractable (Too Coupled)

| Artifact | Location | Lines | Reason |
|----------|----------|-------|--------|
| DesktopShellController | `useDesktopShellController.tsx` | ~1221 | Full state machine |
| Window management | `WindowLayer.tsx`, etc. | ~800 | Tied to runtime |
| Menu system | `DesktopMenuBar.tsx`, `desktopMenuRuntime.tsx` | ~600 | Tied to runtime |
| App registry | `os-shell/` | ~500 | Tied to app system |
| Scripting runtime | `os-scripting/` | ~3000 | Heavy dependencies |
| Kanban DSL | `os-kanban/` | ~1000 | Separate subsystem |
| Confirm system | `os-confirm/` | ~500 | Tied to plz-confirm |

**Total Tier 3: ~7,500 lines** (cannot extract)

---

## 5. Proposed Architecture for Standalone Package

### 5.1 Package Name and Branding

**`@go-go-golems/macos1-react`**

This package remains the recommended public React package for the extracted macos1 UI system.

**Naming decision:** remove the public **HyperCard** branding where feasible.

- Rename `HyperCardTheme` → **`Macos1Theme`**
- Rename `HyperCardTheme.tsx` → **`Macos1Theme.tsx`**
- Update README, comments, and examples to use `Macos1Theme`
- Keep a temporary deprecated alias export only if migration pressure requires it

**CSS scope migration:** today the CSS is scoped under `[data-widget="hypercard"]`. To remove HyperCard naming without breaking existing selectors, the extracted package should support both selectors during migration:

```css
[data-widget="macos1"],
[data-widget="hypercard"] {
  /* shared token declarations during migration */
}
```

Then `Macos1Theme` should emit `data-widget="macos1"` as the canonical public wrapper.

### 5.2 Scope Decision: os-widgets Is Mostly Out of Scope

After review, the package should **not** include all of `os-widgets`.

The recommended extraction scope is:

1. theme and CSS from `os-core`
2. base widget primitives from `os-core`
3. presentational shell primitives from `os-core`
4. **optionally** a small, primitive-like subset from `os-widgets/src/primitives/`

This keeps the package focused on reusable UI building blocks instead of pulling in:
- Redux state slices
- launcher/runtime modules
- feature-specific applications (`LogViewer`, `MacWrite`, `ChartView`, etc.)
- `os-shell` / `os-core` desktop integration contracts

### 5.3 Optional os-widgets Primitive Subset

If we include anything from `os-widgets`, the recommended set is limited to the primitive-ish components under `os-widgets/src/primitives/`.

**Recommended include set:**

| File | Keep? | Why |
|------|-------|-----|
| `Sparkline.tsx` | Yes | Small standalone visualization primitive |
| `ModalOverlay.tsx` | Yes | Generic overlay/container primitive |
| `SearchBar.tsx` | Yes | Reusable composed input primitive |
| `LabeledSlider.tsx` | Yes | Reusable control primitive |
| `CommandPalette.tsx` | Yes | Generic composed interaction primitive |
| `WidgetToolbar.tsx` | Yes | Generic layout primitive |
| `WidgetStatusBar.tsx` | Yes | Generic layout/status primitive |
| `EmptyState.tsx` | Yes | Generic presentational primitive |
| `ButtonGroup.tsx` | Yes | Useful primitive after import cleanup |
| `Separator.tsx` | Yes | Generic structural primitive |
| `ProgressBar.tsx` | No | Duplicates `os-core` `ProgressBar.tsx` and creates naming confusion |
| `useAnimationLoop.ts` | Maybe internal | Small helper, but not necessary as a public widget API |

**Secondary candidates, but not first-pass primitives:**
- `control-room/instruments.tsx` — interesting reusable components, but more domain-specific
- `chart-view/LegendBar.tsx` — useful, but tightly associated with chart-view semantics

### 5.4 Recommended Package Structure

```
packages/macos1-react/
├── src/
│   ├── theme/
│   │   ├── tokens.css
│   │   ├── primitives.css
│   │   ├── shell.css
│   │   ├── animations.css
│   │   ├── syntax.css
│   │   ├── rich-primitives.css      # from os-widgets primitive subset
│   │   ├── sparkline.css            # only if Sparkline is included
│   │   ├── themes/
│   │   │   └── macos1.css
│   │   ├── Macos1Theme.tsx
│   │   └── index.ts
│   │
│   ├── primitives/                  # former os-core widgets
│   │   ├── Btn.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Chip.tsx
│   │   ├── ContextMenu.tsx
│   │   ├── DataTable.tsx
│   │   ├── DropdownMenu.tsx
│   │   ├── ListBox.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Toast.tsx
│   │   └── index.ts
│   │
│   ├── rich/                        # optional os-widgets primitive subset only
│   │   ├── Sparkline.tsx
│   │   ├── ModalOverlay.tsx
│   │   ├── SearchBar.tsx
│   │   ├── LabeledSlider.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── WidgetToolbar.tsx
│   │   ├── WidgetStatusBar.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ButtonGroup.tsx
│   │   ├── Separator.tsx
│   │   ├── internal/
│   │   │   └── useAnimationLoop.ts  # only if needed internally
│   │   └── index.ts
│   │
│   ├── shell/
│   │   ├── DesktopIconLayer.tsx
│   │   ├── DesktopMenuBar.tsx
│   │   ├── WindowSurface.tsx
│   │   ├── WindowTitleBar.tsx
│   │   ├── WindowResizeHandle.tsx
│   │   ├── WindowLayer.tsx
│   │   ├── useContentMinSize.ts
│   │   ├── windowScope.tsx
│   │   ├── public-types.ts
│   │   └── index.ts
│   │
│   ├── parts/
│   │   ├── parts.ts
│   │   ├── richParts.ts
│   │   └── index.ts
│   │
│   └── index.ts                     # curated root exports only
│
├── package.json
├── tsconfig.json
└── README.md
```

### 5.5 Dependency Model

With the narrowed scope, the package can stay close to the original goal: **presentational React + CSS**, without dragging in the full `os-widgets` runtime surface.

```json
{
  "name": "@go-go-golems/macos1-react",
  "peerDependencies": {
    "react": "^18 || ^19",
    "react-dom": "^18 || ^19"
  }
}
```

If the optional rich primitive subset is limited to the files listed above, no Redux dependency should be required.

### 5.6 What Stays Out of Scope

**Remain in `os-core`:**
- `useDesktopShellController.tsx`
- `contextActionRegistry.ts`
- `desktopContributions.ts`
- `windowContentAdapter.ts`
- `dragOverlayStore.ts`
- `desktopCommandRouter.ts`
- `desktop/core/state/`
- `features/notifications/`
- `DesktopWindowMenuRuntimeProvider` and controller/runtime orchestration

**Remain in `os-widgets`:**
- all feature widget directories (`log-viewer/`, `chart-view/`, `mac-write/`, etc.)
- all reducers and `STATE_KEY` exports
- `launcher/modules.tsx`
- Storybook helpers
- feature theme aggregation for full widget apps
- `ProgressBar.tsx` from `os-widgets/src/primitives/`

### 5.7 Shell Components Analysis

**Extractable shell components:**
- `DesktopIconLayer.tsx`
- `DesktopMenuBar.tsx`
- `WindowSurface.tsx`
- `WindowTitleBar.tsx`
- `WindowResizeHandle.tsx`
- `WindowLayer.tsx`
- `useContentMinSize.ts`

**Small support extraction required:**
- split `DesktopWindowScopeProvider` out of `desktopMenuRuntime.tsx` into a standalone `windowScope.tsx`
- publish a reduced `public-types.ts` instead of blindly exporting the full internal `types.ts`

**Recommended public shell types:**
- `DesktopWindowDef`
- `DesktopIconDef`
- `DesktopMenuSection`
- `DesktopMenuEntry`
- `DesktopCommandInvocation`

### 5.8 Public API Strategy

To avoid collisions and keep the API legible, prefer **subpath exports** over a giant root barrel.

Recommended public entry points:

- `@go-go-golems/macos1-react` → `Macos1Theme` + a few top-level helpers only
- `@go-go-golems/macos1-react/theme`
- `@go-go-golems/macos1-react/primitives`
- `@go-go-golems/macos1-react/rich`
- `@go-go-golems/macos1-react/shell`
- `@go-go-golems/macos1-react/parts`

This matters because there is already a `ProgressBar` in `os-core`, so the `os-widgets` `ProgressBar.tsx` should be excluded from the extracted subset.

### 5.9 API Reference

#### 5.9.1 Theme API

```tsx
import { Macos1Theme } from '@go-go-golems/macos1-react';
import '@go-go-golems/macos1-react/theme';

<Macos1Theme>
  <MyApp />
</Macos1Theme>

<Macos1Theme theme="theme-macos1">
  <MyApp />
</Macos1Theme>
```

#### 5.9.2 Base Primitive API

```tsx
import { Btn, Checkbox, ContextMenu } from '@go-go-golems/macos1-react/primitives';
```

#### 5.9.3 Optional Rich Primitive API

```tsx
import { Sparkline, CommandPalette, WidgetToolbar } from '@go-go-golems/macos1-react/rich';
```

#### 5.9.4 Shell API

```tsx
import { DesktopMenuBar, DesktopIconLayer, WindowLayer } from '@go-go-golems/macos1-react/shell';
```

#### 5.9.5 Parts API

```tsx
import { PARTS, RICH_PARTS } from '@go-go-golems/macos1-react/parts';
```

### 5.10 CSS Custom Properties API

The token system stays CSS-first. Key categories remain:

**Layout tokens**
```css
--hc-width
--hc-max-width
--hc-height
--hc-font-family
--hc-font-size
--hc-border-radius
```

**Color tokens**
```css
--hc-color-bg
--hc-color-fg
--hc-color-border
--hc-color-muted
--hc-color-accent
--hc-color-error
--hc-color-warning
--hc-color-success
```

**Interactive tokens**
```css
--hc-context-menu-*
--hc-dropdown-*
--hc-check-*
--hc-listbox-*
```

---

## 6. Implementation Plan

### 6.1 Repo Roots and Working Paths

Use these paths consistently during implementation:

- **Current repo root:** `wesen-os/`
- **Frontend monorepo root:** `wesen-os/workspace-links/go-go-os-frontend/`
- **Target package root:** `wesen-os/workspace-links/go-go-os-frontend/packages/macos1-react/`
- **os-core package root:** `wesen-os/workspace-links/go-go-os-frontend/packages/os-core/`
- **os-widgets package root:** `wesen-os/workspace-links/go-go-os-frontend/packages/os-widgets/`
- **Ticket root:** `wesen-os/ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/`

### 6.2 Phase Plan Overview

The work should be executed in this order:

1. **Phase 0 — Scope freeze and file inventory**
2. **Phase 1 — Package scaffold and exports**
3. **Phase 2 — Theme extraction and rename to `Macos1Theme`**
4. **Phase 3 — Base primitive extraction from `os-core`**
5. **Phase 4 — Narrow rich primitive extraction from `os-widgets`**
6. **Phase 5 — Shell primitive extraction from `os-core`**
7. **Phase 6 — Integration, validation, and documentation updates**

The intern should finish each phase before starting the next one.

---

### 6.3 Phase 0 — Scope Freeze and File Inventory

**Goal:** prevent accidental scope creep before code moves.

**Must include:**
- theme files from `packages/os-core/src/theme/desktop/`
- base widgets from `packages/os-core/src/components/widgets/`
- shell primitives from `packages/os-core/src/components/shell/windowing/`
- only the approved `os-widgets` primitive subset from `packages/os-widgets/src/primitives/`

**Must exclude:**
- `packages/os-widgets/src/primitives/ProgressBar.tsx`
- all feature widget directories under `packages/os-widgets/src/`
- all reducers and `STATE_KEY` exports from `packages/os-widgets/src/*State.ts`
- `packages/os-widgets/src/launcher/modules.tsx`
- `packages/os-core/src/components/shell/windowing/useDesktopShellController.tsx`
- `packages/os-core/src/components/shell/windowing/desktopCommandRouter.ts`
- Redux windowing/runtime files

**Tasks:**
- Record the approved include list in `tasks.md` and keep it visible during implementation.
- Before copying files, verify the source locations exist under:
  - `workspace-links/go-go-os-frontend/packages/os-core/src/`
  - `workspace-links/go-go-os-frontend/packages/os-widgets/src/`
- Treat anything not listed in the approved include set as out of scope unless the ticket is updated.

**Deliverable:** a stable file inventory and no ambiguity about what the intern should touch.

---

### 6.4 Phase 1 — Package Scaffold and Exports

**Goal:** create the package structure before copying implementation files.

**Target directory to create:**
- `workspace-links/go-go-os-frontend/packages/macos1-react/`

**Directories to create:**
- `packages/macos1-react/src/theme/`
- `packages/macos1-react/src/theme/themes/`
- `packages/macos1-react/src/primitives/`
- `packages/macos1-react/src/rich/`
- `packages/macos1-react/src/rich/internal/`
- `packages/macos1-react/src/shell/`
- `packages/macos1-react/src/parts/`

**Files to create initially:**
- `packages/macos1-react/package.json`
- `packages/macos1-react/tsconfig.json`
- `packages/macos1-react/README.md`
- `packages/macos1-react/src/index.ts`
- `packages/macos1-react/src/theme/index.ts`
- `packages/macos1-react/src/primitives/index.ts`
- `packages/macos1-react/src/rich/index.ts`
- `packages/macos1-react/src/shell/index.ts`
- `packages/macos1-react/src/parts/index.ts`

**Exports to define in `package.json`:**
- `@go-go-golems/macos1-react`
- `@go-go-golems/macos1-react/theme`
- `@go-go-golems/macos1-react/primitives`
- `@go-go-golems/macos1-react/rich`
- `@go-go-golems/macos1-react/shell`
- `@go-go-golems/macos1-react/parts`

**Deliverable:** package builds as an empty scaffold with correct subpath structure.

---

### 6.5 Phase 2 — Theme Extraction and `Macos1Theme`

**Goal:** extract the CSS system first so primitives can rely on it.

**Copy these files exactly:**

| Source | Destination |
|--------|-------------|
| `packages/os-core/src/theme/desktop/tokens.css` | `packages/macos1-react/src/theme/tokens.css` |
| `packages/os-core/src/theme/desktop/primitives.css` | `packages/macos1-react/src/theme/primitives.css` |
| `packages/os-core/src/theme/desktop/shell.css` | `packages/macos1-react/src/theme/shell.css` |
| `packages/os-core/src/theme/desktop/animations.css` | `packages/macos1-react/src/theme/animations.css` |
| `packages/os-core/src/theme/desktop/syntax.css` | `packages/macos1-react/src/theme/syntax.css` |
| `packages/os-core/src/theme/desktop/theme/macos1.css` | `packages/macos1-react/src/theme/themes/macos1.css` |
| `packages/os-core/src/theme/HyperCardTheme.tsx` | `packages/macos1-react/src/theme/Macos1Theme.tsx` |

**Required edits after copy:**
- rename the React component and prop types from `HyperCardTheme` to `Macos1Theme`
- update comments/docstrings in `Macos1Theme.tsx`
- make `Macos1Theme` emit `data-widget="macos1"`
- keep compatibility for existing CSS selectors by supporting `data-widget="hypercard"` in CSS during migration
- update `packages/macos1-react/src/theme/index.ts` to import all CSS files and export `Macos1Theme`

**Deliverable:** `import '@go-go-golems/macos1-react/theme'` works, and `<Macos1Theme>` provides the CSS scope.

---

### 6.6 Phase 3 — Base Primitive Extraction from `os-core`

**Goal:** move the reusable widget layer from `os-core` into the new package.

**Copy these sources:**
- `packages/os-core/src/parts.ts` → `packages/macos1-react/src/parts/parts.ts`
- `packages/os-core/src/components/widgets/*.tsx` → `packages/macos1-react/src/primitives/`
- `packages/os-core/src/components/widgets/index.ts` → `packages/macos1-react/src/primitives/index.ts`

**Rules:**
- preserve `data-part={PARTS.*}` usage exactly
- do not rename parts or change CSS binding conventions
- do not pull in shell/controller files during this phase

**Post-copy checks:**
- verify imports inside copied primitives still resolve correctly
- update imports to `../parts/parts` or equivalent local paths where needed
- ensure `packages/macos1-react/src/parts/index.ts` exports `PARTS`

**Deliverable:** base widgets compile against the extracted theme and local `PARTS` constant.

---

### 6.7 Phase 4 — Narrow Rich Primitive Extraction from `os-widgets`

**Goal:** extract only the approved reusable primitives from `os-widgets`.

**Approved file list:**

| Source | Destination |
|--------|-------------|
| `packages/os-widgets/src/primitives/Sparkline.tsx` | `packages/macos1-react/src/rich/Sparkline.tsx` |
| `packages/os-widgets/src/primitives/ModalOverlay.tsx` | `packages/macos1-react/src/rich/ModalOverlay.tsx` |
| `packages/os-widgets/src/primitives/SearchBar.tsx` | `packages/macos1-react/src/rich/SearchBar.tsx` |
| `packages/os-widgets/src/primitives/LabeledSlider.tsx` | `packages/macos1-react/src/rich/LabeledSlider.tsx` |
| `packages/os-widgets/src/primitives/CommandPalette.tsx` | `packages/macos1-react/src/rich/CommandPalette.tsx` |
| `packages/os-widgets/src/primitives/WidgetToolbar.tsx` | `packages/macos1-react/src/rich/WidgetToolbar.tsx` |
| `packages/os-widgets/src/primitives/WidgetStatusBar.tsx` | `packages/macos1-react/src/rich/WidgetStatusBar.tsx` |
| `packages/os-widgets/src/primitives/EmptyState.tsx` | `packages/macos1-react/src/rich/EmptyState.tsx` |
| `packages/os-widgets/src/primitives/ButtonGroup.tsx` | `packages/macos1-react/src/rich/ButtonGroup.tsx` |
| `packages/os-widgets/src/primitives/Separator.tsx` | `packages/macos1-react/src/rich/Separator.tsx` |

**Support files to copy:**
- `packages/os-widgets/src/parts.ts` → `packages/macos1-react/src/parts/richParts.ts`
- `packages/os-widgets/src/theme/primitives.css` → `packages/macos1-react/src/theme/rich-primitives.css`
- `packages/os-widgets/src/theme/sparkline.css` → `packages/macos1-react/src/theme/sparkline.css`
- `packages/os-widgets/src/primitives/useAnimationLoop.ts` → `packages/macos1-react/src/rich/internal/useAnimationLoop.ts` only if a copied component actually needs it

**Explicitly do not copy:**
- `packages/os-widgets/src/primitives/ProgressBar.tsx`
- anything under `packages/os-widgets/src/log-viewer/`
- anything under `packages/os-widgets/src/chart-view/`
- anything under `packages/os-widgets/src/mac-write/`
- any other feature widget directory under `packages/os-widgets/src/`
- `packages/os-widgets/src/index.ts`
- `packages/os-widgets/src/launcher/modules.tsx`

**Required cleanup after copy:**
- rewrite `packages/macos1-react/src/rich/ButtonGroup.tsx` so it imports `Btn` from the extracted local primitives package, not `@go-go-golems/os-core`
- confirm no copied rich primitive imports Redux, `os-core`, `os-shell`, or `os-repl`
- define `packages/macos1-react/src/rich/index.ts` manually instead of copying a broad barrel from `os-widgets`

**Deliverable:** the `rich/` subpath contains only the approved reusable subset and remains React-only.

---

### 6.8 Phase 5 — Shell Primitive Extraction from `os-core`

**Goal:** extract the purely presentational desktop shell pieces without moving the desktop controller.

**Copy these files:**

| Source | Destination |
|--------|-------------|
| `packages/os-core/src/components/shell/windowing/DesktopIconLayer.tsx` | `packages/macos1-react/src/shell/DesktopIconLayer.tsx` |
| `packages/os-core/src/components/shell/windowing/DesktopMenuBar.tsx` | `packages/macos1-react/src/shell/DesktopMenuBar.tsx` |
| `packages/os-core/src/components/shell/windowing/WindowSurface.tsx` | `packages/macos1-react/src/shell/WindowSurface.tsx` |
| `packages/os-core/src/components/shell/windowing/WindowTitleBar.tsx` | `packages/macos1-react/src/shell/WindowTitleBar.tsx` |
| `packages/os-core/src/components/shell/windowing/WindowResizeHandle.tsx` | `packages/macos1-react/src/shell/WindowResizeHandle.tsx` |
| `packages/os-core/src/components/shell/windowing/WindowLayer.tsx` | `packages/macos1-react/src/shell/WindowLayer.tsx` |
| `packages/os-core/src/components/shell/windowing/useContentMinSize.ts` | `packages/macos1-react/src/shell/useContentMinSize.ts` |

**Create or extract these support files:**
- `packages/macos1-react/src/shell/windowScope.tsx` — extracted from the `DesktopWindowScopeProvider` part of `packages/os-core/src/components/shell/windowing/desktopMenuRuntime.tsx`
- `packages/macos1-react/src/shell/public-types.ts` — reduced public type surface

**Public types to expose:**
- `DesktopWindowDef`
- `DesktopIconDef`
- `DesktopMenuSection`
- `DesktopMenuEntry`
- `DesktopCommandInvocation`

**Do not move:**
- `packages/os-core/src/components/shell/windowing/useDesktopShellController.tsx`
- `packages/os-core/src/components/shell/windowing/desktopCommandRouter.ts`
- `packages/os-core/src/components/shell/windowing/contextActionRegistry.ts`
- `packages/os-core/src/components/shell/windowing/desktopContributions.ts`
- `packages/os-core/src/components/shell/windowing/windowContentAdapter.ts`

**Deliverable:** shell primitives compile in the new package while all runtime controller logic stays in `os-core`.

---

### 6.9 Phase 6 — Integration, Validation, and Documentation

**Goal:** make the new package usable from existing code and easy for future contributors to understand.

**Integration work:**
- update `packages/os-core/src/components/shell/windowing/DesktopShellView.tsx` to import:
  - `Macos1Theme` from `@go-go-golems/macos1-react`
  - `ContextMenu` and `Toast` from `@go-go-golems/macos1-react/primitives`
  - `DesktopMenuBar`, `DesktopIconLayer`, `WindowLayer` from `@go-go-golems/macos1-react/shell`
- keep `useDesktopShellController()` and runtime providers local to `os-core`

**Validation work:**
- verify `import '@go-go-golems/macos1-react/theme'` loads all required CSS
- test both `data-widget="macos1"` and legacy `data-widget="hypercard"` styling paths if compatibility is retained
- verify the copied base primitives render correctly
- verify the approved `rich/` subset renders correctly
- verify `Sparkline` styling is loaded
- verify `ButtonGroup` no longer imports from `@go-go-golems/os-core`
- verify shell components render with mock `DesktopWindowDef[]` data
- verify there is no duplicate `ProgressBar` export ambiguity
- verify TypeScript build passes
- verify Storybook stories pass

**Documentation work:**
- update the package README once implementation starts
- keep `tasks.md` and the investigation diary current as the work progresses

**Deliverable:** the package is coherent, validated, and documented enough for follow-up implementation.

---

## 7. Testing Strategy

### 7.1 CSS Token Tests
- Visual regression tests for each token category
- Test theme overlays (macos1, classic, modern)
- Test responsive breakpoints

### 7.2 Component Tests
- Unit tests for each primitive widget
- Props validation tests
- Accessibility tests (aria-* attributes)
- `data-part` attribute presence tests

### 7.3 Integration Tests
- `Macos1Theme` scoping tests
- compatibility selector tests for `data-widget="macos1"` and optional legacy `data-widget="hypercard"`
- CSS variable inheritance tests
- package subpath export compatibility tests (`/theme`, `/primitives`, `/rich`, `/shell`, `/parts`)

### 7.4 Storybook
- One story per component
- Stories for all theme variants
- Stories for all state variations (disabled, active, etc.)

---

## 8. Risks, Alternatives, and Open Questions

### 8.1 Risks

1. **Selector migration risk (`hypercard` → `macos1`)**
   The current CSS and wrapper component are built around `data-widget="hypercard"`. Renaming the public wrapper to `Macos1Theme` while changing the selector to `data-widget="macos1"` can silently break styling if any CSS file, story, or host app still assumes the old selector.

   **Mitigation:**
   - support both selectors during migration
   - add explicit tests for both selectors
   - deprecate old naming in docs before removing it in code

2. **Primitive subset drift**
   The approved `os-widgets` subset is small and deliberate. Over time there is a risk that feature-specific components start slipping into the package under the label of “primitives.”

   **Mitigation:**
   - keep an explicit include/exclude matrix in the design doc
   - require any new additions to justify why they are generic building blocks
   - treat feature widgets and reducers as out of scope by default

3. **Name collisions and ambiguous root exports**
   There is already overlap such as `ProgressBar` existing in both `os-core` widgets and `os-widgets/primitives`. A giant barrel export would make the package hard to use and hard to evolve safely.

   **Mitigation:**
   - prefer `@go-go-golems/macos1-react/primitives` and `/rich`
   - keep root exports curated
   - exclude the `os-widgets` `ProgressBar.tsx` from the extracted subset

4. **Small import rewiring tasks can be missed**
   Some files look reusable but still have local monorepo assumptions. For example, `ButtonGroup.tsx` currently imports `Btn` from `@go-go-golems/os-core`.

   **Mitigation:**
   - audit each included file for cross-package imports before copying
   - add a verification checklist item for each known cleanup

5. **Storybook/test coverage still matters**
   Even with the narrowed scope, visual regressions are possible in CSS-heavy widgets such as `Sparkline`, `CommandPalette`, and shell primitives.

   **Mitigation:**
   - preserve package-local stories
   - add smoke tests for subpath imports
   - verify both standalone rendering and `os-core` integration

### 8.2 Alternatives

1. **Keep everything in `os-core` + `os-widgets`**
   Pro: least migration work.
   Con: no standalone publishable UI package.

2. **Extract only `os-core` theme + base widgets + shell primitives**
   Pro: smallest clean package surface.
   Con: leaves out useful higher-level primitives such as `CommandPalette` and `Sparkline`.

3. **Extract `os-core` plus the narrow approved `os-widgets` primitive subset**
   Pro: best balance of reuse and conceptual cleanliness.
   Con: still requires a small amount of selective curation and import cleanup.

4. **Feature-flag or shadow-publish the extracted package first**
   Pro: lower rollout risk.
   Con: duplicates maintenance during transition.

**Recommendation:** option 3.

### 8.3 Open Questions

1. **How long should the compatibility window last for `data-widget="hypercard"`?**
   The design now proposes `Macos1Theme` + `data-widget="macos1"`, but the CSS and stories currently center on `hypercard`. We need an explicit migration policy.

2. **Do we keep a deprecated `HyperCardTheme` alias export temporarily?**
   From a migration perspective this is convenient. From a branding perspective it weakens the cleanup.

3. **Should the root package export any rich primitives at all?**
   A minimal root export (`Macos1Theme`, maybe `PARTS`) is cleaner. The more that goes into the root barrel, the more collision risk we create.

4. **Do we keep `useAnimationLoop.ts` as a public API, or only as an internal helper if needed?**
   It is small and generic, but it is not really a UI primitive by itself.

5. **Should CSS token prefixes remain `--hc-*`?**
   The public component can be renamed to `Macos1Theme` while leaving token names alone, but that leaves legacy naming in the theming API.

6. **Do we publish source-style exports or fully built `dist/` artifacts?**
   The design now recommends `dist/` exports, but the current workspace often exports source paths. This needs an explicit package publishing decision.

---

## 9. References

### 9.1 File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `os-core/src/parts.ts` | ~150 | PARTS constant enum |
| `os-core/src/theme/HyperCardTheme.tsx` | ~40 | Source of the theme scoping component to be renamed publicly to `Macos1Theme` |
| `os-core/src/theme/desktop/tokens.css` | ~250 | Design tokens |
| `os-core/src/theme/desktop/primitives.css` | ~868 | Widget CSS |
| `os-core/src/theme/desktop/shell.css` | ~200 | Window chrome CSS |
| `os-core/src/theme/desktop/animations.css` | ~20 | Keyframe animations |
| `os-core/src/theme/desktop/syntax.css` | ~50 | Syntax highlighting |
| `os-core/src/theme/desktop/theme/macos1.css` | ~20 | macos1 theme |
| `os-core/src/components/widgets/*.tsx` | ~3000 | 50+ widget components |
| `os-core/src/components/widgets/index.ts` | ~100 | Widget barrel exports |
| `os-core/src/components/shell/windowing/useDesktopShellController.tsx` | ~1221 | Shell state machine (NOT extractable) |
| `os-widgets/src/parts.ts` | ~500 | RICH_PARTS constant |
| `os-widgets/src/index.ts` | ~400 | Full rich widget export surface |
| `os-widgets/src/launcher/modules.tsx` | ~500 | Runtime launcher integration for rich widgets |
| `os-widgets/src/primitives/*.tsx` | ~1000 | Shared widget primitives |
| `os-widgets/src/theme/index.ts` | ~20 | Aggregates rich widget CSS imports |
| `os-widgets/src/theme/primitives.css` | ~250 | Primitive widget CSS |
| `os-core/src/components/shell/windowing/useContentMinSize.ts` | ~50 | Support hook required by extracted window primitives |

### 9.2 Package Dependency Context

```
Current source packages:

@go-go-golems/os-core
  └── peer: react, react-dom, react-redux, @reduxjs/toolkit

@go-go-golems/os-widgets
  ├── depends: @go-go-golems/os-repl
  └── peer: @go-go-golems/os-shell, @go-go-golems/os-core, react, react-dom, react-redux, @reduxjs/toolkit

Target extracted package intent:

@go-go-golems/macos1-react
  └── peer: react, react-dom

Optional approved subset from os-widgets:
  └── should remain React-only after local import cleanup (`ButtonGroup.tsx`) and by excluding feature/runtime modules
```

### 9.3 Key Patterns Observed

1. **CSS custom properties for theming** — all visual properties are tokenized
2. **data-part attribute convention** — components use PARTS constants for CSS binding
3. **Redux slice per widget** — each rich widget has its own slice with `STATE_KEY`, `actions`, `reducer`, `createStateSeed()`
4. **TypeScript-first** — no runtime type checking, just compile-time types
5. **Storybook for development** — every component has `.stories.tsx` companion

---

*Document generated: 2026-04-08*
*Ticket: os-widgets*