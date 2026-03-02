# Changelog

## 2026-03-01

- Initial workspace created


## 2026-03-01

Created OS-06 as an implementation-instructions-only ticket for intern execution: added detailed design guide, phased task list, and execution notes for Help menu + customizable doc browser mode work (no code changes).

- Implemented Phase 1+2: Help menu contribution and mode-aware doc browser routing.
  - Added `COMMAND_OPEN_HELP` command ID (`apps-browser.open-help`).
  - Added `DocBrowserMode = 'apps' | 'help'` type in `DocBrowserContext.tsx`.
  - Extended `buildDocBrowserWindowPayload` with `mode` option and mode-prefixed routes.
  - Extended `parseDocBrowserSuffix` with mode prefix detection and backward compatibility.
  - Added Help menu section with "General Help" and "Apps Documentation Browser" entries.
  - Threaded `mode` through DocBrowserContext, DocBrowserWindow, and launcher adapter.
- Implemented Phase 3+4: API layer and mode-aware doc browser screens.
  - Added RTK Query hooks: `useGetHelpDocsQuery` (`/api/os/help`) and `useGetHelpDocQuery` (`/api/os/help/{slug}`).
  - Split `DocCenterHome` into `HelpCenterHome` (uses `/api/os/help`) and `AppsCenterHome` (uses `/api/os/apps`).
  - Updated `DocReaderScreen` with conditional data fetching via RTK Query `skip` option.
  - Hidden app-only toolbar buttons (Topics, Module) in help mode.
- Implemented Phase 5+6: UI/UX verification and tests.
  - Added 7 new tests for help command routing, menu contribution structure, and mode-aware route parsing.
  - Total test count: 24 (up from 17), all passing with no regressions.
- Checked off all acceptance criteria.

### Related Files

- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/2026/03/01/OS-06--global-help-menu-and-customizable-doc-browser-mode/design-doc/01-implementation-guide-global-help-menu-and-customizable-doc-browser.md — Detailed implementation instructions
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/2026/03/01/OS-06--global-help-menu-and-customizable-doc-browser-mode/index.md — Ticket scope
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/2026/03/01/OS-06--global-help-menu-and-customizable-doc-browser-mode/reference/01-intern-execution-notes.md — Quick-start and review checklist
- /home/manuel/workspaces/2026-03-01/add-os-doc-browser/wesen-os/2026/03/01/OS-06--global-help-menu-and-customizable-doc-browser-mode/tasks.md — Intern execution checklist and acceptance gates

