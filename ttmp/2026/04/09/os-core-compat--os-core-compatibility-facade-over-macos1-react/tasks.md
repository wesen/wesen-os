# Tasks

## Phase 0 — Scope and Rules

- [x] Read `ttmp/2026/04/09/os-core-compat--os-core-compatibility-facade-over-macos1-react/design/01-os-core-compatibility-facade-implementation-plan.md` completely before editing code.
- [x] Confirm this ticket is about **compatibility re-exports and internal rewiring**, not a repo-wide consumer migration.
- [x] Confirm `macos1-react` is already buildable before changing `os-core` imports.
- [x] Confirm runtime/controller modules stay in `os-core`.

## Phase 1 — Package Graph and Build Wiring

- [x] Edit `workspace-links/go-go-os-frontend/packages/os-core/package.json` and add `"@go-go-golems/macos1-react": "workspace:*"` under dependencies.
- [x] Refresh workspace install / lockfile from `workspace-links/go-go-os-frontend/`.
- [x] Edit `workspace-links/go-go-os-frontend/package.json` and add `packages/macos1-react` to the `build` script **before** `packages/os-core`.
- [x] Edit `workspace-links/go-go-os-frontend/package.json` and add `packages/macos1-react` to the `build:publish-v1` script **before** `packages/os-core`.
- [ ] Verify `npm run build -w packages/macos1-react` succeeds.
- [x] Verify `npm run build:dist -w packages/macos1-react` succeeds.

## Phase 2 — Rewire `DesktopShellView.tsx`

- [x] Edit `workspace-links/go-go-os-frontend/packages/os-core/src/components/shell/windowing/DesktopShellView.tsx`.
- [x] Replace local `HyperCardTheme` import with `Macos1Theme` from `@go-go-golems/macos1-react`.
- [x] Replace local `PARTS` import with `PARTS` from `@go-go-golems/macos1-react/parts`.
- [x] Replace local `ContextMenu` and `Toast` imports with imports from `@go-go-golems/macos1-react/primitives`.
- [x] Replace local `DesktopIconLayer`, `DesktopMenuBar`, and `WindowLayer` imports with imports from `@go-go-golems/macos1-react/shell`.
- [x] Keep `DesktopWindowMenuRuntimeProvider` local from `./desktopMenuRuntime`.
- [x] Keep `DesktopShellControllerResult` local from `./useDesktopShellController`.
- [x] Update JSX to use `<Macos1Theme theme={themeClass}>`.

## Phase 3 — Turn `os-core` Root Exports into Compatibility Re-exports

- [x] Edit `workspace-links/go-go-os-frontend/packages/os-core/src/index.ts`.
- [x] Replace direct widget exports from `./components/widgets` with compatibility re-exports from `@go-go-golems/macos1-react/primitives`.
- [ ] Re-export `PARTS` (and optionally `RICH_PARTS`) from `@go-go-golems/macos1-react/parts`.
- [x] Re-export `Macos1Theme` from `@go-go-golems/macos1-react`.
- [x] Decide whether to keep a deprecated compatibility alias `HyperCardTheme` at the `os-core` layer.
- [x] Keep runtime/state exports local in `os-core/src/index.ts`.

## Phase 4 — Turn `os-core` Theme Exports into Compatibility Re-exports

- [x] Edit `workspace-links/go-go-os-frontend/packages/os-core/src/theme/index.ts`.
- [x] Replace local CSS imports with `import '@go-go-golems/macos1-react/theme';`.
- [x] Export `Macos1Theme` and `Macos1ThemeProps` from `@go-go-golems/macos1-react`.
- [x] If keeping backward compatibility, also expose `HyperCardTheme` alias here.
- [x] Edit `workspace-links/go-go-os-frontend/packages/os-core/src/theme/HyperCardTheme.tsx` into a thin compatibility shim that re-exports from `@go-go-golems/macos1-react`.

## Phase 5 — Rewire `desktop-react` Exports Carefully

- [x] Edit `workspace-links/go-go-os-frontend/packages/os-core/src/desktop/react/index.ts`.
- [x] Re-export presentational shell primitives from `@go-go-golems/macos1-react/shell`:
  - `DesktopIconLayer`
  - `DesktopMenuBar`
  - `WindowLayer`
  - `WindowResizeHandle`
  - `WindowSurface`
  - `WindowTitleBar`
- [ ] Re-export shell presentational types from `@go-go-golems/macos1-react/shell` if desired.
- [x] Keep runtime/controller exports local:
  - `DesktopShell`
  - `DesktopShellView`
  - `composeDesktopContributions`
  - `DesktopWindowMenuRuntimeProvider`
  - `useDesktopShellController`
  - command routing and content adapters
- [x] Do **not** move runtime/controller files in this ticket.

## Phase 6 — Validation

- [ ] Run `npm run build -w packages/macos1-react` from `workspace-links/go-go-os-frontend/`.
- [x] Run `npm run build:dist -w packages/macos1-react` from `workspace-links/go-go-os-frontend/`.
- [x] Run `npm run build -w packages/os-core` from `workspace-links/go-go-os-frontend/`.
- [ ] Run `npm run typecheck -w packages/os-core` from `workspace-links/go-go-os-frontend/`.
- [x] Verify `packages/os-core/src/components/shell/windowing/DesktopShellView.tsx` resolves new package imports.
- [x] Verify `@go-go-golems/os-core/theme` still loads the extracted theme through the facade.
- [x] Verify `@go-go-golems/os-core` still exports base widgets such as `Btn`, `Checkbox`, and `ContextMenu`.
- [x] Verify `@go-go-golems/os-core/desktop-react` still exports both runtime pieces and shell presentational pieces.
- [x] Spot-check at least one downstream package (`os-chat`, `os-kanban`, or `os-ui-cards`) builds unchanged against `os-core`.
- [x] Spot-check at least one app (`apps/todo` or `apps/crm`) still resolves `@go-go-golems/os-core/theme` and `@go-go-golems/os-core/desktop-react`.

## Phase 7 — Follow-up / Hygiene

- [x] Update `ttmp/2026/04/09/os-core-compat--os-core-compatibility-facade-over-macos1-react/reference/01-implementation-diary.md` as work progresses.
- [x] Update `ttmp/2026/04/09/os-core-compat--os-core-compatibility-facade-over-macos1-react/changelog.md` when compatibility decisions change.
- [x] Run `docmgr doctor --ticket os-core-compat --stale-after 30` after doc updates.
- [ ] Add related file links with `docmgr doc relate` once the main touched files are finalized.
- [ ] Create a later cleanup ticket for actual source deletion and direct consumer migration, if needed.
