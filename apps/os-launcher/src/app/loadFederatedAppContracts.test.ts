import { describe, expect, it } from 'vitest';
import {
  type FederatedFetchLike,
  loadFederatedAppContracts,
} from './loadFederatedAppContracts';

describe('loadFederatedAppContracts', () => {
  it('loads enabled local-package contracts from the registry', async () => {
    const contracts = await loadFederatedAppContracts({
      version: 1,
      remotes: [
        {
          remoteId: 'inventory',
          mode: 'local-package',
          enabled: true,
          contractExport: '@go-go-golems/inventory/host',
        },
      ],
    });

    expect(contracts).toHaveLength(1);
    expect(contracts[0]?.remoteId).toBe('inventory');
    expect(contracts[0]?.launcherModule.manifest.id).toBe('inventory');
  });

  it('loads remote-manifest contracts through a manifest fetch and dynamic import', async () => {
    const manifestUrl = new URL('./fixtures/inventory.mf-manifest.json', import.meta.url).toString();
    const manifest = {
      version: 1,
      remoteId: 'inventory',
      contract: {
        entry: './remoteInventoryContract.mjs',
        exportName: 'inventoryRemoteContract',
      },
    };
    const fetcher: FederatedFetchLike = async (input) => {
      if (input !== manifestUrl) {
        throw new Error(`Unexpected fetch target: ${input}`);
      }

      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify(manifest);
        },
        async json() {
          return manifest;
        },
      };
    };

    const contracts = await loadFederatedAppContracts(
      {
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
    );

    expect(contracts).toHaveLength(1);
    expect(contracts[0]?.remoteId).toBe('inventory');
    expect(contracts[0]?.launcherModule.manifest.name).toBe('Inventory');
    expect(contracts[0]?.runtimeBundles?.[0]?.id).toBe('inventory');
  });

  it('fails when a remote-manifest contract exports the wrong remote id', async () => {
    const manifestUrl = new URL('./fixtures/inventory-invalid.mf-manifest.json', import.meta.url).toString();
    const manifest = {
      version: 1,
      remoteId: 'inventory',
      contract: {
        entry: './remoteInventoryContract.mjs',
        exportName: 'default',
      },
    };
    const fetcher: FederatedFetchLike = async () => ({
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify(manifest);
      },
      async json() {
        return manifest;
      },
    });

    await expect(
      loadFederatedAppContracts(
        {
          version: 1,
          remotes: [
            {
              remoteId: 'other-remote',
              mode: 'remote-manifest',
              enabled: true,
              manifestUrl,
            },
          ],
        },
        fetcher,
      ),
    ).rejects.toThrow(/expected remoteId "other-remote"/);
  });
});
