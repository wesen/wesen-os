# Tasks — Assistant chat feature parity

See `design/01-assistant-chat-parity-intern-guide.md` for the full analysis. Phases
are ordered to deliver visible value early and defer the largest piece (JS apps).

## Phase 1 — Assistant chrome parity
- [ ] Factor shared chat chrome out of `InventoryChatWindow` into a reusable component
- [ ] Assistant window: profile selector (`GET /api/chat/profiles` already exists)
- [ ] Assistant window: starter suggestions, connection badge, Copy Conv ID
- [ ] Assistant window: inline Debug panel + Events/Timeline buttons
- [ ] Verify assistant round-trip unchanged

## Phase 2 — Stats footer
- [ ] Identify the sessionstream run/usage frame carrying token usage
- [ ] Add overlay/selector exposing modelName + turn tokens (in/out/cache) + totals
- [ ] Build `StatsFooter` equivalent incl. live streaming tok/s; no fabricated `0 tok`

## Phase 3 — Timeline renderer registry
- [ ] Renderer registry keyed by entity `kind` + `default` fallback (mirror old `rendererRegistry`)
- [ ] Route `ChatMessages`/widget rendering through it; fold `renderMode` into ctx
- [ ] Migrate the static `inventory.card` widget onto the registry

## Phase 4 — Debug windows with performance
- [ ] Event Viewer: bounded ring buffer (1000) + component cap (500), ref-gated ingestion, precomputed summaries, memoized filter, count-keyed scroll
- [ ] FIX old gaps: lazy per-row YAML (only expanded), add list virtualization
- [ ] Timeline Debug: reuse provider normalized `{byId,order}`; port `buildTimelineDebugSnapshot` + `sanitizeForExport` (depth/cycle bounds) behind a memoized snapshot
- [ ] Port `StructuredDataTree` (lazy per-node expansion, MAX_DEPTH, string truncation)
- [ ] FIX: sanitize lazily per selected entity; `React.memo` rows

## Phase 5 — Generated JS HyperCard apps (see guide §6.5)
- [ ] Backend: re-inject `runtime-card-policy.md` system block + register the `<hypercard:card:v2>` card extractor (128 KB cap) in chathost
- [ ] Backend: publish `inventory.codeCard` widget with `{title,name,artifact,runtime.pack,card:{id,code},status}`
- [ ] Frontend: `defineWidget('inventory.codeCard', CodeCard)` with Open/Edit (proposal) — inline live host optional
- [ ] Frontend: re-add projection bridge — `registerRuntimeSurface(card.id, card.code, runtime.pack)` on final
- [ ] Validate: prompt → live interactive card (ui.card.v1 and kanban.v1) renders and responds to input

## Phase 6 — Upstream + cleanup
- [ ] Promote generic ChatEventViewer / ChatTimelineDebug / StatsFooter / renderer registry into react-chat
- [ ] Retire os-chat from remaining consumers (coordinate with WESEN-OS-STOCKTAKE Phase 4)
