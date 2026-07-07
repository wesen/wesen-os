---
Title: Assistant chat feature parity — analysis, design & implementation guide
Ticket: WESEN-OS-ASSISTANT-PARITY-2026-07
Status: active
Topics: []
DocType: design-doc
Intent: short-term
Owners: []
RelatedFiles:
    - Path: apps/os-launcher/src/app/assistantModule.tsx
      Note: NEW barest assistant window (0 parity features)
    - Path: workspace-links/go-go-app-inventory/pkg/_pinoweb_legacy/prompts/runtime-card-policy.md
      Note: OLD JS-card system-prompt policy
    - Path: workspace-links/go-go-os-frontend/packages/os-chat/src/chat/components/ChatConversationWindow.tsx
      Note: OLD feature-complete window — parity target
    - Path: workspace-links/go-go-os-frontend/packages/os-chat/src/chat/debug/timelineDebugModel.ts
      Note: OLD normalized incremental timeline model (perf)
    - Path: workspace-links/go-go-os-frontend/packages/os-scripting/src/runtime-host/RuntimeSurfaceSessionHost.tsx
      Note: JS card executor (still live)
ExternalSources: []
Summary: End-to-end guide to the wesen-os chat stack (old os-chat/SEM vs new chat-provider/chatapp/sessionstream), the features lost in the migration, and a phased plan to restore full parity — rich debug windows (with the old performance techniques), a stats footer, a pluggable timeline renderer registry, and generated JS HyperCard apps.
LastUpdated: 2026-07-04T00:00:00-07:00
WhatFor: ""
WhenToUse: ""
---






# Assistant chat feature parity — intern guide

> Read this top to bottom once before touching code. It explains what the system
> *is*, what the previous chat implementation could do that the current one
> cannot, and how to rebuild each missing piece on the new transport. Every claim
> is anchored to a file so you can go read the real thing.
>
> **Review pass 2026-07-04:** all file/symbol/constant claims re-verified against
> the code. Three findings changed the plan: (1) token usage **already reaches the
> WS** (`ChatProviderCallMetadataUpdated`/`Finished`) — Phase 2 is frontend-only
> (§5); (2) chathost's `ArtifactExtractor` is **final-turn-only** — JS cards ship
> final-only in v1, streaming is an optional `WrapSink` v2 (§6.5); (3) chat-overlay
> `ChatMessages` has **no renderer extension point** and drops unknown kinds — the
> Phase 3 registry replaces it locally (§7).

## 0. TL;DR — what you are building

The wesen-os chat UI was migrated off the old **os-chat / SEM** stack onto the new
**chat-provider / chatapp / sessionstream** stack. The migration restored *basic*
chat (streaming text, sessions, a profile selector, starter suggestions, static
cards) but **dropped four capabilities** the previous implementation had:

1. **A rich Event Viewer + Timeline Debug** with real performance engineering
   (bounded buffers, ref-gated ingestion, a normalized incremental timeline
   model, memoized snapshot projection, and a lazy collapsible JSON tree). The
   new windows are naive full-recompute rebuilds.
2. **A stats footer** — model name, per-turn token counts (in/out/cache), live
   streaming tokens/sec, and conversation-total tokens. The new window shows only
   a message count.
3. **A pluggable timeline renderer registry** — components keyed by entity `kind`
   with a `default` fallback, which is how custom cards/widgets plugged into the
   message stream.
4. **Generated JS HyperCard apps** — the model could emit *executable JavaScript*
   cards (a `code` string + a `runtime.pack` id) that ran as live interactive
   surfaces via the goja/quickjs runtime. The new path only renders **static**
   `{title, fields, footer}` cards.

Your job: bring the **assistant** (and inventory) chat window to feature parity
with the old `ChatConversationWindow`, on the new transport, keeping the old
performance techniques and restoring the JS-app capability.

---

## 1. The two stacks (mental model)

There have been two complete chat architectures in this codebase. You must be able
to tell them apart on sight, because the old one is still readable in-tree (for
reference) and the new one is what ships.

### 1.1 OLD — os-chat / SEM

- **Package:** `@go-go-golems/os-chat` — source at
  `workspace-links/go-go-os-frontend/packages/os-chat/`.
- **Transport:** a custom `wsManager` decoding **SEM** (Structured Event Model)
  protobuf timeline frames; REST at `POST /chat`, `WS /ws?conv_id=`,
  `GET /api/timeline`, `GET /api/chat/profiles`.
- **Backend:** pinocchio `pkg/webchat` + `pkg/sem` (both since **deleted** from
  pinocchio) — and, in the inventory app, `pkg/pinoweb` (the HyperCard middleware,
  now quarantined at `workspace-links/go-go-app-inventory/pkg/_pinoweb_legacy/`).
- **UI entry:** `os-chat` `ChatConversationWindow`
  (`packages/os-chat/src/chat/components/ChatConversationWindow.tsx`). This is the
  feature-complete window you are matching.

### 1.2 NEW — chat-provider / chatapp / sessionstream

- **Frontend packages (npm):** `@go-go-golems/chat-provider` +
  `@go-go-golems/chat-overlay` (0.2.1), from the `react-chat` repo. Provider +
  Redux store + WS manager + widget/tool/timeline-adapter registries.
- **Transport:** sessionstream JSON/protojson over `GET <basePrefix>/api/chat/ws`
  (+ a `subscribe` frame); REST under `<basePrefix>/api/chat/*`.
- **Backend:** pinocchio `pkg/chatapp` + `pkg/sessionstream`, wrapped per-app by
  wesen-os's reusable **`pkg/chathost`**.
- **UI entries:** the launcher **assistant** window
  (`apps/os-launcher/src/app/assistantModule.tsx`, 216 lines) and the **inventory**
  chat window (`.../go-go-app-inventory/apps/inventory/src/launcher/chat/`).

### 1.3 Wire contract you will speak (new)

```
GET  <basePrefix>/api/chat/health
POST <basePrefix>/api/chat/sessions              {sessionId?, profile?} -> {sessionId}
POST <basePrefix>/api/chat/sessions/{id}/messages {prompt} -> {accepted, status:"running"}
GET  <basePrefix>/api/chat/sessions/{id}          -> snapshot (entities[])
POST <basePrefix>/api/chat/sessions/{id}/stop
POST <basePrefix>/api/chat/sessions/{id}/tools/manifest
POST <basePrefix>/api/chat/sessions/{id}/tools/results
GET  <basePrefix>/api/chat/profiles               -> {profiles:[{slug,displayName,isDefault}], defaultSlug}
GET  <basePrefix>/api/chat/ws                     -> sessionstream; client sends {subscribe:{sessionId,sinceSnapshotOrdinal}}
```
`basePrefix` is `/api/apps/assistant` or `/api/apps/inventory`. Contract handlers:
`pkg/chathost/handlers.go`; route table: `pkg/chathost/host.go` `MountRoutes`.

### 1.4 System diagram

```
Browser (desktop OS shell)
  ├─ assistantModule.tsx ──┐
  └─ inventory chat window ┤   <ChatProvider config={{basePrefix, createSessionBody, widgets, onDebugEvent}}>
                           │       ChatMessages / ChatComposer / (WidgetOutlet)
                           │       chat-provider Redux store: overlaySlice + timelineSlice
                           ▼
                     HTTP + WS  ── /api/apps/<app>/api/chat/*
                           ▼
  wesen-os-launcher (Go)  ── pkg/chathost.Host (one per app)
     ├─ chatapp.Engine  (WithPlugins: widgetPlugin, frontendToolPlugin)
     ├─ sessionstream.Hub  (schema registry, hydration store, WS fanout)
     ├─ chatapp.Service (SubmitPromptRequest)
     └─ per-prompt: ResolveEngineProfile -> InferenceSettings -> geppetto Engine.RunInference(turn)
                           ▲
             geppetto profiles registry  (~/.config/pinocchio/profiles.yaml + builtin app registries)
```

---

## 2. How the new backend works (so the UI work makes sense)

`pkg/chathost` is the wesen-os replacement for the deleted pinocchio `pkg/webchat`.
One `Host` per app, mounted under the app namespace.

- **`host.go`** — `New(Options)` wires: a sessionstream schema registry, the
  `chatapp` widget + frontend-tool plugins, hydration + turn stores, a WS transport,
  the `chatapp.Engine`, the `sessionstream.Hub`, and a `chatapp.Service`. `Options`
  carries `AppID`, `SystemPrompt`/`SystemPromptFunc`, `Profiles ProfileSurface`,
  `BackendTools`, `EngineFactory`, and `ArtifactExtractor` (the card hook).
- **`handlers.go`** — the REST contract (sessions/messages/snapshot/stop/tools/
  profiles). `handleProfiles` enumerates the app's visible profiles.
- **`runtime.go`** — `promptRequest` resolves the session's engine profile to
  `InferenceSettings`, builds a geppetto engine, registers backend + frontend tools,
  seeds the system prompt on the first turn, and installs `OnFinalTurn` (which runs
  `ArtifactExtractor` and publishes widget instances via `hub.Publish`).

Key fact for parity work: **`chatapp` already carries a widget rail.** The engine is
built `chatapp.WithPlugins(widgetPlugin, frontendToolPlugin)`, and the hub exposes a
public `Publish(ctx, Event)`. Widget lifecycle events
(`ChatWidgetInstanceStarted/Patched/Completed/Removed`) project into
`ChatWidgetInstance` timeline entities and fan out over WS. This is the rail both
static cards and JS HyperCard apps ride (see §6).

---

## 3. The parity gap — feature matrix

The old `ChatConversationWindow` props/features vs today. "New" = present after the
migration; refs are the current files.

| Feature | Old (os-chat) | New assistant | New inventory | Target |
|---|---|---|---|---|
| Streaming text | ✅ | ✅ | ✅ | keep |
| Sessions / stable convId | ✅ | ✅ | ✅ | keep |
| Profile selector | `ChatProfileSelector` + `profileSlice` | ❌ | ✅ basic (`useInventoryProfiles`) | port to assistant |
| Starter suggestions | ✅ (server + prop) | ❌ | ✅ | port to assistant |
| **Stats footer** | `StatsFooter` (model, tokens, tok/s) | ❌ | ❌ (msg count only) | **rebuild** (§5) |
| **Timeline renderer registry** | `renderers/rendererRegistry` + `timelineRenderers` prop | ❌ | ❌ (single card widget) | **rebuild** (§6) |
| **Event Viewer** | `EventViewerWindow` (perf) | ❌ | ⚠ naive rebuild | **rebuild w/ perf** (§4) |
| **Timeline Debug** | `TimelineDebugWindow` + `timelineDebugModel` (perf) | ❌ | ⚠ naive rebuild | **rebuild w/ perf** (§4) |
| **Generated JS HyperCard apps** | `hypercard.card.v2` code cards + RuntimeSurface | ❌ | ❌ (static card widget only) | **rebuild** (§6) |
| Conversation context actions | `conversationContextActions` | ❌ | ✅ (menus) | port to assistant |
| Render mode (normal/debug) | `renderMode` prop | ❌ | ⚠ inline debug panel | fold into renderer ctx |
| Streaming spinner / pending | `showPendingResponseSpinner` | partial | partial | keep |

Current new-stack files (line counts) you will touch or reference:
- `apps/os-launcher/src/app/assistantModule.tsx` (216) — barest window, 0 parity features.
- `.../inventory/src/launcher/chat/InventoryChatWindow.tsx` (297) — the richer window.
- `.../inventory/src/launcher/chat/InventoryDebugWindows.tsx` (160) — the naive debug rebuild.
- `.../inventory/src/launcher/chat/inventoryCardWidget.tsx` (62) — static card renderer.
- `.../inventory/src/launcher/chat/inventoryChatDebugStore.ts` (74) — per-conv ring buffer.
- `cmd/wesen-os-launcher/inventory_artifacts.go` (56) — card block extractor.
- `pkg/chathost/{host,handlers,runtime}.go` — the backend.

---

## 4. Rebuild the debug windows — with the old performance techniques

The old windows use **no** third-party perf libraries (no reselect, no
react-window, no throttle, no `React.memo`). Every optimization is hand-rolled:
bounded buffers, ref-gated ingestion, a normalized incremental Redux model,
memoized projection, and a lazy tree. Reproduce these, then add the two things the
old code left on the table (virtualization + lazy serialization).

### 4.1 Event Viewer — techniques to port

Old files: `packages/os-chat/src/chat/debug/EventViewerWindow.tsx`,
`.../debug/eventBus.ts`.

- **Bounded ring buffer at the source.** `eventBus.ts` caps per-conversation history
  at `MAX_EVENT_HISTORY = 1000`, front-trimming. Streaming deltas arrive thousands
  per turn; the cap bounds memory.
  ```ts
  history.push(entry);
  if (history.length > MAX_EVENT_HISTORY) history.splice(0, history.length - MAX_EVENT_HISTORY);
  ```
- **No-listener short-circuit.** When the viewer is closed, the bus does zero
  per-event React work (`if (!listeners || listeners.size === 0) return;`).
- **Precomputed summaries.** A one-line `summarize()` is computed at emit time, so
  render never re-derives it. IDs are monotonic ints (`evt-${seq++}`) used directly
  as React keys (stable, no hashing).
- **Second bounded buffer in the component.** `MAX_ENTRIES = 500` caps the rendered
  list even though history holds 1000.
- **Ref-gated ingestion.** `pausedRef.current` mirrors `paused` so the subscription
  callback reads pause state without `paused` being a dependency — the subscription
  only re-runs on `conversationId`, and while paused, events are dropped *before*
  `setState` (no render churn during bursts).
- **Memoized filter projection.** `visible = useMemo(filter(entries), [entries,
  filters, visibilityOptions])`; `visibilityOptions` is itself a `useMemo` for stable
  identity. `filterVisibleEntries`/`isEntryHiddenByEventType` are extracted pure
  (unit-tested) single-pass functions.
- **Scroll keyed on count, not array.** `useLayoutEffect(..., [entryCount])` +
  `isNearBottom` (32px threshold) so focus re-renders don't thrash scroll and
  auto-scroll doesn't fight the user.
- **Stable handler identities** via `useCallback` (handlers passed into up to 500
  rows). Transient `copyFeedbackById` entries self-expire after 1400ms.
- **⚠ Known gap to FIX in your rebuild:** `toYaml(entry.rawPayload)` is computed
  eagerly for every visible row each render; only `<SyntaxHighlight>` is gated behind
  `expandedIds`. **Make YAML lazy** (compute per expanded id) *and* add list
  virtualization.

### 4.2 Timeline Debug — techniques to port

Old files: `.../debug/TimelineDebugWindow.tsx`, `.../debug/timelineDebugModel.ts`,
`.../debug/StructuredDataTree.tsx`, `.../state/timelineSlice.ts`,
`.../state/selectors.ts`.

- **Normalized incremental model — this is the core.** `timelineSlice` stores
  `{ byId: Record<id,Entity>, order: string[] }` per conversation. Updates are
  incremental, not full recompute:
  - `upsertEntity` new id → push to `order` + set `byId`; existing id → **shallow
    merge props** with a **version guard** (`if (incomingVersion < existingVersion)
    return;`). Immer (via RTK) gives structural sharing, so unchanged entities keep
    identity and `useSelector` only sees new refs for the changed subtree.
  - `rekeyEntity` swaps temp→server id in place; `applySnapshot` replaces;
    `mergeSnapshot` per-entity upserts. No whole-array scans per event.
- **Referentially stable empty selectors.** `selectConversationTimelineState` returns
  shared `EMPTY_TIMELINE` / `EMPTY_TIMELINE_ENTITIES` constants when empty — prevents
  `useSelector` re-render loops.
- **Memoized snapshot projection.** `snapshot = useMemo(buildTimelineDebugSnapshot(...),
  [conversationId, convState, initialSnapshot])`. Because `convState` keeps a stable
  ref until the timeline actually changes, the expensive projection + deep clone runs
  once per real change, not per render. An `initialSnapshot` prop bypasses Redux for
  tests/storybook.
- **Bounded deep clone.** `timelineDebugModel.sanitizeForExport` is depth-bounded
  (`MAX_DEPTH = 24`) + `WeakSet` cycle-guarded, with cheap tagged-string handling of
  BigInt/function/Date/RegExp/Error. **⚠ Gap:** it clones *all* entities eagerly on
  any change; your rebuild should sanitize lazily per selected entity.
- **Lazy collapsible JSON tree — the biggest render win.** `StructuredDataTree.TreeNode`
  holds its own `collapsed` state and **children are not rendered while collapsed**;
  `defaultCollapsed && depth > 0` means only the top level renders initially; deep
  subtrees mount on expand. `MAX_DEPTH = 20`; strings truncated at 200 chars until
  expanded; empty arrays/objects render as one scalar line.
  ```ts
  const [collapsed, setCollapsed] = useState(defaultCollapsed && depth > 0);
  {!collapsed && <div>{children}</div>}
  ```

### 4.3 Mapping old → new transport

The old model consumed **SEM `timeline.upsert`** frames. The new provider already
exposes an equivalent: `chat-provider`'s `timelineSlice` (`selectTimelineEntities`)
is *itself* a normalized `{byId, order}` model with incremental patch-aware merges
(`mergeTimelineEntity` honors `contentPatch`/`patchMode` streaming appends and widget
`propsPatch`), and `onDebugEvent` emits typed `ChatDebugEvent`s
(`ws-lifecycle | raw-ws | parsed-frame | snapshot | ui-event`).

Two differences from the old slice you must account for (verified against
`chat-provider` `store/timelineSlice.js`):
- **No version guard.** The provider merge is unconditional last-writer-wins; the
  `version?` field on `TimelineEntity` exists but is never compared. (The old slice
  dropped stale updates.) Fine for debug views; don't claim ordering guarantees.
- **`selectTimelineEntities` is `createSelector`-memoized on `(byId, order)`** — the
  returned array is referentially stable while nothing changed and a *new* array on
  any upsert. So `useMemo(buildSnapshot, [entities])` gives you exactly the old
  "recompute once per real change" behavior.

- **Event Viewer:** feed `onDebugEvent` into a bounded ring buffer
  (`inventoryChatDebugStore` already does this, minus the caps/summarize/pause) and
  render with the §4.1 techniques.
- **Timeline Debug:** you get the normalized model for free from the provider store;
  port `buildTimelineDebugSnapshot` + `sanitizeForExport` + `StructuredDataTree` to
  read provider `TimelineEntity[]` instead of SEM entities.
- Decide: keep these Inventory-local first, then upstream generic
  `ChatEventViewer`/`ChatTimelineDebug` into `react-chat` once proven.

---

## 5. Rebuild the stats footer

Old: `packages/os-chat/src/chat/components/StatsFooter.tsx`, fed by
`chatSessionSlice` (`turnStats`, `streamOutputTokens`, `streamStartTime`,
`modelName`, conversation totals).

What it renders:
- **Idle/complete:** `modelName` · `In:<n> Out:<n> Cache:<n> CacheWrite:<n>
  CacheRead:<n>` · `<duration>s` · `<tps> tok/s`.
- **Streaming (live):** `modelName` · `streaming: <outTokens> tok · <liveTps> tok/s`,
  where `liveTps = round(streamOutputTokens / ((Date.now()-streamStartTime)/1000))`.
- **Empty:** `Streaming via /chat + /ws` (the old footer string; new equivalent is
  "Streaming via sessionstream").

```ts
if (isStreaming && streamStartTime) {
  const elapsed = (Date.now() - streamStartTime) / 1000;
  const liveTps = Math.round((streamOutputTokens / elapsed) * 10) / 10;
  parts.push(`streaming: ${formatNumber(streamOutputTokens)} tok · ${liveTps} tok/s`);
}
```

**Where the old numbers came from** (so you know what to match): `os-chat`'s
`sem/semRegistry.ts` `applyLlmMetadata` decoded proto `LlmInferenceMetadataV1` from
the **`metadata` field of the `llm.start/delta/final` SEM envelopes** — `meta.model`
→ `setModelName`, streaming `meta.usage.outputTokens` (or a text-length estimate) →
`updateStreamTokens`, and `llm.final` → `setTurnStats` incl.
`cacheCreationInputTokens`/`cacheReadInputTokens`. There was no separate "usage
event"; usage rode the llm envelopes.

**New-transport source — VERIFIED: usage is ALREADY on the wire; this phase is
frontend-only.** chatapp's runtime sink (`pinocchio pkg/chatapp/runtime_sink.go`)
translates geppetto `EventProviderCallMetadataUpdated` / `EventProviderCallFinished`
into two **transient UI events** that pass through `baseUIProjection` to the WS
(no timeline entity):

- `ChatProviderCallMetadataUpdated{usage}` — fires during streaming (live counter).
- `ChatProviderCallFinished{usage}` — fires at call end (final turn stats).
- `UsageInfo` fields: `inputTokens, outputTokens, cachedTokens,
  cacheCreationInputTokens, cacheReadInputTokens` (chatappv1 `chat.pb.go`).

This path is active in chathost (every prompt goes through
`chatapp.runRuntimeInference`, which installs the sink). **No backend change is
required for token counts.** The gap is purely that `chat-provider` ignores these
frames: its overlay is only `{sessionId, runStatus, wsStatus, isOpen, error}` and
the package contains no usage/model state at all (verified by grep).

Frontend options, in order of preference:
1. **Quick (ship first):** capture the two frames from `onDebugEvent`
   (`parsed-frame.frame` carries the full decoded frame) into a small
   per-conversation stats store (same pattern as `inventoryChatDebugStore`), and
   render the footer from that. Works today with zero library changes.
2. **Proper (Phase 6):** add a `statsSlice` (or extend `overlaySlice`) +
   `selectRunStats` to `react-chat` fed by these UI events, then delete the local
   store.

Caveat to verify while implementing: whether `ChatProviderCallMetadataUpdated`
carries the **model name** (usage is confirmed; model was not). If it doesn't, show
the *profile's* engine name from `GET /api/chat/profiles` as the model label, or add
the model string to the chatapp metadata event upstream. Do **not** fabricate a
`0 tok` counter (the current window's blemish) — show real usage or omit.

---

## 6. Restore generated JS HyperCard apps

> This is the marquee capability. The old assistant could emit **executable JS**
> cards that ran as live interactive surfaces; the new path renders only static
> `{title, fields, footer}`. The good news, established below: the entire JS
> **execution engine** (goja/QuickJS, both packs, the surface host, the injection
> registry, the surface-window adapter) is **still live and wired** in the
> inventory app for the folder/surface path. Only the *chat-side production*
> (backend block emission) and the *chat-side projection* (event → registry
> bridge + a renderer that can open/execute) were removed. Restoring JS apps in
> chat is a **bridging** job, not a from-scratch runtime.

### 6.1 The generated-block format (old backend)

The model emitted `<hypercard:card:v2> … </hypercard:card:v2>` wrapping a **YAML**
payload in a ```` ```yaml ```` fence. (There were also `<hypercard:widget:v1>` for
static widgets and `<hypercard:suggestions:v1>` for suggestions.) The card block was
parsed by a debounced YAML controller with a **128 KB cap** precisely because
`card.code` can be large (`_pinoweb_legacy/hypercard_extractors.go:48`).

The `card:v2` schema (`hypercard_extractors.go:83-94`):

```go
type inventoryRuntimeCardPayload struct {
    Name     string                   `yaml:"name"`
    Title    string                   `yaml:"title"`
    Artifact struct{ ID string; Data map[string]any } `yaml:"artifact"`
    Runtime  struct{ Pack string `yaml:"pack"` }      `yaml:"runtime"` // e.g. ui.card.v1
    Card     struct{ ID string; Code string }         `yaml:"card"`    // Code = JS source
}
```

`OnCompleted` **hard-requires** (else emits `hypercard.card.error`): a display name
(`name`/`title`), `card.id`, `card.code`, and `runtime.pack`
(`hypercard_extractors.go:306-326`). Load-bearing fields: **`card.code` (JS source),
`runtime.pack` (id), `card.id`, `artifact.id`.**

Real example (`prompts/runtime-card-policy.md:17-39`):

````text
<hypercard:card:v2>
```yaml
name: Short Name
title: Longer Window Title
artifact: { id: stable-kebab-case-id, data: {} }
runtime: { pack: ui.card.v1 }
card:
  id: lowerCamelCardId
  code: |-
    ({ ui }) => ({
      render() { return ui.panel([ ui.text("Hello") ]); }
    })
```
</hypercard:card:v2>
````

**Became timeline entities** (`hypercard_events.go`): the parse lifecycle
(`hypercard.card.start/.update/.v2/.error`) mapped to SEM frames, which upserted a
first-class timeline entity of kind **`hypercard.card.v2`** (id `<evtID>:result`)
with props `{ schemaVersion:1, toolCallId, result:<full card payload incl. card.code
+ runtime.pack>, resultRaw, status:"streaming"|"success", detail }`. `.update` →
`status:"streaming"`; `.v2` ready → `status:"success"`.

### 6.2 The system-prompt policy that taught JS-card authoring

`_pinoweb_legacy/prompts/runtime-card-policy.md` (embedded via `card_prompt.go`,
injected as a system block by `NewInventoryArtifactPolicyMiddleware`). It fully
specifies the DSL and rules. Key passages:

- **Trigger/envelope (1-14):** "When the user's request clearly calls for a visual
  runtime surface … emit exactly one `<hypercard:card:v2>` block containing a YAML
  payload. Always fully close the block … Before the tag, output one short
  plain-language sentence that says what the surface does."
- **Field rules (41-50):** "`runtime.pack`: required … `ui.card.v1` for normal UI
  cards and a pack-specific id such as `kanban.v1`. `card.id`: lowerCamelCase JS
  identifier. `card.code`: a single JavaScript expression."
- **Pack selection (52-66):** "Default UI surface: `runtime.pack: ui.card.v1`, use
  `({ ui }) => ({ ... })`. Kanban surface: `runtime.pack: kanban.v1`, use
  `({ widgets }) => ({ ... })`, return `widgets.kanban.board(...)`. Do not fake a
  Kanban board with generic `ui.row`/`ui.column`."
- **`card.code` contract (178-218):** "must evaluate to a card definition object.
  Required: `render(ctx) -> one UI node tree`. Optional: `handlers` -> object of
  named functions. The outermost value must be one expression."
- **Sandbox (724-735):** "Do not use `import`, `export`, `require`, `eval`,
  `Function` … Do not access `window`, `document`, `fetch`, timers … Do not use
  `Promise`/async … Do not mutate `state`."

The DSL: `ui.panel/column/row/text/badge/button/input/table/dropdown/
selectableTable/gridBoard`; event-ref `{ handler, args }`; render ctx `render({
state })`; handler ctx `(ctx, args)` with `ctx.dispatch`. Five worked examples + a
full Kanban example. (`widget-policy.md` is the simpler static `type:
report|item|table` policy.)

### 6.3 The frontend execution contract (still live)

**Surface type** (`os-scripting/.../runtimeSurfaceTypeRegistry.tsx`), keyed by pack id:
```ts
interface RuntimeSurfaceTypeDefinition<TTree> {
  packId: string;                                       // 'ui.card.v1'
  validateTree: (value: unknown) => TTree;
  render: (props: { tree: TTree; onEvent: (h, args?) => void }) => ReactNode;
}
```
**Runtime package** (`runtimePackageRegistry.ts`) — the JS prelude installed into the VM:
```ts
interface RuntimePackageDefinition {
  packageId: string;       // 'ui' | 'kanban'
  installPrelude: string;  // JS defining ui.* / widgets.*
  surfaceTypes: string[];  // ['ui.card.v1'] | ['kanban.v1']
}
```
Two packs exist: **`ui` → `ui.card.v1`** (`os-ui-cards`, factory `({ ui }) => ({
render(){…}, handlers:{…} })`) and **`kanban` → `kanban.v1`** (`os-kanban`, factory
`({ widgets }) => ({ render(){ return widgets.kanban.board(…) } })`).

**Execution** — `RuntimeSurfaceSessionHost.tsx` (goja/QuickJS via
`DEFAULT_RUNTIME_SESSION_MANAGER`):
1. `ensureSession({ bundleId, sessionId, packageIds, bundleCode })` loads the VM +
   installs package preludes.
2. `injectPendingRuntimeSurfaces(...)` → `runtimeHandle.defineSurface(surfaceId,
   code, packId)` — **this is where a generated card's `code` is eval'd into the VM.**
3. Per render: `renderSurface(surfaceId, projectedState)` → `validateRuntimeSurfaceTree`
   → `renderRuntimeSurfaceTree(packId, tree, emitRuntimeEvent)`.
4. Events: `emitRuntimeEvent(h, args)` → `eventSurface(...)` → `RuntimeAction[]` →
   `dispatchRuntimeAction` into Redux.
5. State projected in via `projectRuntimeState` → `{ self, nav, ui, filters, draft,
   ...domains }` (matches the prompt's `render({ state })`).

### 6.4 What was chat-specific and got lost

- **Renderer:** `HypercardCardRenderer` (`hypercard/timeline/hypercardCard.tsx`) was an
  os-chat host-provided renderer override for kind `hypercard.card.v2`. It did **not**
  execute inline — it showed title/status + syntax-highlighted `card.code` and offered
  **Open** (`buildArtifactOpenWindowPayload → openWindow(content.kind:'surface')`) and
  **Edit** (`openCodeEditor`). So the chat card was a *proposal*; execution happened on
  Open, as a surface window. It is no longer referenced by the app.
- **Bridge (orphaned):** `hypercard/artifacts/artifactProjectionMiddleware.ts` is a
  Redux listener on the **os-chat `timelineSlice`**; on a final `hypercard.card.v2`
  entity it called `registerRuntimeSurface(card.id, card.code, runtime.pack)`. The
  chat-provider chat no longer feeds that slice, so the bridge never fires.
- **Backend:** the whole `<hypercard:card:v2>` extractor/policy/events live in the
  `_`-prefixed `_pinoweb_legacy/` dir (build-ignored). The new chathost publishes a
  **static** `inventory.card` widget instead.

### 6.5 Bridge design — code-card block → chathost widget → RuntimeSurface

Everything below `registerRuntimeSurface` (VM eval, validate, render, events) already
works. The restore is five steps:

1. **Backend policy + extractor.** Re-inject `runtime-card-policy.md` as a system block
   (port `NewInventoryArtifactPolicyMiddleware`; chathost `Options.SystemPrompt` /
   `SystemPromptFunc` is the hook) and port the card extractor
   (`inventoryRuntimeCardExtractor`) — parse `<hypercard:card:v2>` YAML with the
   128 KB cap and the old required-fields validation (`name`/`title`, `card.id`,
   `card.code`, `runtime.pack`; `hypercard_extractors.go:306-326`).
2. **Backend emit — final-only first (verified constraint).** chathost's
   `ArtifactExtractor func(assistantText string) []WidgetArtifact` runs **only in
   `OnFinalTurn`**, once per prompt after inference completes; the current path
   publishes a single `WidgetInstanceStarted` with `WIDGET_STATUS_READY`
   (`runtime.go` `publishArtifactsFromTurn`). So v1 = publish the final
   `inventory.codeCard` widget with props verbatim: `{ title, name,
   artifact:{id,data}, runtime:{pack}, card:{id, code} }`. **There is no streaming
   extraction today** — do not design the frontend around `status:"streaming"`
   updates in v1.
   *Optional streaming v2:* the layers below support it — chatapp's
   `PromptRequest.Runtime.WrapSink` lets you wrap the streaming event sink (chathost
   currently doesn't set it), and the widgets plugin has the full lifecycle
   (`ChatWidgetInstanceStarted/Patched/Completed/Removed`, all projecting into
   `ChatWidgetInstance` entity updates). A debounced in-sink extractor emitting
   Started(streaming)→Patched→Completed via `hub.Publish` reproduces the old pinoweb
   controller. Ship v1 first; the proposal-card UX (step 3) doesn't need streaming.
3. **Frontend widget.** `defineWidget('inventory.codeCard', CodeCard)`. Two options:
   - *Proposal (old-chat parity):* Open/Edit buttons → `buildArtifactOpenWindowPayload({
     artifactId: artifact.id, title, runtimeSurfaceId: card.id, bundleId:'inventory' })`
     → `openWindow(...)`; the existing `createInventoryCardAdapter` +
     `RuntimeSurfaceSessionHost` execute it unchanged.
   - *Inline live:* render `<RuntimeSurfaceSessionHost>` directly in the widget with a
     per-card `sessionId` against a `['ui']` (and `['kanban']`) bundle.
4. **Re-add the projection bridge** (replaces the dead os-chat middleware): on a final
   `inventory.codeCard` widget/timeline event, call
   `registerRuntimeSurface(card.id, card.code, runtime.pack)` — exported from
   `os-scripting/src/plugin-runtime/runtimeSurfaceRegistry.ts` (**not**
   `artifactRuntime.ts`), signature `(surfaceId, code, packId)`. It notifies
   `onRegistryChange`, so any live host live-injects it and any later-opened surface
   window injects it during `ensureSession`. Simplest wiring on the new stack: do it
   inside the `inventory.codeCard` widget component on mount (widgets only render on
   final entities in v1), or from an `onDebugEvent` ui-event listener if you want it
   independent of rendering.
5. **Packs already registered** at `renderInventoryApp.tsx:40-43`
   (`ui.card.v1`, `kanban.v1`). For inline hosting, open the session against a bundle
   whose `plugin.packageIds` includes `'ui'` — the existing `STACK` bundle already does.

Key old files to port from: `_pinoweb_legacy/{hypercard_extractors,hypercard_events,
hypercard_middleware,card_prompt,middleware_definitions}.go`,
`prompts/runtime-card-policy.md`; and on the frontend
`os-scripting/src/plugin-runtime/runtimeSurfaceRegistry.ts` (`registerRuntimeSurface`
+ `onRegistryChange` — the live registry you call into),
`os-scripting/src/hypercard/artifacts/{artifactProjectionMiddleware,artifactRuntime}.ts`
(bridge reference + `buildArtifactOpenWindowPayload`)
+ `hypercard/timeline/hypercardCard.tsx` (as the renderer reference).

---

## 7. Phased implementation plan

- **Phase 1 — Assistant chrome parity.** Bring `assistantModule.tsx` up to the
  inventory window's level: profile selector, starter suggestions, connection badge,
  Copy Conv ID, inline debug. Factor the shared chrome so assistant + inventory share
  one component.
- **Phase 2 — Stats footer.** Frontend-only: consume the
  `ChatProviderCallMetadataUpdated`/`ChatProviderCallFinished` UI events already on
  the WS (§5); build the `StatsFooter` equivalent.
- **Phase 3 — Renderer registry.** Introduce a timeline renderer registry keyed by
  entity `kind` (mirrors the old `timelineRenderers` prop +
  `renderers/rendererRegistry.ts`), so cards/widgets/tools plug in uniformly. Fold
  `renderMode` into the render ctx. **Verified constraint:** chat-overlay's
  `ChatMessages` takes only `{bottomRef}` and is a hardcoded switch over
  `message | widget | tool_call` — any other entity `kind` is silently dropped, and
  there is no override prop. So the registry cannot extend `ChatMessages`; build a
  local `ChatTimeline` replacement that walks `selectTimelineEntities` through the
  registry (reusing `WidgetOutlet`/`ToolCallOutlet` for the built-in kinds), then
  upstream an extension point into chat-overlay in Phase 6. Note `widget` entities
  already render inline automatically via `WidgetOutlet` — which is why §6 rides the
  widget rail instead of inventing a new entity kind.
- **Phase 4 — Debug windows with perf (§4).** Port the bounded buffers, ref-gated
  ingestion, normalized incremental model, memoized snapshot, and lazy tree; add
  virtualization + lazy serialization.
- **Phase 5 — JS HyperCard apps (§6).** Backend: extend the artifact extractor to
  carry `code` + `runtime.pack`; publish a code-card widget. Frontend: a renderer
  that mounts `RuntimeSurfaceSessionHost` for the generated pack/code.
- **Phase 6 — Upstream + cleanup.** Promote the generic debug windows + stats footer
  + renderer registry into `react-chat`; retire os-chat from remaining consumers.

## 8. Validation matrix

| Check | How |
|---|---|
| Assistant has profiles/suggestions/debug | open assistant window; parity with inventory |
| Stats footer shows real tokens + tok/s | run a prompt; compare to `--print-inference-settings`/usage frame |
| Renderer registry dispatches by kind | register a test renderer; confirm it renders its entity |
| Event Viewer bounded + lazy | flood deltas; memory bounded, expand lazily |
| Timeline Debug incremental | stream upserts; only changed entity re-renders |
| JS card runs | prompt for an interactive card; a live RuntimeSurface renders and responds to input |

## 9. File reference index

Old (reference, do not ship): `workspace-links/go-go-os-frontend/packages/os-chat/src/chat/`
— `components/ChatConversationWindow.tsx`, `components/StatsFooter.tsx`,
`renderers/rendererRegistry.ts`, `debug/{EventViewerWindow,TimelineDebugWindow,
timelineDebugModel,StructuredDataTree,eventBus}.{ts,tsx}`, `state/{timelineSlice,
selectors,chatSessionSlice}.ts`. JS-app runtime:
`packages/os-scripting/src/{runtime-host,runtime-packs,hypercard}`,
`packages/os-ui-cards/src/runtime-packs/uiCardV1Pack.tsx`. Old backend:
`workspace-links/go-go-app-inventory/pkg/_pinoweb_legacy/`.

New (ship): `apps/os-launcher/src/app/assistantModule.tsx`;
`workspace-links/go-go-app-inventory/apps/inventory/src/launcher/chat/*`;
`pkg/chathost/*`; `cmd/wesen-os-launcher/inventory_artifacts.go`. Design context:
ticket WESEN-OS-STOCKTAKE-2026-07 design-doc/06 (inventory react-chat migration).
