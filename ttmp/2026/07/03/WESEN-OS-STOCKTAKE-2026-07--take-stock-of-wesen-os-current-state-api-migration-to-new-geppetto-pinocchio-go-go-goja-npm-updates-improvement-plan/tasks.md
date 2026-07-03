# Tasks

Execution tracker for the migration plan in
[design-doc/01-wesen-os-stocktake-system-analysis-api-migration-guide-and-improvement-plan.md](./design-doc/01-wesen-os-stocktake-system-analysis-api-migration-guide-and-improvement-plan.md)
(§7 Implementation plan; Decisions D1–D7). Phases 0–3 are the migration; Phase 4 is the complete
os-chat replacement (starts only after Phases 1–3 have stabilized in production); Phase 5 is the
improvement backlog.

## Phase 0 — Consolidate wesen-os (D1)

- [ ] Commit/stash the dirty workspace state (`go.work.sum`, `ttmp/vocabulary.yaml`, submodule pointers); commit this ticket's ttmp tree
- [ ] Push `task/sqlite-federation-runtime-fix`; open + merge PR into `wesen/wesen-os` main
- [ ] Sweep local `task/*` branches for unmerged work (`git branch --no-merged main`); merge or discard explicitly
- [ ] Verify the deployed image `sha-13ce252` really descends from the merged history (basis of D1)
- [ ] Sync `~/code/wesen/wesen-os` to new main; cut `task/2026-07-upgrade-stack`
- [ ] Baseline: `docker build .` reproduces a working image (rollback reference)

## Phase 1 — Go stack bump + assistant backend (D2, D3)

- [ ] Answer open question: current pinocchio release tag ≥ v0.11.5; pin the version triple (chat-provider 0.2.1 ↔ pinocchio ↔ sessionstream ≥ v0.0.6)
- [ ] go.mod: geppetto ≥ v0.13.3, pinocchio ≥ v0.11.5, go-go-goja v0.8.3, go-go-os-backend ≥ v0.0.5, + sessionstream; drop library `go.work` use-entries and the go-go-os-chat replace; `go mod tidy`
- [ ] Mechanical fixes: geppetto canonical events (§5.1 table), `pinocchio/pkg/cmds/helpers` → `profilebootstrap` (`profile_bootstrap.go:27,31`), goja `engine` → `pkg/engine` renames (mostly in gepa)
- [ ] Read `pinocchio/pkg/chatapp/{chat.go,service.go,serverkit/contracts.go}` + `react-chat/internal/webchat/handlers.go` before coding; decide the APP-31 profile hook point (session-create hook vs runtime composer)
- [ ] Rewrite `pkg/assistantbackendmodule` on chatapp/sessionstream: hub + engine + service + serverkit handlers (sessions/messages/stop/tools/ws) under `/api/apps/assistant/…`
- [ ] Verify chat-provider WS URL composition works under the namespaced `basePrefix` (`ws/protocol.ts:10-13`)
- [ ] Re-map manifest capabilities (`chat, ws, timeline, profiles`) to the new endpoints
- [ ] Bump + fix app repos: go-go-gepa (goja renames in `js_runtime.go`), go-go-app-inventory (pinoweb events/webchat exposure — biggest), go-go-app-sqlite, go-go-app-arc-agi-3; tag or keep linked per D2
- [ ] Validate `profiles.runtime.yaml` (local + k3s ConfigMap copy) against the new engineprofiles decoder; reformat from legacy `profiles:` map if rejected
- [ ] Add assistant contract test: fake engine, create-session → submit → stream, assert canonical event order
- [ ] Gate: `go build ./... && go test ./...` green with no go.work library overrides

## Phase 2 — Frontend to published npm packages + assistant UI (D4, D6)

- [ ] Publish missing packages from go-go-os-frontend main: os-scripting, os-ui-cards, os-confirm; release os-core 0.1.3 (repo ahead of npm)
- [ ] os-core font cleanup (no-Chicago decision, §5.6(4)): edit `theme/classic.css:4`, `theme/desktop/theme/macos1.css:3`, `theme/desktop/tokens.css:9` to `"Geneva", "Helvetica Neue", Helvetica, Arial, sans-serif`; release
- [ ] `apps/os-launcher/package.json`: replace `workspace:*` with published semver ranges; make `build:published` the default; keep `build:linked` for dev
- [ ] Add `@go-go-golems/chat-provider` + `@go-go-golems/chat-overlay`; mount `<ChatProvider config={{basePrefix:'/api/apps/assistant'}}>` + overlay as first milestone (same branch as Phase 1 assistant rewrite)
- [ ] Theming (§5.6): wesen-os stylesheet for `chat-overlay-*` classes (token bridge `--color-mac-* → --hc-*` or replacement for retro-mac.css); plain-CSS fallbacks for the Tailwind utilities in `ChatMessages.tsx`; optional upstream PR to react-chat finishing the Tailwind→stable-classes conversion (incl. `--font-sans` without Chicago)
- [ ] Verify theme side effects survive the vite build (CSS present for every os-* `./theme` import; diff built CSS size vs pre-migration)
- [ ] Drop `workspace-links/go-go-os-frontend` submodule + pnpm glob once green (app-repo frontends stay linked until published)
- [ ] Gate: `pnpm -r build && pnpm -r test` green in published mode; launcher runs locally with assistant round-trip

## Phase 3 — Ship (D5)

- [ ] Confirm `GITOPS_PR_TOKEN` still valid (3 months old)
- [ ] Local `docker build`; extend + run `scripts/smoke-wesen-os-launcher.sh` (/, /api/os/apps, /api/os/federation-registry, assistant round-trip with NoopEngine profile, one sqlite query)
- [ ] Update k3s repo `gitops/kustomize/wesen-os/config/profiles.runtime.yaml` if the format changed (config-hash rollout)
- [ ] Merge to main → GHCR image → merge auto-opened GitOps PR → Argo sync
- [ ] Verify: `kubectl -n wesen-os rollout status deployment/wesen-os`; `curl https://wesen-os.yolo.scapegoat.dev/api/os/apps`; desktop smoke (assistant, sqlite, gepa); deliberate pod restart to confirm emptyDir behavior
- [ ] Bake period defined and observed (entry criterion for Phase 4)

## Phase 4 — Complete os-chat replacement (D7 — only after Phases 1–3 stabilize)

- [ ] Pre-flight: validate `defineTimelineAdapter` can express hypercard's artifact-projection flow (blocker check flagged in §9)
- [ ] Relocate leaf utilities (`SyntaxHighlight`, `toYaml`, `StructuredDataTree`) into os-core or `os-debug-utils`; update apps-browser + os-scripting; publish
- [ ] Rebuild the desktop conversation window on chat-provider hooks (`os-chat-desktop` or in-launcher); port builtin renderers (tool-call/result/message/status/log) as timeline adapters; style via `data-part` + `--hc-*`
- [ ] Rebuild debug windows (EventViewer, TimelineDebug) on `onDebugEvent` + raw sessionstream frames; evaluate upstreaming as react-chat `chat-debug` package
- [ ] Sub-ticket: re-target os-scripting/hypercard (artifact projections, custom timeline entities) onto `defineTimelineAdapter`/`defineWidget` — the long pole
- [ ] Migrate remaining consumers: inventory app (window + reducers), crm (reducers + theme)
- [ ] Retire `@go-go-golems/os-chat`: npm deprecate, delete `packages/os-chat`, `rg '@go-go-golems/os-chat'` clean across all repos; mark go-go-os-chat Go repo legacy or port it to chatapp
- [ ] Exit gate: launcher/inventory/crm/apps-browser/os-scripting build + run without os-chat; SEM proto tree gone from the npm graph

## Phase 5 — Improvements backlog (prioritized)

- [ ] PVC for `/app/data` (sqlite + sessionstream hydration durability); flip Argo labels to `has-persistent-storage=true`
- [ ] API-key Secret via the cluster secrets playbook (Vault + vault-secrets-operator); upgrade default profile beyond `gpt-4.1-mini`
- [ ] Desktop apps as assistant tools: `useFrontendTool` per launcher module (inventory, sqlite, kanban, window management) + `defineWidget` widgets; prototype one from the react-chat ecommerce pattern
- [ ] Adopt new capabilities: geppetto observability → Loki; chatapp minitrace export; goja default modules + `modules/express`; evaluate xgoja v2 providerapi for GEPA/user scripting
- [ ] Hygiene: delete stale `deploy/k8s/wesen-os/` copy; rotate + vault the `terraform.tfvars` secrets; retire the 2026-03-02 workspace
- [ ] Document the new default dev setup (published packages, tagged modules, per-task go.work) in `docs/startup-playbook.md`; consider upstreaming the assistant module into go-go-os-chat

## Done (analysis work, this ticket)

- [x] Create ticket workspace and docs (2026-07-03)
- [x] Snapshot workspace vs canonical repo state (wsm status --fetch, git log dates)
- [x] Evidence sweeps: wesen-os architecture, geppetto/pinocchio drift, go-go-goja + npm packages, k3s deployment (various/01–04)
- [x] Write primary analysis/design/implementation guide (design-doc/01)
- [x] react-chat assessment → §5.6, D3 revised, D6 added (various/05)
- [x] os-chat inventory → D7 staged full replacement (various/06)
- [x] Theming assessment (macos1 alignment, Tailwind hazard) + no-Chicago font decision → §5.6(3)(4)
- [x] Restructure plan to six phases with dedicated Phase 4 os-chat replacement; detailed per-phase tasks (this file)
- [x] docmgr doctor clean; bundle uploaded to reMarkable (v1 2026-07-03, v2 with react-chat/os-chat/theming material)
