---
Title: Raw findings — react-chat (chat-provider / chat-overlay) and fit for the assistant migration
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - wesen-os
    - pinocchio
    - frontend
DocType: reference
Intent: short-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Raw evidence sweep of ~/code/wesen/go-go-golems/react-chat: published @go-go-golems/chat-provider + chat-overlay packages, chatapp/sessionstream wire contract, browser-side tool call API, relation to os-chat, and gaps for wesen-os adoption."
LastUpdated: 2026-07-03T15:00:00-07:00
WhatFor: "Provenance for the react-chat assessment in the main design doc (Decision D3 revision)."
WhenToUse: "When implementing the assistant migration with chat-provider."
---

# Raw findings — react-chat (Explore agent report, 2026-07-03)

Repo: `/home/manuel/code/wesen/go-go-golems/react-chat` (Go module `github.com/go-go-golems/chat-overlay`, go 1.26.3). Own repo (PRs #1–#4), not a pinocchio submodule.

## 1. What it is

A **full-stack reference implementation** of the new chatapp/sessionstream stack: Go backend example + two published React npm packages.

- README:1-56 — "Reusable React packages for embedding a websocket-backed assistant chat runtime and a floating overlay UI."
- npm packages (published to npmjs, `.npmrc` pins registry):
  - `@go-go-golems/chat-provider` **v0.2.1** (`packages/chat-provider/package.json:2`) — "Provider runtime, state, websocket, tool, and widget primitives for embeddable React chat." Versions 0.1.0→0.2.1, first publish 2026-06-01.
  - `@go-go-golems/chat-overlay` **v0.2.1** — floating overlay UI + retro-mac theme.
- Workspace: `packages/chat-provider`, `packages/chat-overlay`, `web` (ecommerce demo `@go-go-golems/chat-overlay-ecommerce-demo`). Go side: `cmd/chat-overlay/{main.go,cmds/serve.go}`, `internal/webchat/*` (server, handlers, real_runtime, turn_store, mockengine), `pkg/doc`.
- Recent commits: `f05a716` Merge #4 add-docs-deploy (2026-06-10), `194871e` reasoning trace handling (06-06), `38c535f` provider-safe frontend tool names, `ecc4c3f` private Redux context release. Active late May–mid June 2026.
- **Not** the source of pinocchio `pkg/spa` (that is the Glazed help browser SPA, `pinocchio/pkg/spa/spa.go:12`). The pinocchio chat frontend is `pinocchio/cmd/web-chat/web` which depends on `@go-go-golems/chat-provider@^0.2.1` (`cmd/web-chat/web/package.json:23`) and builds to `cmd/web-chat/static/dist`.

## 2. Architecture

- chat-provider exports (`packages/chat-provider/src/index.ts:1-27`): `ChatProvider`, `createChatClient`, hooks `useChatClient`/`useChatRuntime`, Redux store (`createChatStore`, `useChatDispatch/Selector/Store`, `timelineSlice`, `overlaySlice`), widget API (`defineWidget`, `WidgetOutlet`, `useWidget`), tool API (`defineTool`, `useTool`, `useFrontendTool`, `useHumanTool`, `ToolCallOutlet`), `defineTimelineAdapter`; subpath exports `./core ./store ./tools ./widgets ./ws`.
- chat-overlay exports: `ChatOverlayProvider`, `ChatBubble`, `ChatPanel`, `ChatComposer`, `ChatMessages`, `useStickyScrollFollow`; theme `packages/chat-overlay/src/theme/retro-mac.css`.
- State: Redux Toolkit on a **private** `ChatReduxContext` (`ChatProvider.tsx:53`, ticket CHATOVERLAY-015) — no collision with host app's store.
- Backend contract — REST (serverkit) + WS (sessionstream):
  - REST: `POST /api/chat/sessions`, `.../{id}/messages`, `.../{id}/stop`, `.../{id}/tools/manifest`, `.../{id}/tools/results` (`createChatClient.ts:101,176,191,129,140`). Config: `basePrefix`, `apiBase`, `sessionIdParam`, `sessionStorageKey`, `createSessionBody`, `sendMessageBody`, `onDebugEvent` (`createChatClient.ts:12-21`).
  - WS: `${proto}://host${basePrefix}/api/chat/ws` (`ws/protocol.ts:10-13`); subscribe frame `{subscribe:{sessionId, sinceSnapshotOrdinal}}` (`protocol.ts:15-22`). Frames decoded as **protojson**, not binary: `hello/snapshot/subscribed/uiEvent/error/ping/pong` (`protocol.ts:52-96`).
- Timeline events mapped (`ws/timelineEvents.ts:47-313`): `ChatRunStarted/Finished/Stopped/Failed`, `ChatUserMessageAccepted`, `ChatTextSegmentStarted/Patch/Finished`, `ChatReasoningSegmentStarted/Patch/Finished`, `ChatWidgetInstanceStarted/Patched/Completed/Removed`, `ChatFrontendToolCallRequested/ResultReceived`. Snapshot entities: `ChatMessage`, `ChatWidgetInstance`, `ChatFrontendToolCall`.
- Go backend built on the new stack: imports `pinocchio/pkg/chatapp` (+serverkit, frontendtools, widgets, pb/proto v1), `pinocchio/pkg/inference/runtime`, `pinocchio/pkg/persistence/chatstore`, `pinocchio/pkg/cmds/profilebootstrap`, `sessionstream/pkg/sessionstream` (+`transport/ws`). go.mod pins: **pinocchio v0.11.5, sessionstream v0.0.6, geppetto v0.13.3** (`go.mod:6-9`).

## 3. Browser-side tool calls

- Types (`tools/toolRegistry.ts:20-63`): `FrontendTool` (`execute(input,ctx)`), `HumanTool` (`render()`), `BackendToolUI` (render-only) extending `BaseTool{name, description, parameters (Zod→JSON Schema), available}`. Provider-safe names enforced: `PROVIDER_SAFE_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/`.
- Registration: `useFrontendTool(tool, deps)` → `useTool` → `client.tools.register(tool)` + `client.tools.syncManifest()` on mount, unregister on unmount (`useFrontendTool.ts:4`, `useTool.ts:5-16`).
- Roundtrip:
  1. Mount → `POST .../tools/manifest` `{revision, tools:[{name,description,mode,inputSchema,available}]}` (`createChatClient.ts:126-135`); Go `HandleToolManifest` (`internal/webchat/handlers.go:118`) submits `frontendtools.CommandManifest` (`toolv1.FrontendToolManifestCommand`) to the sessionstream hub (`handlers.go:152`).
  2. LLM tool call → backend emits `ChatFrontendToolCallRequested` UI-event over WS.
  3. `applyUIEvent` → `toolRuntime.handleFrontendToolUIEvent` (`ws/timelineEvents.ts:374`): look up tool, validate with Zod, run `tool.execute(input,{signal,toolCallId})` (`tools/toolRuntime.ts:37-105`); human tools pend until `respondToHumanTool` (:111-126).
  4. `submitToolResult` → `POST .../tools/results` `{toolCallId,toolName,status,result|error}` (`createChatClient.ts:137-146`); Go `HandleToolResult` (`handlers.go:159`) submits `frontendtools.CommandResult` back to hub → engine (`handlers.go:187`).
- Examples: `web/src/App.tsx`, `web/src/ecommerce/ProductCarousel.tsx` (`cart_add`, `checkout_confirm`, `catalog_search`); stories `ToolCallOutlet.stories.tsx`, `WidgetOutlet.stories.tsx`. Ticket CHATOVERLAY-004 = "move frontend tool bridge support into pinocchio chatapp".
- Widgets: `defineWidget(name, component)`, `WidgetOutlet`, `useWidget`, `WidgetProps={instanceId,widgetName,status,props}`, driven by `ChatWidgetInstance*` events.

## 4. Relationship to @go-go-golems/os-chat — parallel, no shared code

- os-chat (go-go-os-frontend) deps: os-core, @bufbuild/protobuf, CodeMirror/Lezer — does NOT depend on chat-provider. Own `wsManager` (`os-chat/src/chat/ws/wsManager.ts`), `conversationManager`, `profileApi` hitting `/api/chat/profiles`, `/api/chat/schemas/middlewares`, `/api/chat/schemas/extensions` (`profileApi.ts:225-253`) — a different contract.
- **go-go-os-chat (Go) main still ships the OLD architecture**: its own `pkg/webchat` (chat_service, conversation, llm_loop_runner) and `pkg/sem/pb/proto/sem/timeline` — the design pinocchio deleted. It bumped deps (geppetto v0.13.3, goja v0.8.3) but not the transport architecture.
- react-chat/chat-provider is the lower-level, sessionstream/chatapp-native lib that os-chat or wesen-os could adopt in place of bespoke wsManager/timeline code — but only against a chatapp/sessionstream backend.

## 5. Consumers today

Only `pinocchio/cmd/web-chat/web` (`@go-go-golems/chat-provider@^0.2.1`) — builds custom UI on the provider (`ProviderToolCallRenderer.tsx`, `ProviderWidgetRenderer.tsx`, `pinocchioTimelineAdapters.ts`), does not use chat-overlay. No usage in coinvault, go-go-host, go-go-os-frontend, go-go-os-chat, or others (grep of all package.json + ts/tsx outside node_modules).

## 6. Theming / embedding

- Overlay embeds in a host React app: `<ChatProvider config={{basePrefix:''}}>…<ChatOverlayProvider/></ChatProvider>` (README:16-28); renders under `.chat-overlay-root` (`ChatOverlayProvider.tsx:10-18`).
- Isolated Redux via private context — safe inside wesen-os's own Redux desktop.
- CSS: `theme/retro-mac.css` as side-effect import (`sideEffects:["**/*.css"]`); chat-provider is `sideEffects:false` (tree-shakable). Subpath export `@go-go-golems/chat-overlay/theme/retro-mac.css`.
- Peers: react/react-dom ^18||^19; deps @reduxjs/toolkit ^2.12, react-redux ^9.3, zod ^4.4; ESM, no bundler lock-in.

## 7. Maturity

- Tests: 2 TS unit test files (`toolRegistry.test.ts`, `ws/timelineAdapterRegistry.test.ts`); Go `internal/webchat/server_test.go`, `turn_store_test.go`. Storybook: 4 stories. Docs: `docs/npm-publishing-playbook.md`, Glazed help `pkg/doc/topics/chat-overlay-overview.md`.
- ttmp tickets CHATOVERLAY-001..015 (2026-05-29→06-02) document intent: react-chat was the **incubator**; reusable Go pieces were upstreamed into pinocchio `pkg/chatapp`, React pieces published as the two npm packages. Notable: 002 embedding API w/ client-side tool calling, 003/004/005 extract backend/tool-bridge/widget plugin into chatapp, 012 standardize WS decoding on protobuf schemas, 013 npm publish, 014 chatapp proto as Buf module, 015 private Redux context.

## 8. What using it in wesen-os requires (gaps)

1. **Backend swap is the blocker**: chat-provider speaks the chatapp/sessionstream contract; wesen-os's assistant (via go-go-os-chat) runs old webchat+sem, which does not expose those endpoints. The assistant backend must move to pinocchio `pkg/chatapp`+`sessionstream` (react-chat `internal/webchat` and pinocchio `cmd/web-chat` are the reference implementations).
2. Provider is UI-agnostic; chat-overlay is opinionated (retro-mac — aesthetically adjacent to the wesen-os desktop). Either consume chat-provider directly with wesen-os-styled components (as pinocchio cmd/web-chat does) or restyle the overlay.
3. Redux coexistence solved (private context); peer versions compatible with os-chat's.
4. Frontend tools/widgets ready out of the box (`useFrontendTool`, `defineWidget`) — superset of what os-chat offers; requires chatapp frontendtools/widgets plumbing (present in pinocchio, absent in go-go-os-chat).
5. No desktop-shell embedding example exists — overlay-in-desktop wiring (mount, theming, session lifecycle per desktop window) is net-new.
6. Packages installable from npm (0.2.1); no local linking needed once the backend contract is met.
7. Caveats: light test coverage, young publish history, pinned pinocchio v0.11.5 / sessionstream v0.0.6 — align versions when bumping.
