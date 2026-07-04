---
Title: Diary — Inventory chat window react-chat migration (Phases A–F)
Ticket: WESEN-OS-STOCKTAKE-2026-07
DocType: reference
Intent: short-term
Owners: []
Summary: Implementation diary for migrating the Inventory chat window off the legacy os-chat SEM transport onto chat-provider/chat-overlay, including the chathost profiles endpoint and the generated-card widget rail.
LastUpdated: 2026-07-03T00:00:00-07:00
---

# Diary

## Goal

Capture the implementation of design-doc/06: rebuild the Inventory chat window on
`@go-go-golems/chat-provider` + `chat-overlay`, add the backend profile endpoint,
and re-establish generated-card rendering through the chatapp widget rail —
executed end-to-end (Phases A–F) with per-phase commits.

## Step 1: Architect design (design-doc/06)

Read the architect brief (design-doc/05), the current os-chat Inventory window,
the new chathost wire contract, and the installed chat-provider/chat-overlay 0.2.1
type surface. Produced design-doc/06 with the two-track split (transport+chrome
vs generated cards) and the key finding that the card middleware is stranded in
`pkg/_pinoweb_legacy`, so the new backend emits no card events.

### Prompt Context

**User prompt (verbatim):** "Key status for the architect: ... Inventory chat does not work because frontend still uses old os-chat endpoints while backend serves new sessionstream/chat-provider endpoints. Recommended design: rebuild Inventory chat window chrome on ChatProvider ... (you are the architect) Also read: ...design-doc/05..."

**Assistant interpretation:** As architect, rule on and design the Inventory chat migration; then (next prompt) execute it.

**Inferred user intent:** A correct, faithful rebuild that preserves the existing window affordances and restores card generation, not a blind 404 patch.

**Commit (docs):** 46b1ebf — "docs(inventory-chat): architect design for react-chat migration (design-doc/06)"

### What I did
- Verified frontend contract (`renderInventoryApp.tsx:928` renders os-chat `ChatConversationWindow`) vs backend contract (`pkg/chathost/handlers.go`).
- Confirmed `ChatProvider` accepts widgets/tools/adapters only through `config` (ChatExtensionConfig), not props.
- Confirmed the hypercard middleware is quarantined in `pkg/_pinoweb_legacy`; `chathost` already installs `chatapp` `widgets.NewWidgetPlugin()`.
- Wrote design-doc/06: current/target diagrams, profile/debug/card strategies, package-boundary DRs, phased plan A–F, validation matrix.

### Why
The brief asked for a design, not a patch; the card path needed a real backend source decision before any frontend work.

### What I learned
- `Hub.Publish(ctx, Event)` is public — application code (chathost) can publish widget instances without pinocchio changes.
- The launcher's `appProfileSurface` already scopes each app's registry to its visible profiles, so a generic profiles endpoint needs no per-app curation.

### Code review instructions
- Start at design-doc/06 §0 (verdict) and §8 (card strategy).

## Step 2: Phases A–C + D-frontend — react-chat window, chrome, debug, detached windows

Rebuilt the Inventory chat window as `InventoryChatWindow` (ChatProvider +
ChatMessages/ChatComposer) wrapped in Inventory chrome reproducing the reference
screenshot: title, connection badge, profile selector, Events/Timeline/Copy Conv
ID/Debug, message counter, "How can I help?" empty state, starter suggestions,
footer. Added a per-conversation debug ring buffer feeding an inline Debug panel
and the detached Event Viewer / Timeline Debug windows (rebuilt on
`ChatDebugEvent` + the snapshot endpoint). Removed the os-chat transport/debug/
profile imports and the `chatProfilesSlice` command wiring from
`renderInventoryApp.tsx`, keeping the desktop menu/context integration.

### Prompt Context

**User prompt (verbatim):** "do it all. Commit at appropriate intervals, keep a diary as you go (see skills)."

**Assistant interpretation:** Execute every phase of design-doc/06 (A–F), committing per phase and keeping this diary.

**Inferred user intent:** A working, shipped Inventory chat, not a partial handoff.

**Commit (code):** bee438c (submodule) — "feat(inventory-chat): rebuild chat window on chat-provider/chat-overlay"; 0932d7b (top-level) — submodule + lockfile bump.

### What I did
- Added `@go-go-golems/chat-provider` + `chat-overlay` ^0.2.1 to the inventory app; refreshed the lockfile with `pnpm install --lockfile-only`.
- New files under `apps/inventory/src/launcher/chat/`: `InventoryChatWindow.tsx`, `InventoryDebugWindows.tsx`, `inventoryChatDebugStore.ts`, `useInventoryChatDebugEvents.ts`, `useInventoryProfiles.ts`, `inventory-chat.css`.
- Rewrote `InventoryChatAssistantWindow` into a thin desktop wrapper; repointed the Event/Timeline routing to the new components.

### Why
The old window derived old SEM endpoints from `basePrefix` and 404'd; ChatProvider speaks the live contract natively (same as the Assistant window).

### What worked
- Launcher typecheck (published resolution, the shipping gate) is green, proving the new files are type-clean.

### What didn't work
- The inventory app's standalone `tsc -b` fails at `src/host.ts` on `FederatedAppHostContract` — but this is a **pre-existing** Phase 2 linked-resolution knot (host.ts untouched by me), not a chat regression. os-shell 0.1.3 in `node_modules` does export it; the standalone build resolves os-shell to linked workspace source.

### What was tricky to build
- `noUnusedLocals`/`noUnusedParameters` cascade when removing os-chat wiring: dropping the profile menu meant dropping `chatProfilesSlice` dispatches, the `availableProfiles`/`selectedProfile` selectors, the Profile menu section, and unused run-handler params. Resolved by letting the launcher typecheck enumerate the leftovers and pruning each.
- Detached debug windows can't read the per-window ChatProvider store, so a module-level per-convId ring buffer (`inventoryChatDebugStore`) fed by `onDebugEvent` and read via `useSyncExternalStore` bridges chat window → detached windows.

### What warrants a second pair of eyes
- Profile-at-creation semantics: the selector locks after the first message (no mid-session profile-update endpoint exists). Confirm this UX is acceptable vs. auto-starting a new session on change.

### What should be done in the future
- A behavioral test for the provider-based window (needs a WS/fetch mock).

### Code review instructions
- Start at `InventoryChatWindow.tsx` (`InventoryChatChrome`), compare to `apps/os-launcher/src/app/assistantModule.tsx`.
- Validate: open Inventory chat, confirm no old-endpoint 404s, prompt round-trips, Copy Conv ID copies `overlay.sessionId`.

## Step 3: Phase D backend — GET /api/chat/profiles

Added a generic profiles endpoint to chathost so the header selector has a real
source. Prefers `ProfileSurface.VisibleProfiles`; falls back to enumerating the
registry (already scoped to visible profiles by the launcher's
`appProfileSurface`, so enumeration returns the right set with display names).
Sorted default-first then by slug for a stable selector.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Commit (code):** e903c6b — "feat(chathost): add GET /api/chat/profiles endpoint"

### What I did
- `ProfileDescriptor` + `ProfileSurface.VisibleProfiles` (host.go); `handleProfiles` (handlers.go); route in `MountRoutes`; contract test.

### What was tricky to build
- Registry enumeration walks a map (non-deterministic order); added `sort.SliceStable` for a stable selector.

### What I learned
- No main.go change was needed: the inventory chathost already receives the curated `appProfileSurface` as its `Registry`, so `ListEngineProfiles` returns exactly the visible profiles with display names.

### Code review instructions
- `pkg/chathost/handlers.go` `handleProfiles`; test `TestChatContract_ProfilesEndpoint`. Validate: `curl <base>/api/apps/inventory/api/chat/profiles`.

## Step 4: Phase E — generated cards on the chatapp widget rail

Re-established generated cards without any pinocchio change. chathost gained
`Options.ArtifactExtractor`: after each assistant turn (`OnFinalTurn`), it runs
the extractor over the assistant text and publishes each returned
`WidgetArtifact` as a `ChatWidgetInstance` via `hub.Publish` (the widget plugin,
already installed, projects it and fans it out). The launcher supplies
`extractInventoryCards` (parses `<hypercard:card:v2>{json}</...>` blocks) and an
extended inventory system prompt. The frontend registers
`defineWidget('inventory.card', ...)`; `ChatMessages` renders it.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Commits (code):** 27afe8e — "feat(chathost): publish generated widget artifacts on the chatapp widget rail"; e82c57f (submodule) — "feat(inventory-chat): render generated cards via inventory.card widget"; bc3fe5c (launcher) — "feat(launcher): wire inventory card extractor + system prompt".

### What I did
- host.go: `WidgetArtifact`, `ArtifactExtractor`, `Options.ArtifactExtractor`.
- runtime.go: wrap `OnFinalTurn` → `publishArtifactsFromTurn` + `assistantTextFromTurn`; `hub.Publish(ChatWidgetInstanceStarted)`.
- launcher: `inventory_artifacts.go` (extractor + system prompt), wired on the inventory host.
- frontend: `inventoryCardWidget.tsx` + card CSS; passed via `widgets` prop.
- Test `TestChatContract_ArtifactExtractorPublishesWidget` asserts a `ChatWidgetInstance` lands in the snapshot.

### Why
The old card path used quarantined pinoweb SEM emission; the widget plugin rail is the new, already-installed equivalent, reachable from chathost via the public `Hub.Publish`.

### What was tricky to build
- Emission point: `OnFinalTurn` runs on the background inference goroutine after the request context is gone, so publishing uses `context.Background()` (mirroring `persistFinalTurn`). Widgets get the next ordinal, so they render after the assistant text — the correct place for a card.
- `assistantTextFromTurn` must filter `BlockKindLLMText` (confirmed `NewAssistantTextBlock` is that kind).

### What warrants a second pair of eyes
- Concurrency: `hub.Publish` during/after a run assigns ordinals under the hub lock; confirm no interleaving hazard with chatapp's own late publishes.
- The card is a standalone timeline entity (no `ParentMessageId`), since the engine decorator can't see chatapp's messageID. Acceptable, but confirm timeline grouping looks right in-browser.

### What should be done in the future
- Full-acceptance browser check: prompt "make me a low-stock card" against a live model and confirm a rendered card.

### Code review instructions
- Start at `pkg/chathost/runtime.go` `publishArtifactsFromTurn`; then `cmd/wesen-os-launcher/inventory_artifacts.go`; then `inventoryCardWidget.tsx`.
- Validate: `go test ./pkg/chathost/...`.

## Step 5: Phase F — cleanup, build verification

The launcher chat path is already os-chat-free (removed in Step 2). Remaining
os-chat usage is the inventory **standalone app** (`main.tsx` theme, `store.ts`
SEM reducers) and its SEM projection test — legitimately Phase 4 per DR-6, left
in place. Verified the full launcher production build and Go build/tests.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

### What I did
- Confirmed no os-chat imports remain on the launcher chat path.
- `GO_GO_OS_FRONTEND_RESOLUTION=published vite build`: 1278 modules, success (card CSS + widget bundled).
- `go build ./...` clean; `go test ./pkg/chathost/...` green.

### What didn't work
- N/A (all gates green).

### What should be done in the future
- Phase 4: retire os-chat from the standalone inventory app (`main.tsx`, `store.ts`) and migrate its SEM card projection test to the widget rail.
- Migrate k3s `profiles.runtime.yaml` and ship (Phase 3 of the parent plan).

### Code review instructions
- Validate end-to-end: `cd apps/os-launcher && GO_GO_OS_FRONTEND_RESOLUTION=published npx vite build` and `go build ./...`.
