---
Title: 'Intern Guide: Chat With App Architecture, Design, and Implementation Plan'
Ticket: APP-03-CHAT-WITH-APP
Status: active
Topics:
    - chat
    - documentation
    - frontend
    - openai-app-server
    - wesen-os
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Best in-repo example of a launcher window wrapping ChatConversationWindow.
    - Path: ../../../../../../../go-go-app-inventory/pkg/pinoweb/request_resolver.go
      Note: Shows why request_overrides is not a clean generic docs-context transport.
    - Path: ../../../../../../../go-go-os-backend/pkg/backendhost/module.go
      Note: Documentable module contract and reflection/doc metadata shapes.
    - Path: ../../../../../../../go-go-os-backend/pkg/docmw/docmw.go
      Note: DocStore TOC/full-page behavior and /docs routes.
    - Path: ../../../../../../../go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx
      Note: App-icon context menu actions in the Applications folder.
    - Path: ../../../../../../../go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx
      Note: Reflection doc-link surface shown in the component browser.
    - Path: ../../../../../../../go-go-os-frontend/apps/apps-browser/src/components/GetInfoWindow.tsx
      Note: Current module-docs TOC loading path for one app.
    - Path: ../../../../../../../go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx
      Note: App-row context menu actions and right-click target registration.
    - Path: ../../../../../../../go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Existing apps-browser command routing and window payload patterns.
    - Path: ../../../../../../../go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx
      Note: Reusable chat window component to embed in the apps-browser window.
    - Path: ../../../../../../../go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts
      Note: Current prompt payload only supports prompt, conv_id, profile, and registry.
    - Path: ../../../../../../pkg/js/module_codex.go
      Note: |-
        openai-app-server currently exposes codexrpc/JS primitives rather than a backendhost module.
        Current openai-app-server surface is codexrpc/JS not backendhost module
    - Path: apps/os-launcher/src/App.tsx
      Note: |-
        Launcher host resolves namespaced API and WebSocket bases used by chat-runtime.
        Launcher host API/ws base resolution
    - Path: apps/os-launcher/src/app/store.ts
      Note: |-
        Shared launcher store already includes chat reducers needed by ChatConversationWindow.
        Shared chat reducers already mounted globally
    - Path: cmd/wesen-os-launcher/main.go
      Note: |-
        Current backend composition root; no generic assistant module is mounted yet.
        Current backend composition and missing assistant backend dependency
    - Path: workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Reference implementation for launcher-hosted chat windows
    - Path: workspace-links/go-go-app-inventory/pkg/pinoweb/request_resolver.go
      Note: Evidence that request_overrides is not a durable generic context transport
    - Path: workspace-links/go-go-os-backend/pkg/docmw/docmw.go
      Note: DocStore TOC/full-page behavior used in the design
    - Path: workspace-links/go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx
      Note: App-icon context action surface for Chat With App
    - Path: workspace-links/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx
      Note: App-row context action surface for Chat With App
    - Path: workspace-links/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Apps-browser command and window routing to extend
    - Path: workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx
      Note: Reusable chat window component to embed
    - Path: workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts
      Note: Current prompt payload contract and its limitations
ExternalSources: []
Summary: Detailed, evidence-backed guide for implementing a right-click "Chat With App" feature that opens a chat-runtime window and injects module documentation context safely and repeatably.
LastUpdated: 2026-03-05T20:17:26.199981308-05:00
WhatFor: Design and implementation blueprint for an app-specific documentation-grounded chat experience in the wesen-os launcher.
WhenToUse: Use when implementing APP-03 or onboarding an engineer who needs to understand launcher composition, apps-browser docs surfaces, chat-runtime, and the assistant-backend dependency.
---


# Intern Guide: Chat With App Architecture, Design, and Implementation Plan

## Executive Summary

The requested feature is straightforward from a user-experience perspective: right-click an app, choose `Chat With App`, open a dedicated chat window, and make that chat aware of the selected app's documentation so the user can ask questions in natural language.

Repository analysis shows that most of the building blocks already exist:

1. The launcher already has shared chat reducers in its global store, so any window can embed `ChatConversationWindow` without introducing a new desktop shell or a separate frontend app (`wesen-os/apps/os-launcher/src/app/store.ts:9-23`).
2. The Applications browser already knows how to identify a target app, register target-scoped context actions, and open app-specific windows from right-click menus (`go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx:35-85`, `go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx:23-88`, `go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx:157-231`).
3. The backend already exposes a uniform documentation contract for documentable modules: manifest docs hints, `/api/apps/<appId>/docs`, and `/api/apps/<appId>/docs/{slug}` (`go-go-os-backend/pkg/backendhost/manifest_endpoint.go:43-86`, `go-go-os-backend/pkg/docmw/docmw.go:146-212`).
4. The inventory app proves that a launcher window can wrap `ChatConversationWindow` successfully and point it at an app-specific backend prefix (`go-go-app-inventory/apps/inventory/src/launcher/module.tsx:50-60`, `go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx:887-1038`).

The missing pieces are the important ones:

1. There is no `Chat With App` action yet in apps-browser.
2. There is no generic documented-app chat window in apps-browser.
3. There is no first-class chat bootstrap contract that persists documentation context for a conversation.
4. There is no generic assistant backend mounted in `wesen-os` today; `cmd/wesen-os-launcher/main.go` mounts inventory/sqlite/todo/crm/book-tracker/arc-related modules, but not an `openai` app module, and root `/chat`, `/ws`, and `/api/timeline` are intentionally 404s (`wesen-os/cmd/wesen-os-launcher/main.go:314-340`, `wesen-os/cmd/wesen-os-launcher/main.go:471-484`).

The recommended implementation is:

1. Keep the right-click entry point inside apps-browser.
2. Add a new apps-browser-owned window that wraps `ChatConversationWindow`.
3. Bootstrap the conversation inside that window, not inside the synchronous command handler.
4. Add a backend bootstrap endpoint on the assistant backend that resolves module docs server-side, builds a bounded context bundle, attaches it to a new conversation, and returns `conv_id`.
5. Reuse existing `/chat`, `/ws`, and `/api/timeline` behavior after bootstrap so the runtime stays compatible with existing chat-runtime expectations.

This design keeps the launcher simple, keeps docs authoritative on the server, avoids resending large docs on every prompt, and makes the feature debuggable and testable.

## User Request, Scope, and Success Criteria

### Requested user experience

The user asked for this flow:

1. Select an app.
2. Right-click it.
3. Choose `chat with app`.
4. Open a chat window that behaves like the existing chat-runtime windows.
5. Seed the selected app's documentation into the chat context so the assistant can answer questions from the module docs.

The user also explicitly asked that the resulting design document be suitable for a new intern and include prose, bullets, pseudocode, diagrams, API references, and file references.

### In scope

This research/design ticket covers:

1. Current launcher, apps-browser, docs, and chat-runtime architecture.
2. The inventory app as the precedent implementation.
3. The dependency on openai-app-server or another generic assistant backend.
4. A concrete recommended design and file-level implementation plan.
5. Validation and testing guidance.

### Out of scope

This ticket does not implement production code. It also does not settle long-term policy questions such as:

1. role-based access policy for sensitive docs,
2. token pricing limits,
3. persistent storage strategy for cross-restart conversation recall,
4. cross-user or multi-tenant isolation.

### Definition of done for the future implementation ticket

The future code implementation should be considered done when all of the following are true:

1. `Chat With App` appears in the app context menu in both the module browser and Applications folder.
2. Triggering the action opens a dedicated chat window for the selected app.
3. The window successfully bootstraps a conversation using the selected app's documentation.
4. The chat window then uses standard chat-runtime routes and renders normal streaming/timeline behavior.
5. The feature works for:
   - a docs-enabled app,
   - an app with reflection docs but no TOC docs,
   - an app with neither docs nor reflection docs.
6. Tests cover the command routing, bootstrap request construction, backend context assembly, and failure states.

## System Orientation For A New Intern

### What lives where

This feature spans five logical subsystems across multiple repositories:

1. `wesen-os`
   - Concrete launcher composition root.
   - Hosts the SPA and mounts backend modules.
   - Holds launcher tests and top-level app list.

2. `go-go-os-frontend`
   - Shared frontend runtime packages.
   - Contains `apps-browser`, `chat-runtime`, and the desktop windowing/context-menu engine.

3. `go-go-os-backend`
   - Shared backend host contracts.
   - Defines documentable modules, reflection contracts, and module-local docs routes.

4. `go-go-app-inventory`
   - Current best example of an app that already wires chat windows, event/timeline windows, profiles, docs, and reflection together.

5. `openai-app-server`
   - Likely assistant backend dependency for this feature.
   - Today it exposes codexrpc/JS runtime primitives, not a mounted `backendhost.AppBackendModule`.

### Key terms

Use these terms consistently while implementing:

1. `target app`
   - The app the user right-clicked, such as `inventory` or `sqlite`.

2. `assistant backend`
   - The backend that actually runs the conversation. In the recommended design this is an `openai`-style backend module, not the target app itself.

3. `docs TOC`
   - The `/api/apps/<appId>/docs` response. It includes metadata but intentionally strips `content` (`go-go-os-backend/pkg/docmw/docmw.go:146-157`).

4. `docs page`
   - The `/api/apps/<appId>/docs/{slug}` response. It includes full `content` (`go-go-os-backend/pkg/docmw/docmw.go:159-169`).

5. `bootstrap`
   - The one-time step that creates a new conversation and attaches app documentation context to it before the user starts chatting.

6. `conversation window`
   - The actual UI component built from `ChatConversationWindow`.

### Core architecture picture

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Frontend: wesen-os launcher                                           │
│                                                                        │
│  apps-browser context menu                                             │
│      -> opens App Chat window                                          │
│      -> App Chat window bootstraps conv + context                      │
│      -> embeds ChatConversationWindow                                  │
│      -> standard /chat + /ws + /api/timeline afterward                │
└────────────────────────────────────────────────────────────────────────┘
                                |
                                v
┌────────────────────────────────────────────────────────────────────────┐
│ Backend: assistant app module (recommended: openai)                   │
│                                                                        │
│  POST /api/apps/openai/api/app-chat/bootstrap                          │
│      -> validate target app                                            │
│      -> load docs/reflection                                           │
│      -> build bounded context bundle                                   │
│      -> create conv_id and store conversation context                  │
│      -> return conv_id + summary                                       │
│                                                                        │
│  POST /api/apps/openai/chat                                            │
│  GET  /api/apps/openai/ws?conv_id=...                                  │
│  GET  /api/apps/openai/api/timeline?conv_id=...                        │
└────────────────────────────────────────────────────────────────────────┘
                                |
                                v
┌────────────────────────────────────────────────────────────────────────┐
│ Docs sources                                                            │
│                                                                        │
│  target module manifest docs hint                                      │
│  target module DocStore (/docs, /docs/{slug})                          │
│  target module reflection docs links                                   │
└────────────────────────────────────────────────────────────────────────┘
```

## Current-State Architecture

### 1. Launcher host already supports chat windows in arbitrary app windows

The launcher host resolves per-app HTTP and WebSocket prefixes centrally. In `wesen-os/apps/os-launcher/src/App.tsx:22-50`, the host context exposes:

1. `resolveApiBase(appId) => /api/apps/${appId}`
2. `resolveWsBase(appId) => /api/apps/${appId}/ws`
3. `openWindow(...)`
4. `closeWindow(...)`

This is important because the future apps-browser chat window does not need to invent routing. It can obtain the assistant backend prefix from the existing host context exactly like inventory does.

The launcher store already includes the chat reducers shared by `chat-runtime`:

1. `timeline`
2. `chatSession`
3. `chatWindow`
4. `chatProfiles`

These are registered in `wesen-os/apps/os-launcher/src/app/store.ts:9-23`. That means a new apps-browser window can render `ChatConversationWindow` immediately, as long as the chat runtime modules are registered and a valid backend exists.

The launcher module list already includes `apps-browser` and `inventory` in `wesen-os/apps/os-launcher/src/app/modules.tsx:15-24`, and the registry itself is just `createAppRegistry(launcherModules)` in `wesen-os/apps/os-launcher/src/app/registry.ts:1-4`. No top-level launcher architecture change is required just to add a new apps-browser window type.

### 2. Apps-browser already owns the right user-facing surfaces

The existing apps-browser context actions are the most natural entry point for this feature.

Observed surfaces:

1. `ModuleBrowserWindow`
   - Builds app-row context actions in `go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx:35-70`.
   - Registers target-scoped widget actions in `:72-85`.
   - Opens a right-click context menu using the widget target in `:115-132`.

2. `AppsFolderWindow`
   - Builds icon context actions in `go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx:23-58`.
   - Registers the icon target in `:60-88`.

3. `GetInfoWindow`
   - Uses manifest docs hints and then fetches the module docs TOC with `useGetModuleDocsQuery(app.app_id)` in `go-go-os-frontend/apps/apps-browser/src/components/GetInfoWindow.tsx:39-141`.

4. `BrowserDetailPanel`
   - Displays reflection-linked docs from the component browser and parses module-doc URLs via `parseModuleDocUrl(...)` in `go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx:46-87`.

5. `appsApi`
   - Already provides the data hooks needed to inspect app manifests, reflection, docs TOCs, and full docs pages in `go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts:53-146`.

This means the feature should live in apps-browser, because apps-browser already knows:

1. which app the user targeted,
2. how to discover whether docs exist,
3. how to navigate docs by slug,
4. how to open app-specific windows from user actions.

### 3. The backend documentation system is already structured correctly

The backend host supports documentable modules through an explicit optional interface:

1. `DocumentableAppBackendModule` exposes `DocStore()` in `go-go-os-backend/pkg/backendhost/module.go:35-39`.
2. `RegisterAppsManifestEndpoint(...)` adds docs availability hints to `/api/os/apps` when a module has a doc store in `go-go-os-backend/pkg/backendhost/manifest_endpoint.go:43-86`.
3. `docmw.MountRoutes(...)` mounts:
   - `GET /docs` for TOC data,
   - `GET /docs/{slug}` for the full document
   in `go-go-os-backend/pkg/docmw/docmw.go:171-212`.

Two details matter a lot for the feature design:

1. `DocStore.TOC()` strips the `Content` field on purpose (`go-go-os-backend/pkg/docmw/docmw.go:146-157`).
2. `DocStore.Get(slug)` returns the full document (`go-go-os-backend/pkg/docmw/docmw.go:159-169`).

That means a bootstrap service should not rely on the TOC alone. It must read the TOC first, then fetch the full pages for the selected slugs.

There is also an aggregate `/api/os/docs` endpoint in `wesen-os/cmd/wesen-os-launcher/docs_endpoint.go:143-208`. That endpoint is useful for global search or browse-all-docs features, but for `Chat With App`, the per-module docs endpoints are a better fit because the context must be explicitly scoped to one app.

### 4. Chat runtime is reusable, but its transport contract is narrow

`ChatConversationWindow` is a reusable component. The relevant contract is visible in `go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx:47-59`:

1. It needs `convId`.
2. It optionally takes `basePrefix`.
3. It can take a `profileScopeKey`, `windowId`, and context actions.

Internally it uses `useConversation(convId, basePrefix, profileScopeKey)` (`ChatConversationWindow.tsx:98-100`), which in turn:

1. connects `conversationManager` on mount (`go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.ts:98-155`),
2. calls `conversationManager.send(...)` for prompt submission (`useConversation.ts:157-196`),
3. hydrates timeline state and streaming state over HTTP + WebSocket.

The actual HTTP payload is currently very small. `submitPrompt(...)` in `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts:51-82` sends only:

```json
{
  "prompt": "<user text>",
  "conv_id": "<conversation id>",
  "profile": "<optional>",
  "registry": "<optional>"
}
```

There is no field here for:

1. a docs bundle,
2. a context pack ID,
3. target app metadata,
4. document slugs,
5. conversation bootstrap data.

The WebSocket and hydration routes are likewise fixed to inventory-style conventions:

1. `${basePrefix}/ws?conv_id=...` (`go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts:71-93`)
2. `${basePrefix}/api/timeline?conv_id=...` (`go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts:84-103`, `go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts:95-108`)

One more subtle constraint matters: `DesktopCommandHandler.run(...)` is synchronous and returns `'handled' | 'pass'` immediately (`go-go-os-frontend/packages/engine/src/components/shell/windowing/desktopContributions.ts:19-24`, `:132-142`). That is why the recommended design bootstraps the conversation in the window component lifecycle instead of awaiting network work in the command handler.

### 5. Inventory is the concrete precedent to copy

Inventory is the strongest example because it already does all of the following in one place:

1. resolves its backend base prefix from the launcher host (`go-go-app-inventory/apps/inventory/src/launcher/module.tsx:50-60`),
2. opens a chat window from commands and icons (`go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx:134-137`, `:477-485`, `:751-820`),
3. wraps `ChatConversationWindow` inside a launcher window component (`renderInventoryApp.tsx:887-997`),
4. maps instance IDs to different app-specific window types (`renderInventoryApp.tsx:999-1038`),
5. registers chat-runtime modules once at module load (`renderInventoryApp.tsx:76-80`).

Inventory also demonstrates that apps can add conversation-specific context actions, debug windows, and profile selectors around the base chat window.

For APP-03, the feature does not need all of inventory's extras, but it should copy these patterns:

1. a thin wrapper component around `ChatConversationWindow`,
2. window payload builders,
3. instance-based window routing,
4. chat-runtime module registration via `ensureChatModulesRegistered()` (`go-go-os-frontend/packages/chat-runtime/src/chat/runtime/registerChatModules.ts:8-31`).

### 6. The generic assistant backend does not exist in `wesen-os` yet

This is the hard dependency.

`wesen-os/cmd/wesen-os-launcher/main.go:314-340` shows the backend module registry being created and mounted. There is no `openai` backend module in the current composition. The same file explicitly mounts 404 handlers at `/chat`, `/ws`, and `/api/timeline` on the root mux (`main.go:471-484`), so there is no hidden generic chat service available at the launcher root either.

The `openai-app-server` repository currently exposes codexrpc and JS harness surfaces, for example:

1. `require("codex").connect()` and thread/turn helpers in `openai-app-server/pkg/js/module_codex.go:10-158`,
2. a JSON-RPC client with request/notification handlers in `openai-app-server/pkg/codexrpc/client.go:39-260`.

What it does not currently expose in the checked-in code is a `backendhost.AppBackendModule` with namespaced `/chat`, `/ws`, `/api/timeline`, and docs bootstrap routes.

That means APP-03 is either:

1. blocked on APP-01, or
2. must include the backend half of APP-01 as a prerequisite.

## Gap Analysis

The requested feature differs from the current system in six concrete ways.

### Gap 1: No `Chat With App` action exists

Current actions in app context menus are:

1. `Open in Browser`
2. `Get Info`
3. `View Documentation`
4. `Open Health Dashboard`
5. `Launch App`

This is visible in both `ModuleBrowserWindow.tsx:35-70` and `AppsFolderWindow.tsx:23-58`.

### Gap 2: No apps-browser window can render a chat session

The apps-browser window adapter currently renders:

1. folder view,
2. module browser,
3. health dashboard,
4. docs browser,
5. get-info window

from `go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx:157-231`. There is no chat window case today.

### Gap 3: No durable context-bootstrap contract exists

The frontend prompt contract only supports raw prompt + conversation ID (`chat-runtime/http.ts:51-82`). The system has no first-class API to say:

1. create a conversation for target app `inventory`,
2. attach docs slugs `overview`, `api-reference`, `profiles-and-runtime`,
3. persist that context for all future turns in the conversation.

### Gap 4: The tempting `request_overrides` path is not sufficient

Inventory's backend request resolver accepts a `request_overrides` field in the incoming POST body (`go-go-app-inventory/pkg/pinoweb/request_resolver.go:21-29`), but it uses that field only while resolving profiles (`request_resolver.go:131-144`, `:192-210`) and then returns `ResolvedConversationRequest{Overrides: nil}` (`request_resolver.go:146-154`).

There is also a policy test showing that overriding the system prompt may be rejected by profile policy (`go-go-app-inventory/pkg/pinoweb/request_resolver_test.go:102-111`).

So even if the frontend added `request_overrides.system_prompt`, that would be:

1. inventory-specific,
2. policy-sensitive,
3. not a robust generic "attach app docs to a conversation" mechanism.

### Gap 5: Reflection doc links are mixed-quality sources

The component browser shows reflection docs surfaced by backend modules. Inventory's reflection document includes both:

1. a raw repo `Path` to the README (`go-go-app-inventory/pkg/backendmodule/reflection.go:29-35`),
2. a module docs `URL` such as `/api/apps/inventory/docs/overview` (`reflection.go:37-40`).

That distinction matters. Only module-doc URLs should be auto-ingested into assistant context by default. Raw repo paths are useful for humans in the browser, but they are not part of the published runtime docs contract and should not be silently read by the assistant bootstrap service.

### Gap 6: Command handlers are synchronous

Because `DesktopCommandHandler.run(...)` is synchronous (`desktopContributions.ts:19-24`), a context-menu action cannot cleanly block on a network bootstrap before returning. The window itself must own the asynchronous bootstrap state.

## Design Principles

The recommended implementation should follow these principles.

1. Keep the feature app-scoped.
   - The user is asking about one app, not global docs search.

2. Keep published module docs authoritative.
   - Use `DocStore` pages and runtime reflection metadata.
   - Do not silently scrape arbitrary repo files.

3. Bootstrap once, then chat normally.
   - Do not resend the entire docs bundle on every prompt.

4. Keep apps-browser responsible for selection UX.
   - The right-click surface belongs in apps-browser.

5. Keep the assistant backend responsible for context persistence.
   - The backend should know what context belongs to `conv_id`.

6. Keep failure modes visible.
   - The chat window should tell the user whether it bootstrapped full docs context, partial context, or fallback manifest-only context.

## Recommended Architecture

### High-level choice

The recommended shape is:

1. `apps-browser` owns the `Chat With App` action and the chat window UI.
2. An assistant backend module owns conversation creation and documentation context storage.
3. The bootstrap request identifies the target app and optional preferred doc slugs.
4. After bootstrap, the frontend uses normal `chat-runtime` routes with the returned `conv_id`.

This is simpler than creating a new standalone frontend app module for two reasons:

1. the window belongs conceptually to the app browser user flow,
2. the launcher store already contains the chat reducers.

### Why apps-browser should own the window

Apps-browser already contains all of the selection context:

1. the app ID,
2. the app name,
3. knowledge of docs availability,
4. access to reflection doc links and docs slugs,
5. existing right-click targets and command routing.

That makes apps-browser the correct home for:

1. the context-menu action,
2. the bootstrap-loading state,
3. the header actions that link back to docs or get-info,
4. a small summary of which docs were attached.

### Why bootstrap must be server-side

The server-side bootstrap model is strongly preferable to a client-side "stuff docs into the first prompt" model.

Benefits:

1. One network request instead of repeated huge prompt payloads.
2. Better control over token/character budgets.
3. Centralized truncation, ranking, and provenance logic.
4. Clear auditability about which docs were attached.
5. No dependence on `request_overrides` semantics.

Cost:

1. It requires a new backend route and a context store.

That cost is justified because the feature otherwise becomes fragile and expensive.

### Proposed runtime flow

```text
User right-clicks app row/icon
    |
    v
apps-browser context action: apps-browser.chat-with-app
    |
    v
apps-browser command handler opens AppChatWindow(appId, appName, preferredDocSlug?)
    |
    v
AppChatWindow useEffect:
  - ensureChatModulesRegistered()
  - POST /api/apps/openai/api/app-chat/bootstrap
        {
          "target_app_id": "inventory",
          "preferred_doc_slugs": ["overview"],
          "source_surface": "module-browser"
        }
    |
    v
assistant backend:
  - validate target app
  - load manifest + DocStore TOC/pages + reflection docs
  - build bounded context bundle
  - create conversation
  - persist context by conv_id
  - return conv_id + context summary
    |
    v
AppChatWindow renders:
  <ChatConversationWindow convId=... basePrefix="/api/apps/openai" ... />
    |
    v
future turns use normal:
  POST /chat
  GET  /api/timeline
  WS   /ws
```

### Frontend design

#### 1. Add a new command and context-menu entry

Add a new command ID:

```ts
const COMMAND_CHAT_WITH_APP = 'apps-browser.chat-with-app';
```

Add it to the app context actions in:

1. `go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx`
2. `go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx`

Recommended placement:

1. after `View Documentation`,
2. before the health/dashboard section.

Suggested label:

```text
Chat With App
```

Optional but recommended discoverability additions:

1. a `Chat With App` button in `GetInfoWindow`,
2. a `Chat About This App` action/button in `BrowserDetailPanel`,
3. a `Chat About This Doc` action when launched from a doc page, passing a preferred slug.

#### 2. Add a new apps-browser window payload

Add a window builder in `go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx`.

Recommended shape:

```ts
function buildAppChatWindowPayload(opts: {
  appId: string;
  appName?: string;
  preferredDocSlug?: string;
}): OpenWindowPayload
```

Recommended `appKey` prefix:

```text
apps-browser:app-chat:<encodedAppId>[:<encodedPreferredDocSlug>]
```

The command handler should remain synchronous and just open the window.

#### 3. Add a new window component

Create a new component such as:

```text
go-go-os-frontend/apps/apps-browser/src/components/AppChatWindow.tsx
```

Responsibilities:

1. call `ensureChatModulesRegistered()` once,
2. bootstrap the conversation in `useEffect`,
3. show loading/error UI before `conv_id` is ready,
4. render `ChatConversationWindow` once ready,
5. show small metadata about attached docs.

Pseudocode:

```tsx
export function AppChatWindow(props: {
  targetAppId: string;
  targetAppName?: string;
  assistantBasePrefix: string;
  preferredDocSlug?: string;
  onOpenDocs?: (appId: string, slug?: string) => void;
  onOpenGetInfo?: (appId: string) => void;
}) {
  ensureChatModulesRegistered();
  const [state, setState] = useState<{ kind: 'loading' | 'ready' | 'error'; ... }>(
    { kind: 'loading' }
  );

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    bootstrapAppChat({
      assistantBasePrefix,
      targetAppId,
      preferredDocSlug,
      sourceSurface: 'module-browser',
    }).then((result) => {
      if (cancelled) return;
      setState({ kind: 'ready', result });
    }).catch((error) => {
      if (cancelled) return;
      setState({ kind: 'error', error: toMessage(error) });
    });
    return () => {
      cancelled = true;
    };
  }, [assistantBasePrefix, targetAppId, preferredDocSlug]);

  if (state.kind === 'loading') return <BootstrapLoadingPane ... />;
  if (state.kind === 'error') return <BootstrapErrorPane ... />;

  return (
    <ChatConversationWindow
      convId={state.result.convId}
      basePrefix={assistantBasePrefix}
      title={`Chat: ${state.result.targetApp.name}`}
      windowId={...}
      profileScopeKey={`conv:${state.result.convId}`}
      headerActions={<AppChatHeader ... />}
    />
  );
}
```

#### 4. Resolve the assistant backend base prefix explicitly

The future apps-browser window needs a backend prefix for the assistant backend, not the target app.

Recommended source:

```ts
const assistantBasePrefix = hostContext.resolveApiBase?.('openai') ?? '/api/apps/openai';
```

Important nuance:

1. the target app ID and the assistant backend app ID are different concepts,
2. the target app ID is the docs source,
3. the assistant backend app ID is the chat transport endpoint.

#### 5. Register runtime modules

Inventory calls:

1. `registerChatRuntimeModule(...)`
2. `ensureChatModulesRegistered()`

at module load time in `go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx:76-80`.

For APP-03, the minimum requirement is `ensureChatModulesRegistered()` from `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/registerChatModules.ts:19-21`, because the apps-browser chat window will need the default SEM handlers and default timeline renderers. A custom renderer registration step is only needed if the assistant backend introduces new timeline entity kinds.

### Backend design

#### 1. Add a bootstrap endpoint on the assistant backend

Recommended route:

```text
POST /api/apps/openai/api/app-chat/bootstrap
```

Why this route:

1. it is clearly assistant-backend-owned,
2. it is not confused with ordinary prompt submission,
3. it leaves `/chat`, `/ws`, and `/api/timeline` unchanged.

#### 2. Introduce a docs resolver service instead of scraping HTTP

The bootstrap endpoint needs a narrow service for reading target app documentation.

Recommended interface:

```go
type AppDocumentationResolver interface {
    GetManifest(appID string) (backendhost.AppBackendManifest, bool)
    GetDocTOC(appID string) ([]docmw.ModuleDoc, bool, error)
    GetDoc(appID string, slug string) (*docmw.ModuleDoc, bool, error)
    GetReflection(ctx context.Context, appID string) (*backendhost.ModuleReflectionDocument, bool, error)
}
```

This service should resolve docs from the in-process module registry and documentable modules, not by loopback HTTP calls. That keeps the bootstrap path deterministic and avoids internal network dependencies.

One implementation detail for the composition root:

1. the resolver can be injected as a closure or small object into the assistant module,
2. it can close over the module registry after the registry is created,
3. the closure only needs to be called at request time, not construction time.

This avoids redesigning the global backendhost interfaces.

#### 3. Store context by conversation ID

The bootstrap endpoint should create a conversation and persist the resulting context under `conv_id`.

What must be stored:

1. target app ID,
2. target app name,
3. selected docs slugs,
4. normalized docs bundle,
5. context-building metadata such as truncation flags and token/character estimate.

Why:

1. later `/chat` calls only carry `conv_id`,
2. the assistant backend must be able to reconstruct the conversation prompt without the client resending docs.

#### 4. Build context from published docs plus safe reflection metadata

Recommended sources, in order:

1. app manifest name/description/capabilities,
2. module docs TOC,
3. selected full docs pages,
4. reflection document summary/APIs/capabilities,
5. reflection doc links that resolve to module-doc URLs.

Do not auto-ingest by default:

1. raw repo `Path` links from reflection docs,
2. arbitrary files on disk,
3. launcher-wide docs search results from unrelated modules.

### Recommended bootstrap API

#### Request

```json
{
  "target_app_id": "inventory",
  "preferred_doc_slugs": ["overview"],
  "source_surface": "module-browser",
  "source_reflection_doc_ids": ["inventory-docs-overview"]
}
```

Recommended fields:

1. `target_app_id`
   - required
   - the app whose docs should ground the conversation

2. `preferred_doc_slugs`
   - optional
   - hint from current surface such as a currently selected doc page

3. `source_surface`
   - optional
   - useful for metrics/debugging; values like `module-browser`, `apps-folder`, `get-info`, `doc-browser`

4. `source_reflection_doc_ids`
   - optional
   - useful if the launch came from a reflection-linked docs item

#### Response

```json
{
  "conv_id": "conv-123",
  "assistant_app_id": "openai",
  "target_app": {
    "app_id": "inventory",
    "name": "Inventory",
    "description": "Inventory chat runtime, profiles, timeline, and confirm APIs"
  },
  "context_summary": {
    "doc_source_mode": "docs+reflection",
    "attached_docs": [
      { "slug": "overview", "title": "Inventory Module Overview", "doc_type": "guide", "truncated": false },
      { "slug": "api-reference", "title": "API Reference", "doc_type": "reference", "truncated": true }
    ],
    "omitted_docs": [
      { "slug": "profiles-and-runtime", "reason": "budget" }
    ],
    "estimated_chars": 18420
  }
}
```

The frontend should display a small subset of this response in the chat window header or side panel so the user can see what knowledge the conversation was seeded with.

### Context assembly algorithm

The assistant backend needs deterministic doc selection and truncation rules.

Recommended algorithm:

1. Load the app manifest.
2. Attempt to load the docs TOC.
3. Attempt to load reflection metadata.
4. Convert reflection doc URLs of the form `/api/apps/<moduleId>/docs/<slug>` into preferred slugs using the same URL convention the frontend already parses in `docLinkInteraction.ts:17-29`.
5. Build an ordered candidate list of doc slugs:
   - explicit `preferred_doc_slugs`,
   - reflection-linked module-doc slugs,
   - heuristics such as `overview`, `getting-started`, `architecture`, `api-reference`, `profiles-and-runtime`, `troubleshooting`,
   - remaining TOC items by `order` and then slug.
6. Fetch full docs pages for candidates until the character budget is reached.
7. Attach a structured context object to the conversation.

Pseudocode:

```go
func BuildAppContext(req BootstrapRequest) (ContextBundle, error) {
    manifest := resolver.GetManifest(req.TargetAppID)
    toc, tocOk := resolver.GetDocTOC(req.TargetAppID)
    reflection, reflectionOk := resolver.GetReflection(ctx, req.TargetAppID)

    preferred := orderedSet{}
    preferred.AddAll(req.PreferredDocSlugs)
    preferred.AddAll(extractModuleDocSlugs(reflection.Docs))
    preferred.AddAll(rankCommonSlugs(toc))
    preferred.AddAll(allRemainingTOCSlugs(toc))

    bundle := ContextBundle{
        TargetApp: manifest,
        ReflectionSummary: summarizeReflection(reflection),
    }

    budget := 22000
    for _, slug := range preferred.Values() {
        doc, ok := resolver.GetDoc(req.TargetAppID, slug)
        if !ok {
            continue
        }
        excerpt, truncated := clipMarkdown(doc.Content, 6000, budget)
        if excerpt == "" {
            bundle.OmittedDocs = append(bundle.OmittedDocs, OmittedDoc{Slug: slug, Reason: "budget"})
            continue
        }
        bundle.AttachedDocs = append(bundle.AttachedDocs, AttachedDoc{
            Slug: slug, Title: doc.Title, DocType: doc.DocType,
            Summary: doc.Summary, Content: excerpt, Truncated: truncated,
        })
        budget -= len(excerpt)
        if budget <= 0 {
            break
        }
    }

    if len(bundle.AttachedDocs) == 0 {
        bundle.Mode = "manifest-only"
    } else if reflectionOk {
        bundle.Mode = "docs+reflection"
    } else {
        bundle.Mode = "docs-only"
    }
    return bundle, nil
}
```

### Prompt construction guidance

The assistant backend should not simply concatenate raw markdown blindly into a hidden system prompt without structure. It should build a stable internal representation first.

Recommended prompt sections:

1. `Target App`
2. `Manifest Summary`
3. `Capabilities`
4. `Selected Documentation`
5. `Reflection API Summary`
6. `Instructions`

Recommended instruction fragment:

```text
Answer using the attached app documentation first.
If the documentation is missing or ambiguous, say so explicitly.
Do not invent APIs, routes, fields, or behaviors that are not present in the supplied module docs or reflection summary.
```

This makes the assistant honest about gaps instead of hallucinating based on the app name alone.

### Fallback modes

The feature should degrade gracefully.

1. Docs available:
   - Attach docs + reflection summary.

2. Docs unavailable but reflection available:
   - Attach manifest + reflection summary only.

3. Docs and reflection unavailable:
   - Still open the chat window, but mark the context mode as `manifest-only`.

4. Assistant backend unavailable:
   - Open an error pane in the chat window with a clear message that the assistant backend is not mounted.

5. Bootstrap failure:
   - Keep the window open and provide:
     - retry,
     - open docs,
     - get info.

## Detailed File-By-File Implementation Plan

### Phase 0: Land the assistant backend dependency first

If APP-01 is not already merged, do this first.

Files to inspect and likely modify:

1. `wesen-os/cmd/wesen-os-launcher/main.go`
   - Mount the assistant backend module in the module registry.

2. `openai-app-server/...`
   - Add a `backendhost.AppBackendModule` adapter with:
     - `/chat`
     - `/ws`
     - `/api/timeline`
     - `/api/app-chat/bootstrap`

Deliverable:

1. A mounted assistant backend at `/api/apps/openai`.

### Phase 1: Add the apps-browser command and window shell

Files:

1. `go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx`
   - Add `Chat With App` to app-row context actions.

2. `go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx`
   - Add `Chat With App` to app-icon context actions.

3. `go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx`
   - Add:
     - window payload builder,
     - appKey parser,
     - window adapter case,
     - command handler case.

4. `go-go-os-frontend/apps/apps-browser/src/components/AppChatWindow.tsx`
   - New file.

Implementation notes:

1. The command handler should only open the window.
2. The window component should own loading and bootstrap.
3. Use the assistant backend base prefix, not the target app base prefix.

### Phase 2: Add the bootstrap request helper on the frontend

Files:

1. `go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts`
   - Either add a mutation here, or create `appChatApi.ts`.

2. `go-go-os-frontend/apps/apps-browser/src/components/AppChatWindow.tsx`
   - Call the bootstrap mutation.

Recommended helper:

```ts
async function bootstrapAppChat(args: {
  assistantBasePrefix: string;
  targetAppId: string;
  preferredDocSlug?: string;
  sourceSurface: string;
}): Promise<BootstrapResponse>
```

Recommended UX states:

1. `loading`: "Preparing chat context from module docs..."
2. `error`: show reason and retry button
3. `ready`: render the actual chat window

### Phase 3: Add the backend docs-context bootstrap contract

Files:

1. assistant backend module package in `openai-app-server`
   - add bootstrap HTTP handler
   - add in-memory or persistent context store by `conv_id`

2. a new resolver/assembler package
   - suggested names:
     - `pkg/appchat`
     - `pkg/appcontext`
     - `pkg/bootstrap`

Recommended subcomponents:

1. `resolver`
   - read manifest/docs/reflection for a target app

2. `assembler`
   - rank docs, enforce budgets, build normalized context bundle

3. `conversation bootstrap service`
   - create conversation, attach bundle, return summary

### Phase 4: Optional apps-browser discoverability improvements

Files:

1. `go-go-os-frontend/apps/apps-browser/src/components/GetInfoWindow.tsx`
2. `go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx`

Recommended additions:

1. `Chat With App` button in get-info.
2. `Chat About This Doc` button when a concrete doc slug is known.

This is not required for the basic right-click flow, but it makes the feature easier to find.

### Phase 5: Tests

Frontend tests:

1. `wesen-os/apps/os-launcher/src/__tests__/launcherHost.test.tsx`
   - add routing coverage for `apps-browser.chat-with-app`
   - use inventory conversation-action tests (`launcherHost.test.tsx:403-470`) as style precedent

2. `wesen-os/apps/os-launcher/src/__tests__/launcherContextMenu.test.tsx`
   - add a right-click integration test proving the action appears and opens a new window
   - existing context-menu patterns are in `launcherContextMenu.test.tsx:116-261`

3. apps-browser unit tests
   - payload builder parse/build round trips
   - bootstrap loading, error, ready states
   - preferred-doc slug propagation

Backend tests:

1. bootstrap handler validates missing/unknown target app IDs,
2. docs selection chooses preferred slug first,
3. raw reflection `Path` links are not auto-ingested,
4. context bundle is truncated deterministically,
5. ordinary `/chat` requests reuse stored conversation context.

## API Reference And Contracts

### Existing routes already in use

| Route | Owner | Purpose | Evidence |
| --- | --- | --- | --- |
| `GET /api/os/apps` | backendhost | App manifest + docs/reflection hints | `go-go-os-backend/pkg/backendhost/manifest_endpoint.go:43-86` |
| `GET /api/os/apps/{id}/reflection` | backendhost | Reflection document | `go-go-os-backend/pkg/backendhost/manifest_endpoint.go:88-123` |
| `GET /api/apps/{id}/docs` | documentable module | Docs TOC | `go-go-os-backend/pkg/docmw/docmw.go:180-189` |
| `GET /api/apps/{id}/docs/{slug}` | documentable module | Full module doc | `go-go-os-backend/pkg/docmw/docmw.go:191-209` |
| `POST {basePrefix}/chat` | chat-runtime backend | Submit one prompt | `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts:51-82` |
| `GET {basePrefix}/api/timeline?conv_id=...` | chat-runtime backend | Timeline hydration | `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts:84-103` |
| `GET {basePrefix}/ws?conv_id=...` | chat-runtime backend | Streaming updates | `go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts:71-93` |

### Proposed new route

| Route | Owner | Purpose |
| --- | --- | --- |
| `POST /api/apps/openai/api/app-chat/bootstrap` | assistant backend | Create a new conversation with target-app docs context attached |

## Alternatives Considered

### Alternative 1: Send docs from the frontend on every prompt

Shape:

1. fetch docs in the browser,
2. prepend them to every `submitPrompt(...)` call.

Rejected because:

1. `submitPrompt` currently has no structured context field,
2. it duplicates large payloads every turn,
3. it makes budgeting inconsistent,
4. it leaks too much prompt assembly policy into the client.

### Alternative 2: Reuse `request_overrides.system_prompt`

Rejected because:

1. it is not part of the generic `chat-runtime` contract,
2. inventory currently resolves overrides through profile policy and then discards them from the returned request (`request_resolver.go:136-154`),
3. tests already show policy can reject overrides (`request_resolver_test.go:102-111`).

### Alternative 3: Build a separate frontend launcher module just for app chat

Rejected because:

1. apps-browser already owns the selection UX,
2. the launcher store already has shared chat reducers,
3. an extra launcher module would increase surface area without solving a real architectural problem.

### Alternative 4: Auto-read raw repo files referenced by reflection `Path`

Rejected because:

1. `Path` is not a runtime docs API contract,
2. it risks pulling in unpublished or unexpectedly large content,
3. it couples assistant context to checkout layout.

## Testing And Validation Strategy

### Unit tests

Write focused tests for:

1. app chat window payload encode/decode,
2. bootstrap request generation,
3. docs ranking and truncation,
4. reflection URL parsing to preferred slugs,
5. fallback behavior when docs are absent.

### Launcher integration tests

Add or extend tests so they prove:

1. the context menu shows `Chat With App`,
2. selecting it opens a window,
3. the window is routed by apps-browser's command handler,
4. the correct target app ID is propagated.

### Backend integration tests

Add tests for:

1. bootstrap success with a docs-enabled target app,
2. bootstrap success with reflection-only target app,
3. bootstrap success with manifest-only fallback,
4. bootstrap rejection for unknown target app,
5. subsequent `/chat` requests using stored context.

### Manual validation sequence

Use a docs-enabled app such as inventory first.

Suggested manual checks:

1. right-click `Inventory` in module browser,
2. choose `Chat With App`,
3. observe loading state,
4. confirm window title identifies the target app,
5. confirm header or metadata panel shows attached docs,
6. ask: "What are the main APIs exposed by this app?"
7. verify the answer cites inventory docs/reflection concepts rather than generic chat filler,
8. repeat with an app that lacks docs to confirm fallback messaging.

## Risks And Sharp Edges

### Risk 1: APP-01 dependency is real

If the assistant backend is not mounted, the frontend work cannot function end-to-end.

Mitigation:

1. treat APP-01 as a prerequisite,
2. fail visibly in the bootstrap pane when the backend is missing.

### Risk 2: Docs can exceed token budgets quickly

Some apps will eventually publish more docs than fit comfortably into one context window.

Mitigation:

1. rank docs,
2. clip each page,
3. keep structured metadata about omitted docs,
4. consider retrieval/chunking later if needed.

### Risk 3: Different apps have uneven documentation quality

Some apps expose TOC docs, some only reflection, some neither.

Mitigation:

1. build clear fallback modes,
2. surface the mode to the user,
3. do not pretend the assistant has docs it does not actually have.

### Risk 4: Conversation state can become opaque

If the user cannot tell what docs were attached, the feature becomes hard to trust.

Mitigation:

1. show attached docs in the window header or a collapsible summary panel,
2. include truncation badges,
3. include a `View Docs` action.

## Open Questions

### 1. Which assistant backend app ID should be canonical?

Recommended answer:

1. `openai`

Reason:

1. it aligns with APP-01 and keeps the contract explicit.

### 2. Should the bootstrap endpoint auto-send an initial hidden prompt?

Recommended answer:

1. no

Reason:

1. keep bootstrap separate from user messaging,
2. let the user ask the first visible question,
3. reduce surprising behavior in the timeline.

### 3. Should the window allow multiple chats for the same app?

Recommended answer:

1. yes

Reason:

1. different conversations may focus on APIs, architecture, or troubleshooting separately.

### 4. Should the feature be available only for docs-enabled apps?

Recommended answer:

1. no

Reason:

1. manifest-only fallback is still useful,
2. the UI should simply explain the weaker context quality.

## Reference Map

Use this section as the intern's reading order.

1. `wesen-os/apps/os-launcher/src/App.tsx:22-50`
   - How app windows resolve backend prefixes.

2. `wesen-os/apps/os-launcher/src/app/store.ts:9-23`
   - Why chat reducers are already available globally.

3. `go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx:35-132`
   - App-row context actions and right-click targeting.

4. `go-go-os-frontend/apps/apps-browser/src/components/AppsFolderWindow.tsx:23-88`
   - App-icon context actions.

5. `go-go-os-frontend/apps/apps-browser/src/components/GetInfoWindow.tsx:39-141`
   - How docs TOCs are fetched today.

6. `go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx:46-87`
   - How reflection doc links surface in the component browser.

7. `go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts:53-146`
   - Existing frontend data hooks for apps/docs/reflection.

8. `go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx:47-349`
   - The chat window component that will be reused.

9. `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts:29-103`
   - Existing prompt/timeline HTTP contract.

10. `go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts:71-108`
    - WebSocket URL and hydration expectations.

11. `go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx:76-80`
    - Chat runtime module registration.

12. `go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx:887-1038`
    - Inventory's reusable chat-window wrapper pattern.

13. `go-go-os-backend/pkg/backendhost/module.go:19-39`
    - Backend module and documentable-module interfaces.

14. `go-go-os-backend/pkg/docmw/docmw.go:146-212`
    - TOC/full-page docs behavior.

15. `go-go-app-inventory/pkg/pinoweb/request_resolver.go:21-29`, `:131-154`, `:192-210`
    - Why `request_overrides` is the wrong abstraction for this feature.

16. `wesen-os/cmd/wesen-os-launcher/main.go:314-340`, `:471-484`
    - Current backend composition and absence of a generic assistant route.

17. `openai-app-server/pkg/js/module_codex.go:10-158`
    - Current openai-app-server surface area; useful context, but not yet the backendhost module this feature needs.

## Problem Statement

<!-- Describe the problem this design addresses -->

## Proposed Solution

<!-- Describe the proposed solution in detail -->

## Design Decisions

<!-- Document key design decisions and rationale -->

## Alternatives Considered

<!-- List alternative approaches that were considered and why they were rejected -->

## Implementation Plan

<!-- Outline the steps to implement this design -->

## Open Questions

<!-- List any unresolved questions or concerns -->

## References

<!-- Link to related documents, RFCs, or external resources -->
