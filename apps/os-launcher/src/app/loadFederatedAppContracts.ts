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

function resolveRemoteUrl(url: string): string {
  try {
    return new URL(url).toString();
  } catch (error) {
    if (typeof window !== 'undefined' && window.location?.href) {
      return new URL(url, window.location.href).toString();
    }
    if (typeof document !== 'undefined' && document.baseURI) {
      return new URL(url, document.baseURI).toString();
    }
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`Unable to resolve remote URL "${url}" without a browser base URL.${detail}`);
  }
}

function resolveManifestEntryUrl(manifestUrl: string, entry: string): string {
  return new URL(entry, resolveRemoteUrl(manifestUrl)).toString();
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
