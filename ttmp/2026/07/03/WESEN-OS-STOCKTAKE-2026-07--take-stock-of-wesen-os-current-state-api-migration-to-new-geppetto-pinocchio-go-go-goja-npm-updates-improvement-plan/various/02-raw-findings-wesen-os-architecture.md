---
Title: Raw findings — wesen-os architecture and dependency pins
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - wesen-os
DocType: reference
Intent: short-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Raw evidence sweep of the workspace wesen-os checkout: purpose, cmd/pkg/apps structure, go.mod/go.work pins, npm workspace layout, geppetto/pinocchio/go-go-goja call sites, git state, relevant ttmp tickets."
LastUpdated: 2026-07-03T12:40:00-07:00
WhatFor: "Provenance for the architecture sections of the main design doc."
WhenToUse: "When verifying or extending architecture claims in the design doc."
---

# Raw findings — wesen-os architecture (Explore agent report, 2026-07-03)

Primary checkout: `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os` (branch `task/sqlite-federation-runtime-fix`)
Comparison checkout: `~/code/wesen/wesen-os` (branch `main`, last commit `068a8b8` 2026-03-01, much older/simpler).

## 1. What wesen-os IS

wesen-os is the **composition runtime repository** — a web "desktop OS" shell that composes multiple backend app modules and a federated React frontend into a single binary. From `README.md:1-10`: "`wesen-os` is the composition runtime repository." It owns: launcher shell frontend (`apps/os-launcher`), launcher dist embedding (`pkg/launcherui/dist`), the composed runtime binary (`cmd/wesen-os-launcher`), and backend module registration for composed apps (inventory + GEPA).

It is explicitly a **split-repo composition point** (`README.md:11-23`, `AGENT.md:13-19`): the launcher frontend imports platform/app code from sibling repos (`go-go-os-frontend`, `go-go-app-inventory`, `go-go-app-arc-agi-3`, `go-go-os-backend`) expected side-by-side. The product is a browser desktop ("macOS1"-style shell) with launchable apps: OS assistant chat, inventory, sqlite browser, GEPA optimizer, ARC-AGI player, CRM, todo, kanban, JS REPL, HyperCard REPL/tools, apps-browser, rich widgets.

Key docs: `docs/startup-playbook.md`, `docs/hypercard-runtime-pack-playbook.md`, `docs/widget-dsl-porting-playbook.md`, `docs/docs-source-mount-playbook.md`, `docs/window-resize-behavior.md`, plus `AGENT.md`.

## 2. Architecture map

### cmd/ entrypoint
Single binary: `cmd/wesen-os-launcher/`:
- `main.go` — Cobra root + Glazed command `wesen-os-launcher`, default listen `:8091` (`main.go:97`). Builds all backend modules, a `backendhost.ModuleRegistry`, an `http.ServeMux`, serves embedded SPA at `/` (`main.go:375`).
- `profile_bootstrap.go` / `app_profile_surface.go` — geppetto engine-profile registry bootstrap.
- `federation_registry_endpoint.go` — serves `/api/os/federation-registry` from a JSON file (`federation_registry_endpoint.go:15`).
- `docs_endpoint.go` — `/api/os/help` + `/api/os/docs`.
- `static/index.html` embedded via `//go:embed static` (`main.go:42-43`) as inventory webchat static FS.

Routes/ports: HTTP on `--addr` (`:8091`). App routes under `/api/apps/<appID>` via `backendhost.MountNamespacedRoutes` (`main.go:368-373`). Apps manifest via `backendhost.RegisterAppsManifestEndpoint` (`main.go:363`). Legacy routes `/chat`, `/ws`, `/api/timeline` return 404 (`main.go:413-426`). ARC raw runtime on loopback `127.0.0.1:18081` (`main.go:135`).

### pkg/ structure
Thin launcher-owned adapters wrapping sibling repos:
- `pkg/launcherui/handler.go` — `//go:embed all:dist` SPA handler with index.html fallback (`handler.go:11-21`); `dist/` copied in by `launcher:ui:sync`.
- `pkg/sqlite/module.go` — wraps `go-go-app-sqlite` into a `backendhost.AppBackendModule` (row limits, allow/denylists, redaction, rate limiting, audit events).
- `pkg/gepa/module.go` — wraps `go-go-gepa/pkg/backendmodule`.
- `pkg/arcagi/module.go` — ARC-AGI backend (dagger/raw driver).
- `pkg/assistantbackendmodule/` — OS assistant chat service (`module.go`, `context_store.go`, `app_context.go`, `builtin_profiles.go`); AppID `"assistant"`, wraps `go-go-os-chat/pkg/chatservice` + pinocchio webchat.
- `pkg/doc/`, `pkg/doc.go` — help docs embed.

### apps/ (frontend app model)
One app tree: `apps/os-launcher/` — Vite + React 19 SPA (`@go-go-golems/os-launcher`).
- **App model**: TypeScript "launcher modules" of type `LaunchableAppModule` (from `@go-go-golems/os-shell`), collected in `src/app/modules.tsx:24-39`, registered via `createAppRegistry(launcherModules)` in `src/app/registry.ts:1-4`. Modules come from npm packages' `/launcher` export (`@go-go-golems/crm/launcher`, `@go-go-golems/todo/launcher`, `@go-go-golems/hypercard-tools/launcher`) or local files (`assistantModule.tsx`, `jsReplModule.tsx`, `hypercardReplModule.tsx`, `kanbanVmModule.tsx`, `runtimeDebugModule.tsx`, `taskManagerModule.tsx`).
- **Federation**: `src/app/loadFederatedAppContracts.ts`, `federationRegistry.ts`, `federationSharedRuntime.ts`, `localFederatedAppContracts.ts` — remote federated contracts discovered via `/api/os/federation-registry`; `listRuntimeFederatedLauncherModules()` injects them at runtime (`modules.tsx:28`).
- **Backend manifest**: each Go module returns `backendhost.AppBackendManifest{AppID, Name, Description, Required, Capabilities}` (e.g. assistant: `chat, ws, timeline, profiles`, `assistantbackendmodule/module.go:68-81`).
- **JS runtime (browser)**: quickjs-emscripten (^0.31, `@jitl/quickjs-*`) driven by `@go-go-golems/os-scripting`. HyperCard/VM domain in `src/domain/vm`, `vmmeta` generated via `go-go-os-backend vmmeta generate`.
- **sqlite**: Go backend module (not browser); frontend shim `src/app/shims/sqliteLauncher.ts`.

### data/, scripts/, build/, deploy/, Dockerfile
- `data/`: `inventory.db`, `sqlite-app.db` (defaults `./data/inventory.db`, `main.go:112`).
- `scripts/`: `build-wesen-os-launcher.sh`, `launcher-ui-sync.sh` (copy `apps/os-launcher/dist` → `pkg/launcherui/dist`), `smoke-wesen-os-launcher.sh`, `launcher-dev-tmux.sh`, `init-submodules.sh`, `setup-workspace.sh`, `test-workspace.sh`, `open_gitops_pr.py`.
- `deploy/`: `gitops-targets.json` + `k8s/wesen-os/` kustomize (stale copy; live truth is in the k3s repo).
- Dockerfile: multi-stage, `golang:1.26.1-bookworm` + `node:22-bookworm-slim`, CGO_ENABLED=1, pnpm 10.17.1, `npm run launcher:binary:build`; runtime `debian:bookworm-slim` + tini, EXPOSE 8091.

## 3. Go dependencies (pins in workspace wesen-os go.mod)

| Module | Pinned version |
|---|---|
| geppetto | **v0.11.8** (`go.mod:7`) |
| pinocchio | **v0.10.13-0.20260330222144-10fd36ccc06f** (`go.mod:14`) |
| go-go-goja | **v0.4.6** (indirect, `go.mod:75`) |
| glazed | **v1.0.6** (`go.mod:8`) |
| clay | v0.4.0 |
| go-go-os-backend | v0.0.3 (`go.mod:76`) |
| go-go-os-chat | v0.0.2 (`go.mod:13`) |
| go-go-app-inventory / go-go-app-sqlite / go-go-app-arc-agi / go-go-gepa | v0.0.1 each |
| dop251/goja | v0.0.0-20260219130522-0ba9a5494a59 (indirect) |

Go 1.26.1. `go.work` uses `.` + `./workspace-links/{geppetto,go-go-os-chat,pinocchio,go-go-app-arc-agi-3,go-go-app-inventory,go-go-app-sqlite,go-go-gepa,go-go-os-backend}`; replace `go-go-os-chat v0.0.1 => ./workspace-links/go-go-os-chat` (`go.work:15`). go-go-goja and go-go-os-frontend are NOT in go.work (goja transitive; frontend npm-only).

**workspace-links/ are git submodules** (`.gitmodules`, `git@github.com:go-go-golems/<repo>.git` branch main). Submodule HEADs:
| workspace-link | checked-out HEAD |
|---|---|
| geppetto | `85b637f4` tag **v0.11.9** (go.mod pins v0.11.8) |
| pinocchio | `85a230a` tag **v0.10.14** |
| go-go-os-frontend | `c74347e` (main, npm-only) |
| go-go-os-chat | `63f2b36` main |
| go-go-os-backend | `5174004` tag v0.0.5 (branch `task/vmmeta-generator`) |
| go-go-gepa | `441cf88` main |
| go-go-app-inventory | `048aabe` v0.0.1 |
| go-go-app-sqlite | `a370b58` branch `task/sqlite-federation-runtime-fix` |
| go-go-app-arc-agi-3 | `8e3e598` v0.0.1 |

Geppetto+pinocchio submodules themselves pin go-go-goja v0.4.6, dop251/goja 20251103141225-af2ceb9156d7.

## 4. Frontend / npm side

- Root `package.json` workspaces: `apps/*`, `workspace-links/*/packages/*`, `workspace-links/*/apps/*` (same in `pnpm-workspace.yaml`). Root scripts: `launcher:frontend:build` (vite), `launcher:ui:sync` (copy dist), `launcher:binary:build` (build+sync+go build), tmux dev, workspace setup. Dev deps: biome, typescript ~5.7, vitest.
- `@go-go-golems/*` consumed by launcher (`apps/os-launcher/package.json:33-46`, all `workspace:*`): apps-browser, book-tracker-debug, os-chat, crm, os-shell, os-core, os-scripting, os-kanban, hypercard-tools, inventory, os-repl, os-ui-cards, os-widgets, todo. Resolve to `workspace-links/go-go-os-frontend/packages/*` (macos1-react, os-chat, os-confirm, os-core, os-kanban, os-repl, os-scripting, os-shell, os-ui-cards, os-widgets); crm/todo/apps-browser/hypercard-tools/arc-agi-player come from other sibling repos' globs.
- Stack: React 19, Redux Toolkit, react-markdown/remark/rehype, CodeMirror 6, quickjs-emscripten; Vite 6, TS ~5.7, vitest, jsdom.
- **Embedding**: `apps/os-launcher/dist` synced into `pkg/launcherui/dist`, `//go:embed all:dist`. Published-resolution mode: `build:published` with `GO_GO_OS_FRONTEND_RESOLUTION=published` (`apps/os-launcher/package.json:13`) + `tsconfig.published.json` (from npm-publish tickets).

## 5. geppetto / pinocchio / go-go-goja call sites (break on upgrade)

**geppetto** (imports `main.go:13-15`, `profile_bootstrap.go:9-10`, `assistantbackendmodule/module.go:10`, `pkg/gepa`):
- `geppetto/pkg/sections`: `geppettosections.CreateGeppettoSections()` (`main.go:86`), `GetCobraCommandGeppettoMiddlewares` (`main.go:448`).
- `geppetto/pkg/engineprofiles`: `MustEngineProfileSlug` (`main.go:191`), `ParseRegistrySourceSpecs`, `NewChainedRegistryFromSourceSpecs`, `ParseEngineProfileSlug`, `EngineProfileSlug`, `Registry`, `RegistrySlug`, `ValidationError`, `registryChain.DefaultRegistrySlug()/Close()` (`profile_bootstrap.go:41-79`).
- `geppetto/pkg/steps/ai/settings`: `aisettings.InferenceSettings` + `.Clone()` (`profile_bootstrap.go:10,95-99`).
- `geppetto/pkg/inference/middlewarecfg`: `middlewarecfg.BuildDeps{}` (`main.go:260`).
- `geppetto/pkg/events`, `geppetto/pkg/turns` — used in pinoweb event-sink wiring (inventory pinoweb).

**pinocchio** (imports `main.go:23-24`, `profile_bootstrap.go:12`, `assistantbackendmodule/module.go:13-14`):
- `pinocchio/pkg/webchat`: `webchat.NewServer(ctx, parsed, staticFS, opts...)` with `WithRuntimeComposer`, `WithEventSinkWrapper`, `WithDebugRoutesEnabled` (`main.go:238-245, 267-273`); `srv.RegisterTool(name, factory)` (`main.go:250`); `srv.HTTPServer()` (`main.go:377`); `srv.Run(ctx)` (`main.go:397`); `*webchat.Server` (`assistantbackendmodule/module.go:20`).
- `pinocchio/pkg/webchat/http`: `webhttp.ConversationRequestResolver` (`module.go:21`).
- `pinocchio/pkg/cmds/profilebootstrap`: `ResolveBaseInferenceSettings`, `ResolveCLIProfileSelection`, `ResolvedCLIProfileSelection` (`profile_bootstrap.go:12,27,31`).
- Inventory pinoweb (sibling repo) uses `pinocchio/pkg/inference/runtime`, `pinocchio/pkg/persistence/chatstore`.

**go-go-os-chat**: `go-go-os-chat/pkg/chatservice` (`chatservice.New(chatservice.Options{...})`, `assistantbackendmodule/module.go:12,42-50`), `go-go-os-chat/pkg/profilechat` (`profilechat.NewRuntimeComposer(...)`, `profilechat.NewStrictRequestResolver("assistant")`, `main.go:23,254-266`).

**go-go-goja** (server-side JS for GEPA; consumed via go-go-gepa, not directly in wesen-os pkg/cmd):
- `go-go-gepa/pkg/jsbridge/call_and_resolve.go`: imports `github.com/dop251/goja` + `go-go-goja/pkg/runtimeowner`; `CallFunc func(vm *goja.Runtime) (goja.Value, error)`; `CallAndResolve(...)` (promise resolution, lines 10-136).
- `go-go-gepa/cmd/gepa-runner/js_runtime.go`: `goja.New()`, `goja_nodejs/eventloop`, `require.NewRegistry(require.WithGlobalFolders(...))`, geppetto native module via `gp.Register(reg, gp.Options{...})` (lines 6-53).
- wesen-os enables GEPA JS via `--gepa-scripts-root` (`main.go:101`) → `gepabackend.NewModule` (`main.go:278-284`).

## 6. Git state (workspace wesen-os)

Branch: `task/sqlite-federation-runtime-fix`. Local branches: main, task/add-gepa-optimizer, task/add-os-doc-browser, task/deploy-001-* (draft-review-flow, host-buildx-fix, host-publish-fix, inventory-federation, require-gitops-pr-token), task/os-openai-app-server, task/sqlite-app, task/sqlite-federation-runtime-fix. Remotes: origin/main, origin/task/deploy-001-inventory-federation, origin/task/deploy-001-require-gitops-pr-token.

`git log main..HEAD`: SQLITE-FED-001 (sqlite federated remote release handoff, PR #11 `287a3b5`, runtime fix `4ab9593` "stop double-loading sqlite module"), KUSTOMIZE-ROLL-001 (configmap generator rollout), macos1-react widget-showcase Phases 0–6 (`98e1841`…`b672c73`), submodule bumps (`13ce252`, `5dd9234`). Newest: `b672c73` "Design doc: Widget showcase plan for macos1-react".

Uncommitted: modified `go.work.sum`, `ttmp/vocabulary.yaml`, dirty submodule `workspace-links/go-go-os-frontend`; untracked `workspace-links/go-go-os-chat` (submodule), `.claude/`, `.codex`, `.playwright-mcp/`, `apps/os-launcher/public/`, `docs/window-resize-behavior.md`, new ttmp trees (2026/04/09 os-core-compat, 2026/04/10, 2026/07 stocktake).

## 7. Relevant ttmp tickets

1. `ttmp/2026/04/01/SQLITE-FED-001--sqlite-federated-remote-release-handoff/` — subject of current branch.
2. `ttmp/2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE--…/` — split-repo composition architecture.
3. `ttmp/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES--…/` — app-scoped chat profile surfaces (matches `app_profile_surface.go`).
4. `ttmp/2026/04/08/os-widgets--widget-package-architecture-analysis-and-extraction-feasibility-study/`
5. `ttmp/2026/04/09/os-core-compat--os-core-compatibility-facade-over-macos1-react/design/01-…implementation-plan.md`
6. `ttmp/2026/04/10/npmjs-public-libraries--…` and `ttmp/2026/04/10/macos1-npm-publish--…/design-doc/01-implementation-guide-for-publishing-macos1-react-to-npmjs.md` — ties to `build:published`.
7. `ttmp/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING--…/design-doc/01-intern-guide-…`
8. `ttmp/2026/04/01/KUSTOMIZE-ROLL-001--…/design/01-kustomize-configmap-generator-guide.md`
9. `ttmp/2026/03/01/OS-06-SQLITE-UX-POLISH--…`

## 8. Older ~/code/wesen/wesen-os (main) comparison

Same shape (single cmd, same pkg set: arcagi, doc, gepa, launcherui, sqlite; single apps/os-launcher) but much older/simpler: no go.work, no workspace-links submodules, no deploy/, no Dockerfile. Pins: geppetto v0.10.4, pinocchio v0.10.2, glazed v1.0.4, go-go-goja v0.4.0, go-go-os-backend v0.0.3. Predates federation, assistant module, submodule workspace, containerization.
