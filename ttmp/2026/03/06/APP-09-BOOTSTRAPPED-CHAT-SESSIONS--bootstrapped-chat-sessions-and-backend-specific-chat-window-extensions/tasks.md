# Tasks

## Design and Investigation

- [x] Create APP-09 ticket to supersede APP-08
- [x] Re-read APP-05 and APP-08 in light of the live assistant app-chat behavior
- [x] Audit the current shared chat shell, startup path, and profile-selection state flow
- [x] Write a replacement intern-facing design that covers startup, shell/wrapper separation, and extension seams
- [x] Record an investigation diary explaining why APP-08 is too narrow

## Phase 1: Shared Chat Shell Cleanup

- [x] Define the new shared chat policy model for already-started chats (`none`, `fixed`, `selectable`)
- [x] Keep `ChatConversationWindow` for now, but slim it down into a more shell-like component
- [x] Remove built-in profile selector UI from the base chat shell
- [x] Remove built-in registry handling from the active frontend transport and state model
- [x] Move starter suggestions from implicit global defaults to explicit wrapper/session config

## Phase 2: Bootstrapped Chat Startup

- [x] Define the first normalized startup-policy shape used by the shared chat runtime (`none`, `fixed`, `selectable`)
- [x] Make explicit `profile` the canonical frontend/backend runtime selector input
- [x] Remove the legacy current-profile cookie route from the active assistant and inventory chat flows
- [ ] Introduce a generic bootstrapped chat wrapper or launcher helper in `chat-runtime`
- [ ] Make assistant app-chat use the new generic bootstrapped wrapper instead of directly instantiating the generic shell
- [ ] Decide whether inventory also gets an explicit bootstrap route or remains wrapper-only initially

## Phase 3: Chat Policy Separation

- [x] Formalize `fixed` vs `selectable-profile` startup policy
- [x] Ensure fixed/no-profile chats never silently inherit shared global profile state
- [x] Ensure selectable-profile chats keep scoped profile behavior
- [x] Remove registry from frontend transport and state
- [x] Remove legacy ambient profile resolution (`runtime_key` request alias and `chat_profile` cookie fallback) from the shared resolver

## Phase 4: Backend-Specific Extensions

- [x] Reuse `headerActions` as the current extension seam for backend-specific controls
- [x] Move inventory profile selector and debug buttons fully into an inventory wrapper/header extension
- [ ] Add a more explicit typed extension model for header widgets, badges, timeline renderers, and conversation actions
- [ ] Add assistant-specific badges or context indicators through the same extension seam

## Phase 5: Validation

- [x] Add regression tests showing assistant app-chat does not inherit inventory profile state
- [x] Add tests for fixed chats that send no profile by default
- [x] Add tests for inventory selectable-profile chat behavior
- [x] Add tests for explicit starter suggestions and shell behavior
- [x] Validate assistant app-chat live against a stale `chat_profile=inventory` cookie and confirm the assistant backend still resolves the assistant runtime
- [ ] Validate the final model manually with inventory chat and Chat With App running side by side in the browser at the same time
