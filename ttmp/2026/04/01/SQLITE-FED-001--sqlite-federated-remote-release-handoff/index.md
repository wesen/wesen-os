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

As of `2026-04-01T14:08:11-04:00`:

- Phase 0 audit capture is complete and saved in the ticket workspace.
- The sqlite worktree still matches the handoff description:
  - `apps/sqlite/package.json` is modified
  - `apps/sqlite/src/host.ts` is untracked
  - `apps/sqlite/vite.federation.config.ts` is untracked
  - `apps/sqlite/src/federation-shared/` is untracked
- `infra-tooling` branch `task/federation-publish-helper` is still local-only with no upstream tracking branch.
- `infra-tooling` already contains direct JSON target-file support and the shared example target metadata already includes `wesen-os-sqlite-prod`.

## Documents

- [analysis/01-current-state-and-goals.md](analysis/01-current-state-and-goals.md)
- [design/01-sqlite-federated-release-handoff-guide.md](design/01-sqlite-federated-release-handoff-guide.md)
- [sources/reference-links.md](sources/reference-links.md)
- [tasks.md](tasks.md)
- [diary.md](diary.md)
- [logs/2026-04-01-audit.txt](logs/2026-04-01-audit.txt)

## Scripts

- [scripts/01-audit-sqlite-federation-handoff-state.sh](scripts/01-audit-sqlite-federation-handoff-state.sh)
