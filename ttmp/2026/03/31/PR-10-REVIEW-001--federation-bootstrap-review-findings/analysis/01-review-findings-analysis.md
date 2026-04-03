# Analysis

This ticket exists to address the concrete review findings on:

- `wesen/wesen-os#10`
- PR URL: `https://github.com/wesen/wesen-os/pull/10`

It is intentionally narrow. The broader federation rollout is already tracked in `DEPLOY-001`. This ticket is only about the code-level correctness issues flagged during review of the current host-side federation implementation.

## Findings

### 1. Import-time throw when `inventory` is missing

The review points at:

- [hypercardReplModule.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/hypercardReplModule.tsx)

The current pattern initializes a runtime contract at module-import time and throws immediately if the `inventory` contract is absent.

That is dangerous because the launcher imports module definitions during bootstrap. If the registry disables `inventory`, or if `inventory` is intentionally absent in some environment, the app can fail before rendering anything useful.

The architectural issue is not “missing inventory” by itself. The issue is *where the check happens*. Import-time failure turns a feature-level dependency into a process-wide startup dependency.

Likely areas to inspect:

- [hypercardReplModule.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/hypercardReplModule.tsx)
- [modules.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/modules.tsx)
- [bootstrapLauncherApp.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/bootstrapLauncherApp.ts)
- [localFederatedAppContracts.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/localFederatedAppContracts.ts)

Likely direction:

- move the check from module top-level into runtime registration or feature wiring
- make missing `inventory` disable only the dependent module surface
- keep launcher startup alive

Pseudocode shape:

```ts
const inventory = getRuntimeFederatedAppContract("inventory");

export function maybeRegisterHypercardReplModule(...) {
  if (!inventory) {
    return;
  }

  registerModule(buildModuleFromInventory(inventory));
}
```

### 2. Single remote load failure kills launcher bootstrap

The review points at:

- [loadFederatedAppContracts.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/loadFederatedAppContracts.ts)

The current remote-manifest flow fetches a manifest, imports the contract module, validates it, and bubbles any error all the way up into launcher bootstrap. Since [main.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/main.tsx) now waits on bootstrap before rendering the app, one remote fetch problem can take the host down completely.

That behavior is too strict for a federated system. Network failure, storage outage, bad upload, or temporary manifest mismatch should usually disable the affected remote, not kill the host shell.

Likely areas to inspect:

- [loadFederatedAppContracts.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/loadFederatedAppContracts.ts)
- [bootstrapLauncherApp.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/bootstrapLauncherApp.ts)
- [federationRegistry.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/federationRegistry.ts)
- [main.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/main.tsx)

Likely direction:

- isolate failure per remote
- keep loading other remotes
- optionally fall back to `local-package` when configured
- surface operator diagnostics without fatal bootstrap

Pseudocode shape:

```ts
for (const entry of registry.remotes) {
  try {
    contracts.push(await loadOneRemote(entry));
  } catch (error) {
    reportRemoteFailure(entry, error);

    const fallback = tryLocalFallback(entry);
    if (fallback) {
      contracts.push(fallback);
    }
  }
}
```

## Why This Matters

These two findings are both really about host resilience.

The host shell should remain the stable control plane. Federation remotes are extensions. If a remote disappears, misconfigures, or is intentionally disabled, the shell should degrade feature availability rather than turning remote state into a global startup precondition.

That means:

- no import-time hard dependencies on optional remote contracts
- no bootstrap-wide fatal failure from a single remote fetch/import problem

## Where To Look First

Start here in order:

1. [loadFederatedAppContracts.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/loadFederatedAppContracts.ts)
2. [bootstrapLauncherApp.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/bootstrapLauncherApp.ts)
3. [hypercardReplModule.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/hypercardReplModule.tsx)
4. [modules.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/modules.tsx)
5. [main.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/main.tsx)

## GitHub Review References

Current review comments captured for this ticket:

- `Handle missing inventory contract without import-time throw`
- `Fallback when remote-manifest contract loading fails`

Those came from:

- `gh api repos/wesen/wesen-os/pulls/10/comments --paginate`
