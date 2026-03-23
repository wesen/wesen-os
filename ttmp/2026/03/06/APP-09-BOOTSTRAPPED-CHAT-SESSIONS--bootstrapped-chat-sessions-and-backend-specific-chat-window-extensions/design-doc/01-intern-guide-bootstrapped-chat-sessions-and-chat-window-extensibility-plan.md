---
Title: Intern Guide - Bootstrapped Chat Sessions and Chat Window Extensibility Plan
Ticket: APP-09-BOOTSTRAPPED-CHAT-SESSIONS
Status: active
Topics:
    - architecture
    - backend
    - chat
    - wesen-os
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx
      Note: Current base chat component that should become a slimmer reusable shell
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.ts
      Note: Current runtime hook that leaks profile selection across unrelated chat windows
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts
      Note: Current POST /chat transport still sends profile and registry directly
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts
      Note: Current WS transport still sends profile and registry query parameters directly
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/state/profileSlice.ts
      Note: Current profile state model still has global and scoped registry-aware selection
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx
      Note: APP-05 assistant module demonstrates the first bootstrapped chat startup path
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go
      Note: Backend bootstrap endpoint pattern already exists here
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Inventory wrapper demonstrates backend-specific header actions and timeline renderer injection
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/runtime_composer.go
      Note: Shared runtime composer already supports conv_id-scoped context and should remain generic
ExternalSources: []
Summary: Supersede APP-08 with a fuller redesign that makes bootstrapped chat session startup the primary modular seam, keeps the transcript/timeline/send shell reusable, moves backend-specific controls into wrappers/extensions, removes unused registry from the active frontend contract, and cleanly separates fixed-runtime chats from selectable-profile chats.
LastUpdated: 2026-03-06T14:35:00-05:00
WhatFor: Use when redesigning the shared chat frontend/backend contract after APP-05, or when onboarding an engineer to how chat startup, profile policy, and backend-specific UI extensions should evolve together.
WhenToUse: Use before implementing any new chat type, before changing profile-selection behavior, before adding custom chat header widgets, or before turning APP-05 and inventory chat into a cleaner shared model.
---

# Intern Guide - Bootstrapped Chat Sessions and Chat Window Extensibility Plan

## Executive Summary

This ticket replaces APP-08 with a broader and more accurate target architecture.

APP-08 was focused on aligning the naming mismatch between frontend `profile` / `registry` and backend `runtime_key` / `registry_slug`. That problem is real, but APP-05 exposed a larger issue:

- not every chat starts the same way
- not every chat wants user-selectable profiles
- not every chat wants the same header controls
- the current `ChatConversationWindow` is carrying too much policy

The APP-05 `Chat With App` feature is the first strong proof point. It already starts with a backend-specific bootstrap endpoint, already allocates a `conv_id`, and already injects selected-app context into the assistant runtime. But the frontend still routes that session through a shared chat component that assumes starter suggestions and shared profile state. That is why the new assistant chat leaked the `inventory` profile and inventory-ish startup behavior.

The new design is:

1. treat conversation startup as an explicit backend-specific bootstrap step
2. make the common chat component a reusable shell that only owns transcript/timeline/send behavior
3. move profile selection out of the base shell and into backend-specific wrappers or extensions
4. support multiple startup payload shapes by normalizing them through backend-specific bootstrap functions
5. remove `registry` from the active frontend contract for now
6. distinguish two chat policies clearly:
   - fixed-runtime chat
   - selectable-profile chat

This design keeps the shared pieces reusable while making backend-specific chat behavior easier to reason about and harder to leak across windows.

## Problem Statement

The system now has multiple chat entry points with different startup semantics:

- inventory chat starts as an inventory-specific experience with profiles, event/timeline tools, and custom renderers
- assistant Chat With App starts as a generic assistant conversation, but with selected app docs/reflection pre-attached
- future chats may want:
  - enabled tool lists
  - fixed startup strings
  - capability toggles
  - subject-specific badges
  - backend-specific header widgets

The current shared chat frontend model does not express that difference well.

### Current mismatch

The base shared component in [ChatConversationWindow.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx) currently does all of these:

- owns transcript/timeline/send UI
- injects default starter suggestions
- knows how to fetch profiles
- knows how to render the profile selector
- reads shared current-profile state
- writes selected profile back through the runtime API

That means the shared component is not just a shell. It is also carrying one specific startup/selection policy.

### Why APP-05 made this visible

`Chat With App` in [assistantModule.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx) already performs a backend bootstrap step:

```text
apps-browser row action
  -> POST /api/apps/assistant/api/bootstrap/app-chat
  -> assistant backend creates conv_id + attached app context
  -> launcher opens chat window with that conv_id
```

That is already the right startup shape.

But once the resulting window renders the generic chat component, the window can still inherit unrelated frontend selection state through [useConversation.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.ts). So a backend-specific startup that was correct at bootstrap time can still be polluted by frontend runtime state later.

### Root causes

There are four root causes.

#### 1. Startup metadata is not first-class

Today startup metadata is partly:

- encoded into `conv_id`
- encoded into window instance payloads
- encoded into ad hoc bootstrap endpoints
- encoded into shared frontend state

There is no one clear “start a chat session with this backend-specific metadata” contract.

#### 2. Profile selection is treated as universal

The current base component assumes profile selection is a built-in shared chat feature. It is not. It is one optional backend-specific policy.

#### 3. Shared state can leak across chat types

The runtime hook currently falls back to global selected profile state if a scope-specific profile is not found. That is acceptable for one chat product, but not once multiple independent chat styles coexist.

#### 4. Backend-specific header widgets are possible but not formalized

Inventory already injects custom header actions in [renderInventoryApp.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx), but the base component still exposes built-in profile controls instead of treating the whole header as an extension surface.

## Current State Architecture

### 1. Shared transport is already modular enough

The shared runtime already gives each chat a backend namespace through `basePrefix`.

Examples:

- inventory uses `/api/apps/inventory`
- assistant uses `/api/apps/assistant`

The transport under that prefix is shared:

- `POST /chat`
- `GET /ws`
- `GET /api/timeline`

That is already the correct level of transport reuse.

### 2. Startup is only partially modular today

Inventory still effectively starts by “open a chat window with a conv id and use the backend defaults.”

Assistant app-chat now starts through a dedicated bootstrap route in [module.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go):

```text
POST /api/bootstrap/app-chat
```

This route:

- validates `app_id`
- resolves the selected app from the module registry
- attaches docs and reflection
- creates a conversation-scoped context record
- returns a new `conv_id`

That means the first backend-specific bootstrapped chat path already exists.

### 3. The shared frontend runtime still has one profile-centric policy

Current runtime flow:

```text
ChatConversationWindow
  -> useConversation(convId, basePrefix, profileScopeKey)
  -> selectCurrentProfileSelection(state, scopeKey)
  -> conversationManager.connect/send(profileSelection)
  -> http.ts and wsManager.ts transmit profile/registry
```

That is visible in:

- [ChatConversationWindow.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx)
- [useConversation.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.ts)
- [http.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts)
- [wsManager.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts)

This means the selection model is still frontend-state-driven, not startup-contract-driven.

### 4. Inventory is already a wrapper, which is a good sign

Inventory does not directly fork the chat window. Instead it wraps it and injects:

- a profile selector
- event viewer button
- timeline debug button
- timeline renderers
- context actions

That is exactly the right direction. The problem is that one profile control still lives inside the shared base component rather than entirely in the wrapper layer.

## Proposed Solution

### High-level model

The long-term frontend architecture should be:

```text
Backend-specific wrapper / session launcher
  -> backend-specific bootstrap(init payload)
  -> returns normalized session config
  -> renders reusable ChatWindowShell
       + backend-specific header extension
       + backend-specific timeline renderers
       + backend-specific conversation actions
```

And the backend architecture should be:

```text
backend namespace
  -> optional bootstrap/init endpoint(s)
  -> returns conv_id and normalized session metadata
  -> normal /chat and /ws thereafter operate primarily by conv_id
```

### A. Replace “implicit startup” with explicit bootstrap

Introduce a first-class startup concept.

#### Canonical idea

The chat shell should not understand `profile`, `app_id`, `enabled_tools`, or arbitrary startup strings directly.

Instead, a wrapper or session launcher should call a backend-specific bootstrap function.

Example interface:

```ts
type ChatSessionStartResult = {
  convId: string;
  basePrefix: string;
  title?: string;
  placeholder?: string;
  startupPolicy?: {
    kind: 'fixed' | 'selectable-profile';
    fixedProfile?: string;
  };
  badges?: Array<{ label: string; tone?: 'neutral' | 'info' }>;
};
```

```ts
type ChatSessionBootstrap<TInput> = (input: TInput) => Promise<ChatSessionStartResult>;
```

Examples:

- assistant app-chat bootstrap input:
  - `{ appId: "sqlite" }`
- inventory bootstrap input:
  - `{ profile: "inventory" }`
- future tools chat input:
  - `{ enabledTools: ["search", "query"] }`
- future string-mode chat:
  - `{ mode: "review" }`

The shell receives only the normalized result.

### B. Split the base chat window into shell and policy wrapper

Current `ChatConversationWindow` should be refactored conceptually into two layers.

#### Layer 1: `ChatWindowShell`

Responsibilities:

- transcript rendering
- timeline rendering
- send box
- connection status
- stats footer
- generic context-menu plumbing
- generic header layout

This component should not own:

- profile fetching
- profile persistence
- profile selector UI
- backend-specific startup payloads
- assumptions about starter suggestions

#### Layer 2: backend-specific wrapper

Examples:

- `InventoryChatWindow`
- `AssistantChatWindow`
- future `ToolBoundChatWindow`

Responsibilities:

- choose bootstrap/init function
- choose startup policy
- inject header controls
- inject timeline renderers
- inject conversation context actions
- decide whether starter suggestions exist and what they are

### C. Replace “profile as universal feature” with startup policy

The shared model should explicitly distinguish:

- `fixed` chat
- `selectable-profile` chat

#### Fixed chat

Examples:

- APP-05 assistant Chat With App
- future no-frills assistant window

Behavior:

- no profile selector
- no fallback to global selected profile
- either no profile is sent at all, or a fixed backend-defined profile is pinned

#### Selectable-profile chat

Examples:

- inventory chat

Behavior:

- profile selector is visible
- selections are scoped to the chat instance or chat type
- profile changes are explicitly intentional and local

This policy should live in wrapper/session config, not in the base shell.

### D. Remove `registry` from the active frontend contract

The current frontend transport and state still carry `registry`, but the live product is effectively single-registry.

Recommendation:

- remove `registry` from the active frontend and chat-window model
- keep backend compatibility for now
- continue defaulting internally in the backend if legacy support is needed

Do not expose registry in the base frontend APIs until there is a real multi-registry product need.

### E. Formalize backend-specific header extensions

The header extension seam is already present via `headerActions`. Make it more explicit and intentional.

Proposed model:

```ts
type ChatWindowExtension = {
  renderHeaderStart?: (ctx: ChatWindowExtensionContext) => ReactNode;
  renderHeaderEnd?: (ctx: ChatWindowExtensionContext) => ReactNode;
  timelineRenderers?: Partial<ChatWidgetRenderers>;
  conversationContextActions?: DesktopActionEntry[];
  starterSuggestions?: string[];
};
```

Inventory would provide:

- profile selector
- event viewer button
- timeline debug button
- hypercard card renderer

Assistant app-chat would provide:

- subject-app badge
- maybe attached-context badge
- no selector
- maybe no starter suggestions, or a specific list relevant to app-doc chats

## Detailed API Direction

### Frontend bootstrap layer

Add a small frontend bootstrap abstraction, separate from the transcript shell.

Pseudocode:

```ts
type BootstrappedChatWindowProps<TInput> = {
  input: TInput;
  bootstrap: (input: TInput) => Promise<ChatSessionStartResult>;
  renderExtension?: (session: ChatSessionStartResult) => ChatWindowExtension;
};

function BootstrappedChatWindow<TInput>(props: BootstrappedChatWindowProps<TInput>) {
  const [session, setSession] = useState<ChatSessionStartResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    props.bootstrap(props.input).then(setSession).catch((e) => setError(String(e)));
  }, [props]);

  if (error) return <ErrorPanel message={error} />;
  if (!session) return <LoadingPanel />;

  const extension = props.renderExtension?.(session);
  return <ChatWindowShell session={session} extension={extension} />;
}
```

### Backend bootstrap layer

Each backend can expose one or more init routes.

Examples:

- assistant:
  - `POST /api/apps/assistant/api/bootstrap/app-chat`
- inventory:
  - maybe future `POST /api/apps/inventory/api/bootstrap/chat`
- tool-focused backend:
  - maybe future `POST /api/apps/<id>/api/bootstrap/tool-chat`

These routes should do all startup-specific work and return a normalized payload.

Example response:

```json
{
  "conv_id": "uuid",
  "base_prefix": "/api/apps/assistant",
  "title": "Chat with SQLite",
  "startup_policy": {
    "kind": "fixed"
  },
  "badges": [
    { "label": "SQLite", "tone": "info" }
  ]
}
```

### Shared `/chat` and `/ws`

After bootstrap, the shared transport should stay simple.

Preferred long-term model:

- `POST /chat`:
  - always requires `conv_id`
  - may optionally include minimal runtime override fields only if the chat type allows them
- `GET /ws`:
  - always requires `conv_id`
  - should not depend on extra frontend registry state

For fixed chats, no profile/runtime selector fields should be sent at all after bootstrap.

For selectable-profile chats, send only:

- `profile`

No active frontend `registry`.

## Diagrams

### Desired conversation startup model

```text
UI action
  -> backend-specific bootstrap(input)
      -> validate input
      -> create conv_id
      -> attach startup metadata/context
      -> return normalized session config
  -> render reusable chat shell using session config
  -> send prompt via /chat using conv_id
  -> stream events via /ws using conv_id
```

### Fixed assistant app-chat

```text
Apps Browser row
  -> Chat With App
  -> assistant bootstrap(app_id)
  -> conv_id + app badge + fixed startup policy
  -> AssistantChatWindow wrapper
  -> ChatWindowShell
```

### Inventory profile chat

```text
Inventory icon/menu action
  -> inventory bootstrap(optional profile default)
  -> conv_id + selectable-profile policy
  -> InventoryChatWindow wrapper
     -> profile selector widget
     -> debug buttons
     -> hypercard renderer
  -> ChatWindowShell
```

## Design Decisions

### Decision 1: Supersede APP-08 instead of merely renaming fields

Rationale:

- the real problem is not only naming
- startup policy and profile leakage are equally important
- APP-05 created the first concrete bootstrapped chat type and exposed the larger boundary

### Decision 2: Keep transport shared, make startup backend-specific

Rationale:

- `/chat` and `/ws` are already good shared primitives
- startup metadata varies widely between chat types
- bootstrap endpoints are a more stable modular seam than teaching one base component about every startup shape

### Decision 3: Remove registry from the active frontend model

Rationale:

- there is no meaningful multi-registry product use today
- it adds complexity to the window and transport contracts
- backend compatibility can remain temporarily without polluting the frontend model

### Decision 4: Move profile selection out of the base chat shell

Rationale:

- profiles are not universal
- assistant app-chat should not inherit or expose them
- inventory still can, through a wrapper or extension

### Decision 5: Keep `conv_id` as the main post-bootstrap identity

Rationale:

- APP-05 already works this way
- shared runtime composer already supports `conv_id`-scoped context
- it minimizes transport complexity after startup

## Alternatives Considered

### Alternative A: Keep profile support built into `ChatConversationWindow`

Rejected because:

- it keeps one backend policy inside the shared component
- fixed chats remain awkward
- profile leakage bugs remain easy to introduce

### Alternative B: Encode all startup metadata directly in every `/chat` request

Rejected because:

- each chat type would keep inventing new payload fields
- websocket startup would still need parallel logic
- backend bootstrap validation and context construction become harder to centralize

### Alternative C: Fork separate chat windows for each backend

Rejected because:

- transcript/timeline/send behavior should stay shared
- code duplication would grow quickly
- renderers and shell behavior would drift

### Alternative D: Keep APP-08 limited to naming cleanup

Rejected because:

- it would leave the major startup and profile-policy issues untouched
- it would not fix the APP-05 profile leak class of bug
- it would under-scope the real redesign needed now

## Implementation Plan

### Phase 1: Define the new shared frontend contracts

Files to touch first:

- [ChatConversationWindow.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx)
- [useConversation.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.ts)
- [http.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts)
- [wsManager.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts)
- [profileSlice.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/state/profileSlice.ts)

Detailed tasks:

- define a slimmer session config type
- define `fixed` vs `selectable-profile` policy
- stop requiring registry in frontend types
- stop treating global profile fallback as the default behavior for all windows

Deliverable:

- a minimal common shell API
- a clear startup/session type used by wrappers

### Phase 2: Introduce a bootstrapped frontend wrapper

Files likely involved:

- `packages/chat-runtime/src/chat/components/...`
- `apps/os-launcher/src/app/assistantModule.tsx`
- inventory launcher wrapper files

Detailed tasks:

- add a bootstrapped wrapper component or session launcher helper
- make assistant app-chat use the new wrapper
- keep assistant runtime fixed
- remove assistant dependency on shared global profile state

Deliverable:

- APP-05 path keeps working, but through the new explicit startup abstraction

### Phase 3: Move inventory profile UI out of the base shell

Files likely involved:

- [renderInventoryApp.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx)
- `packages/chat-runtime/src/chat/components/...`

Detailed tasks:

- replace built-in selector props with wrapper-owned selector widget or extension
- keep inventory-specific buttons and renderers in the wrapper
- ensure profile changes stay local to inventory chat scope

Deliverable:

- inventory remains feature-rich
- shared shell becomes simpler

### Phase 4: Align backend and transport contracts

Files likely involved:

- backend resolver/transport files in shared chat packages
- assistant bootstrap responses
- any future inventory bootstrap routes

Detailed tasks:

- use `profile` only for selectable-profile chats
- drop active frontend registry handling
- keep compatibility aliases on backend if needed
- define canonical bootstrap response shape

Deliverable:

- one clean startup model
- simpler transport after bootstrap

### Phase 5: Tests and migration cleanup

Tests to add or revise:

- assistant app-chat must never inherit inventory profile state
- fixed chats must not send profile by default
- inventory selectable-profile chat must still transmit chosen profile
- header extension injection must work without forking the shell
- starter suggestions must be configurable per wrapper/session type

Validation paths:

- launcher Vitest coverage
- chat-runtime component tests
- live manual verification with assistant and inventory side by side

## Testing Strategy

### Unit tests

- profile selection helpers
- startup policy resolution
- bootstrap session normalization

### Component tests

- `ChatWindowShell` without profile selector
- inventory wrapper with injected controls
- assistant wrapper with fixed startup behavior

### Integration tests

- two chat windows open simultaneously:
  - inventory with `inventory` profile
  - assistant app-chat with no selector
- verify the assistant request does not send `inventory`
- verify each window retains its own header controls and suggestions

### Manual verification

1. Open inventory chat and switch to a non-default profile.
2. Open Chat With App for `sqlite`.
3. Verify:
   - no inventory profile leak
   - no selector in assistant chat
   - assistant chat title/badges match selected app
4. Open inventory chat again.
5. Verify profile selection still works locally there.

## Risks

- the existing shared component is widely used, so partial refactors can create temporary duplication
- bootstrap and fixed-policy support may require a careful migration path rather than one big rename
- moving profile UI out of the base shell could break inventory if wrapper tests are not added first
- there may be hidden consumers of registry fields in tests or debug tooling

## Open Questions

- should `ChatConversationWindow` be renamed to `ChatWindowShell`, or should the current name remain and only its API be narrowed?
- should starter suggestions be part of session config, part of extension config, or both?
- should fixed chats explicitly return a fixed profile from bootstrap, or should they send no profile field at all after startup?
- should inventory eventually get its own bootstrap route, or can wrapper-only startup remain sufficient there?

## References

- APP-05 implemented chat-with-app ticket
- APP-08 superseded profile/runtime alignment ticket
- [assistantModule.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx)
- [module.go](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go)
- [ChatConversationWindow.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx)
- [useConversation.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.ts)
- [http.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts)
- [wsManager.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.ts)
- [renderInventoryApp.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx)

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
