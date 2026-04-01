# Tasks

## Phase 0: Freeze The Current State

- [x] Capture the current `wesen-os` Kustomize package shape:
  - `kustomization.yaml`
  - `configmap.yaml`
  - `deployment.yaml`
- [x] Document the observed production problem:
  - ConfigMap changed
  - live API stayed stale
  - manual rollout restart was needed
- [x] Write a Kustomize-focused teaching guide grounded in this exact deployment.

## Phase 1: Design The Refactor

- [x] Decide the new on-disk config layout for generated inputs:
  - `profiles.runtime.yaml`
  - `federation.registry.json`
- [x] Decide the exact Kustomize shape:
  - `configMapGenerator`
  - generated logical name `wesen-os-config`
  - generated annotations needed for Argo sync-wave compatibility
- [x] Decide the container mount strategy:
  - preserve `/config/profiles.runtime.yaml`
  - preserve `/config/federation.registry.json`
  - mount the whole `/config` directory instead of `subPath`
- [x] Document how Kustomize’s generated-name hashing triggers rollout in this specific package.

## Phase 2: Implement The Kustomize Package Change

- [x] Create a feature branch in the K3s repo for the refactor.
- [x] Add config source files under the `wesen-os` Kustomize package:
  - `config/profiles.runtime.yaml`
  - `config/federation.registry.json`
- [x] Update `kustomization.yaml` to use `configMapGenerator`.
- [x] Preserve the ConfigMap sync-wave annotation in the generated output.
- [x] Remove or retire the handwritten `configmap.yaml`.
- [x] Update the Deployment to consume the generated ConfigMap safely:
  - whole-directory mount at `/config`
  - no `subPath`
- [x] Validate the rendered output shape:
  - generated ConfigMap name has a hash suffix
  - Deployment volume reference is rewritten to the generated name
  - container args still point at `/config/profiles.runtime.yaml`
  - container args still point at `/config/federation.registry.json`
- [x] Validate:
  - `kubectl kustomize gitops/kustomize/wesen-os`
  - diff against current rendered output
- [x] Commit the K3s package refactor as its own bounded slice.

## Phase 3: Prove Argo / Rollout Behavior

- [ ] Merge the GitOps PR for the refactor.
- [ ] Confirm Argo sync stays clean.
- [ ] Confirm a config-only change changes the rendered ConfigMap identity.
- [ ] Confirm the Deployment rolls automatically without manual `kubectl rollout restart`.
- [ ] Confirm `/api/os/federation-registry` reflects the new config after rollout.

## Phase 4: Document The Reusable Pattern

- [x] Add a follow-up note in the K3s repo docs explaining the pattern.
- [x] Document when to prefer:
  - Kustomize-generated config rollout
  - hot reload without `subPath`
  - explicit manual restart annotations
- [x] Record a reusable checklist for future Kustomize packages in this platform.

## Phase 5: Prepare The Live Validation Slice

- [x] Add a replay helper for post-merge live validation:
  - Argo app health
  - rollout status
  - live `/api/os/federation-registry`
  - in-pod `/config/federation.registry.json`
- [x] Document the expected before/after observations for the live validation pass.
