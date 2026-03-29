---
Title: OpenAI App Server Integration Architecture, Gap Analysis, and Implementation Guide
Ticket: APP-01-OS-INTEGRATE-OPENAI-APP-SERVER
Status: active
Topics:
    - openai-app-server
    - chat
    - backend
    - websocket
    - wesen-os
    - go-go-os
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: go-go-app-inventory/apps/inventory/src/launcher/module.tsx
      Note: Frontend launcher module baseline
    - Path: go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Chat/event/timeline window wiring precedent
    - Path: go-go-app-inventory/pkg/backendmodule/module.go
      Note: Inventory backend adapter pattern to replicate
    - Path: go-go-app-inventory/pkg/backendmodule/reflection.go
      Note: Inventory reflection API baseline
    - Path: go-go-os-backend/pkg/backendhost/lifecycle.go
      Note: Lifecycle startup and required-health ordering
    - Path: go-go-os-backend/pkg/backendhost/manifest_endpoint.go
      Note: Manifest/reflection/docs hints and endpoint contract
    - Path: go-go-os-backend/pkg/backendhost/module.go
      Note: Backend app module and optional reflection/docs contracts
    - Path: go-go-os-backend/pkg/backendhost/routes.go
      Note: Namespaced routing and forbidden legacy alias constraints
    - Path: go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts
      Note: Required /chat and /api/timeline path conventions
    - Path: go-go-os-frontend/packages/chat-runtime/src/chat/sem/semRegistry.ts
      Note: SEM event handling contract
    - Path: go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts
      Note: WebSocket + hydration semantics expected by frontend
    - Path: openai-app-server/cmd/openai-app-server/harness_run_command.go
      Note: Transport flags and stdio-only enforcement gap
    - Path: openai-app-server/pkg/codexrpc/client.go
      Note: Handshake and request lifecycle behavior
    - Path: openai-app-server/pkg/codexrpc/transport_stdio.go
      Note: Only implemented production transport today
    - Path: openai-app-server/pkg/js/module_codex.go
      Note: JS runtime codex session APIs and thread helpers
    - Path: wesen-os/apps/os-launcher/src/App.tsx
      Note: resolveApiBase/resolveWsBase host mapping
    - Path: wesen-os/cmd/wesen-os-launcher/main.go
      Note: Module registry and namespaced mount composition root
    - Path: wesen-os/cmd/wesen-os-launcher/main_integration_test.go
      Note: Integration test contract for chat/ws/timeline/docs/reflection
ExternalSources: []
Summary: Evidence-backed intern-level guide for integrating openai-app-server as a first-class wesen-os app wired to chat-runtime timeline/event windows.
LastUpdated: 2026-03-02T17:08:30-05:00
WhatFor: Design and implementation blueprint for adding an openai app module across backendhost + launcher frontend + timeline event system.
WhenToUse: Use when implementing APP-01 or onboarding engineers to this integration path.
---


# OpenAI App Server Integration Architecture, Gap Analysis, and Implementation Guide

## Executive Summary

This ticket asks for a new app in the wesen-os/go-go-os ecosystem that wraps `openai-app-server` and is fully wired into the chat window and timeline event/debug windows.

Repository analysis shows the platform pieces already exist and are mature:

- Backend composition and app isolation are standardized via `AppBackendModule`, namespaced routing, lifecycle management, manifest/reflection endpoints, and docs endpoints in `go-go-os-backend` and `wesen-os`.
- Frontend launcher composition is standardized via `LaunchableAppModule`, registry/store/contribution contracts, and stable API/WebSocket base resolution in `go-go-os-frontend` + `wesen-os/apps/os-launcher`.
- Chat + timeline event plumbing is already working end-to-end in `chat-runtime` and productionized by `go-go-app-inventory` (including `ChatConversationWindow`, `EventViewerWindow`, `TimelineDebugWindow`).

The blocker is not launcher architecture; the blocker is the current state of `openai-app-server`:

- It is currently a CLI harness/client for codexrpc over stdio.
- Flags advertise `stdio|websocket`, but command constructors hard-reject non-stdio transports.
- No HTTP backend module exists yet for `openai-app-server` under `/api/apps/<id>/...`.
- No WebSocket route for frontend chat-runtime consumption exists yet.
- No SEM/timeline bridge exists from codexrpc notifications to frontend timeline entities.

Recommended path:

1. Build a backend adapter module package in `openai-app-server` that implements `backendhost.AppBackendModule` (+ reflection/docs).
2. Expose inventory-compatible endpoints first (`/chat`, `/ws`, `/api/timeline`) under namespaced mounting so existing chat-runtime UI can be reused immediately.
3. Map codexrpc notifications/events to SEM events (`timeline.upsert`, `llm.*`, tool events) and provide timeline snapshot hydration.
4. Add a frontend launcher module (`openai`) following inventory’s pattern, passing `basePrefix` from `resolveApiBase('openai')` to `ChatConversationWindow` and exposing Event Viewer + Timeline Debug windows.
5. Register module in `wesen-os` composition list + frontend module list + optional reducers, then validate via integration tests modeled after existing inventory/gepa/sqlite tests.

This guide provides detailed architecture context, concrete file-by-file implementation instructions, pseudocode, API contracts, test plans, and runbooks for an intern to execute.

## Prompt, Scope, and Success Criteria

### User objective (interpreted)

Create a ticketed, evidence-heavy implementation plan for integrating `openai-app-server` as a first-class app module in the wesen-os ecosystem, with deep onboarding-quality explanation and concrete execution details.

### In scope

- Architecture mapping across `openai-app-server`, `go-go-os-backend`, `go-go-os-frontend`, `go-go-app-inventory`, and `wesen-os`.
- Integration playbooks and precedent patterns.
- Detailed target design with API and event contracts.
- Step-by-step implementation plan with file references.
- Validation strategy and operational runbooks.

### Out of scope

- Full implementation in this ticket (this ticket is research/design).
- Production rollout policy decisions (authn/authz, multi-tenant controls) beyond design recommendations.

### Definition of done for APP-01 implementation (future code ticket)

- Backend module `openai` appears in `GET /api/os/apps` with health and reflection/docs hints.
- Namespaced routes function at `/api/apps/openai/chat`, `/api/apps/openai/ws`, `/api/apps/openai/api/timeline`.
- Chat window works with `basePrefix=/api/apps/openai` and receives streamed SEM events over WebSocket.
- Event Viewer and Timeline Debug windows show openai conversation events/entities.
- Legacy aliases (`/chat`, `/ws`, `/api/timeline`) remain not mounted (404) at root.
- Integration tests pass in `wesen-os` for manifest, reflection, docs, chat/ws/timeline behavior.

## System Orientation (For New Interns)

### Multi-repo structure and responsibilities

- `go-go-os-backend`
- Contains backend host contracts: app module interface, registry, lifecycle, namespaced routing, manifest/reflection endpoint contracts.

- `wesen-os` (Go composition root)
- Builds concrete module list, starts lifecycle, mounts namespaced routes, serves docs/help/catalog endpoints, hosts embedded launcher SPA.

- `go-go-os-frontend`
- Shared frontend launcher contracts and runtime pieces (`desktop-os`, `chat-runtime`, `hypercard-runtime`).

- `go-go-app-inventory`
- Best current exemplar for full backend + frontend integration with chat/ws/timeline and debug windows.

- `openai-app-server`
- Current target app repository; currently CLI/codexrpc + JS harness runtime, not yet an HTTP backend module for wesen-os.

### Why namespaced app design matters

The platform intentionally enforces `/api/apps/<app-id>/...` routing. This prevents app route collisions and keeps frontend API resolution deterministic.

Evidence:

- App ID validation and namespaced prefix generation: `go-go-os-backend/pkg/backendhost/routes.go:10`, `routes.go:18`, `routes.go:29`, `routes.go:37`.
- Forbidden legacy aliases: `routes.go:12` and guard logic `routes.go:58`.
- Launcher also hard-registers root-level legacy aliases as 404: `wesen-os/cmd/wesen-os-launcher/main.go:471-484`.
- Integration test confirms these legacy routes are not mounted: `wesen-os/cmd/wesen-os-launcher/main_integration_test.go:963-977`.

### End-to-end runtime topology

```text
[Desktop user]
   |
   | opens app icon / sends chat prompt
   v
[wesen-os frontend shell]
   - LaunchableAppModule registry
   - ChatConversationWindow
   - conversationManager + WsManager
   |
   | HTTP POST {prompt, conv_id} to /api/apps/<id>/chat
   | WS connect to /api/apps/<id>/ws?conv_id=...
   v
[wesen-os backend composition]
   - ModuleRegistry + LifecycleManager
   - MountNamespacedRoutes(/api/apps/<id>)
   - /api/os/apps manifest + reflection/docs hints
   |
   v
[app backend module]
   - chat/ws/timeline routes
   - timeline snapshot endpoint
   - SEM event stream
```

## Current Backend Composition Contract (Observed)

### App backend interface and optional capabilities

- `AppBackendModule` interface: `go-go-os-backend/pkg/backendhost/module.go:20-27`.
- Optional reflection interface: `module.go:31-33`.
- Optional docs interface: `module.go:37-39`.
- Reflection doc schema: `module.go:41-82`.

### Registry invariants

- Module registry validates app IDs and duplicate IDs at startup: `go-go-os-backend/pkg/backendhost/registry.go:24-31`.
- Duplicate app IDs fail fast before server startup: `registry.go:29-31`.

### Lifecycle invariants

- Ordered startup: `Init` then `Start` for each module: `go-go-os-backend/pkg/backendhost/lifecycle.go:36-47`.
- Required module health checks run after startup: `lifecycle.go:50-60`.
- On startup failure, stop rollback is triggered: `lifecycle.go:39-46`, `lifecycle.go:58-59`.
- Stop runs in reverse order: `lifecycle.go:71-77`.

### Routing invariants

- App ID regex: `routes.go:10`.
- Namespaced prefix builder `/api/apps/<id>`: `routes.go:29-35`.
- Mounted using child mux + strip-prefix: `routes.go:49-55`.
- Forbidden legacy aliases include `/chat`, `/ws`, `/api/timeline`: `routes.go:12-16`.

### Discovery endpoints

- `GET /api/os/apps` manifest built from registry and health checks: `manifest_endpoint.go:43-85`.
- Reflection hint and URL wiring: `manifest_endpoint.go:61-66`.
- Docs hint and URL wiring: `manifest_endpoint.go:68-75`.
- Reflection endpoint parser and route: `manifest_endpoint.go:88-123` and parser `126-141`.

### Contract tests as executable specification

- Duplicate app ID rejection: `go-go-os-backend/pkg/backendhost/backendhost_test.go:101-108`.
- Namespaced mounting behavior: `backendhost_test.go:110-125`.
- Required health startup failure: `backendhost_test.go:160-170`.
- Manifest includes reflection/docs hints: `backendhost_test.go:190-237`.
- Reflection route behavior: `backendhost_test.go:239-295`.

## Current Frontend Launcher + Chat Runtime Contract (Observed)

### Launcher app module contract

- `LaunchableAppModule` with required `manifest`, `buildLaunchWindow`, `renderWindow`, optional contributions/state: `go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts:22-29`.

### Host context APIs

- Frontend modules resolve backend URLs through host context:
- `resolveApiBase(appId)` and `resolveWsBase(appId)`: `launcherHostContext.ts:3-10`.
- wesen-os concrete host bindings:
- `/api/apps/${appId}` and `/api/apps/${appId}/ws`: `wesen-os/apps/os-launcher/src/App.tsx:33-35`.

### Registry/store guarantees

- Registry ordering and uniqueness: `createAppRegistry.ts:22-35`.
- Reducer key collision checks and reserved engine keys: `createLauncherStore.ts:6-12`, `14-35`, `42-69`.

### Contribution and window rendering pipeline

- Contributions built per module and launch commands auto-generated: `buildLauncherContributions.ts:44-67`.
- App key parsing/render dispatch: `renderAppWindow.ts:14-43`, `appKey.ts:18-34`.

### Chat runtime wiring used by app windows

- `ChatConversationWindow` takes `convId` and `basePrefix`: `chat-runtime/.../ChatConversationWindow.tsx:47-50`, `85-100`.
- `useConversation` connects through `conversationManager` with `basePrefix`: `useConversation.ts:72`, `120-129`, `161-164`.
- HTTP prompt submit route `${basePrefix}/chat`: `runtime/http.ts:59-71`.
- Snapshot hydration route `${basePrefix}/api/timeline`: `runtime/http.ts:89-103`.
- WebSocket URL `${basePrefix}/ws?conv_id=...`: `wsManager.ts:71-93`.
- Snapshot merge before replay: `wsManager.ts:99-108`.
- Buffered frame handling while hydrating: `wsManager.ts:274-281`.
- Default SEM handler for `timeline.upsert`: `semRegistry.ts:315-330`.
- Timeline state merge/upsert semantics: `timelineSlice.ts:77-123`, `181-185`, `271-279`.

### Debug event/timeline tooling

- Conversation event bus records envelopes for Event Viewer: `chat-runtime/.../eventBus.ts:63-95`.
- Inventory app opens `EventViewerWindow` and `TimelineDebugWindow` for conversation: `go-go-app-inventory/.../renderInventoryApp.tsx:139-158`, `926-933`, `1017-1023`.

## Inventory Integration Pattern (Best Existing Exemplar)

### Backend pattern

- Inventory backend module adapter in app repo implements full backendhost contract:
- `go-go-app-inventory/pkg/backendmodule/module.go:39-41` (compile-time interface assertions).
- Delegates to component, mounts docs routes: `module.go:74-82`.
- Reflection implementation with concrete chat/ws/timeline/profile/confirm/docs APIs:
- `reflection.go:10-12`, `14-102`.
- Core backend component mounts local app routes without namespace prefix:
- `/chat`, `/ws`, `/api/timeline`, profile API, confirm, UI: `backendcomponent/component.go:137-153`.

### Frontend pattern

- Inventory launcher module resolves API base from host context and renders module-specific windows:
- `go-go-app-inventory/apps/inventory/src/launcher/module.tsx:31-61`.
- Chat runtime module registration + ensure defaults:
- `renderInventoryApp.tsx:76-80`.
- Chat assistant window passes `basePrefix={apiBasePrefix}` to `ChatConversationWindow`:
- `renderInventoryApp.tsx:948-955`.
- Event/timeline debug windows are first-class window types:
- `renderInventoryApp.tsx:139-158`, `1017-1023`.

This is the exact integration behavior APP-01 should emulate first, then evolve.

## wesen-os Composition Layer (Where New App Gets Wired)

### Backend registration flow

- Module list assembly in launcher command: `wesen-os/cmd/wesen-os-launcher/main.go:281-312`.
- Registry/lifecycle startup: `main.go:314-327`.
- Manifest + docs/help endpoint registration: `main.go:329-333`.
- Namespaced route mounting loop: `main.go:334-339`.
- Legacy aliases return 404: `main.go:340`, `471-484`.

### Docs/search endpoint behavior

- `/api/os/help` endpoints: `wesen-os/cmd/wesen-os-launcher/docs_endpoint.go:97-141`.
- `/api/os/docs` aggregation/facets/filtering: `docs_endpoint.go:143-208`, `225-264`.
- Root-prefix behavior tested: `docs_endpoint_test.go:28-75`.

### Integration tests to replicate for openai app

- Integration path constants for namespaced inventory routes: `main_integration_test.go:83-103`.
- Module registry + mount loop in test harness mirrors production: `main_integration_test.go:330-361`.
- Chat/ws/timeline path tests and manifest/reflection/docs assertions:
- `main_integration_test.go:366-407`, `485-539`, `541-620`, `676-802`.
- Legacy routes not mounted test: `main_integration_test.go:963-977`.

## openai-app-server Current State (Gap Analysis)

### What exists

- CLI command tree has `harness` and `thread` groups:
- `openai-app-server/cmd/openai-app-server/root.go:28-35`, `93-98`.
- Harness run command executes JS scripts over codexrpc client:
- `harness_run_command.go:169-293`.
- Codexrpc client includes handshake guardrails (`initialize` then `initialized`) and message routing:
- `pkg/codexrpc/client.go:96-104`, `106-176`, `335-354`.
- Thread methods are implemented client-side (`thread/list`, `thread/read`):
- `pkg/codexrpc/threads.go:40-89`.
- JS runtime and codex module expose `session.request/notify/respond`, thread helpers, approvals, waiters:
- `pkg/js/runtime.go:15-55`, `86-129`, `165-220`.
- `pkg/js/module_codex.go:17-70`, `88-126`.
- Local projector/state-replay can apply event stream snapshots:
- `pkg/state/projector.go:13-38`, with per-event handlers `40-139`.

### Critical gaps for APP-01

#### Gap A: advertised websocket transport is not implemented

- Command flags advertise `stdio|websocket`:
- `harness_run_command.go:149`, `thread_list_command.go:66`, `thread_read_command.go:67`.
- Constructors hard-reject non-stdio transport:
- `harness_run_command.go:106-108`, `thread_list_command.go:34-36`, `thread_read_command.go:35-37`.
- `codexrpc` transport package only has `transport_stdio.go` and test memory transport `memory_transport.go`.
- No websocket transport implementation exists in `pkg/codexrpc`.

Implication:

- You cannot directly plug chat-runtime browser websocket flow into openai-app-server today.
- APP-01 must add a server-side websocket endpoint independent of codexrpc transport, or add codexrpc websocket transport + server route pair.

#### Gap B: no backendhost module adapter in openai-app-server

There is no `pkg/backendmodule` implementing `AppBackendModule` in `openai-app-server`. Therefore it cannot be mounted by wesen-os like inventory/gepa/sqlite.

#### Gap C: no `/chat`, `/ws`, `/api/timeline` HTTP surface in openai-app-server

chat-runtime expects these endpoints under `basePrefix`:

- POST `${basePrefix}/chat`
- GET/WS `${basePrefix}/ws?conv_id=...`
- GET `${basePrefix}/api/timeline?conv_id=...`

These do not exist in openai-app-server today.

#### Gap D: no SEM timeline mapping bridge from codexrpc notifications

The frontend semantics and debug tooling assume SEM envelopes and timeline entity updates (`timeline.upsert`, llm events, etc). openai-app-server currently has a projector for local replay, but not a streaming SEM bridge for launcher frontend.

#### Gap E: repository docs are placeholder

`openai-app-server/README.md` is still template art (`README.md:1-58`), so onboarding/documentation parity is missing.

## Playbook Synthesis Across Existing Docs

Key playbooks and what they contribute:

- `wesen-os/docs/startup-playbook.md`
- Development environment and startup sequencing, including frontend alias dependency and embed bootstrap requirements (`startup-playbook.md:30-37`, `58-68`, `95-103`).

- `wesen-os/pkg/doc/topics/02-backend-developer-guide.md`
- Contract-level backend module authoring model: `AppBackendModule`, namespaced routes, reflection/docs patterns, composition wiring, and test patterns.

- `wesen-os/pkg/doc/topics/03-frontend-developer-guide.md`
- Launcher module contract, `resolveApiBase/resolveWsBase` usage, store/reducer expectations, and module registration pitfalls.

- `wesen-os/pkg/doc/tutorials/01-building-a-full-app.md`
- End-to-end phase model (backend, frontend, registration, optional runtime cards, packaging, tests).

- Prior ticket docs as implementation examples:
- OS-01 comprehensive app guide (`wesen-os/ttmp/2026/03/01/OS-01.../design-doc/...`).
- GEPA-11 wiring guide for launcher registration patterns (`go-go-os-frontend/ttmp/.../GEPA-11.../design/02-wiring-guide...`).
- INV-01 inventory backend reflection parity runbook (`go-go-app-inventory/ttmp/03/01/INV-01.../reference/01-implementation-guide...`).
- OS-03 sqlite runbook with concrete `curl` composition checks (`wesen-os/ttmp/2026/03/01/OS-03.../reference/02-developer-runbook.md:97-118`).

## Target Architecture for APP-01

### Design goals

- Reuse existing chat-runtime and debug windows with minimum custom frontend code.
- Conform fully to backendhost module contracts and namespaced routing.
- Keep openai-specific complexity behind one backend module adapter.
- Make integration discoverable via manifest/reflection/docs endpoints.
- Preserve root-level legacy alias behavior (404 at root).

### Proposed app identity

- App ID: `openai`
- Backend namespace: `/api/apps/openai/...`
- Frontend manifest id: `openai`
- App key pattern: `openai:<instanceId>`

### Proposed backend module package layout (openai-app-server repo)

- `openai-app-server/pkg/backendmodule/module.go`
- `openai-app-server/pkg/backendmodule/reflection.go`
- `openai-app-server/pkg/backendmodule/docs_store.go`
- `openai-app-server/pkg/backendmodule/docs/*.md`
- `openai-app-server/pkg/backendmodule/chat_http.go`
- `openai-app-server/pkg/backendmodule/ws.go`
- `openai-app-server/pkg/backendmodule/timeline_store.go`
- `openai-app-server/pkg/backendmodule/sem_mapper.go`
- `openai-app-server/pkg/backendmodule/module_test.go`

### Proposed frontend module package layout (new repo or wesen-os app package)

Option 1 (faster): add in `wesen-os/apps` with local module until stabilized.

Option 2 (preferred long-term): create `go-go-app-openai` repo with:

- `apps/openai/src/launcher/module.tsx`
- `apps/openai/src/launcher/renderOpenaiApp.tsx`
- `apps/openai/src/reducers.ts` (only if needed)

### Proposed endpoints (inventory-compatible first)

Under mounted prefix `/api/apps/openai`:

- `POST /chat`
- Accepts `{ prompt, conv_id, profile?, registry? }`
- Initiates execution against openai-app-server runtime/codexrpc bridge.

- `GET /ws?conv_id=...`
- Streams SEM envelopes compatible with existing `WsManager` + `semRegistry`.

- `GET /api/timeline?conv_id=...`
- Returns snapshot for hydration; shape compatible with chat-runtime snapshot parser.

- `GET /health`
- Lightweight health/readiness report.

- `GET /docs` and `GET /docs/{slug}`
- Through `docmw.MountRoutes` as documentable module.

- Reflection endpoint auto-wired via `RegisterAppsManifestEndpoint` at `/api/os/apps/openai/reflection`.

### Proposed event semantics

At minimum support these event types to match current frontend:

- `timeline.upsert` (critical for entity stream)
- `llm.start`, `llm.delta`, `llm.final`, `llm.done` (token/stream UX)
- `tool.start`, `tool.result`, `tool.done`, `tool.delta` (tool traces)
- `ws.hello` / `ws.pong` control events (optional parity with inventory tests)

## API and Data Contract Sketches

### Chat request/response

```json
POST /api/apps/openai/chat
{
  "prompt": "Summarize this repo",
  "conv_id": "conv-123",
  "profile": "default",
  "registry": "default"
}

200 OK
{
  "status": "started",
  "conv_id": "conv-123",
  "session_id": "sess-abc"
}
```

### Timeline snapshot response

The frontend fetcher expects JSON; `WsManager` applies snapshot entities through timeline mapper.

```json
GET /api/apps/openai/api/timeline?conv_id=conv-123
{
  "convId": "conv-123",
  "version": 42,
  "entities": [
    {
      "id": "msg-1",
      "kind": "message",
      "createdAt": 1740952000000,
      "version": 42,
      "props": {
        "role": "assistant",
        "content": "Hello",
        "streaming": false
      }
    }
  ]
}
```

### WebSocket SEM frame

```json
{
  "sem": true,
  "event": {
    "type": "timeline.upsert",
    "id": "evt-22",
    "seq": 22,
    "data": {
      "version": 42,
      "entity": {
        "id": "msg-1",
        "kind": "message",
        "createdAt": "1740952000000",
        "props": { "role": "assistant", "content": "Hello", "streaming": false }
      }
    }
  }
}
```

## Mapping codexrpc/openai events to SEM/timeline

### Suggested mapping table

| openai/codexrpc signal | SEM event | timeline entity kind | notes |
|---|---|---|---|
| turn start | `llm.start` + `timeline.upsert` | `message` (assistant, streaming=true) | create/mark in-progress message |
| token delta | `llm.delta` + `timeline.upsert` | `message` | append content |
| turn complete | `llm.final`/`llm.done` + `timeline.upsert` | `message` (streaming=false) | finalize content + metadata |
| tool invocation begin | `tool.start` + `timeline.upsert` | `tool_call` | include tool name/input |
| tool invocation result | `tool.result` + `timeline.upsert` | `tool_result` | include output summary |
| error | `ws.error` + `timeline.upsert` | `error` | show recoverable vs fatal |

### Pseudocode: bridge pipeline

```go
// chat handler
func (m *Module) handleChat(w http.ResponseWriter, r *http.Request) {
  req := decodeChatReq(r)
  conv := m.sessions.GetOrCreate(req.ConvID)

  go func() {
    m.events.Emit(conv.ID, semHello(conv.ID))
    stream, err := m.runner.StartTurn(conv, req)
    if err != nil {
      m.events.Emit(conv.ID, semError(err))
      return
    }

    for evt := range stream {
      semEvents := m.mapper.ToSem(evt, conv.ID)
      for _, se := range semEvents {
        m.timeline.Apply(conv.ID, se)
        m.events.Emit(conv.ID, se)
      }
    }
  }()

  writeJSON(w, startedResp(req.ConvID, conv.SessionID))
}
```

```go
// websocket handler
func (m *Module) handleWS(w http.ResponseWriter, r *http.Request) {
  convID := r.URL.Query().Get("conv_id")
  if convID == "" { http.Error(w, "conv_id required", 400); return }

  conn := upgrade(w, r)
  defer conn.Close()

  sub := m.events.Subscribe(convID)
  defer sub.Close()

  // optional hello frame
  _ = conn.WriteJSON(wsHello(convID))

  for {
    select {
    case evt := <-sub.C:
      if err := conn.WriteJSON(evt); err != nil { return }
    case <-r.Context().Done():
      return
    }
  }
}
```

```go
// timeline endpoint
func (m *Module) handleTimeline(w http.ResponseWriter, r *http.Request) {
  convID := r.URL.Query().Get("conv_id")
  if convID == "" { http.Error(w, "conv_id required", 400); return }
  snap := m.timeline.Snapshot(convID)
  writeJSON(w, snap)
}
```

## Detailed Implementation Plan (Phased)

### Phase 0: repository preparation and module scaffolding

1. Add backendhost/doc dependencies to `openai-app-server/go.mod`.
2. Create `pkg/backendmodule` with compile-time interface assertions:
- `var _ backendhost.AppBackendModule = (*Module)(nil)`.
- `var _ backendhost.ReflectiveAppBackendModule = (*Module)(nil)`.
- `var _ backendhost.DocumentableAppBackendModule = (*Module)(nil)`.
3. Add minimal docs pages and doc store loader for docs hint parity.

### Phase 1: backend routes with compatibility surface

1. Implement `MountRoutes` for child mux paths `/chat`, `/ws`, `/api/timeline`, `/health`.
2. Keep paths unprefixed (backendhost applies namespace).
3. Return `started` response on chat POST for parity with chat-runtime expectations.
4. Implement connection-scoped websocket stream per conversation.

### Phase 2: codexrpc execution integration

1. Add service that can run openai-app-server conversation logic for one prompt.
2. Decide transport mode for backend module:
- initial: stdio subprocess via `codexrpc.NewStdioTransport` (`transport_stdio.go:25-51`)
- future: direct in-process integration or websocket transport.
3. Normalize runtime events to internal event model.

### Phase 3: SEM/timeline mapper + hydration snapshot

1. Implement mapper from internal events/codex notifications to SEM envelopes.
2. Implement timeline state store keyed by `conv_id` with monotonic sequence/version.
3. Expose snapshot endpoint shape compatible with frontend hydration.
4. Add unit tests for event mapping determinism and version ordering.

### Phase 4: reflection/docs parity

1. Implement `Reflection(ctx)` listing APIs/capabilities/docs links.
2. Include docs links to `/api/apps/openai/docs/...`.
3. Validate `GET /api/os/apps` includes `reflection.available=true` and docs hints.

### Phase 5: wesen-os backend composition wiring

1. Import openai backend module in `wesen-os/cmd/wesen-os-launcher/main.go`.
2. Append module to `modules` slice before registry creation.
3. Add flags/config for openai module runtime settings (timeouts/model/command path).
4. Update integration tests mirroring inventory assertions for openai app id.

### Phase 6: frontend launcher module wiring

1. Implement `openaiLauncherModule` (pattern from inventory module).
2. Use `ctx.resolveApiBase('openai')` fallback for `apiBasePrefix`.
3. Render windows:
- chat assistant window using `ChatConversationWindow basePrefix={apiBasePrefix}`.
- event viewer window using `EventViewerWindow conversationId={convId}`.
- timeline debug window using `TimelineDebugWindow conversationId={convId}`.
4. Add module into `wesen-os/apps/os-launcher/src/app/modules.tsx`.
5. If app has shared reducers, add to `store.ts`; if not, keep self-contained.

### Phase 7: Vite/workspace integration

1. Add Vite aliases for new frontend package source in `wesen-os/apps/os-launcher/vite.config.ts`.
2. Existing `/api` proxy with `ws: true` should already cover namespaced routes (`vite.config.ts:65-71`).
3. Validate frontend dev startup with backend running and alias resolution installed in sibling repos.

### Phase 8: integration tests and smoke runbooks

1. Backendhost unit tests in openai module repo:
- manifest validity, namespaced mount behavior, health/lifecycle.
2. wesen-os integration tests:
- `/api/os/apps` includes openai with reflection/docs hints.
- `/api/os/apps/openai/reflection` returns non-empty `apis`.
- `/api/apps/openai/chat` returns started.
- `/api/apps/openai/ws` emits hello + sem frames.
- `/api/apps/openai/api/timeline` returns snapshot.
- legacy root aliases remain 404.
3. Frontend smoke:
- icon launches openai folder/chat window.
- send prompt works; timeline fills; event viewer receives events.

## File-by-File Checklist (Implementation Workbook)

### openai-app-server (new/updated)

- `pkg/backendmodule/module.go`
- module struct, manifest/lifecycle/mount/docs exposure.

- `pkg/backendmodule/reflection.go`
- reflection document for app catalog/discovery.

- `pkg/backendmodule/docs_store.go`
- embed and parse docs for docs routes.

- `pkg/backendmodule/docs/*.md`
- overview + api-reference + troubleshooting pages.

- `pkg/backendmodule/chat_http.go`
- POST chat endpoint.

- `pkg/backendmodule/ws.go`
- websocket stream endpoint.

- `pkg/backendmodule/timeline_store.go`
- snapshot entity storage + versioning.

- `pkg/backendmodule/sem_mapper.go`
- codex/internal event -> sem envelope conversion.

- `pkg/backendmodule/module_test.go`
- manifest/reflection/docs + route/lifecycle tests.

### wesen-os (updated)

- `cmd/wesen-os-launcher/main.go`
- add openai module construction + module list inclusion + flags.

- `cmd/wesen-os-launcher/main_integration_test.go`
- add openai route/manifest/reflection/docs assertions.

- optionally docs topics if new app should be documented in built-in launcher help.

### frontend module repo (new or existing)

- `apps/openai/src/launcher/module.tsx`
- `apps/openai/src/launcher/renderOpenaiApp.tsx`
- optional `apps/openai/src/reducers.ts`

### wesen-os frontend composition

- `apps/os-launcher/src/app/modules.tsx` add module import/registration.
- `apps/os-launcher/src/app/store.ts` add reducers only if needed.
- `apps/os-launcher/vite.config.ts` add aliases for frontend package path.

## Testing and Validation Strategy

### Unit tests (backend module package)

- App ID validity (`backendhost.ValidateAppID`).
- Reflection document non-empty and routes namespaced.
- Docs store loads and exposes doc count.
- Chat endpoint request validation (`conv_id`, prompt).
- Timeline version monotonicity and merge behavior.
- WS subscription lifecycle and cleanup.

### Integration tests (wesen-os)

Model after existing tests in `main_integration_test.go`.

Required test cases:

1. `GET /api/os/apps` includes `openai` with `healthy=true` under valid startup.
2. `openai` has reflection URL `/api/os/apps/openai/reflection`.
3. `openai` docs URL `/api/apps/openai/docs` exists when docs store present.
4. POST `/api/apps/openai/chat` returns `status=started` and echo `conv_id`.
5. WS `/api/apps/openai/ws?conv_id=...` delivers at least one SEM/event frame.
6. GET `/api/apps/openai/api/timeline?conv_id=...` returns snapshot JSON.
7. Root `/chat`, `/ws`, `/api/timeline` remain 404.

### Manual smoke runbook

```bash
# backend catalog
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | select(.app_id=="openai")'

# reflection
curl -sS http://127.0.0.1:8091/api/os/apps/openai/reflection | jq .

# docs
curl -sS http://127.0.0.1:8091/api/apps/openai/docs | jq .

# start chat
curl -sS -X POST http://127.0.0.1:8091/api/apps/openai/chat \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello","conv_id":"conv-openai-1"}' | jq .

# snapshot
curl -sS "http://127.0.0.1:8091/api/apps/openai/api/timeline?conv_id=conv-openai-1" | jq .
```

## Risks, Tradeoffs, and Mitigations

### Risk 1: transport mismatch complexity

- Cause: openai-app-server currently client/stdio oriented.
- Impact: bridging to browser websocket requires new server event layer.
- Mitigation: keep internal runtime bridge abstracted and expose inventory-compatible HTTP/WS surface first.

### Risk 2: event schema drift vs chat-runtime expectations

- Cause: custom SEM mapping may diverge from existing `semRegistry` assumptions.
- Impact: timeline/event viewers fail silently or partially.
- Mitigation: reuse existing event type conventions (`timeline.upsert`, llm/tool families), add contract tests with real frontend parser fixtures.

### Risk 3: conversation lifecycle leaks

- Cause: long-lived ws/session structures without eviction.
- Impact: memory growth over time.
- Mitigation: session ref counting + idle eviction parity with existing chat server patterns.

### Risk 4: premature frontend customization

- Cause: building custom UI before backend contract stability.
- Impact: rework.
- Mitigation: start with inventory-style generic chat/debug windows; defer custom UI.

### Risk 5: path-prefix/root deployment issues

- Cause: hardcoded URLs in frontend/backend.
- Impact: breakage under non-root `--root` deployments.
- Mitigation: always use `resolveApiBase/resolveWsBase` and backend namespaced mount without hardcoded prefix.

## Open Questions (Needs Product/Tech Lead Decisions)

1. Should openai app use app ID `openai`, `openai-server`, or `codex`? (must be consistent across backend/frontend manifests).
2. Should codexrpc run via subprocess stdio in production path, or should a dedicated in-process runner/server be built immediately?
3. Which conversation persistence model is required: in-memory only, sqlite timeline snapshots, or full durable thread history?
4. Which profile model should be supported at v1: reuse existing profile API pattern or start fixed single-profile?
5. Is approval workflow (`approvals.*`) required in v1 UI, or can it be hidden behind default policy?

## Experiments Executed In This Ticket

Two reproducible scripts were added under this ticket and executed:

- `scripts/run_openai_app_server_gap_scan.sh`
- `scripts/run_wesen_os_integration_playbook_scan.sh`

Output logs:

- `scripts/output/openai-app-server-gap-scan-20260302-165652.log`
- `scripts/output/wesen-os-playbook-scan-20260302-165652.log`

Key outcomes:

- Verified stdio-only enforcement despite websocket flag text.
- Verified codexrpc and command package tests currently pass (`go test ./pkg/codexrpc ./cmd/openai-app-server`).
- Collected large anchor set for integration contracts and playbook files.

## Suggested First Implementation Slice (Low-Risk Vertical Slice)

1. Implement openai backend module with stub chat/ws/timeline and reflection/docs.
2. Mount in wesen-os and confirm manifest/reflection/docs appear.
3. Add frontend openai launcher module that only opens one chat window.
4. Wire ws timeline stream with a tiny synthetic event source to validate UI plumbing.
5. Replace synthetic event source with real codexrpc-backed stream.

This sequence minimizes unknowns by validating composition and UI contract before full runtime complexity.

## References

### Core backendhost and composition files

- `go-go-os-backend/pkg/backendhost/module.go:20-39`
- `go-go-os-backend/pkg/backendhost/registry.go:24-35`
- `go-go-os-backend/pkg/backendhost/lifecycle.go:23-64`
- `go-go-os-backend/pkg/backendhost/routes.go:10-16`
- `go-go-os-backend/pkg/backendhost/routes.go:37-55`
- `go-go-os-backend/pkg/backendhost/manifest_endpoint.go:43-85`
- `wesen-os/cmd/wesen-os-launcher/main.go:314-341`
- `wesen-os/cmd/wesen-os-launcher/main.go:471-484`
- `wesen-os/cmd/wesen-os-launcher/docs_endpoint.go:143-208`

### Inventory exemplar files

- `go-go-app-inventory/pkg/backendmodule/module.go:39-82`
- `go-go-app-inventory/pkg/backendmodule/reflection.go:14-102`
- `go-go-app-inventory/pkg/backendcomponent/component.go:112-153`
- `go-go-app-inventory/apps/inventory/src/launcher/module.tsx:31-61`
- `go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx:76-80`
- `go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx:948-955`
- `go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx:1017-1023`

### Frontend launcher/chat runtime files

- `go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts:22-29`
- `go-go-os-frontend/packages/desktop-os/src/contracts/launcherHostContext.ts:3-10`
- `wesen-os/apps/os-launcher/src/App.tsx:33-35`
- `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts:59-103`
- `go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts:71-97`
- `go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts:132-312`
- `go-go-os-frontend/packages/chat-runtime/src/chat/sem/semRegistry.ts:315-330`
- `go-go-os-frontend/packages/chat-runtime/src/chat/state/timelineSlice.ts:181-185`
- `go-go-os-frontend/packages/chat-runtime/src/chat/state/timelineSlice.ts:271-279`

### openai-app-server current-state files

- `openai-app-server/cmd/openai-app-server/root.go:28-35`
- `openai-app-server/cmd/openai-app-server/harness_run_command.go:106-108`
- `openai-app-server/cmd/openai-app-server/harness_run_command.go:149`
- `openai-app-server/cmd/openai-app-server/thread_list_command.go:34-36`
- `openai-app-server/cmd/openai-app-server/thread_list_command.go:66`
- `openai-app-server/cmd/openai-app-server/thread_read_command.go:35-37`
- `openai-app-server/pkg/codexrpc/client.go:96-104`
- `openai-app-server/pkg/codexrpc/transport_stdio.go:25-51`
- `openai-app-server/pkg/codexrpc/memory_transport.go:9-21`
- `openai-app-server/pkg/js/module_codex.go:17-70`
- `openai-app-server/pkg/state/projector.go:13-38`
- `openai-app-server/README.md:1-58`

### Playbooks and guide docs

- `wesen-os/docs/startup-playbook.md:30-37`
- `wesen-os/docs/startup-playbook.md:58-68`
- `wesen-os/pkg/doc/topics/02-backend-developer-guide.md`
- `wesen-os/pkg/doc/topics/03-frontend-developer-guide.md`
- `wesen-os/pkg/doc/tutorials/01-building-a-full-app.md`
- `wesen-os/ttmp/2026/03/01/OS-01-BUILDING-AN-APP--building-a-new-app-in-go-go-os-from-bottom-up/design-doc/01-comprehensive-guide-building-a-new-app-in-go-go-os.md`
- `go-go-os-frontend/ttmp/2026/02/27/GEPA-11-APPS-BROWSER-UI-WIDGET--apps-browser-ui-widget-for-mounted-app-module-inspection/design/02-wiring-guide-apps-browser-into-wesen-os.md`
- `go-go-app-inventory/ttmp/03/01/INV-01--simplify-inventory-backend-module-integration-and-add-reflection-parity/reference/01-implementation-guide-inventory-backend-module-reflection-parity.md`
- `wesen-os/ttmp/2026/03/01/OS-03-SQLITE-QUERY-APP--sqlite-query-app-with-backend-gui-components-and-hypercard-query-integration/reference/02-developer-runbook.md:97-118`

## Detailed API Reference (Proposed v1)

This section is intentionally explicit so a new engineer can implement handlers and tests without guessing.

### `POST /api/apps/openai/chat`

#### Request JSON

- `prompt` (string, required)
- `conv_id` (string, required)
- `profile` (string, optional)
- `registry` (string, optional)
- `metadata` (object, optional; ignored fields tolerated)

#### Response JSON (200)

- `status` (string, value `started`)
- `conv_id` (string)
- `session_id` (string)
- `queued_at` (unix ms, optional)

#### Validation errors

- Missing `prompt` or `conv_id`: `400` with JSON error body.
- Oversized payload: `413`.
- Invalid profile/registry combination: `422`.

#### Idempotency notes

- Repeated requests for the same `conv_id` should continue the conversation session unless an explicit `new_session=true` option is introduced later.
- Handler should be tolerant of duplicate browser retries.

### `GET /api/apps/openai/ws?conv_id=<id>[&profile=&registry=]`

#### Behavior

- Upgrades HTTP to websocket.
- Requires `conv_id` query parameter.
- Subscribes connection to one conversation event stream.
- Sends immediate hello frame (optional but recommended for parity with existing tests).

#### Expected frame classes

- control frames: `ws.hello`, `ws.pong`
- sem frames: envelopes containing `sem=true` and typed events

#### Error behavior

- Missing `conv_id`: `400` before upgrade.
- Upgrade failure: standard HTTP error from upgrader.
- Conversation not found: either create lazy conversation state or return `404`; choose one behavior and document in reflection/docs.

### `GET /api/apps/openai/api/timeline?conv_id=<id>`

#### Behavior

- Returns latest conversation snapshot for hydration and recovery.
- No websocket required for this endpoint.
- Expected to be safe to call repeatedly.

#### Response JSON

- `convId` (string)
- `version` (number)
- `entities` (array)

Each entity:

- `id` (string)
- `kind` (string)
- `createdAt` (number)
- `updatedAt` (number, optional)
- `version` (number, optional)
- `props` (object)

#### Error behavior

- Missing `conv_id`: `400`.
- Unknown conversation: return empty snapshot (`200`) instead of `404` to simplify frontend.

### `GET /api/apps/openai/health`

#### Response JSON (200)

- `ok` (bool)
- `transport` (string; `stdio`, `inproc`, etc.)
- `active_conversations` (number)
- `uptime_seconds` (number)

#### Usage

- Used for operator diagnostics and optional startup health probes if app is required.

## Sequence Diagrams (Normal + Failure)

### Chat success path

```text
User            Frontend (chat-runtime)      openai backend module      runtime/codex bridge
 | send prompt          |                              |                          |
 |--------------------->| POST /chat                  |                          |
 |                      |----------------------------->| start turn               |
 |                      |                              |------------------------->|
 |                      | <--------------------------- | 200 started              |
 | <--------------------|                              |                          |
 |                      | WS connect /ws?conv_id      |                          |
 |                      |----------------------------->| subscribe                |
 |                      | <--------------------------- | ws.hello                 |
 |                      | <--------------------------- | sem llm.start            |
 |                      | <--------------------------- | sem timeline.upsert      |
 |                      | <--------------------------- | sem llm.delta            |
 |                      | <--------------------------- | sem timeline.upsert      |
 |                      | GET /api/timeline           |                          |
 |                      |----------------------------->| read snapshot            |
 |                      | <--------------------------- | snapshot JSON            |
```

### Chat failure path (runtime error mid-turn)

```text
Frontend                    openai backend module                 runtime bridge
   | POST /chat                       |                                 |
   |--------------------------------->| start turn                      |
   |<---------------------------------| 200 started                     |
   | WS /ws?conv_id                   |                                 |
   |--------------------------------->| subscribe                        |
   |<---------------------------------| sem llm.start                    |
   |                                  | bridge error                     |
   |                                  |<---------------------------------|
   |<---------------------------------| sem ws.error + timeline.upsert   |
   | update UI error state            |                                 |
```

### Browser reconnect path

```text
Frontend reconnects WS --> GET snapshot first --> replay buffered/new events --> consistent timeline
```

This reconnection behavior aligns with `WsManager` hydration/buffering semantics (`wsManager.ts:274-312`).

## Implementation Blueprint by File (Concrete Pseudocode)

### `pkg/backendmodule/module.go`

```go
type Module struct {
  service   *Service
  timeline  *TimelineStore
  bus       *ConversationBus
  docs      *docmw.DocStore
  docsErr   error
  startedAt time.Time
}

func NewModule(opts Options) *Module {
  docs, docsErr := loadDocStore()
  return &Module{service: NewService(opts), timeline: NewTimelineStore(), bus: NewConversationBus(), docs: docs, docsErr: docsErr}
}

func (m *Module) Manifest() backendhost.AppBackendManifest {
  return backendhost.AppBackendManifest{
    AppID: "openai",
    Name: "OpenAI App Server",
    Description: "Codex/OpenAI runtime chat backend",
    Required: false,
    Capabilities: []string{"chat", "ws", "timeline", "threads", "docs", "reflection"},
  }
}

func (m *Module) MountRoutes(mux *http.ServeMux) error {
  mux.HandleFunc("/chat", m.handleChat)
  mux.HandleFunc("/chat/", m.handleChat)
  mux.HandleFunc("/ws", m.handleWS)
  mux.HandleFunc("/api/timeline", m.handleTimeline)
  mux.HandleFunc("/api/timeline/", m.handleTimeline)
  mux.HandleFunc("/health", m.handleHealth)
  if m.docs != nil { return docmw.MountRoutes(mux, m.docs) }
  return nil
}
```

### `pkg/backendmodule/sem_mapper.go`

```go
func (m *SemMapper) ToSem(evt RuntimeEvent, convID string) []map[string]any {
  switch evt.Kind {
  case RuntimeEventTurnStart:
    return []map[string]any{SemLLMStart(evt), SemTimelineMessageStart(evt, convID)}
  case RuntimeEventTokenDelta:
    return []map[string]any{SemLLMDelta(evt), SemTimelineMessageDelta(evt, convID)}
  case RuntimeEventToolStart:
    return []map[string]any{SemToolStart(evt), SemTimelineToolCall(evt, convID)}
  case RuntimeEventToolResult:
    return []map[string]any{SemToolResult(evt), SemTimelineToolResult(evt, convID)}
  case RuntimeEventTurnDone:
    return []map[string]any{SemLLMFinal(evt), SemTimelineMessageDone(evt, convID)}
  case RuntimeEventError:
    return []map[string]any{SemWSError(evt), SemTimelineError(evt, convID)}
  default:
    return nil
  }
}
```

### `apps/openai/src/launcher/module.tsx`

```ts
export const openaiLauncherModule: LaunchableAppModule = {
  manifest: {
    id: 'openai',
    name: 'OpenAI',
    icon: '🧠',
    launch: { mode: 'window' },
    desktop: { order: 35 },
  },
  buildLaunchWindow: (_ctx, _reason) => buildOpenAIFolderWindowPayload(),
  createContributions: (ctx) => createOpenAIContributions(ctx),
  renderWindow: ({ instanceId, windowId, ctx }) => {
    const apiBasePrefix = ctx.resolveApiBase?.('openai') ?? '/api/apps/openai';
    return <OpenAILauncherWindow instanceId={instanceId} windowId={windowId} apiBasePrefix={apiBasePrefix} />;
  },
};
```

### `apps/openai/src/launcher/renderOpenaiApp.tsx`

```tsx
function OpenAIChatWindow({ convId, apiBasePrefix, windowId }: Props) {
  return (
    <ChatConversationWindow
      convId={convId}
      windowId={windowId}
      basePrefix={apiBasePrefix}
      title="OpenAI Chat"
    />
  );
}
```

## Integration Checklist (Intern-Friendly)

Use this as an execution sheet.

### Backend contract checklist

- [ ] `Manifest().AppID == "openai"` and passes `ValidateAppID`.
- [ ] Routes mounted without hardcoded `/api/apps/openai` prefix.
- [ ] `Reflection(ctx)` returns non-empty `APIs`.
- [ ] `DocStore()` non-nil and docs endpoints reachable.
- [ ] `Health(ctx)` fails meaningfully when dependencies are unavailable.

### wesen-os composition checklist

- [ ] openai module added before `NewModuleRegistry(...)` call.
- [ ] launcher startup succeeds with openai enabled.
- [ ] `/api/os/apps` shows openai + reflection/docs hints.
- [ ] root legacy aliases remain 404.

### Frontend checklist

- [ ] module import added in `modules.tsx`.
- [ ] Vite alias added and resolves in dev mode.
- [ ] chat window uses `basePrefix={resolveApiBase('openai')}`.
- [ ] Event Viewer and Timeline Debug open per conversation.

### End-to-end checklist

- [ ] prompt submission returns started.
- [ ] ws stream receives sem events.
- [ ] snapshot hydration loads timeline entities.
- [ ] reconnect behavior does not duplicate or reorder entities.

## Suggested Ticket Breakdown (Follow-on Work Items)

Break future implementation into focused execution tickets:

1. `APP-02` backend module scaffold + manifest/reflection/docs endpoints.
2. `APP-03` chat/ws/timeline HTTP surface with synthetic events.
3. `APP-04` codex/openai runtime bridge + event mapper.
4. `APP-05` frontend launcher module + chat/debug windows.
5. `APP-06` wesen-os integration tests + smoke scripts.
6. `APP-07` hardening: metrics, lifecycle cleanup, failure injection tests.

## Deep Onboarding Notes (What Interns Usually Miss)

### Pitfall: double-prefixed routes

Symptom:

- frontend calls `/api/apps/openai/chat` and gets 404.

Root cause:

- route registered as `/api/apps/openai/chat` inside `MountRoutes` (should be `/chat`).

Fix:

- only register sub-routes in child mux.

### Pitfall: app id mismatch

Symptom:

- window opens as unknown module or requests go to wrong path.

Root cause:

- backend `AppID` and frontend `manifest.id` differ (`openai` vs `openai-app`).

Fix:

- enforce one constant across backend/frontend packages.

### Pitfall: SEM payload shape mismatch

Symptom:

- websocket frames arrive but UI does not update timeline.

Root cause:

- frame not recognized as `{ sem: true, event: ... }` or missing required fields (`type`, `id`).

Fix:

- add serialization tests against `handleSem` expectations and timeline mapper.

### Pitfall: snapshot/event ordering race

Symptom:

- duplicated entities or old state overwriting new state after reconnect.

Root cause:

- snapshot applied after newer events without version checks.

Fix:

- versioned upsert semantics and deterministic merge strategy.

### Pitfall: missing ws proxy in dev

Symptom:

- chat submit works, stream never connects in Vite dev mode.

Root cause:

- proxy rule missing `ws: true`.

Current state:

- global `/api` proxy already has `ws: true` in `wesen-os/apps/os-launcher/vite.config.ts:65-71`.

## Validation Commands (Expanded)

### Local backend-only (openai-app-server)

```bash
cd openai-app-server
go test ./... -count=1
```

### Composition integration (wesen-os)

```bash
cd wesen-os
GOWORK=off go test ./cmd/wesen-os-launcher -count=1
```

### Frontend type checks and smoke

```bash
cd wesen-os
pnpm install
pnpm run dev -w apps/os-launcher
```

### Manual HTTP checks

```bash
curl -sS http://127.0.0.1:8091/api/os/apps | jq .
curl -sS http://127.0.0.1:8091/api/os/apps/openai/reflection | jq .
curl -sS http://127.0.0.1:8091/api/apps/openai/docs | jq .
```

### Manual websocket quick check

Use browser devtools or a ws client to verify hello + sem frames.

## Concluding Recommendation

Do not start by implementing a fully custom OpenAI UI. Start by implementing strict compatibility with the existing chat-runtime contract (`/chat`, `/ws`, `/api/timeline`) and inventory-style launcher wiring. This gives immediate platform leverage:

- existing chat experience,
- existing timeline/event debugging,
- existing registry/manifest/reflection/docs observability,
- existing integration test scaffolding.

After parity is proven, iterate on openai-specific capabilities (thread inspector windows, approval dashboards, richer codexrpc controls) as additive features.
