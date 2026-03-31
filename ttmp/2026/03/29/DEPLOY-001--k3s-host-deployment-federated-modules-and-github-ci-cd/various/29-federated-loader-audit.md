# Federated Loader Audit

## Registry model
export type FederatedRemoteMode = 'local-package' | 'remote-manifest';

export interface FederatedRemoteRegistryEntry {
  remoteId: string;
  mode: FederatedRemoteMode;
  enabled: boolean;
  contractExport?: string;
  manifestUrl?: string;
}

export interface FederatedRemoteRegistry {
  version: 1;
  remotes: FederatedRemoteRegistryEntry[];
}

export interface FederatedRemoteManifestContract {
  entry: string;
  exportName?: string;
}

export interface FederatedRemoteManifest {
  version: 1;
  remoteId: string;
  contract: FederatedRemoteManifestContract;
  compatiblePlatformRange?: string;
}

export const DEFAULT_LOCAL_FEDERATION_REGISTRY: FederatedRemoteRegistry = {
  version: 1,
  remotes: [
    {
      remoteId: 'inventory',
      mode: 'local-package',
      enabled: true,
      contractExport: '@go-go-golems/inventory/host',
    },
  ],
};

## Loader implementation
import type { FederatedAppHostContract } from '@go-go-golems/os-shell';
import {
  DEFAULT_LOCAL_FEDERATION_REGISTRY,
  type FederatedRemoteManifest,
  type FederatedRemoteRegistry,
  type FederatedRemoteRegistryEntry,
} from './federationRegistry';
import { listLocalFederatedAppContracts } from './localFederatedAppContracts';

interface FetchLikeResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export type FederatedFetchLike = (input: string, init?: RequestInit) => Promise<FetchLikeResponse>;

function defaultFederatedFetch(input: string, init?: RequestInit) {
  return fetch(input, init);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseFederatedRemoteManifest(raw: unknown, expectedRemoteId: string): FederatedRemoteManifest {
  const manifest = asRecord(raw);
  if (!manifest) {
    throw new Error(`Remote manifest for "${expectedRemoteId}" is not an object.`);
  }

  const version = manifest.version;
  const remoteId = manifest.remoteId;
  const contract = asRecord(manifest.contract);
  const entry = contract?.entry;
  const exportName = contract?.exportName;

  if (version !== 1) {
    throw new Error(`Remote manifest for "${expectedRemoteId}" must declare version 1.`);
  }
  if (typeof remoteId !== 'string' || remoteId !== expectedRemoteId) {
    throw new Error(
      `Remote manifest mismatch: expected remoteId "${expectedRemoteId}", got "${String(remoteId)}".`,
    );
  }
  if (typeof entry !== 'string' || entry.length === 0) {
    throw new Error(`Remote manifest for "${expectedRemoteId}" must declare contract.entry.`);
  }
  if (exportName !== undefined && typeof exportName !== 'string') {
    throw new Error(`Remote manifest for "${expectedRemoteId}" has an invalid contract.exportName.`);
  }

  return {
    version: 1,
    remoteId,
    contract: {
      entry,
      exportName,
    },
    compatiblePlatformRange:
      typeof manifest.compatiblePlatformRange === 'string' ? manifest.compatiblePlatformRange : undefined,
  };
}

function assertFederatedAppHostContract(
  value: unknown,
  expectedRemoteId: string,
): asserts value is FederatedAppHostContract {
  const contract = asRecord(value);
  if (!contract) {
    throw new Error(`Remote "${expectedRemoteId}" did not export an object host contract.`);
  }

  if (contract.remoteId !== expectedRemoteId) {
    throw new Error(
      `Remote contract mismatch: expected remoteId "${expectedRemoteId}", got "${String(contract.remoteId)}".`,
    );
  }

  const launcherModule = asRecord(contract.launcherModule);
  const manifest = launcherModule ? asRecord(launcherModule.manifest) : null;
  if (!launcherModule || !manifest || typeof manifest.id !== 'string') {
    throw new Error(`Remote "${expectedRemoteId}" exported an invalid launcherModule.`);
  }
}

function resolveManifestEntryUrl(manifestUrl: string, entry: string): string {
  return new URL(entry, manifestUrl).toString();
}

async function fetchRemoteManifest(
  entry: FederatedRemoteRegistryEntry,
  fetcher: FederatedFetchLike,
): Promise<FederatedRemoteManifest> {
  if (!entry.manifestUrl) {
    throw new Error(`Remote "${entry.remoteId}" is missing manifestUrl.`);
  }

  const response = await fetcher(entry.manifestUrl);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Remote manifest fetch failed for "${entry.remoteId}": ${response.status} ${message}`.trim(),
    );
  }

  return parseFederatedRemoteManifest(await response.json(), entry.remoteId);
}

async function loadRemoteManifestContract(
  entry: FederatedRemoteRegistryEntry,
  fetcher: FederatedFetchLike,
): Promise<FederatedAppHostContract> {
  const manifest = await fetchRemoteManifest(entry, fetcher);
  const entryUrl = resolveManifestEntryUrl(entry.manifestUrl!, manifest.contract.entry);
  const loadedModule = await import(/* @vite-ignore */ entryUrl);
  const exportName = manifest.contract.exportName ?? 'default';
  const contract = loadedModule[exportName];

  assertFederatedAppHostContract(contract, entry.remoteId);
  return contract;
}

function loadLocalPackageContracts(entry: FederatedRemoteRegistryEntry): FederatedAppHostContract[] {
  return listLocalFederatedAppContracts({
    version: 1,
    remotes: [entry],
  });
}

export async function loadFederatedAppContracts(
  registry: FederatedRemoteRegistry = DEFAULT_LOCAL_FEDERATION_REGISTRY,
  fetcher: FederatedFetchLike = defaultFederatedFetch,
): Promise<FederatedAppHostContract[]> {
  const loaded: FederatedAppHostContract[] = [];

  for (const entry of registry.remotes) {
    if (!entry.enabled) {
      continue;
    }

    if (entry.mode === 'local-package') {
      loaded.push(...loadLocalPackageContracts(entry));
      continue;
    }

    if (entry.mode === 'remote-manifest') {
      loaded.push(await loadRemoteManifestContract(entry, fetcher));
      continue;
    }

    throw new Error(`Unsupported remote mode "${String(entry.mode)}" for "${entry.remoteId}".`);
  }

  return loaded;
}

## Loader tests
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
    const fetcher: FederatedFetchLike = async (input) => {
      if (input !== manifestUrl) {
        throw new Error(`Unexpected fetch target: ${input}`);
      }

      return {
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
            exportName: 'default',
          },
        };
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
