# Changelog

## 2026-03-06

- Initial workspace created

## 2026-03-06

Created APP-09 to supersede APP-08 after APP-05 exposed a larger architectural issue than naming alone.

Main conclusions:

- bootstrapped chat startup is now the real modular seam
- the reusable chat window should become a slimmer shell
- profile selection should be one optional backend-specific policy, not a built-in assumption of every chat
- `registry` should be removed from the active frontend model for now

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx — Existing APP-05 assistant bootstrap path that motivates the redesign
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx — Current shared component that is carrying too much startup/profile policy
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/06/APP-09-BOOTSTRAPPED-CHAT-SESSIONS--bootstrapped-chat-sessions-and-backend-specific-chat-window-extensions/design-doc/01-intern-guide-bootstrapped-chat-sessions-and-chat-window-extensibility-plan.md — Main intern-facing design doc
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/06/APP-09-BOOTSTRAPPED-CHAT-SESSIONS--bootstrapped-chat-sessions-and-backend-specific-chat-window-extensions/reference/01-investigation-diary.md — Evidence diary behind the redesign

## 2026-03-06

Implemented the first APP-09 code slice across the shared chat frontend, inventory wrapper, and assistant wrapper.

Main results:

- introduced explicit chat profile policy in the shared runtime:
  - `none`
  - `fixed`
  - `selectable`
- removed built-in profile selector UI from the shared chat window
- removed active frontend registry handling from transport and profile state
- moved starter suggestions to explicit wrapper/session configuration
- added reusable `ChatProfileSelector` for wrapper-owned profile UI
- made assistant app-chat explicitly no-profile/no-frills
- made inventory explicitly selectable-profile with wrapper-owned selector and suggestions

Validation:

- focused Vitest pack: 31 passing tests across runtime, state, component, assistant, and inventory coverage
- `npm run build -w apps/os-launcher` passed

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatConversationWindow.tsx — Shared chat window slimmed down toward a shell
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/components/ChatProfileSelector.tsx — New wrapper-owned profile selector component
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.ts — Profile policy now controls how profile state is applied to runtime transport
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.tsx — Inventory now owns its profile selector and starter suggestions
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx — Assistant app-chat now opts into `none` policy and empty starter suggestions

## 2026-03-06

Completed the APP-09 clean profile-selection cutover across shared chat runtime, inventory, and assistant chat.

Main results:

- made explicit `profile` the only active frontend/runtime selector input
- removed the legacy current-profile cookie route from assistant and inventory backends
- removed `chat_profile` cookie fallback and `runtime_key` request alias from the shared Go resolver
- removed frontend hook usage of `/api/chat/profile`
- rewrote launcher/integration tests to drive profile selection through explicit `/chat` and `/ws` inputs
- verified assistant app-chat live with a stale `chat_profile=inventory` cookie and confirmed `/api/apps/assistant/chat` still resolves the assistant runtime

Commits:

- `go-go-os-chat` `56b1059` — `refactor: require explicit chat profile selection`
- `go-go-os-frontend` `70a79f3` — `refactor: drop current profile cookie api usage`
- `go-go-app-inventory` `196ae1e` — `refactor: remove inventory profile cookie fallback`
- `wesen-os` `7af454b` — `refactor: remove ambient chat profile state`

Validation:

- `go test ./pkg/profilechat/... -count=1`
- `go test ./pkg/pinoweb/... -count=1`
- `go test ./pkg/assistantbackendmodule ./cmd/wesen-os-launcher/... -count=1`
- `npm exec vitest -- workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.test.ts workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/http.test.ts workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.test.ts workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/ws/wsManager.test.ts workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useConversation.test.tsx apps/os-launcher/src/app/assistantModule.test.ts workspace-links/go-go-app-inventory/apps/inventory/src/launcher/renderInventoryApp.chat.test.tsx --run`
- `npm run build -w apps/os-launcher`
- live smoke:
  - `go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8093`
  - `POST /api/apps/assistant/api/bootstrap/app-chat` with `Cookie: chat_profile=inventory`
  - `POST /api/apps/assistant/chat` with the same stale cookie returned `200 OK`

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go — Shared resolver now accepts only explicit `profile` for active selection and ignores ambient cookies
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useProfiles.ts — Frontend profile refresh no longer reads current-profile cookie state
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/chat-runtime/src/chat/runtime/useSetProfile.ts — Frontend profile selection is now purely scoped local state
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go — Inventory backend no longer mounts the current-profile cookie route
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go — Assistant backend no longer mounts the current-profile cookie route
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main_integration_test.go — Integration coverage now drives explicit profile selection instead of cookies
