# FEDERATION-RELEASE-001

- ticket: `FEDERATION-RELEASE-001`
- title: `Generalize remote publish and GitOps handoff beyond inventory`

## Purpose

Track the work needed to turn the original inventory-specific remote publish flow into a reusable pattern for additional federated apps.

## Status

As of `2026-04-01`:

- the shared source-repo release path is proven by:
  - `go-go-app-inventory`
  - `go-go-app-sqlite`
- sqlite dry-run and live hosted publishes both succeeded on `main`
- sqlite opened the expected GitOps PR:
  - `wesen/2026-03-27--hetzner-k3s#23`
- the remaining work is downstream stabilization:
  - merge and verify the sqlite GitOps PR / rollout
  - merge or otherwise land `go-go-golems/infra-tooling#3`
  - retarget sqlite away from the temporary helper branch ref

## Documents

- [analysis/01-generalized-remote-release-template-analysis.md](./analysis/01-generalized-remote-release-template-analysis.md)
- [design/02-generalized-federated-remote-release-guide.md](./design/02-generalized-federated-remote-release-guide.md)
- [design/03-standard-secret-bootstrap-for-federated-remotes.md](./design/03-standard-secret-bootstrap-for-federated-remotes.md)
- [design/04-infra-tooling-consumption-failure-analysis-and-onboarding-guide.md](./design/04-infra-tooling-consumption-failure-analysis-and-onboarding-guide.md)
- [design/05-shared-federation-gitops-pr-helper.md](./design/05-shared-federation-gitops-pr-helper.md)
- [tasks.md](./tasks.md)
- [diary.md](./diary.md)
