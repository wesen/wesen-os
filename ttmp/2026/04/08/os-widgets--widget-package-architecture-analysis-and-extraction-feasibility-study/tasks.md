# Tasks

## Working Paths

- **Current repo root:** `wesen-os/`
- **Frontend monorepo root:** `wesen-os/workspace-links/go-go-os-frontend/`
- **Target package root:** `wesen-os/workspace-links/go-go-os-frontend/packages/macos1-react/`
- **os-core root:** `wesen-os/workspace-links/go-go-os-frontend/packages/os-core/`
- **os-widgets root:** `wesen-os/workspace-links/go-go-os-frontend/packages/os-widgets/`
- **Ticket root:** `wesen-os/ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/`

## Scope Guardrails

### Include
- `packages/os-core/src/theme/desktop/*`
- `packages/os-core/src/theme/HyperCardTheme.tsx` (to be renamed publicly to `Macos1Theme`)
- `packages/os-core/src/components/widgets/*`
- `packages/os-core/src/parts.ts`
- presentational shell files from `packages/os-core/src/components/shell/windowing/`
- approved `os-widgets` primitive subset from `packages/os-widgets/src/primitives/`

### Exclude
- `packages/os-widgets/src/primitives/ProgressBar.tsx`
- feature widget directories under `packages/os-widgets/src/` such as `log-viewer/`, `chart-view/`, `mac-write/`, etc.
- reducers / state slices / `STATE_KEY` exports
- `packages/os-widgets/src/index.ts`
- `packages/os-widgets/src/launcher/modules.tsx`
- `packages/os-core/src/components/shell/windowing/useDesktopShellController.tsx`
- `packages/os-core/src/components/shell/windowing/desktopCommandRouter.ts`
- `packages/os-core/src/components/shell/windowing/contextActionRegistry.ts`
- `packages/os-core/src/components/shell/windowing/desktopContributions.ts`
- `packages/os-core/src/components/shell/windowing/windowContentAdapter.ts`

## Phase 0 — Read and Freeze Scope

- [x] Read `ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/design/01-widget-package-architecture-analysis-and-extraction-feasibility-study.md` completely before changing code.
- [x] Read `ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/reference/01-investigation-diary.md` for prior decisions and caveats.
- [x] Confirm the target package path is `workspace-links/go-go-os-frontend/packages/macos1-react/`.
- [x] Confirm the approved `os-widgets` subset is exactly:
  - `packages/os-widgets/src/primitives/Sparkline.tsx`
  - `packages/os-widgets/src/primitives/ModalOverlay.tsx`
  - `packages/os-widgets/src/primitives/SearchBar.tsx`
  - `packages/os-widgets/src/primitives/LabeledSlider.tsx`
  - `packages/os-widgets/src/primitives/CommandPalette.tsx`
  - `packages/os-widgets/src/primitives/WidgetToolbar.tsx`
  - `packages/os-widgets/src/primitives/WidgetStatusBar.tsx`
  - `packages/os-widgets/src/primitives/EmptyState.tsx`
  - `packages/os-widgets/src/primitives/ButtonGroup.tsx`
  - `packages/os-widgets/src/primitives/Separator.tsx`
- [x] Treat anything not in the include list as out of scope unless the ticket docs are updated first.

## Phase 1 — Scaffold the New Package

- [x] Create `workspace-links/go-go-os-frontend/packages/macos1-react/`.
- [x] Create directories:
  - `packages/macos1-react/src/theme/`
  - `packages/macos1-react/src/theme/themes/`
  - `packages/macos1-react/src/primitives/`
  - `packages/macos1-react/src/rich/`
  - `packages/macos1-react/src/rich/internal/`
  - `packages/macos1-react/src/shell/`
  - `packages/macos1-react/src/parts/`
- [x] Create initial files:
  - `packages/macos1-react/package.json`
  - `packages/macos1-react/tsconfig.json`
  - `packages/macos1-react/README.md`
  - `packages/macos1-react/src/index.ts`
  - `packages/macos1-react/src/theme/index.ts`
  - `packages/macos1-react/src/primitives/index.ts`
  - `packages/macos1-react/src/rich/index.ts`
  - `packages/macos1-react/src/shell/index.ts`
  - `packages/macos1-react/src/parts/index.ts`
- [x] Add subpath exports in `packages/macos1-react/package.json` for:
  - `.`
  - `./theme`
  - `./primitives`
  - `./rich`
  - `./shell`
  - `./parts`
- [x] Add CSS side effects in `packages/macos1-react/package.json` so CSS imports are not tree-shaken away.

## Phase 2 — Extract Theme and Rename to `Macos1Theme`

- [x] Copy `packages/os-core/src/theme/desktop/tokens.css` → `packages/macos1-react/src/theme/tokens.css`.
- [x] Copy `packages/os-core/src/theme/desktop/primitives.css` → `packages/macos1-react/src/theme/primitives.css`.
- [x] Copy `packages/os-core/src/theme/desktop/shell.css` → `packages/macos1-react/src/theme/shell.css`.
- [x] Copy `packages/os-core/src/theme/desktop/animations.css` → `packages/macos1-react/src/theme/animations.css`.
- [x] Copy `packages/os-core/src/theme/desktop/syntax.css` → `packages/macos1-react/src/theme/syntax.css`.
- [x] Copy `packages/os-core/src/theme/desktop/theme/macos1.css` → `packages/macos1-react/src/theme/themes/macos1.css`.
- [x] Copy `packages/os-core/src/theme/HyperCardTheme.tsx` → `packages/macos1-react/src/theme/Macos1Theme.tsx`.
- [x] Rename the React component and exported prop types from `HyperCardTheme` to `Macos1Theme` in `packages/macos1-react/src/theme/Macos1Theme.tsx`.
- [x] Make `Macos1Theme` emit `data-widget="macos1"`.
- [x] Keep compatibility for existing CSS selectors by supporting `data-widget="hypercard"` in the extracted CSS during migration.
- [x] Update `packages/macos1-react/src/theme/index.ts` to import all theme CSS files and export `Macos1Theme`.

## Phase 3 — Extract Base Widgets from `os-core`

- [x] Copy `packages/os-core/src/parts.ts` → `packages/macos1-react/src/parts/parts.ts`.
- [x] Copy the widget components from `packages/os-core/src/components/widgets/` into `packages/macos1-react/src/primitives/`.
- [x] Copy `packages/os-core/src/components/widgets/index.ts` → `packages/macos1-react/src/primitives/index.ts`.
- [x] Update imports in copied primitives so they resolve against local files under `packages/macos1-react/src/`.
- [x] Preserve all `data-part={PARTS.*}` usage exactly; do not rename part names.
- [x] Export `PARTS` from `packages/macos1-react/src/parts/index.ts`.

## Phase 4 — Extract the Approved `os-widgets` Primitive Subset

- [x] Copy `packages/os-widgets/src/primitives/Sparkline.tsx` → `packages/macos1-react/src/rich/Sparkline.tsx`.
- [x] Copy `packages/os-widgets/src/primitives/ModalOverlay.tsx` → `packages/macos1-react/src/rich/ModalOverlay.tsx`.
- [x] Copy `packages/os-widgets/src/primitives/SearchBar.tsx` → `packages/macos1-react/src/rich/SearchBar.tsx`.
- [x] Copy `packages/os-widgets/src/primitives/LabeledSlider.tsx` → `packages/macos1-react/src/rich/LabeledSlider.tsx`.
- [x] Copy `packages/os-widgets/src/primitives/CommandPalette.tsx` → `packages/macos1-react/src/rich/CommandPalette.tsx`.
- [x] Copy `packages/os-widgets/src/primitives/WidgetToolbar.tsx` → `packages/macos1-react/src/rich/WidgetToolbar.tsx`.
- [x] Copy `packages/os-widgets/src/primitives/WidgetStatusBar.tsx` → `packages/macos1-react/src/rich/WidgetStatusBar.tsx`.
- [x] Copy `packages/os-widgets/src/primitives/EmptyState.tsx` → `packages/macos1-react/src/rich/EmptyState.tsx`.
- [x] Copy `packages/os-widgets/src/primitives/ButtonGroup.tsx` → `packages/macos1-react/src/rich/ButtonGroup.tsx`.
- [x] Copy `packages/os-widgets/src/primitives/Separator.tsx` → `packages/macos1-react/src/rich/Separator.tsx`.
- [x] Copy `packages/os-widgets/src/parts.ts` → `packages/macos1-react/src/parts/richParts.ts`.
- [x] Copy `packages/os-widgets/src/theme/primitives.css` → `packages/macos1-react/src/theme/rich-primitives.css`.
- [x] Copy `packages/os-widgets/src/theme/sparkline.css` → `packages/macos1-react/src/theme/sparkline.css`.
- [x] Copy `packages/os-widgets/src/primitives/useAnimationLoop.ts` → `packages/macos1-react/src/rich/internal/useAnimationLoop.ts` only if one of the copied components needs it. (Not needed - no components use it)
- [x] Do **not** copy `packages/os-widgets/src/primitives/ProgressBar.tsx`.
- [x] Do **not** copy `packages/os-widgets/src/index.ts`.
- [x] Do **not** copy `packages/os-widgets/src/launcher/modules.tsx`.
- [x] Do **not** copy any feature widget directories under `packages/os-widgets/src/`.
- [x] Write `packages/macos1-react/src/rich/index.ts` manually so it exports only the approved rich subset.
- [x] Rewire `packages/macos1-react/src/rich/ButtonGroup.tsx` to import `Btn` from the local extracted primitives package instead of `@go-go-golems/os-core`.
- [x] Verify the copied `rich/` subset has no imports from Redux, `os-core`, `os-shell`, or `os-repl`.

## Phase 5 — Extract Shell Primitives from `os-core`

- [x] Copy `packages/os-core/src/components/shell/windowing/DesktopIconLayer.tsx` → `packages/macos1-react/src/shell/DesktopIconLayer.tsx`.
- [x] Copy `packages/os-core/src/components/shell/windowing/DesktopMenuBar.tsx` → `packages/macos1-react/src/shell/DesktopMenuBar.tsx`.
- [x] Copy `packages/os-core/src/components/shell/windowing/WindowSurface.tsx` → `packages/macos1-react/src/shell/WindowSurface.tsx`.
- [x] Copy `packages/os-core/src/components/shell/windowing/WindowTitleBar.tsx` → `packages/macos1-react/src/shell/WindowTitleBar.tsx`.
- [x] Copy `packages/os-core/src/components/shell/windowing/WindowResizeHandle.tsx` → `packages/macos1-react/src/shell/WindowResizeHandle.tsx`.
- [x] Copy `packages/os-core/src/components/shell/windowing/WindowLayer.tsx` → `packages/macos1-react/src/shell/WindowLayer.tsx`.
- [x] Copy `packages/os-core/src/components/shell/windowing/useContentMinSize.ts` → `packages/macos1-react/src/shell/useContentMinSize.ts`.
- [x] Extract the `DesktopWindowScopeProvider` portion of `packages/os-core/src/components/shell/windowing/desktopMenuRuntime.tsx` into `packages/macos1-react/src/shell/windowScope.tsx`.
- [x] Create `packages/macos1-react/src/shell/types.ts` with the full shell type surface needed by consumers.
- [x] Export only the reduced public shell types from `packages/macos1-react/src/shell/index.ts`.
- [x] Do **not** move `packages/os-core/src/components/shell/windowing/useDesktopShellController.tsx`.
- [x] Do **not** move `packages/os-core/src/components/shell/windowing/desktopCommandRouter.ts`.
- [x] Do **not** move `packages/os-core/src/components/shell/windowing/contextActionRegistry.ts`.
- [x] Do **not** move `packages/os-core/src/components/shell/windowing/desktopContributions.ts`.
- [x] Do **not** move `packages/os-core/src/components/shell/windowing/windowContentAdapter.ts`.

## Phase 6 — Rewire Existing Consumers and Validate ⚠️ DEFERRED

**Note:** Phase 6 rewiring was deferred due to workspace setup complexity. The macos1-react package is available as a standalone package, but os-core continues to use its local copies.

**What requires future work:**
- Add macos1-react to pnpm workspace (pnpm-lock.yaml update)
- Add path aliases to os-core tsconfig
- Update vite configs to recognize @go-go-golems/macos1-react
- Build macos1-react before os-core
- Update DesktopShellView.tsx to import from macos1-react

**Completed:**
- [x] TypeScript build succeeds for macos1-react
- [x] CSS files correctly copied to dist/ via build:dist
- [x] Storybook configuration added
- [x] Root Storybook config updated with macos1-react alias

**Deferred tasks:**
- [ ] Update `packages/os-core/src/components/shell/windowing/DesktopShellView.tsx` to import from macos1-react
- [ ] Verify `import '@go-go-golems/macos1-react/theme'` loads the full CSS pack
- [ ] Verify `<Macos1Theme>` styles content correctly
- [ ] Verify all copied base primitives render correctly
- [ ] Verify the approved `rich/` subset renders correctly
- [ ] Run Storybook for the extracted components

## Phase 7 — Ticket Hygiene

- [ ] Update `ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/reference/01-investigation-diary.md` after each meaningful implementation milestone.
- [ ] Update `ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/changelog.md` when scope or implementation decisions change.
- [ ] Re-run `docmgr doctor --ticket os-widgets --stale-after 30` after doc changes.
- [ ] Re-upload the ticket bundle to reMarkable when the design/tasks materially change.
