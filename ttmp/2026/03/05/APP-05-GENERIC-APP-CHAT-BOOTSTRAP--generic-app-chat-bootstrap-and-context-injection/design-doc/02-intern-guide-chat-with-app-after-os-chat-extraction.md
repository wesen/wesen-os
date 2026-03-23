---
Title: Intern Guide - Generic Chat With App After OS Chat Extraction
Ticket: APP-05-GENERIC-APP-CHAT-BOOTSTRAP
Status: active
Topics:
    - backend
    - chat
    - documentation
    - wesen-os
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../wesen-os/pkg/assistantbackendmodule/module.go
      Note: Shared assistant backend module currently mounts the generic assistant chat surface
    - Path: ../../../../../../../go-go-os-chat/pkg/chatservice/component.go
      Note: Shared mountable chat transport component extracted in APP-04
    - Path: ../../../../../../../go-go-os-chat/pkg/profilechat/runtime_composer.go
      Note: Shared runtime composer that should gain a conversation-context hook
    - Path: ../../../../../../../go-go-os-chat/pkg/profilechat/request_resolver.go
      Note: Shared request resolver that currently only resolves conv_id and runtime/profile selection
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/docs_endpoint.go
      Note: Existing OS docs aggregation endpoint and in-process docstore access pattern
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-backend/pkg/backendhost/module.go
      Note: Optional DocumentableAppBackendModule and ReflectiveAppBackendModule contracts
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx
      Note: Existing app-row context menu surface where Chat With App should be added
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/app/store.ts
      Note: Apps Browser local store is not chat-capable today
    - Path: ../../../../../../../wesen-os/apps/os-launcher/src/app/store.ts
      Note: Launcher host store already contains chat reducers and is the better chat window host
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx
      Note: Shared frontend chat window that should be reused for app-chat sessions
ExternalSources: []
Summary: Revised APP-05 design based on the now-existing shared assistant backend and go-go-os-chat extraction. Defines how generic Chat With App should work, what remains OS-specific, where bootstrap state should live, how docs/reflection should be resolved, and what implementation sequence should happen next.
LastUpdated: 2026-03-06T19:05:00-05:00
WhatFor: Use when implementing the real Chat With App feature after APP-04, or when deciding which responsibilities belong in go-go-os-chat versus the wesen-os assistant module.
WhenToUse: Use before adding assistant bootstrap routes, before wiring apps-browser context actions to assistant chat windows, or when onboarding an engineer to APP-05 implementation.
---

# Intern Guide - Generic Chat With App After OS Chat Extraction

## Executive Summary

APP-05 is now ready to be designed concretely because APP-04 is no longer hypothetical.

The current codebase already has:

- a shared assistant backend module mounted at `/api/apps/assistant`
- a shared Go chat transport/runtime layer in `go-go-os-chat`
- a namespaced OS docs surface at `/api/os/docs`
- optional per-module `DocStore()` and `Reflection()` contracts
- apps-browser context menus and desktop command infrastructure
- a launcher host Redux store that is already chat-capable

That means APP-05 should no longer be framed as “wait until the assistant backend exists.” It already exists.

The right design now is:

1. keep the generic chat transport/runtime inside `go-go-os-chat`
2. add one small generic conversation-context hook there
3. implement app-doc/reflection/bootstrap resolution in `wesen-os`, because that logic depends on the OS module registry
4. expose a bootstrap endpoint from the assistant backend module
5. let apps-browser invoke that endpoint from a new `Chat With App` context action
6. open a dedicated assistant chat window hosted by the launcher store, not the apps-browser local store

The most important design choice is this:

**APP-05 is an OS feature layered on top of the shared assistant backend, not another round of generic chat-platform extraction.**

Do not move module-registry, docs, or reflection resolution into `go-go-os-chat` unless there is a second real host that needs the same behavior.

## Problem Statement

The desired product behavior is:

```text
User right-clicks app in Apps Browser
  -> chooses "Chat With App"
  -> new chat window opens
  -> assistant already has the app's documentation/reflection context
  -> user asks questions like:
       "What APIs does this app expose?"
       "What docs are available?"
       "How do I query this module?"
```

The design goal is not merely to open a generic chat window. The design goal is to open a conversation whose **subject** is a selected app and whose assistant context is seeded with information about that app.

Earlier ticket versions assumed the system first needed a generic assistant backend. That assumption is now outdated:

- [assistant module](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go) already exists
- [chatservice](/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/chatservice/component.go) already mounts the shared `/chat`, `/ws`, `/api/timeline`, and profile APIs
- [profilechat runtime composer](/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/runtime_composer.go) already builds the assistant runtime

So the remaining work is feature-specific bootstrap and context injection.

## Current State

## 1. Shared assistant backend already exists

The launcher mounts an assistant module:

- [main.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go)
- [module.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go)

The assistant module currently:

- reuses `go-go-os-chat/pkg/chatservice`
- points at a shared `webchat.Server`
- points at a `profilechat.StrictRequestResolver`
- exposes generic assistant chat/profile/timeline/confirm routes

This means APP-05 should extend the assistant module, not invent a second chat backend.

## 2. The shared chat package is generic enough for transport, but not for app discovery

`go-go-os-chat` currently contains:

- [chatservice/component.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/chatservice/component.go)
- [profilechat/request_resolver.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go)
- [profilechat/runtime_composer.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/runtime_composer.go)

These files are generic in a useful sense:

- they do not know about inventory
- they do not know about specific app docs
- they do not know about the `wesen-os` module registry

That is good.

What they do **not** contain yet is a hook like:

```go
type ConversationContextProvider interface {
    Lookup(ctx context.Context, convID string) (*ConversationContext, error)
}
```

APP-05 needs exactly that kind of hook, but it does **not** need the chat package itself to know how to inspect app modules.

## 3. The OS already exposes the data sources APP-05 needs

The runtime already has both authored docs and machine-readable reflection.

### Authored docs

Modules can implement:

- [DocumentableAppBackendModule](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-backend/pkg/backendhost/module.go)

The launcher already knows how to aggregate docs:

- [docs_endpoint.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/docs_endpoint.go)

And the frontend already consumes:

- `/api/os/docs`
- `/api/apps/{id}/docs`

through:

- [appsApi.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/api/appsApi.ts)

### Reflection

Modules can also implement:

- [ReflectiveAppBackendModule](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-backend/pkg/backendhost/module.go)

Examples:

- [inventory reflection](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendmodule/reflection.go)
- [sqlite reflection](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/sqlite/module.go)

So APP-05 does not need a new documentation system. It needs a deterministic way to collect and package the already-existing docs and reflection for one selected app.

## 4. Apps Browser is the right entry point, but not the right chat host

Apps Browser already has app-row context menus:

- [ModuleBrowserWindow.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx)

and command routing in:

- [module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx)

So it is the correct UX entry point for `Chat With App`.

However, the local apps-browser store is currently:

- [apps-browser store](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/app/store.ts)

and it does **not** include:

- `timeline`
- `chatSession`
- `chatWindow`
- `chatProfiles`

By contrast, the launcher host store already includes those slices:

- [launcher store](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/store.ts)

That means APP-05 should:

- trigger the action from apps-browser
- but open the actual chat window in a launcher-level chat-capable host

Do **not** start by making apps-browser itself chat-capable unless there is another product reason to do that.

## Design Decision

The revised design is:

```text
apps-browser context action
  -> launcher command handler
  -> POST /api/apps/assistant/api/bootstrap/app-chat
  -> assistant module resolves selected app docs/reflection from module registry
  -> assistant module allocates conv_id and stores context by conv_id
  -> launcher opens assistant chat window
  -> ChatConversationWindow talks to /api/apps/assistant
  -> runtime composer loads context by conv_id and adds it to system prompt
```

This keeps each responsibility in the correct layer:

- `go-go-os-chat`
  - generic transport/runtime/composer plumbing
- `wesen-os assistant module`
  - app registry access
  - docs/reflection assembly
  - bootstrap HTTP API
- frontend launcher
  - window creation and command routing
- apps-browser
  - user entry point

## Proposed Backend Architecture

## A. Add a conversation-context hook to go-go-os-chat

This is the only new generic extraction I would add to the shared chat package.

### Proposed interface

```go
type ConversationContext struct {
    SystemPromptAddendum string
    Metadata             map[string]any
}

type ConversationContextProvider interface {
    Lookup(ctx context.Context, convID string) (*ConversationContext, error)
}
```

### Where it should be used

Extend:

- [profilechat/runtime_composer.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/runtime_composer.go)

so `Compose(...)` can do:

```go
basePrompt := resolvedSystemPrompt(...)
ctxPrompt := ""
if provider != nil && req.ConvID != "" {
    seed, _ := provider.Lookup(ctx, req.ConvID)
    if seed != nil {
        ctxPrompt = strings.TrimSpace(seed.SystemPromptAddendum)
    }
}
finalPrompt := joinNonEmpty(basePrompt, ctxPrompt)
```

Why this belongs in `go-go-os-chat`:

- it is still generic conversation-runtime behavior
- it does not require awareness of apps, docs, or reflection
- other future bootstrap flows could reuse it

Why nothing more should move there:

- module registry access is specific to `wesen-os`
- docstore/reflection resolution is specific to the OS backend model

## B. Implement app-chat bootstrap in the assistant module

The assistant module should gain a bootstrap route, for example:

```text
POST /api/apps/assistant/api/bootstrap/app-chat
```

### Proposed request

```json
{
  "app_id": "sqlite"
}
```

Keep v1 intentionally small. Do not add source flags or doc-slug selection yet unless a real use case appears.

### Proposed response

```json
{
  "conv_id": "uuid",
  "assistant_app_id": "assistant",
  "base_prefix": "/api/apps/assistant",
  "subject_app": {
    "app_id": "sqlite",
    "name": "SQLite",
    "description": "SQLite query backend ..."
  },
  "attached_context": {
    "manifest": true,
    "reflection": true,
    "docs_count": 1
  }
}
```

The frontend needs:

- `conv_id`
- the assistant base prefix
- enough metadata to title the window

Everything else is mostly for debugging and future UX.

## C. Use an in-process app-context resolver, not internal HTTP calls

The assistant module already lives in the same process as the module registry. So the bootstrap implementation should inspect the registry directly, not call:

- `/api/os/apps`
- `/api/os/docs`
- `/api/os/apps/{id}/reflection`

from inside the backend.

### Why direct registry access is better

- simpler error handling
- no self-HTTP
- no duplicated serialization/deserialization
- easier access to full `DocStore` content instead of only public summaries

### Proposed resolver shape

```go
type AppContextResolver interface {
    Resolve(ctx context.Context, appID string) (*AppChatContextPack, error)
}

type AppChatContextPack struct {
    AppID       string
    AppName     string
    Description string
    Capabilities []string
    Reflection  *backendhost.ModuleReflectionDocument
    Docs        []docmw.ModuleDoc
    PromptText  string
}
```

### Suggested implementation location

Keep this in `wesen-os`, not `go-go-os-chat`, because it depends on:

- [backendhost module contracts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-backend/pkg/backendhost/module.go)
- [docmw.DocStore](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/docs_endpoint.go)
- runtime module registry wiring in `wesen-os`

## D. Persist bootstrap state by conv_id

The bootstrap endpoint should allocate a `conv_id` up front and store the associated context pack keyed by that conversation id.

### Minimal store

```go
type BootstrapStore interface {
    Put(ctx context.Context, convID string, pack *AppChatContextPack) error
    Get(ctx context.Context, convID string) (*AppChatContextPack, bool, error)
}
```

For v1, in-memory storage is acceptable if:

- it matches the lifecycle of the assistant backend
- we accept that restarting the server invalidates pre-bootstrapped conversations

Do not delay APP-05 on persistence. If persistent bootstrap state is needed later, the interface already leaves room for a durable implementation.

## E. Build a deterministic prompt context pack

The context given to the assistant should be deterministic, compact, and explainable.

### Recommended ordering

1. Manifest summary
2. Reflection summary
3. Selected docs content/excerpts

### Recommended prompt structure

```text
You are helping the user understand one OS app.

Subject app:
- id: sqlite
- name: SQLite
- description: SQLite query backend ...
- capabilities: query, history, saved-queries

Reflection:
- APIs:
  - POST /api/apps/sqlite/query — Execute SQL query
  - GET /api/apps/sqlite/history — List query history
...

Documentation excerpts:
Doc: SQLite App Runbook
Summary: ...
Content excerpt:
...

When answering:
- treat this app as the subject of the conversation
- answer from the attached docs/reflection first
- do not invent APIs not present in the attached context
```

### Do not dump everything

For v1, use a budgeted pack:

- manifest always
- full reflection summary, but cap APIs and schemas
- first 1-3 docs by priority/order
- excerpt or full content up to a fixed size budget

The point is not to create a perfect retrieval system. The point is to produce a reliable initial contextual chat.

## Proposed Frontend Architecture

## A. Add a new apps-browser command

Apps Browser should add:

```text
apps-browser.chat-with-app
```

to the module-row context menu in:

- [ModuleBrowserWindow.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx)

Suggested placement:

- after `View Documentation`
- before health/debug actions

This command should carry:

```json
{
  "appId": "sqlite",
  "appName": "SQLite"
}
```

## B. Open a launcher-level assistant chat window

Do not render this chat inside the apps-browser local Redux host.

Instead, add a small launcher module or launcher-local window adapter that renders:

- [ChatConversationWindow](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx)

against:

- `basePrefix="/api/apps/assistant"`

Because the launcher store already contains the chat slices, this is the lowest-friction host.

### Window payload sketch

```ts
{
  id: `window:assistant:app-chat:${convId}`,
  title: `Chat With ${appName}`,
  content: {
    kind: 'app',
    appKey: `assistant-chat:${subjectAppId}:${convId}`,
  },
  dedupeKey: `assistant-chat:${subjectAppId}:${convId}`,
}
```

## C. Bootstrap before opening the window

The launcher command handler should:

1. call bootstrap endpoint
2. receive `conv_id`
3. open assistant chat window with that `conv_id`

### Pseudocode

```ts
async function chatWithApp(appId: string, appName?: string) {
  const res = await fetch('/api/apps/assistant/api/bootstrap/app-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app_id: appId }),
  });

  const payload = await res.json();
  openWindow(buildAssistantChatWindowPayload({
    convId: payload.conv_id,
    subjectAppId: appId,
    appName: payload.subject_app?.name ?? appName ?? appId,
  }));
}
```

This avoids the client having to assemble or transmit the docs/reflection payload itself.

## Design Decisions

## Decision 1: Keep APP-05 mostly in wesen-os

Reason:

- the feature depends on the OS module registry
- docstores and reflection already exist there
- the assistant module is already mounted there

Only the small conversation-context hook belongs in `go-go-os-chat`.

## Decision 2: Use docs + reflection, not tools, in v1

Reason:

- “chat with app” is currently about understanding the app from docs/context
- arbitrary tool execution across all apps is not normalized
- reflection and docs are already generic and available

Do not delay APP-05 by trying to attach app-specific tools dynamically in v1.

## Decision 3: Use launcher host store, not apps-browser store

Reason:

- apps-browser store is not chat-capable today
- launcher store already is
- APP-05 should ship the feature, not reopen APP-06/host-store architecture work

## Decision 4: Resolve context in-process, not over HTTP

Reason:

- simpler
- less fragile
- richer access to doc content

## Alternatives Considered

## Alternative A: Make apps-browser itself chat-capable

Rejected for the first slice.

This would require:

- adding chat reducers/slices
- likely adding more runtime middleware/state
- making the apps-browser package a second chat host

That is a valid future direction, but it is not the fastest way to land Chat With App now.

## Alternative B: Put all app-chat bootstrap logic into go-go-os-chat

Rejected.

That would overfit the shared chat package to the `wesen-os` module registry and doc system. The package should remain generic chat infrastructure, not OS module introspection infrastructure.

## Alternative C: Seed the first prompt on the client

Rejected.

That would:

- expose large docs payloads to the client
- make prompt assembly less deterministic
- complicate persistence and reuse across later turns

Server-side bootstrap is cleaner.

## Recommended Implementation Sequence

## Phase 1: Backend bootstrap contract

1. Add an app-chat bootstrap handler to [assistant module](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go).
2. Add an in-memory bootstrap store keyed by `conv_id`.
3. Add an app-context resolver in `wesen-os` that reads:
   - module manifest
   - `DocStore()`
   - `Reflection()`
4. Return `conv_id` plus subject-app metadata.

## Phase 2: Shared composer hook

1. Add a `ConversationContextProvider` hook to [runtime_composer.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/runtime_composer.go).
2. Merge `SystemPromptAddendum` into the composed assistant prompt by `conv_id`.
3. Keep inventory path unchanged by passing `nil`.

## Phase 3: Frontend launcher host

1. Add a launcher-level assistant chat window module in `wesen-os` frontend composition.
2. Render `ChatConversationWindow` with:
   - `convId`
   - `basePrefix="/api/apps/assistant"`
   - title/header metadata derived from bootstrap response

## Phase 4: Apps-browser entry point

1. Add `Chat With App` to the module-row context menu.
2. Add a command handler that calls bootstrap and opens the assistant chat window.
3. Optionally add a toolbar button in module detail view later, but context menu is the required product path.

## Phase 5: Validation

1. Start `wesen-os`.
2. Open Apps Browser.
3. Right-click `sqlite`.
4. Choose `Chat With App`.
5. Confirm:
   - assistant window opens
   - `conv_id` is preallocated
   - first questions about the app are answered from docs/reflection context
6. Repeat for:
   - app with docs only
   - app with reflection only
   - app with both

## Testing Strategy

## Backend

- bootstrap handler unit test
  - app found
  - app not found
  - docs absent
  - reflection absent
- runtime composer unit test
  - provider nil
  - provider returns context
  - composed system prompt includes addendum

## Frontend

- apps-browser command test
  - context action exists
  - command issues bootstrap request
  - response opens assistant chat window payload
- assistant window render test
  - `ChatConversationWindow` receives returned `conv_id`
  - base prefix points at `/api/apps/assistant`

## Integration

- launcher integration test using stub assistant bootstrap endpoint
- live manual test across at least two subject apps

## Risks

## Risk 1: Context pack becomes too large

Mitigation:

- enforce deterministic limits on docs/APIs/schema lists
- prefer summaries and excerpts over whole repositories of text

## Risk 2: Some modules have docs but no reflection, or reflection but no docs

Mitigation:

- support partial context packs
- bootstrap should succeed as long as at least manifest data exists

## Risk 3: Assistant answers drift away from attached docs

Mitigation:

- make the prompt explicit that attached context is authoritative
- later add a debug window or response annotation if needed

## Risk 4: Frontend host split remains confusing

Mitigation:

- make the assistant chat window a launcher-level module with a clear title and app key
- do not pretend apps-browser itself owns the chat runtime

## What To Do Next

The immediate next implementation slice should be:

1. add bootstrap route to assistant module
2. add in-memory bootstrap store + context resolver in `wesen-os`
3. add `ConversationContextProvider` hook to `go-go-os-chat`
4. add launcher-level assistant chat window
5. add apps-browser `Chat With App` command

That sequence lands the feature with the smallest amount of new platform churn and the clearest layering.

## Bottom Line

APP-05 should now be treated as a real feature build, not a speculative follow-up.

The platform is already in place.

What remains is to:

- bootstrap conversations by app id
- resolve docs/reflection in-process
- persist context by `conv_id`
- open a dedicated assistant chat window from apps-browser

If we keep the shared chat package focused on generic runtime concerns and keep app discovery/bootstrap in `wesen-os`, the design stays clean and the implementation path is straightforward.
