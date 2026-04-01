# Tasks

## Review Finding 1: Import-Time Inventory Contract Throw

- [ ] Reproduce the `inventory disabled or missing` startup path locally.
- [ ] Confirm the exact import chain from:
  - `apps/os-launcher/src/app/hypercardReplModule.tsx`
  - through launcher bootstrap/module registration
- [ ] Replace the import-time hard throw with a runtime-safe degradation path.
- [ ] Define what feature surface should disappear or degrade when `inventory` is unavailable.
- [ ] Add tests covering:
  - `inventory` disabled in registry
  - `inventory` omitted from registry
  - launcher still boots

## Review Finding 2: Remote Manifest Failure Should Not Kill Bootstrap

- [ ] Reproduce a manifest fetch/import failure against the `remote-manifest` path.
- [ ] Decide the fallback strategy:
  - per-remote disable and continue
  - fallback to local-package contract if available
  - operator-visible warning state
- [ ] Implement the fallback in:
  - `apps/os-launcher/src/app/loadFederatedAppContracts.ts`
  - `apps/os-launcher/src/app/bootstrapLauncherApp.ts`
- [ ] Add tests for:
  - manifest fetch 404
  - invalid JSON
  - import failure
  - bad contract export
  - successful fallback without fatal bootstrap failure

## Follow-Through

- [ ] Update `wesen-os#10` or follow-up PR with the actual fixes.
- [ ] Reply to the review threads with the resolution or follow-up ticket link.
