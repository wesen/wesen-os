---
Title: Implementation diary
Ticket: WESEN-OS-ASSISTANT-PARITY-2026-07
Status: active
Topics:
    - assistant
    - chat
    - hypercard
    - runtime-surfaces
    - debug-tooling
    - chat-provider
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: apps/os-launcher/src/app/assistantModule.tsx
      Note: Rewired onto chrome + debug window routing
    - Path: apps/os-launcher/src/app/runtimeDebugModule.tsx
      Note: Stacks & Cards Generated Cards section (95abb11)
    - Path: apps/os-launcher/src/chat/ChatWindowChrome.tsx
      Note: Phase 1 generic chrome (commit 33c6165)
    - Path: apps/os-launcher/src/chat/chatDebugStore.ts
      Note: Bounded debug ring buffer with emit-time summaries
    - Path: cmd/wesen-os-launcher/inventory_artifacts.go
      Note: card:v2 YAML code-card + widget:v1 static extractors (95abb11)
    - Path: workspace-links/go-go-app-inventory/apps/inventory/src/launcher/chat/inventoryCodeCardWidget.tsx
      Note: codeCard proposal widget + projection bridge (inventory bb23af1)
ExternalSources: []
Summary: Step-by-step implementation journal for the assistant chat parity work (Phases 1-5 of tasks.md), including failures, architecture decisions, and review pointers.
LastUpdated: 2026-07-04T14:29:07-04:00
WhatFor: ""
WhenToUse: ""
---



# Diary

## Goal

Capture the implementation journey of bringing the assistant (and inventory) chat
windows to feature parity with the old os-chat `ChatConversationWindow` on the new
chat-provider/chatapp/sessionstream stack — per
`design/01-assistant-chat-parity-intern-guide.md` and `tasks.md`.

## Step 0: Verification review pass over the intern guide (commit bd4e541) — backfilled

*(Backfilled 2026-07-05: this step predates the diary's creation — the review
pass was recorded only in the ticket changelog at the time. Reconstructed here
so the diary covers the full session.)*

Before any implementation, the intern guide itself was put through a
verification review: every load-bearing file/symbol/constant claim in
`design/01-assistant-chat-parity-intern-guide.md` was re-checked against the
actual code by three parallel verification agents (backend chathost claims;
chat-provider/chat-overlay internals; old os-chat code + JS-app machinery).
The reference layer held up almost verbatim, but three design-level claims
were wrong or under-specified in ways that would have cost an implementor real
time — and all three changed the implementation plan that Steps 1-4 executed.

The three plan-changing findings: (1) token usage ALREADY reaches the WS as
transient `ChatProviderCallMetadataUpdated`/`ChatProviderCallFinished` UI
events, so the stats footer is frontend-only (the guide had said "confirm
which frame carries usage; maybe extend the backend"); (2) chathost's
`ArtifactExtractor` runs only in `OnFinalTurn` — the guide's §6.5
`status:"streaming"` widget updates were impossible as written, so JS cards
ship final-only v1 with an optional `WrapSink` streaming v2; (3) chat-overlay's
`ChatMessages` takes only `{bottomRef}`, hardcodes `message|widget|tool_call`,
and silently DROPS unknown entity kinds — the Phase 3 renderer registry must
replace it locally, not extend it.

### Prompt Context

**User prompt (verbatim):** "Ok, we are now the big brother model fable, and we should review the last intern guide and make sure it makes sense, so that an implementor has an easier chance of properly implementing them."

**Assistant interpretation:** Re-verify the previously written intern guide's
claims against the code and fix anything that would mislead an implementor.

**Inferred user intent:** De-risk the upcoming implementation by catching
guide errors before they become wasted implementation effort.

**Commit (docs):** bd4e541 — "Docs: verification review pass on assistant-parity intern guide"

### What I did
- Ran three parallel verification agents over: (a) pkg/chathost routes +
  ArtifactExtractor timing + widget lifecycle + usage-on-the-wire question;
  (b) chat-provider timelineSlice/overlay/ChatDebugEvent/ChatMessages
  extensibility; (c) every §4 perf constant, §6 JS-app symbol, and old
  StatsFooter data source in os-chat/os-scripting/_pinoweb_legacy.
- Corrected the guide: §5 rewritten as a verified frontend-only design (incl.
  the OLD data source — `semRegistry.applyLlmMetadata` off `llm.*` envelope
  metadata — and the model-name caveat); §6.5 steps 1-2 rewritten final-only
  with the WrapSink v2 path; Phase 3 constraint documented; §4.3 provider
  nuances (no version guard, `createSelector` memoization semantics); path
  fixes (`rendererRegistry.ts`, `registerRuntimeSurface` lives in
  `plugin-runtime/runtimeSurfaceRegistry.ts`); added `GET /api/chat/health`;
  review banner at the top of the guide summarizing the three plan changes.
- Synced `tasks.md` Phases 2/3/5 to the corrected design; changelog entry.
- Uploaded the corrected guide to reMarkable as a **v2 document** (same
  folder, no `--force`) so annotations on the original PDF survive.

### Why
- The guide was written from exploration-agent findings a session earlier;
  design-level claims (as opposed to file references) had not been
  adversarially checked against the code.

### What worked
- All §4/§6 reference-layer claims (constants, line numbers, behaviors)
  verified verbatim — the earlier exploration agents' factual layer was solid.
- Every one of the three design corrections was directly load-bearing during
  implementation (Steps 2-4 each consumed one).

### What didn't work
- N/A — no failed attempts this step; all three agents returned conclusive
  findings on the first pass.

### What I learned
- "Verified reference + unverified design inference" is the failure shape to
  watch for in agent-written guides: the file:line facts were all right while
  three architectural conclusions drawn from them were wrong.

### What was tricky to build
- Nothing built; the subtlety was distinguishing which guide claims were
  observations (kept) vs inferences (re-derived): e.g. "usage rides the
  sessionstream run/usage events" sounded observational but was a guess.

### What warrants a second pair of eyes
- The §5 caveat left open whether `ChatProviderCallMetadataUpdated` carries a
  model name (resolved during Step 1 grounding: it does not — profile
  displayName is the label).

### What should be done in the future
- Treat this verify-before-implement pass as standard for agent-written
  design docs (cheap relative to the misimplementation it prevents).

### Code review instructions
- Read the guide's top "Review pass 2026-07-04" banner, then diff bd4e541 for
  the §5/§6.5/Phase 3 rewrites.

### Technical details
- Verification agents' key negative results: chat-provider contains zero
  usage/model state (grep-verified); `TimelineEntity.version` exists but is
  never compared (LWW merges); os-chat's `eventBus`/`timelineSlice` perf
  claims all confirmed at the cited lines.

## Step 1: Pre-implementation grounding and the federation-boundary architecture decision

Before writing code I re-grounded the plan against the actual wiring, because the
guide's Phase 1 phrasing ("factor shared chrome so assistant + inventory share one
component") hid an unresolved question: *where can a shared component actually
live?* The answer changed the plan: nowhere, until Phase 6. The launcher's own
architecture test (`apps/os-launcher/src/__tests__/launcherHost.test.tsx:176-181`)
asserts that launcher module/store/docs sources must NOT import
`@go-go-golems/inventory` subpaths (only `localFederatedAppContracts.ts` may import
`/host`) — the inventory app is a federated boundary. And react-chat
(chat-provider/chat-overlay) is consumed as published npm (`^0.2.1`), not a
workspace link, so we can't add components there without a release. Decision: the
generic chat components live launcher-local in `apps/os-launcher/src/chat/`; the
inventory window gets a targeted in-repo retrofit; true sharing is Phase 6
(upstream to react-chat).

The other grounding win: the wire-level facts for Phase 2 are now exact. chatapp's
`runtimeEventSink` publishes `ChatProviderCallMetadataUpdated{stopReason, usage}`
and `ChatProviderCallFinished{stopReason, finishClass, usage, durationMs,
hasToolCalls}` as transient UI events; the ws frame normalizes to
`{type:'ui-event', name, payload}` (protojson camelCase, `unwrapAnyPayload`
flattens the Any). Neither event carries a model name — the footer will label with
the selected profile's displayName. Live token counts during streaming come from
`ChatTextPatch` delta text length (chars/4 estimate) overridden by real usage
frames, exactly the old `semRegistry.applyLlmMetadata` strategy.

### Prompt Context

**User prompt (verbatim):** "Ok, now add detailed tasks to the ticket (if you haven't already), and then implement it, commit at appropriate intervals, keep a detailed diary as you work (see skill)"

**Assistant interpretation:** Expand tasks.md into a detailed, phase-by-phase task
list reflecting the reviewed guide, then implement the parity phases end-to-end,
committing per phase and journaling each step in this diary.

**Inferred user intent:** Get the assistant chat window (and inventory) actually
rebuilt to parity — working code, not just the design doc — with a traceable
record for review and continuation.

### What I did
- Verified the sharing constraint: read `apps/os-launcher/package.json`
  (inventory is `workspace:*`; go-go-os-frontend packages are published semver),
  `pnpm-workspace.yaml`, and the launcher architecture test that forbids inventory
  imports from launcher modules.
- Read `assistantModule.tsx` (216L, zero parity features) and
  `InventoryChatWindow.tsx` (297L, the richer chrome) to plan the factoring.
- Read chat-provider `ws/wsManager.js` + `ws/protocol.js`: every server frame
  surfaces via `onDebugEvent` as `parsed-frame` with the full normalized frame;
  ui-event frames are `{type:'ui-event', name, ordinal, payload}`.
- Confirmed chatapp event constants (`chat.go:20-29`) and
  `ChatProviderCall*` proto fields (usage yes, model no) in pinocchio v0.11.5.
- Discovered a Phase 5 conflict: the NEW static-card path
  (`cmd/wesen-os-launcher/inventory_artifacts.go`) squats on the old
  `<hypercard:card:v2>` tag with a JSON body, while old code cards used the same
  tag with YAML. Plan: static cards move to `<hypercard:widget:v1>` (matching the
  old static/widget vs code/card split); `card:v2` reverts to JS code cards.
- Rewrote `tasks.md` with detailed per-phase tasks encoding these decisions.

### Why
- The federation boundary invalidates the naive "one shared component" reading of
  Phase 1; deciding placement up front avoids a mid-phase rewrite.
- Phase 2 needed wire-exact event names/shapes to avoid building on guesses.

### What worked
- The three guide-verification agents' findings (previous session step) held up
  and directly seeded these decisions.

### What didn't work
- N/A (analysis step; no code changes yet).

### What I learned
- `launcherHost.test.tsx` encodes the federation boundary as a test — any
  "shared chrome" import from inventory would fail CI, not just taste.
- `unwrapAnyPayload` means the frontend sees protojson `Any` payloads flattened;
  stats code can read `frame.payload.usage.outputTokens` directly.

### What was tricky to build
- Nothing built yet; the tricky part was noticing that the obvious Phase 1
  reading (import inventory chrome into assistant) is explicitly forbidden by an
  existing test, which only surfaced by reading the test file, not the app code.

### What warrants a second pair of eyes
- The decision to duplicate ~300 lines of chrome between launcher and inventory
  until Phase 6 — deliberate, but someone may prefer publishing a react-chat
  release first.

### What should be done in the future
- Phase 6: upstream the generic components into react-chat and delete both local
  copies.

### Code review instructions
- Read `tasks.md` (the architecture-decision header) against
  `apps/os-launcher/src/__tests__/launcherHost.test.tsx:173-181`.

### Technical details
- UI-event frame on the wire: `{"uiEvent":{"sessionId":"...","eventOrdinal":"n",
  "name":"ChatProviderCallMetadataUpdated","payload":{"@type":"...","usage":
  {"inputTokens":123,"outputTokens":45,...}}}}` → normalized to
  `{type:'ui-event', name, ordinal, payload:{usage:{...}}}`.
- Event names: `ChatRunStarted/Finished/Stopped/Failed`,
  `ChatProviderCallStarted/MetadataUpdated/Finished`,
  `ChatTextSegmentStarted/Patch/Finished` (pinocchio `pkg/chatapp/chat.go:20-29`).

## Step 2: Phase 1 — assistant chrome parity (commit 33c6165)

Built the launcher-local generic chat layer (`apps/os-launcher/src/chat/`) and
rewired the assistant window onto it. The assistant now has everything the
inventory window has: profile selector bound at session creation (and locked once
the first message lands), starter suggestions (mode-aware: generic vs app-chat),
connection badge, Copy Conv ID, inline Debug panel, and detached Event Viewer /
Timeline Debug windows routed as assistant app instances
(`event-viewer~<convId>` / `timeline-debug~<convId>`) — the same routing the
pre-migration assistant used, which the stale test file had documented.

Verified live against the running devctl stack (profile `real`, gpt-5-nano-low):
suggestion click → streaming reply → counter `2 messages`, profile select
disabled after first message, detached Event Viewer showing 741 captured frames —
including `ui ChatProviderCallFinished`, which live-confirms the Phase 2 stats
source on this exact stack.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Execute Phase 1 of tasks.md.

**Inferred user intent:** Assistant window at feature parity with inventory.

**Commit (code):** 33c6165 — "Assistant chat: Phase 1 chrome parity on chat-provider"

### What I did
- New `apps/os-launcher/src/chat/`: `ChatWindowChrome.tsx` (generic chrome),
  `chatDebugStore.ts` (cap-1000 ring buffer, emit-time `summarize()`, monotonic
  `evt-<n>` ids), `useChatProfiles.ts`, `useChatDebugEvents.ts`,
  `ChatDebugWindows.tsx` (simple v1 detached windows), `chat-chrome.css`
  (adapted from inventory-chat.css, `oschat-` scope, debug-window scope added).
- Rewrote `assistantModule.tsx`: chrome + profile ref bound into
  `createSessionBody`, `onDebugEvent` → store, debug-instance routing in
  `renderWindow`, exported `buildDebugWindowPayload` for tests.
- Deleted `theme/assistant-chat-macos1.css` (fully replaced).
- Rewrote `assistantModule.test.ts` off the deleted os-chat mocks onto the new
  architecture (payload builders + renderWindow routing, no hook rendering).

### Why
- Chrome must be a separate reusable component for Phase 6 upstreaming, and the
  assistant window is the ticket's headline gap (0 parity features before).

### What worked
- Live round-trip on first try after typecheck; profile endpoint already served
  `Assistant (default)` for the assistant host (VisibleProfiles wired earlier).

### What didn't work
- `pnpm exec vitest run` in os-launcher: 17/18 test files fail PRE-EXISTING with
  `Cannot find module .../@go-go-golems/os-shell/contracts/appManifest` (and
  similar directory-import errors) — published-package ESM resolution under
  node; unrelated to this change and present before it. The rewritten
  assistantModule.test.ts therefore cannot run yet; it compiles under typecheck
  and will run once the resolution knot is fixed.
- First `browser_wait_for textGone: "streaming"` matched the footer tagline
  "Streaming via sessionstream" — poor selector choice, switched to a plain wait.

### What I learned
- The stale test file was documentation: the OLD assistant had Events/Timeline
  buttons opening `event-viewer~<convId>` instances via `dispatch(openWindow)`.
  Restoring the same shape keeps window routing reload-safe.
- `renderWindow` receives `ctx.dispatch` (LauncherRenderContext), so windows can
  open sibling windows without a hostContext.

### What was tricky to build
- Placement. The obvious "shared component" reading of Phase 1 is impossible:
  `launcherHost.test.tsx:176-181` forbids inventory imports from launcher
  modules (federation boundary), and react-chat is published npm. Resolved by
  going launcher-local with an explicit Phase 6 upstream plan (tasks.md header).

### What warrants a second pair of eyes
- The conn badge shows raw wsStatus strings (`subscribed` after hydration) —
  matches the inventory window's behavior, but "subscribed" reads oddly; maybe
  map to `connected` display. Deliberately kept consistent for now.
- Debug-window dedupeKey `assistant:<kind>~<convId>` — one debug window per
  conversation per kind; re-clicking focuses the existing one.

### What should be done in the future
- Phase 4 replaces the v1 debug-window internals with the old perf techniques
  AND the original visual look (user request: type pills/badges — added to
  tasks.md).

### Code review instructions
- Start: `apps/os-launcher/src/chat/ChatWindowChrome.tsx`, then
  `assistantModule.tsx` renderWindow routing.
- Validate: `pnpm --dir apps/os-launcher run typecheck`; `devctl up`, open
  Assistant, click a suggestion, open Events/Timeline windows.

### Technical details
- Profile lock: `profileLocked = entities.length > 0` — profile is only sent in
  `createSessionBody`, so changing it mid-session would silently not apply;
  locking makes that explicit (same as inventory).

## Step 3: Phase 2 stats footer + Phase 4 debug windows (commits fc579bc, fea33aa)

Two phases in one stretch. Phase 2 (fc579bc): `chatStatsStore` scrapes the
transient `ChatProviderCallMetadataUpdated`/`ChatProviderCallFinished` UI events
from `parsed-frame` debug events — per-run usage accumulated across provider
calls, `durationMs`, conversation totals; live streaming out-tokens =
ChatTextPatch chars/4 estimate overridden by real usage. `StatsFooter` is the
chrome's default footer. Live verified: `Assistant · In:33 Out:750 · 5.6s ·
134.9 tok/s`, and `Σ In:194 Out:880` totals after turn 2.

Phase 4 (fea33aa): full rebuild of both debug windows with the ORIGINAL look
(user request mid-stretch: "restore the little pills and look of the original
event viewers") and the old perf techniques, plus the two gap fixes (lazy YAML,
lazy sanitize). The structural novelty vs the old code: detached windows have no
ChatProvider, so Timeline Debug reconstructs the timeline as a **mirror** — REST
snapshot seed + `ui-event` debug entries' `TimelineMutation`s folded with
provider-exact merge semantics ported from chat-provider's `timelineSlice`
(`applyStreamPatch`/`mergePropsWithPatches`/`mergeTimelineEntity`).

### Prompt Context

**User prompt (verbatim):** "Can you also restore the little pills and look of the original event viewers? they were very useful,this is a bit terse."

**Assistant interpretation:** Phase 4 must reproduce the original Event Viewer
UI (family pills, toolbar controls, row layout), not just the perf internals.

**Inferred user intent:** Keep the debugging ergonomics they relied on daily.

**Commits (code):** fc579bc — "Phase 2 stats footer", fea33aa — "Phase 4 debug windows"

### What I did
- `chatStatsStore.ts` + `StatsFooter.tsx`; wired as chrome default footer.
- Extended `chatDebugStore` entries with ingest-time `family/eventType/eventId`
  (families llm/tool/widget/timeline/ws/raw/other; `classify()`).
- Ports into `apps/os-launcher/src/chat/`: `yamlFormat.ts`,
  `SyntaxHighlight.tsx`, `StructuredDataTree.tsx` (verbatim from os-chat),
  `timelineDebugModel.ts` (adapted, raw-props + lazy sanitize), `clipboard.ts`.
- `timelineMirror.ts`: provider-exact merge + `foldMutations` (same-ref when
  no-op) + `seedMirrorFromSnapshot` (REST protojson entities, Any unwrap).
- Rewrote `ChatDebugWindows.tsx` (~650 lines) with the old markup/palette.

### Why
- The debug windows were the old stack's killer tool; visual + perf parity was
  the explicit ask.

### What worked
- Live: pills toggle (Raw default-off), 500-row cap under load, expanded
  `ChatRunFinished` payload with 17 highlight tokens, mirror rendering both
  message entities + collapsible props tree.

### What didn't work
- First live-streaming footer sample: gpt-5-nano finishes in ~2-5s, so the
  sampler kept catching the completed state; the streaming branch is exercised
  by the same ingestion path but was not visually observed. Re-verify with a
  slower model when convenient.

### What I learned
- `ui-event` debug events carry the provider's `TimelineMutation` verbatim
  (`{upsert?, upsertIfExists?, deleteId?, status?}` with full entities) — a
  detached mirror is a fold, not an adapter reimplementation.
- Old stats source: `semRegistry.applyLlmMetadata` ← `llm.*` envelope metadata
  (proto `LlmInferenceMetadataV1`); new equivalents carry usage but NO model
  name → profile displayName as label.

### What was tricky to build
- Mirror seeding race: mutations in flight during the REST fetch could be
  double-applied (content appended twice). Chose to capture the fold cursor at
  response time and accept the small race (debug view; Refresh re-seeds).
  Symptom to watch: duplicated tail text on an entity right after opening the
  window during an active stream.
- Pause semantics with useSyncExternalStore would re-render on every push even
  when paused; used the old pattern instead (component state + subscription
  callback checking `pausedRef` before `setState`).

### What warrants a second pair of eyes
- `timelineMirror.mergePropsWithPatches` port — verify against
  chat-provider/store/timelineSlice.js if react-chat updates (semantics drift
  would silently corrupt the mirror).
- No list virtualization (old code had none either); the 500-row cap is the
  backstop. If needed later, virtualize `event-viewer-log`.

### What should be done in the future
- Inventory retrofit (tasks.md Phase 4 last items) — batched with Phase 5's
  inventory work.
- Streaming-branch visual check of StatsFooter with a slower profile.

### Code review instructions
- Start: `apps/os-launcher/src/chat/timelineMirror.ts` (merge semantics) vs
  `node_modules/@go-go-golems/chat-provider/store/timelineSlice.js`.
- Then `ChatDebugWindows.tsx` against the originals in
  `workspace-links/go-go-os-frontend/packages/os-chat/src/chat/debug/`.
- Validate: typecheck; open assistant → send → Events/Timeline windows.

### Technical details
- Wire fact: `ChatProviderCallFinished` payload = `{stopReason, finishClass,
  usage{inputTokens,outputTokens,cachedTokens,cacheCreationInputTokens,
  cacheReadInputTokens}, durationMs, hasToolCalls, correlation}` (protojson
  camelCase; no model name).

## Step 4: Phase 3 registry, Phase 5 JS HyperCard apps, inventory retrofit (commits 5baaad3, 95abb11; inventory bb23af1, aea27b9)

The marquee capability is back: the model generates executable JS cards that run
as live interactive surfaces, openable from chat AND from the Stacks & Cards
manager (user requirement). Verified live with real inference twice over: a
`ui.card.v1` "Stock Counter" whose +/- buttons mutate state (Quantity 5→8
across clicks), and a `kanban.v1` "Restock tasks board" rendering Todo/Ordered/
Received columns with model-seeded tasks. Phase 3's `ChatTimeline` +
`timelineRendererRegistry` replaced chat-overlay's kind-dropping `ChatMessages`
in the assistant chrome, and the inventory debug windows got the perf retrofit.

The Phase 5 path end-to-end: embedded legacy `runtime-card-policy.md` system
block (go:embed) teaches authoring → model emits `<hypercard:card:v2>` YAML →
`extractRuntimeCards` (128 KB cap, legacy required-field validation) →
`inventory.codeCard` ChatWidgetInstance → widget renders a proposal card and
calls `registerRuntimeSurface(card.id, code, pack)` on mount (the projection
bridge; hydration re-registers) → Open routes through
`buildArtifactOpenWindowPayload` → the existing surface adapter executes it.
Static cards moved to `<hypercard:widget:v1>` (JSON), freeing `card:v2` for its
original meaning. Stacks & Cards got a launcher-side "Generated cards" section
(live via `onRegistryChange`) with Open buttons — the built-in registry section
was Edit-only (verified by a fable Explore agent against os-scripting source +
published dist).

### Prompt Context

**User prompt (verbatim):** "as part of your work, i also want you to make sure that the  model can generate hypercard apps and that they can be opened and viewed in the tasks & cards manager list."

**Assistant interpretation:** Phase 5 must additionally surface generated cards
in the Stacks & Cards manager (list + open), not only in the chat stream.

**Inferred user intent:** Generated apps as first-class desktop artifacts, not
chat-transient bubbles.

**Commits (code):** 5baaad3 (Phase 3), 95abb11 (backend + Stacks & Cards);
inventory repo bb23af1 (codeCard widget + packs), aea27b9 (debug retrofit).

### What I did
- Phase 3: `timelineRendererRegistry.tsx` (old rendererRegistry API mirrored)
  + `ChatTimeline.tsx` (built-ins reproduce ChatMessages output; unknown kinds
  render collapsed instead of dropped; renderMode ctx) wired into the chrome.
- Backend: rewrote `inventory_artifacts.go` (widget:v1 static JSON +
  card:v2 YAML code cards with fence stripping + validation), embedded and
  UPDATED the legacy policy prompt, 7 unit tests, `main.go` extractor swap.
- Inventory: `inventoryCodeCardWidget.tsx` (proposal card + bridge + Open),
  STACK + VM prelude `packageIds: ['ui','kanban']`, code-card CSS.
- Launcher: `runtimeDebugModule.tsx` Generated Cards section with Open.
- Retrofit: inventory debug store entries (summaries + evt-N ids, cap 1000),
  pausedRef gating + lazy JSON in `InventoryDebugWindows`.

### Why
- The execution engine was verified still-live; only production + projection
  were missing — the bridge design from the intern guide §6.5, final-only v1.

### What worked
- ui.card.v1 worked FIRST TRY end-to-end with real inference (model followed
  the embedded policy; extractor + widget + bridge + open all clean).
- The Stacks & Cards section live-updated the moment the widget registered a
  surface, while the manager window was already open.

### What didn't work
- **Kanban round 1:** "Runtime render error: root.kind must be 'kanban.page'"
  — the LEGACY policy teaches `widgets.kanban.board(...)` as root, but
  os-kanban 0.1.4's validator requires `kanban.page(taxonomy, board)`. The
  policy was stale relative to the shipped pack. Fixed by rewriting the
  policy's kanban sections against the actual validator
  (node_modules/@go-go-golems/os-kanban/runtime-packs/kanbanV1Pack.js) with a
  worked example + tree rules.
- **Kanban round 2:** "cannot read property 'kanban' of undefined" — inventory
  surface sessions install only the bundle's `packageIds` (['ui']); the kanban
  prelude was absent. Added 'kanban' to `domain/stack.ts`.
- **Kanban round 3:** "Runtime bundle packageIds mismatch. Declared: ui;
  installed: kanban, ui" — the VM bundle code ITSELF declares packageIds
  (`domain/vm/00-runtimePrelude.vm.js:133`) and the host validates declared vs
  installed. Both places must agree. Round 4 rendered the full board.
- Playwright multi-click on VM-rendered buttons: re-render replaces nodes, so
  repeated clicks on a stale handle no-op — re-query per click.

### What I learned
- In-memory `runtimeSurfaceRegistry` means generated cards vanish on page
  reload until a chat window with the widget remounts (hydration re-registers)
  — same property as the old middleware, but worth a durable-artifacts follow-up.
- `ChatProvider` uses an isolated Redux context (`ChatReduxContext`), so plain
  `useDispatch()` inside chat widgets reaches the desktop store — this makes
  openWindow-from-widget trivial and is load-bearing for the design.
- Bundle packageIds live in TWO places (TS definition + VM prelude source) and
  the runtime host enforces agreement.

### What was tricky to build
- The kanban failure chain (stale policy → missing prelude → declared/installed
  mismatch) — three distinct layers each producing a different error; fixing
  in order was the only path, each fix revealed the next. Symptom-to-layer map
  now recorded above for future card packs.

### What warrants a second pair of eyes
- The updated kanban policy example (prompts/runtime-card-policy.md) — written
  against the 0.1.4 validator by reading it; a pack upgrade will silently
  stale it again. Consider generating the policy from pack metadata (Phase 6).
- `packageIds` duplication (stack.ts vs 00-runtimePrelude.vm.js) is a footgun.

### What should be done in the future
- Persist generated cards (durable artifact store) so they survive reload and
  appear in Stacks & Cards without a mounted chat window.
- Phase 6: upstream + Open button in os-scripting's registry section (delete
  the launcher wrapper), react-chat promotion of the generic components.

### Code review instructions
- Backend: `cmd/wesen-os-launcher/inventory_artifacts.go` +
  `inventory_artifacts_test.go` (`go test ./cmd/...`); policy diff in
  `cmd/wesen-os-launcher/prompts/runtime-card-policy.md` (kanban sections).
- Frontend: inventory `chat/inventoryCodeCardWidget.tsx` (bridge), launcher
  `app/runtimeDebugModule.tsx` (Generated Cards), `chat/ChatTimeline.tsx`.
- Validate: `devctl up --profile real`; inventory New Chat → ask for an
  interactive card → Open; ask for a kanban board → Open; check Stacks & Cards.

### Technical details
- kanban.v1 contract (os-kanban 0.1.4): root `widgets.kanban.page(...)` must
  contain `kanban.taxonomy` (props `{issueTypes[],priorities[],labels[]}`,
  descriptors `{id,label,icon?,color?}`) and `kanban.board` (columns
  `{id,title,icon}` all required; tasks `{id,col,title,type,priority,desc,
  labels}` all required; event refs optional `{handler}` objects).

## Step 5: Markdown chat, hidden card code with buildup, Edit action, inventory pills (commits 78b6dba; inventory 585852c)

Polish round from live user testing. Four asks: (1) hide the generated card
code — show a streaming buildup indicator and nothing once created; (2) render
chat as proper markdown incl. thinking traces; (3) the inventory debug windows
were still the terse rebuild — bring them to the pills standard; (4) add an
✏️ Edit action on the chat code-card, matching Stacks & Cards.

Both chat surfaces now render messages as markdown (micromark+GFM — already a
launcher dep, HTML-escaping by default so model output can't inject markup).
`stripHypercardBlocks` removes completed `<hypercard:*>` blocks from message
text (their widgets render separately) and flags a trailing unclosed block as
"building" → an animated `🃏 Building card…` placeholder replaces streaming raw
YAML; a partially-typed opening tag is hidden so it never flashes. Thinking
traces (message entities with role `thinking` — geppetto text segments carry
the role through `ChatTextPatch`) render as a collapsible 💭 block, auto-open
while streaming. The `inventory.codeCard` widget became a compact chip
(name · pack · ▶ Open · ✏️ Edit) — Edit calls os-scripting's `openCodeEditor`
(exported from the package root), the same runtime-surface editor flow the
Stacks & Cards registry section uses. Inventory's debug windows were rebuilt
to the launcher standard, reusing `SyntaxHighlight`/`StructuredDataTree`/
`toYaml`/`timelineDebugModel` from `@go-go-golems/os-chat` (workspace dep —
only the mutation-fold mirror needed copying).

### Prompt Context

**User prompt (verbatim):** "hide the card code (show streaming widget buildup widget) and remove it entirely when the card has been created, also render chat as proper markdown including thinking traces, and properly render the event debug timeline (it still looks like the old one?)"

**User prompt (verbatim, follow-up):** "(look at how the code is displayed in \"Stacks & Cards\" and also add an edit button in the chat rendered widget to open the code"

**Assistant interpretation:** Hide raw card YAML/code in chat (streaming
placeholder while building, compact chip after), markdown message rendering
with thinking support, upgrade the inventory debug windows to the pills
rebuild, and add an Edit-code action mirroring Stacks & Cards.

**Inferred user intent:** Chat should read like a polished product — artifacts
as chips with actions, not code dumps.

**Commits (code):** 78b6dba (launcher), 585852c (inventory).

### What I did
- Launcher: `markdown.tsx`, `hypercardBlocks.ts`, ChatTimeline MessageBody/
  ThinkingBlock, `.oschat-md`/thinking/buildup CSS.
- Inventory: mirrored `markdown.tsx`/`hypercardBlocks.ts`,
  `InventoryChatMessages.tsx` (replaces chat-overlay ChatMessages), compact
  `inventoryCodeCardWidget` with Open+Edit, pills `InventoryDebugWindows.tsx`
  + classify() in the store + `timelineMirror.ts` copy, micromark deps.

### Why
- The assistant message text carried the raw `<hypercard:card:v2>` YAML
  inline — the "card code in chat" the user saw was the message text itself,
  not the widget; stripping at render is the right layer (the text stays
  intact in the timeline/turn store).

### What worked
- Caught the buildup placeholder live mid-stream on the first try
  ("🃏Building card…" → gone at block close).
- Edit opened the CodeMirror editor with the generated code and "registered"
  badge; Open still executed ("Greeting input card" rendered its button).
- GFM table + inline code rendered in the assistant window.

### What didn't work
- N/A this round (no failed attempts; typecheck first-pass green).

### What I learned
- os-chat exports its whole debug toolkit (SyntaxHighlight,
  StructuredDataTree, yamlFormat, timelineDebugModel) — the inventory pills
  rebuild needed far less duplication than the launcher's (which can't import
  os-chat source; it uses the published package).
- `openCodeEditor(dispatch, {ownerAppId, surfaceId}, code, packId)` stashes
  code and opens the HyperCard Tools editor window — reusable from any widget
  with desktop-store dispatch.

### What was tricky to build
- Streaming tag flashing: a half-typed `<hyperca` at the text tail would
  flicker into view between deltas; handled with an incremental
  prefix-matching regex (PARTIAL_TAG_TAIL) that hides any partial opening tag.

### What warrants a second pair of eyes
- `stripHypercardBlocks` OPEN_BLOCK regex treats ANY `<hypercard:x:vN>`
  without a closing tag as "still building" even on a final message (model
  forgot the closing tag) — the placeholder would persist. Acceptable
  (extractor also rejects such blocks), but a `streaming:false` + unclosed
  combination could show "Building card…" forever; could add a fallback to
  render nothing when !streaming.
- Inventory `buildTimelineDebugSnapshot(convId, folded.mirror as never)` —
  structural cast onto os-chat's old ConversationTimelineState; compatible
  today, revisit if os-chat types change.

### What should be done in the future
- Phase 6: dedupe the markdown/message components into react-chat.
- Consider showing tool_call chips with markdown-rendered results too.

### Code review instructions
- `apps/os-launcher/src/chat/hypercardBlocks.ts` (regex edge cases),
  `ChatTimeline.tsx` MessageBody; inventory `InventoryChatMessages.tsx`,
  `inventoryCodeCardWidget.tsx`, `InventoryDebugWindows.tsx`.
- Validate: inventory New Chat → ask for markdown + an interactive card →
  watch the buildup placeholder → chip with Open/Edit → Events window pills.

## Step 6: Session meta-instructions and diary backfill audit

Housekeeping step recording two mid-session user instructions that changed how
the work was carried out (rather than what was built), plus the backfill audit
itself. Neither produced repo code, but both are standing directives that a
future session should know about, and the diary is the record of "how", not
just "what".

### Prompt Context

**User prompt (verbatim):** "make sure to use the fable model for this kind of complex thinking work, not jus topus"

**User prompt (verbatim, second):** "bacfill all the work you did in the diary (see diary skill for the format), because I think you forgot to write into it"

**Assistant interpretation:** (1) Complex analysis/design/review work —
including spawned subagents — should run on the Fable 5 model, not default to
Opus. (2) Audit the diary against the full session and backfill anything not
captured.

**Inferred user intent:** Better reasoning quality on the hard parts, and a
complete implementation record.

### What I did
- Saved the model preference as a persistent feedback memory
  (`use-fable-for-complex-agent-work`) and applied it immediately: the
  Stacks & Cards listing-path analysis agent (Step 4's design input) ran with
  `model: fable`.
- Handled the `/statusline` request via the statusline-setup agent (model
  name, context progress bar, cwd, git branch → `~/.claude/statusline-command.sh`
  + `settings.json` — user-level config, not repo work).
- Audited the diary against every user prompt this session: Steps 1-5 were
  written contemporaneously and cover the implementation prompts; the guide
  review pass (pre-diary) was missing → backfilled as Step 0; this step
  records the meta-prompts.

### Why
- The diary skill requires each user prompt's context captured once verbatim;
  the review pass and meta-instructions had only changelog/memory traces.

### What worked
- The contemporaneous Steps 1-5 needed no correction — only additions at the
  edges of the session.

### What didn't work
- Process miss worth owning: the review pass should have gone into a diary
  from the start; it was treated as "pre-implementation" and only
  changelogged. Backfilling from context is reliable now but would have been
  lossy a week later.

### What I learned
- Start the diary at the first substantive step of a session, not at the
  first *implementation* step — analysis/review steps are exactly the ones
  whose reasoning evaporates fastest.

### What was tricky to build
- N/A (bookkeeping).

### What warrants a second pair of eyes
- N/A.

### What should be done in the future
- Keep spawning analysis/design/review subagents with `model: fable` per the
  standing directive (persisted in agent memory).

### Code review instructions
- N/A — no code. Verify Step 0 against commit bd4e541's diff if auditing the
  backfill.

### Technical details
- Session prompt → diary coverage map: guide review → Step 0 (backfilled);
  "add detailed tasks… implement it" → Steps 1-4; "restore the little pills"
  → Step 3; "generate hypercard apps + Stacks & Cards" → Step 4; "fable model"
  → Step 6; "hide the card code / markdown / debug timeline" + "Edit button"
  → Step 5; "/statusline" → Step 6 (user-level config); "backfill the diary"
  → Step 6.
