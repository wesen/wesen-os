# Current State And Goals

## Why This Ticket Exists

`go-go-app-inventory` is now the first app that proves the generalized federated release path:

1. build a remote artifact,
2. upload it to object storage,
3. use shared helpers from `infra-tooling`,
4. open a GitOps PR against the private K3s repo,
5. merge the PR,
6. let Argo roll out the host config change,
7. and load the remote from `wesen-os`.

The next real proof is a second app. The natural candidate is `go-go-app-sqlite`.

However, sqlite migration is not starting from zero. There is already partial local work in the sqlite repo, and there was a recent infrastructure change that matters a lot:

- the host federation registry target in the K3s repo is no longer the old handwritten `configmap.yaml`
- it is now the generated JSON file:
  - [federation.registry.json](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/config/federation.registry.json)

That change means any intern resuming the work later needs a clean, explicit handoff so they do not accidentally continue from stale assumptions.

## Immediate Goal

The immediate engineering goal is:

- migrate `go-go-app-sqlite` to the same reusable remote release pattern already proven for inventory

That means sqlite should eventually have:

- a host contract entrypoint
- a `build:federation` artifact shape
- shared React runtime shims for browser-safe host loading
- repo-local target metadata for GitOps updates
- a thin source-repo workflow that consumes `infra-tooling`
- dry-run and real PR-capable release behavior

## Current Repository State

### `infra-tooling`

Path:

- [infra-tooling](/home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling)

Current branch:

- `task/federation-publish-helper`

Current head:

- `c943970` `Generalize federation publish helper and JSON targets`

Important status:

- clean worktree at the time this ticket was created
- contains the next shared-helper improvements needed for sqlite
- includes generic support for `federation-manifest` targets that are direct JSON files, not only YAML-embedded JSON blocks

### `go-go-app-inventory`

Path:

- [go-go-app-inventory](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory)

Current branch:

- `task/inventory-infra-tooling-federation-release`

Current head:

- `f61a6b1` `Target generated federation registry file`

Why this matters:

- inventory is the best concrete reference for sqlite
- inventory already switched its target metadata to the new K3s JSON file path
- sqlite should follow this shape, not the older `configmap.yaml` target shape

### `go-go-app-sqlite`

Path:

- [go-go-app-sqlite](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite)

Current branch:

- `task/sqlite-federation-release-reuse`

Current committed head:

- `6a373b8` `Update sqlite paths for os-* package folders`

Important local uncommitted work already exists:

- modified [apps/sqlite/package.json](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/package.json)
- new [apps/sqlite/src/host.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/host.ts)
- new [apps/sqlite/vite.federation.config.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/vite.federation.config.ts)
- new [apps/sqlite/src/federation-shared](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite/apps/sqlite/src/federation-shared)

This is a useful starting point, but it has not yet been validated. It must be treated as provisional until:

- `npm run build:federation -w apps/sqlite` passes
- the emitted manifest shape is inspected
- the host contract can be loaded by the launcher

## Important Architectural Change

Historically, the host federation registry was updated by patching a JSON blob embedded inside:

- `gitops/kustomize/wesen-os/configmap.yaml`

That is no longer the canonical target.

After `KUSTOMIZE-ROLL-001`, the canonical target is now:

- [gitops/kustomize/wesen-os/config/federation.registry.json](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/config/federation.registry.json)

This matters because:

- any new sqlite target metadata must point there
- any shared helper code must work against direct JSON target files
- any intern reading older ticket history may otherwise update the wrong file

## Success Criteria

SQLite migration should be considered complete only when all of the following are true:

1. `go-go-app-sqlite` builds a real federation artifact locally.
2. The source repo has repo-local `deploy/federation-gitops-targets.json`.
3. The source repo workflow consumes `infra-tooling` instead of repo-local one-off scripts.
4. The workflow supports both dry-run and real PR creation.
5. The shared helper path remains remote-agnostic and does not contain hidden `inventory` assumptions.
6. The resulting GitOps PR updates:
   - [federation.registry.json](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/config/federation.registry.json)
7. The host eventually loads sqlite through the same remote-manifest mechanism.
