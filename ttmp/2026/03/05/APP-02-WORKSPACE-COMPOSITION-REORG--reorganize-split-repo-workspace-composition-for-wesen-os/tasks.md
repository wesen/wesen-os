# Tasks

## Complete

- [x] Create ticket workspace and base documents
- [x] Gather current-state evidence across `wesen-os`, `go-go-os-frontend`, `go-go-os-backend`, and app packages
- [x] Add ticket-local research scripts and capture scan logs
- [x] Write the long-form architecture, design, and migration guide
- [x] Write the chronological investigation diary
- [x] Relate key files and update changelog
- [x] Validate the ticket with `docmgr doctor`
- [x] Upload the document bundle to reMarkable

## Follow-up Implementation Work

- [ ] Standardize `./launcher` exports for all launcher-capable app packages
- [ ] Introduce a public `LauncherAppIntegration` contract
- [ ] Generate launcher module and reducer registries from a workspace manifest
- [ ] Introduce a dedicated top-level `pnpm-workspace.yaml` for cross-repo frontend composition
- [ ] Replace manual alias maps with package-based resolution
- [ ] Replace static optional app imports with manifest-driven inclusion
- [ ] Add a workspace doctor command and update startup docs
