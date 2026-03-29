# DEPLOY-001: K3s Host Deployment, Federated Modules, And GitHub CI/CD

## Purpose

This ticket translates the current package-publishing work into a full deployment architecture:

- `wesen-os` becomes a deployable host image,
- selected app modules become independently deployed federation remotes,
- GitHub Actions becomes the delivery plane for npm packages, container images, remote assets, and cluster rollouts.

## Audience

This ticket is written for:

- the current implementation team,
- a new intern joining after `NPM-PUBLISH-001`,
- future reviewers who need a concrete target architecture instead of scattered chat context.

## Documents

- `design/01-k3s-host-federation-and-github-cicd-guide.md`
  - full analysis, design, architecture, implementation guide, intern onboarding, pseudocode, diagrams, and references
- `design/02-wesen-os-into-hetzner-k3s-gitops-guide.md`
  - concrete migration guide for moving canonical `wesen-os` Kubernetes ownership into the Hetzner GitOps repo
- `tasks.md`
  - detailed phased task board
- `diary.md`
  - narrative log of what was analyzed and why
- `sources/reference-links.md`
  - official documentation links used for the design

## Current Code Anchors

The guide is grounded in the current repo state, especially these files:

- `package.json`
- `.gitmodules`
- `pnpm-workspace.yaml`
- `apps/os-launcher/package.json`
- `apps/os-launcher/vite.config.ts`
- `apps/os-launcher/tsconfig.published.json`
- `.github/workflows/verify-launcher-canary-consumption.yml`
- `workspace-links/go-go-os-frontend/.github/workflows/publish-github-package-canary.yml`
- `workspace-links/go-go-os-frontend/scripts/packages/publish-github-package-set.mjs`
- `workspace-links/go-go-os-frontend/scripts/packages/package-sets.mjs`
- `workspace-links/go-go-app-inventory/.github/workflows/verify-platform-canary-consumption.yml`

## Intended Outcome

At the end of this program, the system should look like this:

- GitHub Packages provides versioned `@go-go-golems/os-*` npm packages,
- GitHub Container Registry provides a versioned `wesen-os` host image,
- Hetzner Object Storage provides versioned remote manifests and chunks,
- K3s runs the host and any backend services,
- `wesen-os` loads selected apps through Module Federation at runtime.
