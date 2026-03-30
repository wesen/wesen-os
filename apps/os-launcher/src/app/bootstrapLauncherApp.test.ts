import { createAppRegistry } from '@go-go-golems/os-shell';
import { describe, expect, it } from 'vitest';
import type { FederatedFetchLike } from './loadFederatedAppContracts';

describe('bootstrapLauncherApp', () => {
  it('bootstraps the launcher with a manifest-backed inventory remote', async () => {
    const { bootstrapLauncherApp } = await import('./bootstrapLauncherApp');

    const manifestUrl = new URL('./fixtures/inventory.mf-manifest.json', import.meta.url).toString();
    const fetcher: FederatedFetchLike = async () => ({
      ok: true,
      status: 200,
      async text() {
        return '';
      },
      async json() {
        return {
          version: 1,
          remoteId: 'inventory',
          contract: {
            entry: './remoteInventoryContract.mjs',
            exportName: 'inventoryRemoteContract',
          },
        };
      },
    });

    const bootstrapped = await bootstrapLauncherApp({
      registry: {
        version: 1,
        remotes: [
          {
            remoteId: 'inventory',
            mode: 'remote-manifest',
            enabled: true,
            manifestUrl,
          },
        ],
      },
      fetcher,
      moduleLoaders: {
        async loadApp() {
          return {
            App: () => null,
          };
        },
        async loadStore() {
          return {
            store: {
              getState() {
                return {};
              },
            } as never,
          };
        },
        async loadRegistry() {
          const [contract] = await import('./localFederatedAppContracts').then((module) =>
            module.listRuntimeFederatedAppContracts(),
          );
          return {
            launcherRegistry: createAppRegistry([contract.launcherModule]),
          };
        },
      },
    });

    expect(bootstrapped.federatedContracts).toHaveLength(1);
    expect(bootstrapped.launcherRegistry.has('inventory')).toBe(true);
    expect(bootstrapped.launcherRegistry.get('inventory')?.manifest.name).toBe('Inventory');
    expect(typeof bootstrapped.store.getState).toBe('function');
  }, 20_000);
});
