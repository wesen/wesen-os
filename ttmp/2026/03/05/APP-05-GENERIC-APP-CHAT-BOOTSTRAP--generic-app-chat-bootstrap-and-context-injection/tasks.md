# Tasks

## Done

- [x] Create APP-05 ticket workspace and scope note
- [x] Re-evaluate APP-05 against the now-existing assistant backend and `go-go-os-chat` extraction
- [x] Write a new detailed design and implementation guide for generic Chat With App
- [x] Record an investigation diary with current-code evidence
- [x] Add a `ConversationContextProvider` hook to `go-go-os-chat/pkg/profilechat/runtime_composer.go`
- [x] Cover the new composer context path with a focused `go-go-os-chat` unit test
- [x] Add assistant bootstrap state storage keyed by `conv_id`
- [x] Add an app-context resolver in `wesen-os` that reads module manifest, `DocStore()`, and `Reflection()`
- [x] Add `POST /api/apps/assistant/api/bootstrap/app-chat`
- [x] Merge bootstrap context into the assistant system prompt during runtime composition
- [x] Add a launcher-level assistant chat window host that renders `ChatConversationWindow` against `/api/apps/assistant`
- [x] Add `apps-browser.chat-with-app` context action and command routing from module rows
- [x] Add focused tests for assistant bootstrap context resolution, storage, and launcher command wiring
- [x] Validate the bootstrap path live against a docs-heavy app (`inventory`) and a reflection-heavy app (`sqlite`)
- [x] Validate that a real `POST /api/apps/assistant/chat` request carries the injected app context in the runtime fingerprint
- [x] Commit the implementation as separate slices in `go-go-os-chat`, `go-go-os-frontend`, and `wesen-os`

## Implementation Breakdown

### Shared chat package

- [x] Introduce `ConversationContext` and `ConversationContextProvider` in the shared profile runtime composer
- [x] Append `SystemPromptAddendum` to the resolved assistant system prompt
- [x] Include the context addendum in the runtime fingerprint so runtime/debug output proves context injection happened

### Assistant backend module

- [x] Add an in-memory `AppChatContextStore`
- [x] Thread the context store into the assistant backend module and runtime composer
- [x] Resolve app manifest, docs, and reflection in-process from the module registry
- [x] Return a bootstrap payload that gives the frontend `conv_id`, `base_prefix`, and a subject-app summary

### Frontend launcher and apps-browser

- [x] Add a `Chat With App` context-menu action to app rows in apps-browser
- [x] Add a launcher-side command contribution that calls assistant bootstrap and opens a dedicated assistant chat window
- [x] Render the assistant app-chat window with `ChatConversationWindow` against `/api/apps/assistant`

### Verification

- [x] `go test ./pkg/profilechat/... -count=1` in `go-go-os-chat`
- [x] `go test ./pkg/assistantbackendmodule ./cmd/wesen-os-launcher/... -count=1` in `wesen-os`
- [x] `npm exec vitest -- apps/os-launcher/src/app/assistantModule.test.ts --run`
- [x] `npm exec vitest -- workspace-links/go-go-os-frontend/apps/apps-browser/src/launcher/module.test.tsx --run`
- [x] `npm run build -w apps/os-launcher`
- [x] `go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8093`
- [x] `curl -sS -X POST http://127.0.0.1:8093/api/apps/assistant/api/bootstrap/app-chat ...` for `inventory`
- [x] `curl -sS -X POST http://127.0.0.1:8093/api/apps/assistant/api/bootstrap/app-chat ...` for `sqlite`
- [x] `curl -sS -X POST http://127.0.0.1:8093/api/apps/assistant/chat ...` using a bootstrapped `conv_id`

## Later Follow-Ups

- [ ] Decide whether bootstrap state needs persistence beyond process lifetime
- [ ] Decide whether app-specific tool attachment belongs in a later version
- [ ] Consider a debug window or visible badge showing which docs/reflection sources were attached to the conversation
