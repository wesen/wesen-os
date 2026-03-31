import { describe, expect, it } from 'vitest';
import {
  loadFederatedRemoteRegistry,
  resolveFederatedRemoteRegistry,
  type FederatedRegistryFetchLike,
} from './federationRegistry';

describe('federationRegistry', () => {
  it('prefers explicit JSON registry env over runtime endpoint lookup', async () => {
    const registry = await loadFederatedRemoteRegistry({
      env: {
        VITE_FEDERATION_REGISTRY_JSON: JSON.stringify({
          version: 1,
          remotes: [
            {
              remoteId: 'inventory',
              mode: 'remote-manifest',
              enabled: true,
              manifestUrl: 'https://assets.example.invalid/remotes/inventory/mf-manifest.json',
            },
          ],
        }),
      },
      fetcher: async () => {
        throw new Error('fetcher should not run');
      },
    });

    expect(registry.remotes[0]?.manifestUrl).toBe('https://assets.example.invalid/remotes/inventory/mf-manifest.json');
  });

  it('loads the registry from the host endpoint when no explicit env override exists', async () => {
    const fetcher: FederatedRegistryFetchLike = async (input) => {
      expect(input).toBe('http://launcher.test/api/os/federation-registry');
      return {
        ok: true,
        status: 200,
        async text() {
          return '';
        },
        async json() {
          return {
            version: 1,
            remotes: [
              {
                remoteId: 'inventory',
                mode: 'remote-manifest',
                enabled: true,
                manifestUrl: 'https://assets.example.invalid/remotes/inventory/versions/sha-123/mf-manifest.json',
              },
            ],
          };
        },
      };
    };

    const registry = await loadFederatedRemoteRegistry({
      env: {},
      fetcher,
      registryUrl: 'http://launcher.test/api/os/federation-registry',
    });

    expect(registry.remotes[0]?.mode).toBe('remote-manifest');
    expect(registry.remotes[0]?.manifestUrl).toContain('/versions/sha-123/');
  });

  it('falls back to the default local registry when the host endpoint is absent', async () => {
    const fetcher: FederatedRegistryFetchLike = async () => ({
      ok: false,
      status: 404,
      async text() {
        return 'not found';
      },
      async json() {
        return {};
      },
    });

    const registry = await loadFederatedRemoteRegistry({
      env: {
        VITE_INVENTORY_FEDERATION_ENABLED: 'false',
      },
      fetcher,
      registryUrl: 'http://launcher.test/api/os/federation-registry',
    });

    expect(registry).toEqual(resolveFederatedRemoteRegistry({
      VITE_INVENTORY_FEDERATION_ENABLED: 'false',
    }));
  });
});
