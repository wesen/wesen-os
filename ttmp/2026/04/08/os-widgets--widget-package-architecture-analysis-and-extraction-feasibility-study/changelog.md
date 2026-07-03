# Changelog

## 2026-04-08

- Initial workspace created


## 2026-04-08

Created comprehensive architecture analysis document with extraction feasibility study


## 2026-04-08

Identified three extraction tiers: easily extractable (~5.8K lines), refactoring needed (~2.5K lines), not extractable (~7.5K lines)


## 2026-04-08

Discovered CSS custom property theming system with 100+ tokens in tokens.css


## 2026-04-08

Discovered macos1 theme as thin 20-line overlay on base tokens


## 2026-04-08

Narrowed extraction plan to os-core theme/base/shell plus only the approved os-widgets primitive subset; added detailed implementation tasks

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md — Updated scope and implementation plan
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/tasks.md — Added detailed ticket tasks


## 2026-04-09

Reworked implementation plan into intern-friendly phases with exact source and destination paths; rewrote tasks.md as a phased execution checklist

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md — Phased implementation plan with repo paths
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/tasks.md — Phased task checklist with precise paths


## 2026-04-09

Phase 0: Verified all source files exist - confirmed approved os-widgets subset (10 files) and os-core theme files are present at expected paths

### Related Files

- /workspace-links/go-go-os-frontend/packages/macos1-react/ — New package directory (staged for commit)


## 2026-04-09

Phase 1: Created scaffold for @go-go-golems/macos1-react package - created directory structure, package.json with subpath exports, tsconfig.json, README.md, stub index files for all subpaths (theme, primitives, rich, shell, parts), and Macos1Theme stub (52e5c37)

### Related Files

- /workspace-links/go-go-os-frontend/packages/macos1-react/package.json — Package config with exports and sideEffects
- /workspace-links/go-go-os-frontend/packages/macos1-react/tsconfig.json — TypeScript config matching os-core
- /workspace-links/go-go-os-frontend/packages/macos1-react/README.md — Usage documentation
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/index.ts — Root package exports
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/theme/index.ts — Theme subpath
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/primitives/index.ts — Primitives subpath
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/rich/index.ts — Rich subpath
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/shell/index.ts — Shell subpath
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/parts/index.ts — Parts subpath
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/shell/public-types.ts — Public shell types



## 2026-04-09

Advice fix: Updated package.json exports to point to dist/ instead of src/ to match published package output (f24b23c)

### Related Files

- /workspace-links/go-go-os-frontend/packages/macos1-react/package.json — Exports now use ./dist/... paths


## 2026-04-09

Phase 2: Extracted theme system from os-core - copied all CSS (tokens, primitives, shell, animations, syntax), updated selectors to support both data-widget="macos1" (canonical) and data-widget="hypercard" (legacy), created Macos1Theme component with data-widget="macos1" emission (3c0dc91)

### Related Files

- /workspace-links/go-go-os-frontend/packages/macos1-react/src/theme/tokens.css — Design tokens
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/theme/primitives.css — Widget CSS
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/theme/shell.css — Window chrome CSS
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/theme/themes/macos1.css — Theme overlay
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/theme/Macos1Theme.tsx — Theme scoping component


## 2026-04-09

Phase 3: Extracted 30 base widgets from os-core to primitives/ - copied all widget components and 31 Storybook story files, copied types.ts, updated imports (PARTS from ../parts/parts, types from ./types), build succeeds (19b029f)

### Related Files

- /workspace-links/go-go-os-frontend/packages/macos1-react/src/primitives/ — 30 widgets + 31 stories
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/parts/parts.ts — PARTS constant
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/primitives/types.ts — Shared types


## 2026-04-09

Added Storybook configuration to macos1-react - created .storybook/main.ts and preview.ts, added storybook scripts to package.json, updated root Storybook config with macos1-react stories and alias (ce56a95, 9b1162b)

### Related Files

- /workspace-links/go-go-os-frontend/packages/macos1-react/.storybook/main.ts — Package Storybook config
- /workspace-links/go-go-os-frontend/packages/macos1-react/.storybook/preview.ts — Theme decorator
- /workspace-links/go-go-os-frontend/.storybook/main.ts — Updated root config


## 2026-04-09

Phase 4: Extracted 10 approved os-widgets primitives to rich/ - Sparkline, ModalOverlay, SearchBar, LabeledSlider, CommandPalette, WidgetToolbar, WidgetStatusBar, EmptyState, ButtonGroup, Separator; copied RICH_PARTS, rich CSS files; rewired ButtonGroup to import Btn from local primitives (817ff1a)

### Related Files

- /workspace-links/go-go-os-frontend/packages/macos1-react/src/rich/ — 10 primitive components + stories
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/parts/richParts.ts — RICH_PARTS constant
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/theme/rich-primitives.css — Rich widget CSS
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/theme/sparkline.css — Sparkline CSS


## 2026-04-09

Phase 5: Extracted 7 shell primitives from os-core to shell/ - DesktopIconLayer, DesktopMenuBar, WindowSurface, WindowTitleBar, WindowResizeHandle, WindowLayer, useContentMinSize; copied types.ts and storyFixtures; created windowScope.tsx with DesktopWindowScopeProvider; removed stories referencing excluded files; build succeeds (d82dc5e)

### Related Files

- /workspace-links/go-go-os-frontend/packages/macos1-react/src/shell/ — 7 shell components + 4 stories
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/shell/types.ts — Full shell types
- /workspace-links/go-go-os-frontend/packages/macos1-react/src/shell/windowScope.tsx — Window scope context


## 2026-04-09

Phase 6 deferred: Attempted to rewire os-core imports to use macos1-react but encountered workspace setup complexity (pnpm lockfile, vite config, TypeScript composite mode issues). os-core keeps its local copies; macos1-react available as standalone package (b9b066a)
