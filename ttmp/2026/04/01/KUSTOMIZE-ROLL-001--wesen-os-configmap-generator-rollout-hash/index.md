# KUSTOMIZE-ROLL-001

- ticket: `KUSTOMIZE-ROLL-001`
- title: `Refactor wesen-os Kustomize config handling to trigger rollouts on config changes`

## Purpose

Capture the analysis, design, and implementation plan for converting the current `wesen-os` Kustomize package from:

- inline handwritten `ConfigMap`
- `subPath` file mounts
- manual rollout restarts after config changes

to a Kustomize-native generated-config pattern that naturally rolls the Deployment when config changes.

This ticket is also meant to teach Kustomize to a new intern in the context of a real package that already exists in production.

## Documents

- [analysis/01-problem-and-goals.md](./analysis/01-problem-and-goals.md)
- [design/01-kustomize-configmap-generator-guide.md](./design/01-kustomize-configmap-generator-guide.md)
- [sources/reference-links.md](./sources/reference-links.md)
- [tasks.md](./tasks.md)
- [diary.md](./diary.md)

## Scripts

- [scripts/01-audit-current-wesen-os-kustomize.sh](./scripts/01-audit-current-wesen-os-kustomize.sh)
