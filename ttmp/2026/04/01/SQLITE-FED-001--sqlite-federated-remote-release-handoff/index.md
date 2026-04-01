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

As of `2026-04-01T14:29:09-04:00`:

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
- A shared-helper gap was found and fixed locally in `infra-tooling`:
  - the registry patcher now inserts a missing remote entry instead of failing when `sqlite` is absent
- Remaining blocker:
  - `infra-tooling` branch `task/federation-publish-helper` is still local-only and not pushed to `origin`, so the sqlite workflow cannot run on GitHub yet.

## Documents

- [analysis/01-current-state-and-goals.md](analysis/01-current-state-and-goals.md)
- [design/01-sqlite-federated-release-handoff-guide.md](design/01-sqlite-federated-release-handoff-guide.md)
- [sources/reference-links.md](sources/reference-links.md)
- [tasks.md](tasks.md)
- [diary.md](diary.md)
- [logs/2026-04-01-audit.txt](logs/2026-04-01-audit.txt)

## Scripts

- [scripts/01-audit-sqlite-federation-handoff-state.sh](scripts/01-audit-sqlite-federation-handoff-state.sh)
