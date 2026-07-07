---
Title: Architect brief — Inventory chat window design on react-chat
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - wesen-os
    - frontend
    - react-chat
    - chat-provider
    - inventory
DocType: design-doc
Intent: short-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/react-chat
      Note: Source of @go-go-golems/chat-provider and @go-go-golems/chat-overlay.
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/react-chat/packages/chat-overlay/README.md
      Note: Reusable overlay component package reference for the target design
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/react-chat/packages/chat-provider/README.md
      Note: Reusable chat-provider package reference for the target design
    - Path: apps/os-launcher/src/app/assistantModule.tsx
      Note: Working in-repo example of a desktop window using ChatProvider
    - Path: pkg/chathost/host.go
      Note: |-
        Current backend mounts the new chat-provider/sessionstream REST+WS protocol.
        Current chat-provider/sessionstream backend route contract mounted under app namespaces
    - Path: workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: |-
        Current Inventory launcher window still renders the legacy os-chat ChatConversationWindow and old header buttons.
        Current legacy os-chat Inventory chat window and header buttons to preserve in the new react-chat design
ExternalSources: []
Summary: Instructions for the architect to design the proper Inventory chat-window migration from legacy os-chat protocol/UI to the new react-chat chat-provider/sessionstream package, while preserving the old Inventory window affordances.
LastUpdated: 2026-07-03T23:55:00-07:00
WhatFor: Give the architect a focused design assignment after Phase 2 revealed Inventory chat/card generation is broken by the backend protocol migration.
WhenToUse: Before implementing the Inventory chat window replacement, EventViewer/Timeline rebuild, or HyperCard card adapter on top of react-chat.
---


# Architect brief — Inventory chat window design on react-chat

## 1. Short status for the architect

Phase 2 npm/package work is mostly complete: `os-core@0.1.4` and `os-shell@0.1.3` are published, the launcher now consumes published `@go-go-golems/os-*` packages, the split `os-core` graph is collapsed, launcher typecheck/build are green, and the Assistant window works on the new `@go-go-golems/chat-provider` stack.

The missing smoke was Inventory chat. Opening the Inventory window is not enough: `New Chat` / prompt sending / generated card rendering currently fail because the Inventory frontend still uses the **old `os-chat` protocol**, while the wesen-os backend now serves the **new `chat-provider` / `sessionstream` protocol**.

Observed browser failures:

- `GET /api/apps/inventory/api/chat/profiles` -> `404`
- `WS /api/apps/inventory/ws?conv_id=...` -> `404`
- `GET /api/apps/inventory/api/timeline?conv_id=...` -> `404`
- `POST /api/apps/inventory/chat` -> `404`

The backend is mounted and healthy; this is not a missing Inventory backend module. For example:

- `GET /api/os/apps` lists Inventory as healthy.
- `GET /api/apps/inventory/api/chat/health` returns `200`.
- The available backend contract is the new contract under `/api/apps/inventory/api/chat/*`, not the old `/chat`, `/ws`, `/api/timeline`, `/api/chat/profiles` contract.

## 2. What changed / what I did

During the Phase 2 package switch I:

1. Published `@go-go-golems/os-core@0.1.4` with the Chicago font removed.
2. Recovered `FederatedAppHostContract` from the old branch commit and published it in `@go-go-golems/os-shell@0.1.2`.
3. Found that `os-shell@0.1.2` still crashed at runtime because the published store did not mount `runtimeSessions` / `hypercardArtifacts`.
4. Published `@go-go-golems/os-shell@0.1.3`, wiring `createLauncherStore` through `@go-go-golems/os-scripting` `createAppStore`.
5. Changed the launcher to default to published `os-*` packages and added root `pnpm.overrides` so linked app packages do not drag in linked `os-core@0.1.0`.
6. Verified the Assistant window on the new `chat-provider` protocol with a real prompt round-trip.
7. Verified launcher window/context-menu basics and the generated Kanban/Sprint Board path.
8. Initially reported Inventory window launch as green, but did **not** verify Inventory chat transport or generated cards. That was incomplete; the user later caught the 404s above.

Important correction: Inventory chat/card generation is **not green**. The correct next design task is to migrate the Inventory chat window from legacy `os-chat` transport to `react-chat` / `chat-provider` while preserving the old Inventory-specific affordances.

## 3. Repositories and files to inspect

### Primary new package

Inspect:

```bash
cd /home/manuel/code/wesen/go-go-golems/react-chat
```

Focus on:

- `README.md`
- `packages/chat-provider/README.md`
- `packages/chat-provider/src/**` or the built installed package in wesen-os `node_modules/@go-go-golems/chat-provider/**`
- `packages/chat-overlay/README.md`
- `packages/chat-overlay/src/**`
- `web/src/App.tsx` for example usage, tools, widgets, and adapters.

Key package concepts:

- `ChatProvider`
- `useChatClient`
- `useChatSelector`
- `selectOverlay`
- `selectTimelineEntities`
- `ChatMessages`
- `ChatComposer`
- `defineTimelineAdapter`
- `defineWidget` / `WidgetOutlet`
- `defineTool` / frontend tool bridge
- `onDebugEvent`

### Current Inventory frontend

Inspect:

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os
sed -n '1,1040p' workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
sed -n '1,120p' workspace-links/go-go-app-inventory/apps/inventory/src/launcher/module.tsx
```

Current key facts:

- `InventoryChatWindow` renders legacy `ChatConversationWindow` from `@go-go-golems/os-chat`.
- It passes `basePrefix={apiBasePrefix}` where the launcher resolves `apiBasePrefix` to `/api/apps/inventory`.
- The old component derives old protocol endpoints from that prefix:
  - `POST <basePrefix>/chat`
  - `WS <basePrefix>/ws?conv_id=...`
  - `GET <basePrefix>/api/timeline?conv_id=...`
  - `GET <basePrefix>/api/chat/profiles`
- Header affordances currently implemented around that old window:
  - profile selector (`ChatProfileSelector`)
  - `Events`
  - `Timeline`
  - `Copy Conv ID`
  - `Debug`
  - starter suggestions
  - `HypercardCardRenderer` for `hypercard.card.v2`

### Current backend contract

Inspect:

```bash
sed -n '160,230p' pkg/chathost/host.go
sed -n '1,260p' pkg/chathost/handlers.go
sed -n '160,390p' cmd/wesen-os-launcher/main.go
```

Current backend contract mounted under `/api/apps/<app-id>`:

- `GET /api/apps/inventory/api/chat/health`
- `POST /api/apps/inventory/api/chat/sessions`
- `POST /api/apps/inventory/api/chat/sessions/{id}/messages`
- `GET /api/apps/inventory/api/chat/sessions/{id}`
- `POST /api/apps/inventory/api/chat/sessions/{id}/stop`
- `POST /api/apps/inventory/api/chat/sessions/{id}/tools/manifest`
- `POST /api/apps/inventory/api/chat/sessions/{id}/tools/results`
- `GET /api/apps/inventory/api/chat/ws`

The websocket protocol is sessionstream JSON/protojson. The client opens `/api/chat/ws` relative to `basePrefix`, then sends a subscribe frame:

```json
{
  "subscribe": {
    "sessionId": "<conversation-id>",
    "sinceSnapshotOrdinal": "0"
  }
}
```

`chat-provider` normalizes frames such as `hello`, `snapshot`, `subscribed`, `uiEvent`, `error`, `ping`, and `pong`.

## 4. Design assignment

Design the proper Inventory chat migration. Do **not** merely patch 404s blindly. The design should decide how Inventory-specific UX and generated HyperCard artifacts sit on the new reusable `react-chat` package.

### Required outcome

Inventory should get a new chat surface that:

1. Uses `@go-go-golems/chat-provider` for transport/state/sessionstream.
2. Uses `@go-go-golems/chat-overlay` pieces where appropriate (`ChatMessages`, `ChatComposer`, `useStickyScrollFollow`) or a small custom shell around the provider.
3. Preserves the old Inventory chat window affordances:
   - `Events`
   - `Timeline`
   - `Copy Conv ID`
   - `Debug`
   - profile selection or a designed replacement
   - starter suggestions
   - generated card rendering
4. Does not revive the old `os-chat` transport as the long-term plan.
5. Makes clear what is local to Inventory and what should be upstreamed into `react-chat` as generic reusable widgets/debug tools.

### Preferred architecture direction

Build a new `InventoryReactChatWindow` (name flexible) that looks like the old Inventory window but is internally structured like the Assistant chat window:

```tsx
<ChatProvider
  config={{
    basePrefix: '/api/apps/inventory',
    sessionStorageKey: `inventory.chat.session.${convId}`,
    createSessionBody: () => ({ sessionId: convId, profile: selectedProfile }),
    onDebugEvent: handleDebugEvent,
  }}
>
  <InventoryChatChrome convId={convId} ...>
    <ChatMessages />
    <ChatComposer />
  </InventoryChatChrome>
</ChatProvider>
```

The old `ChatConversationWindow` should be treated as a reference for UX and behavior, **not** as the transport component to keep.

## 5. Questions the design must answer

### 5.1 Protocol and session identity

- Should Inventory preserve the existing `convId` as the `chat-provider` `sessionId`? Preferred answer is probably yes, because `Copy Conv ID`, debug windows, and historical user expectations all depend on stable conversation ids.
- Should Inventory sessions persist in `localStorage` per `convId`, or should every opened Inventory chat window explicitly bind `sessionId` via `createSessionBody` and avoid accidental reused sessions?
- Should profile selection happen at session creation only, or can it change mid-session? Current `chathost` stores a profile per session when `createSessionBody.profile` is sent; there is no current profile-list or profile-update endpoint.

### 5.2 Profile selector replacement

Old UI calls `/api/chat/profiles`; new backend does not expose that endpoint.

Design one of:

1. Add a new profile-list endpoint to `chathost` / app module and build a generic `ProfileSelector` in `react-chat`.
2. Pass visible profile metadata to the frontend through app bootstrap/manifest and keep a local Inventory-specific selector.
3. Temporarily hide profile switching and use the backend default profile, but explicitly mark this as a degraded interim state.

Do not leave a broken profile dropdown in the migrated window.

### 5.3 Events / Timeline / Debug

Old buttons opened os-chat debug surfaces:

- `EventViewerWindow`
- `TimelineDebugWindow`
- inline debug render mode

`chat-provider` already exposes `onDebugEvent` events:

- `ws-lifecycle`
- `raw-ws`
- `parsed-frame`
- `snapshot`
- `ui-event`

Design how to rebuild the debug suite:

- local Inventory debug windows first, or generic `react-chat-debug` components?
- should raw events be stored in a React state buffer, Redux slice, or reusable debug store?
- should Timeline view show provider `TimelineEntity[]`, raw sessionstream snapshot entities, projected mutations, or all of them?
- how should the `Debug` toggle alter message/card rendering?

Recommended split:

- `Copy Conv ID`: local button, immediate.
- `Debug`: local inline panel first, showing `selectOverlay`, `selectTimelineEntities`, and recent `onDebugEvent` frames.
- `Events` / `Timeline`: design as generic reusable react-chat debug widgets if they are not Inventory-specific.

### 5.4 Generated HyperCard/card rendering

Old Inventory card generation used os-chat SEM/timeline artifacts and `HypercardCardRenderer` keyed by `hypercard.card.v2`.

The design must identify the new source of generated card events:

- Are HyperCard artifacts emitted by the current `chathost` / `chatapp` runtime as `ChatWidgetInstance*` events?
- Are old `hypercard.card.v2` events still emitted anywhere after `pinoweb` was quarantined?
- Do we need a new backend middleware/tool/widget bridge to project generated cards into sessionstream?
- Should cards be represented as `chat-provider` `widget` entities, custom timeline adapter entities, or frontend tool result widgets?

Acceptance for this part is not just “chat text works.” It must describe how an Inventory prompt that asks for a card becomes a visible card in the window.

### 5.5 What belongs upstream in react-chat?

Please decide which pieces should be added to `/home/manuel/code/wesen/go-go-golems/react-chat` versus kept in `go-go-app-inventory`.

Likely upstream candidates:

- generic `ChatDebugEventViewer`
- generic `ChatTimelineDebugPanel`
- generic profile selector if the backend contract is standardized
- generic timeline adapter examples for custom widget/card entities
- extension API documentation/examples for embedding in desktop windows

Likely Inventory-local pieces:

- Inventory starter suggestions
- Inventory-specific card renderer branding/content assumptions
- Inventory tool registration and domain prompts
- Inventory-specific debug command IDs / desktop window payloads

## 6. Implementation plan the architect should produce

Please produce a design with this shape:

1. **Current-state protocol diagram**: old Inventory frontend contract vs current backend contract.
2. **Target architecture diagram**: Inventory window -> ChatProvider -> chathost/sessionstream -> timeline/widgets/tools.
3. **Component API sketch** for the new Inventory chat window.
4. **Profile strategy**: endpoint/API and UI behavior.
5. **Debug strategy**: Events/Timeline/Debug replacement design.
6. **Generated card strategy**: backend event source, frontend adapter, renderer API, and acceptance test.
7. **Package-boundary decision records**: what goes into `react-chat`, what stays in Inventory, what remains in os-chat until Phase 4.
8. **Phased implementation plan**:
   - Phase A: text chat works on `ChatProvider` with old chrome copied over.
   - Phase B: Copy Conv ID + Debug panel + recent raw events.
   - Phase C: Events/Timeline windows.
   - Phase D: profile selector.
   - Phase E: generated card adapter/renderer.
   - Phase F: cleanup old os-chat dependencies where safe.
9. **Validation matrix** with exact browser and API checks.

## 7. Acceptance criteria for the eventual implementation

Minimum acceptance:

- Inventory `New Chat` no longer hits old endpoints.
- No 404s for:
  - `/api/apps/inventory/api/chat/profiles`
  - `/api/apps/inventory/ws`
  - `/api/apps/inventory/api/timeline`
  - `/api/apps/inventory/chat`
  because those calls should no longer be made.
- The window creates/connects a session through:
  - `POST /api/apps/inventory/api/chat/sessions`
  - `GET /api/apps/inventory/api/chat/ws`
  - `POST /api/apps/inventory/api/chat/sessions/{id}/messages`
- A prompt sent in Inventory produces an assistant reply.
- `Copy Conv ID` copies the active provider session/conversation id.
- `Events` / `Timeline` / `Debug` have either working new implementations or explicit disabled/explanatory states; no dead buttons.
- Generated cards have an explicit tested path, even if implemented in a later phase.

Full acceptance:

- Prompt that asks Inventory to generate a runtime card renders a visible card in the chat timeline.
- Event viewer shows raw/parsed sessionstream frames for that conversation.
- Timeline debugger shows projected provider timeline entities and their raw source frames/snapshot entities.
- Profile selection works or has an intentional replacement UX.
- os-chat transport is not used for the migrated Inventory path.

## 8. Quick API reference

New `chat-provider` frontend config:

```ts
type ChatProviderConfig = {
  basePrefix?: string;
  apiBase?: string;
  sessionIdParam?: string;
  sessionStorageKey?: string;
  onSessionIdChange?: (sessionId: string | null) => void;
  onDebugEvent?: ChatDebugHandler;
  createSessionBody?: () => Record<string, unknown> | Promise<Record<string, unknown>>;
  sendMessageBody?: (args: { prompt: string }) => Record<string, unknown> | Promise<Record<string, unknown>>;
};
```

For Inventory, the initial config should likely be:

```ts
{
  basePrefix: '/api/apps/inventory',
  sessionStorageKey: `inventory.chat.session.${convId}`,
  createSessionBody: () => ({ sessionId: convId, profile: selectedProfile }),
  onDebugEvent: appendDebugEvent,
}
```

New backend paths under `basePrefix = /api/apps/inventory`:

```text
POST /api/chat/sessions
POST /api/chat/sessions/{sessionId}/messages
GET  /api/chat/sessions/{sessionId}
POST /api/chat/sessions/{sessionId}/stop
POST /api/chat/sessions/{sessionId}/tools/manifest
POST /api/chat/sessions/{sessionId}/tools/results
GET  /api/chat/ws
```

Old paths that the migrated Inventory window should stop using:

```text
GET  /api/chat/profiles
POST /chat
GET  /ws?conv_id=...
GET  /api/timeline?conv_id=...
```

## 9. Important caveats

- The Assistant window already uses `chat-provider` and is the closest in-repo frontend reference: `apps/os-launcher/src/app/assistantModule.tsx`.
- The old os-chat debug windows are valuable UX, but their data model was SEM/proto timeline, not sessionstream/chat-provider. They should be rebuilt against `ChatDebugEvent` and provider timeline entities rather than copied mechanically.
- The old generated-card path used quarantined `pinoweb` legacy code (`workspace-links/go-go-app-inventory/pkg/_pinoweb_legacy`). Do not assume generated cards still exist in the new backend; verify the event source.
- Full os-chat removal remains Phase 4. This design should migrate Inventory’s active chat path without overclaiming that os-chat is gone everywhere.
