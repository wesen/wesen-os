# Diary

## 2026-03-29: Ticket Creation And Architecture Synthesis

This ticket was created because the package-publishing work in `NPM-PUBLISH-001` answered only the first third of the deployment story. We now have proof that the shared platform packages can be published and consumed from GitHub Packages, but the user’s desired end-state is larger:

- run `wesen-os` on K3s,
- load selected modules at runtime through Module Federation,
- drive the whole pipeline from GitHub CI/CD.

### Context I reviewed

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
- `ttmp/2026/03/28/NPM-PUBLISH-001--rename-public-package-publishing-and-federation-migration/*`

### Core conclusion

The deployment target must be split into three artifact planes:

1. npm packages
   - shared build-time platform libraries such as `@go-go-golems/os-core`
2. container images
   - deployable host image for `wesen-os`
3. static federation assets
   - browser-loadable manifests and chunks for app remotes

Trying to collapse those into one plane would create the wrong system. GitHub Packages is right for npm artifacts, but wrong for runtime browser chunks. K3s is right for running services, but not for hosting each frontend remote as if it were a backend microservice. Federation wants static versioned assets and a registry/manifest model.

### Tricky point discovered immediately

`docmgr` in this workspace is configured against a sibling repository root, not this repo’s local `ttmp/` tree. I used it only long enough to confirm that mismatch, removed the misplaced ticket workspace, and then created the ticket structure directly under this repo:

- `ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd`

That keeps the deliverables next to the rest of the `wesen-os` ticket work.

### Output of this step

- `index.md`
- `tasks.md`
- `design/01-k3s-host-federation-and-github-cicd-guide.md`
- `sources/reference-links.md`
- `changelog.md`

### What should happen next

- Review the deployment model and confirm the first federated remote.
- Add concrete implementation tasks into the active engineering backlog.
- Then start actual code work in this order:
  - host Docker image
  - GHCR workflow
  - K3s manifests
  - first federated remote
  - remote asset hosting and runtime registry
