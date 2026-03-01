---
Title: Implementation Diary — Doc Browser Frontend Wiring
Ticket: OS-04
Status: active
Topics:
    - documentation
    - frontend
    - apps-browser
    - wesen-os
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Command handler and window routing for docs browser entrypoints
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.tsx
      Note: Screen router and toolbar for doc browser runtime navigation
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/GetInfoWindow.tsx
      Note: Existing doc links currently used to deep-link into reader state
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx
      Note: Apps folder context action integration point
    - Path: ../../../../../../go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx
      Note: Module browser context action integration point
    - Path: ../../../../../../wesen-os/ttmp/2026/03/01/OS-03--doc-browser-ui-design/tasks.md
      Note: Prior design/build ticket used as baseline for wiring scope
ExternalSources: []
Summary: Chronological log of OS-04 execution to wire OS-03 doc browser UI into production frontend flow with tests and runtime validation.
LastUpdated: 2026-03-01T15:45:00-05:00
WhatFor: Preserve exact implementation steps, decisions, and validation commands for handoff and review.
WhenToUse: Read before continuing OS-04 implementation or reviewing its commits.
---

# Diary

## Goal

Track OS-04 from planning through runtime-ready frontend wiring so future contributors can continue work without reconstructing context.

## Step 1: Create Ticket And Lock Execution Scope

I created OS-04 as the execution ticket for wiring the already-built OS-03 doc browser screens into reliable frontend runtime behavior. The immediate objective was to avoid redesign work and instead produce a concrete implementation plan and task list grounded in current code.

I reviewed current `apps-browser` launcher wiring and doc-browser components, then documented the remaining integration and test-hardening work as OS-04 phases.

### Prompt Context

**User prompt (verbatim):** "We had a colleague implement wesen-os/ttmp/2026/03/01/OS-03--doc-browser-ui-design/index.md , it's now ready to be wired up in the frontend. Create a new ticket to do that so that we can properly browse the docs of our apps. 

Add a detailed implementation plan and tasks to get there, and work on the ticket ."

**Assistant interpretation:** Create a new execution ticket focused on integrating existing OS-03 UI work into real frontend runtime workflows, with detailed plan/tasks and immediate kickoff progress.

**Inferred user intent:** Move from design completion to concrete implementation execution with traceable progress and handoff-friendly documentation.

**Commit (code):** `54efccd` — "feat(apps-browser): wire docs entrypoints and harden doc routing"

### What I did

- Created ticket workspace:
  - `docmgr --root . ticket create-ticket --ticket OS-04 --title "Doc Browser Frontend Wiring and Rollout" --topics documentation,frontend,apps-browser,wesen-os`
- Added supporting docs:
  - design doc: `design-doc/01-doc-browser-frontend-wiring-implementation-plan.md`
  - diary: `reference/01-implementation-diary-doc-browser-frontend-wiring.md`
- Audited baseline implementation files in `go-go-os-frontend/apps/apps-browser`:
  - launcher command routing
  - doc browser screen router
  - existing docs entry points from Get Info and context menus
- Wrote OS-04 scope-focused implementation plan and detailed phased checklist.

### Why

- OS-03 already covers visual design and component implementation; OS-04 should focus on integration, runtime behavior, and tests.
- A dedicated ticket prevents OS-02/OS-03 artifacts from mixing design and rollout execution evidence.

### What worked

- Existing code already includes major doc-browser components and command IDs, enabling a focused integration-hardening plan instead of greenfield implementation.

### What didn't work

- `docmgr` created OS-04 under `wesen-os/2026/...` (not under `wesen-os/ttmp/2026/...`), so initial path assumptions had to be corrected before editing files.

### What I learned

- Most of the UI implementation exists already; the main value now is discoverability wiring, command/path robustness, and regression coverage.

### What was tricky to build

- The tricky part was separating "already wired" from "story-only/fragile" behavior. I handled this by directly auditing launcher module command wiring and screen router files before writing tasks.

### What warrants a second pair of eyes

- Whether docs center discoverability should be toolbar-first, command-palette-first, or both.
- Whether navigation state should remain context-local or gain URL/state persistence for future deep-linking.

### What should be done in the future

- Execute Phase 1-4 from `tasks.md` with phase-sized commits and runtime tmux smoke after each major behavior change.

### Code review instructions

- Start with:
  - `2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/design-doc/01-doc-browser-frontend-wiring-implementation-plan.md`
  - `2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/tasks.md`
- Cross-check baseline implementation references in `RelatedFiles`.

### Technical details

- Ticket artifacts created:
  - `index.md`
  - `tasks.md`
  - `changelog.md`
  - `design-doc/01-doc-browser-frontend-wiring-implementation-plan.md`
  - `reference/01-implementation-diary-doc-browser-frontend-wiring.md`

## Step 2: Implement Discoverability And Routing Hardening

I implemented the first two execution phases in the frontend code: making documentation entry points visible in top-level toolbars and hardening docs route construction/parsing in the launcher module. This moved docs browsing from mostly context-menu-driven access to explicit, always-visible actions.

I also normalized launcher command handling so docs-related commands route predictably even when payloads vary (`appId` vs `moduleId`) and so malformed routes fall back safely instead of yielding ambiguous screens.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Start implementing OS-04 in production frontend code with practical, reviewable chunks tied to the plan.

**Inferred user intent:** Ship concrete wiring improvements now, not just planning artifacts.

**Commit (code):** `54efccd` — "feat(apps-browser): wire docs entrypoints and harden doc routing"

### What I did

- Updated launcher docs route handling in `src/launcher/module.tsx`:
  - Introduced explicit docs route tags (`home`, `search`, `module`, `doc`).
  - Added URL-safe encode/decode for route parts.
  - Added `parseDocBrowserSuffix` fallback behavior for malformed payloads.
  - Updated command parsing to accept `payload.moduleId` and keep context-target fallback.
  - Changed `apps-browser.search-docs` to always open search screen.
- Added high-visibility docs actions:
  - `AppsFolderWindow` toolbar now has a `Documentation` button.
  - `ModuleBrowserWindow` toolbar now has `Doc Center` and `Module Docs` buttons.
- Wired new toolbar callbacks from launcher adapter when rendering:
  - `AppsFolderWindow` opens docs center home.
  - `ModuleBrowserWindow` opens docs center home or selected module docs.
- Updated related CSS styles in folder/module window stylesheets.

### Why

- OS-03 explicitly calls for docs browser launchability from obvious entry points.
- Route hardening and payload normalization reduce fragile behavior and make command-driven navigation testable.

### What worked

- Existing launcher contribution architecture supported this with small, focused updates.
- Existing `DocBrowserWindow` props model fit route parsing outputs directly.

### What didn't work

- N/A at this implementation step.

### What I learned

- The highest-value gap was not missing UI screens, but runtime discoverability and deterministic routing.

### What was tricky to build

- Avoiding ambiguous suffix parsing required introducing explicit route tags instead of positional parsing. This removed module/slug/search overlap and made malformed payload handling straightforward.

### What warrants a second pair of eyes

- Whether route tag naming should stay internal (`module`, `doc`) or be exposed as stable contract for external command producers.
- Whether toolbar docs actions should also be mirrored in top-level menu sections.

### What should be done in the future

- Add tests for command routing and route parsing (Step 3).
- Run runtime smoke in tmux and validate Get Info deep-link behavior manually.

### Code review instructions

- Start with:
  - `go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx`
  - `go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx`
  - `go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx`
- Confirm toolbar actions open docs windows with expected suffixes.

### Technical details

- New route suffix examples:
  - home: `apps-browser:docs:home`
  - search: `apps-browser:docs:search[:<encoded-query>]`
  - module: `apps-browser:docs:module:<encoded-module-id>`
  - reader: `apps-browser:docs:doc:<encoded-module-id>:<encoded-slug>`

## Step 3: Add Regression Tests And Validate

I added regression tests around launcher docs command routing, docs route parsing, doc browser initial-screen resolution, and local navigation transitions in the reducer. This closes the biggest coverage gap identified in OS-04.

One test run failed initially due HTML entity escaping in server-rendered assertions; I corrected the expectations and reran the suite to green.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Add practical automated coverage for the new routing/discoverability behavior and verify it passes locally.

**Inferred user intent:** Ensure the new wiring is robust and reviewable before further rollout.

**Commit (code):** `840555f` — "feat(os-04): execute doc-browser wiring rollout and runtime smoke"

### What I did

- Added `src/launcher/module.test.tsx`:
  - command handler tests for:
    - `apps-browser.open-docs`
    - `apps-browser.open-doc-page`
    - `apps-browser.search-docs`
    - malformed `open-doc-page` payload fallback (`pass`)
  - docs adapter route parsing tests for `search` and `doc` suffixes + malformed fallback.
- Exported and tested navigation reducer:
  - `src/components/doc-browser/DocBrowserContext.tsx`
  - `src/components/doc-browser/DocBrowserContext.test.ts`
- Extracted and tested initial-screen resolver:
  - `src/components/doc-browser/DocBrowserWindow.tsx`
  - `src/components/doc-browser/DocBrowserWindow.test.ts`
- Ran tests:
  - command: `pnpm --filter @hypercard/apps-browser test`

### Why

- Without tests, docs routing is easy to regress because commands, window keys, and parsing logic are spread across adapter + handler paths.

### What worked

- Node-environment tests with server rendering and mocked components gave deterministic coverage without requiring full desktop shell boot.

### What didn't work

- Initial failure:
  - command: `pnpm --filter @hypercard/apps-browser test`
  - error: assertions expected plain quotes, but `renderToStaticMarkup` encoded values as `&quot;`.
  - fix: updated expected substrings to HTML-escaped form.

### What I learned

- For SSR string assertions, attribute/value escapes should be treated as part of expected output unless HTML decoding is applied in the test helper.

### What was tricky to build

- Testing adapter parsing required mocking `DocBrowserWindow` and asserting encoded props through the rendered markup. The main edge was output escaping, not route logic.

### What warrants a second pair of eyes

- Test shape currently validates behavior through rendered output and handler side effects; reviewers may want one additional runtime integration smoke when tmux services are running.

### What should be done in the future

- Run runtime smoke checklist in OS-04 Phase 4.
- Add Storybook updates for new toolbar actions if visual snapshots are maintained for these windows.

### Code review instructions

- Read tests first:
  - `go-go-os-frontend/apps/apps-browser/src/launcher/module.test.tsx`
  - `go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserContext.test.ts`
  - `go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.test.ts`
- Then inspect the corresponding production files.
- Re-run:
  - `pnpm --filter @hypercard/apps-browser test`

### Technical details

- Final test status:
  - Test files: 4 passed
  - Tests: 17 passed

## Step 4: Runtime Smoke And Dev Proxy Fix

I completed runtime verification against the tmux-run launcher stack and validated all target user flows end-to-end. During smoke, docs center initially showed empty data in Vite dev mode because `/api/os/docs` was not proxied, so I patched the launcher Vite config and reran checks.

After that fix, docs center home rendered all module cards and facets correctly, context-menu docs navigation worked, and Get Info deep-linking opened the reader as expected.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Continue OS-04 execution through runtime proof, not just unit tests.

**Inferred user intent:** Confirm docs browsing really works in the running launcher and close the ticket tasks with evidence.

**Commit (code):** pending

### What I did

- Verified backend endpoint readiness from shell:
  - `curl -fsS http://127.0.0.1:8091/api/os/apps | jq -r '.apps[]?.app_id'`
  - `curl -fsS http://127.0.0.1:8091/api/os/docs | jq '{total, modules:[.facets.modules[]?.id]}'`
  - `curl -fsS http://127.0.0.1:8091/api/apps/inventory/docs | jq '{module_id, count:(.docs|length)}'`
  - `curl -fsS http://127.0.0.1:8091/api/apps/arc-agi/docs | jq '{module_id, count:(.docs|length)}'`
  - `curl -fsS http://127.0.0.1:8091/api/apps/gepa/docs | jq '{module_id, count:(.docs|length)}'`
- Ran Playwright smoke on `http://127.0.0.1:5173/` and validated:
  - Apps Folder toolbar `Documentation` button opens docs center.
  - Context menu `View Documentation` opens module docs window.
  - Get Info doc button opens doc reader window.
- Fixed Vite proxy gap in `wesen-os/apps/os-launcher/vite.config.ts`:
  - Added `'/api/os/docs'` proxy target to backend (`127.0.0.1:8091`).
- Restarted frontend pane in tmux after config change and revalidated docs center data load.

### Why

- OS-04 acceptance requires runtime evidence tied to live endpoints and real window interactions, not only tests.
- Without `/api/os/docs` proxy in dev mode, docs center smoke would produce false negatives.

### What worked

- tmux-managed backend/frontend made repeated validation fast.
- All target navigation paths in tasks now execute successfully.

### What didn't work

- Initial Playwright run showed docs center empty with `404 /api/os/docs` in Vite dev mode.
  - Root cause: missing Vite proxy rule for `/api/os/docs`.
  - Resolution: add proxy entry, restart frontend dev server, rerun smoke.

### What I learned

- The docs browser frontend is functionally wired; remaining dev-time issue was host app proxy configuration, not component logic.

### What was tricky to build

- Distinguishing backend availability from frontend host proxy behavior required checking both direct backend curl (`8091`) and frontend-hosted path (`5173`), then tracing the mismatch to Vite proxy config.

### What warrants a second pair of eyes

- Runtime console warns about nested button markup in module docs cards (`button` badges inside clickable card `button`). This existed before this wiring pass but should be cleaned in a follow-up to avoid invalid HTML and accessibility issues.

### What should be done in the future

- Follow-up: refactor `ModuleDocsScreen` card/topic badge structure to avoid nested interactive elements.
- Optional: add an automated smoke test around docs center in `apps/os-launcher` host to catch proxy drift early.

### Code review instructions

- Validate proxy fix:
  - `wesen-os/apps/os-launcher/vite.config.ts`
- Validate smoke-ready frontend behavior:
  - `go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx`
  - `go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx`
  - `go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx`
- Re-run:
  - `pnpm --filter @hypercard/apps-browser test`
  - `curl -fsS http://127.0.0.1:5173/api/os/docs | jq .total`

### Technical details

- Observed runtime docs aggregate after proxy fix:
  - total docs: 11
  - modules: inventory, arc-agi, gepa

## Step 5: Add Phase 6 Tasks And Control-Click Research Doc

I added a new follow-up phase in OS-04 tasks for advanced documentation interactions, exactly matching the requested feature set: opening docs from module-detail documentation section, parallel docs windows, right-click open-in-new-window actions, and control-click behavior.

I also created and filled a dedicated research document with concrete implementation options, platform-specific click behavior notes, and a task decomposition that can be executed in incremental commits.

### Prompt Context

**User prompt (verbatim):** "addd more tasks for: 

- allow opening module docs from the \"documentation\" section at the bottom browser. 
- allow opening multiple doc windows so I can look at multiple modules (or even pages from the same module) in parallel
- allow right clicking documentation links and opening in new window from context (instead of just following)
- research how to do control click and store in research document in ticket."

**Assistant interpretation:** Extend OS-04 with explicit implementation tasks for advanced docs interactions and produce a dedicated research reference doc focused on control-click and new-window behavior.

**Inferred user intent:** Prepare the next implementation phase with enough technical clarity that execution can start immediately without re-discovery.

**Commit (code):** pending

### What I did

- Updated `tasks.md`:
  - Added `Phase 6: Advanced Doc Interaction Follow-Up` with detailed unchecked implementation tasks.
  - Added checked item documenting completed research deliverable.
- Created and authored:
  - `reference/02-documentation-link-interaction-research-ctrl-click-context-multi-window.md`
- Updated ticket overview/changelog:
  - Added research doc in `index.md` key links.
  - Added changelog entry for new phase/tasks and research document.

### Why

- The requested features change interaction semantics (windowing, click modifiers, context menus), so implementation should be driven by an explicit design contract rather than ad-hoc component edits.

### What worked

- Existing launcher and engine abstractions already expose the primitives needed (`openWindow` payload control, widget-level context action registration, desktop command routing).

### What didn't work

- No direct blocker; this step was documentation/planning work.

### What I learned

- Multi-window docs support is not only a dedupe setting change; it also requires unique window IDs for explicit new-window actions to avoid state collisions.

### What was tricky to build

- Control-click behavior differs across platforms. macOS frequently converts Ctrl+Click into context-menu behavior, so implementation must handle both click modifiers and `onContextMenu` path for correctness.

### What warrants a second pair of eyes

- Final policy for default click vs modifier click vs right-click action precedence, to keep behavior consistent across all docs surfaces.

### What should be done in the future

- Implement Phase 6 in two increments:
  - plumbing (`newWindow` command payload, unique ids, bottom-section docs wiring),
  - interaction polish (context menu + modifier-click across surfaces).

### Code review instructions

- Review new planning artifacts:
  - `2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/tasks.md`
  - `2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/reference/02-documentation-link-interaction-research-ctrl-click-context-multi-window.md`
  - `2026/03/01/OS-04--doc-browser-frontend-wiring-and-rollout/changelog.md`

### Technical details

- Research references implementation touchpoints:
  - `go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx`
  - `go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx`
  - `go-go-os-frontend/packages/engine/src/components/shell/windowing/desktopMenuRuntime.tsx`

## Step 6: Implement Phase 6 Advanced Doc Interactions

I implemented the core Phase 6 features: opening docs from the module detail panel, parallel doc windows, right-click context menus, and Ctrl/Cmd-click new-window behavior across all doc browser surfaces.

### Prompt Context

**User prompt (verbatim):** "continue implementing Phase 6 tasks from OS-04 ticket" / "Don't forget to add copious storybook stories" / "keep a frequent diary as well as you work"

**Assistant interpretation:** Execute Phase 6 interaction upgrades from the research doc, covering all doc link surfaces with consistent modifier-click and context menu behavior, plus comprehensive Storybook coverage.

**Inferred user intent:** Ship the full advanced interaction feature set with visual proof via stories and thorough documentation.

**Commit (code):** pending

### What I did

**1. Created `docLinkInteraction.ts` utility:**
- `isNewWindowClick(event)`: detects Cmd/Ctrl-click and middle-click.
- `parseModuleDocUrl(url)`: extracts moduleId/slug from `/api/apps/{module}/docs/{slug}` URLs.
- `createDocLinkHandlers(target, openDoc, openDocNewWindow, showMenu)`: returns `onClick`, `onAuxClick`, `onContextMenu` handlers with consistent behavior.

**2. Updated `buildDocBrowserWindowPayload` in `module.tsx`:**
- Added `newWindow` option with counter-based unique window IDs and unique dedupe keys.
- Default behavior preserved (single shared window), explicit new-window path for modifier/context actions.

**3. Wired module detail panel doc links (`BrowserDetailPanel.tsx`):**
- Replaced raw `<a href>` links with `<button data-part="browser-detail-doc-link">` elements.
- `parseModuleDocUrl` determines if a doc URL is an internal module doc; if so, routes through `onOpenDoc` callback.
- Supports Cmd/Ctrl-click for new window (third boolean arg) and middle-click.
- Fallback: non-module URLs still render as external links.

**4. Threaded `onOpenDoc` through component hierarchy:**
- `ModuleBrowserWindow` accepts `onOpenDoc?: (moduleId, slug, newWindow?) => void`.
- Passed down to `BrowserDetailPanel` → `ModuleDetail`.
- Launcher adapter in `module.tsx` connects to `buildDocBrowserWindowPayload`.

**5. Extended `DocBrowserContext` for context menu state:**
- Added `openDocNewWindow`, `docLinkMenu`, `showDocLinkMenu`, `closeDocLinkMenu` to context value.
- `DocLinkMenuState` tracks position (x, y) and target (moduleId, slug).
- `DocBrowserProvider` accepts `onOpenDocNewWindow` prop.

**6. Added `DocLinkContextMenu` component in `DocBrowserWindow`:**
- Renders backdrop + positioned menu with "Open in This Window" and "Open in New Window" items.
- "Open in New Window" only shown when `openDocNewWindow` callback is available.
- Positioned at cursor location from `onContextMenu` event.

**7. Updated all five doc browser screens with `createDocLinkHandlers`:**
- `DocCenterHome`: module card doc links.
- `DocSearchScreen`: result cards.
- `ModuleDocsScreen`: doc entry cards.
- `DocReaderScreen`: see-also links (with special handling for entries without moduleId).
- `TopicBrowserScreen`: doc rows in topic detail.

**8. Added CSS styling:**
- `DocBrowserWindow.css`: `doc-link-menu-backdrop` (fixed overlay), `doc-link-menu` (positioned dropdown), `doc-link-menu-item` (hover highlight).
- `ModuleBrowserWindow.css`: `browser-detail-doc-link` (underlined clickable button styled like a link).

**9. Added copious Storybook stories:**
- `DocBrowserWindow.stories.tsx`: `WithNewWindowCallback`
- `DocReaderScreen.stories.tsx`: `SeeAlsoWithNewWindow`, `ApiReferenceWithNewWindow`, `NavigationWithNewWindow`
- `DocSearchScreen.stories.tsx`: `SearchWithNewWindow`, `EmptySearchWithNewWindow`
- `ModuleDocsScreen.stories.tsx`: `InventoryWithNewWindow`, `ArcAgiWithNewWindow`, `GepaWithNewWindow`
- `TopicBrowserScreen.stories.tsx`: `TopicWithNewWindow`, `NoTopicWithNewWindow`
- `ModuleBrowserWindow.stories.tsx`: `GepaWithDocLinks`, `InventoryWithDocLinks`, `ArcAgiWithDocLinks`, `FullyWiredGepa`

### Why

- The research doc (Step 5) identified these as the highest-value interaction improvements for power users who want to browse multiple docs simultaneously.
- Consistent modifier-click behavior across all surfaces reduces cognitive load.
- Context menus make the new-window capability discoverable without requiring keyboard knowledge.

### What worked

- The `createDocLinkHandlers` utility made it straightforward to apply consistent behavior across all five screens with minimal per-screen code.
- The `DocBrowserContext` approach for context menu state kept the menu logic centralized in `DocBrowserWindow` rather than scattered across screens.
- Existing test suite (17 tests) continued to pass without modification, confirming no regressions.

### What didn't work

- Initial Storybook stories used `fn()` from `@storybook/test`, but the package wasn't installed in the monorepo.
  - Fix: replaced `fn()` with inline `console.log` callback functions.
- The `replace_all` parameter on the Edit tool doesn't work when there are multiple identical matches (requires unique context). Used `sed` for bulk find-and-replace instead.

### What I learned

- The `@storybook/test` package is not part of the default Storybook 8 installation in this monorepo; stories should use inline callbacks or check package availability before importing.
- The `DocBrowserContext` pattern (reducer + context) scales well for adding new interaction state without modifying screen components' internal logic.

### What was tricky to build

- The `BrowserDetailPanel` doc link replacement required careful handling: only internal module doc URLs should become clickable buttons, while external URLs should remain as `<a>` links. `parseModuleDocUrl` handles this distinction.
- The `SeeAlsoSection` in `DocReaderScreen` needed special handling for entries without a `moduleId` (just a slug), which render as plain text instead of clickable links.
- Context menu positioning uses `event.clientX/clientY` which gives fixed-position coordinates; the menu itself is `position: fixed` to match.

### What warrants a second pair of eyes

- The context menu uses `position: fixed` with `clientX/clientY`, which works for the doc browser's scrollable content area but may need adjustment if the doc browser is ever rendered inside a transformed container.
- The `newWindow` counter in `buildDocBrowserWindowPayload` is module-scoped (not persistent), so window IDs reset on page reload. This is acceptable for the current use case but would need persistence if window state is ever serialized.

### What should be done in the future

- Add regression tests for multi-window docs behavior and modifier-key link actions (Phase 6 remaining tasks).
- Run runtime smoke checklist for parallel doc windows and context-menu actions.
- Consider keyboard shortcut hints in the context menu (e.g., "Open in New Window (Ctrl+Click)").

### Code review instructions

- Start with the interaction utility:
  - `go-go-os-frontend/apps/apps-browser/src/components/doc-browser/docLinkInteraction.ts`
- Then review the context/window plumbing:
  - `go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserContext.tsx`
  - `go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocBrowserWindow.tsx`
  - `go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx`
- Then review the module detail panel changes:
  - `go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx`
  - `go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx`
- Then spot-check any screen for handler wiring consistency:
  - `go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocCenterHome.tsx`
- Re-run tests:
  - `pnpm --filter @hypercard/apps-browser test`

### Technical details

- 18 files changed, ~433 insertions, ~67 deletions.
- New file: `docLinkInteraction.ts` (shared interaction utility).
- Modified screens: DocCenterHome, DocSearchScreen, ModuleDocsScreen, DocReaderScreen, TopicBrowserScreen.
- Modified infrastructure: DocBrowserContext, DocBrowserWindow, BrowserDetailPanel, ModuleBrowserWindow, module.tsx.
- Modified CSS: DocBrowserWindow.css, ModuleBrowserWindow.css.
- Modified stories: 6 story files with 16 new stories total.
- All 17 existing tests pass.
