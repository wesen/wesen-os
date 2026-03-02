# Tasks

## Planning Deliverables (This Ticket)

- [x] Create separate OS-04 ticket workspace.
- [x] Produce detailed architecture/design/implementation document for app-agnostic stack/chat/vm debug surfaces.
- [x] Record chronological investigation diary with commands, findings, and blockers.

## Implementation Backlog (For Later)

- [ ] Phase 0: Add baseline regression tests around current inventory debug command + window behavior.
- [ ] Phase 1: Refactor `RuntimeCardDebugWindow` to remove hardcoded `ownerAppId: 'inventory'` and support multi-stack selection.
- [ ] Phase 2: Add debug window descriptor codec + payload helpers in `hypercard-runtime`.
- [ ] Phase 3: Add app-agnostic VM debug panel backed by `pluginCardRuntime` selectors.
- [ ] Phase 4: Add `createRuntimeDebugContribution(...)` and `renderRuntimeDebugWindow(...)` APIs in `hypercard-runtime`.
- [ ] Phase 5: Migrate inventory launcher to shared debug-suite APIs and remove duplicated glue.
- [ ] Phase 6: Add/expand tests (unit/integration/storybook) for shared debug-suite behavior.
- [ ] Phase 7: Document app integration recipe for other launcher modules.

## Readiness Checks Before Implementation Starts

- [ ] Align command namespace compatibility policy (preserve inventory command ids vs cutover).
- [ ] Decide whether to ship tabbed debug hub immediately or after separate-window extraction.
- [ ] Confirm conversation resolver ownership (`hypercard-runtime` option vs `chat-runtime` helper).

