# Tasks

## Phase 0: Discovery

- [ ] Read current apps-browser launcher command flow and doc browser route parsing.
- [ ] Confirm launcher backend endpoints for global help are available:
- [ ] `GET /api/os/help`
- [ ] `GET /api/os/help/{slug}`
- [ ] `GET /api/os/docs?module=wesen-os`

## Phase 1: Menu Entry Design (No Backend Changes)

- [ ] Add top-level `Help` menu contribution from `apps-browser` launcher module.
- [ ] Add `General Help` menu entry mapped to a dedicated command id.
- [ ] Add `Apps Documentation Browser` menu entry mapped to existing apps-docs open flow.
- [ ] Ensure merge behavior is compatible if another contribution also defines `help` menu id.

## Phase 2: Command And Route Contract

- [ ] Add new command id for global help mode (recommended: `apps-browser.open-help`).
- [ ] Extend doc window payload builder to include browser mode (`apps` vs `help`).
- [ ] Extend doc appKey suffix parser to decode mode + route robustly.
- [ ] Keep existing apps-doc routes backwards-compatible within this ticket scope.

## Phase 3: API Layer For Help Mode

- [ ] Add typed API hooks in `appsApi.ts` for:
- [ ] `/api/os/help`
- [ ] `/api/os/help/{slug}`
- [ ] Add/extend domain types to represent global help toc and detail payloads.

## Phase 4: Customizable Doc Browser Mode

- [ ] Add doc-browser mode/config props at `DocBrowserWindow` and context boundary.
- [ ] Implement `help` mode home screen data source independent of `/api/os/apps`.
- [ ] Implement `help` mode reader source using `/api/os/help/{slug}`.
- [ ] Keep `apps` mode behavior unchanged for module docs browsing.
- [ ] Ensure mode-specific labels/titles are configurable (header text, empty states, menu labels).

## Phase 5: UI/UX Behavior

- [ ] `General Help` opens help-mode browser at home screen.
- [ ] `Apps Documentation Browser` opens apps-mode browser at current docs center home.
- [ ] Search, open, back navigation, and new-window behavior work in both modes.
- [ ] Global help mode hides app-only affordances that assume app manifest membership.

## Phase 6: Tests

- [ ] Update `apps-browser` launcher command tests for new help command and mode parsing.
- [ ] Add/adjust doc browser component tests for mode-specific rendering and data fetching.
- [ ] Update launcher runtime menu test to assert presence of top-level `Help` menu.
- [ ] Verify no regressions in existing docs browser tests.

## Phase 7: Manual QA

- [ ] Open `Help > General Help` and read at least one global help page.
- [ ] Open `Help > Apps Documentation Browser` and verify module docs listing still works.
- [ ] Validate Cmd/Ctrl-click and context menu “open in new window” behavior in both modes.
- [ ] Validate behavior with backend unavailable (error state) in both modes.

## Acceptance Criteria

- [ ] A top-level Help menu exists with both required entries.
- [ ] One shared doc browser component is used in both flows.
- [ ] General help browsing works without requiring a fake `wesen-os` app in `/api/os/apps`.
- [ ] Existing apps documentation browsing remains functional.
