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
