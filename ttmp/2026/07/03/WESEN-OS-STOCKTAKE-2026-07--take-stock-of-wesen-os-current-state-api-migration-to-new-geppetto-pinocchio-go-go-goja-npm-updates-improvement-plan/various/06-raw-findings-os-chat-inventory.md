---
Title: Raw findings — os-chat package inventory (keep vs replace analysis)
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - wesen-os
    - frontend
DocType: reference
Intent: short-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "LOC-level inventory of @go-go-golems/os-chat: what duplicates chat-provider (transport/state), what duplicates chat-overlay (presentational UI), what is genuinely unique (debug windows, renderer registry, desktop window), and who consumes it."
LastUpdated: 2026-07-03T16:00:00-07:00
WhatFor: "Provenance for Decision D7 (replace os-chat with chat-provider/chat-overlay, staged)."
WhenToUse: "When executing the os-chat replacement."
---

# Raw findings — os-chat inventory (Explore agent report, 2026-07-03)

Package: `~/code/wesen/go-go-golems/go-go-os-frontend/packages/os-chat` (v0.1.1, published). Main checkout and workspace snapshot identical in layout.

## 1. Layout and LOC

Total **7,640 LOC** excluding tests/stories (11,887 with):

| Dir | LOC | Role |
|---|---|---|
| `src/chat/sem/` | 1,798 | Transport/decode — SEM envelope registry + proto decode; `sem/pb/**` generated protobuf = 1,245; hand-written `semRegistry.ts` (413), `semHelpers.ts` (68), `timelineMapper.ts` (29), `timelinePropsRegistry.ts` (43) |
| `src/chat/debug/` | 1,691 | Event viewer + timeline debugger windows |
| `src/chat/runtime/` | 1,087 | `conversationManager.ts` (114), `http.ts`, `profileApi.ts` (258), `useConversation.ts`, profile hooks, `contextActions.ts`, module bootstrap |
| `src/chat/components/` | 1,085 | React UI |
| `src/chat/state/` | 1,076 | Redux slices: `timelineSlice` (287), `chatSessionSlice` (260), `selectors` (268), `chatWindowSlice` (98), `profileSlice` (76), `suggestions` (87) |
| `src/chat/ws/` | 451 | `wsManager.ts` — WebSocket transport |
| `src/chat/renderers/` | 338 | Timeline entity renderer registry + builtins |
| misc | ~110 | mocks, utils, theme CSS |

**Transport proper** ≈ 2,480 LOC (`ws/` + `sem/` + `runtime/{conversationManager,http}`) plus transport-shaped Redux (~547). ≈ ⅓ of the package.

Wire protocol (old): `wsManager.ts:83` connects `ws://<host><basePrefix>/ws?conv_id=…&profile=…&registry=…`, frames `{sem:true, event:{…}}` (`wsManager.ts:122`), hydrates via `GET <basePrefix>/api/timeline?conv_id=` (TimelineSnapshotV2 protojson, `wsManager.ts:96,372`), replays buffered frames by `event.seq`. Prompts via `POST <basePrefix>/chat` (`http.ts:59`). **No `/stop` endpoint** — cancel = close socket. Entirely different from chat-provider's REST sessions/messages/stop + sessionstream WS.

## 2. UI components

- `ChatConversationWindow.tsx` (293) — the real product surface: Redux-wired, per-kind renderer resolution, desktop context-menu actions (`os-core/desktop-react`), `ChatWindow` + `StatsFooter`. Tightly bound to store + `useConversation`/singleton `conversationManager`.
- `ChatWindow.tsx` (157) — presentational shell; `ChatView` (73), `StreamingChatView` (167), `ChatSidebar` (116) — prop-driven message list/composer variants (overlap chat-overlay's ChatMessages/ChatComposer/ChatPanel).
- `StatsFooter.tsx` (72) — model/tokens/tok-s footer (trivial, no overlay equivalent).
- `ChatProfileSelector.tsx` (70) — only profile-switcher UI; bound to profile hooks.
- **No markdown renderer** (messages render `white-space: pre-wrap` plain text). CodeMirror/Lezer used only in `debug/SyntaxHighlight.tsx` (85) — static JS/YAML highlighter for debug windows (the heavy `@codemirror/*`/`@lezer/*` deps exist solely for this).
- Renderers (`renderers/builtin/`): ToolCall/ToolResult/Message/Status/Log/Generic renderers dispatched via `rendererRegistry.ts` keyed by entity kind — parallel to chat-provider `defineTimelineAdapter`/`defineWidget` but wired to os-chat's SEM kinds.
- `profileApi.ts` fetches `/api/chat/profiles`, `/api/chat/schemas/middlewares|extensions` — **only `listProfiles` is consumed**; the schema endpoints have no UI (dead-ish surface).
- Debug windows (unique): `EventViewerWindow.tsx` (483, live SEM stream viewer + `StructuredDataTree` 227 + `eventBus.ts` 117), `TimelineDebugWindow.tsx` (409) + `timelineDebugModel.ts` (198), `yamlFormat.toYaml` (86), `clipboard.ts`, `debugChannels.ts`.

## 3. Exports and launcher usage

Exports: `.` → barrel (everything), `./theme` → CSS side effect. **os-launcher imports only**: `ChatConversationWindow, EventViewerWindow, TimelineDebugWindow` (`assistantModule.tsx:5,167`), four reducers `chatProfilesReducer, chatSessionReducer, chatWindowReducer, timelineReducer` (`store.ts:3`), theme CSS (`main.tsx:7`). It never touches wsManager/conversationManager/profileApi directly.

## 4. Other consumers

- **`packages/os-scripting` (hypercard)** — deepest: imports `timelineSlice`, `TimelineEntity`, `RenderEntity`, `RenderContext`, `SyntaxHighlight`, structured-record helpers; renders custom timeline entities through os-chat's renderer registry + Redux timeline model (`hypercard/timeline/hypercardCard.tsx`, `artifacts/artifactRuntime.ts`, `artifactProjectionMiddleware.ts`, `debug/RuntimeSurfaceDebugWindow.tsx`). Coupled to the **data model**, not just UI.
- **`apps/apps-browser`** — `SyntaxHighlight, toYaml` only (debug helpers).
- **`apps/crm`** — reducers + theme.
- **`go-go-app-inventory/apps/inventory`** — reducers + chat window/render surface (same shape as launcher).

## 5. Coupling / separability

- os-core coupling light (Btn/Chip cosmetics; `desktop-react` context-menu/window-id in 3 files). Theme is CSS-var/`data-part`, independent.
- Prop-driven components (ChatView, StreamingChatView, ChatSidebar, StatsFooter, ChatWindow, builtin renderers, SyntaxHighlight) — separable.
- Main surface NOT separable: `ChatConversationWindow` + `useConversation` → singleton `conversationManager` → `WsManager`, reading os-chat's own slices. Reusing it on chat-provider means rewriting useConversation, SEM handlers, timeline/session slices.

## 6. Activity & docs

Last touch 2026-05-11 (`0fa1a3e1` npm-publish bump); no feature commits since — maintenance/packaging mode. No architecture/roadmap doc about os-chat's future; only May npm-publishing tickets mention it.

## 7. Factual split

**(a) Duplicates chat-provider (discard on transport swap):** `ws/wsManager.ts`, `runtime/{conversationManager,http}.ts`, all of `sem/**` (incl. 1,245 LOC generated protos), `state/{timelineSlice,chatSessionSlice,selectors,suggestions}`, `runtime/{useConversation,contextActions,registerChatModules,moduleBootstrap}`, `profileApi` + profile hooks/slice (semantics differ — re-home on new backend).

**(b) Duplicates chat-overlay:** `ChatView`, `StreamingChatView`, `ChatSidebar`, `ChatWindow`, `StatsFooter` (minor), `theme/chat.css`.

**(c) Genuinely unique (entanglement noted):** debug suite (high for the two windows — SEM eventBus + timeline model; low for leaf utils `SyntaxHighlight`/`toYaml`/`StructuredDataTree`, already reused by os-scripting/apps-browser); `ChatConversationWindow` (high — store + conversationManager + desktop-react); renderer registry + builtins (React components prop-driven, but entity/props shapes come from the SEM model); `ChatProfileSelector` (thin, transport-coupled).

Net: components/renderers/debug UI is the reusable value; the ~2,500-LOC transport stack is what chat-provider replaces; but os-scripting/inventory and ChatConversationWindow read the timeline Redux model + RenderEntity types directly, so the UI is not cleanly liftable without re-homing store and renderer contracts.
