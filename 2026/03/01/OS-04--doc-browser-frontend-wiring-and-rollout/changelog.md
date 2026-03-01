# Changelog

## 2026-03-01

- Created OS-04 ticket workspace for doc browser frontend wiring and rollout.
- Added detailed implementation plan document:
  - `design-doc/01-doc-browser-frontend-wiring-implementation-plan.md`
- Replaced placeholder tasks with phased execution checklist covering discovery, wiring, hardening, testing, runtime smoke, and handoff.
- Added implementation diary and recorded kickoff discovery step.
- Implemented Phase 1 discoverability wiring in `apps-browser`:
  - Added toolbar-level Documentation entry in Apps Folder window.
  - Added toolbar-level Doc Center + Module Docs actions in Module Browser window.
- Implemented Phase 2 hardening in launcher docs routing:
  - Introduced explicit docs route suffixes (`home`, `search`, `module`, `doc`) with URL-safe encoding.
  - Hardened command payload parsing to accept `moduleId` and route malformed payloads to deterministic defaults.
  - Updated `apps-browser.search-docs` to always open search screen (with optional query).
- Implemented Phase 3 regression tests:
  - Added command-routing + route-parsing tests for launcher module.
  - Added doc browser reducer transition tests.
  - Added initial screen resolution tests.
- Verified package tests:
  - `pnpm --filter @hypercard/apps-browser test` (pass).
  - Recorded one intermediate failing run (HTML-escaped assertion mismatch), fixed expectations, reran to green.
- Completed runtime smoke in tmux-backed dev environment:
  - Verified backend endpoints via curl:
    - `GET /api/os/apps`
    - `GET /api/os/docs`
    - `GET /api/apps/inventory/docs`
    - `GET /api/apps/arc-agi/docs`
    - `GET /api/apps/gepa/docs`
  - Verified UI behavior via Playwright:
    - Open docs center from Apps Folder toolbar button.
    - Open module docs from context menu (`View Documentation`).
    - Open doc reader from Get Info doc link.
- Fixed local dev proxy gap that blocked docs center aggregate loading in Vite:
  - Added `/api/os/docs` proxy entry in `apps/os-launcher/vite.config.ts`.
- Recorded existing UI warning discovered during smoke:
  - Nested button markup warning in module docs card topic badges (`button` inside `button`), pre-existing in doc-browser screen implementation.
- Added new Phase 6 follow-up task group for advanced docs interaction work:
  - Open docs from Module Browser bottom documentation section.
  - Support parallel docs windows (multi-window behavior).
  - Add right-click context actions for docs links (open current/new window).
  - Implement and validate Ctrl/Cmd-click new-window behavior.
- Added dedicated research reference document:
  - `reference/02-documentation-link-interaction-research-ctrl-click-context-multi-window.md`
  - Includes technical design options, platform behavior notes, constraints, and task decomposition.

### Related Files

- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/index.md
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/tasks.md
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/design-doc/01-doc-browser-frontend-wiring-implementation-plan.md
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/reference/01-implementation-diary-doc-browser-frontend-wiring.md
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/launcher/module.test.tsx
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.css
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.css
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserContext.tsx
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserContext.test.ts
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.tsx
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.test.ts
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/apps/os-launcher/vite.config.ts
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/reference/02-documentation-link-interaction-research-ctrl-click-context-multi-window.md
