---
Title: Inventory chat window migration to react-chat — architect design
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
    - Path: design-doc/05-architect-brief-inventory-chat-window-react-chat-design.md
      Note: The brief this design answers.
    - Path: apps/os-launcher/src/app/assistantModule.tsx
      Note: Working in-repo ChatProvider window; the reference implementation to mirror.
    - Path: workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Current legacy os-chat Inventory chat window + all chrome/commands to preserve.
    - Path: pkg/chathost/host.go
      Note: Backend host; already installs chatapp widgetPlugin + frontendToolPlugin.
    - Path: pkg/chathost/handlers.go
      Note: New wire contract under /api/apps/inventory/api/chat/*.
    - Path: workspace-links/go-go-app-inventory/pkg/_pinoweb_legacy/hypercard_middleware.go
      Note: Quarantined HyperCard card-generation middleware — the dead source of generated cards.
ExternalSources: []
Summary: Architect design for migrating the Inventory chat window off the legacy os-chat SEM transport onto @go-go-golems/chat-provider + chat-overlay, preserving the existing window chrome, and re-establishing generated-card rendering through chatapp's widget rail.
LastUpdated: 2026-07-03T00:00:00-07:00
WhatFor: Give the implementer a concrete, phased plan and API sketch for the Inventory chat window rebuild.
WhenToUse: Before implementing the Inventory react-chat window, the debug suite rebuild, or the HyperCard widget adapter.
---

# Inventory chat window migration to react-chat — architect design

## 0. Verdict up front

Rebuild the Inventory chat window on `@go-go-golems/chat-provider` + `@go-go-golems/chat-overlay`, structured exactly like `assistantModule.tsx`, wrapped in an Inventory-specific chrome component that reproduces the header/footer in the reference screenshot. Do **not** revive the os-chat SEM transport.

The migration splits cleanly into two independent tracks:

- **Track 1 — Transport + chrome (Phases A–D).** Pure frontend. All information needed already exists on the new backend contract. This closes every 404 and restores text chat, Copy Conv ID, a debug panel, Events/Timeline windows, and a profile selector. This is the bulk of the visible win and has no backend blockers.
- **Track 2 — Generated cards (Phase E).** This is **not** a frontend-only change. The card-generation middleware is quarantined in `pkg/_pinoweb_legacy`, so the new backend emits **zero** card events. Track 2 requires re-wiring that middleware onto `chatapp`'s widget plugin before any frontend adapter can render anything. Treat Phase E as its own mini-project with a backend half.

Sequence the tracks; do not block Track 1 on Track 2.

## 1. Current-state protocol (why it is broken)

The Inventory window renders `ChatConversationWindow` from `@go-go-golems/os-chat` (`renderInventoryApp.tsx:928`), passing `basePrefix={apiBasePrefix}` = `/api/apps/inventory`. That legacy component derives the **old SEM contract** from the prefix:

```
Frontend (os-chat ChatConversationWindow)        Backend (chathost) actually serves
------------------------------------------       ------------------------------------------
POST <prefix>/chat                     ──X──>     POST <prefix>/api/chat/sessions/{id}/messages
WS   <prefix>/ws?conv_id=...           ──X──>     GET  <prefix>/api/chat/ws  (+ subscribe frame)
GET  <prefix>/api/timeline?conv_id=..  ──X──>     GET  <prefix>/api/chat/sessions/{id}  (snapshot)
GET  <prefix>/api/chat/profiles        ──X──>     (no equivalent endpoint)
```

Every arrow is a 404. The backend is healthy (`GET <prefix>/api/chat/health` → 200); only the frontend speaks the wrong protocol. This is a client rewrite, not a backend outage.

The new contract (`handlers.go`, mounted by `host.MountRoutes` under `basePrefix`):

```
POST /api/chat/sessions                       {sessionId?, profile?} -> {sessionId}
POST /api/chat/sessions/{id}/messages         {prompt} -> {accepted, status:"running"}
GET  /api/chat/sessions/{id}                  -> snapshot
POST /api/chat/sessions/{id}/stop
POST /api/chat/sessions/{id}/tools/manifest
POST /api/chat/sessions/{id}/tools/results
GET  /api/chat/ws                             sessionstream JSON/protojson; client sends
                                              { "subscribe": { "sessionId, sinceSnapshotOrdinal } }
```

`chat-provider` speaks this contract natively — it is the same contract the Assistant window already uses successfully.

## 2. Target architecture

```
InventoryChatWindow(convId, apiBasePrefix, windowId)
  └─ <ChatProvider config={{ basePrefix, sessionStorageKey, createSessionBody, extensions, onDebugEvent }}>
       └─ <InventoryChatChrome>                         ← reproduces the screenshot
            ├─ header: title · connBadge · <ProfileSelector> · Events · Timeline · Copy Conv ID · Debug · counters
            ├─ <div scroll={useStickyScrollFollow}>
            │     └─ <ChatMessages/>                    ← renders text + <WidgetOutlet> for card widgets
            ├─ (empty state "How can I help?" + starter suggestions when timeline empty)
            ├─ <ChatComposer/>                          ← "Type a message…" + Send
            ├─ footer: "Streaming via sessionstream"
            └─ (optional) <InventoryDebugPanel/> when Debug toggled

ChatProvider ──HTTP/WS──▶ /api/apps/inventory/api/chat/*  (chathost.Host)
                                                   │
   chatapp.Engine ── widgetPlugin ─────────────┐  │ (host.go:99,134 — widget rail EXISTS)
   chatapp.Engine ── frontendToolPlugin ───────┤  │
   HyperCard middleware  ✗ NOT WIRED (quarantined in _pinoweb_legacy)  ← Phase E backend gap
```

Data flow parity with the Assistant window is exact; the only additions are (a) Inventory chrome, (b) a widget registry entry for cards, (c) a debug event sink.

## 3. Frontend package surface (verified against installed 0.2.1)

From `node_modules/@go-go-golems/chat-provider/index.d.ts`:

- Provider/runtime: `ChatProvider`, `useChatClient`, `useChatRuntime`.
- Store/selectors: `useChatSelector`, `useChatStore`, `useChatDispatch`, `selectOverlay`, `selectTimelineEntities`, `timelineSlice`, `overlaySlice`.
- Widgets: `defineWidget`, `WidgetOutlet`, `useWidget`, `WidgetRegistry`, `WidgetProps`.
- Timeline adapters: `defineTimelineAdapter` (+ live/hydrate variants), `TimelineAdapter`, `TimelineMutation`.
- Tools: `defineTool`, `useFrontendTool`, `useHumanTool`, `ToolCallOutlet`.
- Extensions: `defineChatExtensions`, `ChatExtension`, `ChatExtensionConfig`.
- Debug: `ChatDebugEvent`, `ChatDebugHandler`.

From `@go-go-golems/chat-overlay/index.d.ts`: `ChatMessages`, `ChatComposer`, `ChatPanel`, `ChatBubble`, `useStickyScrollFollow`, `ChatOverlayProvider`.

**Load-bearing constraint discovered:** `ChatProvider` accepts only `{ children, config }`. Widgets, tools, and timeline adapters are **not** props — they are registered through `config` because `ChatProviderConfig = ChatExtensionConfig & {...}`, and `ChatExtensionConfig` carries `{ extensions?, tools?, widgets?, timelineAdapters? }`. So the card widget and any frontend tools go into `config.widgets` / `config.timelineAdapters` / `config.extensions`, resolved once via `useMemo`.

```ts
const config = useMemo<ChatProviderConfig>(() => ({
  basePrefix: '/api/apps/inventory',
  sessionStorageKey: `inventory.chat.session.${convId}`,
  createSessionBody: () => ({ sessionId: convId, profile: selectedProfileRef.current }),
  onDebugEvent: appendDebugEvent,
  widgets: [hypercardCardWidget],          // Phase E
  timelineAdapters: [hypercardCardAdapter],// Phase E, only if cards need custom projection
}), [convId]);
```

## 4. Chrome mapping (from the reference screenshot)

The migrated window must reproduce, element for element:

| Screenshot element            | Source of truth (new stack)                                             | Phase |
|-------------------------------|-------------------------------------------------------------------------|-------|
| Title "Inventory Chat" + icon | static                                                                  | A     |
| "connected" badge             | `selectOverlay().wsStatus`                                               | A     |
| Profile dropdown              | new profile-list endpoint (§6) → local `<select>`; writes session profile| D     |
| Events button                 | opens `InventoryEventViewerWindow` (rebuilt on `ChatDebugEvent` buffer)  | C     |
| Timeline button               | opens `InventoryTimelineDebugWindow` (`selectTimelineEntities` + snapshot)| C     |
| Copy Conv ID                  | `navigator.clipboard.writeText(convId)` — convId **is** the sessionId    | B     |
| Debug toggle                  | inline `<InventoryDebugPanel>` over `selectOverlay`/entities/debug frames | B     |
| "0 messages / 0 tok" counters | derive from `selectTimelineEntities()`; tokens from overlay usage if present, else hide | A/B |
| "How can I help?" empty state | render when `selectTimelineEntities()` is empty                          | A     |
| Starter suggestions           | `INVENTORY_STARTER_SUGGESTIONS` → click calls `client.send(text)`        | A     |
| Composer "Type a message…"    | `<ChatComposer/>`                                                        | A     |
| Footer "Streaming via /chat + /ws" | change to "Streaming via sessionstream"                             | A     |

Preserve the existing macOS1 look by reusing `assistant-chat-macos1.css` (already the token bridge for the Assistant window). Inventory chrome should carry its own `data-part` hooks so the CSS can target header/footer without new fonts.

## 5. Session identity & profile lifecycle

- **convId is the sessionId.** Keep it. `Copy Conv ID`, the Events/Timeline windows (keyed by convId), and window dedupe all depend on it. Pass it explicitly via `createSessionBody: () => ({ sessionId: convId })` — the backend accepts a client-supplied id (`handlers.go:67`, regex `^[a-zA-Z0-9_-]{1,64}$`). Note: raw UUIDs pass; if any convId can contain other characters, sanitize before send.
- **Do not rely on `sessionStorageKey` alone** to bind identity. Set it for reconnect stability, but the authoritative bind is `createSessionBody.sessionId`. This avoids the "accidental reused session" failure the brief flags.
- **Profile is set at session creation** (`handlers.go:75` stores a per-session profile slug). There is **no** profile-update-mid-session endpoint today. Design decision: **profile is chosen before first message; changing it starts a new conversation/session.** This matches backend reality and avoids implying a capability that does not exist. Reflect this in the UI (changing the dropdown before any message is free; after the first message it prompts "New Chat with <profile>").

## 6. Profile selector strategy — pick option 1 (add an endpoint)

The old UI called `/api/chat/profiles`; the new backend has no such route. Three options in the brief; **choose option 1** because it is small, generic, and unblocks a real dropdown instead of a degraded one:

Add to `chathost` a read-only endpoint backed by the `ProfileSurface` the host already holds:

```
GET /api/chat/profiles -> { profiles: [{ slug, displayName, isDefault }], defaultSlug }
```

`host.go` already requires `opts.Profiles.Registry`; the launcher already computes `VisibleProfileSlugs()` and `DefaultProfileSlug()` for inventory (`main.go:194–196`). Wiring is: expose those on `ProfileSurface`, add one handler in `handlers.go`, register in `MountRoutes`. This endpoint is generic and belongs in `chathost` (both Assistant and Inventory benefit).

Frontend: a small local `<ProfileSelector>` that fetches `${basePrefix}/api/chat/profiles` on mount and renders the `<select>`. Do **not** port the os-chat `ChatProfileSelector`/`chatProfilesSlice` (they assume the SEM store). Keep the selector Inventory-local for now; promote to a react-chat generic component only after the endpoint shape is confirmed stable (§9).

Interim fallback if the endpoint slips: render the dropdown disabled showing "Default (default)" — never a broken dropdown that 404s.

## 7. Debug strategy — Events / Timeline / Debug

The os-chat debug windows (`EventViewerWindow`, `TimelineDebugWindow`) read the SEM/proto timeline and must **not** be reused. Rebuild against `chat-provider`'s own signals.

`onDebugEvent` emits typed `ChatDebugEvent`s: `ws-lifecycle`, `raw-ws`, `parsed-frame`, `snapshot`, `ui-event`. Design:

- **Debug event buffer:** a bounded (e.g. last 500) ring buffer. Store it in **React state inside the window**, keyed per convId — not a global Redux slice — because the provider store is already per-window and debug data is ephemeral. If cross-window inspection is later wanted, promote to a reusable store then.
- **Debug toggle:** inline `<InventoryDebugPanel>` showing three columns: `selectOverlay()` (runStatus/wsStatus/error/sessionId), `selectTimelineEntities()` (projected entities), and the tail of the debug buffer (raw/parsed frames). This replaces the old inline `renderMode: 'debug'`.
- **Events window:** `InventoryEventViewerWindow(convId)` renders the raw/parsed frame stream for that conversation. It needs the same buffer the chat window collects — so the buffer must be lifted to a place both windows can read. Cleanest: a tiny per-convId debug store (module-level `Map<convId, DebugBuffer>` with a `useSyncExternalStore` subscription), fed by the chat window's `onDebugEvent`. This keeps the provider store clean while letting a detached window subscribe.
- **Timeline window:** `InventoryTimelineDebugWindow(convId)` shows projected `TimelineEntity[]` (from `selectTimelineEntities` via a second provider mount subscribed to the same session) **and** the raw snapshot entities from `GET /api/chat/sessions/{id}`. Showing both projected + raw is the useful debug view.

Recommended split: `Copy Conv ID` and inline `Debug` are trivially local (Phase B). `Events`/`Timeline` detached windows are Phase C. The event-viewer and timeline-debug shells are strong **upstream** candidates for `react-chat` once proven (§8).

## 8. Generated-card strategy (the hard part)

This is where the design must be concrete, because "chat text works" is not acceptance.

### 8.1 Backend event source — currently absent

Finding: `chathost` already installs `widgets.NewWidgetPlugin()` into the `chatapp.Engine` (`host.go:99,134`). That is the rail: `chatapp` widget instances are projected into sessionstream and surface to `chat-provider` as widget entities that `WidgetOutlet` renders. **But nothing emits card widgets** — the HyperCard generation logic (`hypercard_middleware.go`, `hypercard_events.go`, `hypercard_extractors.go`, `card_prompt.go`) is quarantined in `pkg/_pinoweb_legacy` and is not attached to the engine's turn pipeline. The old path also depended on SEM `hypercard.card.v2` timeline events that no longer exist.

So Phase E has a **mandatory backend half**: adapt the quarantined middleware to emit `chatapp` widget instances (or a backend tool that returns a card widget) rather than SEM timeline events, and wire it into the inventory chathost's engine/turn pipeline (via `Options.BackendTools` or a new `Options.Middlewares` hook if middleware-level injection is needed — `host.go` does not currently expose one, so adding a middleware hook may be required).

### 8.2 Two viable representations — choose backend-tool-returns-widget

1. **Backend tool → widget result.** The model calls an inventory tool (e.g. `render_inventory_card`); the tool executes server-side and returns a widget instance via the widget plugin. Frontend registers a `defineWidget('inventory.card', InventoryCardWidget)` and `WidgetOutlet` renders it inside the message. **Preferred** — it uses rails that already exist (widget plugin + frontend tool/widget registries), needs no custom timeline adapter, and matches how the model naturally invokes capabilities.
2. **Custom timeline adapter.** Backend emits a custom canonical frame; frontend `defineTimelineAdapter` projects it into a `TimelineEntity` rendered by a bespoke renderer. More flexible, more code, only needed if cards must exist outside the tool-call model.

Go with (1) unless a concrete requirement forces (2).

### 8.3 Renderer

Do **not** reuse `HypercardCardRenderer` mechanically — it was keyed to `hypercard.card.v2` SEM entities. Wrap the underlying card-rendering component (from `@go-go-golems/os-scripting` runtime surfaces, which the Inventory folder already uses) in a `WidgetProps`-shaped adapter: `({ props }) => <RuntimeSurface … data={props} />`. The visual card component is reusable; only its data envelope changes.

### 8.4 Acceptance for Phase E

"Ask Inventory to generate a low-stock card" → backend tool fires → widget instance appears in the sessionstream → `WidgetOutlet` renders a visible card in the chat timeline. Verified in-browser, plus a backend test that the tool emits a widget instance.

## 9. Package-boundary decisions (DRs)

- **DR-1 — Profile-list endpoint → `chathost` (generic).** Both apps need it; it is contract, not domain.
- **DR-2 — `ProfileSelector` → Inventory-local first, upstream candidate.** Promote to react-chat only after the endpoint shape is frozen.
- **DR-3 — Debug buffer + Event/Timeline shells → Inventory-local first, strong upstream candidates.** They are generic over `ChatDebugEvent`/`TimelineEntity`; upstream once the per-convId debug-store pattern is proven.
- **DR-4 — Card widget component + backend emitter → Inventory-local.** Domain-specific; the *widget plugin rail* is already generic in `chatapp`/`chathost`.
- **DR-5 — Starter suggestions, domain prompts, tool IDs → Inventory-local.** Domain content.
- **DR-6 — os-chat stays a dependency until Phase 4.** This migration removes os-chat from the **Inventory active chat path** only; do not claim os-chat is gone. `store.ts` SEM reducers and `main.tsx` theme wiring are Phase 4.

## 10. Component API sketch

```tsx
// renderInventoryApp.tsx — replace InventoryChatAssistantWindow

function InventoryChatWindow({ convId, apiBasePrefix, windowId }: InventoryLauncherAppWindowProps) {
  const [profile, setProfile] = useState<string | null>(null);
  const profileRef = useRef(profile); profileRef.current = profile;

  const config = useMemo<ChatProviderConfig>(() => ({
    basePrefix: apiBasePrefix,                                  // '/api/apps/inventory'
    sessionStorageKey: `inventory.chat.session.${convId}`,
    createSessionBody: () => ({ sessionId: convId, profile: profileRef.current ?? undefined }),
    onDebugEvent: (e) => inventoryDebugStore.push(convId, e),   // per-convId ring buffer
    widgets: [inventoryCardWidget],                             // Phase E
  }), [convId, apiBasePrefix]);

  return (
    <ChatProvider config={config}>
      <InventoryChatChrome convId={convId} apiBasePrefix={apiBasePrefix}
                           profile={profile} onProfileChange={setProfile} />
    </ChatProvider>
  );
}

// Chrome consumes provider selectors; body mirrors AssistantWindowBody exactly.
function InventoryChatChrome({ convId, apiBasePrefix, profile, onProfileChange }: ChromeProps) {
  const client = useChatClient();
  const overlay = useChatSelector(selectOverlay);
  const entities = useChatSelector(selectTimelineEntities);
  const scroll = useStickyScrollFollow({ enabled: true, contentVersion: `${overlay.runStatus}:${overlay.wsStatus}`, resetKey: overlay.sessionId });
  useEffect(() => { client.connect().catch(() => {}); }, [client]);

  const empty = entities.length === 0;
  return (
    <div className="assistant-chat-window inventory-chat-window" data-part="inventory-chat-window">
      <InventoryChatHeader
        convId={convId} apiBasePrefix={apiBasePrefix}
        wsStatus={overlay.wsStatus} profile={profile} onProfileChange={onProfileChange}
        messageCount={entities.length} /* Events/Timeline/CopyConvID/Debug live here */ />
      {overlay.error ? <div className="chat-overlay-error-bar">{String(overlay.error)}</div> : null}
      <div ref={scroll.containerRef} onScroll={scroll.onScroll} onWheel={scroll.onWheel} className="chat-overlay-messages-scroll">
        {empty ? <InventoryEmptyState onPick={(t) => client.send(t)} suggestions={INVENTORY_STARTER_SUGGESTIONS} />
               : <ChatMessages bottomRef={scroll.tailRef} />}
      </div>
      <ChatComposer disabled={overlay.runStatus === 'streaming'} />
      <div className="inventory-chat-footer" data-part="footer">Streaming via sessionstream</div>
    </div>
  );
}
```

Window routing (`InventoryLauncherAppWindow`, `renderInventoryApp.tsx:996`) is unchanged except it now returns `<InventoryChatWindow>`. The Event/Timeline instance-prefix branches (`:1000`, `:1004`) keep their window shells but render the rebuilt components. Drop `ensureChatModulesRegistered()`, the os-chat imports, and `chatProfilesSlice` usage as their consumers are replaced.

## 11. Phased implementation plan

- **Phase A — text chat on ChatProvider + chrome shell.** Replace the window body; wire header/footer/empty-state/starter-suggestions/composer. Profile dropdown present but static-disabled. All 404s gone; prompt round-trips. *This is the milestone that makes Inventory chat "work again."*
- **Phase B — Copy Conv ID + inline Debug panel.** Per-convId debug store fed by `onDebugEvent`; inline panel over overlay/entities/frames.
- **Phase C — Events + Timeline detached windows.** Rebuilt on the debug store + snapshot endpoint. Keep existing window payloads/commands (`buildEventViewerWindowPayload`, `buildTimelineDebugWindowPayload`) — only the rendered component changes.
- **Phase D — Profile selector.** Backend `GET /api/chat/profiles` in `chathost`; local `<ProfileSelector>`; profile-at-creation semantics (§5).
- **Phase E — Generated cards.** Backend: un-quarantine + adapt HyperCard emitter to `chatapp` widget/tool rail (may need an `Options.Middlewares` hook in `chathost`). Frontend: `defineWidget('inventory.card', …)` + renderer adapter. Acceptance per §8.4.
- **Phase F — Cleanup.** Remove now-dead os-chat imports from the Inventory path; leave global os-chat wiring for Phase 4.

## 12. Validation matrix

| Check | Method | Phase gate |
|-------|--------|-----------|
| No `GET …/api/chat/profiles` 404 | Network tab: call absent or 200 | A/D |
| No `…/ws?conv_id=` / `…/chat` / `…/api/timeline` 404 | Network tab: those calls no longer made | A |
| Session created | `POST …/api/chat/sessions` 200 with `{sessionId==convId}` | A |
| WS subscribe | `GET …/api/chat/ws` 101 + subscribe frame | A |
| Prompt reply | send "Show current inventory status" → assistant text streams | A |
| Copy Conv ID | clipboard equals `overlay.sessionId` | B |
| Debug panel | shows overlay + entities + recent frames | B |
| Events/Timeline windows | open, populated for the active convId | C |
| Profile list | dropdown from `/api/chat/profiles`; default preselected | D |
| Card generation | prompt requesting a card renders a visible card widget | E |
| os-chat transport unused on Inventory path | no os-chat network/store calls in the chat window | A/F |

## 13. Risks & notes

- **`chathost` has no middleware hook.** Phase E's backend half may require adding `Options.Middlewares` (or a card-emitting `BackendTools` factory). Scope this during Phase E, not Phase A.
- **Token counter.** The screenshot shows a "tok" counter. If overlay carries no usage data, hide the counter rather than show a wrong 0 — do not fabricate metrics.
- **Two provider mounts for Timeline window.** The detached Timeline window subscribing to the same session is fine (read-only), but confirm the backend tolerates a second WS subscriber per session before relying on it; otherwise drive the Timeline window from the shared debug store + a one-shot snapshot fetch.
- **Do not port `chatProfilesSlice`.** Its shape assumes the SEM store; the new profile state is local component state + the new endpoint.
