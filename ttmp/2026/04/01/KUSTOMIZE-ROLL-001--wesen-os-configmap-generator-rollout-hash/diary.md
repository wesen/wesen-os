# Diary

## 2026-04-01: Ticket Creation

This ticket was created immediately after the first live federated-remote rollout for `wesen-os`.

The production symptom was clear:

1. the GitOps `ConfigMap` had the new `federation.registry.json`
2. Argo had reconciled the manifest
3. but `https://wesen-os.yolo.scapegoat.dev/api/os/federation-registry` still served the old manifest URL

The reason was the current Deployment shape:

- the config files are mounted with `subPath`
- `subPath` mounts do not hot-update inside a running pod when the backing `ConfigMap` changes

So even though the cluster desired state was correct, the running pod still had the old file content until a manual rollout restart happened.

This ticket exists to replace that fragile operational behavior with a Kustomize-native rollout trigger pattern and, at the same time, document Kustomize well enough that a new intern can understand what the package is doing and why.

The guide in this ticket is intentionally tied to the real package:

- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os`

instead of teaching Kustomize in the abstract.

I also added:

- `scripts/01-audit-current-wesen-os-kustomize.sh`

to replay the current package shape and verify the starting point before any implementation work begins.

After writing the ticket bundle, I uploaded it to reMarkable as:

- `KUSTOMIZE-ROLL-001 Kustomize Config Generator Guide`

under:

- `/ai/2026/04/01/KUSTOMIZE-ROLL-001`

and verified the upload with:

- `remarquee cloud ls /ai/2026/04/01/KUSTOMIZE-ROLL-001`

## 2026-04-01: Breaking The Refactor Into Real Implementation Slices

Before changing the live Kustomize package, I tightened the task list into actual implementation checkpoints rather than leaving it at a design-outline level.

That matters because this refactor has two distinct risks:

1. changing the rendered Kubernetes objects
2. changing the runtime mount behavior inside the container

So the execution plan now explicitly separates:

- design decisions
- K3s package edits
- render validation
- later Argo/rollout validation

The first code slice I am taking is intentionally narrow:

- create real config source files
- switch to `configMapGenerator`
- preserve the sync-wave annotation
- replace `subPath` mounts with a `/config` directory mount
- validate the rendered output before any GitOps rollout happens

That is the right boundary because it proves the Kustomize mechanics first without mixing in cluster debugging yet.

## 2026-04-01: First K3s Package Refactor Slice

I created a dedicated K3s feature branch for this work:

- `task/kustomize-roll-001-wesen-os-config-generator`

Then I applied the first implementation slice directly to:

- `/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os`

### What changed

I converted the package from a handwritten inline ConfigMap to generator-backed source files:

- added:
  - `config/profiles.runtime.yaml`
  - `config/federation.registry.json`
- updated:
  - `kustomization.yaml`
  - `deployment.yaml`
- removed:
  - `configmap.yaml`

### Exact design choices used

I intentionally chose the clean Kustomize-native shape described in the guide:

1. `configMapGenerator` with logical name:
   - `wesen-os-config`
2. `generatorOptions.annotations` to preserve:
   - `argocd.argoproj.io/sync-wave: "0"`
3. Deployment still references the logical name:
   - `wesen-os-config`
4. Kustomize rewrites that to the generated hashed name
5. The container now mounts:
   - `/config`
   instead of two `subPath` file mounts

This preserves the runtime file paths the process already expects:

- `/config/profiles.runtime.yaml`
- `/config/federation.registry.json`

without keeping the `subPath` behavior that caused the stale live config problem.

### Validation

I validated the rendered output with:

- `kubectl kustomize gitops/kustomize/wesen-os`
- `git diff -- gitops/kustomize/wesen-os`

The rendered output showed the exact result we wanted:

- generated ConfigMap name:
  - `wesen-os-config-559tk88gt5`
- Deployment volume reference rewritten to:
  - `wesen-os-config-559tk88gt5`
- container args unchanged:
  - `--profile-registries=/config/profiles.runtime.yaml`
  - `--federation-registry=/config/federation.registry.json`
- volume mount now:
  - `mountPath: /config`

That means the rollout-triggering mechanism is now present at render time.

I also added a replay helper:

- `scripts/02-check-generated-configmap-rollout-shape.sh`

to make those assertions easy to re-run later without manually scanning the rendered YAML.

### Why this slice is important

This is the first point where the ticket has moved from “design advice” to an actual Kustomize-native implementation.

The important thing is that the change is still local and reviewable:

- no cluster mutation yet
- no Argo behavior assumptions yet
- just a clean rendered-package proof that the generated-name rollout mechanism now exists

## 2026-04-01: Adding The K3s-Side Pattern Documentation

With the first implementation slice rendered successfully, I added the platform-side documentation immediately while the mechanics were still fresh.

The two K3s doc changes are:

- new doc:
  - `docs/kustomize-generated-config-rollout-pattern.md`
- FAQ update:
  - `docs/operator-troubleshooting-faq.md`

### Why this was worth doing now

The production symptom that triggered this ticket is exactly the kind of thing a future operator will hit without understanding why:

- ConfigMap changed
- Argo is `Synced`
- app still serves old config

That is not a generic Kubernetes mystery for this repo anymore. We now know the specific pattern that caused it:

- handwritten inline ConfigMap
- `subPath` file mounts
- no automatic rollout trigger on config changes

So I documented the solution in the K3s repo while the example was still concrete rather than waiting until the end and risking a vague retrospective write-up.

### What the new doc teaches

The new doc explains:

- when to use `configMapGenerator`
- how generated ConfigMap names act like config hashes
- why the Deployment changes when config changes
- why that triggers rollout
- when this pattern is a better fit than hot reload
- how it applies specifically to `wesen-os`

### What the FAQ entry adds

The FAQ now has an operator symptom entry for:

- Argo says `Synced`, but the app still serves old config

with:

- what it means
- why it happens here
- the immediate safe fix
- a link to the new Kustomize pattern doc

That should make the operational lesson discoverable even for someone who never reads the longer tutorial first.

## 2026-04-01: Opening The K3s Refactor PR

With the first implementation slice rendered cleanly and the K3s-side docs tightened, I opened the review PR for the package refactor:

- `wesen/2026-03-27--hetzner-k3s#20`

The point of opening the PR at this stage, instead of waiting until every possible live validation is done, is that the code change itself is already reviewable and bounded:

- generated config inputs exist as real files
- the handwritten inline ConfigMap is gone
- the Deployment no longer relies on `subPath`
- the Kustomize render proves the generated-name rollout trigger exists

So the branch is now in the right state for normal GitOps review:

- implementation visible in one place
- operator-facing docs next to the implementation
- validation commands included in the PR description

This also means the ticket now has a concrete external reference for future discussion rather than only local commits.

## 2026-04-01: Finishing The Pattern-Level Documentation

After opening the PR, I closed the remaining documentation tasks in the K3s doc itself instead of leaving them only in the ticket.

I extended:

- `docs/kustomize-generated-config-rollout-pattern.md`

with two pieces that were still missing:

1. a decision guide for choosing between:
   - generated config with automatic rollout
   - true hot reload without `subPath`
   - manual restart / manual revision bump
2. a reusable checklist for applying this pattern to future Kustomize packages

That matters because “use generated config” is only helpful if operators and future implementers also know when **not** to use it.

The document now reads as a proper platform pattern page instead of only a `wesen-os` postmortem:

- it teaches the default choice
- it explains the alternatives
- and it gives a concrete checklist for repeating the pattern safely

At this point, the remaining work is no longer design or local render mechanics. The next step is the live validation slice after merge:

- Argo sync state
- rollout behavior
- live API value
- in-pod config file contents

## 2026-04-01: Preparing The Live Validation Pass

Before any post-merge cluster verification happens, I added a dedicated replay helper:

- `scripts/03-check-live-wesen-os-config-rollout.sh`

This script is intentionally narrow. It does not try to mutate the cluster or decide policy. It only reads the exact signals we care about for this refactor:

1. Argo application sync/health/operation phase
2. Deployment rollout status
3. the mounted in-pod `/config/federation.registry.json`
4. the live public `/api/os/federation-registry` response

That is the right preparation step because the hardest part of these rollout investigations is often not the cluster behavior itself but the lack of a disciplined, repeatable check sequence.

Now the ticket has:

- a local render checker
- a live cluster checker
- a design guide
- platform docs
- and an open K3s PR

So the remaining gap is genuinely the live merge/rollout proof, not missing instrumentation.

## 2026-04-01: Live Validation After Merge

After `wesen/2026-03-27--hetzner-k3s#20` was merged, I ran the replay helper:

- `scripts/03-check-live-wesen-os-config-rollout.sh`

The result was the exact healthy state this refactor was meant to create.

### Observed live state

Argo application status:

- `Synced`
- `Healthy`
- operation phase `Succeeded`

Deployment status:

- `deployment "wesen-os" successfully rolled out`

In-pod file:

- `/config/federation.registry.json`
  contained:
  - `sha-8bee502`

Public API:

- `https://wesen-os.yolo.scapegoat.dev/api/os/federation-registry`
  also returned:
  - `sha-8bee502`

### Why this matters

This is the operational proof that the old failure mode is gone for this rollout path.

Previously, the system could reach a bad state like:

- ConfigMap desired state updated
- Argo reconciled it
- public API still served stale config
- manual rollout restart required

Now, after the refactor:

- the Deployment rolled successfully
- the pod mounted the expected config
- the public endpoint served the same value
- no manual `kubectl rollout restart` was needed

### What is still worth proving later

There is one narrower proof still left if we want to close every box rigorously:

- make a pure config-only follow-up change under:
  - `gitops/kustomize/wesen-os/config/`
- verify that the generated ConfigMap identity changes again
- verify that the Deployment rolls again without any non-config manifest change

The current validation is already strong enough to show the production problem is fixed for this rollout, but that follow-up would isolate the “config-only” mechanism even more cleanly.

## 2026-04-01: Ticket Closure Decision

After the live rollout proof, I made an explicit closure decision for this ticket instead of leaving one narrow test unchecked indefinitely.

The only remaining possible follow-up was:

- make a pure config-only change under:
  - `gitops/kustomize/wesen-os/config/`
- prove once more that the generated ConfigMap identity changes
- prove once more that the Deployment rolls automatically

That is a useful future regression test, but it is not needed to establish that the production bug has been fixed.

The reason is simple:

- the package refactor is merged
- the live application rolled cleanly
- the in-pod config and public API agree
- no manual restart was needed

So the ticket can reasonably close now with the following interpretation:

- the stale-config production issue is fixed
- the Kustomize pattern is documented
- the operator replay path exists
- any later pure config-only proof can be treated as an optional follow-up, not a blocker
