# Tasks

## Phase 0: Discovery And Scope Lock

- [x] Audit OS-03 deliverables against current `apps-browser` codebase.
- [x] Identify what is already wired vs what still needs runtime integration hardening.
- [x] Create OS-04 execution plan document with file-level integration surfaces.
- [x] Create implementation diary for chronological tracking.

## Phase 1: Docs Center Discoverability Wiring

- [x] Add/confirm a one-click Docs Center entry in a high-visibility surface (not only context menu).
- [x] Ensure docs center action opens `DocBrowserWindow` home state with stable dedupe key.
- [x] Verify action is available in both apps folder and module browser workflows where appropriate.
- [ ] Add Storybook story/update if discoverability UI changes visually.

## Phase 2: Deep-Link And Navigation Robustness

- [x] Normalize doc payload parsing in launcher command handler:
- [x] `apps-browser.open-docs`
- [x] `apps-browser.open-doc-page`
- [x] `apps-browser.search-docs`
- [x] Harden app-key suffix parsing in window adapter (`home`, `search:<query>`, `<module>`, `<module>:<slug>`).
- [x] Add deterministic fallback behavior for malformed payloads (no crash, meaningful default screen).
- [ ] Validate Get Info `onOpenDoc` deep-link behavior for inventory/arc-agi/gepa docs pages.

## Phase 3: Regression Tests

- [x] Add tests for command handler routing and payload interpretation.
- [x] Add tests for `DocBrowserWindow` initial screen/param resolution.
- [x] Add tests for at least one end-to-end local navigation transition (home -> reader, search -> reader).
- [x] Keep tests in `apps-browser` package and runnable via `pnpm --filter @hypercard/apps-browser test`.

## Phase 4: Runtime Verification

- [x] Run backend/frontend from tmux per startup playbook.
- [x] Verify docs endpoint readiness:
- [x] `/api/os/apps`
- [x] `/api/os/docs`
- [x] `/api/apps/inventory/docs`
- [x] `/api/apps/arc-agi/docs`
- [x] `/api/apps/gepa/docs`
- [x] Verify UI workflow manually:
- [x] Open docs center from discoverability entry.
- [x] Open module docs from context menu.
- [x] Open doc page from Get Info and confirm reader state.

## Phase 5: Ticket Documentation And Handoff

- [x] Update OS-04 changelog after each major commit group.
- [x] Keep implementation diary current with commands, failures, and fixes.
- [x] Relate touched source files in ticket metadata.
- [ ] Summarize final behavior, residual risks, and follow-up tickets.

## Final Acceptance Gates

- [x] Frontend wiring changes merged in `go-go-os-frontend/apps/apps-browser`.
- [x] `pnpm --filter @hypercard/apps-browser test` passes with new coverage.
- [x] Runtime tmux smoke confirms docs browsing workflow end-to-end.
- [ ] OS-04 tasks/changelog/diary are complete and reviewer-ready.
