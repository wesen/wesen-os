---
title: Widget Showcase Plan for @go-go-golems/macos1-react
doc-type: design-doc
status: draft
intent: medium-term
ticket: macos1-react
date: 2026-04-09
author: pi coding agent
topics:
  - widgets
  - showcase
  - storybook
  - macos1
  - react
description: >-
  Design document for organizing widget showcases in Storybook.
  Defines folder structure, showcase categories, and assembly designs
  that combine multiple widgets into coherent demonstrations.
---

# Widget Showcase Plan for @go-go-golems/macos1-react

## Overview

This document defines a comprehensive showcase strategy for the macos1-react widget package. The goal is to create **assembly showcases** that demonstrate how widgets work together, going beyond individual component stories to show real-world widget compositions.

## Current State

The package currently has:
- **36 individual component stories** (one per widget)
- **1 monolithic showcase** (`MacOS1Showcase`) that shows everything

## Proposed Structure

### Storybook Folder Organization

```
macos1-react/
├── stories/
│   ├── showcases/           # Assembly showcases (multi-widget)
│   │   ├── Controls/        # Form control compositions
│   │   ├── Feedback/        # Status and notification compositions
│   │   ├── Layout/          # Layout and structure compositions
│   │   ├── Data/            # Data display compositions
│   │   ├── Forms/           # Form compositions
│   │   ├── Desktop/         # Desktop shell compositions
│   │   └── Rich/            # Rich widget compositions
│   │
│   └── primitives/          # Individual widget stories
│       ├── Controls/
│       ├── Feedback/
│       ├── Layout/
│       ├── Data/
│       ├── Forms/
│       └── Primitives/
│
├── shell/
│   └── *.tsx + *.stories.tsx
│
└── rich/
    └── *.tsx + *.stories.tsx
```

## Showcase Categories

### 1. Controls Showcase (`stories/showcases/Controls/`)

**Concept:** Classic macOS System 1 control panel

**Widgets demonstrated:**
- `Btn` - Push buttons with states
- `Checkbox` - Toggle options
- `RadioButton` - Single selection
- `DropdownMenu` - Selector popup
- `ListBox` - Scrollable selection list
- `TabControl` - Tabbed interface

**Assembly Design: `ControlPanel.stories.tsx`**
```
┌─────────────────────────────────────────────┐
│  Control Panel                          [_][□][X] │
├─────────────────────────────────────────────┤
│                                              │
│  PUSH BUTTONS                                │
│  ┌─────┐ ┌────────┐ ┌──────────┐            │
│  │ OK  │ │ Cancel │ │  Apply   │            │
│  └─────┘ └────────┘ └──────────┘            │
│                                              │
│  CHECKBOXES        RADIO BUTTONS            │
│  ☑ Bold           ○ 9pt  ● 10pt  ○ 12pt   │
│  ☐ Italic                                     │
│  ☑ Underline                                  │
│                                              │
│  DROPDOWN SELECTOR                           │
│  ┌────────────────┐ ▼                        │
│  │    Geneva      │                           │
│  └────────────────┘                           │
│                                              │
│  LIST BOX              DISCLOSURE TRIANGLE   │
│  ┌──────────────┐    ▶ System Folder         │
│  │ > MacPaint   │      ├─ System              │
│  │   MacWrite   │      └─ Finder             │
│  │   Finder     │    ▶ Applications          │
│  └──────────────┘                             │
│                                              │
└─────────────────────────────────────────────┘
```

### 2. Feedback Showcase (`stories/showcases/Feedback/`)

**Concept:** Status and notification system

**Widgets demonstrated:**
- `ProgressBar` - Progress indicator
- `Toast` - Transient notification
- `AlertDialog` - Modal alert (note/caution/stop)
- `ContextMenu` - Right-click menu

**Assembly Design: `FeedbackPatterns.stories.tsx`**
```
Story 1: Progress with Toast
┌─────────────────────────────────────┐
│  Copying files...                  │
│  ████████████░░░░░░░░ 65%        │
│                                     │
│  [Toast: "3 files copied"]         │
└─────────────────────────────────────┘

Story 2: Alert Dialogs
┌─────────────────────────────────────┐
│       ⚠️                           │
│    Are you sure you want to        │
│    erase the disk?                 │
│                                     │
│       [Cancel]  [Erase]           │
└─────────────────────────────────────┘

Story 3: Context Menu
┌─────────────────────────────────────┐
│  📄 Document.txt                    │
│                                     │
│  ┌─────────────────────┐           │
│  │ Get Info            │ ← hover   │
│  │ Duplicate           │           │
│  │ ─────────────────── │           │
│  │ Open                │           │
│  │ Open With…          │           │
│  │ ─────────────────── │           │
│  │ Move to Trash       │           │
│  └─────────────────────┘           │
└─────────────────────────────────────┘
```

### 3. Layout Showcase (`stories/showcases/Layout/`)

**Concept:** Structural and organizational widgets

**Widgets demonstrated:**
- `DisclosureTriangle` - Collapsible sections
- `ToolPalette` - Tool selection grid
- `MenuGrid` - Icon menu grid
- `Chip` - Tags and labels
- `Separator` - Visual divider

**Assembly Design: `LayoutPatterns.stories.tsx`**
```
Story 1: Nested Disclosure
┌─────────────────────────────────────┐
│  ▶ System Folder                   │
│  │  ├─ System                      │
│  │  │  ├─ System                  │
│  │  │  └─ Finder                  │
│  │  └─ Extensions                   │
│  │     └─ [collapsed]              │
│  ▶ Applications                    │
│  ▶ Documents                       │
└─────────────────────────────────────┘

Story 2: Tool Palette
┌──────┬──────┬──────┬──────┐
│ ✏️   │ 🖌️  │ 🪣  │ 🔲  │ ...
│ Pen  │ Brush│ Fill │ Rect │
└──────┴──────┴──────┴──────┘

Story 3: Chip Tags
┌─────────────────────────────────────┐
│  Tagged:                           │
│  ┌────────┐ ┌────────┐ ┌────────┐│
│  │ Design │ │   UI   │ │  Bug   ││
│  └────────┘ └────────┘ └────────┘│
└─────────────────────────────────────┘
```

### 4. Data Showcase (`stories/showcases/Data/`)

**Concept:** Data display and manipulation

**Widgets demonstrated:**
- `DataTable` - Tabular data
- `ListView` - Multi-select list
- `SelectableList` - Selectable list with search
- `DetailView` - Key-value display
- `ReportView` - Formatted report
- `GridBoard` - Grid selection

**Assembly Design: `DataExplorer.stories.tsx`**
```
Story 1: Data Table with Selection
┌─────────────────────────────────────────────┐
│  Documents                        [Search] │
├─────────────────────────────────────────────┤
│  □ Name        │ Size   │ Modified       │
│  ─────────────────────────────────────────  │
│  ■ report.pdf  │ 2.3 MB │ Today 10:30   │
│  □ notes.txt   │ 12 KB  │ Yesterday     │
│  □ budget.xls  │ 890 KB │ Apr 1, 2026   │
├─────────────────────────────────────────────┤
│  3 items selected                           │
└─────────────────────────────────────────────┘

Story 2: Detail View
┌─────────────────────────────────────────────┐
│  📄 report.pdf                             │
├─────────────────────────────────────────────┤
│  Name:        report.pdf                   │
│  Size:        2.3 MB                     │
│  Created:     Apr 1, 2026                 │
│  Modified:    Today 10:30                 │
│  Kind:        PDF Document                │
│  Location:    ~/Documents                 │
└─────────────────────────────────────────────┘
```

### 5. Forms Showcase (`stories/showcases/Forms/`)

**Concept:** Complete form compositions

**Widgets demonstrated:**
- `FormView` - Form container
- `SchemaFormRenderer` - Dynamic schema form
- `FieldRow` - Labeled field
- `FilterBar` - Search/filter bar
- `FilePickerDropzone` - File upload
- `ImageChoiceGrid` - Image selection
- `RatingPicker` - Star rating
- `RequestActionBar` - Form actions

**Assembly Design: `FormPatterns.stories.tsx`**
```
Story 1: Settings Form
┌─────────────────────────────────────────────┐
│  Settings                                  │
├─────────────────────────────────────────────┤
│  General                                   │
│  ┌──────────────────────────────┐          │
│  │ Name:  [John Appleseed     ] │          │
│  └──────────────────────────────┘          │
│  ┌──────────────────────────────┐          │
│  │ Email: [john@apple.com     ]│          │
│  └──────────────────────────────┘          │
│                                              │
│  ☐ Receive notifications                     │
│  ☑ Dark mode                               │
│                                              │
│  Theme:  ┌────────────────┐ ▼              │
│          │   System       │                │
│          └────────────────┘                │
│                                              │
│              [Cancel]  [Save Changes]       │
└─────────────────────────────────────────────┘

Story 2: File Upload
┌─────────────────────────────────────────────┐
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │      📁 Drop files here              │  │
│  │         or click to browse           │  │
│  │                                      │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                              │
│  Attached:                                   │
│  📄 document.pdf (2.3 MB)           [×]     │
│  📄 notes.txt (12 KB)               [×]     │
└─────────────────────────────────────────────┘
```

### 6. Desktop Showcase (`stories/showcases/Desktop/`)

**Concept:** Desktop shell compositions

**Widgets demonstrated:**
- `DesktopMenuBar` - Top menu bar
- `DesktopIconLayer` - Desktop icons
- `WindowSurface` - Window chrome
- `WindowTitleBar` - Title bar with buttons
- `WindowResizeHandle` - Resize handles

**Assembly Design: `DesktopPatterns.stories.tsx`**
```
Story 1: Menu Bar
┌─────────────────────────────────────────────┐
│  📁 File  Edit View Window Help            │
└─────────────────────────────────────────────┘

Story 2: Window Chrome
┌─────────────────────────────────────────────┐
│  ● ● ●  Document.txt - TextEdit     [_][□][X]│
├─────────────────────────────────────────────┤
│                                              │
│  Lorem ipsum dolor sit amet...                │
│                                              │
│                                              │
│                                              │
│                                              │
└─────────────────────────────────────────────┘

Story 3: Desktop Icons
┌─────────────────────────────────────────────┐
│  📁 System        📄 Notes                  │
│                                              │
│  📁 Applications  📄 Budget                 │
│                                              │
│  📁 Documents     📄 Report                 │
│                                              │
│                                              │
└─────────────────────────────────────────────┘
```

### 7. Rich Widgets Showcase (`stories/showcases/Rich/`)

**Concept:** Advanced composed widgets

**Widgets demonstrated:**
- `Sparkline` - Inline chart
- `CommandPalette` - Fuzzy search command palette
- `SearchBar` - Search with count
- `LabeledSlider` - Slider with label
- `WidgetToolbar` - Toolbar container
- `WidgetStatusBar` - Status bar
- `EmptyState` - Empty placeholder
- `ButtonGroup` - Button group
- `ModalOverlay` - Modal overlay

**Assembly Design: `RichPatterns.stories.tsx`**
```
Story 1: Command Palette
┌─────────────────────────────────────────────┐
│  ⌘ Command Palette              [ESC]      │
│  ┌─────────────────────────────────────┐  │
│  │ 🔍 >                                │  │
│  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────┐  │
│  │ 📄 New Document          ⌘N        │  │
│  │ 📁 Open Folder           ⌘O        │  │
│  │ 💾 Save                  ⌘S        │  │
│  │ ⚙️ Preferences           ⌘,        │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

Story 2: Widget Toolbar + Sparkline
┌─────────────────────────────────────────────┐
│  [▶ Run] [⏹ Stop] [↻ Reset]    [📊 ───] │
│                                              │
│  CPU Usage:  ╱╲╱╲╱╲                        │
│              ████▌▌▌▌▌▌▌                     │
│                                              │
│  ┌────────────────────────────────────────┐│
│  │ Status: Running  │  Time: 00:45:23     ││
│  └────────────────────────────────────────┘│
└─────────────────────────────────────────────┘

Story 3: Empty State
┌─────────────────────────────────────────────┐
│                                              │
│                                              │
│              📭                              │
│                                              │
│         No items to display                  │
│                                              │
│       [Create New Item]                      │
│                                              │
│                                              │
└─────────────────────────────────────────────┘
```

### 8. Full Application Showcase (`stories/showcases/App/`)

**Concept:** Complete mini-applications

**Assembly Designs:**

#### `DesktopShell.stories.tsx`
Full desktop environment simulation with:
- Menu bar
- Icon layer
- Windows
- Context menus
- Toast notifications

#### `SettingsApp.stories.tsx`
Settings dialog simulation with:
- Tab control
- Form fields
- Checkboxes and dropdowns
- Buttons

#### `DataBrowser.stories.tsx`
Data browser with:
- Data table
- Detail view
- Toolbar
- Status bar

#### `CommandCenter.stories.tsx`
Command palette + tool palette with:
- Command palette overlay
- Tool selection
- Status indicators

## Implementation Plan

### Phase 1: Restructure Stories
1. Create `stories/showcases/` directory
2. Move existing `MacOS1Showcase.stories.tsx` to `stories/showcases/App/MacOS1Showcase.stories.tsx`
3. Update `.storybook/main.ts` to include `stories/` directory

### Phase 2: Create Category Showcases
1. `ControlsPanel.stories.tsx`
2. `FeedbackPatterns.stories.tsx`
3. `LayoutPatterns.stories.tsx`
4. `DataPatterns.stories.tsx`
5. `FormPatterns.stories.tsx`
6. `DesktopPatterns.stories.tsx`
7. `RichPatterns.stories.tsx`

### Phase 3: Create App Showcases
1. `SettingsApp.stories.tsx`
2. `DataBrowser.stories.tsx`
3. `CommandCenter.stories.tsx`

### Phase 4: Cleanup
1. Remove or deprecate old `MacOS1Showcase` (after migration)
2. Add documentation links
3. Verify all stories render correctly

## Story Metadata Convention

Each showcase story should have:
```typescript
const meta = {
  title: 'Showcases/Category/Name',
  component: ComponentName,
  parameters: {
    layout: 'padded', // or 'fullscreen' for desktop
    docs: {
      description: {
        component: 'Description of what this showcases',
      },
    },
  },
};
```

## Fixture Data Strategy

- Use `*/fixtures/` directories for complex fixture data
- Keep simple fixtures inline in stories
- Share fixtures across related stories where appropriate

## Technical Notes

- Showcases should be self-contained (no external dependencies)
- Use `Macos1Theme` wrapper in all stories
- Stories should demonstrate the **canonical use case**, not edge cases
- Edge cases belong in individual widget stories

## Open Questions

1. Should we keep the old `primitives/*.stories.tsx` flat structure or move everything to `stories/`?
2. Should app showcases be in a separate `stories/apps/` directory?
3. How do we handle stories that span multiple categories?
4. Should we create interactive documentation pages (Docs tab)?

---

*Document created: 2026-04-09*
*Status: draft*
