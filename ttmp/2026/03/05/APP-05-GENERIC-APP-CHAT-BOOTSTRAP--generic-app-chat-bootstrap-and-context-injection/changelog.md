# Changelog

## 2026-03-05

- Initial workspace created


## 2026-03-05

Created APP-05 as the follow-on ticket for generic app-chat bootstrap and added a scope note that makes APP-04 the explicit platform prerequisite.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-05-GENERIC-APP-CHAT-BOOTSTRAP--generic-app-chat-bootstrap-and-context-injection/design-doc/01-scope-note-generic-app-chat-bootstrap-and-context-injection.md — Scope and dependency note for the future bootstrap work

## 2026-03-06

Revised APP-05 against the current codebase after the shared OS chat extraction landed.

Main conclusions recorded in the new guide:

- the assistant backend already exists and is mounted at `/api/apps/assistant`
- APP-05 should now be implemented as an assistant-module feature in `wesen-os`
- only a small conv_id-scoped conversation-context hook belongs in `go-go-os-chat`
- app docs and reflection should be resolved in-process from the module registry, not over self-HTTP
- apps-browser is the correct UX entry point, but the actual assistant chat window should be launcher-hosted because the launcher store is already chat-capable and the apps-browser local store is not

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-05-GENERIC-APP-CHAT-BOOTSTRAP--generic-app-chat-bootstrap-and-context-injection/design-doc/02-intern-guide-chat-with-app-after-os-chat-extraction.md — Revised intern-facing design and implementation guide
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-05-GENERIC-APP-CHAT-BOOTSTRAP--generic-app-chat-bootstrap-and-context-injection/reference/01-investigation-diary.md — Evidence-backed research diary for the revised APP-05 design

## 2026-03-06

Implemented APP-05 across the shared chat package, the shared frontend repo, and `wesen-os`.

Main implementation results:

- added a conversation-scoped context hook to `go-go-os-chat`
- added assistant bootstrap context storage and in-process app-context resolution in `wesen-os`
- added `POST /api/apps/assistant/api/bootstrap/app-chat`
- added launcher-hosted assistant chat windows for bootstrapped app-chat conversations
- added `Chat With App` to apps-browser module rows
- verified live bootstrap for:
  - `sqlite` as a reflection-heavy app
  - `inventory` as a docs-heavy app
- verified that a real `/api/apps/assistant/chat` request includes the attached app context in the runtime fingerprint

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/runtime_composer.go — Shared runtime composer now supports conv_id-scoped context lookup
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go — Assistant backend now exposes app-chat bootstrap
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/app_context.go — App docs/reflection context assembly
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/assistantModule.tsx — Launcher-hosted assistant app-chat window
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/ModuleBrowserWindow.tsx — Apps Browser entrypoint for Chat With App
