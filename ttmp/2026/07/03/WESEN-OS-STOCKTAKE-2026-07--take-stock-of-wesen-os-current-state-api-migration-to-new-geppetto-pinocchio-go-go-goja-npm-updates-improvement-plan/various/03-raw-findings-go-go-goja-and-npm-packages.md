---
Title: Raw findings — go-go-goja API drift and go-go-os npm package family
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - go-go-goja
    - wesen-os
DocType: reference
Intent: short-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Raw evidence: go-go-goja v0.4.6→v0.8.3 API changes (engine move, builder renames, xgoja v2, express/gojahttp), and the go-go-os-frontend/chat/backend package inventory with published npm versions."
LastUpdated: 2026-07-03T12:50:00-07:00
WhatFor: "Provenance for the go-go-goja and npm migration sections of the main design doc."
WhenToUse: "When verifying old→new API pairs before coding the migration."
---

# Raw findings — go-go-goja + npm packages (Explore agent report, 2026-07-03)

## Part A — go-go-goja Go API changes

### A0. What wesen-os pins today
- `wesen-os/go.mod:75` → `go-go-goja v0.4.6` (indirect), plus indirect `dop251/goja v0.0.0-20260219130522` and `goja_nodejs v0.0.0-20260212111938`. No replace directives in go.mod.
- wesen-os has **no direct** go-go-goja imports; consumed transitively via workspace-links submodules: **geppetto** (`pkg/inference/tools/scopedjs`, `pkg/js/runtime`, `pkg/js/modules/geppetto`, `pkg/js/runtimebridge`), **pinocchio** (`pkg/webchat`, `cmd/pinocchio/cmds/js.go`), **go-go-gepa** (`pkg/jsbridge`, `pkg/dataset/generator`), **go-go-os-backend** (`pkg/vmmeta` → `go-go-goja/pkg/jsdoc/*`, `pkg/jsparse`).
- Consumers import root `go-go-goja/engine` and `go-go-goja/pkg/runtimeowner` (old layout).
- Standalone `~/code` repos already moved: go-go-os-chat and go-go-os-backend on **go-go-goja v0.8.3**; go-go-os-chat on **geppetto v0.13.3**.

### A1. Checkouts
- OLD: workspace go-go-goja, HEAD `03e0656` 2026-04-02. Modules: `database`, `exec`, `fs` only. pkg/: doc, docaccess, hashiplugin, inspector, inspectorapi, jsdoc, jsparse, jsverbs, repl, runtimeowner, tsgen. No express/xgoja/gojahttp. Engine at repo root `engine/`.
- NEW: `~/code/wesen/go-go-golems/go-go-goja`, HEAD `a489f92` 2026-06-17. Engine at `pkg/engine/`.

### A2. Significant PRs April→HEAD
- #36 extract-express-goja + #64/#74 goja-express-auth — `modules/express` + `pkg/gojahttp` HTTP/auth stack.
- #39/#40/#41 xgoja + js-providers, #48 xgoja-embed-assets, #49 xgoja-env-app-name, #62/#59 add-xgoja-build-env, #73 xgoja-ts-support, **#76 xgoja v2 runtime cutover**, #77 xgoja-sourcegraph-parser, #68 add-provider-dts — the `pkg/xgoja/*` subsystem incl. `providerapi.ProviderRegistry`.
- #78 expose-host-services — `pkg/xgoja/hostauth`.
- #75/#72 goja-sessionstream, durable-objects branch.
- #58 add-db-modules, #32 yaml, #31 event-emitter, #30 primitive modules, #21 timer — new default modules (crypto, events, os, path, time, timer, uidsl, yaml).
- #55/#56/#57 goja-runtime-flags, #66/#60 bump-goja, #53/#46 module docs, #63 jsverb-filter, #67 simplify-verbs-loading, #51 root-jsverbs-option, #65 hot-reload (`pkg/xgoja/hotreload`), #80 debounce-fswatch.

### A3. Old→new API pairs

**Package move:** `go-go-goja/engine` → `go-go-goja/pkg/engine` (package name still `engine`; `factory.go`, `module_specs.go`).

**Builder/factory (`factory.go`):**
| OLD | NEW |
|---|---|
| `NewBuilder(opts ...Option) *FactoryBuilder` | `NewRuntimeFactoryBuilder(opts ...Option) *RuntimeFactoryBuilder` |
| `FactoryBuilder` | `RuntimeFactoryBuilder` |
| `Factory` | `RuntimeFactory` |
| `(*FactoryBuilder).Build() (*Factory, error)` | `(*RuntimeFactoryBuilder).Build() (*RuntimeFactory, error)` |
| `(*Factory).NewRuntime(ctx) (*Runtime, error)` | `(*RuntimeFactory).NewRuntime(opts ...RuntimeOption)` — ctx replaced by variadic RuntimeOption (`options.go`) |

**Builder methods:**
| OLD | NEW |
|---|---|
| `WithModules(mods ...ModuleSpec)` | `WithModules(mods ...RuntimeModuleRegistrar)` |
| `WithRuntimeModuleRegistrars(...)` | removed (folded into WithModules) |
| — | `UseModuleMiddleware(mw ...ModuleMiddleware)` — new, preferred to narrow default modules |
| `WithRuntimeInitializers(...)`, `WithRequireOptions(...)` | unchanged |

**Module-spec interfaces (`module_specs.go`):**
| OLD | NEW |
|---|---|
| `ModuleSpec { ID(); Register(reg *require.Registry) error }` | `RuntimeModuleRegistrar { ID(); RegisterRuntimeModule(*RuntimeModuleRegistrationContext, *require.Registry) error }` |
| `NativeModuleSpec` | `NativeModuleRegistrar` |
| `RegisterRuntimeModules(...)` (plural) | `RegisterRuntimeModule(...)` (singular) |
| `RuntimeContext` | `RuntimeInitializationContext` |
| `RuntimeModuleContext` | `RuntimeModuleRegistrationContext` |
| `DefaultRegistryModules() ModuleSpec` | internal `defaultRegistryModule(name)` + middleware pipeline (`SelectAll`, `Safe`, `Only`, `Exclude`, `Add`, `Custom` in `module_middleware.go`) |

**modules package**: `NativeModule{Name/Doc/Loader}`, `Registry`, `Register`, `DefaultRegistry`, `GetModule`, `ListDefaultModules`, `SetExport` unchanged. Removed: `modules.EnableAll(reg)` → use `modules.DefaultRegistry.Enable(reg)`.

**runtimeowner** (`pkg/runtimeowner/runner.go`, path unchanged): `NewRunner(vm, scheduler, Options) Runner` → `NewRuntimeOwner(vm, scheduler, Options) RuntimeOwner`; `Options` gained `IncludePanicStack bool`.

**New NewRuntime behavior**: also enables `buffer.Enable`, `url.Enable`, performance globals, console timers, `process`/`node:process` module, stores `runtimebridge.RuntimeServices` on VM. OLD only enabled `console`.

### A4. New capabilities worth adopting
- New default modules: crypto, events, os, path, time, timer, yaml, uidsl (plus existing database, exec, fs).
- `modules/express` (express.go, auth_builders.go, typescript.go) — Express-style HTTP router in JS with auth DSL (`express.user().required().mfaFresh(...)`) backed by `pkg/gojahttp.SecuritySpec/ResourceSpec`.
- `pkg/gojahttp` + `pkg/gojahttp/auth/*` — sessionauth (sqlstore), devauth, appauth, audit.
- `pkg/xgoja/*` — xgoja v2 generated-binary framework: app, providerapi, providers, hostauth, hotreload, dtsgen (.d.ts), sourcegraph, testadapter/testcobra/testprovider.
- `providerapi.ProviderRegistry` (`pkg/xgoja/providerapi/provider_registry.go`): `NewProviderRegistry()`; `Package(id, entries...)`, `ResolveModule`, `ResolveVerbSource`, `ResolvePackageCapabilities`, `ResolveHelpSource`, `ResolveCommandSetProvider`, `Packages()`.

## Part B — npm / frontend packages

### B1. Repos and published packages

**go-go-os-frontend** (main `77729a67` 2026-06-01) — npm platform repo (root package `hypercard-react`, workspaces `packages/*`, `apps/*`). No longer owns inventory app or launcher bundle. Published `@go-go-golems/*`:

| package | repo version | npm published |
|---|---|---|
| os-core | 0.1.3 | 0.1.2 |
| os-repl | 0.1.6 | 0.1.6 |
| os-widgets | 0.1.3 | 0.1.3 |
| os-kanban | 0.1.4 | 0.1.4 |
| os-scripting | 0.1.3 | — |
| os-ui-cards | 0.1.3 | — |
| os-chat | 0.1.1 | 0.1.1 |
| os-confirm | 0.1.1 | — |
| os-shell | 0.1.1 | 0.1.1 |

Published via npm trusted publishing CI (commits `e5e5fa23`, `801209f0`, `77729a67`; Node 24, Vault/OIDC). `macos1-react` no longer a published package on current main (exists only in older snapshot).

**go-go-os-chat** (`a5acf4b` 2026-06-07) — Go backend repo (not npm). pkg/: chatservice, inference, persistence, profilechat, redisstream, sem, webchat, docs. Deps: **geppetto v0.13.3**, **go-go-goja v0.8.3**, go 1.26.3.

**go-go-os-backend** (`62bf48c` 2026-06-07) — Go backend repo. `pkg/backendhost`: AppBackendModule contract, lifecycle (Init/Start/Health/Stop), namespaced routes `/api/apps/<app-id>`, manifest endpoint `/api/os/apps`. Dep: go-go-goja v0.8.3 only.

### B2. Relations
- go-go-os-frontend = shared React/npm UI packages; go-go-os-backend = Go host contracts; SPA bundle built by `wesen-os/apps/os-launcher`; go-go-os-chat = geppetto-backed Go chat service plugged in as backend module.
- Only go-go-os-chat depends on geppetto (v0.13.3). All three sit on go-go-goja.

### B3. What wesen-os consumes
- npm workspace root: `apps/*`, `workspace-links/*/packages/*`, `workspace-links/*/apps/*`.
- `workspace-links/go-go-os-frontend` submodule pinned at `c74347e` 2026-04-09; its packages all at **0.1.0** (incl. `@go-go-golems/macos1-react@0.1.0`), consumed via `workspace:*` by `apps/os-launcher`: os-chat, os-shell, os-core, os-scripting, os-kanban, os-repl, os-ui-cards, os-widgets.
- `workspace-links/go-go-os-chat` and `go-go-os-backend` are Go-only (no packages/), linked for the Go side.
- Build: `npm run build` → `build -w apps/os-launcher`; then `launcher:ui:sync` + `launcher:binary:build`.
- **Gap**: wesen-os pinned to 0.1.0 April-9 snapshot; current main publishes 0.1.1–0.1.6. Migration = bump submodule and/or switch `workspace:*` → published npm versions.

### B4. Frontend API changes April→June (48 commits since Apr-9 snapshot)
- VM source module generation (`9246f3a3`, `eb66530e`, `0aacc8ed`, `f4f445b5` CI gate); os-widgets added to VM stack (`8d470262`).
- Launcher module surface: os-widgets explicit `./launcher` export → `packages/os-widgets/src/launcher/modules.tsx`; launcher-state modules (`streamLauncherState.ts`, `steamLauncherState.ts`). Formalized subpath exports: `.`, `./theme`, `./launcher`.
- Theming: `parts.ts` styling-token surface in os-core, os-widgets, os-repl, os-kanban; theme entry **side effects must be preserved** (`6af07b94`, `2bdf55de`) — tree-shaking hazard on migration.
- Redux: no shared `*slice*` convention; launcher state in dedicated `*State.ts` modules.
- New docs in `go-go-os-frontend/docs/`: js-api-user-guide-reference.md, runtime-broker-and-session-source-guide.md, runtime-concepts-guide.md, authoring-surface-source-editing-guide.md, npm-publishing-playbook.md.

### Key file paths
- OLD goja engine: `os-openai-app-server/go-go-goja/engine/{factory.go,module_specs.go}`, `modules/common.go`
- NEW goja engine: `~/code/wesen/go-go-golems/go-go-goja/pkg/engine/{factory.go,module_specs.go,module_middleware.go,options.go}`
- NEW capabilities: `modules/express/{express.go,auth_builders.go}`, `pkg/gojahttp/auth/*`, `pkg/xgoja/providerapi/provider_registry.go`, `pkg/xgoja/{app,hostauth,hotreload,dtsgen,sourcegraph}/`
- runtimeowner: `go-go-goja/pkg/runtimeowner/runner.go` (both)
- npm: `~/code/wesen/go-go-golems/go-go-os-frontend/packages/os-*/package.json`, `packages/os-widgets/src/launcher/modules.tsx`, `packages/*/src/parts.ts`
- Go backends: `~/code/wesen/go-go-golems/go-go-os-chat/go.mod`, `~/code/wesen/go-go-golems/go-go-os-backend/{go.mod,pkg/backendhost}`
