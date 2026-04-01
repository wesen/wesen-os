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

## Documents

- [analysis/01-current-state-and-goals.md](analysis/01-current-state-and-goals.md)
- [design/01-sqlite-federated-release-handoff-guide.md](design/01-sqlite-federated-release-handoff-guide.md)
- [sources/reference-links.md](sources/reference-links.md)
- [tasks.md](tasks.md)
- [diary.md](diary.md)

## Scripts

- [scripts/01-audit-sqlite-federation-handoff-state.sh](scripts/01-audit-sqlite-federation-handoff-state.sh)
