---
Title: 'wesen-os stocktake: system analysis, API migration guide, and improvement plan'
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - wesen-os
    - geppetto
    - pinocchio
    - go-go-goja
    - deployment
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../../code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml
      Note: Live deployment manifest (image pin
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/geppetto/pkg/events/canonical_events.go
      Note: New canonical event constructors (migration target)
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/go-go-goja/pkg/engine/factory.go
      Note: Renamed goja engine API (RuntimeFactoryBuilder)
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/pinocchio/pkg/chatapp/chat.go
      Note: New chatapp engine API replacing deleted webchat
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/react-chat/internal/webchat/handlers.go
      Note: Reference chatapp host incl. frontend-tool bridge for Phase 1.3
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/react-chat/packages/chat-provider/src/core/createChatClient.ts
      Note: serverkit+sessionstream wire contract the assistant backend must expose
    - Path: ../../../../../../../../../../code/wesen/go-go-golems/react-chat/packages/chat-provider/src/tools/useFrontendTool.ts
      Note: Browser-side tool registration API adopted in Decision D6
    - Path: apps/os-launcher/package.json
      Note: workspace:* npm deps to switch to published versions (Decision D4)
    - Path: cmd/wesen-os-launcher/main.go
      Note: Server wiring; webchat/profile/module call sites that break on upgrade
    - Path: go.mod
      Note: April-era dependency pins measured in the gap analysis
    - Path: go.work
      Note: workspace-links overrides slated for removal (Decision D2)
    - Path: pkg/assistantbackendmodule/module.go
      Note: Assistant module to rewrite against chatapp/sessionstream
ExternalSources: []
Summary: 'Intern-level guide to the wesen-os system: what it is, how every part works (launcher binary, backend modules, npm frontend, JS runtimes, k3s deployment), exactly what drifted between the April 2026 workspace and the June 2026 dependency mains, and a phased plan to migrate to the new geppetto/pinocchio/go-go-goja APIs and published npm packages.'
LastUpdated: 2026-07-03T13:30:00-07:00
WhatFor: Onboard a new contributor to wesen-os and give them an executable migration + improvement plan.
WhenToUse: Read top-to-bottom before touching wesen-os; use the migration tables and phase checklists while porting.
---



# wesen-os stocktake: system analysis, API migration guide, and improvement plan

## 1. Executive summary

wesen-os is a **browser "desktop OS"**: a single Go binary (`wesen-os-launcher`) that embeds a React desktop shell and hosts a set of launchable apps — an LLM assistant chat, an inventory manager, a SQLite browser, a GEPA prompt optimizer, an ARC-AGI player, CRM/todo/kanban apps, JS and HyperCard REPLs. It is deployed at **https://wesen-os.yolo.scapegoat.dev** on a single-node Hetzner k3s cluster via Argo CD GitOps.

wesen-os is deliberately a *thin composition repository*: almost all real functionality lives in sibling repos (geppetto for LLM inference, pinocchio for the chat server, go-go-goja for the server-side JS engine, go-go-os-frontend for the npm UI packages, go-go-os-backend for backend-module contracts, plus per-app repos), which wesen-os stitches together through Go submodules (`workspace-links/`) and a pnpm workspace.

The system was actively developed in this workspace until **2026-04-09** and then paused, while the dependency repos kept moving until **mid-June 2026**. This document takes stock of both sides and produces a migration plan. The four load-bearing findings:

1. **Drift is bidirectional.** The newest wesen-os code lives *here*, on the unmerged branch `task/sqlite-federation-runtime-fix` (ahead of `~/code/wesen/wesen-os` main by a month of work: federation, containerization, widget showcase). The newest library code lives in `~/code/wesen/go-go-golems/*` mains. Phase 0 of any plan must consolidate wesen-os itself before touching dependencies.
2. **geppetto is a small break, pinocchio is a big one.** geppetto v0.11.8 → v0.13.x only hard-breaks `pkg/events` (rewritten into a canonical, correlation-based event model; 28 symbols removed). pinocchio v0.10.13 → v0.11+ *deleted* `pkg/webchat` and `pkg/sem` — the exact packages wesen-os's assistant is built on — replacing them with `pkg/chatapp` on top of a new repo, `sessionstream`. The assistant backend module must be re-architected, not just recompiled.
3. **go-go-goja moved from v0.4.6 to v0.8.3** with a renamed engine API (`engine` → `pkg/engine`, `Factory` → `RuntimeFactory`, `ModuleSpec` → `RuntimeModuleRegistrar`) and a new generated-binary framework (xgoja v2). wesen-os only consumes it transitively (via geppetto, gepa, go-go-os-backend), so this break is mostly absorbed by bumping those libraries together.
4. **The npm packages are now actually published.** In April, `@go-go-golems/os-*` existed only as 0.1.0 `workspace:*` links into a git submodule. Today os-shell/os-chat/os-core/os-repl/os-kanban/os-widgets are published on npmjs (0.1.1–0.1.6) via trusted publishing. wesen-os can finally drop the frontend submodule for published packages — the `build:published` escape hatch for this already exists.
5. **The new chat frontend already exists: react-chat.** `~/code/wesen/go-go-golems/react-chat` publishes `@go-go-golems/chat-provider` + `@go-go-golems/chat-overlay` (both 0.2.1 on npm), a chatapp/sessionstream-native React chat runtime with **browser-side tool registration** (`useFrontendTool`) and typed streaming widgets (`defineWidget`). It was the incubator whose Go pieces were upstreamed into pinocchio `pkg/chatapp`. This resolves the assistant's frontend half — and it changes the backend plan too, because go-go-os-chat main turns out to still ship the *old* webchat/sem architecture (it only bumped dependency versions), so the assistant backend should target pinocchio chatapp/sessionstream directly (§5.6, Decisions D3/D6).

The plan is six phases: **0** consolidate branches, **1** bump the Go stack and port the assistant backend to chatapp/sessionstream, **2** move the frontend to published npm packages (os-* for the desktop, chat-provider/chat-overlay for the assistant UI), **3** rebuild/redeploy through the existing GHCR → GitOps-PR → Argo CD pipeline, **4** — once the new stack has stabilized in production — **completely replace `@go-go-golems/os-chat`** with chat-provider-based components across all consumers and retire the package (Decision D7), **5** improvements (persistence for `/app/data`, secret injection, desktop apps exposing frontend tools to the assistant, adopting new goja/geppetto capabilities, repo consolidation).

## 2. Problem statement and scope

**Problem.** The wesen-os workspace (`/home/manuel/workspaces/2026-03-02/os-openai-app-server`) was created 2026-03-02 and last touched ~2026-04-09. Since then geppetto, pinocchio, go-go-goja, and the go-go-os-* repos advanced substantially on their mains in `~/code/wesen/go-go-golems`. wesen-os pins April-era versions through both `go.mod` and git submodules, so it neither compiles against nor benefits from the new APIs. We want to (a) bring everything to the newest APIs, (b) switch the frontend to the published npm packages, and (c) identify improvements.

**Scope.** This document covers: the wesen-os runtime and its direct dependency graph; the frontend npm workspace; the deployment path to wesen-os.yolo.scapegoat.dev. It provides a migration *plan and guide*, not the executed migration. Out of scope: the per-app repos' internals (inventory, arc-agi, sqlite app logic), the other 40 apps on the k3s cluster.

**Audience.** A new intern. No prior knowledge of the go-go-golems ecosystem is assumed; every claim is anchored to a file path you can open.

## 3. Orientation: what wesen-os is

Open https://wesen-os.yolo.scapegoat.dev and you see a retro desktop: a menu bar, icons, draggable windows. Each icon launches an "app". Some apps are pure frontend (todo, CRM), some talk to Go backend modules over HTTP (`/api/apps/<app-id>/...`) — the assistant chat streams LLM responses over a websocket, the SQLite browser executes queries server-side, the GEPA app runs prompt-optimization jobs that execute JavaScript server-side in a goja VM.

The repo (`/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os`) describes itself as "the composition runtime repository" (`README.md:1-10`). It owns exactly four things:

- the launcher shell frontend (`apps/os-launcher` — a Vite + React 19 SPA),
- the embedded copy of its build output (`pkg/launcherui/dist`, served via `//go:embed all:dist`, `pkg/launcherui/handler.go:11-21`),
- the composed server binary (`cmd/wesen-os-launcher`),
- thin Go adapter packages that register sibling repos' backend modules (`pkg/sqlite`, `pkg/gepa`, `pkg/arcagi`, `pkg/assistantbackendmodule`).

Everything else is pulled in from sibling repositories. Learn these names first:

| Repo | Role | Language surface |
|---|---|---|
| **geppetto** | LLM inference: engines (OpenAI/Claude/Gemini), turns, events, engine profiles, embeddings, JS bindings | Go |
| **pinocchio** | Chat server layer on top of geppetto: conversation runtime, persistence, webchat (old) / chatapp (new) | Go |
| **go-go-goja** | Server-side JavaScript engine (goja) with a require()-module system, and (new) the xgoja generated-binary framework | Go, hosts JS |
| **go-go-os-backend** | `pkg/backendhost`: the `AppBackendModule` contract, lifecycle, route mounting, `/api/os/apps` manifest | Go |
| **go-go-os-chat** | `pkg/chatservice` + `pkg/profilechat`: reusable assistant chat service wiring geppetto+pinocchio | Go |
| **go-go-os-frontend** | The `@go-go-golems/os-*` npm packages: os-shell (window manager), os-core, os-chat (chat UI), os-widgets, os-repl, os-kanban, os-scripting, os-ui-cards | TypeScript/React |
| **go-go-app-inventory / go-go-app-sqlite / go-go-app-arc-agi-3 / go-go-gepa** | Individual apps (backend module + frontend package each) | Go + TS |
| **2026-03-27--hetzner-k3s** | Terraform + Argo CD GitOps repo running the cluster that serves wesen-os.yolo.scapegoat.dev | HCL/YAML |

### 3.1 The big picture

```
                       browser
                          │  https://wesen-os.yolo.scapegoat.dev
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │ Hetzner k3s node (cpx42, fsn1)                           │
   │  Traefik ingress ── cert-manager (letsencrypt-prod)      │
   │        │ Host: wesen-os.yolo.scapegoat.dev               │
   │        ▼                                                 │
   │  Deployment wesen-os (ghcr.io/wesen/wesen-os:sha-…)      │
   │  ┌────────────────────────────────────────────────────┐  │
   │  │ wesen-os-launcher  (:8091)                         │  │
   │  │                                                    │  │
   │  │  GET /            → embedded SPA (pkg/launcherui)  │  │
   │  │  GET /api/os/apps → backend manifest               │  │
   │  │  /api/os/federation-registry, /api/os/docs, /help  │  │
   │  │  /api/apps/<appID>/…  namespaced module routes     │  │
   │  │                                                    │  │
   │  │  backendhost.ModuleRegistry                        │  │
   │  │   ├─ assistant  (pkg/assistantbackendmodule)       │  │
   │  │   │    └─ go-go-os-chat chatservice                │  │
   │  │   │         └─ pinocchio webchat ── geppetto       │  │
   │  │   │              engines → OpenAI/Anthropic/…      │  │
   │  │   ├─ sqlite     (pkg/sqlite → go-go-app-sqlite)    │  │
   │  │   ├─ gepa       (pkg/gepa → go-go-gepa)            │  │
   │  │   │    └─ goja VM (go-go-goja) runs user JS        │  │
   │  │   ├─ inventory  (go-go-app-inventory)              │  │
   │  │   └─ arcagi     (pkg/arcagi, loopback :18081)      │  │
   │  └────────────────────────────────────────────────────┘  │
   └──────────────────────────────────────────────────────────┘
```

And the SPA inside the browser:

```
   apps/os-launcher (Vite+React 19)
     ├─ @go-go-golems/os-shell   → window manager, LaunchableAppModule registry
     ├─ @go-go-golems/os-core    → shared desktop primitives
     ├─ @go-go-golems/os-chat    → chat UI (talks to /api/apps/assistant)
     ├─ @go-go-golems/os-widgets, os-repl, os-kanban, os-ui-cards
     ├─ @go-go-golems/os-scripting → in-browser JS via quickjs-emscripten
     ├─ app packages: crm, todo, inventory, hypercard-tools, apps-browser…
     └─ federation loader: fetches /api/os/federation-registry and mounts
        remote app contracts at runtime (loadFederatedAppContracts.ts)
```

Note there are **two JavaScript runtimes** and it's important not to confuse them: the *browser-side* sandbox is quickjs-emscripten (wasm QuickJS, driven by `@go-go-golems/os-scripting`), used by the JS REPL and HyperCard apps; the *server-side* runtime is goja (pure-Go ES engine from go-go-goja), used by GEPA scripts and geppetto's JS bindings.

## 4. Current-state architecture (evidence-based)

### 4.1 Which checkout is authoritative — the drift map

Measured 2026-07-03 with `git log -1 --format='%h %ci %s'`:

| Component | Workspace checkout (this repo tree) | Canonical main (`~/code/wesen/...`) | Who is newer |
|---|---|---|---|
| wesen-os | `task/sqlite-federation-runtime-fix`, **2026-04-09** (`b672c73`) | `wesen-os` main `068a8b8` **2026-03-01** | **workspace** (+~40 commits: federation, Docker, deploy, widget showcase) |
| geppetto | `85b637f4` 2026-04-01 (≈ v0.11.9) | main `1ad8be2b` **2026-06-06** | canonical |
| pinocchio | `85a230a` 2026-04-01 (≈ v0.10.14) | main `554bca2` **2026-06-07** | canonical |
| go-go-goja | `03e0656` 2026-04-02 (v0.4.6 era) | main `a489f92` **2026-06-17** | canonical |
| go-go-os-frontend | submodule @ `c74347e` 2026-04-09 (packages at 0.1.0) | main `77729a67` **2026-06-01** (published 0.1.1–0.1.6) | canonical |
| go-go-os-chat | submodule @ `63f2b36` | main `a5acf4b` **2026-06-07** (geppetto v0.13.3, goja v0.8.3) | canonical |
| go-go-os-backend | submodule @ `5174004` (v0.0.5) | main `62bf48c` **2026-06-07** (goja v0.8.3) | canonical |

`wsm status --fetch` on the workspace confirms: wesen-os and openai-app-server dirty (M:4 / M:1), several repos flagged unmerged/rebase against remotes. Uncommitted wesen-os changes: `go.work.sum`, `ttmp/vocabulary.yaml`, dirty submodule `workspace-links/go-go-os-frontend`, untracked `workspace-links/go-go-os-chat`.

**Version pins vs targets (Go):**

| Module | wesen-os `go.mod` pins | Target (what the ecosystem is on) |
|---|---|---|
| geppetto | v0.11.8 (`go.mod:7`) | **v0.13.3+** (what go-go-os-chat main uses) |
| pinocchio | v0.10.13-0.20260330… (`go.mod:14`) | latest main (post-#172) |
| go-go-goja | v0.4.6 indirect (`go.mod:75`) | **v0.8.3** |
| glazed | v1.0.6 | check latest |
| go-go-os-backend | v0.0.3 | v0.0.5+ / main |
| go-go-os-chat | v0.0.2 (+ replace → submodule) | main |
| sessionstream | — (does not exist in April world) | **new required dependency** |

Crucially, `go.work` overrides most pins with `./workspace-links/*` submodule checkouts (`go.work:1-15`), so "what actually compiles today" is the April submodule snapshot, not the go.mod tags. The submodules are real git submodules (`.gitmodules` → `git@github.com:go-go-golems/<repo>.git`), not symlinks.

### 4.2 The server binary: cmd/wesen-os-launcher

Single Glazed/Cobra command, default `--addr :8091` (`cmd/wesen-os-launcher/main.go:97`). Startup flow, in pseudocode:

```
main():
  root := cobra + glazed command "wesen-os-launcher"
  sections := geppettosections.CreateGeppettoSections()          # main.go:86
  middlewares := geppettosections.GetCobraCommandGeppettoMiddlewares  # main.go:448

run(parsed):
  # 1. Engine profiles: which LLM/profile the assistant uses
  registryChain := engineprofiles.NewChainedRegistryFromSourceSpecs(
      engineprofiles.ParseRegistrySourceSpecs(--profile-registries))   # profile_bootstrap.go:41-79
  settings := profilebootstrap.ResolveBaseInferenceSettings(...)       # pinocchio

  # 2. Assistant chat server (pinocchio webchat wrapped by go-go-os-chat)
  srv := webchat.NewServer(ctx, parsed, staticFS,
      webchat.WithRuntimeComposer(profilechat.NewRuntimeComposer(...)),# main.go:238-266
      webchat.WithEventSinkWrapper(...),
      webchat.WithDebugRoutesEnabled(...))
  srv.RegisterTool(name, factory)                                      # main.go:250
  assistant := assistantbackendmodule.New(srv, chatservice.New(...))   # pkg/assistantbackendmodule/module.go:42-50

  # 3. Other backend modules
  modules := [assistant, sqlite.NewModule(...), gepa.NewModule(...),
              inventory..., arcagi.NewModule(...)]                     # pkg/{sqlite,gepa,arcagi}/module.go

  # 4. Host wiring (go-go-os-backend)
  registry := backendhost.ModuleRegistry(modules)
  backendhost.RegisterAppsManifestEndpoint(mux, registry)              # main.go:363
  backendhost.MountNamespacedRoutes(mux, registry)   # /api/apps/<id>  # main.go:368-373
  mux.Handle("/", launcherui.Handler())              # embedded SPA    # main.go:375
  mux.Handle("/api/os/federation-registry", ...)     # federation_registry_endpoint.go:15
  mux.Handle("/api/os/help|/api/os/docs", ...)       # docs_endpoint.go
  srv.Run(ctx)                                                         # main.go:397
```

Key flags (also visible in the live Deployment args): `--addr`, `--arc-enabled`, `--profile`, `--profile-registries`, `--federation-registry`, `--gepa-scripts-root` (`main.go:101`, scans `.js/.mjs/.cjs` for GEPA), sqlite guardrail flags (row limits, allowlists, redaction — `pkg/sqlite/module.go`).

The backend-module contract every app implements (`go-go-os-backend/pkg/backendhost`):

```go
type AppBackendModule interface {
    Manifest() AppBackendManifest       // {AppID, Name, Description, Required, Capabilities}
    Init(ctx, deps) error               // lifecycle: Init/Start/Health/Stop
    RegisterRoutes(mux *http.ServeMux)  // mounted under /api/apps/<AppID>/
}
```

The assistant module (`pkg/assistantbackendmodule/module.go:68-81`) advertises capabilities `chat, ws, timeline, profiles` — these correspond to the pinocchio webchat routes that the June refactor deletes (§5.2).

### 4.3 The frontend: apps/os-launcher and the npm workspace

The repo root is a pnpm workspace (`package.json` + `pnpm-workspace.yaml`): `apps/*`, `workspace-links/*/packages/*`, `workspace-links/*/apps/*`. That third glob is the trick that makes the git submodules' packages resolvable as `workspace:*` dependencies.

`apps/os-launcher/package.json:33-46` depends on 14 `@go-go-golems/*` packages, all `workspace:*`: os-shell, os-core, os-chat, os-scripting, os-widgets, os-repl, os-ui-cards, os-kanban (→ `workspace-links/go-go-os-frontend/packages/*`) plus app packages crm, todo, inventory, apps-browser, hypercard-tools, book-tracker-debug (→ other sibling repos' globs).

An app is a **launcher module**:

```tsx
// type from @go-go-golems/os-shell
const module: LaunchableAppModule = { id, title, icon, mount, ... }

// collected in src/app/modules.tsx:24-39 — npm packages contribute via
// their "/launcher" export, local apps via local files:
import { crmLauncherModule } from '@go-go-golems/crm/launcher'
import { assistantModule } from './assistantModule'
const launcherModules = [crm, todo, assistant, jsRepl, hypercardRepl,
                         ...listRuntimeFederatedLauncherModules()]   // federation
createAppRegistry(launcherModules)                                   // registry.ts:1-4
```

**Federation** (`src/app/loadFederatedAppContracts.ts`, `federationRegistry.ts`, `federationSharedRuntime.ts`): at runtime the shell fetches `/api/os/federation-registry`; the server reads that JSON from `--federation-registry` (in prod: two remotes, `inventory` and `sqlite`, hosted on Hetzner object storage `scapegoat-federation-assets.fsn1.your-objectstorage.com` — see the k3s repo's `gitops/kustomize/wesen-os/config/federation.registry.json`). Federated apps are fetched as remote contracts and injected into the registry without rebuilding the launcher. The `infra-tooling` repo (branch `task/federation-publish-helper`) holds the publishing scripts (`scripts/federation/publish_federation_remote.py` et al.).

**Build/embed pipeline** (root `package.json` scripts + `scripts/`):

```
pnpm install
npm run launcher:frontend:build   # vite build → apps/os-launcher/dist
npm run launcher:ui:sync          # scripts/launcher-ui-sync.sh → pkg/launcherui/dist
npm run launcher:binary:build     # + go build → build/wesen-os-launcher
```

There is already a published-packages mode: `build:published` sets `GO_GO_OS_FRONTEND_RESOLUTION=published` with `tsconfig.published.json` (`apps/os-launcher/package.json:13`) — built for the April npm-publish tickets (`ttmp/2026/04/10/macos1-npm-publish--…`), which is exactly the seam Phase 2 will widen.

### 4.4 Deployment: how wesen-os.yolo.scapegoat.dev actually ships

Everything below is in `/home/manuel/code/wesen/2026-03-27--hetzner-k3s` unless noted.

**Cluster**: one Hetzner `cpx42` (Ubuntu 24.04, fsn1) provisioned by Terraform (`main.tf`); cloud-init (`cloud-init.yaml.tftpl`) installs k3s (stable channel, built-in Traefik), cert-manager v1.20.0, and Argo CD. Wildcard DNS `*.yolo.scapegoat.dev → node IP`; Traefik routes by Host header; cert-manager issues per-host Let's Encrypt certs (HTTP01, ClusterIssuer `letsencrypt-prod` in `gitops/kustomize/platform-cert-issuer/clusterissuer.yaml`). Admin access over Tailscale (`docs/tailscale-k3s-admin-access-playbook.md`). ~41 apps run on this pattern; wesen-os sits in the `demo-apps` Argo project.

**wesen-os manifests** (`gitops/kustomize/wesen-os/`):
- `deployment.yaml`: image **`ghcr.io/wesen/wesen-os:sha-13ce252`**, 1 replica, args `--addr=:8091 --arc-enabled=false --profile=default --profile-registries=/config/profiles.runtime.yaml --federation-registry=/config/federation.registry.json`; probes on `/api/os/apps` and `/`; resources 250m/512Mi→1cpu/1Gi.
- `kustomization.yaml`: `configMapGenerator` builds `wesen-os-config` from `config/profiles.runtime.yaml` (default engine **gpt-4.1-mini**) + `config/federation.registry.json` — content-hash suffix forces a rollout on config change (`docs/kustomize-generated-config-rollout-pattern.md`).
- `ingress.yaml`: Traefik, host `wesen-os.yolo.scapegoat.dev`, TLS secret `wesen-os-tls`.
- `gitops/applications/wesen-os.yaml`: Argo Application, automated sync (`prune: true`, `selfHeal: true`).

**Two gaps in the live deployment** (both deliberate demo-tier choices, both improvement candidates):
- `/app/data` is an `emptyDir` — **SQLite data does not survive pod restarts** (labels say `has-persistent-storage=false`).
- **No Secret is mounted** — no OpenAI/Anthropic API key in the manifests, consistent with `--arc-enabled=false` and a demo profile. Adding real LLM inference in prod requires wiring a Secret (`docs/app-runtime-secrets-and-identity-provisioning-playbook.md`).

**Release pipeline** (source repo `wesen/wesen-os`):

```
push to main
  └─ .github/workflows/publish-host-image.yml
       ├─ docker build (Dockerfile: golang:1.26.1 + node:22, CGO_ENABLED=1,
       │   pnpm install --frozen-lockfile, npm run launcher:binary:build)
       ├─ push ghcr.io/wesen/wesen-os:{sha-<short>,main,latest}
       └─ job gitops-pr: scripts/open_gitops_pr.py
            --config deploy/gitops-targets.json
            → opens PR on wesen/2026-03-27--hetzner-k3s bumping
              gitops/kustomize/wesen-os/deployment.yaml image tag
merge that PR → Argo CD auto-syncs → rollout
verify: kubectl -n wesen-os rollout status deployment/wesen-os
        curl https://wesen-os.yolo.scapegoat.dev/api/os/apps
```

Beware: the source repo's `deploy/k8s/wesen-os/` is a **stale copy** (`host: wesen-os.example.com`, `image: …:main`) used only by the manual `deploy-host-to-k3s.yml` workflow; the k3s repo's `gitops/kustomize/wesen-os/` is the source of truth.

## 5. Gap analysis: what breaks, exactly

### 5.1 geppetto v0.11.8 → v0.13.x — one hard break (events), everything else additive

Verified by exported-symbol diffs between the April checkout and current main (details in `various/04-raw-findings-geppetto-pinocchio-api-drift.md`).

**Stable — will recompile untouched**: `pkg/turns` (124 imports across the workspace), `pkg/inference/engine` (`Engine.RunInference(ctx, *turns.Turn) (*turns.Turn, error)` unchanged), `pkg/inference/engine/factory`, `pkg/inference/{session,middleware,middlewarecfg,tools}`, `pkg/steps/ai/{types,settings}`, `pkg/engineprofiles` (additive), `pkg/events.EventRouter`, `pkg/sections` (wesen-os's `CreateGeppettoSections`/`GetCobraCommandGeppettoMiddlewares` calls at `main.go:86,448` survive).

**Broken — `pkg/events`** (86 imports workspace-wide, mostly in the pinoweb/chat layers, not wesen-os proper): the flat chat-event vocabulary was replaced by a **canonical lifecycle model with first-class correlation**. Every constructor now takes an `events.Correlation`; runs, provider calls, text segments, reasoning segments, and tool calls each get started/delta/finished events. The full old→new table:

| Old (removed) | New (canonical) |
|---|---|
| `NewStartEvent(md)` | `NewTextSegmentStartedEvent(md, corr, role)` |
| `NewPartialCompletionEvent(md, delta, completion)` | `NewTextDeltaEvent(md, corr, delta, text, sequence)` |
| `NewTextEvent` / `NewFinalEvent` | `NewTextSegmentFinishedEvent(md, corr, text, finishReason)` |
| `NewThinkingPartialEvent` | `NewReasoningDeltaEvent(md, corr, delta, text, seq)` |
| `NewReasoningTextDone` | `NewReasoningSegmentFinishedEvent` |
| `NewToolCallEvent` | `NewToolCallStartedEvent` + `NewToolCallRequestedEvent` |
| `NewToolCallExecuteEvent` | `NewToolExecutionStartedEvent` |
| `NewToolResultEvent` / `NewToolCallExecutionResultEvent` | `NewToolResultReadyEvent` + `NewToolCallFinishedEvent` |
| `ToolEventAggregator` | removed — correlation replaces manual aggregation |
| — (new) | `NewRunStarted/Finished/Stopped/FailedEvent`, `NewProviderCallStarted/MetadataUpdated/FinishedEvent`, `NewToolCallArgumentsDeltaEvent` |

`EventMetadata`, `Event`/`EventImpl`, `NewEventFromJson`, `ToTypedEvent[T]` are unchanged; `NewErrorEvent`/`NewInterruptEvent`/`NewLogEvent`/`NewInfoEvent` only moved files. **Behavioral gotcha**: the new engineprofiles YAML decoders reject the legacy `profiles:` map layout — the prod `profiles.runtime.yaml` in the k3s repo must be checked against the new single-registry format during Phase 3.

### 5.2 pinocchio v0.10.13 → main — webchat and sem are gone

This is the heart of the migration. wesen-os's assistant path is: `main.go` → `webchat.NewServer(...)` (with `profilechat.NewRuntimeComposer`, `WithEventSinkWrapper`, `RegisterTool`, `srv.HTTPServer()`, `srv.Run(ctx)` at `main.go:238-273,377,397`) → wrapped by `pkg/assistantbackendmodule` (holds `*webchat.Server`, `webhttp.ConversationRequestResolver`) → exposed as capabilities `chat, ws, timeline, profiles`.

On current pinocchio main:
- **`pkg/webchat` is deleted** (PR #138 extract, #164/#168 replace). Replacement: **`pkg/chatapp`** — `Engine`/`NewEngine(opts…)` (`WithHooks`, `WithTurnStore(chatstore.TurnStore)`), `Service`/`NewService(hub, engine)`, `RegisterSchemas(*sessionstream.SchemaRegistry, …)`, `Install(*sessionstream.Hub, *Engine)`, plus `chatapp/serverkit` HTTP contracts (`CreateSessionRequest`, `SubmitMessageRequest`, `SessionSnapshotResponse`, `ParseSessionPath`, `EncodeProtoJSON`…), `chatapp/rpc/jsonl` (multiturn RPC), `chatapp/export` (minitrace), `pkg/spa` (embedded React chat SPA).
- **`pkg/sem` is deleted** (PR #139) — the SEM protobuf timeline model (33 workspace imports of `sem/pb/proto/sem/timeline`) has no name-compatible replacement. New protos live at `pkg/chatapp/pb/proto/pinocchio/chatapp/{v1,widgets/v1,frontendtools/v1,rpc/v1}` plus `sessionstream`'s protos; a schema-policy test forbids `google.protobuf.Struct`, so payloads must be concrete messages.
- **New required dependency**: `github.com/go-go-golems/sessionstream` (repo at `~/code/wesen/go-go-golems/sessionstream`) — session hub, schema registry, sqlite hydration. This is the streaming/timeline backbone that replaces both the webchat stream hub and SEM.
- Also removed: `pkg/cmds/helpers` (→ use `pkg/cmds/profilebootstrap`, which kept `ResolveBaseInferenceSettings`/`ResolveCLIEngineSettings` and gained `NewEngineFromResolvedCLIEngineSettings`), `pkg/ui/profileswitch`, `pkg/ui/runtime`.
- **Stable**: `pkg/inference/runtime` (the `RuntimeComposer` world wesen-os relies on — `ComposedRuntime`, `ProfileRuntime`, `ResolveRuntimePlan` all intact, plus a new `EventSinkWrapper` type), `pkg/persistence/chatstore`.

Consequence: `pkg/assistantbackendmodule` and the assistant wiring in `main.go` must be **rewritten against chatapp/sessionstream**. Important nuance discovered late in the investigation: `go-go-os-chat` main is *not* the migration vehicle — it bumped its dependency pins (geppetto v0.13.3, goja v0.8.3) but still ships its **own copies of the old architecture** (`go-go-os-chat/pkg/webchat` with chat_service/conversation/llm_loop_runner, and `go-go-os-chat/pkg/sem/pb/proto/sem/timeline`), i.e. exactly the design pinocchio deleted. The working reference implementations of the new stack are `react-chat/internal/webchat` and `pinocchio/cmd/web-chat` (§5.6, Decision D3 as revised).

### 5.3 go-go-goja v0.4.6 → v0.8.3 — engine API renamed, big new surface

wesen-os has no direct goja imports; the break arrives transitively through geppetto (`pkg/js/*`, `scopedjs`), go-go-gepa (`pkg/jsbridge`, `cmd/gepa-runner/js_runtime.go` — `goja.New()`, `require.NewRegistry`, `gp.Register(reg, gp.Options{…})`), and go-go-os-backend (`pkg/vmmeta` → `jsdoc`). Bumping those three together absorbs most of it. For any code we own that touches the engine:

| Old (v0.4.x) | New (v0.8.x) |
|---|---|
| `go-go-goja/engine` (repo root) | `go-go-goja/pkg/engine` |
| `engine.NewBuilder(...)` → `*FactoryBuilder` | `engine.NewRuntimeFactoryBuilder(...)` → `*RuntimeFactoryBuilder` |
| `Factory` / `.NewRuntime(ctx)` | `RuntimeFactory` / `.NewRuntime(opts ...RuntimeOption)` (contexts via options) |
| `WithModules(mods ...ModuleSpec)` | `WithModules(mods ...RuntimeModuleRegistrar)` |
| `ModuleSpec{ID; Register(reg)}` | `RuntimeModuleRegistrar{ID; RegisterRuntimeModule(regCtx, reg)}` |
| `NativeModuleSpec` | `NativeModuleRegistrar` |
| `modules.EnableAll(reg)` | `modules.DefaultRegistry.Enable(reg)` |
| `runtimeowner.NewRunner(vm, sched, opts)` | `runtimeowner.NewRuntimeOwner(vm, sched, opts)` |
| — | `UseModuleMiddleware(Safe/Only/Exclude/Add…)` module filtering |

`modules.NativeModule`/`Register`/`DefaultRegistry` are unchanged. New runtimes get much richer defaults (buffer, url, process, performance, console timers). New capabilities: default modules crypto/events/os/path/time/timer/yaml/uidsl; `modules/express` (Express-style JS HTTP router with an auth DSL backed by `pkg/gojahttp`); the **xgoja v2** generated-binary framework (`pkg/xgoja/*` with `providerapi.ProviderRegistry`, hot reload, .d.ts generation).

### 5.4 npm: workspace 0.1.0 snapshot vs published 0.1.x

The frontend submodule is pinned at `c74347e` (2026-04-09), all packages at 0.1.0. Current published state (npmjs, trusted publishing since ~May):

| package | wesen-os uses | repo main | npm |
|---|---|---|---|
| @go-go-golems/os-shell | 0.1.0 ws | 0.1.1 | **0.1.1** |
| @go-go-golems/os-chat | 0.1.0 ws | 0.1.1 | **0.1.1** |
| @go-go-golems/os-core | 0.1.0 ws | 0.1.3 | **0.1.2** |
| @go-go-golems/os-repl | 0.1.0 ws | 0.1.6 | **0.1.6** |
| @go-go-golems/os-kanban | 0.1.0 ws | 0.1.4 | **0.1.4** |
| @go-go-golems/os-widgets | 0.1.0 ws | 0.1.3 | **0.1.3** |
| @go-go-golems/os-scripting | 0.1.0 ws | 0.1.3 | not published |
| @go-go-golems/os-ui-cards | 0.1.0 ws | 0.1.3 | not published |
| @go-go-golems/os-confirm | (indirect) | 0.1.1 | not published |

Frontend changes since the snapshot (48 commits): VM source-module generation (packages emit raw-source modules for the goja VM stack; CI-gated), formalized subpath exports (`.`, `./theme`, `./launcher` — e.g. `os-widgets/src/launcher/modules.tsx`), `parts.ts` theming tokens across packages, and a hazard: **theme entry side effects must survive tree-shaking** (`sideEffects` handling was fixed in `6af07b94`/`2bdf55de`) — after switching to published packages, verify CSS still loads. `macos1-react` is no longer a published package on main (superseded by the os-core compatibility facade work, `ttmp/2026/04/09/os-core-compat--…`).

### 5.5 The app-repo second ring

The migration doesn't stop at wesen-os's own code: `go-go-app-inventory`, `go-go-app-sqlite`, `go-go-gepa`, `go-go-app-arc-agi-3` each pin April geppetto/pinocchio/goja too (the inventory "pinoweb" layer imports `pinocchio/pkg/webchat`-adjacent packages and geppetto events). Each needs a bump-and-fix pass before wesen-os's `go.work` can resolve a consistent graph. This is the long tail of Phase 1 and the reason to do the migration one module at a time with wesen-os's `go.work` as the integration harness.

### 5.6 react-chat: the chatapp-native chat frontend (chat-provider / chat-overlay)

`~/code/wesen/go-go-golems/react-chat` (Go module `github.com/go-go-golems/chat-overlay`; active late May–mid June 2026, tickets CHATOVERLAY-001..015) is the missing piece of the assistant migration story. It is a full-stack reference implementation of the new chat stack, and its React half is published:

- **`@go-go-golems/chat-provider` 0.2.1** — UI-agnostic runtime: `ChatProvider`, `createChatClient`, Redux Toolkit state on a **private** `ChatReduxContext` (`packages/chat-provider/src/ChatProvider.tsx:53` — it cannot collide with the wesen-os desktop's own store), timeline adapters, and the tool/widget APIs below. `sideEffects:false`, ESM, peers react ^18||^19.
- **`@go-go-golems/chat-overlay` 0.2.1** — opinionated floating overlay UI (`ChatOverlayProvider`, `ChatBubble`, `ChatPanel`, `ChatComposer`, `ChatMessages`) with a **retro-mac theme** (`src/theme/retro-mac.css`) that is aesthetically adjacent to the wesen-os desktop.

**Wire contract** (`createChatClient.ts:12-21,101-191`, `ws/protocol.ts:10-96`): REST per serverkit — `POST /api/chat/sessions`, `…/{id}/messages`, `…/{id}/stop`, `…/{id}/tools/manifest`, `…/{id}/tools/results` — plus a sessionstream WebSocket at `…/api/chat/ws` (subscribe frame with `sinceSnapshotOrdinal`, protojson-decoded `hello/snapshot/uiEvent/…` frames). Timeline events are the chatapp v1 vocabulary (`ws/timelineEvents.ts:47-313`): `ChatRunStarted/Finished/…`, `ChatTextSegmentStarted/Patch/Finished`, `ChatReasoningSegment*`, `ChatWidgetInstance*`, `ChatFrontendToolCall*`.

**Browser-side tool calls** — the feature that matters most for wesen-os. A page (i.e. a desktop app) registers a JS function the LLM can call:

```tsx
useFrontendTool({
  name: "inventory_add",                    // provider-safe: /^[a-zA-Z0-9_-]+$/
  description: "Add an item to the inventory",
  parameters: z.object({ name: z.string(), qty: z.number() }),
  execute: async (input, { signal, toolCallId }) => addItem(input),
}, [deps])
```

Roundtrip: mount → `POST …/tools/manifest` → Go `frontendtools.CommandManifest` into the sessionstream hub (`react-chat/internal/webchat/handlers.go:118-152`) → LLM tool call → `ChatFrontendToolCallRequested` uiEvent → provider validates with Zod and runs `execute` (`tools/toolRuntime.ts:37-105`) → `POST …/tools/results` → `frontendtools.CommandResult` back to the engine (`handlers.go:159-187`). There are also `HumanTool`s (render UI, wait for the user — `respondToHumanTool`) and typed streaming **widgets** (`defineWidget`/`WidgetOutlet`, driven by `ChatWidgetInstance*` events). Working examples: the ecommerce demo (`web/src/App.tsx`, `web/src/ecommerce/ProductCarousel.tsx` — `cart_add`, `checkout_confirm`, `catalog_search`).

**Position in the ecosystem** (verified by grepping every repo): react-chat was the incubator — its reusable Go pieces were upstreamed into pinocchio `pkg/chatapp` (tickets CHATOVERLAY-003/004/005), its go.mod pins pinocchio v0.11.5 / sessionstream v0.0.6 / geppetto v0.13.3. Its only external consumer today is `pinocchio/cmd/web-chat/web`, which uses chat-provider with custom UI. Crucially, `@go-go-golems/os-chat` (the current wesen-os chat UI) shares **no code** with it and speaks a different, older contract (`profileApi` against `/api/chat/profiles|schemas/*`, own `wsManager` decoding sem/timeline); and the go-go-os-chat Go repo still ships that old webchat/sem design. So chat-provider is not a competitor to os-chat — it is the replacement for os-chat's transport/runtime layer once the backend moves to chatapp.

**Gaps for wesen-os adoption**: (a) the backend contract is the blocker — none of the `/api/chat/sessions|ws` endpoints exist until the assistant module is ported to chatapp/sessionstream; (b) no desktop-shell embedding example exists yet (session lifecycle per desktop window is net-new design); (c) maturity is young (two TS unit-test files, first npm publish 2026-06-01) — acceptable given pinocchio itself consumes it; (d) the per-app profile surface (APP-31, `app_profile_surface.go`) has no chat-provider equivalent — profile selection stays a backend concern (`createSessionBody` can carry the profile slug).

**Theming note — matching the wesen-os macos1 look** (assessed 2026-07-03). The design targets are already the same: chat-overlay's default theme *is* "Retro Mac OS 1 monochrome" (`theme/retro-mac.css:1-6` — "Inspired by the original 1984 Macintosh: black on white, 1px borders, monospace typography, no gradients, no rounded corners"), with tokens `--color-mac-black/white/gray-1..5`, `--font-mono` (Menlo/Monaco), `--font-sans` (Chicago/Geneva); wesen-os's macos1 theme lives in os-core `--hc-*` tokens (`--hc-font-family: 'Chicago','Geneva','Helvetica',monospace`, `--hc-color-bg/fg/border/muted`, `--hc-border-radius: 0` — `os-core/src/theme/classic.css`) applied through `[data-part=…]` selectors (`os-chat/src/chat/theme/chat.css`). Alignment path: (1) the overlay chrome (bubble, panel, header, composer, scrollbars) uses stable `chat-overlay-*` component classes styled only by the 259-line theme file — either bridge tokens in a small wesen-os stylesheet (`.chat-overlay-root { --color-mac-black: var(--hc-color-fg); --font-mono: var(--hc-font-family); … }` plus border/shadow overrides — retro-mac's 2px borders + hard offset shadows differ slightly from the desktop's window chrome) or skip importing `retro-mac.css` (it is an explicit side-effect subpath export) and ship a wesen-os variant targeting the same classes. (2) One hazard: message-list internals (`overlay/ChatMessages.tsx:16-80`) still use Tailwind utility classes (`text-mac-gray-3`, `text-xs`, `space-y-2`, …) that only exist in react-chat's demo build — the wesen-os launcher has no Tailwind, so these would render unstyled; fix by defining those few class names as plain CSS under `.chat-overlay-root` in the wesen-os theme file (or upstream a PR converting them to stable classes, which react-chat already started for the chrome — see the comment in `retro-mac.css:33-38`). (3) For the real desktop conversation window (D7), this is moot: it is custom UI on chat-provider hooks and should be styled in the existing wesen-os idiom (`data-part` + `--hc-*` + os-core `Btn`/`Chip`), reusing `chat.css` rules largely as-is. (4) **Font decision (user direction, 2026-07-03): no Chicago.** Replace it with a normal stack — recommended `"Geneva", "Helvetica Neue", Helvetica, Arial, sans-serif` (no bitmap/web fonts; Geneva resolves on macOS, the rest everywhere). Chicago currently appears in four places to clean up during Phase 2: os-core `src/theme/classic.css:4`, `src/theme/desktop/theme/macos1.css:3`, `src/theme/desktop/tokens.css:9` (`--hc-font-family`), and chat-overlay `theme/retro-mac.css:10` (`--font-sans`) — the first three are one-line edits in go-go-os-frontend (needs an os-core release), the last is covered anyway by the wesen-os token bridge/replacement stylesheet setting `--font-sans` (and optionally an upstream PR to react-chat).

## 6. Decision records

### Decision D1: Where the migration work happens

- **Context:** The newest wesen-os is this workspace's unmerged `task/sqlite-federation-runtime-fix`; canonical `~/code/wesen/wesen-os` main is 5+ weeks behind it.
- **Options considered:** (a) work in `~/code/wesen/wesen-os` main and cherry-pick; (b) consolidate the workspace branch into main first, then migrate in a fresh workspace/branch; (c) keep hacking on the task branch.
- **Decision:** (b) — merge `task/sqlite-federation-runtime-fix` (and any stray `task/deploy-001-*`, widget-showcase work) into `wesen/wesen-os` main, then cut `task/2026-07-upgrade-stack` for the migration.
- **Rationale:** The task branch contains the deployed reality (the running image `sha-13ce252` was built from it — its commits appear in the GitOps bump history). Migrating on top of anything else recreates April's work by hand.
- **Consequences:** Requires cleaning the dirty submodule state first; main becomes the single source of truth again; the old workspace can be retired after.
- **Status:** proposed

### Decision D2: Submodules vs published Go modules for libraries

- **Context:** `go.work` + nine `workspace-links/` submodules made sense for co-developing April's features, but they froze the world and are the root cause of the drift being invisible.
- **Options considered:** (a) keep submodules, just bump their SHAs; (b) drop `go.work` overrides for the *library* repos (geppetto, pinocchio, go-go-os-backend/chat) and depend on tagged releases, keeping submodules only for actively co-developed app repos; (c) drop all submodules.
- **Decision:** (b).
- **Rationale:** geppetto/pinocchio/goja are released, tagged, and consumed at tags by their own ecosystem (go-go-os-chat main pins geppetto v0.13.3). Tag-pinning restores `go build` reproducibility without `go.work`, and CI (Docker build) never used the submodule graph consistently anyway. App repos (inventory, sqlite, gepa, arc-agi) still change in lockstep with wesen-os and keep their links until they stabilize.
- **Consequences:** go.mod becomes authoritative; needs new tags on any app repo before release; contributors lose "edit geppetto in place" convenience (recoverable per-task with a local `go.work`).
- **Status:** proposed

### Decision D3: Assistant backend migration path — port to chatapp/sessionstream directly

- **Context:** pinocchio deleted `pkg/webchat`+`pkg/sem`; wesen-os's assistant module is built on both. An earlier draft of this decision proposed consuming `go-go-os-chat` main as the migration vehicle, on the assumption it had been ported; the react-chat investigation (§5.6, `various/05`) showed go-go-os-chat main only bumped dependency pins and still ships its own old-architecture `pkg/webchat`+`pkg/sem` — so that option is dead until go-go-os-chat itself migrates.
- **Options considered:** (a) pin pinocchio at v0.10.14 forever; (b) vendor the old webchat into wesen-os; (c) port `pkg/assistantbackendmodule` to pinocchio `pkg/chatapp` + `sessionstream` directly, using `react-chat/internal/webchat` and `pinocchio/cmd/web-chat` as reference implementations; (d) wait for / drive a go-go-os-chat migration first and consume it.
- **Decision:** (c). Optionally upstream the result into go-go-os-chat afterwards (making it option (d) for the *next* host).
- **Rationale:** (c) is the only path with working reference code today — react-chat's `internal/webchat` (server.go, handlers.go, real_runtime.go, turn_store.go) is a complete, compact chatapp host including the frontend-tool bridge. (a) blocks every other bump (shared transitive deps); (b) forks ~60 files of deleted code; (d) adds a serial dependency on another repo's rewrite for no immediate gain.
- **Consequences:** the assistant's HTTP/WS wire format changes to serverkit + sessionstream (sessions/messages/stop/tools + `/api/chat/ws`), so the frontend must switch in the same phase (Decision D6). The APP-31 per-app profile surface logic (`app_profile_surface.go`, `profilechat` composer) must be re-hung onto chatapp's session-creation path (e.g. profile slug in `createSessionBody` → engine-profile resolution server-side). Manifest capabilities `chat, ws, timeline, profiles` re-map to the new endpoints. go-go-os-chat's role shrinks to legacy until upstreaming.
- **Status:** proposed (supersedes the earlier "via go-go-os-chat" variant)

### Decision D6: Assistant frontend — adopt @go-go-golems/chat-provider, drop the bespoke os-chat transport

- **Context:** The April `@go-go-golems/os-chat` UI decodes the deleted sem/timeline stream via its own `wsManager`; it cannot talk to a chatapp backend. react-chat publishes `chat-provider` (runtime, tools, widgets) and `chat-overlay` (opinionated UI) that speak the new contract natively (§5.6).
- **Options considered:** (a) rewrite os-chat's wsManager/timeline layer against chatapp; (b) use `chat-provider` as the transport/runtime and keep/port the os-chat UI components on top; (c) use `chat-provider` + `chat-overlay` wholesale and restyle the retro-mac theme for the desktop.
- **Decision:** (b), with (c) as the fast first milestone (the retro-mac overlay already fits the wesen-os aesthetic and proves the pipe end-to-end before any UI porting).
- **Rationale:** chat-provider is exactly the layer os-chat hand-rolled (WS decoding, timeline state, session lifecycle) plus features os-chat lacks (browser-side `useFrontendTool` tool registration, `HumanTool`s, typed streaming widgets). Its private Redux context makes it drop-in inside the wesen-os desktop's existing store. Rewriting os-chat's transport (a) duplicates published, pinocchio-consumed code.
- **Consequences:** wesen-os desktop apps can expose tools to the assistant (`useFrontendTool` per launcher module — e.g. inventory mutations, sqlite queries, window management), which is the headline UX win of the migration. os-chat's chat UI components become optional; anything kept must be re-wired from `conversationManager` to chat-provider hooks/selectors. Adds npm deps `@go-go-golems/chat-provider`, `@go-go-golems/chat-overlay` (+ zod). Version alignment: chat-provider 0.2.1 ↔ pinocchio ≥ v0.11.5 ↔ sessionstream ≥ v0.0.6.
- **Status:** proposed

### Decision D4: Frontend consumption — published npm packages as default, workspace links as dev mode

- **Context:** os-shell/os-chat/os-core/os-repl/os-kanban/os-widgets are now on npmjs; os-scripting/os-ui-cards/os-confirm are not yet. The `build:published` mode already exists.
- **Options considered:** (a) bump the frontend submodule and stay on `workspace:*`; (b) switch fully to published versions and delete the submodule; (c) published-by-default with an optional linked dev mode, publishing the three missing packages first.
- **Decision:** (c).
- **Rationale:** Published packages make the Docker build hermetic (today the image build depends on a submodule SHA that go.mod knows nothing about) and let other hosts reuse the launcher pattern. The missing three must be published anyway (`go-go-os-frontend/docs/npm-publishing-playbook.md` documents the flow). Keeping a linked mode preserves the fast inner loop for UI work.
- **Consequences:** Publish os-scripting/os-ui-cards/os-confirm (+ align os-core repo 0.1.3 vs npm 0.1.2); replace `workspace:*` with semver ranges; verify theme side-effect imports survive (known `sideEffects` hazard, §5.4); pnpm-workspace globs shrink.
- **Status:** proposed

### Decision D5: Deployment upgrades ride the existing pipeline; persistence and secrets are explicit follow-ups

- **Context:** The GHCR → GitOps-PR → Argo pipeline works and is documented; but `/app/data` is an emptyDir and no LLM API key is mounted, so "assistant with real inference + durable sqlite" is not deployable as-is.
- **Options considered:** (a) bundle infra changes into the migration; (b) migrate first at demo tier (arc disabled, default profile), then add PVC + Secret as a separate GitOps change.
- **Decision:** (b).
- **Rationale:** Keeps the migration rollback surface small (image tag revert) and follows the cluster's own playbook (`docs/app-runtime-secrets-and-identity-provisioning-playbook.md`); persistence changes touch Argo sync behavior (PVC + ServerSideApply) and deserve their own review. Note the profile YAML format check (§5.1) *is* part of the migration, since the new decoder can reject the current ConfigMap.
- **Consequences:** Phase 3 ships behavior-parity; Phase 5 adds PVC, Secret, and profile upgrades. Plaintext `hcloud_token`/`postgres_password` in `terraform.tfvars` flagged separately as a security cleanup.
- **Status:** proposed

### Decision D7: os-chat — staged full replacement by chat-provider/chat-overlay, not a retrofit

- **Context:** With D6 adopting chat-provider for the assistant, what happens to `@go-go-golems/os-chat` (7,640 LOC)? Inventory (`various/06`): ~⅓ is transport duplicating chat-provider (`wsManager`, `conversationManager`, the SEM decode stack incl. 1,245 LOC generated protos, timeline/session Redux slices); the presentational components (ChatView/StreamingChatView/ChatSidebar/ChatWindow) duplicate chat-overlay; genuinely unique are the desktop `ChatConversationWindow`, the per-kind timeline renderer registry (extended by os-scripting/hypercard), the two debug windows (EventViewer, TimelineDebug), and leaf utilities (`SyntaxHighlight`, `toYaml`, `StructuredDataTree`). The main window is not separable from the old transport (hard-wired to the singleton `conversationManager` and os-chat's own slices), and os-scripting/inventory are coupled to the timeline *data model*, not just components. os-chat has had no feature commits since 2026-05-11.
- **Options considered:** (a) retrofit — keep os-chat's public API, rebuild its internals on chat-provider behind an adapter mapping chat-provider state onto os-chat's `TimelineEntity`/`RenderEntity` contracts; (b) full replacement — deprecate os-chat, port the unique pieces onto chat-provider primitives, relocate the leaf utilities; (c) keep both stacks side by side.
- **Decision:** (b), staged. Discard transport + presentational layers. Rebuild `ChatConversationWindow` as a thin desktop window hosting chat-provider components. Re-home custom entity renderers (hypercard artifacts, tool/status/log) as chat-provider `defineTimelineAdapter`/`defineWidget` implementations. Rebuild the debug windows on chat-provider's `onDebugEvent` + raw sessionstream frames (good candidate to upstream into react-chat as a `chat-debug` package). Move `SyntaxHighlight`/`toYaml`/`StructuredDataTree` into os-core or a small utils package (apps-browser and os-scripting use them independently of chat).
- **Rationale:** A retrofit preserves a dead wire model — os-chat's public contracts *are* the SEM/timeline types being deleted server-side, so keeping its API means maintaining a permanent adapter to a protocol nothing emits. The duplication is generational, not incidental: chat-provider is the same layer done again, published, pinocchio-consumed, and strictly richer (frontend tools, human tools, widgets, stop). Option (c) doubles maintenance forever. The unique value in os-chat is four components and some utilities, not its architecture.
- **Consequences:** Breaking change for consumers, sequenced by coupling depth: launcher + inventory swap reducers/window imports (small, same surface); crm swaps reducers/theme; apps-browser needs only the relocated utilities; **os-scripting/hypercard is the long pole** (artifact/timeline projections re-target the adapter API — plan as its own sub-task, after the assistant migration proves the stack). The dead `profileApi` schema surface is dropped; profile switching rebuilds on the new session-create path (D3). Retire the `@go-go-golems/os-chat` name rather than reusing it — a same-name v2 with an incompatible API invites confusion; a new name (e.g. `os-chat-desktop`) marks the boundary.
- **Status:** proposed

## 7. Implementation plan

Work top of the dependency graph downward; keep the tree compiling at every step with `go build ./... && go vet ./...` in wesen-os and `pnpm -r build` for the frontend.

### Phase 0 — Consolidate wesen-os itself (½ day)

1. In the workspace wesen-os: commit or stash the four dirty paths (`go.work.sum`, `ttmp/vocabulary.yaml`, submodule pointers); commit this ticket's ttmp tree.
2. Push `task/sqlite-federation-runtime-fix`; open and merge PR → `wesen/wesen-os` main. Sweep the other local `task/*` branches (`git log main..task/…`) for unmerged work — the widget-showcase and deploy-001 series appear to already be contained in the current branch's history; verify with `git branch --no-merged main`.
3. Sync `~/code/wesen/wesen-os` to the new main. Cut `task/2026-07-upgrade-stack`.
4. Baseline check: `docker build .` must reproduce a working image before any bump (this is the rollback reference).

### Phase 1 — Go stack bump (the core, 2–4 days)

Order matters; each step is "bump, build, fix, test" for one layer:

1. **Libraries to tags** (Decision D2): in `go.mod` set geppetto ≥ v0.13.3, pinocchio ≥ v0.11.5, go-go-goja v0.8.3, go-go-os-backend ≥ v0.0.5, add `github.com/go-go-golems/sessionstream` ≥ v0.0.6 (version-align with react-chat's `go.mod:6-9`); delete the corresponding `go.work` use-entries and the `go-go-os-chat` replace. `go-go-os-chat` is likely droppable entirely after step 3 (Decision D3) — it still ships the old webchat/sem design. `go mod tidy`.
2. **Mechanical fixes** — expect these compile errors and apply the §5 tables:
   - geppetto events constructors (only in code we own that *emits* events; consumers of `EventRouter` are fine),
   - `pinocchio/pkg/cmds/helpers` → `profilebootstrap` (touches `cmd/wesen-os-launcher/profile_bootstrap.go:27,31`),
   - any `go-go-goja/engine` import → `pkg/engine` + renames (mostly inside gepa).
3. **Assistant rewrite** (Decisions D3/D6): re-implement `pkg/assistantbackendmodule` and `main.go:238-273` against pinocchio `pkg/chatapp` + sessionstream, cribbing from `react-chat/internal/webchat/{server.go,handlers.go,real_runtime.go,turn_store.go}` (the smallest complete host, including the frontend-tool bridge) and `pinocchio/cmd/web-chat`. Target shape, in pseudocode:

```go
// replaces webchat.NewServer wiring in main.go
hub := sessionstream.NewHub(schemaRegistry)            // + sqlite hydration for /app/data
engine := chatapp.NewEngine(
    chatapp.WithTurnStore(chatstore.NewSqliteTurnStore(db)),
    chatapp.WithHooks(assistantHooks))
chatapp.RegisterSchemas(schemaRegistry, plugins...)     // incl. frontendtools + widgets plugins
chatapp.Install(hub, engine)
svc := chatapp.NewService(hub, engine)
// serverkit handlers mounted under the assistant's namespace
// (chat-provider's basePrefix/apiBase config points the frontend here)
mux.Handle("POST /api/apps/assistant/api/chat/sessions", createSessionHandler(svc))
mux.Handle("POST /api/apps/assistant/api/chat/sessions/{id}/messages", submitHandler(svc))
mux.Handle("POST /api/apps/assistant/api/chat/sessions/{id}/tools/manifest", toolManifestHandler(hub))
mux.Handle("POST /api/apps/assistant/api/chat/sessions/{id}/tools/results", toolResultHandler(hub))
mux.Handle("GET  /api/apps/assistant/api/chat/ws", sessionstreamWS(hub))
// profile selection: keep the engineprofiles registry chain from profile_bootstrap.go;
// resolve the profile slug carried in createSessionBody into the runtime composed per session
```

   Exact names come from `pinocchio/pkg/chatapp/{chat.go,service.go,serverkit/contracts.go}` and `react-chat/internal/webchat/handlers.go:118-187` — read those before coding; do not trust this sketch over the source. Frontend side in the same branch: wrap the launcher (or the assistant window) in `<ChatProvider config={{basePrefix:'/api/apps/assistant'}}>` and mount `chat-overlay` as the first milestone (Decision D6).
4. **App repos**: bump geppetto/pinocchio/goja in go-go-gepa, go-go-app-inventory (its pinoweb layer has the most events/webchat exposure), go-go-app-sqlite, go-go-app-arc-agi-3; tag or keep as workspace links per D2. gepa's `js_runtime.go` gets the goja renames.
5. **Profile YAML**: validate `profiles.runtime.yaml` (both local defaults and the k3s ConfigMap copy) against the new engineprofiles decoder; reformat from legacy `profiles:` map to single-registry layout if rejected.

### Phase 2 — Frontend to published npm packages (1–2 days)

1. Publish the missing packages from go-go-os-frontend main: os-scripting, os-ui-cards, os-confirm; release os-core 0.1.3 (repo is ahead of npm). Follow `docs/npm-publishing-playbook.md` (trusted publishing CI).
2. In `apps/os-launcher/package.json`, replace `workspace:*` with published ranges for the os-* packages; make `build:published` the default `build`; keep a `build:linked` script for dev.
3. Assistant UI: add `@go-go-golems/chat-provider` + `@go-go-golems/chat-overlay` (0.2.1+) and retire the os-chat transport layer *for the assistant* (Decision D6; pairs with Phase 1 step 3 — one branch). Apply the theming plan from §5.6: token bridge / replacement stylesheet, plain-CSS fallbacks for the Tailwind utilities in ChatMessages, and the no-Chicago font stack (three one-line os-core edits + release). The complete os-chat replacement across all consumers is deliberately deferred to Phase 4, after the stack has stabilized.
4. Check theme side effects: every os-* package's `./theme` import must still emit CSS in the vite build (§5.4 hazard); diff the built dist CSS against the pre-migration build.
5. Drop `workspace-links/go-go-os-frontend` (submodule + pnpm glob) once green; app-repo frontends (inventory, arc-agi player, hypercard-tools…) stay linked until their packages publish.

### Phase 3 — Ship it (½ day + bake time)

1. `docker build` locally; run the smoke script (`scripts/smoke-wesen-os-launcher.sh`) against the container: `/`, `/api/os/apps`, one assistant session round-trip, one sqlite query.
2. Update the k3s repo's `gitops/kustomize/wesen-os/config/profiles.runtime.yaml` if Phase 1.5 changed the format (this rolls the deployment by config-hash).
3. Merge to main → CI pushes `ghcr.io/wesen/wesen-os:sha-<new>` → merge the auto-opened GitOps PR → Argo syncs.
4. Verify: `kubectl -n wesen-os rollout status deployment/wesen-os`; `curl https://wesen-os.yolo.scapegoat.dev/api/os/apps`; open the desktop, launch assistant/sqlite/gepa. Rollback = revert the GitOps PR (image tag).

### Phase 4 — Complete os-chat replacement (Decision D7; start once Phases 1–3 have stabilized in production)

Entry criteria: the assistant runs on chatapp/sessionstream at wesen-os.yolo.scapegoat.dev without regressions for a comfortable bake period, and chat-provider/chat-overlay are proven inside the launcher. Then replace `@go-go-golems/os-chat` everywhere and retire it:

1. **Relocate the leaf utilities** (`SyntaxHighlight`, `toYaml`, `StructuredDataTree`) out of os-chat into os-core (or a small `os-debug-utils` package); update the two independent consumers (`apps/apps-browser`, `packages/os-scripting`); publish.
2. **Rebuild the desktop conversation window** on chat-provider hooks — new package (working name `os-chat-desktop`) or directly in the launcher; port the builtin renderers (tool-call/tool-result/message/status/log) as chat-provider `defineTimelineAdapter` implementations; style in the wesen-os idiom (`data-part` + `--hc-*`, §5.6).
3. **Rebuild the debug windows** (EventViewer, TimelineDebug) on chat-provider's `onDebugEvent` + raw sessionstream frames; evaluate upstreaming into react-chat as a `chat-debug` package.
4. **Re-target os-scripting/hypercard** (the long pole, its own sub-ticket): artifact projection middleware and custom timeline entities move from os-chat's `timelineSlice`/`RenderEntity` contracts to `defineTimelineAdapter`/`defineWidget`. Validate `defineTimelineAdapter` can express the artifact-projection flow *before* scheduling (flagged in §9).
5. **Migrate the remaining consumers**: `go-go-app-inventory/apps/inventory` (window + reducers) and `apps/crm` (reducers + theme) swap to chat-provider equivalents; consumers stop mounting chat reducers entirely (chat-provider's store is private).
6. **Retire the package**: deprecate `@go-go-golems/os-chat` on npm, delete `packages/os-chat` from go-go-os-frontend, `rg '@go-go-golems/os-chat'` across all repos must return nothing; mark the go-go-os-chat Go repo legacy (or port it to chatapp if other hosts still need it — D3 consequence).
7. Exit criteria: launcher, inventory, crm, apps-browser, os-scripting all build and run without os-chat; the SEM proto tree (`os-chat/src/chat/sem/pb`, 1,245 LOC) is gone from the npm graph.

### Phase 5 — Improvements backlog (prioritized)

1. **Durable data**: PVC for `/app/data` (sqlite + sessionstream sqlite hydration make this newly valuable); flip the Argo labels to `has-persistent-storage=true`.
2. **Real inference in prod**: mount an API-key Secret per the cluster's secrets playbook (Vault + vault-secrets-operator are already on the cluster); upgrade the default profile from `gpt-4.1-mini` demo config.
3. **Desktop apps as assistant tools**: once chat-provider is in (D6), each launcher module can register `useFrontendTool`s scoped to its domain (inventory mutations, sqlite queries, kanban card creation, window/desktop management) and `defineWidget` streaming widgets rendered inside chat. This turns the assistant from a chat window into the desktop's automation layer — the highest-leverage improvement unlocked by this migration. Prototype: port one tool from the react-chat ecommerce demo pattern (`web/src/ecommerce/ProductCarousel.tsx`).
4. **Adopt new capabilities**: geppetto `pkg/observability` observers wired to the cluster's Loki/monitoring stack; chatapp `export/minitrace` for conversation debugging; goja default modules + `modules/express` for JS-defined app backends; xgoja v2 `providerapi` as the long-term shape for GEPA/user scripting.
5. **Hygiene**: delete the stale `deploy/k8s/wesen-os/` copy in the source repo (or regenerate it from the gitops truth); rotate + move `hcloud_token`/`postgres_password` out of `terraform.tfvars` (the repo has a `vault/` dir — use it); retire this 2026-03-02 workspace once main is consolidated.
6. **Repo/story simplification**: with published npm packages and tagged Go modules, `wsm`/go.work workspaces become per-task tools instead of permanent infrastructure — document the new default dev setup in `docs/startup-playbook.md`. Consider upstreaming the ported assistant module into go-go-os-chat so the next host gets the chatapp stack for free (D3 consequence).

## 8. Testing and validation strategy

- **Per-step compile gate**: `go build ./... && go test ./...` in wesen-os after every dependency bump; `pnpm -r build && pnpm -r test` (vitest) for the frontend. The go.work integration harness catches cross-repo mismatches during Phase 1 step 4.
- **Assistant contract test**: add a Go httptest that boots the module registry with a fake engine (geppetto `Engine` is a 1-method interface) and drives create-session → submit → stream, asserting canonical event order (RunStarted → TextDelta* → TextSegmentFinished → RunFinished). This pins the new wire format and survives future pinocchio churn.
- **Smoke script**: extend `scripts/smoke-wesen-os-launcher.sh` to cover `/api/os/apps`, `/api/os/federation-registry`, one assistant round-trip (can run with a `NoopEngine` profile so CI needs no API key), one sqlite query.
- **Frontend visual/regression**: launch locally (`npm run launcher:binary:build && ./build/wesen-os-launcher`), open each launcher module once; diff built CSS size to catch the theme-side-effect hazard; run existing vitest suites in os-launcher.
- **Deployment validation**: post-sync, `kubectl -n wesen-os rollout status`, probe endpoints, then restart the pod once deliberately to confirm behavior with fresh `emptyDir` (until Phase 5.1 lands persistence).
- **Docs doctor**: `docmgr doctor --ticket WESEN-OS-STOCKTAKE-2026-07` on ticket updates.

## 9. Risks, alternatives, open questions

**Risks**
- The chatapp/sessionstream port is the schedule risk: the SEM→proto rewrite has no mechanical mapping (33 timeline-proto imports across the workspace, mostly in inventory pinoweb). Mitigation: consume go-go-os-chat main (D3) and treat inventory's chat surface as its own sub-task; if it drags, ship wesen-os with assistant migrated and inventory chat temporarily disabled (modules are independently mountable).
- Frontend/backend wire-format skew: old os-chat UI + new backend (or vice versa) silently breaks streaming. Mitigation: single branch for Phase 1.3 + 2.3; the contract test.
- The published npm packages may lag repo mains (os-core 0.1.2 vs 0.1.3 already). Mitigation: publish before consuming; pin exact versions initially.
- Profile ConfigMap rejection at startup would crashloop the pod post-deploy. Mitigation: Phase 1.5 validates the exact prod YAML locally first.
- Single-node cluster: a bad rollout takes the site down (1 replica, no HA). Acceptable at demo tier; rollback is one Git revert.

**Alternatives considered and rejected**: pinning the old stack forever (blocks every future feature, and the ecosystem's own repos have moved); vendoring webchat (permanent fork of deleted code); big-bang rewrite of wesen-os on xgoja v2 (interesting future, but conflates migration with re-architecture).

**Open questions**
1. ~~Does go-go-os-chat main's chatservice still expose a per-app profile surface?~~ Resolved 2026-07-03: go-go-os-chat main is still old-architecture, so it is out of the assistant path (D3 revised). The APP-31 profile-surface logic ports into chatapp's session-creation flow instead — the exact hook point (session-create hook vs runtime composer) still needs choosing while reading `chatapp/chat.go`.
2. What is the current pinocchio release tag ≥ v0.11.5 (react-chat's pin)? Check `git -C ~/code/wesen/go-go-golems/pinocchio tag --sort=-v:refname | head`; align chat-provider 0.2.1 ↔ pinocchio ↔ sessionstream versions.
3. Is `macos1-react`'s deprecation complete in the launcher (os-core facade fully adopted), or does `apps/os-launcher` still import it anywhere? (`rg macos1-react apps/os-launcher/src`.)
4. Should GEPA move to xgoja v2 providers now (Phase 5.4) or stay on the classic engine API for this migration? Recommend: stay classic now; xgoja later.
5. Who merges the GitOps PRs — is `GITOPS_PR_TOKEN` still valid after 3 months? Check before Phase 3.

## 10. References

**wesen-os (workspace checkout, `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/`)**
- `README.md`, `AGENT.md` — composition-repo contract
- `cmd/wesen-os-launcher/main.go` — server wiring (see :86, :97, :238-273, :363-397, :448)
- `cmd/wesen-os-launcher/profile_bootstrap.go`, `app_profile_surface.go`, `federation_registry_endpoint.go`, `docs_endpoint.go`
- `pkg/assistantbackendmodule/module.go` — the module to rewrite (:42-50, :68-81)
- `pkg/{sqlite,gepa,arcagi}/module.go`, `pkg/launcherui/handler.go`
- `apps/os-launcher/package.json`, `src/app/{modules.tsx,registry.ts,loadFederatedAppContracts.ts}`
- `go.mod`, `go.work`, `.gitmodules`, `package.json`, `pnpm-workspace.yaml`
- `Dockerfile`, `scripts/{build-wesen-os-launcher.sh,launcher-ui-sync.sh,smoke-wesen-os-launcher.sh,open_gitops_pr.py}`, `deploy/gitops-targets.json`
- `.github/workflows/{publish-host-image.yml,deploy-host-to-k3s.yml}`

**Dependency mains (`~/code/wesen/go-go-golems/`)**
- `geppetto/pkg/events/{chat-events.go,canonical_events.go,canonical_tool_events.go,correlation.go}`
- `geppetto/pkg/engineprofiles/`, `geppetto/pkg/observability/`, `geppetto/pkg/js/modules/geppetto/provider/`
- `pinocchio/pkg/chatapp/{chat.go,service.go,serverkit/,rpc/jsonl/,export/}`, `pinocchio/pkg/spa/`, `pinocchio/pkg/cmds/profilebootstrap/`
- `sessionstream/pkg/sessionstream/` (+ `hydration/sqlite`)
- `go-go-goja/pkg/engine/{factory.go,module_specs.go,module_middleware.go,options.go}`, `modules/express/`, `pkg/gojahttp/`, `pkg/xgoja/providerapi/provider_registry.go`, `pkg/runtimeowner/runner.go`
- `go-go-os-chat/pkg/{chatservice,profilechat,webchat,sem}/` (still old-architecture — legacy reference only)
- `react-chat/packages/chat-provider/src/{index.ts,ChatProvider.tsx,core/createChatClient.ts,tools/{toolRegistry.ts,toolRuntime.ts,useFrontendTool.ts},ws/{protocol.ts,timelineEvents.ts}}`
- `react-chat/packages/chat-overlay/src/{index.ts,overlay/ChatOverlayProvider.tsx,theme/retro-mac.css}`
- `react-chat/internal/webchat/{server.go,handlers.go,real_runtime.go,turn_store.go}`, `react-chat/go.mod` (version-alignment reference), `react-chat/web/src/ecommerce/ProductCarousel.tsx` (frontend-tool example)
- `pinocchio/cmd/web-chat/web/` (chat-provider consumer with custom UI)
- `go-go-os-backend/pkg/backendhost/`
- `go-go-os-frontend/packages/*/package.json`, `packages/os-widgets/src/launcher/modules.tsx`, `packages/*/src/parts.ts`, `docs/npm-publishing-playbook.md`, `docs/{runtime-concepts-guide.md,js-api-user-guide-reference.md}`

**Deployment (`/home/manuel/code/wesen/2026-03-27--hetzner-k3s/`)**
- `main.tf`, `variables.tf`, `terraform.tfvars`, `cloud-init.yaml.tftpl`
- `gitops/applications/wesen-os.yaml`, `gitops/projects/demo-apps.yaml`
- `gitops/kustomize/wesen-os/{deployment.yaml,service.yaml,ingress.yaml,kustomization.yaml,config/}`
- `gitops/kustomize/platform-cert-issuer/clusterissuer.yaml`
- `docs/{app-deployment-pipeline.md,argocd-app-setup.md,kustomize-generated-config-rollout-pattern.md,app-runtime-secrets-and-identity-provisioning-playbook.md,cluster-architecture-overview.md}`

**Ticket-internal raw evidence**
- `various/01-raw-findings-k3s-deployment.md`
- `various/02-raw-findings-wesen-os-architecture.md`
- `various/03-raw-findings-go-go-goja-and-npm-packages.md`
- `various/04-raw-findings-geppetto-pinocchio-api-drift.md`
- `various/05-raw-findings-react-chat.md`
- `various/06-raw-findings-os-chat-inventory.md`

**Prior tickets worth reading** (in wesen-os `ttmp/`): `2026/02/27/GEPA-09-REPO-SPLIT-ARCHITECTURE`, `2026/04/01/SQLITE-FED-001`, `2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES`, `2026/04/09/os-core-compat`, `2026/04/10/macos1-npm-publish`, `2026/04/01/KUSTOMIZE-ROLL-001`.
