import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  type FederatedFetchLike,
  loadFederatedAppContracts,
} from './loadFederatedAppContracts';

const manifestFile = process.env.INVENTORY_FEDERATION_MANIFEST_FILE;

describe.skipIf(!manifestFile)('loadFederatedAppContracts real smoke', () => {
  it('loads the built inventory federation artifact from a real manifest file', async () => {
    const resolvedManifestPath = path.resolve(manifestFile!);
    const manifestUrl = pathToFileURL(resolvedManifestPath).toString();

    const fetcher: FederatedFetchLike = async (input) => {
      if (input !== manifestUrl) {
        throw new Error(`Unexpected real-smoke fetch target: ${input}`);
      }

      const jsonText = await readFile(resolvedManifestPath, 'utf8');
      return {
        ok: true,
        status: 200,
        async text() {
          return jsonText;
        },
        async json() {
          return JSON.parse(jsonText) as unknown;
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
    const contract = contracts[0];
    expect(contract?.remoteId).toBe('inventory');
    expect(contract?.launcherModule.manifest.id).toBe('inventory');
    expect(contract?.runtimeBundles?.[0]?.id).toBe('inventory');

    const launchPayload = contract?.launcherModule.buildLaunchWindow(
      {
        dispatch: () => undefined,
        getState: () => ({}),
        openWindow: () => undefined,
        closeWindow: () => undefined,
        resolveApiBase: (appId) => `/api/apps/${appId}`,
        resolveWsBase: (appId) => `/api/apps/${appId}/ws`,
      },
      'icon',
    );

    expect(launchPayload?.content.kind).toBe('app');
    expect(launchPayload?.title).toContain('Inventory');
  });
});
