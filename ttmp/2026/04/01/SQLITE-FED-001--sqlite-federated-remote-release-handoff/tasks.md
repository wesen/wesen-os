# Tasks

## Phase 0. Freeze The Current State

- [x] Run the audit script and save the output for the next engineer.
- [x] Confirm the current `infra-tooling` helper branch/head.
- [x] Confirm the current sqlite worktree changes still match this handoff ticket.

## Phase 1. Publish Or Review The Shared Helper Layer

- [x] Confirm `infra-tooling` branch `task/federation-publish-helper` is pushed.
- [x] Confirm the shared helper branch includes direct JSON target-file support.
- [x] Confirm the example target metadata already includes `wesen-os-sqlite-prod`.

## Phase 2. Validate SQLite Artifact Generation

- [x] Run `npm run build:federation -w apps/sqlite`.
- [x] Inspect `dist-federation/mf-manifest.json`.
- [x] Inspect `dist-federation/sqlite-host-contract.js`.
- [x] Compare the output shape against inventory.
- [x] Fix any sqlite-specific build/runtime issues before touching workflow automation.

## Phase 3. Add Repo-Local Release Metadata

- [x] Add `deploy/federation-gitops-targets.json` to `go-go-app-sqlite`.
- [x] Target the K3s JSON registry file:
  - `gitops/kustomize/wesen-os/config/federation.registry.json`
- [x] Use `remote_id: "sqlite"`.

## Phase 4. Add Source-Repo Workflow

- [x] Add a thin `publish-federation-remote` workflow to sqlite.
- [x] Checkout `infra-tooling`.
- [x] Checkout private K3s repo for dry-run using `K3S_REPO_READ_TOKEN`.
- [x] Use shared helper scripts from `infra-tooling`.
- [x] Keep sqlite-specific behavior limited to build command and target metadata.

## Phase 5. Validate The Release Path

- [x] Run the workflow in dry-run mode.
- [x] Verify the K3s diff against the real `federation.registry.json` file.
- [x] Run the workflow in real PR mode using `GITOPS_PR_TOKEN`.
- [x] Verify a GitOps PR is opened against the K3s repo.

## Phase 6. Close The Reuse Proof

- [ ] Merge the sqlite workflow-retarget PR (`go-go-app-sqlite#6`).
- [x] Merge the sqlite source-repo PR.
- [ ] Merge the resulting GitOps PR.
- [ ] Verify Argo rollout and host-side registry behavior.
- [ ] Record sqlite as the second app that proves the reusable federated release model.

## Notes

- Saved audit artifact:
  - `logs/2026-04-01-audit.txt`
- Shared-helper status:
  - `go-go-golems/infra-tooling#3` is merged on `main` as `dc99431`
- Local validation commits:
  - `infra-tooling`: `5af1142` `federation: add missing remotes to registry patcher`
  - `go-go-app-sqlite`: `325fdb9` `federation: add sqlite remote artifact build`
  - `go-go-app-sqlite`: `252a69c` `deploy: wire sqlite federation publish workflow`
  - `go-go-app-sqlite`: `2cf8bca` `deploy: pass storage creds to sqlite publish step`
- Open PRs:
  - `go-go-golems/go-go-app-sqlite#6`
  - `wesen/2026-03-27--hetzner-k3s#23`
- Merged source PRs:
  - `go-go-golems/go-go-app-sqlite#4`
  - `go-go-golems/go-go-app-sqlite#5`
- Hosted workflow proof:
  - dry-run success: `23866303115`
  - live publish success: `23866354328`
  - branch dry-run against `infra-tooling@main`: `23867838529`
- Current follow-through blocker:
  - sqlite still needs the tiny follow-up PR `#6` merged so `main` stops pinning `infra-tooling` to the old feature branch ref.
