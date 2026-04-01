# Tasks

## Phase 0. Freeze The Current State

- [x] Run the audit script and save the output for the next engineer.
- [x] Confirm the current `infra-tooling` helper branch/head.
- [x] Confirm the current sqlite worktree changes still match this handoff ticket.

## Phase 1. Publish Or Review The Shared Helper Layer

- [ ] Confirm `infra-tooling` branch `task/federation-publish-helper` is pushed.
- [x] Confirm the shared helper branch includes direct JSON target-file support.
- [x] Confirm the example target metadata already includes `wesen-os-sqlite-prod`.

## Phase 2. Validate SQLite Artifact Generation

- [ ] Run `npm run build:federation -w apps/sqlite`.
- [ ] Inspect `dist-federation/mf-manifest.json`.
- [ ] Inspect `dist-federation/sqlite-host-contract.js`.
- [ ] Compare the output shape against inventory.
- [ ] Fix any sqlite-specific build/runtime issues before touching workflow automation.

## Phase 3. Add Repo-Local Release Metadata

- [ ] Add `deploy/federation-gitops-targets.json` to `go-go-app-sqlite`.
- [ ] Target the K3s JSON registry file:
  - `gitops/kustomize/wesen-os/config/federation.registry.json`
- [ ] Use `remote_id: "sqlite"`.

## Phase 4. Add Source-Repo Workflow

- [ ] Add a thin `publish-federation-remote` workflow to sqlite.
- [ ] Checkout `infra-tooling`.
- [ ] Checkout private K3s repo for dry-run using `K3S_REPO_READ_TOKEN`.
- [ ] Use shared helper scripts from `infra-tooling`.
- [ ] Keep sqlite-specific behavior limited to build command and target metadata.

## Phase 5. Validate The Release Path

- [ ] Run the workflow in dry-run mode.
- [ ] Verify the K3s diff against the real `federation.registry.json` file.
- [ ] Run the workflow in real PR mode using `GITOPS_PR_TOKEN`.
- [ ] Verify a GitOps PR is opened against the K3s repo.

## Phase 6. Close The Reuse Proof

- [ ] Merge the sqlite source-repo PR.
- [ ] Merge the resulting GitOps PR.
- [ ] Verify Argo rollout and host-side registry behavior.
- [ ] Record sqlite as the second app that proves the reusable federated release model.

## Notes

- Saved audit artifact:
  - `logs/2026-04-01-audit.txt`
- Current shared-helper blocker:
  - `infra-tooling` branch `task/federation-publish-helper` exists locally at `c943970` but does not currently track an upstream branch.
