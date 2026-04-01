# SQLITE-FED-001

SQLite federated remote release handoff.

## Purpose

This ticket is a fresh handoff package for migrating `go-go-app-sqlite` onto the reusable federated remote release path that was first proven with `go-go-app-inventory`.

The main point of this ticket is not to continue coding blindly. It is to give a new engineer enough context to understand:

- what the federated release system is,
- which repositories participate,
- what inventory already proved,
- what partial sqlite work already exists locally,
- what changed recently in the K3s target layout,
- and what exact implementation order should be followed next.

## Status

Current status: `active`

As of `2026-04-01T20:27:00-04:00`:

- Phase 0 is complete and the audit output is saved in the ticket workspace.
- Phase 2 is complete locally:
  - `npm run build:federation -w apps/sqlite` passes
  - `dist-federation/mf-manifest.json` has the expected sqlite host-contract shape
  - `dist-federation/sqlite-host-contract.js` exports `sqliteHostContract`
- Phase 3 is complete locally:
  - `go-go-app-sqlite` now has `deploy/federation-gitops-targets.json`
- Phase 4 is complete locally:
  - `go-go-app-sqlite` now has a thin `publish-federation-remote` workflow that consumes `infra-tooling`
- Local dry-run validation against the real K3s checkout now succeeds and produces the expected `sqlite` entry diff for `federation.registry.json`.
- The participating feature branches are now pushed and reviewable on GitHub:
  - `infra-tooling` PR: `go-go-golems/infra-tooling#3`
  - `go-go-app-sqlite` PRs: `#4` and `#5` are both merged
- SQLite repository variables are now configured on GitHub:
  - `GO_GO_OS_PLATFORM_VERSION=0.1.0-canary.5`
  - `SQLITE_FEDERATION_PUBLIC_BASE_URL=https://scapegoat-federation-assets.fsn1.your-objectstorage.com`
- SQLite repository secrets are now configured on GitHub:
  - `HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID`
  - `HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY`
  - `HETZNER_OBJECT_STORAGE_BUCKET`
  - `HETZNER_OBJECT_STORAGE_ENDPOINT`
  - `HETZNER_OBJECT_STORAGE_REGION`
  - `GITOPS_PR_TOKEN`
  - `K3S_REPO_READ_TOKEN`
- The sqlite workflow branch now includes a follow-up review fix:
  - `2cf8bca` passes `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` into the publish step so non-dry-run object-storage uploads can authenticate
- Hosted workflow testing is now successful on merged `main`:
  - dry-run succeeded: `23866303115`
  - live publish succeeded: `23866354328`
  - both runs built `apps/sqlite/dist-federation`, published or dry-ran the manifest path, and exercised the shared `infra-tooling` helper workflow
- The shared helper is now merged on `infra-tooling` `main`:
  - merge commit: `dc99431`
  - merged PR: `go-go-golems/infra-tooling#3`
- The live publish opened the expected GitOps PR:
  - `wesen/2026-03-27--hetzner-k3s#23`
  - branch: `automation/federation-sqlite-wesen-os-sqlite-prod-sha-f3b655d`
  - manifest URL: `https://scapegoat-federation-assets.fsn1.your-objectstorage.com/remotes/sqlite/versions/sha-f3b655d/mf-manifest.json`
- The sqlite helper-retarget PR is now merged:
  - merge commit: `aa137d3`
  - merged PR: `go-go-golems/go-go-app-sqlite#6`
- The GitOps PR is now merged:
  - merge commit: `e8391b4`
  - merged PR: `wesen/2026-03-27--hetzner-k3s#23`
- Argo / cluster-side rollout is confirmed:
  - `kubectl get applications -n argocd` shows `wesen-os` `Synced` and `Healthy`
  - the live `wesen-os` configmap contains the enabled `sqlite` manifest URL from `sha-f3b655d`
  - `kubectl rollout status deployment/wesen-os -n wesen-os` succeeded
- Host-side runtime verification surfaced a real frontend regression after rollout:
  - browser bootstrap reaches both `inventory` and `sqlite` host-contract URLs successfully
  - launcher bootstrap then fails with `Duplicate app reducer key "app_sqlite"`
- Root cause is now identified and fixed locally:
  - `wesen-os` still statically imported `sqliteLauncherModule` while bootstrap also loaded the federated sqlite launcher module
  - `go-go-app-sqlite` also re-exported launcher-private `app_sqlite` state through `sharedReducers`
  - sqlite follow-up commit: `bf6f9a3` `federation: keep sqlite launcher state private`
- Remaining work:
  - commit and push the `wesen-os` host-side composition fix
  - publish the updated sqlite remote artifact
  - deploy the updated `wesen-os` host build
  - verify browser runtime behavior after both updates land
  - record sqlite as fully closed only after the live launcher boots cleanly with the federated sqlite remote enabled

## Documents

- [analysis/01-current-state-and-goals.md](analysis/01-current-state-and-goals.md)
- [design/01-sqlite-federated-release-handoff-guide.md](design/01-sqlite-federated-release-handoff-guide.md)
- [sources/reference-links.md](sources/reference-links.md)
- [tasks.md](tasks.md)
- [diary.md](diary.md)
- [logs/2026-04-01-audit.txt](logs/2026-04-01-audit.txt)

## Scripts

- [scripts/01-audit-sqlite-federation-handoff-state.sh](scripts/01-audit-sqlite-federation-handoff-state.sh)
