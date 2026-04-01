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

- [ ] Decide the new on-disk config layout for generated inputs:
  - `profiles.runtime.yaml`
  - `federation.registry.json`
- [ ] Replace the handwritten `ConfigMap` resource with `configMapGenerator`.
- [ ] Decide whether to:
  - keep file paths identical under `/config`
  - mount the whole directory instead of `subPath`
- [ ] Document how Kustomize’s generated-name hashing triggers rollout.

## Phase 2: Implement The Kustomize Package Change

- [ ] Add config source files under the `wesen-os` Kustomize package.
- [ ] Update `kustomization.yaml` to use `configMapGenerator`.
- [ ] Remove or retire the handwritten `configmap.yaml`.
- [ ] Update the Deployment to consume the generated ConfigMap safely.
- [ ] Validate:
  - `kubectl kustomize gitops/kustomize/wesen-os`
  - diff against current rendered output

## Phase 3: Prove Argo / Rollout Behavior

- [ ] Merge the GitOps PR for the refactor.
- [ ] Confirm Argo sync stays clean.
- [ ] Confirm a config-only change changes the rendered ConfigMap identity.
- [ ] Confirm the Deployment rolls automatically without manual `kubectl rollout restart`.
- [ ] Confirm `/api/os/federation-registry` reflects the new config after rollout.

## Phase 4: Document The Reusable Pattern

- [ ] Add a follow-up note in the K3s repo docs explaining the pattern.
- [ ] Document when to prefer:
  - Kustomize-generated config rollout
  - hot reload without `subPath`
  - explicit manual restart annotations
- [ ] Record a reusable checklist for future Kustomize packages in this platform.
