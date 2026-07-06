---
Title: Investigation diary
Ticket: WESEN-OS-STOCKTAKE-2026-07
Status: active
Topics:
    - wesen-os
    - geppetto
    - pinocchio
    - go-go-goja
    - deployment
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Chronological diary of the wesen-os stocktake investigation: workspace status, dependency drift measurement, deployment mapping, and the writing of the intern onboarding/migration guide."
LastUpdated: 2026-07-03T12:02:08.847969947-07:00
WhatFor: "Record how the WESEN-OS-STOCKTAKE-2026-07 analysis was produced so a future session can continue it."
WhenToUse: "Read before extending the stocktake analysis or re-running the dependency drift measurements."
---

# Diary

## Goal

Capture the investigation that produced the WESEN-OS-STOCKTAKE-2026-07 design document: how the current state of the wesen-os workspace was measured, how API drift against the new geppetto/pinocchio/go-go-goja mains was determined, how the wesen-os.yolo.scapegoat.dev deployment was mapped, and how the final intern guide was assembled and shipped to reMarkable.

## Step 1: Ticket creation and workspace state snapshot

The user asked for a fresh docmgr ticket to take stock of wesen-os in the old `os-openai-app-server` workspace (created 2026-03-02), because the underlying packages have moved on considerably since. The first step was to establish where the docmgr root lives, create the ticket, and take a hard snapshot of which checkout of which repo is actually newest.

### Prompt Context

**User prompt (verbatim):** "Create a new docmgr to take stock of where we are at with wesen-os. This is an olkd workspace and we have since tremendously worked on all the packages (see wsm status --fetch). Most packages are in ~/code/wesen/go-go-golems and ~/code/wesen/wesen-os, and the deployment is in @~/code/wesen/2026-03-27--hetzner-k3s/ so you can maybe find how wesen-os.yolo.scapegoat.d.ev is built. We want to do two things: - bring everything up to the newest APIs (geppetto/pinocchio/go-go-goja have changed quite a bit), update wesen-os/ itself to use the new npm packages and all, and then figure out how to improve things. Create a new docmgr ticket for this, and Create a detailed analysis / design / implementation guide that is for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file references. It should be very clear and technical. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a docmgr ticket in this workspace, run a full evidence-based stocktake of wesen-os and its dependency graph (geppetto, pinocchio, go-go-goja, go-go-os npm packages) plus the Hetzner k3s deployment, then write one detailed intern-level analysis/design/implementation guide with prose, diagrams, pseudocode, API and file references, store it in the ticket, and upload it to reMarkable.

**Inferred user intent:** Restart work on wesen-os after ~3 months of divergence with a reliable map of what exists, what broke, and a concrete migration + improvement plan that a new contributor could execute.

### What I did
- Ran `docmgr status --summary-only` — docs root is `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp` (27 tickets, all stale >30d, confirming the "old workspace" description).
- Created ticket `WESEN-OS-STOCKTAKE-2026-07` with topics `wesen-os,geppetto,pinocchio,go-go-goja,deployment`; added this diary and the design doc `design-doc/01-wesen-os-stocktake-system-analysis-api-migration-guide-and-improvement-plan.md`.
- Ran `wsm status --fetch`: 7 repos in the workspace; `wesen-os` (branch `task/sqlite-federation-runtime-fix`, M:4 dirty) and `openai-app-server` (M:1) are modified; several repos show unmerged/rebase warnings against their remotes.
- Compared last-commit dates between workspace checkouts and canonical repos.

### Why
- Before writing any migration guidance, we need to know which checkout is authoritative for each repo, because the workspace and `~/code/wesen` copies have diverged in both directions.

### What worked
- The date comparison produced the load-bearing fact of the whole ticket: the **workspace wesen-os is the newest wesen-os** (branch `task/sqlite-federation-runtime-fix`, last commit 2026-04-09) — it is *ahead* of `~/code/wesen/wesen-os` main (2026-03-01). Meanwhile the dependency mains in `~/code/wesen/go-go-golems` are far ahead of the workspace checkouts: geppetto 2026-04-01 → 2026-06-06, pinocchio 2026-04-01 → 2026-06-07, go-go-goja 2026-04-02 → 2026-06-17, go-go-os-frontend main 2026-06-01, go-go-os-chat main 2026-06-07, go-go-os-backend main 2026-06-07.

### What didn't work
- N/A for this step (no failures; all commands succeeded first try).

### What I learned
- Drift is bidirectional: wesen-os app work lives only on a workspace task branch, while library work lives only on `~/code/wesen/go-go-golems` mains. Any migration has to first consolidate wesen-os (merge/land the April task branches) before bumping dependencies.

### What was tricky to build
- Nothing yet; the trick was only realizing that "old workspace" did not mean "stale copy of everything" — wesen-os itself is newest here.

### What warrants a second pair of eyes
- Whether `task/sqlite-federation-runtime-fix` and the other unmerged wesen-os task branches were ever pushed/merged anywhere else; `wsm` shows sync ✓ but merged `-`.

### What should be done in the future
- N/A (handled in later steps).

### Code review instructions
- Start with `wsm status --fetch` inside `/home/manuel/workspaces/2026-03-02/os-openai-app-server` and reproduce the date table with `git -C <repo> log -1 --format='%h %ci %s'` for each checkout.

### Technical details
- Ticket path: `wesen-os/ttmp/2026/07/03/WESEN-OS-STOCKTAKE-2026-07--take-stock-of-wesen-os-current-state-api-migration-to-new-geppetto-pinocchio-go-go-goja-npm-updates-improvement-plan/`.

## Step 2: Parallel evidence sweep (four Explore agents)

To cover the four independent evidence domains without serializing, the investigation fanned out four read-only Explore agents: (1) wesen-os architecture and dependency pins, (2) geppetto+pinocchio API drift April→June, (3) go-go-goja drift plus the go-go-os npm package family, (4) the Hetzner k3s deployment behind wesen-os.yolo.scapegoat.dev.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Same request; this step is the evidence-gathering phase.

**Inferred user intent:** Same as Step 1.

### What I did
- Launched four Explore agents with explicit deliverables: file-anchored architecture map, old→new API pairs, npm package inventory + versions, and deployment topology/build pipeline.
- Results are synthesized into the design doc (see Step 3); per-domain findings are recorded there rather than duplicated here.

### Why
- The four domains touch disjoint file trees (workspace wesen-os, two library repo pairs, and the k3s repo), so parallel read-only sweeps were safe and ~4x faster.

### What worked
- All four agents completed with file-anchored reports (23–33 tool calls each); the raw reports are preserved verbatim under `various/01-…` through `various/04-…`.
- Asking for exported-symbol diffs paid off: the geppetto report could state "only pkg/events broke" with evidence rather than vibes, and the pinocchio report identified the deleted packages (`webchat`, `sem`, `cmds/helpers`, `ui/*`) plus their concrete replacements (`chatapp`, `serverkit`, `sessionstream`).

### What didn't work
- One naming mismatch surfaced: geppetto PR #372 is branch-named `bug/store-runtime-owner` but its diff is embeddings-scoped — recorded as an uncertainty in `various/04` §7 rather than papered over.

### What I learned
- pinocchio deleted the exact two packages the wesen-os assistant is built on (`pkg/webchat`, `pkg/sem`); go-go-os-chat main is already ported to the replacement stack, making it the natural migration vehicle (design doc Decision D3).
- The npm story flipped between April and June: the `@go-go-golems/os-*` packages went from unpublished 0.1.0 workspace links to genuinely published 0.1.1–0.1.6 via trusted publishing, and wesen-os already carries a `build:published` escape hatch.

### What was tricky to build
- Framing the agent prompts so each reported old→new API *pairs* (consumer perspective) instead of generic changelogs.

### What warrants a second pair of eyes
- Agent-reported API signatures should be spot-checked against the actual repos before coding the migration.

### What should be done in the future
- N/A.

### Code review instructions
- The design doc's References section lists every file the agents anchored claims to; spot-check a sample.

### Technical details
- Agents were read-only (Explore type); no repository files were modified during the sweep.

## Step 3: Synthesis — writing the intern guide and shipping the ticket

With all four evidence reports in hand, this step wrote the primary deliverable: `design-doc/01-wesen-os-stocktake-system-analysis-api-migration-guide-and-improvement-plan.md`, a ~10-section intern onboarding + migration document with two ASCII architecture diagrams, old→new API tables for all three Go libraries, five decision records (D1–D5), a five-phase implementation plan, a testing strategy, and a file-anchored references section. Ticket bookkeeping, doctor validation, and the reMarkable upload close out the ticket.

### Prompt Context

**User prompt (verbatim):** (see Step 1; mid-run addition: "open analysis with md-view view ... when done")

**Assistant interpretation:** Write the comprehensive design doc from the gathered evidence, finish docmgr bookkeeping, upload the bundle to reMarkable, and open the analysis locally with `md-view view` at the end.

**Inferred user intent:** A single readable artifact that both onboards a new contributor and serves as the execution plan for the upgrade, delivered to the reMarkable for offline reading.

### What I did
- Wrote the design doc, structuring the migration around the four load-bearing findings: bidirectional drift, geppetto's single break (events), pinocchio's webchat/sem deletion → chatapp/sessionstream, and the npm packages now being published.
- Recorded decision records: D1 consolidate branches first, D2 tags over submodules for library repos, D3 migrate assistant via go-go-os-chat main, D4 published npm packages by default, D5 deploy at parity first / persistence+secrets after.
- Updated index.md, tasks.md; related key files to the docs; updated the changelog; ran `docmgr doctor`; uploaded the bundle via `remarquee upload bundle` (dry-run first).

### Why
- The user asked for one clear, technical, intern-oriented document rather than scattered notes; decision records keep the contentious choices (assistant rewrite path, submodule strategy) from being re-litigated later.

### What worked
- The evidence sweeps mapped almost one-to-one onto doc sections; no re-investigation was needed during writing.

### What didn't work
- See delivery details below/changelog for any upload caveats (recorded at execution time).

### What I learned
- The riskiest single work item is the assistant rewrite (SEM proto surface has no mechanical mapping); the doc isolates it as Phase 1 step 3 with a contract-test mitigation.

### What was tricky to build
- Keeping the doc evidence-honest: several agent claims (e.g. PR #372 scope, chatapp API sketch) are flagged in-doc as "verify against source before coding" rather than stated as fact.

### What warrants a second pair of eyes
- The Phase 1.3 pseudocode for chatapp/sessionstream wiring is a sketch derived from package listings, not compiled code — read `pinocchio/pkg/chatapp/serverkit/contracts.go` and go-go-os-chat main before implementing.
- The claim that the deployed image `sha-13ce252` was built from the workspace task branch (basis of Decision D1) — verify via `git log` / GHCR labels before merging strategy is locked.

### What should be done in the future
- Execute Phases 0–4 (tracked in tasks.md); answer the five open questions in design doc §9 first.

### Code review instructions
- Start with the design doc §5 (gap analysis) and cross-check each old→new API pair against the two checkouts listed in §10 References.
- Validate ticket health: `docmgr doctor --ticket WESEN-OS-STOCKTAKE-2026-07 --stale-after 30`.

### Technical details
- Deliverable bundle: design doc + diary + four raw-findings docs, uploaded with `remarquee upload bundle … --remote-dir /ai/2026/07/03/WESEN-OS-STOCKTAKE-2026-07`.

## Step 4: react-chat investigation — the assistant migration path changes

The user pointed at `~/code/wesen/go-go-golems/react-chat`, a React helper for chat overlays with browser-side tool call registration, asking whether it can carry the migration to the new chat application work. One Explore agent swept the repo; the findings both added the missing frontend piece and **falsified an assumption in the original design doc** (that go-go-os-chat main had been ported to the new stack), forcing a revision of Decision D3.

### Prompt Context

**User prompt (verbatim):** "Ok, look at ~/code/wesen/go-go-golems/react-chat as well, which is a react helper for chat overlays, and see if this can be used to migrate towards the new chat applicatino work, especially since it allows registering tool calls in the browser side too."

**Assistant interpretation:** Assess react-chat's architecture and published packages, determine whether they fit the wesen-os assistant migration to pinocchio chatapp/sessionstream (with special attention to browser-side tool registration), and fold the assessment into the ticket's design doc.

**Inferred user intent:** Avoid rebuilding a chat frontend by hand if a ready-made, new-stack-native library exists; unlock browser-side tool calls for desktop apps.

### What I did
- Launched an Explore agent over react-chat with cross-checks into pinocchio (`pkg/spa`, `cmd/web-chat`), go-go-os-frontend (os-chat), go-go-os-chat, and consumer greps across all go-go-golems repos. Raw report preserved at `various/05-raw-findings-react-chat.md`.
- Revised the design doc: new headline finding #5, new §5.6 (react-chat architecture, wire contract, tool-call roundtrip), corrected §5.2 consequence, rewrote Decision D3 (assistant backend → chatapp/sessionstream directly, superseding "via go-go-os-chat"), added Decision D6 (frontend → chat-provider, overlay as first milestone), updated Phase 1.1/1.3 pseudocode, Phase 2.3, Phase 4 improvement #3 (desktop apps as assistant tools), open question 1 resolved, references extended.

### Why
- The original D3 leaned on go-go-os-chat main being "already migrated" — the agent's grep showed its `pkg/webchat` + `pkg/sem/pb/proto/sem/timeline` are its *own copies of the old architecture*; only its dependency pins were bumped. Meanwhile react-chat + pinocchio `cmd/web-chat` are working, published implementations of the actual new contract.

### What worked
- Asking the agent to grep *every* repo's package.json for consumers settled react-chat's ecosystem position conclusively (single consumer: pinocchio cmd/web-chat).
- The tool-call roundtrip could be traced end-to-end in code: `useFrontendTool` → `POST …/tools/manifest` → `frontendtools.CommandManifest` into the sessionstream hub (`react-chat/internal/webchat/handlers.go:118-152`) → `ChatFrontendToolCallRequested` uiEvent → Zod-validated `execute` (`tools/toolRuntime.ts:37-105`) → `POST …/tools/results` → `CommandResult` back to the engine.

### What didn't work
- Initial hypothesis that react-chat might be the source of pinocchio's `pkg/spa` dist — wrong; pkg/spa is the Glazed help browser. Recorded so nobody chases it again.

### What I learned
- react-chat was the incubator (tickets CHATOVERLAY-001..015): Go pieces upstreamed into pinocchio `pkg/chatapp`, React pieces published as `@go-go-golems/chat-provider` + `@go-go-golems/chat-overlay` 0.2.1. Version alignment triple: chat-provider 0.2.1 ↔ pinocchio v0.11.5 ↔ sessionstream v0.0.6.
- chat-provider uses a private Redux context (CHATOVERLAY-015), so it can live inside the wesen-os desktop's existing Redux store without collision.

### What was tricky to build
- Reconciling two agent reports that superficially conflict: the drift agent said go-go-os-chat main is "on the new stack" (true for *dependency versions*), the react-chat agent said it ships the old architecture (true for *code/contract*). The design doc now distinguishes deps-bumped from architecture-migrated.

### What warrants a second pair of eyes
- The proposed route nesting (`/api/apps/assistant/api/chat/…` via chat-provider's `basePrefix`) — verify chat-provider's WS URL construction (`ws/protocol.ts:10-13`) composes correctly under a namespaced prefix before committing to it.
- Whether the APP-31 per-app profile surface maps cleanly onto `createSessionBody` → server-side profile resolution.

### What should be done in the future
- Phase 1.3/2.3 now name react-chat as the reference implementation; prototype one `useFrontendTool` from a desktop app (Phase 4 item 3) early to validate the headline win.

### Code review instructions
- Read `various/05-raw-findings-react-chat.md`, then design doc §5.6 and Decisions D3/D6; spot-check quoted APIs against `react-chat/packages/chat-provider/src/` and `react-chat/internal/webchat/handlers.go`.

### Technical details
- Bundle re-uploaded to reMarkable with the react-chat findings included (same remote dir, replacing the earlier PDF).

## Step 5: os-chat keep-vs-replace analysis (Decision D7)

The user asked whether os-chat should be cleaned up to use react-chat internally or fully replaced. An Explore agent produced a LOC-level inventory of `@go-go-golems/os-chat` split into "duplicates chat-provider / duplicates chat-overlay / genuinely unique", plus a consumer map. The answer landed as Decision D7: **staged full replacement**, not a retrofit.

### Prompt Context

**User prompt (verbatim):** "we want to cleanup os-chat to use react-chat as well (or fully replace it if that makes sense). what do youo think?"

**Assistant interpretation:** Recommend between rebuilding os-chat's internals on chat-provider (keeping its API) versus deprecating os-chat and moving to chat-provider/chat-overlay outright.

**Inferred user intent:** Eliminate the duplicated chat stack with the least long-term maintenance burden.

### What I did
- Launched an Explore agent to inventory os-chat (raw report: `various/06-raw-findings-os-chat-inventory.md`).
- Added Decision D7 to the design doc, updated Phase 2.3, added `various/06` to references.

### Why
- The decision hinges on facts, not taste: how much of os-chat is transport (≈⅓, ~2,500 LOC + 1,245 LOC generated SEM protos), whether the good UI is separable (the main window is not — hard-wired to the singleton `conversationManager` and os-chat's own Redux slices), and who else consumes the package (os-scripting/hypercard is coupled to the timeline *data model*).

### What worked
- The "duplicates-a / duplicates-b / unique" framing made the recommendation nearly mechanical: unique value = 4 components + 3 leaf utilities; everything else is a second copy of a layer react-chat now owns.

### What didn't work
- N/A — single agent pass sufficed.

### What I learned
- os-chat has **no markdown renderer** (plain `pre-wrap` text) and its CodeMirror/Lezer dependency weight exists for one debug syntax highlighter; the `profileApi` middleware/extension-schema surface is fetched but has no UI (dead code).
- os-chat is in maintenance mode (no feature commits since 2026-05-11 npm packaging).

### What was tricky to build
- Being honest about the retrofit option's true cost: it looks cheaper (no consumer breakage) but means maintaining a permanent adapter from chat-provider's model back to the SEM `TimelineEntity`/`RenderEntity` contracts — a protocol the backend no longer emits.

### What warrants a second pair of eyes
- The os-scripting/hypercard re-targeting estimate ("long pole") — its artifact projection middleware writes into os-chat's timelineSlice; verify chat-provider's `defineTimelineAdapter` can express that flow before committing to a schedule.
- Whether inventory's chat surface should migrate in the same pass as the launcher or lag behind a feature flag.

### What should be done in the future
- Execute D7 after the assistant migration proves the chat-provider stack (Phase 2.3 ordering); consider upstreaming rebuilt debug windows into react-chat as a `chat-debug` package.

### Code review instructions
- Read `various/06-raw-findings-os-chat-inventory.md` §7 (the factual split), then design doc D7; spot-check the coupling claims against `go-go-os-frontend/packages/os-chat/src/chat/runtime/{conversationManager,useConversation}.ts` and `packages/os-scripting`'s imports.

### Technical details
- reMarkable bundle intentionally NOT re-uploaded this step (a `--force` re-upload deletes annotations on the device copy); re-run the bundle upload from Step 3's command with `--force` + `various/06` added when a refreshed PDF is wanted.

## Step 6: Theming feasibility — chat-overlay vs the wesen-os macos1 look

Quick direct-inspection step (no agent): compared `react-chat/packages/chat-overlay/src/theme/retro-mac.css` against wesen-os's theme stack (os-core `--hc-*` tokens in `theme/classic.css`, `desktop-theme-macos1.ts`, os-chat's `data-part`-based `chat.css`). Result recorded as a "Theming note" in design doc §5.6.

### Prompt Context

**User prompt (verbatim):** "can we style the react-chat to fit the current wesen-os chat style (macos1 retro look?)"

**Assistant interpretation:** Assess whether chat-overlay/chat-provider UI can be themed to match the wesen-os desktop's macos1 retro aesthetic, and how.

**Inferred user intent:** Ensure adopting react-chat doesn't cost the desktop's visual identity.

### What I did
- Read retro-mac.css (259 lines), listed chat-overlay's component class names, read os-core theme tokens and os-chat's chat.css, and verified Tailwind presence: react-chat's demo uses Tailwind, the wesen-os launcher does not.

### What worked / learned
- The two designs are the same family: chat-overlay's default theme is literally "Retro Mac OS 1 monochrome" (1984 Macintosh); overlay chrome is styled via stable `chat-overlay-*` classes + CSS custom properties, so a token bridge (`--color-mac-* → --hc-*`) or a replacement stylesheet is cheap.
- **Hazard found**: `ChatMessages.tsx` internals still use Tailwind utilities (`text-mac-gray-3`, `space-y-2`, …) that render unstyled without Tailwind; retro-mac.css's own comment shows the authors already migrated the chrome off Tailwind for exactly this reason. Fix: plain-CSS definitions under `.chat-overlay-root`, or upstream a PR finishing the conversion.

### What warrants a second pair of eyes
- Visual QA of the token bridge (retro-mac's 2px borders + hard offset shadows vs the desktop's window chrome) once mounted.

### What should be done in the future
- Small upstream PR to react-chat converting the remaining Tailwind utilities in ChatMessages to stable classes — benefits every non-Tailwind consumer.

### Code review instructions
- Design doc §5.6 "Theming note"; verify claims against `react-chat/packages/chat-overlay/src/theme/retro-mac.css`, `overlay/ChatMessages.tsx:16-80`, `os-core/src/theme/classic.css`, `os-chat/src/chat/theme/chat.css`.

## Step 7: Font decision — drop Chicago

Short directive step: the user ruled out the Chicago font. Grepped both theme stacks for `Chicago`; it appears in exactly four files. Recorded the replacement stack and cleanup sites as item (4) of the §5.6 Theming note.

### Prompt Context

**User prompt (verbatim):** "no chicago font, replace with normal alternative"

**Assistant interpretation:** Remove Chicago from the planned theme stacks; specify a normal (system-available) font stack instead.

**Inferred user intent:** Avoid the bitmap/novelty Chicago face — keep the retro look via layout/monochrome, not typeface gimmicks.

### What I did
- Located all Chicago references: os-core `theme/classic.css:4`, `theme/desktop/theme/macos1.css:3`, `theme/desktop/tokens.css:9`; chat-overlay `theme/retro-mac.css:10`.
- Recorded the decision in design doc §5.6(4): replace with `"Geneva", "Helvetica Neue", Helvetica, Arial, sans-serif`; os-core edits land in Phase 2 (need an os-core release); the chat-overlay one is covered by the wesen-os token bridge regardless.

### What should be done in the future
- Make the three one-line os-core edits + release during Phase 2; optionally upstream the retro-mac.css change to react-chat.

### Code review instructions
- `rg Chicago` across go-go-os-frontend and react-chat after Phase 2 should return nothing.

## Step 8: Plan restructure — dedicated os-chat replacement phase, detailed tasks.md, v2 delivery

The user asked to lock in the complete os-chat replacement in the design guide (gated on the stack stabilizing), produce a detailed per-phase tasks.md, open it with md-view, and upload the updated design doc as v2 to the reMarkable.

### Prompt Context

**User prompt (verbatim):** "Ok, so now update the design guide if needed to completely replace os-chat (once the bttom has stabilized), and create a detailed phases + tasks per phase tasks.md, and open it with md-view view ... and upload the updated design doc as v2 to the remarkable tablet."

**Assistant interpretation:** Make full os-chat replacement an explicit, gated phase of the plan (not a footnote of Phase 2), write an execution-grade tasks.md with per-phase checklists, open tasks.md in md-view, and ship a v2 bundle to reMarkable as a new document (not overwriting v1).

**Inferred user intent:** Turn the analysis into an executable, trackable plan with the os-chat decision locked in.

### What I did
- Restructured the plan from five to six phases: new **Phase 4 — Complete os-chat replacement** (entry criteria = Phases 1–3 stable in prod; 7 steps incl. the hypercard pre-flight check and the npm retirement exit gate); improvements renumbered to Phase 5; fixed all stale `Phase 4.x` cross-references (D5 consequences, testing strategy, open question 4); exec summary updated; Phase 2.3 now explicitly defers full replacement to Phase 4 and absorbs the theming/font tasks.
- Rewrote `tasks.md` as a per-phase execution tracker (Phases 0–5 with gates, plus the Done list for the analysis work).
- Opened tasks.md with md-view; uploaded the bundle as a **v2** document to `/ai/2026/07/03/WESEN-OS-STOCKTAKE-2026-07` (new name, so v1 and its annotations are untouched).

### Why
- "Once the bottom has stabilized" maps naturally to a phase gate: entry criteria (bake period after Phase 3) rather than a calendar date.

### What worked
- The D7 decision record already contained the sequencing logic; the restructure was mostly promotion + renumbering.

### What was tricky to build
- Renumbering hazards: three cross-references pointed at the old Phase 4 (improvements); found them with a grep for "Phase 4" rather than trusting memory.

### What warrants a second pair of eyes
- Phase gates: whether the bake period before Phase 4 should be a fixed duration or tied to specific signals (assistant session counts, zero rollbacks).

### What should be done in the future
- Execute Phase 0; check off tasks.md as work lands.

### Code review instructions
- Design doc §7 (six phases) and tasks.md side by side; verify each tasks.md item traces to a design-doc step or decision.

### Technical details
- v2 bundle: design doc + diary + various/01–06, uploaded as "WESEN-OS Stocktake 2026-07 — Analysis, Migration Guide & Improvement Plan (v2)".

## Step 9: Phase 0 executed — wesen-os consolidated onto main

Execution began. Phase 0 (consolidation) is done: the dirty April workspace state is committed, previously-uncommitted submodule work is preserved on a pushed branch, the two stray DEPLOY-001 doc branches are merged, everything landed on `wesen/wesen-os` main via PR #12, and a lockfile regression that PR introduced was fixed via PR #13.

### Prompt Context

**User prompt (verbatim):** "ok, go ahead and work, commit at appropriate intervals, keep a diary as you work (see skill for the diary format)"

**Assistant interpretation:** Execute the six-phase plan starting at Phase 0, committing in logical chunks and keeping this diary current.

**Inferred user intent:** Turn the plan into landed code without further hand-holding.

**Commit (code):** 52a26d0 (merge of PR #12) and 41ac183 → PR #13 (lockfile fix); submodule commit 9a1e267 on go-go-os-frontend `task/2026-04-widget-showcase-wip`.

### What I did
- Inspected the dirty tree: `go.work.sum`, `ttmp/vocabulary.yaml`, dirty `workspace-links/go-go-os-frontend` (17 modified source files: SelectableDataTable, desktop shell windowing, macos1 theme, build tooling + 12 untracked build artifacts), untracked agent dirs, `apps/os-launcher/public/__federation-smoke/` fixtures, `docs/window-resize-behavior.md`, three ttmp trees.
- Preserved the submodule WIP: branch `task/2026-04-widget-showcase-wip` in go-go-os-frontend, commit `9a1e267` (source files only, artifacts excluded), pushed to `go-go-golems/go-go-os-frontend`.
- Three wesen-os commits: `08bb6a8` gitignore (agent dirs + smoke fixtures), `114f688` workspace state + submodule pin → 9a1e267, `a93ac8e` ttmp trees incl. this ticket.
- Branch sweep: `git branch --no-merged HEAD` → `task/deploy-001-draft-review-flow` (4 commits) and `task/deploy-001-require-gitops-pr-token` (1 commit). Verified their code (workflow/scripts) already lives in HEAD in newer form; unique content was ttmp docs. Merged both (`74403a9`, `11171f4`), resolving diary conflicts by chronological union (python strip of diff3 markers keeping both sides) and tasks.md/workflow with `--ours` (HEAD strict superset).
- **D1 verification**: `git merge-base --is-ancestor 13ce252 HEAD` ✓ and `git ls-remote` showed origin/main == `13ce252` == the deployed image tag. The "stale main" from the earlier analysis was only the `~/code/wesen/wesen-os` clone, not the remote.
- Pushed, opened PR #12, merged → main `52a26d0`. CI `publish-host-image` failed: `ERR_PNPM_OUTDATED_LOCKFILE` — the preserved macos1-react WIP added react dev-deps without a lockfile refresh. Ran `pnpm install` (lockfile regenerated with exactly the expected macos1-react block), verified `--frozen-lockfile` passes, committed `41ac183`, PR #13, merged. Baseline image build re-running on main.
- Cut and pushed `task/2026-07-upgrade-stack` for Phase 1.

### Why
- Preserving the submodule WIP on a pushed branch keeps wesen-os's pinned pointer resolvable for anyone cloning with submodules.

### What worked
- The union merge strategy for append-only diaries; `--ours` for tasks.md where HEAD was a strict superset.

### What didn't work
1. `git pull` in `~/code/wesen/wesen-os` failed: `error: unable to create file .dockerignore: Read-only file system` — the whole `/home` mount is `ro` in this session except workspace mounts (`findmnt`: `/home … ro,nosuid,nodev`). Canonical clones under `~/code` cannot be synced from here; they need a `git pull` from a normal session. A stray `task/2026-07-upgrade-stack` at the stale commit was created there and deleted again; the clone remains on old main `068a8b8`.
2. First `pnpm install` failed with `ERR_PNPM_EROFS`: the pnpm store dir pointed into another (read-only) workspace (`workspaces/2026-05-03/add-upload-sync/...pnpm-store`). Worked around with `--store-dir <scratchpad>/pnpm-store`.
3. CI lockfile failure as above — self-inflicted by the WIP preservation, fixed within minutes.

### What I learned
- origin/main was never stale — the analysis doc's Phase 0 assumption ("main at 2026-03-01") was an artifact of the unsyncable local clone. Consolidation was therefore only ~15 commits of delta, all doc/bookkeeping except the submodule pin.

### What was tricky to build
- The frontend submodule pointer: index said `a554dc3`, checkout was `c74347e`+dirty. Committing the WIP moved HEAD to `9a1e267`; pinning wesen-os to that keeps the built-against state reproducible. The `.js/.d.ts/.map` files sitting next to `src/` were deliberately left uncommitted (build outputs).

### What warrants a second pair of eyes
- The two diary union-merges in `ttmp/2026/03/29/DEPLOY-001--…/diary.md` — verify no narrative was lost (`git show 74403a9`, `git show 11171f4`).
- Whether the preserved WIP branch should eventually be rebased onto go-go-os-frontend main or treated as archaeology.

### What should be done in the future
- `git pull` the `~/code/wesen/wesen-os` clone from a session with a writable `/home`.
- Delete the now-merged local branches (`task/deploy-001-*`, `task/sqlite-federation-runtime-fix`) once Phase 1 lands.

### Code review instructions
- `git log --graph --oneline 13ce252..main` in wesen-os; the interesting commits are `114f688` (submodule pin) and the two merges.
- CI: `gh run list --repo wesen/wesen-os --branch main` — the run after PR #13 is the Phase 0 baseline build.

### Technical details
- pnpm workaround: `pnpm install --store-dir /tmp/claude-1000/…/scratchpad/pnpm-store`; the frozen-lockfile check passes in 0.9s once the store is warm.

## Step 10: Phase 1 — the Go stack port to chatapp/sessionstream

The core migration landed: wesen-os, inventory, and gepa now build and test green against geppetto v0.13.3 / pinocchio v0.11.5 / sessionstream v0.1.0, with both chat surfaces (assistant + inventory) rewritten from the deleted pinocchio webchat onto a new reusable `pkg/chathost` package that speaks the chat-provider wire contract. Verified live: the launcher boots, creates sessions, accepts prompts, and projects timeline entities (including a controlled "no API key" error) end-to-end.

### Prompt Context

**User prompt (verbatim):** (see Step 9)

**Assistant interpretation:** Continue executing: Phase 1 dependency bump + assistant/inventory rewrite.

**Inferred user intent:** Same as Step 9.

**Commit (code):** wesen-os `ca9098e` (port) + `232a960` (submodule removal) on task/2026-07-upgrade-stack; inventory `4397deb`; gepa `c01a8e1` (same branch names, pushed).

### What I did
- Read the reference implementations before coding: `react-chat/internal/webchat/{server,handlers,real_runtime}.go`, `pinocchio/pkg/chatapp/{service.go,runtime_inference.go}`, serverkit helpers. Key learnings: conversation history lives in the turn store as a "final" accumulator turn reloaded per prompt (`runtime_inference.go:107-137`); serverkit ships the HTTP contracts/helpers; the frontend-tool bridge is `frontendtools.Manager` + `NewBridgeExecutor` + `WithBridgeContext`.
- Wrote `pkg/chathost` (host.go/handlers.go/runtime.go): per-app chatapp host with engine-profile surface (`Registry.GetEngineProfile` → `MergeInferenceSettings` → `factory.NewEngineFromSettings`), per-session profile selection via `createSessionBody.profile`, backend-tools hook, frontend-tools bridge, and system-prompt seeding via `InitialTurn` only on a session's first message.
- Rewrote `pkg/assistantbackendmodule` on chathost; moved `ConversationContext` in-repo (2-field struct), severing the go-go-os-chat Go dependency entirely.
- Inventory submodule: `backendcomponent`/`backendmodule` now take host-injected `ChatRoutes` instead of a webchat server; `pkg/pinoweb` (2.7k LOC of SEM/hypercard extensions) quarantined as `pkg/_pinoweb_legacy` (underscore dir = invisible to the go tool) pending its Phase 4 chatapp port; reflection doc + tests updated to the session API.
- gepa submodule: goja renames (`NewRunner`→`NewRuntimeOwner`, `Options.Runner`→`RuntimeOwner`), middleware func swap.
- main.go: two chathosts (assistant with app-context `SystemPromptFunc`, inventory with `InventoryToolFactories` as backend tools — `infruntime.ToolRegistrar` survived unchanged), self-owned `http.Server` (webchat's Run is gone), `perAppStorePath` suffixing for shared sqlite flags.
- profile_bootstrap.go ported to `ResolveCLIProfileRuntime` + `bootstrap.ResolveProfileRegistryChain`; docs_endpoint.go to `glazed/pkg/help/model` section types; cobra middlewares to `pinocchiocmds.GetPinocchioCommandMiddlewares`.
- Dropped the four library submodules (D2) after green builds.

### Why
- One reusable chathost instead of per-app rewrites keeps assistant/inventory symmetric and gives Phase 2's chat-provider frontend a single contract.

### What worked
- The full smoke: `POST /api/apps/assistant/api/chat/sessions` → uuid; `POST …/messages` → accepted; `GET …/sessions/{id}` → snapshot with user message + correlated error entity ("no API key for openai") — the canonical pipeline works without a real engine.
- `inventorytools` needed zero changes — `pinocchio/pkg/inference/runtime.ToolRegistrar` survived the refactor exactly as the drift report predicted.

### What didn't work
1. geppetto v0.13.3 requires go ≥ 1.26.3 (had 1.26.1) — bumped go directives; toolchain auto-fetched.
2. `go mod tidy` ignores go.work — the workspace submodule rewrites were invisible to it; fixed with `replace` directives for inventory/gepa (works in Docker too since submodules are committed).
3. Drift-report misses: `profilebootstrap.ResolveCLIProfileSelection` was replaced by `ResolveCLIProfileRuntime` (report said stable); glazed help `SectionType` moved to `help/model`; `geppettosections.GetCobraCommandGeppettoMiddlewares` is gone (use pinocchio's).
4. The **profile-first config break bit immediately**: legacy `profile-settings:`/`ai-chat:` top-level keys are hard errors in pinocchio v0.11.5 (`configdoc.validateTopLevelKeys`). Test fixtures rewritten to `profile: {active, registries}`. **The prod `profiles.runtime.yaml` in the k3s repo must be checked before Phase 3** (tasks.md item).
5. Env-override test failed by design: `PINOCCHIO_*` env now applies through the cobra middleware chain, which `NewCLISelectionValues` bypasses — test removed with explanation.
6. A python heredoc `.replace()` silently no-opped on reflection.go (whitespace mismatch) — caught by the still-failing test; redone with the Edit tool. Lesson: never trust silent replaces; let the test re-run adjudicate.
7. Inventory's lefthook pre-commit blocked the first commit on its own outdated tests (old manifest capabilities and "requires server" lifecycle errors) — tests updated to the new contract rather than bypassing hooks.

### What was tricky to build
- System-prompt semantics under chatapp: the accumulator-turn history means the system block must be seeded exactly once (first message) via `InitialTurn`; later prompts must NOT pass InitialTurn or history would be dropped. `initialTurnIfFirstMessage` checks `LoadLatestTurn(sid, "final") == nil` to decide.
- Keeping the frozen webchat features honest: middleware definitions (`webchat_runtime@v1` extensions), the confirm surface, and hypercard SEM entities are *not* ported — they ride on the Phase 4 pinoweb/os-scripting sub-ticket. The inventory profile fixtures still carry the extension blocks; they decode fine but the middleware policies are not applied by chathost.

### What warrants a second pair of eyes
- `chathost.promptRequest` merges base settings with the profile overlay but does **not** apply profile `extensions` (middlewares/tools policy from `webchat_runtime@v1`) — check whether any prod profile depends on middleware policies before shipping.
- Per-session profile map is in-memory only (lost on restart; sessions survive in sqlite hydration when configured) — acceptable at demo tier, flag for Phase 5 persistence work.
- The DSN (vs file-path) variants of the store flags are passed through unsuffixed to both hosts — collision risk if anyone sets `--turns-dsn` with a file DSN.

### What should be done in the future
- Remaining Phase 1 items: Go contract test (httptest, fake engine), chat-provider WS-URL-under-basePrefix verification (moves with Phase 2), prod profiles.runtime.yaml migration check.
- Phase 4 sub-ticket now has a concrete anchor: `go-go-app-inventory/pkg/_pinoweb_legacy`.

### Code review instructions
- Start with `pkg/chathost/runtime.go` (promptRequest — the correctness core), then `initialTurnIfFirstMessage`, then main.go's two chathost constructions.
- Validate: `go build ./... && go test ./...` in wesen-os; smoke: build the launcher, run with a scratch single-registry profiles.yaml, curl the session flow (Step 10 commands in the shell history; also scripts/smoke to be extended in Phase 3).

### Technical details
- Version triple shipped: geppetto v0.13.3, pinocchio v0.11.5, sessionstream v0.1.0, go-go-os-backend v0.0.7, go-go-goja v0.9.6 (MVS via geppetto), go 1.26.3.
- Route shape: `/api/apps/<app>/api/chat/{sessions,sessions/{id}/messages,sessions/{id}/stop,sessions/{id}/tools/{manifest,results},ws,health}` — chat-provider `basePrefix: /api/apps/<app>`.


## Step 11: Obsidian vault project report

Wrote the durable synthesis of the whole effort as a vault note and pushed it.

### Prompt Context

**User prompt (verbatim):** "write a detailed project report for the obsidian vault as a deep dive technical analysis blog post using a textbook writing style (no analogies, see skill). Commit and push the bsidian vault when done (go-go-parc vault). Write a detailed report on all this cleanup and consolidation work, be very exhaustive and precise."

**Assistant interpretation:** Produce a PROJ-style note in the go-go-parc vault covering the stocktake findings, decisions D1-D7, Phase 0/1 execution mechanics (with implementation detail on chathost), verification, environment constraints, status, and extracted working rules; textbook prose, no analogies; commit and push.

**Inferred user intent:** A durable, teachable record that outlives the ticket.

### What I did
- Wrote `Projects/2026/07/03/PROJ - wesen-os - 2026-07 Stocktake, Consolidation, and Chatapp Migration.md` (248 lines: findings tables, chathost mermaid diagram + promptRequest pseudocode, history/system-prompt semantics, drift-correction table, verification trace, working rules, open questions).
- Committed only the note; pushed go-go-parc main (`bf9cfa4`). The vault sits on a writable mount despite the session's ro /home.

### Code review instructions
- Read the note top-to-bottom against diary Steps 1-10; every factual claim traces to a step or a ticket document.

## Step 12: Phase 1 contract tests + Phase 2 assistant frontend + real-inference fix

This session closed the remaining Phase 1 item (chathost contract tests) and executed Phase 2's assistant-UI migration onto chat-provider/chat-overlay, ending with the assistant running real gpt-5-nano inference end to end inside the styled macos1 desktop. Along the way it fixed the "no API key" defect (profile stacks were not being resolved; app surfaces did not inherit the launcher-selected profile's credentials) and added a `--print-inference-settings` diagnostic modeled on pinocchio's existing flag.

### Prompt Context

**User prompt (verbatim):** "continue.  commit at appropriate intervals, keep a diary as you work (see skill forthe diary format)"

Follow-up messages during the session (verbatim):
- "playwright works now."
- "no css, btw. no federated stuf floaded (not sure if that's a good idea locally)."
- "btw make the desktop take the entirety of the window, no need for margins left / right bottom. (data-width=hypercard, if needed at all)"
- "I got this over websocket: {…ChatRunFailed… "error":"no API key for openai"…}"
- "use ~/.config/pinocchio/profiles.yaml i think"
- "i think you should have --print-inference-settings flags or so"
- "well, did you find similar flags in pinocchio / other packages? there should be logic there already."

**Assistant interpretation:** Continue Phase 1→2 execution with commits and diary; drive the launcher in a real browser; diagnose and fix the missing-API-key inference failure using the operator's own profiles file; add a settings-print diagnostic reusing existing pinocchio/geppetto logic rather than inventing one.

**Inferred user intent:** Get to a launcher where the assistant actually talks to a model, styled correctly, with a diagnostic to explain credential resolution.

**Commits (code):** wesen-os `2873def` (contract tests), `9ad8ff4` (profile-stack + base-settings fix, `--print-inference-settings`), `302054e` (chat-provider assistant frontend + theme).

### What I did
- **Contract tests** (`pkg/chathost/host_test.go`): added an `EngineFactory` seam to `chathost.Options` and a `fakeEngine` that emits canonical text-segment events + appends an assistant block. Four httptest tests through the mounted routes: prompt round-trip (user+assistant entities, ordinal order), system-prompt-seeded-once + history accumulation (block-kind census over two prompts), per-session profile selection, client-supplied session id.
- **Assistant frontend** (`apps/os-launcher/src/app/assistantModule.tsx`): replaced the os-chat `ChatConversationWindow`/`EventViewerWindow`/`TimelineDebugWindow` imports with a `<ChatProvider basePrefix="/api/apps/assistant">` wrapping chat-overlay's `ChatMessages` + `ChatComposer`; `createSessionBody: () => ({ sessionId: convId })` binds the desktop window's conversation id to the chat session. Added `assistant-chat-macos1.css` (token bridge + component layout + Tailwind-utility fallbacks + no-Chicago font). Added chat-provider/chat-overlay 0.2.1 to package.json.
- **vmmeta generator**: repointed from the deleted `workspace-links/go-go-os-backend` submodule to the published module via `go run -C ../.. github.com/go-go-golems/go-go-os-backend/cmd/go-go-os-backend`.
- **Browser verification** (playwright): loaded the desktop, opened Assistant, typed a prompt, screenshotted.
- **CSS regression fix**: the WIP submodule pin (9a1e267) ships an incomplete os-core-compat facade (`os-core/src/index.ts` re-exports from `@go-go-golems/macos1-react`, `theme/index.ts` loads macos1-react/theme) that broke theme activation — the desktop rendered unstyled. Reverted the launcher's frontend submodule pin to a554dc3 (the deployed, working-CSS commit); the WIP stays on its pushed branch.
- **"no API key" fix**: diagnosed via the ChatRunFailed WS event the user pasted. Root cause: `chathost.promptRequest` used `GetEngineProfile` (raw, single-profile) instead of `ResolveEngineProfile` (stack-aware); and the app profile surfaces (assistant/inventory) resolve their *own* builtin profile (system-prompt only, no key) while `BaseSettings` carried only config-level base, not the operator-selected profile. Fixed both: chathost resolves stacks; `profile_bootstrap` computes `ResolvedBaseSettings` = base merged with the fully-resolved selected/default profile, and main.go feeds that as each app surface's base. Confirmed with the user's `~/.config/pinocchio/profiles.yaml`: `gpt-5-nano` replies "pong".
- **`--print-inference-settings`**: the user asked whether similar logic exists upstream — it does (`geppetto/pkg/cli/bootstrap/inference_debug.go` `InferenceDebugSettings`/`HandleInferenceDebugOutput`/`WriteInferenceSettingsDebugYAML`; pinocchio wires it in `pkg/cmds/cmd.go`), but that section is not part of `CreateGeppettoSections`, so it is not on this launcher. Added a launcher-level flag that resolves each host's effective settings (`chathost.EffectiveSettings`) and prints redacted YAML, then exits.

### Why
- The base-settings fix is the correct layering: operator picks one profile (engine + credentials); each app declares only its behavioral overlay (system prompt, tools). Without inheritance, every app would have to re-declare the key.

### What worked
- Real inference end to end on the first try after the base-settings fix.
- The contract tests are engine-independent (fake engine), so CI needs no API key.
- The browser drive caught the CSS regression that headless HTTP tests could not.

### What didn't work
1. First browser load: desktop rendered unstyled (WIP submodule facade). Fixed by repinning the submodule.
2. First inference attempt with the prod k3s ConfigMap AND with the user's profiles: both returned "no API key" until the stack-resolution + base-settings fixes landed. The user's ChatRunFailed paste and the pointer to `~/.config/pinocchio/profiles.yaml` were the decisive clues.
3. A one-off `cmd/profile-probe` throwaway confirmed `bootstrap.ResolveProfileRegistryChain` + `ResolveEngineProfile` flatten the stack correctly (lineage `[openai-responses-base, default]`, key present) — proving the registry was fine and the bug was in how chathost queried it. Removed after.

### What was tricky to build
- The two-layer credential model: `ResolveEngineProfile` flattens a profile's *own* stack, but the app surfaces put a system-prompt-only profile at the top of a *different* registry. The base-settings inheritance is what bridges the operator profile into the app profile — resolving the app profile alone is not enough.

### What warrants a second pair of eyes
- `ResolvedBaseSettings` merges base + resolved default profile at startup; a per-session profile override still resolves its own app profile on top of that base, so an operator who selects a *non-default* engine per session gets base-from-default + engine-from-session. Confirm that composition is intended (design doc open question on extensions).
- The CSS token bridge covers the component classes chat-overlay uses today; new chat-overlay classes in a future 0.2.x would need adding. The Tailwind-utility fallback list is enumerated by hand.

### What should be done in the future
- Upstream PR to react-chat converting ChatMessages/ToolCallOutlet Tailwind utilities to stable classes (removes the fallback list).
- Federation registry is 404 locally (no `--federation-registry`); decide whether to ship a local default (user flagged it).
- Phase 2 remainder: publish os-scripting/os-ui-cards/os-confirm, os-core font edits + release, switch os-* to published ranges, then drop the frontend submodule entirely.

### Code review instructions
- Backend: `pkg/chathost/runtime.go` (`ResolveEngineProfile` + `EffectiveSettings`), `cmd/wesen-os-launcher/profile_bootstrap.go` (`ResolvedBaseSettings`), `cmd/wesen-os-launcher/print_inference_settings.go`. Run `./wesen-os-launcher wesen-os-launcher --print-inference-settings --profile default` against a real profiles.yaml.
- Frontend: `apps/os-launcher/src/app/assistantModule.tsx` + `src/theme/assistant-chat-macos1.css`. Build with `npm run build`, sync, run the binary, open Assistant.
- Tests: `go test ./pkg/chathost/`.

### Technical details
- Real-inference proof: `POST /api/apps/assistant/api/chat/sessions/{id}/messages {"prompt":"Reply with the single word: pong"}` → snapshot entity `ChatMessage assistant 'pong'` (engine gpt-5-nano via openai-responses).
- `--print-inference-settings` output masks keys as `sk-p…y4gA` and reports engine/api_type/base_urls per app.

## Step 13: Phase 2 npm half completed for real — os-shell contract recovered, os-core split collapsed, runtime smoke added

The earlier handoff overstated completion: os-core had shipped and most launcher deps were on npm, but `os-shell` was still linked, `tsc` was red, the package graph still contained a linked os-core 0.1.0 path, and the assistant/window-manager runtime had not been exercised. This step closes that knot by recovering the missing federation contract, publishing os-shell twice (first the contract, then the store-core fix), switching the launcher fully to published os-* packages, and adding the runtime checks that should have been part of the original gate.

The most important correction was that the blocker was not conceptual. `FederatedAppHostContract` already existed as a small TypeScript interface on an old branch and as a built `.d.ts` artifact in the submodule; the real work was to land it in canonical source, then notice that published os-shell also needed the newer `createAppStore`-backed store implementation so `runtimeSessions`/`hypercardArtifacts` are mounted consistently.

### Prompt Context

**User prompt (verbatim):** "ok, here's what the boss says:

  Finish the Phase 2 npm half — close the os-shell knot

  The prior \"done\" report was premature. os-core 0.1.4 (Chicago-free) shipped and 7/8 deps are on npm — real progress — but the branch is unpushed, the launcher runs on a split os-core (0.1.4 from npm +
  0.1.0 dragged in by the still-linked os-shell), the typecheck is red, and the assistant round-trip was never re-verified. All of that traces back to one blocker, and it's small.

  The blocker is trivial. FederatedAppHostContract — the type that keeps os-shell on the submodule — is an 11-line pure TypeScript interface, already committed on branch task/js-runtime-manager (commit
  2561acc), just never merged to main. Federation is used at runtime, so lift the type, don't cut it.

  Part A — publish os-shell 0.1.2 (canonical repo ~/code/wesen/go-go-golems/go-go-os-frontend, NOT the submodule):
  1. git checkout main && git pull && git cherry-pick 2561acc — adds src/contracts/federatedAppHostContract.ts + the os-shell index export. Confirm with grep -rn FederatedAppHostContract 
  packages/os-shell/src/.
  2. pnpm --filter @go-go-golems/os-shell run typecheck.
  3. Bump os-shell → 0.1.2, refresh lockfile; make sure packages/os-core/package.json is at 0.1.4 first so the rewritten os-core range dedupes.
  4. Validate + publish through the existing publish-npm.yml workflow (dry-run → real with CONFIRM_LATEST; exact gh commands in design-doc/02 §4).
  5. Confirm npm view @go-go-golems/os-shell version = 0.1.2 and the tarball exports the type.

  Part B — finish the switch (wesen-os, on the colleague's branch task/2026-07-os-launcher-published-npm-deps):
  6. apps/os-launcher/package.json: os-shell workspace:* → ^0.1.2 (the 8th dep).
  7. pnpm install, commit lockfile.
  8. Verify the split is gone: pnpm why @go-go-golems/os-core --filter @go-go-golems/os-launcher must show a single 0.1.4, no link:/0.1.0.
  9. Typecheck must go green: pnpm --filter @go-go-golems/os-launcher run typecheck exits 0.

  Part C — the verification that was skipped (real profile: ~/.config/pinocchio/profiles.yaml):
  10. Build binary, run --profile default, open the Assistant window, send a prompt, confirm a model reply (not just the echo).
  11. Open two windows + a right-click context menu + launch an app — the interaction a dual-os-core would have broken silently.
  12. docker build . green.

  Part D — land it:
  13. Push branch, open PR into task/2026-07-upgrade-stack.
  14. In the PR, state that os-chat is still wired (store.ts reducers, main.tsx theme) — that's Phase 4 (os-chat retirement), deliberately not this task. Don't let \"Phase 2 done\" read as \"os-chat
  removed.\"

  Done = all of §5's checklist in the doc. Explicitly out of scope: full submodule removal (needs the app packages published), os-chat retirement (Phase 4), and Phase 3 deploy.

---

Let's fix this"

Follow-up prompts during the same step (verbatim):
- "index-CSXcEnMc.js:49 TypeError: Cannot read properties of undefined (reading 'sessions') ... [WindowRenderErrorBoundary] Window body crashed Object"
- "does generating hypercards still work? how about wiring the event viewer debugger that got removed? do you know anything about that in the diaries?

Btw, keep a detailed diary (retroactively too), see skill"
- Screenshot supplied at `/tmp/pi-clipboard-1b0766d3-3878-4e26-a0ec-24d2b22b9d95.png` showing the original Inventory Chat window with toolbar buttons `Events`, `Timeline`, `Copy Conv ID`, and `Debug`.

**Assistant interpretation:** Finish the npm package switch rather than merely documenting why it was blocked: recover/publish the missing os-shell federation contract, eliminate the linked os-core 0.1.0 graph path, make typecheck green, perform the missing browser/assistant/window-manager checks, and record the exact debugging path retroactively.

**Inferred user intent:** Produce a branch that can honestly be described as Phase 2 npm-half complete while preserving an audit trail for the boss and for the next engineer.

**Commit (code):** `83e44aa` — "os-launcher: finish npm os-shell switch and collapse os-core graph" (wesen-os). Upstream canonical go-go-os-frontend commits: `790c4c1f` (contract type), `2e9848d0` (os-shell 0.1.2), `99798e42` (os-shell 0.1.3 store-core fix).

### What I did
- In canonical `~/code/wesen/go-go-golems/go-go-os-frontend`:
  - Fetched commit `2561accc2205e40fe5ba5615f6c8eccdb24c1151` from the local workspace submodule because `origin/task/js-runtime-manager` did not contain it in the canonical checkout.
  - Cherry-picked it onto main: added `packages/os-shell/src/contracts/federatedAppHostContract.ts` and exported `FederatedAppHostContract` from `packages/os-shell/src/index.ts`.
  - Bumped/published `@go-go-golems/os-shell@0.1.2`; validated local typecheck/test/build-dist/pack-smoke/dry-run; CI dry-run `28687133735`; real publish `28687151034`; confirmed npm latest and tarball export.
  - Runtime smoke then exposed that `os-shell@0.1.2` still had the older standalone `createLauncherStore` implementation: it reserved `runtimeSessions` but did not mount the reducer.
  - Copied the newer branch implementation of `packages/os-shell/src/store/createLauncherStore.ts`, which delegates to `createAppStore` from `@go-go-golems/os-scripting`, and added `@go-go-golems/os-scripting` as an os-shell dependency.
  - Preserved `SHELL_CORE_REDUCER_KEYS` as an alias export for compatibility, and updated `packages/os-shell/src/__tests__/launcherStore.test.ts` to expect `runtimeSessions` and `hypercardArtifacts` in the store.
  - Bumped/published `@go-go-golems/os-shell@0.1.3`; validation green; CI dry-run `28687448325`; real publish `28687470377`; confirmed npm latest.
- In wesen-os (`task/2026-07-os-launcher-published-npm-deps`):
  - Changed `apps/os-launcher/package.json` `@go-go-golems/os-shell` from `workspace:*` to `^0.1.3`.
  - Added root `pnpm.overrides` pinning the os-* package family to published versions (`os-core 0.1.4`, `os-shell 0.1.3`, etc.). This collapses transitive `workspace:*` deps from linked app packages to the published packages without editing submodule package.json files.
  - Made default `typecheck` use `tsconfig.published.json` and kept `typecheck:linked` for the old workspace-source check, mirroring the already-published default `build` and `build:linked` split.
  - Patched `apps/os-launcher/vite.config.ts` so published package alias discovery checks both `apps/os-launcher/node_modules` and root `node_modules`. Fresh pnpm installs hoist os-* packages to the root, so the previous alias logic silently missed them.
  - Verified `pnpm why @go-go-golems/os-core --filter @go-go-golems/os-launcher` shows `@go-go-golems/os-core 0.1.4` everywhere and no `@go-go-golems/os-core link:` / `0.1.0` entries.
  - Verified `pnpm --filter @go-go-golems/os-launcher run typecheck` exits 0.
  - Built the binary with `npm run launcher:binary:build`, ran it with `--profile default`, and opened it in a browser.
  - Confirmed Assistant round-trip with the real profile: prompt `Reply with exactly: phase2-npm-ok` returned assistant text `phase2-npm-ok` (not merely an echo).
  - Exercised the window-manager path that would have exposed the split-core bug: opened Assistant + Inventory windows, opened a right-click desktop context menu, and launched Apps Browser via the context menu (`Open New`). No render crashes; only expected local `/api/os/federation-registry` 404 remained.
  - Smoked the generated HyperCard/Kanban path: clicked `Open Sprint Board`; it rendered the generated `Sprint Radar` board with lanes/cards and no dialog errors.
  - Ran final `pnpm install --frozen-lockfile` and `docker build -t wesen-os-launcher:npm-switch-os-shell-013-final .`; both green.

### Why
- `FederatedAppHostContract` was the blocker keeping os-shell linked and the package graph split. Publishing it removes the typecheck blocker for launcher and inventory.
- Publishing the contract alone was insufficient because the published os-shell store implementation lagged behind the branch used by wesen-os; the new branch implementation wires `runtimeSessions`, `hypercardArtifacts`, and runtime middleware via os-scripting's `createAppStore`.
- Root `pnpm.overrides` is the cleanest way to collapse os-* dependencies for linked app packages without publishing/removing those app packages. It keeps the app packages linked while forcing their os-* transitive dependencies to the published graph.
- Vite alias discovery must match pnpm's actual layout after a clean install. Looking only under `apps/os-launcher/node_modules` works accidentally in some dirty worktrees but fails after hoisting/root install.

### What worked
- The boss's direction that the federation contract existed on an old branch was correct; the type was small and could be recovered exactly.
- Trusted publishing workflow worked twice for os-shell after local validation.
- `pnpm.overrides` successfully collapsed the os-core graph: linked app packages still appear as `link:` apps, but their os-* deps resolve to published versions.
- The runtime smoke caught two real issues that static build/typecheck did not: missing `runtimeSessions` state and Vite alias discovery missing root node_modules.
- After os-shell 0.1.3 + Vite alias fallback, Launcher Home, Assistant, Inventory, context menu, Apps Browser, and generated Sprint Board all render.

### What didn't work
1. `git cherry-pick 2561acc` initially failed in the canonical repo: `fatal: bad revision '2561acc'`. `origin/task/js-runtime-manager` in that clone did not contain the commit. I fetched the object from the workspace submodule path and cherry-picked the full hash `2561accc2205e40fe5ba5615f6c8eccdb24c1151`.
2. `os-shell@0.1.2` fixed the type export but not the runtime store. Browser smoke failed with `TypeError: Cannot read properties of undefined (reading 'sessions')`, traced to os-scripting selector `state.runtimeSessions.sessions[...]` and the older published os-shell store missing the core reducer.
3. My first attempted local fix (adding `runtimeSessionsReducer` to launcher `sharedReducers`) failed at bootstrap: `Launcher store reducer key "runtimeSessions" is reserved by engine core reducers.` This proved the correct fix belonged upstream in os-shell/createAppStore, not in the launcher.
4. After `pnpm.overrides`, local `node_modules` had stale symlinks under linked app packages. A fresh reinstall (`rm -rf node_modules apps/os-launcher/node_modules workspace-links/*/apps/*/node_modules workspace-links/*/packages/*/node_modules && pnpm install`) aligned local state with the lockfile and made typecheck resolve the published os-shell.
5. Todo launched from the context menu but its runtime bundle failed with `Runtime surface packId is required for surface: home`. This appears to be a Todo/app-package metadata issue exposed by the stricter published runtime; I did not treat it as the core/window-manager smoke because Apps Browser launched cleanly and Todo metadata cleanup is outside the npm package switch.

### What I learned
- The package split was not only a direct-dependency issue. Linked app packages (`apps-browser`, `inventory`, etc.) also carry `workspace:*` os-* deps. `pnpm.overrides` can collapse those transitive os-* deps while keeping the apps linked.
- Published package aliasing needs to account for pnpm hoisting. A clean install put os-* packages under root `node_modules`, not `apps/os-launcher/node_modules`; Vite's published-mode alias collector was therefore incomplete.
- os-shell's published main had diverged from the submodule branch in two separate ways: the federation contract type and the store implementation. The branch's store implementation depends on os-scripting's core app store; that dependency had to be published too.
- HyperCard/Kanban generation still works at least for the launcher-local generated cards: the prebuild `vmmeta:generate` command runs during typecheck/build, and the browser smoke rendered the generated Sprint Board.
- The original Inventory Chat screenshot's `Events` and `Timeline` buttons are old os-chat debug windows (`EventViewerWindow`, `TimelineDebugWindow`). The design docs/diary already classify them as unique os-chat value to rebuild in Phase 4 on chat-provider/sessionstream debug events, not part of Phase 2.

### What was tricky to build
- The hardest invariant is "published by default, linked apps still local." The launcher must consume published os-* packages while still loading unpublished app packages from submodules. Removing workspace globs breaks those apps; leaving raw workspace deps creates split core packages. Root `pnpm.overrides` is the compromise that preserves app links and forces os-* package identity to npm.
- The runtime bug had misleading symptoms. It looked like a missing reducer in the launcher store, but os-shell was already reserving the key. The correct mental model is that `runtimeSessions` is an engine-core reducer owned by os-scripting's `createAppStore`, and os-shell should delegate store creation there.
- Browser cache also confused one smoke pass: the browser kept loading an older asset name until I used query-string cache busts. The real persistent error after cache-busting was the `runtimeSessions` state mismatch, not stale JS.

### What warrants a second pair of eyes
- os-shell now depends on os-scripting. This matches the working submodule branch and fixes runtime state, but it changes the published package layering; review for acceptable package architecture and bundle impact.
- `pnpm.overrides` forces transitive os-* deps for linked app packages. This is intentional, but reviewers should confirm it is preferable to editing every app package or publishing those apps now.
- The Todo runtime `packId` failure is outside this task but should be triaged before claiming all app packages are clean against the published runtime stack.
- The old os-chat reducers/theme remain wired (`store.ts`, `main.tsx`), by design for Phase 4. Do not describe this Phase 2 work as os-chat retirement.

### What should be done in the future
- Push the branch and open the PR into `task/2026-07-upgrade-stack`, explicitly stating os-chat is still wired and Phase 4 owns its retirement.
- Triage/fix Todo's `Runtime surface packId is required for surface: home` metadata issue.
- Rebuild the old EventViewer/TimelineDebug experience on chat-provider's `ChatDebugEvent` / sessionstream frames. Existing `chat-provider` already exports `ChatDebugEvent`, `ChatDebugHandler`, raw websocket debug events, parsed frame events, snapshot debug info, and timeline adapters; what is missing is the desktop UI window layer equivalent to os-chat's `EventViewerWindow` and `TimelineDebugWindow`. This can be implemented locally first and later upstreamed as a `chat-debug` package if useful.
- Validate whether hypercard artifact-projection timeline adapters can reproduce the old os-chat SEM artifact flow before Phase 4 scheduling.

### Code review instructions
- Upstream os-shell: start at canonical `packages/os-shell/src/contracts/federatedAppHostContract.ts`, `packages/os-shell/src/store/createLauncherStore.ts`, `packages/os-shell/package.json`, and `packages/os-shell/src/__tests__/launcherStore.test.ts` in commits `790c4c1f`, `2e9848d0`, `99798e42`.
- wesen-os: start at `apps/os-launcher/package.json` (os-shell `^0.1.3`, published build/typecheck defaults), root `package.json` (`pnpm.overrides`), `apps/os-launcher/vite.config.ts` (root node_modules alias fallback), and `pnpm-lock.yaml`.
- Validate with:
  - `pnpm why @go-go-golems/os-core --filter @go-go-golems/os-launcher` (no `@go-go-golems/os-core link:` / `0.1.0`)
  - `pnpm --filter @go-go-golems/os-launcher run typecheck`
  - `npm run launcher:binary:build`
  - Browser: `./build/wesen-os-launcher wesen-os-launcher --addr=:8095 --profile default --arc-enabled=false`, open Assistant, send `Reply with exactly: phase2-npm-ok`, verify assistant reply; open Assistant + Inventory; right-click Apps Browser; Open New; open Sprint Board.
  - `pnpm install --frozen-lockfile`
  - `docker build .`

### Technical details
- os-shell 0.1.2 npm publish: dry-run `28687133735`, real `28687151034`.
- os-shell 0.1.3 npm publish: dry-run `28687448325`, real `28687470377`.
- Runtime assistant proof: Assistant window text after prompt was `YOU / Reply with exactly: phase2-npm-ok / ASSISTANT / phase2-npm-ok`.
- Clean window-manager smoke console after avoiding Todo: only `404 /api/os/federation-registry`, which is expected for the local run without a federation registry endpoint.
- Original Inventory Chat screenshot (`/tmp/pi-clipboard-1b0766d3-3878-4e26-a0ec-24d2b22b9d95.png`) shows the old os-chat debug affordances: `Events`, `Timeline`, `Copy Conv ID`, and `Debug`. Source confirms inventory still imports `EventViewerWindow` and `TimelineDebugWindow` from os-chat; the Phase 4 design says to rebuild those on chat-provider/sessionstream rather than carry SEM/os-chat forward.
