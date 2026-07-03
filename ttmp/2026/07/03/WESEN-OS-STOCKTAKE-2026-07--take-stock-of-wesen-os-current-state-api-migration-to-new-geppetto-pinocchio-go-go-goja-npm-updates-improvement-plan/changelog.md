# Changelog

## 2026-07-03

- Initial workspace created


## 2026-07-03

Stocktake analysis complete: measured bidirectional drift (workspace wesen-os task branch 2026-04-09 ahead of canonical main; dependency mains through 2026-06-17 ahead of workspace pins), mapped architecture + k3s deployment, wrote intern-level design doc with old→new API tables (geppetto events rewrite, pinocchio webchat/sem → chatapp/sessionstream, go-go-goja engine rename), decision records D1–D5, and 5-phase migration plan. Raw agent evidence preserved in various/01–04.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/07/03/WESEN-OS-STOCKTAKE-2026-07--take-stock-of-wesen-os-current-state-api-migration-to-new-geppetto-pinocchio-go-go-goja-npm-updates-improvement-plan/design-doc/01-wesen-os-stocktake-system-analysis-api-migration-guide-and-improvement-plan.md — Primary deliverable


## 2026-07-03

react-chat assessment: @go-go-golems/chat-provider + chat-overlay 0.2.1 are the chatapp/sessionstream-native chat frontend with browser-side tool registration (useFrontendTool) and streaming widgets; go-go-os-chat main found to still ship old webchat/sem architecture. Design doc revised: new §5.6, D3 superseded (assistant backend ports to pinocchio chatapp directly, react-chat internal/webchat as reference), new D6 (frontend adopts chat-provider), plan phases 1-2-4 updated. Raw evidence in various/05.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/07/03/WESEN-OS-STOCKTAKE-2026-07--take-stock-of-wesen-os-current-state-api-migration-to-new-geppetto-pinocchio-go-go-goja-npm-updates-improvement-plan/various/05-raw-findings-react-chat.md — react-chat raw findings


## 2026-07-03

os-chat keep-vs-replace analysis: LOC inventory shows ~1/3 of os-chat (7,640 LOC) duplicates chat-provider transport (incl. 1,245 LOC generated SEM protos), presentational components duplicate chat-overlay, unique value is 4 components + debug windows + 3 leaf utilities. Decision D7 added: staged full replacement of os-chat by chat-provider/chat-overlay (retrofit rejected — would preserve the deleted SEM wire model behind a permanent adapter); os-scripting/hypercard re-targeting is the long pole.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/07/03/WESEN-OS-STOCKTAKE-2026-07--take-stock-of-wesen-os-current-state-api-migration-to-new-geppetto-pinocchio-go-go-goja-npm-updates-improvement-plan/various/06-raw-findings-os-chat-inventory.md — os-chat inventory raw findings


## 2026-07-03

Theming assessment: chat-overlay's default theme is already Retro Mac OS 1 monochrome; alignment with wesen-os macos1 = small token bridge (--color-mac-* to --hc-*) or replacement stylesheet on stable chat-overlay-* classes. Hazard: ChatMessages internals use Tailwind utilities (unstyled in the non-Tailwind launcher) — plain-CSS fallbacks or upstream PR. Desktop conversation window (D7) styles in the existing data-part/--hc-* idiom regardless. Recorded as Theming note in design doc §5.6, diary Step 6.


## 2026-07-03

Font decision: Chicago dropped per user direction; replacement stack Geneva/Helvetica Neue/Helvetica/Arial. Four cleanup sites recorded (os-core classic.css, desktop macos1.css, desktop tokens.css; chat-overlay retro-mac.css). Design doc §5.6(4), diary Step 7.


## 2026-07-03

Plan restructured to six phases: new Phase 4 = complete os-chat replacement (D7) gated on Phases 1-3 stabilizing in prod (7 steps, hypercard pre-flight, npm retirement exit gate); improvements renumbered Phase 5; stale cross-references fixed. tasks.md rewritten as per-phase execution tracker. v2 bundle uploaded to reMarkable as a new document (v1 + annotations preserved).

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/07/03/WESEN-OS-STOCKTAKE-2026-07--take-stock-of-wesen-os-current-state-api-migration-to-new-geppetto-pinocchio-go-go-goja-npm-updates-improvement-plan/tasks.md — Per-phase execution tracker


## 2026-07-03

Phase 0 executed: submodule WIP preserved (go-go-os-frontend 9a1e267 on task/2026-04-widget-showcase-wip), dirty state committed (08bb6a8, 114f688, a93ac8e), stray DEPLOY-001 branches merged (74403a9, 11171f4), PR #12 merged to main (52a26d0), lockfile regression fixed via PR #13 (41ac183). Found origin/main was already at deployed 13ce252 — only the ~/code clone was stale. task/2026-07-upgrade-stack cut for Phase 1.


## 2026-07-03

Phase 1 landed: pkg/chathost (chatapp/sessionstream host per app) + assistant/inventory rewrite; geppetto v0.13.3 / pinocchio v0.11.5 / sessionstream v0.1.0; library submodules dropped (D2); pinoweb quarantined to _pinoweb_legacy; launcher smoke verified end-to-end. Commits: wesen-os ca9098e+232a960, inventory 4397deb, gepa c01a8e1. Drift-report corrections recorded in diary Step 10 (profilebootstrap API, glazed help/model, profile-first config hard break).


## 2026-07-03

Obsidian vault report written and pushed: go-go-parc Projects/2026/07/03/PROJ - wesen-os - 2026-07 Stocktake, Consolidation, and Chatapp Migration.md (commit bf9cfa4). Diary Step 11.


## 2026-07-03

Session 2 execution: chathost contract tests (2873def); profile-stack resolution + credential-inheritance fix so app surfaces inherit the launcher-selected engine/key, plus --print-inference-settings diagnostic (9ad8ff4); assistant UI ported to @go-go-golems/chat-provider + chat-overlay with macos1 theme bridge (302054e). Real gpt-5-nano inference verified end-to-end in browser. Diary Step 12.


## 2026-07-03

Added design-doc/02: npm package publishing + consumer switchover implementation guide (for colleague hand-off). Key finding: all 9 os-* packages now published; only os-core is behind (npm 0.1.2 vs repo 0.1.3) and needs the Chicago font edit. Documents the go-go-os-frontend trusted-publishing workflow, the os-core release steps, the launcher workspace:* → published-range switch, and the submodule-removal scoping boundary (app packages out of scope).


## 2026-07-03

Phase 2 npm half executed: os-core font fix published as 0.1.4 (upstream commit ec19a1c7, npm latest); wesen-os launcher switched to published @go-go-golems/os-* npm ranges (7 of 8) on branch task/2026-07-os-launcher-published-npm-deps (commit 7caa3c9). os-shell held on workspace:* because the launcher+inventory app reference the unreleased FederatedAppHostContract type. Launcher default build set to published resolution mode so Docker/CI ships the Chicago-free os-core 0.1.4; temporary Chicago override removed. Verified: published build, frozen-lockfile, go build, docker build all green; runtime desktop renders with Chicago-free font. Boss-facing handoff report written as design-doc/03. Findings: design-doc/02 §2.2/§5 glob-narrowing recommendation is incorrect (8 workspace apps consume os-* via workspace:*; narrowing strands them; also unnecessary since submodule os-* are all 0.1.0); tsc typecheck is pre-existing-broken on FederatedAppHostContract (fails at clean HEAD, not caused by this work).

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/package.json — os-* deps switched to npm ranges; build -> published mode

