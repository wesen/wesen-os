# Tasks

## Research And Delivery

- [x] Create the APP-03 ticket workspace and core docs.
- [x] Map the current launcher, apps-browser, docs, chat-runtime, inventory, and openai-app-server architecture.
- [x] Write a detailed intern-facing analysis/design/implementation guide.
- [x] Write a chronological investigation diary.
- [x] Relate key source files with `docmgr doc relate`.
- [x] Run `docmgr doctor --ticket APP-03-CHAT-WITH-APP --stale-after 30`.
- [x] Upload the ticket bundle to reMarkable and verify the remote listing.

## Future Implementation Work

- [ ] Land or confirm the assistant backend dependency from APP-01.
- [ ] Add `apps-browser.chat-with-app` to app-row and app-icon context menus.
- [ ] Add an apps-browser chat window wrapper around `ChatConversationWindow`.
- [ ] Add an assistant-backend bootstrap endpoint that resolves and stores app docs context by `conv_id`.
- [ ] Add deterministic docs selection and truncation logic.
- [ ] Add frontend and backend tests for bootstrap, routing, and fallback behavior.
