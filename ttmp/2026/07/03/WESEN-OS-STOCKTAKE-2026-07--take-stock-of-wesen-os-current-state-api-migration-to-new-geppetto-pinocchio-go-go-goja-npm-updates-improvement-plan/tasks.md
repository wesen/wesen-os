# Tasks

Execution tracker for the migration plan in
[design-doc/01-wesen-os-stocktake-system-analysis-api-migration-guide-and-improvement-plan.md](./design-doc/01-wesen-os-stocktake-system-analysis-api-migration-guide-and-improvement-plan.md)
(§7 Implementation plan; Decisions D1–D7). Phases 0–3 are the migration; Phase 4 is the complete
os-chat replacement (starts only after Phases 1–3 have stabilized in production); Phase 5 is the
improvement backlog.

## Phase 0 — Consolidate wesen-os (D1)

- [x] Commit/stash the dirty workspace state (`go.work.sum`, `ttmp/vocabulary.yaml`, submodule pointers); commit this ticket's ttmp tree
- [x] Push `task/sqlite-federation-runtime-fix`; open + merge PR into `wesen/wesen-os` main
- [x] Sweep local `task/*` branches for unmerged work (`git branch --no-merged main`); merge or discard explicitly
- [x] Verify the deployed image `sha-13ce252` really descends from the merged history (basis of D1)
- [x] Cut `task/2026-07-upgrade-stack` (workspace checkout; `~/code/wesen/wesen-os` clone unsyncable this session — /home mounted ro; pull it later)
- [x] Baseline: publish-host-image CI green on consolidated main (after pnpm-lock fix PR #13); deployed image sha-13ce252 untouched

## Phase 1 — Go stack bump + assistant backend (D2, D3)

- [x] Version triple pinned: geppetto v0.13.3, pinocchio v0.11.5, sessionstream v0.1.0, go-go-os-backend v0.0.7, goja v0.9.6 via MVS, go 1.26.3
- [x] go.mod bumped + sessionstream added; library go.work entries and submodules dropped (232a960); go-go-os-chat dependency removed entirely; replaces for in-flight inventory/gepa submodules
- [x] Mechanical fixes done (profile_bootstrap → ResolveCLIProfileRuntime; glazed help/model sections; pinocchio cobra middlewares; gepa goja renames c01a8e1)
- [x] Reference reading done; APP-31 profile hook = per-session profile in createSessionBody, resolved per prompt in chathost
- [x] pkg/chathost written (reusable host); assistant + inventory rewritten on it (ca9098e, inventory 4397deb)
- [x] Verified: chat-provider `buildWebSocketURL` composes `${proto}://${host}${basePrefix}/api/chat/ws`; assistant window connects under `/api/apps/assistant` (browser-confirmed, ws subscribed)
- [x] Manifest capabilities re-mapped (chat, chat-sessions, ws, frontend-tools, profiles); inventory reflection doc updated
- [x] App repos bumped: gepa + inventory ported (pinoweb quarantined as _pinoweb_legacy → Phase 4 sub-ticket); sqlite + arc-agi build clean unchanged
- [x] Validated prod profiles.runtime.yaml: decodes + boots under the new stack, BUT `runtime.step_settings_patch.ai-chat.ai-engine` is dead config for chathost — Phase 3 must rewrite it to `profiles.default.inference_settings.chat: {api_type, engine}` in the k3s repo
- [x] chathost contract tests (2873def): fake engine + httptest — prompt round-trip, system-prompt-once + history accumulation, per-session profile, client session id
- [x] Gate passed: build+test green, no library overrides; launcher smoke on :18099 (session create → prompt → snapshot with correlated error entity)
- [x] Fixed profile-stack resolution + app-surface credential inheritance (ResolveEngineProfile + ResolvedBaseSettings, 9ad8ff4); added --print-inference-settings diagnostic; real gpt-5-nano inference verified

## Phase 2 — Frontend to published npm packages + assistant UI (D4, D6)

- [x] Publish missing packages from go-go-os-frontend main — os-scripting/os-ui-cards/os-confirm were already published & version-current; os-core released as **0.1.4** (font fix, upstream `ec19a1c7`, npm latest)
- [x] os-core font cleanup (no-Chicago decision, §5.6(4)): edited `theme/classic.css:4`, `theme/desktop/theme/macos1.css:3`, `theme/desktop/tokens.css:9` to `"Geneva", "Helvetica Neue", Helvetica, Arial, sans-serif`; released in os-core 0.1.4
- [x] `apps/os-launcher/package.json`: replaced `workspace:*` with published semver ranges for **8 of 8** os-* (os-shell published as **0.1.3** with `FederatedAppHostContract` + store-core fix); made `build:published` the default; added `build:linked` for dev; made published typecheck the default and kept `typecheck:linked` for dev. Branch `task/2026-07-os-launcher-published-npm-deps` (`83e44aa`). See diary Step 13.
- [x] Assistant window mounts ChatProvider(basePrefix=/api/apps/assistant) + chat-overlay ChatMessages/ChatComposer (302054e); real gpt-5-nano round-trip verified in browser
- [x] assistant-chat-macos1.css: token bridge + component layout + Tailwind-utility fallbacks + no-Chicago font (302054e). Upstream Tailwind→stable-classes PR still open (future)
- [x] Verify theme side effects survive the vite build — published-mode build bundles the os-core macos1 theme CSS; built `--hc-font-family` is Chicago-free (4 residual "Chicago" tokens are os-widgets `--mac-font` widget-art themes, out of scope)
- [ ] Drop `workspace-links/go-go-os-frontend` submodule + pnpm glob once green — **deferred/out of scope**: os-* package graph is now published via semver ranges + root `pnpm.overrides`, but unpublished app packages (`crm`, `todo`, `book-tracker-debug`, `apps-browser`, `hypercard-tools`, `inventory`, etc.) still require the submodules.
- [x] Gate: published-mode launcher build green; `pnpm --filter @go-go-golems/os-launcher run typecheck` green; `pnpm why @go-go-golems/os-core --filter @go-go-golems/os-launcher` shows os-core `0.1.4` everywhere with no `link:`/`0.1.0`; real-profile Assistant round-trip verified (`phase2-npm-ok`); window-manager smoke verified (Assistant + Inventory + context menu + Apps Browser); generated Sprint Board HyperCard smoke verified; frozen-lockfile + **`docker build`** green. Todo has a separate runtime `packId` metadata issue to triage later.

## Phase 3 — Ship (D5)

- [ ] Confirm `GITOPS_PR_TOKEN` still valid (3 months old)
- [ ] Local `docker build`; extend + run `scripts/smoke-wesen-os-launcher.sh` (/, /api/os/apps, /api/os/federation-registry, assistant round-trip with NoopEngine profile, one sqlite query)
- [ ] Update k3s repo `gitops/kustomize/wesen-os/config/profiles.runtime.yaml`: migrate `runtime.step_settings_patch` to `inference_settings.chat` (config-hash rollout)
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
