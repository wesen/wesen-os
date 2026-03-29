# Changelog

## 2026-03-05

- Created ticket `APP-02-WORKSPACE-COMPOSITION-REORG` for the clean split-repo workspace reorganization plan.
- Added a long-form design document explaining the current launcher/backend composition, the main coupling failures, and the proposed target architecture.
- Added a strict investigation diary with the exact research trail and failure outputs that motivated the design.
- Added ticket-local research scripts and captured workspace/coupling logs.
- Validated the ticket successfully with `docmgr doctor`.
- Uploaded the document bundle to reMarkable at `/ai/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG`.

## 2026-03-05

Added the APP-02 workspace-composition research package, including a long-form migration guide, investigation diary, and ticket-local topology/coupling scans.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-frontend/packages/desktop-os/src/contracts/launchableAppModule.ts — Runtime app module contract referenced in the design
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/05/APP-02-WORKSPACE-COMPOSITION-REORG--reorganize-split-repo-workspace-composition-for-wesen-os/scripts/run_launcher_coupling_scan.sh — Ticket-local scan script used to gather evidence
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/vite.config.ts — Alias-driven launcher coupling analyzed in the ticket
