---
Title: Raw findings — geppetto & pinocchio API drift April→June 2026
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - geppetto
    - pinocchio
DocType: reference
Intent: short-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Raw evidence: geppetto v0.11.8→main (canonical events rewrite, additive elsewhere) and pinocchio v0.10.13→main (webchat+sem deleted, replaced by chatapp+sessionstream), with old→new API pairs and import counts."
LastUpdated: 2026-07-03T13:00:00-07:00
WhatFor: "Provenance for the Go API migration sections of the main design doc."
WhenToUse: "When verifying old→new API pairs before coding the migration."
---

# Raw findings — geppetto & pinocchio drift (Explore agent report, 2026-07-03)

## 0. Baseline pins

- `wesen-os/go.mod`: geppetto **v0.11.8** (tag = 2026-03-30), pinocchio **v0.10.13-0.20260330222144-10fd36ccc06f** (commit `10fd36ccc06f`, 2026-03-30).
- `go.work` overrides both with `./workspace-links/geppetto` and `./workspace-links/pinocchio` (April-6 working copies). Effective baseline = workspace checkouts (`85b637f` PR #324 / `85a230a` PR #133, both 2026-04-01).
- Current mains: geppetto `1ad8be2b` (2026-06-06, PR #372); pinocchio `554bca2` (2026-06-07, PR #172).
- Consumer import counts (workspace-wide): geppetto `pkg/turns` (124), `pkg/steps/ai/settings` (92), `pkg/events` (86), `pkg/inference/engine` (60), `pkg/inference/tools` (52), `pkg/engineprofiles` (44); pinocchio `pkg/inference/runtime` (37), `pkg/sem/pb/proto/sem/timeline` (33), `pkg/persistence/chatstore` (31), `pkg/webchat` (19), `pkg/cmds/profilebootstrap` (16), `pkg/webchat/http` (13).

## 1. Headline

- **geppetto**: the only hard break is `pkg/events` — fully rewritten to a canonical correlation-based event model. turns, engine, factory, tools, settings, types, session, middleware, engineprofiles, embeddings/config, event-router are stable or additive.
- **pinocchio**: large break — `pkg/webchat` (HTTP/timeline/SEM server) and `pkg/sem` (SEM protobuf model + registry) **deleted**, replaced by new `pkg/chatapp` built on new external repo **`github.com/go-go-golems/sessionstream`**. Also removed: `pkg/cmds/helpers`, `pkg/ui/profileswitch`, `pkg/ui/runtime`.

## 2. Significant PRs April→HEAD

### geppetto
- **#346/#348 task/unify-events** — event-model rewrite (primary break); **#344** adds `events.Correlation` + builders.
- #343 add-observers — new `pkg/observability`.
- #349 fix-segment-index, #350 preserve-thinking-summary, #336 fix-reasoning-boundaries, #339 add-openai-thinking-support, #345 fix-double-anthropic-message — reasoning/segment streaming fixes.
- #351 add-model-metadata; #355 add-profile-introspection (`ExtensionCodecRegistry`, `ProfileExtensionKey[T]`).
- #357 add-embeddings-profiles, #372 bug/store-runtime-owner (diff is embeddings-scoped: settings_factory + JS embeddings API).
- #358 add-js-providers, #367 task/geppetto-js, #369 goja-runtime-flags, #364 bump go-go-goja v0.7.0, #371 llm-proxy — JS/goja work; new `pkg/js/modules/geppetto/provider`.
- #359 logcopter, #363 glazed-lint; #340/#342 use-sessionstream-coinvault.

### pinocchio
- **#138 task/extract-webchat** then **#164/#168 task/chatbot-react** — webchat → `pkg/chatapp` (+ `pkg/spa` embedded React SPA).
- **#139 task/remove-sem** — delete SEM protobuf model.
- #141–#145 use-sessionstream-coinvault, #146 unify-events — adopt sessionstream + canonical events.
- #150 add-model-metadata, #153/#154 structured-data CLI, #156 add-multiturn-rpc, #155 add-profiles-helper.
- #169 geppetto-js, #171 goja-runtime-flags, #172 bump-goja, #170 chat-provider-0.2.1.
- #137 fix-piniocchio-profile-env, #136 pinocchiorc.

## 3. geppetto events: old→new

Old: `pkg/events/chat-events.go` (everything) + `tool_aggregator.go`. New: split into `chat-events.go` (only `EventType`, `EventImpl`, `EventMetadata`, `NewEventFromJson`), `canonical_events.go`, `canonical_tool_events.go`, `builtin_events.go`, `error_events.go`, `log_info_events.go`, `correlation*.go`. **28 exported symbols removed.** New constructors take `events.Correlation` as first-class arg.

| Old (removed) | New (canonical) | File |
|---|---|---|
| `NewStartEvent(md)` / `EventPartialCompletionStart` | `NewTextSegmentStartedEvent(md, corr, role)` | `canonical_events.go:118` |
| `NewPartialCompletionEvent(md, delta, completion)` | `NewTextDeltaEvent(md, corr, delta, text, sequence)` | `canonical_events.go:134` |
| `NewTextEvent` / `NewFinalEvent` | `NewTextSegmentFinishedEvent(md, corr, text, finishReason)` | `canonical_events.go:149` |
| `NewThinkingPartialEvent` | `NewReasoningDeltaEvent(md, corr, delta, text, sequence)` (+`WithSource`) | `canonical_events.go:180/184` |
| `NewReasoningTextDelta` / `NewReasoningTextDone` | `NewReasoningDeltaEvent` / `NewReasoningSegmentFinishedEvent` | `canonical_events.go:180/200` |
| `NewToolCallEvent(md, ToolCall)` | `NewToolCallStartedEvent(md, corr, id, name)` + `NewToolCallRequestedEvent(md, corr, id, name, input)` | `canonical_tool_events.go:10/43` |
| `NewToolCallExecuteEvent` | `NewToolExecutionStartedEvent(md, corr, id, name, input)` | `canonical_tool_events.go:59` |
| `NewToolResultEvent` / `NewToolCallExecutionResultEvent` | `NewToolResultReadyEvent(md, corr, id, name, result, status)` + `NewToolCallFinishedEvent(md, corr, id, name, status)` | `canonical_tool_events.go:76/92` |
| `NewToolEventAggregator()` (tool_aggregator.go deleted) | removed — correlation model replaces aggregation | — |
| — | `NewRunStartedEvent/RunFinished/RunStopped/RunFailed` | `canonical_events.go:11-53` |
| — | `NewProviderCallStartedEvent/MetadataUpdatedEvent(usage)/FinishedEvent` | `canonical_events.go:70-104` |
| — | `NewToolCallArgumentsDeltaEvent(md, corr, id, delta, arguments, sequence)` | `canonical_tool_events.go:27` |

EventType consts removed: `EventTypePartialCompletion`, `EventTypePartialThinking`, `EventTypeStatus`, `EventTypeToolResult`, `EventTypeToolCall`, `EventTypeFinal`, `EventTypeToolCallExecutionResult`. Added: `EventTypeRunFinished`, `EventTypeProviderCallMetadataUpdated`, `EventTypeTextSegmentFinished`, `EventTypeReasoningSegmentFinished`, `EventTypeToolCallArgumentsDelta`, `EventTypeInterrupt`.

Unchanged/safe: `EventMetadata` (byte-identical), `Event`/`EventImpl`, `NewEventFromJson`, `ToTypedEvent[T]`, `MetadataSettingsSlug`, entire `event-router.go` (`EventRouter`). `builtin_events.go` events identical (relocated). `NewInterruptEvent`, `NewErrorEvent`, `NewLogEvent`, `NewInfoEvent` relocated, signatures unchanged. `pkg/inference/tools` gained `WithCurrentToolCorrelation(ctx, corr)` / `CurrentToolCorrelationFromContext(ctx)` (additive).

## 4. geppetto stable packages (verified: no removed exported symbols)

- `pkg/turns` — fully stable (only logcopter.go added).
- `pkg/inference/engine` — `Engine.RunInference(ctx, *turns.Turn) (*turns.Turn, error)` unchanged.
- `pkg/inference/engine/factory` — `NewEngineFromSettings`, `NewEngineFromParsedValues` unchanged; `NewStandardEngineFactory()` now variadic (backward-compatible) with `WithOpenAIOptions/WithClaudeOptions/WithGeminiOptions/WithOpenAIResponsesOptions`.
- `pkg/inference/session`, `middleware`, `middlewarecfg`, `tools` — stable.
- `pkg/steps/ai/types`, `pkg/steps/ai/settings` (+provider subpkgs) — stable at top level (model metadata additive).
- `pkg/engineprofiles` — same files; additive: `ExtensionKey`, `ProfileExtensionKey[T]`, `ExtensionCodecRegistry`, `InMemoryEngineProfileStore`, `YAMLFileEngineProfileStore`, `MergeInferenceSettings`, `VersionConflictError`. **Behavioral note:** new YAML decoders reject the legacy `profiles:` map format — profile YAML files may need reformatting to single-registry layout.

New geppetto packages worth adopting: `pkg/observability`, `pkg/js/modules/geppetto/provider` (+hostservicesexample), `pkg/steps/ai/imageparts`.

## 5. pinocchio break details

### 5a. webchat → chatapp
Old `pkg/webchat/` (~60 files): `Server`/`NewServer`/`NewServerFromDeps`, `Router`/`NewRouter(FromDeps)`/`RouterOption`/`RouterDeps`, `http/api.go` (`NewChatHandler`/`NewWSHandler`/`NewTimelineHandler`, `ChatService`/`StreamService`/`TimelineService`), `sem_translator.go`, `timeline_projector.go`, `stream_hub.go`, `ws_publisher.go`, `turn_persister.go`.

New `pkg/chatapp/`:
- `chat.go` — `Engine`, `NewEngine(opts ...Option)`, `WithHooks`, `WithTurnStore(chatstore.TurnStore)`, `WithChunkDelay`, `Hooks`, `RegisterSchemas(*sessionstream.SchemaRegistry, ...ChatPlugin)`, `Install(*sessionstream.Hub, *Engine)`.
- `service.go` — `Service`, `NewService(hub *sessionstream.Hub, engine *Engine)`, `PromptRequest`.
- `serverkit/` — `contracts.go` (`CreateSessionRequest/Response`, `SubmitMessageRequest/Response`, `StopSessionResponse`, `SessionSnapshotResponse`, `SnapshotEntity`, `ErrorResponse`), `http.go` (`DecodeJSON`, `WriteJSON`, `WriteError`, `ParseSessionPath`, `EncodeSnapshotResponse`, `EncodeProtoJSON`), `stores.go`, `turn_persistence.go`.
- `rpc/jsonl/` (multiturn RPC), `export/` (minitrace/render/service), `plugins/`, `widgets/`, `frontendtools/`.
- `pkg/spa/dist/` — embedded built React SPA (replaces old `staticFS fs.FS` param).

No drop-in shim: `webchat.NewServer(...)` → `sessionstream.Hub` + `chatapp.Engine`/`Service` + serverkit handlers. New dep: `github.com/go-go-golems/sessionstream` (repo at `~/code/wesen/go-go-golems/sessionstream`; `pkg/sessionstream`, `pkg/sessionstream/hydration/sqlite`).

### 5b. sem → deleted
Old: `pkg/sem/registry`, `pkg/sem/pb/proto/sem/{base,domain,team,timeline}` (consumer: timeline 33, base 3, domain 1, registry 4). New: `pkg/chatapp/pb/proto/pinocchio/chatapp/{v1,widgets/v1,frontendtools/v1,rpc/v1}` + sessionstream protos. Schema-policy test forbids `google.protobuf.Struct`. Hard proto migration — no name-compatible replacement; re-express against chatapp/sessionstream schemas.

### 5c. Other removals
- `pkg/cmds/helpers` (GeppettoLayersHelper, ParseGeppettoLayers, WithProfile*, ResolveCLIEngineSettings, ResolveBaseInferenceSettings) → removed; migrate to `pkg/cmds/profilebootstrap` (now concrete `ResolvedCLIEngineSettings`, `ResolveBaseInferenceSettings`, `ResolveCLIEngineSettings(FromBase)`, `NewEngineFromResolvedCLIEngineSettings[WithFactory]`). Old `profilebootstrap.ResolveParsedBaseInferenceSettings[WithBase]` dropped.
- `pkg/ui/profileswitch` (Backend, Manager, ProfileDiff, PickerModel) → removed, no in-tree replacement (tied to old watermill webchat UI).
- `pkg/ui/runtime` (ChatBuilder, ChatSession, HandlerFactory, HandlerContext) → removed; superseded by chatapp/sessionstream.

### 5d. Stable pinocchio packages
`pkg/inference/runtime` (37 uses) — stable: `ConversationRuntimeRequest`, `ComposedRuntime`, `RuntimeBuilder(Func)`, `ProfileRuntime`, `ResolveRuntimePlan`, `MergeProfileRuntime`, `BuildRuntimeFingerprint*`, `ProfileRuntimeFromEngineProfile`, `SetProfileRuntime` intact; additive `EventSinkWrapper func(events.EventSink)(events.EventSink,error)` + extra ComposedRuntime field. Also present: `pkg/persistence/chatstore`, `pkg/cmds/profilebootstrap`, `pkg/cmds/cmdlayers`, `pkg/cmds/run`, `pkg/redisstream`, `pkg/middlewares/agentmode`, `pkg/filefilter`, `pkg/tui/*`, `pkg/security`.

New pinocchio packages worth adopting: `pkg/chatapp/export` (minitrace/render), `pkg/chatapp/rpc/jsonl`, `pkg/configdoc`, `pkg/spa`, `pkg/chatapp/{plugins,widgets,frontendtools}`.

## 6. Notable new capabilities

- Canonical event + correlation model (geppetto pkg/events).
- **sessionstream** (new repo): session hub + schema registry + sqlite hydration — shared streaming/timeline backbone replacing SEM.
- chatapp: plugin-based chat server, React SPA embed, JSONL multiturn RPC, minitrace export/rendering, concrete-protobuf timeline schemas.
- Observability (pkg/observability) + logcopter codegen.
- Embeddings profiles & JS embeddings API (#357/#372).
- JS/goja provider modules (`pkg/js/modules/geppetto/provider`), runtime flags.
- Profile introspection/extension codecs (#355); model metadata (#351).
- OpenAI/Anthropic thinking & reasoning fixes (#339/#350/#336/#345/#349).
- Pinocchio structured-data CLI (#153/#154), multiturn RPC (#156).

## 7. Uncertain / to verify during the port

- PR #372 (`bug/store-runtime-owner`) diff is embeddings-scoped; a separate chatstore-owner change was not found — verify.
- `pkg/steps/ai/settings` verified at top level only; spot-check struct fields if marshaled.
- chatapp/sessionstream proto ↔ old sem/timeline message mapping not field-diffed; treat as rewrite, derive names from `pkg/chatapp/pb/proto/pinocchio/chatapp/v1`.
- "events is the only geppetto break" based on exported-symbol diffs of consumer-imported packages (all zero removals except pkg/events).
