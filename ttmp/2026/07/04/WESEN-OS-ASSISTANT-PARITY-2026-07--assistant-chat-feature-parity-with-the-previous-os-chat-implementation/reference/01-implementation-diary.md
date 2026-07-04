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
RelatedFiles: []
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
