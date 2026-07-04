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

