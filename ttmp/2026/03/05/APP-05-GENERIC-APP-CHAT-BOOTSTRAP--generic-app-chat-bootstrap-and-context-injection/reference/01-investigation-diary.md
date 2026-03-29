---
Title: Investigation diary
Ticket: APP-05-GENERIC-APP-CHAT-BOOTSTRAP
Status: active
Topics:
    - backend
    - chat
    - documentation
    - wesen-os
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../wesen-os/pkg/assistantbackendmodule/module.go
      Note: Diary evidence that the shared assistant backend already exists
    - Path: ../../../../../../../go-go-os-chat/pkg/chatservice/component.go
      Note: Diary evidence for the extracted shared chat transport component
    - Path: ../../../../../../../go-go-os-chat/pkg/profilechat/runtime_composer.go
      Note: Diary evidence for where conv_id-scoped context should be injected
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/docs_endpoint.go
      Note: Diary evidence that docs aggregation and in-process docstore access already exist
    - Path: ../../../../../../../wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx
      Note: Diary evidence for the current context-menu entry point
    - Path: ../../../../../../../wesen-os/apps/os-launcher/src/app/store.ts
      Note: Diary evidence that the launcher host store is already chat-capable
ExternalSources: []
Summary: Research diary for revising APP-05 after the shared OS chat backend extraction. Records the evidence used to decide that app-chat bootstrap should now be built as an assistant-module feature on top of the existing platform.
LastUpdated: 2026-03-06T14:40:00-05:00
WhatFor: Use to review how the revised APP-05 design was derived from the live codebase instead of the older pre-APP-04 assumptions.
WhenToUse: Use when checking the evidence behind the updated APP-05 implementation plan or when continuing the ticket later.
---

# Investigation diary

## Goal

Re-evaluate APP-05 now that APP-04-style shared chat extraction has already landed, and decide what the real Chat With App design should be from the current codebase.

## Key conclusion

APP-05 should now be implemented as an assistant-module feature in `wesen-os`, with only a small conversation-context hook added to `go-go-os-chat`.

The earlier framing of APP-05 as “blocked until the generic backend exists” is obsolete.

## Chronology

### 2026-03-06 18:40 ET

Read the existing APP-05 ticket:

- `index.md`
- `design-doc/01-scope-note-generic-app-chat-bootstrap-and-context-injection.md`
- `tasks.md`
- `changelog.md`

Observation:

- APP-05 still only contained a scope note
- it still assumed APP-04 was only a prerequisite
- it did not reflect the now-existing assistant backend module or `go-go-os-chat`

### 2026-03-06 18:42 ET

Inspected the extracted shared chat package:

- `go-go-os-chat/pkg/chatservice/component.go`
- `go-go-os-chat/pkg/profilechat/request_resolver.go`
- `go-go-os-chat/pkg/profilechat/runtime_composer.go`

Findings:

- `chatservice.Component` already mounts the shared chat HTTP surface
- `profilechat` already owns request resolution and runtime composition
- the remaining missing hook is conversation-scoped context lookup by `conv_id`

Conclusion:

- APP-05 does not need another round of large chat extraction
- it only needs one new generic hook in the composer/runtime path

### 2026-03-06 18:45 ET

Read the mounted assistant module and launcher wiring:

- `wesen-os/pkg/assistantbackendmodule/module.go`
- `wesen-os/cmd/wesen-os-launcher/main.go`

Findings:

- assistant is already mounted at `/api/apps/assistant`
- it already uses `go-go-os-chat`
- it already has a profile registry and request resolver

Conclusion:

- APP-05 should extend the assistant module
- a second assistant-style backend would be unnecessary duplication

### 2026-03-06 18:48 ET

Read the backend discovery contracts and docs endpoints:

- `go-go-os-backend/pkg/backendhost/module.go`
- `wesen-os/cmd/wesen-os-launcher/docs_endpoint.go`
- example reflection implementations in inventory/sqlite

Findings:

- modules can expose `DocStore()`
- modules can expose `Reflection()`
- launcher already aggregates docs for frontend consumption

Important design observation:

- the assistant backend can resolve this information in-process from the module registry
- it should not make HTTP requests to its own `/api/os/docs` or `/api/os/apps/{id}/reflection` endpoints

### 2026-03-06 18:52 ET

Read apps-browser frontend entrypoints:

- `apps/apps-browser/src/components/ModuleBrowserWindow.tsx`
- `apps/apps-browser/src/launcher/module.tsx`
- `apps/apps-browser/src/api/appsApi.ts`

Findings:

- apps-browser already has module-row context menus
- apps-browser already exposes documentation commands
- therefore `Chat With App` fits naturally as another command in the same surface

### 2026-03-06 18:55 ET

Checked frontend store boundaries:

- `apps/apps-browser/src/app/store.ts`
- `wesen-os/apps/os-launcher/src/app/store.ts`

Findings:

- apps-browser local store is not chat-capable
- launcher store already contains `timeline`, `chatSession`, `chatWindow`, and `chatProfiles`

Conclusion:

- apps-browser should trigger the action
- but the real assistant chat window should be a launcher-level host window

This was the main frontend design decision for the revised APP-05 plan.

### 2026-03-06 19:00 ET

Drafted the revised implementation direction:

1. Add bootstrap endpoint to assistant backend module.
2. Add in-memory bootstrap/context store by `conv_id`.
3. Add `ConversationContextProvider`-style hook in `go-go-os-chat` runtime composition.
4. Add launcher-level assistant chat window.
5. Add apps-browser `Chat With App` context action and command handler.

This sequence minimizes new platform churn and keeps OS-specific logic in `wesen-os`.

### 2026-03-06 13:50 ET

Started the actual APP-05 implementation from the revised design.

Implementation goal for this pass:

- make app-chat bootstrap real, not just documented
- keep the shared change in `go-go-os-chat` minimal
- keep app discovery and docs/reflection assembly inside `wesen-os`
- route the UX through apps-browser, but host the actual chat window in the launcher

### 2026-03-06 13:55 ET

Implemented the shared runtime-composer hook in:

- `go-go-os-chat/pkg/profilechat/runtime_composer.go`
- `go-go-os-chat/pkg/profilechat/runtime_composer_test.go`

What changed:

- introduced `ConversationContext`
- introduced `ConversationContextProvider`
- threaded the provider through `RuntimeComposerOptions`
- appended the looked-up `SystemPromptAddendum` to the resolved assistant system prompt
- included the context addendum in the runtime fingerprint for verification/debugging

Important design note:

- this was the only new shared-platform seam added for APP-05
- no module registry, docs, or reflection logic was moved into `go-go-os-chat`

Validation:

- `go test ./pkg/profilechat/... -count=1`

### 2026-03-06 14:00 ET

Implemented the OS-specific assistant bootstrap backend in:

- `wesen-os/pkg/assistantbackendmodule/context_store.go`
- `wesen-os/pkg/assistantbackendmodule/app_context.go`
- `wesen-os/pkg/assistantbackendmodule/module.go`
- `wesen-os/pkg/assistantbackendmodule/module_test.go`
- `wesen-os/cmd/wesen-os-launcher/main.go`

What changed:

- added `AppChatContextStore`, keyed by `conv_id`
- made the store implement `profilechat.ConversationContextProvider`
- added `ResolveAppChatContext(...)` to inspect the module registry in-process
- collected:
  - manifest metadata
  - `DocStore()` docs
  - `Reflection()`
- assembled a deterministic assistant prompt addendum
- added `POST /api/apps/assistant/api/bootstrap/app-chat`
- returned:
  - `conv_id`
  - `assistant_app_id`
  - `base_prefix`
  - selected subject-app metadata
  - context summary counts
- threaded the context store into the assistant runtime composer used by the launcher

Important design note:

- the assistant bootstrap resolver does not call `/api/os/docs` or other self-HTTP endpoints
- it resolves app data directly from the in-process module registry

Validation:

- `go test ./pkg/assistantbackendmodule ./cmd/wesen-os-launcher/... -count=1`

### 2026-03-06 14:10 ET

Implemented the launcher-hosted frontend entrypoint in:

- `wesen-os/apps/os-launcher/src/app/assistantModule.tsx`
- `wesen-os/apps/os-launcher/src/app/assistantModule.test.ts`
- `wesen-os/apps/os-launcher/src/app/modules.tsx`

What changed:

- added an `assistant` launcher module for generic assistant windows
- added a command contribution for `apps-browser.chat-with-app`
- on command:
  - call assistant bootstrap
  - receive `conv_id`
  - open a dedicated assistant chat window keyed to that conversation
- rendered `ChatConversationWindow` against `/api/apps/assistant`
- encoded subject-app metadata into the launched window payload so the title/header can remain contextual

Validation:

- `npm exec vitest -- apps/os-launcher/src/app/assistantModule.test.ts --run`

### 2026-03-06 14:15 ET

Added the apps-browser entrypoint in:

- `wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx`

What changed:

- added a module-row context action:
  - label: `Chat With App`
  - command id: `apps-browser.chat-with-app`
  - payload: app id and app name

Validation:

- `npm exec vitest -- workspace-links/go-go-os-frontend/apps/apps-browser/src/launcher/module.test.tsx --run`

### 2026-03-06 14:20 ET

Ran a production build check for the launcher frontend.

Command:

- `npm run build -w apps/os-launcher`

Result:

- build succeeded
- Vite emitted a large-chunk warning only
- no import-resolution or TypeScript build errors remained for APP-05 changes

### 2026-03-06 14:24 ET

Ran the live backend for real bootstrap verification.

Command:

- `go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8093`

Observed startup:

- assistant webchat mounted successfully
- `sqlite` component started
- launcher server started on `127.0.0.1:8093`

### 2026-03-06 14:26 ET

Verified the bootstrap endpoint against a reflection-heavy app.

Command:

```bash
curl -sS -X POST http://127.0.0.1:8093/api/apps/assistant/api/bootstrap/app-chat \
  -H 'Content-Type: application/json' \
  -d '{"app_id":"sqlite"}'
```

Result:

- returned a new `conv_id`
- `subject_app.app_id = sqlite`
- `attached_context.has_reflection = true`
- `attached_context.prompt_chars` was non-zero

This proved the assistant backend could resolve and store selected-app context for `sqlite`.

### 2026-03-06 14:27 ET

Verified the bootstrap endpoint against a docs-heavy app.

Command:

```bash
curl -sS -X POST http://127.0.0.1:8093/api/apps/assistant/api/bootstrap/app-chat \
  -H 'Content-Type: application/json' \
  -d '{"app_id":"inventory"}'
```

Result:

- returned a new `conv_id`
- `subject_app.app_id = inventory`
- `attached_context.docs_count = 4`
- `attached_context.has_reflection = true`
- prompt size was much larger than the sqlite case

This proved the bootstrap path attached authored docs as well as reflection.

### 2026-03-06 14:29 ET

Verified that the stored `conv_id` context is actually consumed by the assistant runtime, not merely stored.

Command:

```bash
curl -sS -X POST http://127.0.0.1:8093/api/apps/assistant/chat \
  -H 'Content-Type: application/json' \
  -d '{"conv_id":"5ba5d98f-2071-47f5-b64e-440e15031b26","prompt":"In one sentence, what app am I chatting about and what kind of capability does it expose?"}'
```

Result:

- request accepted and conversation started
- response payload included the runtime fingerprint
- the fingerprint contained:
  - the selected app id `sqlite`
  - the selected app description
  - the reflection block with capabilities and API summaries
  - the combined assistant system prompt including the selected app context

This was the key live proof that APP-05 is working as designed end to end.

### 2026-03-06 14:35 ET

Committed the implementation in separate repo slices.

Commits:

- `go-go-os-chat`: `d41d462` `feat: add conversation scoped chat context`
- `go-go-os-frontend`: `b937b36` `feat: add apps browser chat with app action`
- `wesen-os`: `16a952f` `feat: add assistant app chat bootstrap flow`

Why separate commits mattered:

- the shared runtime hook is reusable beyond `wesen-os`
- the apps-browser context action belongs to the shared frontend repo
- the assistant bootstrap resolver and launcher assistant window are OS-specific

### 2026-03-06 14:40 ET

Ticket follow-up work for this pass:

- update `tasks.md` so it reflects implementation, not just planned work
- record live verification commands/results
- update `changelog.md` and `index.md`
- upload the refreshed APP-05 bundle to reMarkable after the docs are refreshed
