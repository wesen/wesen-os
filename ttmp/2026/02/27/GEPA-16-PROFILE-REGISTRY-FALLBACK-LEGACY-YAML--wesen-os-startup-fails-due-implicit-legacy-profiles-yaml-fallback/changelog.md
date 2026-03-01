# Changelog

## 2026-02-27

- Initial workspace created
- Added full bug report and source-level implementation research for implicit legacy `profiles.yaml` fallback startup failures.
- Added chronological investigation diary with reproduction matrix and root-cause evidence across `wesen-os`, `geppetto`, and `pinocchio`.
- Added actionable remediation plan covering middleware API changes, error UX improvements, and regression testing strategy.
- Added Playwright-backed context-menu regression findings and implemented fix in `go-go-os` for app/widget right-click menu routing.

## 2026-02-27

Completed GEPA-16 bug report and implementation research: reproduced wesen-os startup failure, traced implicit pinocchio fallback in geppetto middleware bootstrap, and proposed host-configurable fallback + richer error context remediation path.

### Related Files

- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/geppetto/pkg/profiles/source_chain.go — Error context propagation point for YAML source failures
- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/geppetto/pkg/sections/sections.go — Root fallback policy and config namespace coupling
- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/ttmp/2026/02/27/GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML--wesen-os-startup-fails-due-implicit-legacy-profiles-yaml-fallback/design-doc/01-bug-report-and-implementation-research-legacy-profiles-fallback-startup-failure.md — Primary deliverable
- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/ttmp/2026/02/27/GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML--wesen-os-startup-fails-due-implicit-legacy-profiles-yaml-fallback/reference/01-investigation-diary.md — Chronological evidence


## 2026-02-27

Added Playwright debug diary for icon/context-menu issue in Apps Browser: right-click on app icons currently resolves to window-context actions due bubbling from child contextmenu handlers to WindowSurface.

### Related Files

- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-gepa/ttmp/2026/02/27/GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML--wesen-os-startup-fails-due-implicit-legacy-profiles-yaml-fallback/reference/01-investigation-diary.md — Playwright session and reproduction evidence
- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os/apps/apps-browser/src/components/AppIcon.tsx — Child icon context handler currently missing stopPropagation
- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os/apps/apps-browser/src/components/BrowserColumns.tsx — Module row context handler currently missing stopPropagation
- /home/manuel/workspaces/2026-02-22/add-gepa-optimizer/go-go-os/packages/engine/src/components/shell/windowing/WindowSurface.tsx — Window surface contextmenu opens window-context on bubbled events
