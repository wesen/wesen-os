# Tasks — Assistant chat feature parity

See `design/01-assistant-chat-parity-intern-guide.md` for the full analysis.

**Architecture decision (2026-07-04):** `launcherHost.test.tsx` forbids launcher app
code from importing `@go-go-golems/inventory` internals (federation boundary), and
react-chat is consumed as published npm — so assistant and inventory CANNOT share
components today. The generic chat components live launcher-local in
`apps/os-launcher/src/chat/`; the inventory window gets a targeted retrofit in its
own repo; true sharing happens in Phase 6 by upstreaming into react-chat.

## Phase 1 — Assistant chrome parity (apps/os-launcher/src/chat/)

- [x] `useChatProfiles.ts`: generic profiles hook (GET `<basePrefix>/api/chat/profiles`)
- [x] `chatDebugStore.ts`: per-conv bounded ring buffer (cap 1000) with emit-time summaries, seq ids, subscribe API (Phase 4 foundation)
- [x] `ChatWindowChrome.tsx`: header (title/conn badge/profile selector/Events/Timeline/Copy Conv ID/Debug), empty state, starter suggestions, inline debug panel, composer, footer slot
- [x] Rewire `assistantModule.tsx` onto the chrome: profile bound at session create (`createSessionBody`), `onDebugEvent` into the store; keep generic + app-chat modes
- [x] Assistant starter suggestions (generic + app-chat aware)
- [x] Typecheck + assistant round-trip against local stack

## Phase 2 — Stats footer (frontend-only; usage verified on the wire)

- [x] `chatStatsStore.ts`: per-conv stats fed from `parsed-frame` debug events — `ChatProviderCallMetadataUpdated`/`ChatProviderCallFinished` (`frame.payload.usage.{inputTokens,outputTokens,cachedTokens,cacheCreationInputTokens,cacheReadInputTokens}`, `durationMs`, `stopReason`); stream start on `ChatRunStarted`/`ChatTextSegmentStarted`; live out-token estimate from `ChatTextPatch` text length (chars/4) overridden by real usage
- [x] `StatsFooter.tsx`: idle/complete = label · In/Out/Cache/CacheWrite/CacheRead · duration · tok/s; streaming = `streaming: N tok · X tok/s`; model label = selected profile displayName (events carry no model); no fabricated `0 tok`
- [x] Wire into `ChatWindowChrome` footer slot
- [x] Validate with real inference (gpt-5-nano-low): numbers move during stream, settle on finish

## Phase 3 — Timeline renderer registry + ChatTimeline

- [x] `timelineRendererRegistry.tsx`: register by entity `kind` + `default` fallback, `useSyncExternalStore` version subscription (mirror old `rendererRegistry.ts`)
- [x] `ChatTimeline.tsx`: replaces chat-overlay `ChatMessages` (verified: hardcoded switch, drops unknown kinds) — routes entities through the registry; built-ins reuse `WidgetOutlet`/`ToolCallOutlet` from chat-provider + message bubbles; unknown kinds → default renderer (collapsed raw view), not dropped
- [x] Render ctx carries `renderMode: 'normal' | 'debug'`
- [x] Use ChatTimeline in the assistant chrome; verify message/widget/tool rendering unchanged

## Phase 4 — Debug windows with performance (assistant windows + inventory retrofit)

- [x] `StructuredDataTree.tsx`: port lazy collapsible tree (children unmounted while collapsed, MAX_DEPTH 20, 200-char truncation, empty-composite scalar lines)
- [x] `sanitize.ts`: port `sanitizeForExport` (MAX_DEPTH 24, WeakSet cycle guard, tagged BigInt/Date/RegExp/Error) — applied lazily per selected entity, not eagerly
- [x] `ChatEventViewerWindow.tsx`: component cap 500, pausedRef-gated ingestion, precomputed summaries from store, memoized filter projection, count-keyed scroll + isNearBottom(32px), LAZY per-expanded-row YAML/JSON (fixes old gap)
- [x] Reproduce the ORIGINAL Event Viewer look (user request 2026-07-04): event-type pills/badges, toolbar chips, visual density — match old EventViewerWindow markup/CSS, not just perf internals
- [x] `ChatTimelineDebugWindow.tsx`: memoized snapshot keyed on `selectTimelineEntities` output identity; entity list + StructuredDataTree detail; export via lazy sanitize
- [x] Register both as launcher desktop windows, opened from assistant chrome Events/Timeline buttons
- [x] Inventory retrofit (its repo): cap + pause + summaries in `inventoryChatDebugStore`/`InventoryDebugWindows`, lazy YAML
- [x] Flood test: long streaming turn, UI stays responsive, memory bounded

## Phase 5 — Generated JS HyperCard apps (inventory repo + wesen-os backend)

- [x] Backend: move static cards off `<hypercard:card:v2>` onto `<hypercard:widget:v1>` (JSON → `inventory.card`), update `inventorySystemPrompt` accordingly
- [x] Backend: port `runtime-card-policy.md` as system-prompt block (ui.card.v1 + kanban.v1 DSL rules, sandbox constraints)
- [x] Backend: port the YAML `<hypercard:card:v2>` code-card extractor (128 KB cap, required fields name/card.id/card.code/runtime.pack per `hypercard_extractors.go:306-326`) → publish `inventory.codeCard` widget `{title,name,artifact:{id,data},runtime:{pack},card:{id,code}}` (final-only v1)
- [x] Backend: contract test — assistant text with a valid code-card block yields a `ChatWidgetInstance` with `card.code` + `runtime.pack` props
- [x] Frontend (inventory): `defineWidget('inventory.codeCard', ...)` — title/status + code preview + Open button via `buildArtifactOpenWindowPayload({artifactId, title, runtimeSurfaceId: card.id, bundleId: 'inventory'})`
- [x] Frontend (inventory): projection bridge — on widget mount call `registerRuntimeSurface(card.id, card.code, runtime.pack)` (from `os-scripting/src/plugin-runtime/runtimeSurfaceRegistry.ts`)
- [x] Validate end-to-end with real inference: prompt → code card → Open → live interactive `ui.card.v1` surface responds to input; repeat for `kanban.v1`

## Phase 6 — Upstream + cleanup (future, not this pass)

- [ ] Promote ChatWindowChrome / StatsFooter / renderer registry / debug windows into react-chat; switch assistant + inventory to the published package
- [x] Retire os-chat from remaining consumers (coordinate with WESEN-OS-STOCKTAKE Phase 4)
- [x] Phase 5 (user request 2026-07-04): generated hypercard apps must appear in the Stacks & Cards manager list — register generated surfaces/artifacts so the manager lists them, openable/viewable from there
