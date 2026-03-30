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

interface FetchLikeResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export type FederatedRegistryFetchLike = (input: string, init?: RequestInit) => Promise<FetchLikeResponse>;

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

function asBooleanEnv(value: string | boolean | undefined): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return undefined;
}

function parseFederatedRemoteRegistryValue(parsed: unknown): FederatedRemoteRegistry {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Federation registry JSON must be an object.');
  }

  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) {
    throw new Error('Federation registry JSON must declare version 1.');
  }
  if (!Array.isArray(record.remotes)) {
    throw new Error('Federation registry JSON must declare remotes[].');
  }

  return {
    version: 1,
    remotes: record.remotes.map((remote, index) => {
      if (typeof remote !== 'object' || remote === null || Array.isArray(remote)) {
        throw new Error(`Federation registry remotes[${index}] must be an object.`);
      }
      const entry = remote as Record<string, unknown>;
      if (typeof entry.remoteId !== 'string' || typeof entry.mode !== 'string' || typeof entry.enabled !== 'boolean') {
        throw new Error(`Federation registry remotes[${index}] is missing required fields.`);
      }
      return {
        remoteId: entry.remoteId,
        mode: entry.mode as FederatedRemoteMode,
        enabled: entry.enabled,
        contractExport: typeof entry.contractExport === 'string' ? entry.contractExport : undefined,
        manifestUrl: typeof entry.manifestUrl === 'string' ? entry.manifestUrl : undefined,
      };
    }),
  };
}

function parseFederatedRemoteRegistry(raw: string): FederatedRemoteRegistry {
  return parseFederatedRemoteRegistryValue(JSON.parse(raw) as unknown);
}

function buildDefaultFederatedRemoteRegistry(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): FederatedRemoteRegistry {
  const inventoryEnabled = asBooleanEnv(env.VITE_INVENTORY_FEDERATION_ENABLED) ?? true;
  return {
    ...DEFAULT_LOCAL_FEDERATION_REGISTRY,
    remotes: DEFAULT_LOCAL_FEDERATION_REGISTRY.remotes.map((entry) => ({
      ...entry,
      enabled: entry.remoteId === 'inventory' ? inventoryEnabled : entry.enabled,
    })),
  };
}

function resolveExplicitFederatedRemoteRegistry(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): FederatedRemoteRegistry | undefined {
  const jsonRegistry = env.VITE_FEDERATION_REGISTRY_JSON;
  if (typeof jsonRegistry === 'string' && jsonRegistry.trim().length > 0) {
    return parseFederatedRemoteRegistry(jsonRegistry);
  }

  const remoteManifestUrl = typeof env.VITE_INVENTORY_REMOTE_MANIFEST_URL === 'string'
    ? env.VITE_INVENTORY_REMOTE_MANIFEST_URL.trim()
    : '';
  const inventoryEnabled = asBooleanEnv(env.VITE_INVENTORY_FEDERATION_ENABLED) ?? true;

  if (remoteManifestUrl.length > 0) {
    return {
      version: 1,
      remotes: [
        {
          remoteId: 'inventory',
          mode: 'remote-manifest',
          enabled: inventoryEnabled,
          manifestUrl: remoteManifestUrl,
        },
      ],
    };
  }

  return undefined;
}

function defaultFederatedRegistryFetch(input: string, init?: RequestInit) {
  return fetch(input, init);
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
    throw new Error(`Unable to resolve federation registry URL "${url}" without a browser base URL.${detail}`);
  }
}

export function resolveFederatedRemoteRegistry(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): FederatedRemoteRegistry {
  return resolveExplicitFederatedRemoteRegistry(env) ?? buildDefaultFederatedRemoteRegistry(env);
}

export async function loadFederatedRemoteRegistry(options: {
  env?: Record<string, string | boolean | undefined>;
  fetcher?: FederatedRegistryFetchLike;
  registryUrl?: string;
} = {}): Promise<FederatedRemoteRegistry> {
  const env = options.env ?? import.meta.env;
  const explicitRegistry = resolveExplicitFederatedRemoteRegistry(env);
  if (explicitRegistry) {
    return explicitRegistry;
  }

  const fetcher = options.fetcher ?? defaultFederatedRegistryFetch;
  const registryUrl = resolveRemoteUrl(options.registryUrl ?? '/api/os/federation-registry');

  try {
    const response = await fetcher(registryUrl);
    if (response.status === 404) {
      return buildDefaultFederatedRemoteRegistry(env);
    }
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Federation registry fetch failed: ${response.status} ${message}`.trim());
    }
    return parseFederatedRemoteRegistryValue(await response.json());
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Federation registry fetch failed:')) {
      throw error;
    }
    return buildDefaultFederatedRemoteRegistry(env);
  }
}
