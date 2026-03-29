---
Title: Investigation diary
Ticket: APP-09-BOOTSTRAPPED-CHAT-SESSIONS
Status: active
Topics:
    - architecture
    - backend
    - chat
    - wesen-os
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx
      Note: Evidence that APP-05 already introduced a backend-specific bootstrap route and assistant chat wrapper
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx
      Note: Evidence that the current shared chat component still owns profile and starter-suggestion policy
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.ts
      Note: Evidence that current profile selection is always read from shared frontend state
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.ts
      Note: Evidence that current transport still sends profile and registry directly
    - Path: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx
      Note: Evidence that inventory already wraps the shared chat window with backend-specific controls
ExternalSources: []
Summary: Investigation diary for APP-09. Records why APP-08 is no longer enough after APP-05, what code evidence shows about current chat startup and profile leakage, and how that evidence leads to a bootstrapped-chat-session redesign.
LastUpdated: 2026-03-06T14:35:00-05:00
WhatFor: Use to review the evidence behind the APP-09 replacement design and to continue the implementation later without having to rediscover the boundary problems.
WhenToUse: Use when resuming APP-09 work, auditing current chat startup behavior, or explaining why profile/runtime naming cleanup alone is insufficient.
---

# Investigation diary

## Goal

Determine whether APP-08 is still the right scope after APP-05, and if not, define the broader ticket that should replace it.

## Context

The immediate trigger was a real APP-05 bug:

- Chat With App for assistant was opening correctly
- but the resulting assistant conversation inherited `inventory` profile state
- and the assistant window was still showing inventory-ish starter behavior

That showed the problem was not only transport naming. The problem is that startup policy and profile selection are still mixed into the shared chat component/runtime model.

## Quick Reference

### Key conclusion

APP-08 should be superseded by a broader ticket:

- bootstrapped chat sessions should be the primary startup seam
- the reusable chat window should become a shell, not a profile-aware policy owner
- profile selection should be one optional wrapper feature
- registry should be removed from the active frontend contract for now

### Evidence summary table

| Finding | Evidence | Why it matters |
| --- | --- | --- |
| Assistant app-chat already uses backend bootstrap | `wesen-os/apps/os-launcher/src/app/assistantModule.tsx`, `wesen-os/pkg/assistantbackendmodule/module.go` | Proves bootstrapped chat startup is already real and should become the main abstraction |
| Shared chat component still owns profile UI and starter suggestions | `packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx` | Shows the reusable component is carrying too much policy |
| Shared runtime hook always reads shared profile state | `packages/chat-runtime/src/chat/runtime/useConversation.ts` | Explains the APP-05 profile leak |
| HTTP transport still sends `profile` and `registry` directly | `packages/chat-runtime/src/chat/runtime/http.ts` | Confirms startup/runtime policy is still tied to generic transport |
| Inventory already acts like a wrapper around the shared chat component | `workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx` | Shows the wrapper model is already partially present and should be formalized |

### Quick architecture sketch

```text
current:
  ChatConversationWindow
    owns transcript + timeline + send box
    owns starter suggestions
    owns profile UI
    reads profile state
    sends profile/registry in transport

target:
  backend-specific bootstrap
    -> returns normalized session config
  backend-specific wrapper
    -> adds header widgets / profile selector / badges
  reusable chat shell
    -> transcript + timeline + send box only
```

## Chronology

### 2026-03-06 14:14 ET

Reviewed the just-landed APP-05 assistant app-chat implementation in:

- `wesen-os/apps/os-launcher/src/app/assistantModule.tsx`
- `wesen-os/pkg/assistantbackendmodule/module.go`

Observation:

- APP-05 already uses the correct backend startup pattern
- a dedicated bootstrap route returns `conv_id` before normal chat traffic begins

Conclusion:

- startup is already moving toward a bootstrapped model
- the next abstraction should build on that, not ignore it

### 2026-03-06 14:17 ET

Reviewed the current shared chat shell in:

- `packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx`

Findings:

- the component still injects `DEFAULT_CHAT_SUGGESTIONS`
- it conditionally renders a profile selector itself
- it fetches profiles and writes current profile state itself

Conclusion:

- the shared component is not only a shell
- it still owns policy that should vary by backend/chat type

### 2026-03-06 14:20 ET

Reviewed the runtime hook and transports in:

- `packages/chat-runtime/src/chat/runtime/useConversation.ts`
- `packages/chat-runtime/src/chat/runtime/http.ts`
- `packages/chat-runtime/src/chat/ws/wsManager.ts`

Findings:

- `useConversation` always reads current profile selection from shared frontend state
- send/connect then forward that selection into HTTP and WS transports
- the transport model still carries `registry`, even though the active product shape is effectively single-registry

Conclusion:

- this is a policy leak, not just a naming mismatch
- APP-08 is under-scoped if it only renames fields

### 2026-03-06 14:23 ET

Reviewed inventory chat wrapper behavior in:

- `workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx`

Findings:

- inventory already acts like a wrapper:
  - custom header actions
  - timeline renderers
  - scoped profile key
  - debug windows

Conclusion:

- the architecture is already trying to separate wrapper concerns from shell concerns
- the design should formalize that direction instead of keeping a half-wrapper / half-built-in profile model

### 2026-03-06 14:27 ET

Compared APP-08’s design language against what the code is actually doing.

Observation:

- APP-08 focuses on `profile` / `registry` / `runtime_key`
- but the pressing real boundary is:
  - startup contract
  - fixed vs selectable chats
  - shared shell vs wrapper extensions

Conclusion:

- create a new ticket that supersedes APP-08
- keep APP-08’s naming problem as one sub-part of the larger redesign

### 2026-03-06 14:33 ET

Started the first implementation slice for APP-09.

Implementation target for this slice:

- fix the APP-05 assistant-profile leak at the right architectural layer
- remove profile selector ownership from the base chat component
- remove active frontend registry handling
- make starter suggestions explicit per-wrapper instead of implicit and inventory-specific
- preserve inventory as the selectable-profile chat
- preserve assistant app-chat as a fixed/no-frills chat

### 2026-03-06 14:36 ET

Implemented the shared chat runtime/frontend policy changes in `go-go-os-frontend`.

Files changed:

- `packages/chat-runtime/src/chat/runtime/profileTypes.ts`
- `packages/chat-runtime/src/chat/state/profileSlice.ts`
- `packages/chat-runtime/src/chat/state/selectors.ts`
- `packages/chat-runtime/src/chat/runtime/useSetProfile.ts`
- `packages/chat-runtime/src/chat/runtime/useProfiles.ts`
- `packages/chat-runtime/src/chat/runtime/http.ts`
- `packages/chat-runtime/src/chat/ws/wsManager.ts`
- `packages/chat-runtime/src/chat/runtime/useConversation.ts`
- `packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx`
- `packages/chat-runtime/src/chat/components/ChatProfileSelector.tsx`
- `packages/chat-runtime/src/chat/index.ts`

What changed:

- introduced explicit chat profile policy:
  - `none`
  - `fixed`
  - `selectable`
- removed registry from the active frontend `ChatProfileSelection`
- removed registry from shared profile state and selectors
- made scoped profile lookup stop falling back to global selection
- removed built-in profile selector rendering from `ChatConversationWindow`
- made starter suggestions explicit via `starterSuggestions` prop
- added reusable `ChatProfileSelector` as a wrapper-owned widget

Important implementation note:

- this was the key architectural shift of the slice
- the shared chat component is now substantially more shell-like than before

### 2026-03-06 14:43 ET

Ported the two concrete wrappers.

Assistant:

- `wesen-os/apps/os-launcher/src/app/assistantModule.tsx`

Changes:

- assistant chat windows now pass:
  - `profilePolicy={{ kind: "none" }}`
  - `starterSuggestions={[]}`

Inventory:

- `wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx`

Changes:

- inventory now passes:
  - `profilePolicy={{ kind: "selectable", scopeKey: \`conv:${convId}\` }}`
  - explicit inventory starter suggestions
- inventory now renders `ChatProfileSelector` from the wrapper/header
- inventory command handlers stopped writing registry into profile state

Conclusion:

- assistant and inventory are now explicitly different chat policies
- the shared component no longer has to guess

### 2026-03-06 14:47 ET

Validated the first APP-09 slice with focused Vitest coverage and a production build:

- runtime and selector tests passed
- assistant wrapper tests passed
- inventory chat wrapper tests passed
- `npm run build -w apps/os-launcher` passed

That confirmed the shell/wrapper separation was structurally sound, but it did not yet prove the original APP-05 live bug was fixed end to end.

### 2026-03-06 15:18 ET

Returned to the live APP-05 bug after the first APP-09 slice because the browser still showed:

- `profile not found: inventory`
- on `POST /api/apps/assistant/chat`
- after assistant app-chat bootstrap had already succeeded

The user-provided network dump showed the key clue:

- the assistant `/chat` request body contained only `prompt` and `conv_id`
- but the browser still carried `Cookie: chat_profile=inventory`

That meant the frontend shell/policy cleanup was not the full fix. The assistant backend was still capable of inheriting ambient profile state from the cookie.

### 2026-03-06 15:21 ET

Reviewed the shared request resolver in `go-go-os-chat/pkg/profilechat/request_resolver.go`.

Findings:

- the resolver still accepted `runtime_key` as the explicit request selector
- the resolver still read `chat_profile` from cookies when request payload/query did not specify a runtime
- the frontend had already moved to sending `profile`, not `runtime_key`

Conclusion:

- the live system was in a mixed state:
  - frontend expected explicit `profile`
  - backend still prioritized old ambient/current-profile behavior
- the cleanest fix was a hard cutover, not more compatibility layers

### 2026-03-06 15:24 ET

Applied the clean cutover in `go-go-os-chat` and `go-go-os-frontend`.

Code changes:

- `go-go-os-chat/pkg/profilechat/request_resolver.go`
  - removed `runtime_key` request-body handling from the active contract
  - removed query `runtime_key` lookup
  - removed `chat_profile` cookie fallback
  - made explicit `profile` the canonical selector
- `go-go-os-chat/pkg/profilechat/request_resolver_test.go`
  - rewrote resolver tests to use `profile`
  - added a test proving stale `chat_profile` cookies are ignored
- `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.ts`
  - removed `getCurrentProfile(...)`
- `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useSetProfile.ts`
  - removed `setCurrentProfile(...)`
  - selection is now just scoped local Redux state
- `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`
  - removed current-profile helper functions entirely

Commits:

- `go-go-os-chat` `56b1059` — `refactor: require explicit chat profile selection`
- `go-go-os-frontend` `70a79f3` — `refactor: drop current profile cookie api usage`

Why this mattered:

- it removed the last active path by which assistant app-chat could accidentally inherit inventory state
- it also simplified the contract the intern-facing APP-09 design was already arguing for

### 2026-03-06 15:29 ET

Aligned inventory and launcher/backend wiring with the same hard cutover.

Code changes:

- `go-go-app-inventory/pkg/backendcomponent/component.go`
  - disabled `EnableCurrentProfileCookieRoute`
- `go-go-app-inventory/pkg/pinoweb/request_resolver_test.go`
  - updated tests to use explicit `profile`
- `wesen-os/pkg/assistantbackendmodule/module.go`
  - disabled `EnableCurrentProfileCookieRoute`
- `wesen-os/cmd/wesen-os-launcher/main.go`
  - kept the explicit resolver wiring without any ambient cookie fallback
- `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`
  - rewrote profile-selection integration tests to:
    - send `profile` in `/chat`
    - send `profile` in `/ws`
    - treat `/api/chat/profile` as legacy/off

Commits:

- `go-go-app-inventory` `196ae1e` — `refactor: remove inventory profile cookie fallback`
- `wesen-os` `7af454b` — `refactor: remove ambient chat profile state`

Important note:

- the top-level `wesen-os` worktree still contains one unrelated pre-existing dirty file in the `go-go-os-frontend` submodule:
  - `packages/rich-widgets/src/launcher/modules.tsx`
- that file was not part of this fix and was intentionally left untouched

### 2026-03-06 15:31 ET

Validated the cutover in three layers.

#### Go unit/integration

- `go test ./pkg/profilechat/... -count=1`
- `go test ./pkg/pinoweb/... -count=1`
- `go test ./pkg/assistantbackendmodule ./cmd/wesen-os-launcher/... -count=1`

Results:

- all passed

#### Frontend/runtime

- `npm exec vitest -- workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.test.ts workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.test.ts workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.test.ts workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.test.ts workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.test.tsx apps/os-launcher/src/app/assistantModule.test.ts workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.chat.test.tsx --run`
- `npm run build -w apps/os-launcher`

Results:

- focused runtime/assistant/inventory tests passed
- production build passed
- one broader launcher host Vitest suite still hit an unrelated module-resolution problem around `@hypercard/arc-agi-player/launcher`; that was not introduced by this change and was not used as the validation gate for this cutover

#### Live smoke test

Started a real launcher backend:

- `go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8093`

Then executed:

1. `POST /api/apps/assistant/api/bootstrap/app-chat`
   - with `Cookie: chat_profile=inventory`
   - body: `{"app_id":"sqlite"}`
2. `POST /api/apps/assistant/chat`
   - with the same stale cookie
   - body: `{"prompt":"test","conv_id":"<bootstrap conv id>"}`

Result:

- bootstrap returned `200 OK`
- assistant `/chat` returned `200 OK`
- runtime fingerprint in the response showed the assistant runtime plus the attached SQLite reflection/context
- the stale inventory cookie no longer influenced assistant chat

### 2026-03-06 15:34 ET

Conclusion after the cutover:

- APP-09’s direction is now materially confirmed by the live system
- explicit profile selection is simpler and more reliable than ambient cookie state
- the remaining APP-09 work is now higher-level abstraction work:
  - generic bootstrapped chat wrapper/helper
  - richer typed extension seams
  - optional assistant badges/context indicators

The urgent correctness bug from APP-05 is fixed.

Added and updated focused regression tests in `go-go-os-frontend`.

Key test coverage:

- `useConversation.test.tsx`
  - `none` policy does not inherit global `inventory`
  - `selectable` policy uses scoped profile state
- `ChatConversationWindow.test.tsx`
  - no implicit inventory starter suggestions
  - explicit starter suggestions still render when provided
- transport tests
  - no registry in HTTP request payload
  - no registry in WS URL

### 2026-03-06 14:49 ET

Ran focused validation commands.

Command:

```bash
npm exec vitest -- \
  workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.test.ts \
  workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.test.ts \
  workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/state/profileSlice.test.ts \
  workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/state/selectors.test.ts \
  workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.test.ts \
  workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.test.tsx \
  workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.test.tsx \
  apps/os-launcher/src/app/assistantModule.test.ts \
  workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.chat.test.tsx \
  --run
```

Result:

- 9 files passed
- 31 tests passed

### 2026-03-06 14:51 ET

Ran production build verification.

Command:

```bash
npm run build -w apps/os-launcher
```

Result:

- build succeeded
- only the pre-existing Vite/browser-compatibility warning for the externalized `module` package appeared
- no APP-09 compile or import regressions remained

### 2026-03-06 14:53 ET

Implementation status after this slice:

Done:

- fixed/no-profile vs selectable-profile chat policy split
- no more implicit inventory starter suggestions in the base shell
- no active frontend registry handling
- wrapper-owned inventory selector and assistant no-frills behavior

Still intentionally pending:

- generic bootstrapped chat wrapper/helper
- typed header/badge extension model beyond `headerActions`
- live manual side-by-side browser validation

## Usage Examples

### Use this diary when scoping the first implementation slice

Recommended first slice:

- define a session/bootstrap result type
- define fixed vs selectable startup policy
- stop relying on shared global profile fallback for assistant app-chat

### Use this diary when explaining the APP-05 regression

Short explanation:

- assistant bootstrap was correct
- the resulting chat session was still rendered through a generic component that reads shared profile state
- therefore unrelated inventory state leaked into the assistant chat
- the fix is architectural, not just a one-off patch

## Related

- [APP-05 implemented ticket](/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-05-GENERIC-APP-CHAT-BOOTSTRAP--generic-app-chat-bootstrap-and-context-injection/index.md)
- [APP-08 superseded ticket](/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/06/APP-08-PROFILE-RUNTIME-CONTRACT-ALIGNMENT--align-frontend-profile-selection-with-backend-runtime-contract/index.md)
- [APP-09 design doc](/home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/06/APP-09-BOOTSTRAPPED-CHAT-SESSIONS--bootstrapped-chat-sessions-and-backend-specific-chat-window-extensions/design-doc/01-intern-guide-bootstrapped-chat-sessions-and-chat-window-extensibility-plan.md)
