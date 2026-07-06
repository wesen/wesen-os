---
Title: Diary — Inventory chat window react-chat migration (Phases A–F)
Ticket: WESEN-OS-STOCKTAKE-2026-07
DocType: reference
Intent: short-term
Owners: []
Summary: Implementation diary for migrating the Inventory chat window off the legacy os-chat SEM transport onto chat-provider/chat-overlay, including the chathost profiles endpoint and the generated-card widget rail.
LastUpdated: 2026-07-03T00:00:00-07:00
---

# Diary

## Goal

Capture the implementation of design-doc/06: rebuild the Inventory chat window on
`@go-go-golems/chat-provider` + `chat-overlay`, add the backend profile endpoint,
and re-establish generated-card rendering through the chatapp widget rail —
executed end-to-end (Phases A–F) with per-phase commits.

## Step 1: Architect design (design-doc/06)

Read the architect brief (design-doc/05), the current os-chat Inventory window,
the new chathost wire contract, and the installed chat-provider/chat-overlay 0.2.1
type surface. Produced design-doc/06 with the two-track split (transport+chrome
vs generated cards) and the key finding that the card middleware is stranded in
`pkg/_pinoweb_legacy`, so the new backend emits no card events.

### Prompt Context

**User prompt (verbatim):** "Key status for the architect: ... Inventory chat does not work because frontend still uses old os-chat endpoints while backend serves new sessionstream/chat-provider endpoints. Recommended design: rebuild Inventory chat window chrome on ChatProvider ... (you are the architect) Also read: ...design-doc/05..."

**Assistant interpretation:** As architect, rule on and design the Inventory chat migration; then (next prompt) execute it.

**Inferred user intent:** A correct, faithful rebuild that preserves the existing window affordances and restores card generation, not a blind 404 patch.

**Commit (docs):** 46b1ebf — "docs(inventory-chat): architect design for react-chat migration (design-doc/06)"

### What I did
- Verified frontend contract (`renderInventoryApp.tsx:928` renders os-chat `ChatConversationWindow`) vs backend contract (`pkg/chathost/handlers.go`).
- Confirmed `ChatProvider` accepts widgets/tools/adapters only through `config` (ChatExtensionConfig), not props.
- Confirmed the hypercard middleware is quarantined in `pkg/_pinoweb_legacy`; `chathost` already installs `chatapp` `widgets.NewWidgetPlugin()`.
- Wrote design-doc/06: current/target diagrams, profile/debug/card strategies, package-boundary DRs, phased plan A–F, validation matrix.

### Why
The brief asked for a design, not a patch; the card path needed a real backend source decision before any frontend work.

### What I learned
- `Hub.Publish(ctx, Event)` is public — application code (chathost) can publish widget instances without pinocchio changes.
- The launcher's `appProfileSurface` already scopes each app's registry to its visible profiles, so a generic profiles endpoint needs no per-app curation.

### Code review instructions
- Start at design-doc/06 §0 (verdict) and §8 (card strategy).

## Step 2: Phases A–C + D-frontend — react-chat window, chrome, debug, detached windows

Rebuilt the Inventory chat window as `InventoryChatWindow` (ChatProvider +
ChatMessages/ChatComposer) wrapped in Inventory chrome reproducing the reference
screenshot: title, connection badge, profile selector, Events/Timeline/Copy Conv
ID/Debug, message counter, "How can I help?" empty state, starter suggestions,
footer. Added a per-conversation debug ring buffer feeding an inline Debug panel
and the detached Event Viewer / Timeline Debug windows (rebuilt on
`ChatDebugEvent` + the snapshot endpoint). Removed the os-chat transport/debug/
profile imports and the `chatProfilesSlice` command wiring from
`renderInventoryApp.tsx`, keeping the desktop menu/context integration.

### Prompt Context

**User prompt (verbatim):** "do it all. Commit at appropriate intervals, keep a diary as you go (see skills)."

**Assistant interpretation:** Execute every phase of design-doc/06 (A–F), committing per phase and keeping this diary.

**Inferred user intent:** A working, shipped Inventory chat, not a partial handoff.

**Commit (code):** bee438c (submodule) — "feat(inventory-chat): rebuild chat window on chat-provider/chat-overlay"; 0932d7b (top-level) — submodule + lockfile bump.

### What I did
- Added `@go-go-golems/chat-provider` + `chat-overlay` ^0.2.1 to the inventory app; refreshed the lockfile with `pnpm install --lockfile-only`.
- New files under `apps/inventory/src/launcher/chat/`: `InventoryChatWindow.tsx`, `InventoryDebugWindows.tsx`, `inventoryChatDebugStore.ts`, `useInventoryChatDebugEvents.ts`, `useInventoryProfiles.ts`, `inventory-chat.css`.
- Rewrote `InventoryChatAssistantWindow` into a thin desktop wrapper; repointed the Event/Timeline routing to the new components.

### Why
The old window derived old SEM endpoints from `basePrefix` and 404'd; ChatProvider speaks the live contract natively (same as the Assistant window).

### What worked
- Launcher typecheck (published resolution, the shipping gate) is green, proving the new files are type-clean.

### What didn't work
- The inventory app's standalone `tsc -b` fails at `src/host.ts` on `FederatedAppHostContract` — but this is a **pre-existing** Phase 2 linked-resolution knot (host.ts untouched by me), not a chat regression. os-shell 0.1.3 in `node_modules` does export it; the standalone build resolves os-shell to linked workspace source.

### What was tricky to build
- `noUnusedLocals`/`noUnusedParameters` cascade when removing os-chat wiring: dropping the profile menu meant dropping `chatProfilesSlice` dispatches, the `availableProfiles`/`selectedProfile` selectors, the Profile menu section, and unused run-handler params. Resolved by letting the launcher typecheck enumerate the leftovers and pruning each.
- Detached debug windows can't read the per-window ChatProvider store, so a module-level per-convId ring buffer (`inventoryChatDebugStore`) fed by `onDebugEvent` and read via `useSyncExternalStore` bridges chat window → detached windows.

### What warrants a second pair of eyes
- Profile-at-creation semantics: the selector locks after the first message (no mid-session profile-update endpoint exists). Confirm this UX is acceptable vs. auto-starting a new session on change.

### What should be done in the future
- A behavioral test for the provider-based window (needs a WS/fetch mock).

### Code review instructions
- Start at `InventoryChatWindow.tsx` (`InventoryChatChrome`), compare to `apps/os-launcher/src/app/assistantModule.tsx`.
- Validate: open Inventory chat, confirm no old-endpoint 404s, prompt round-trips, Copy Conv ID copies `overlay.sessionId`.

## Step 3: Phase D backend — GET /api/chat/profiles

Added a generic profiles endpoint to chathost so the header selector has a real
source. Prefers `ProfileSurface.VisibleProfiles`; falls back to enumerating the
registry (already scoped to visible profiles by the launcher's
`appProfileSurface`, so enumeration returns the right set with display names).
Sorted default-first then by slug for a stable selector.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Commit (code):** e903c6b — "feat(chathost): add GET /api/chat/profiles endpoint"

### What I did
- `ProfileDescriptor` + `ProfileSurface.VisibleProfiles` (host.go); `handleProfiles` (handlers.go); route in `MountRoutes`; contract test.

### What was tricky to build
- Registry enumeration walks a map (non-deterministic order); added `sort.SliceStable` for a stable selector.

### What I learned
- No main.go change was needed: the inventory chathost already receives the curated `appProfileSurface` as its `Registry`, so `ListEngineProfiles` returns exactly the visible profiles with display names.

### Code review instructions
- `pkg/chathost/handlers.go` `handleProfiles`; test `TestChatContract_ProfilesEndpoint`. Validate: `curl <base>/api/apps/inventory/api/chat/profiles`.

## Step 4: Phase E — generated cards on the chatapp widget rail

Re-established generated cards without any pinocchio change. chathost gained
`Options.ArtifactExtractor`: after each assistant turn (`OnFinalTurn`), it runs
the extractor over the assistant text and publishes each returned
`WidgetArtifact` as a `ChatWidgetInstance` via `hub.Publish` (the widget plugin,
already installed, projects it and fans it out). The launcher supplies
`extractInventoryCards` (parses `<hypercard:card:v2>{json}</...>` blocks) and an
extended inventory system prompt. The frontend registers
`defineWidget('inventory.card', ...)`; `ChatMessages` renders it.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Commits (code):** 27afe8e — "feat(chathost): publish generated widget artifacts on the chatapp widget rail"; e82c57f (submodule) — "feat(inventory-chat): render generated cards via inventory.card widget"; bc3fe5c (launcher) — "feat(launcher): wire inventory card extractor + system prompt".

### What I did
- host.go: `WidgetArtifact`, `ArtifactExtractor`, `Options.ArtifactExtractor`.
- runtime.go: wrap `OnFinalTurn` → `publishArtifactsFromTurn` + `assistantTextFromTurn`; `hub.Publish(ChatWidgetInstanceStarted)`.
- launcher: `inventory_artifacts.go` (extractor + system prompt), wired on the inventory host.
- frontend: `inventoryCardWidget.tsx` + card CSS; passed via `widgets` prop.
- Test `TestChatContract_ArtifactExtractorPublishesWidget` asserts a `ChatWidgetInstance` lands in the snapshot.

### Why
The old card path used quarantined pinoweb SEM emission; the widget plugin rail is the new, already-installed equivalent, reachable from chathost via the public `Hub.Publish`.

### What was tricky to build
- Emission point: `OnFinalTurn` runs on the background inference goroutine after the request context is gone, so publishing uses `context.Background()` (mirroring `persistFinalTurn`). Widgets get the next ordinal, so they render after the assistant text — the correct place for a card.
- `assistantTextFromTurn` must filter `BlockKindLLMText` (confirmed `NewAssistantTextBlock` is that kind).

### What warrants a second pair of eyes
- Concurrency: `hub.Publish` during/after a run assigns ordinals under the hub lock; confirm no interleaving hazard with chatapp's own late publishes.
- The card is a standalone timeline entity (no `ParentMessageId`), since the engine decorator can't see chatapp's messageID. Acceptable, but confirm timeline grouping looks right in-browser.

### What should be done in the future
- Full-acceptance browser check: prompt "make me a low-stock card" against a live model and confirm a rendered card.

### Code review instructions
- Start at `pkg/chathost/runtime.go` `publishArtifactsFromTurn`; then `cmd/wesen-os-launcher/inventory_artifacts.go`; then `inventoryCardWidget.tsx`.
- Validate: `go test ./pkg/chathost/...`.

## Step 5: Phase F — cleanup, build verification

The launcher chat path is already os-chat-free (removed in Step 2). Remaining
os-chat usage is the inventory **standalone app** (`main.tsx` theme, `store.ts`
SEM reducers) and its SEM projection test — legitimately Phase 4 per DR-6, left
in place. Verified the full launcher production build and Go build/tests.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

### What I did
- Confirmed no os-chat imports remain on the launcher chat path.
- `GO_GO_OS_FRONTEND_RESOLUTION=published vite build`: 1278 modules, success (card CSS + widget bundled).
- `go build ./...` clean; `go test ./pkg/chathost/...` green.

### What didn't work
- N/A (all gates green).

### What should be done in the future
- Phase 4: retire os-chat from the standalone inventory app (`main.tsx`, `store.ts`) and migrate its SEM card projection test to the widget rail.
- Migrate k3s `profiles.runtime.yaml` and ship (Phase 3 of the parent plan).

### Code review instructions
- Validate end-to-end: `cd apps/os-launcher && GO_GO_OS_FRONTEND_RESOLUTION=published npx vite build` and `go build ./...`.

## Step 6: Phase 3 ship prep — config migration + finding, runbook, PRs

Turned to the parent plan's Phase 3 (ship). The one flagged hard blocker was the
k3s `profiles.runtime.yaml` format. Validated it empirically with the launcher's
own resolver and discovered the legacy layout does not error — it is silently
ignored, so production resolves the geppetto default `gpt-4` instead of the
intended `gpt-4.1-mini`. Migrated the in-repo ConfigMap to the new format,
wrote the ship runbook (design-doc/07), and opened/updated the two PRs.

### Prompt Context

**User prompt (verbatim):** "continue next phase"

**Assistant interpretation:** Execute the next parent-plan phase after the inventory chat migration; that is Phase 3 (ship).

**Inferred user intent:** Get the migrated stack shipped to wesen-os.yolo.scapegoat.dev.

**Follow-up prompt (verbatim):** "go ahead, also, did you keep your diary (see skill for format). If not, retroactively fill all the steps you missed"

**Assistant interpretation:** Open the two PRs I offered, and backfill any missing diary steps (this Step 6).

**Commits (deploy/docs):** 8e3f3d2 — "fix(deploy): migrate profiles.runtime.yaml to new engineprofiles format"; e3dda9c — "docs(phase-3): ship runbook + config-migration finding (design-doc/07)".

### What I did
- Built the launcher and validated three profile YAMLs via `wesen-os-launcher wesen-os-launcher --profile-registries=<f> --profile=default --print-inference-settings`: legacy → `gpt-4`; new-format → `gpt-4.1-mini`.
- Migrated `deploy/k8s/wesen-os/configmap.yaml` `profiles.runtime.yaml` to `profiles.default.inference_settings.chat.engine`; dropped unsupported `default_profile_slug`.
- Confirmed the prod GitOps copy (`wesen/2026-03-27--hetzner-k3s config/profiles.runtime.yaml`) carries the same legacy bug.
- Read the CI pipeline (`publish-host-image.yml` push-to-main → GHCR + auto GitOps image-PR; `open_gitops_pr.py` patches only the image; `deploy-host-to-k3s.yml` is a break-glass `kubectl apply -k`).
- Wrote design-doc/07 (ship runbook) with the coupling rule and ordered steps.
- Opened submodule PR go-go-app-inventory#18; rewrote parent PR wesen/wesen-os#14 (title/body) to reflect the full Phase 2–3 scope.

### Why
Phase 3 is next in the parent plan, and the config-format check was flagged as a potential hard blocker; validating it early prevents a silently-wrong prod model.

### What worked
- The launcher's `--print-inference-settings` is a precise, credential-safe validator for the exact prod resolution — the definitive way to test config changes without deploying.

### What didn't work
- `gh pr edit` failed silently on this repo (`GraphQL: Projects (classic) ... projectCards` deprecation aborts the mutation). Worked around it with `gh api repos/.../pulls/14 -X PATCH -f title=... -f body=...` (REST), which succeeded.
- The launcher CLI is a subcommand: flags live under `wesen-os-launcher wesen-os-launcher ...`, not the top-level command; `--profile-registries` is unknown at top level.

### What I learned
- The new engineprofiles YAML decoder is stricter than the struct in some places (rejects `default_profile_slug`) and looser in others (silently ignores the legacy `runtime:` block). Silent-ignore is the dangerous one — it degrades the model without any error.
- Two config sources exist: the in-repo `deploy/k8s/wesen-os/configmap.yaml` (break-glass `kubectl apply -k`) and the authoritative GitOps `config/profiles.runtime.yaml` (Argo self-heal). Prod is the GitOps one.

### What was tricky to build
- Establishing that the config migration is *coupled to the image version*: the old image reads old-format config, the new config only works on the new image, and the current config silently downgrades the model. Symptom: naively flipping prod config ahead of the image could break the running pod (old image) or leave the wrong model (config unchanged). Resolution: documented the coupling rule — ship config + image in one GitOps PR — and did not touch prod config unilaterally.

### What warrants a second pair of eyes
- The federation-asset question: the inventory remote UI changed; whether CI rebuilds the module-federation bundle or it needs a manual object-storage publish + `federation.registry.json` manifestUrl bump before the GitOps merge (design-doc/07 §3.4).
- The merge-strategy decision: PR #14 is stacked into `task/2026-07-upgrade-stack` (no PR to main); my branch supersets it. Retarget #14 to main vs. open `upgrade-stack → main`.

### What should be done in the future
- Execute the outward-facing ship steps (design-doc/07): merge to main → image build → GitOps config+image PR → Argo sync.
- Phase 5: provision the LLM API-key Secret (prod ConfigMap mounts none), else prompts fail with "no API key for openai" even after this ship.

### Code review instructions
- Start at `deploy/k8s/wesen-os/configmap.yaml` and design-doc/07.
- Validate: `go build -o /tmp/wl ./cmd/wesen-os-launcher/ && /tmp/wl wesen-os-launcher --profile-registries=<extracted-yaml> --profile=default --print-inference-settings --inventory-db=/tmp/i.db --timeline-db=/tmp/t.db --turns-db=/tmp/u.db` → expect `engine: gpt-4.1-mini` for both apps.

### Technical details
- Validated new-format registry body:
  ```yaml
  slug: cluster-default
  display_name: Cluster Default
  profiles:
    default:
      slug: default
      display_name: Default
      inference_settings:
        chat:
          engine: gpt-4.1-mini
  ```
- PRs: wesen/wesen-os#14 (parent, full scope), go-go-golems/go-go-app-inventory#18 (submodule).

## Step 7: devctl plugin for local run + submodule conflict diagnosis

Built a devctl plugin so the full stack runs with `devctl up`, and diagnosed the
`go-go-app-inventory#18` merge conflicts. The conflicts are architectural: the
submodule `main` (commit 0fa6f5e) independently migrated the inventory chat
backend *to* go-go-os-chat webchat packages, while our branch moved it *off*
webchat onto pinocchio chatapp/sessionstream (host-injected ChatRoutes). Same
integration, opposite directions.

### Prompt Context

**User prompt (verbatim):** "#18 has conflicts, what are those about? also, how can i teset this locally? have you created a devctl plugin to launch this?" (+ follow-ups: "yu can also do devctl help --all", "and there's a skill as well")

**Assistant interpretation:** Explain the #18 conflicts, give a local test path, and create a devctl plugin (using the devctl-plugin-authoring skill).

**Inferred user intent:** A one-command local run and clarity on why #18 cannot fast-forward.

**Commit (code):** 70962e6 — "feat(devctl): add wesen-os dev plugin (launcher backend + vite frontend)".

### What I did
- Read the devctl plugin-authoring guide + the react-chat `devctl_chatoverlay.py` reference; wrote `plugins/wesen-os-devctl.py` (NDJSON v2) + `.devctl.yaml`.
- Ops: config.mutate, validate.run, prepare.run (pnpm install), build.run (go build), launch.plan (backend + vite), command.run (print-inference).
- Verified: `devctl plan` → correct 2-service plan; `devctl up` → both healthy; `/api/apps/inventory/api/chat/profiles` returns the new endpoint; vite proxies `/api`; `devctl down` clean.
- Diagnosed #18 via `git merge-tree --write-tree`: conflicts in go.mod/go.sum, pkg/backendcomponent/component.go, pkg/backendmodule/module.go, and a pinoweb rename-vs-add.

### Why
`devctl up` replaces the ad-hoc `launcher-dev-tmux.sh` with a supervised, health-checked, log-captured run; and the user needed to know why #18 conflicts before merging.

### What worked
- The plugin doubled as a live integration test of the whole migration — the new inventory chat contract (profiles/health) responds under `devctl up`.

### What I learned
- `main` of the inventory submodule took the go-go-os-chat route (Decision D3 was explicitly *against* that as the migration vehicle). Our branch and `main` cannot both win; the ticket's decided architecture is ours (pinocchio chatapp).

### What warrants a second pair of eyes
- The #18 resolution is an architecture call: rebase our branch onto main keeping chathost (recommended, matches D3) vs. adopt main's go-go-os-chat direction (contradicts the ticket). Needs an explicit owner decision.

### What should be done in the future
- Resolve #18 by rebasing onto submodule `main`: keep our backendcomponent/backendmodule + `_pinoweb_legacy` quarantine, drop go-go-os-chat webchat deps from go.mod, take main's infra bumps (go 1.26.4, goja, x/net security, glazed-lint, generated-db removal).

### Code review instructions
- `plugins/wesen-os-devctl.py` + `.devctl.yaml`. Validate: `devctl plan`, then `devctl up` and curl `http://127.0.0.1:5273/api/apps/inventory/api/chat/profiles`, then `devctl down`.

### Technical details
- Real inference: plugin defaults `--profile-registries` to `~/.config/pinocchio/profiles.yaml`; `devctl up --profile real` (or `WESEN_OS_PROFILE=<slug>`) selects a leaf profile.
- Conflict source: submodule `main` 0fa6f5e "Migrate app inventory chat integration to go-go-os-chat packages" (imports `webchat.Server`, `chatservice`) vs our host-injected `ChatRoutes`.
