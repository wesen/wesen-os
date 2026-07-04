# Changelog

## 2026-07-04

- Initial workspace created


## 2026-07-04

Review pass (Fable): verified all guide claims with 3 code-verification agents; corrected §5 (usage already on WS via ChatProviderCallMetadataUpdated/Finished — Phase 2 now frontend-only), §6.5 (ArtifactExtractor is final-turn-only — JS cards final-only v1, WrapSink streaming v2; registerRuntimeSurface module path), Phase 3 (ChatMessages has no extension point, drops unknown kinds — registry replaces it), §4.3 (provider slice has no version guard; selector memoization semantics). Updated tasks.md to match.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/07/04/WESEN-OS-ASSISTANT-PARITY-2026-07--assistant-chat-feature-parity-with-the-previous-os-chat-implementation/design/01-assistant-chat-parity-intern-guide.md — Corrected after verification pass


## 2026-07-04

Phase 1 complete (commit 33c6165): assistant chrome parity on chat-provider — launcher-local chat/ components (ChatWindowChrome, chatDebugStore, profiles hook, detached debug windows v1), assistantModule rewired, stale test rewritten, verified live (real inference round-trip, profile lock, Event Viewer capturing ChatProviderCallFinished frames).

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/chat/ChatWindowChrome.tsx — New shared launcher chat chrome


## 2026-07-04

Phase 2 (fc579bc): StatsFooter with real usage from ChatProviderCall* events. Phase 4 (fea33aa): debug windows rebuilt with the original look (family pills, old toolbar/controls/row layout) + perf techniques + lazy-YAML/lazy-sanitize fixes; detached timeline via REST-seeded mutation-fold mirror. Both verified live.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/chat/timelineMirror.ts — Provider-exact merge semantics port — review against chat-provider timelineSlice


## 2026-07-04

Phase 3 (5baaad3): ChatTimeline + renderer registry replace kind-dropping ChatMessages. Phase 5 (95abb11 + inventory bb23af1): generated JS HyperCard apps restored end-to-end — policy prompt embedded (kanban sections fixed to os-kanban 0.1.4 page/taxonomy/board contract), card:v2 YAML extractor, inventory.codeCard widget + registerRuntimeSurface bridge, packageIds ['ui','kanban'] in stack.ts AND vm prelude; Stacks & Cards gets a live Generated Cards section with Open. Inventory debug retrofit (aea27b9). Verified live: interactive ui.card.v1 counter (5→8), kanban.v1 restock board, manager listing/opening.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/prompts/runtime-card-policy.md — Embedded policy — kanban sections rewritten against the 0.1.4 pack validator

