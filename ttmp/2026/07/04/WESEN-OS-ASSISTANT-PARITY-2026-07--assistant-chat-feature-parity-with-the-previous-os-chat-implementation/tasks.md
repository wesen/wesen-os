# Tasks — Assistant chat feature parity

See `design/01-assistant-chat-parity-intern-guide.md` for the full analysis. Phases
are ordered to deliver visible value early and defer the largest piece (JS apps).

## Phase 1 — Assistant chrome parity
- [ ] Factor shared chat chrome out of `InventoryChatWindow` into a reusable component
- [ ] Assistant window: profile selector (`GET /api/chat/profiles` already exists)
- [ ] Assistant window: starter suggestions, connection badge, Copy Conv ID
- [ ] Assistant window: inline Debug panel + Events/Timeline buttons
- [ ] Verify assistant round-trip unchanged

## Phase 2 — Stats footer (frontend-only — usage verified already on the WS)
- [ ] Capture `ChatProviderCallMetadataUpdated`/`ChatProviderCallFinished` UI events (via `onDebugEvent` parsed-frame) into a per-conv stats store
- [ ] Verify whether the metadata event carries model name; else label with the profile's engine
- [ ] Build `StatsFooter` equivalent incl. live streaming tok/s; no fabricated `0 tok`
- [ ] (Phase 6 follow-up) upstream a `statsSlice`/`selectRunStats` into chat-provider

## Phase 3 — Timeline renderer registry
- [ ] Renderer registry keyed by entity `kind` + `default` fallback (mirror old `rendererRegistry.ts`)
- [ ] Build a local `ChatTimeline` replacing chat-overlay `ChatMessages` (no extension point; unknown kinds dropped) — reuse `WidgetOutlet`/`ToolCallOutlet`; fold `renderMode` into ctx
- [ ] Migrate the static `inventory.card` widget onto the registry

## Phase 4 — Debug windows with performance
- [ ] Event Viewer: bounded ring buffer (1000) + component cap (500), ref-gated ingestion, precomputed summaries, memoized filter, count-keyed scroll
- [ ] FIX old gaps: lazy per-row YAML (only expanded), add list virtualization
- [ ] Timeline Debug: reuse provider normalized `{byId,order}`; port `buildTimelineDebugSnapshot` + `sanitizeForExport` (depth/cycle bounds) behind a memoized snapshot
- [ ] Port `StructuredDataTree` (lazy per-node expansion, MAX_DEPTH, string truncation)
- [ ] FIX: sanitize lazily per selected entity; `React.memo` rows

## Phase 5 — Generated JS HyperCard apps (see guide §6.5)
- [ ] Backend: re-inject `runtime-card-policy.md` system block + port the `<hypercard:card:v2>` extractor (128 KB cap, required-fields validation) into the final-turn `ArtifactExtractor`
- [ ] Backend: publish final `inventory.codeCard` widget with `{title,name,artifact,runtime.pack,card:{id,code}}` (final-only v1; streaming = optional `WrapSink` v2)
- [ ] Frontend: `defineWidget('inventory.codeCard', CodeCard)` with Open/Edit (proposal) — inline live host optional
- [ ] Frontend: re-add projection bridge — `registerRuntimeSurface(card.id, card.code, runtime.pack)` (from `plugin-runtime/runtimeSurfaceRegistry.ts`) on final
- [ ] Validate: prompt → live interactive card (ui.card.v1 and kanban.v1) renders and responds to input

## Phase 6 — Upstream + cleanup
- [ ] Promote generic ChatEventViewer / ChatTimelineDebug / StatsFooter / renderer registry into react-chat
- [ ] Retire os-chat from remaining consumers (coordinate with WESEN-OS-STOCKTAKE Phase 4)
