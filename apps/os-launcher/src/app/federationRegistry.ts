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

function parseFederatedRemoteRegistry(raw: string): FederatedRemoteRegistry {
  const parsed = JSON.parse(raw) as unknown;
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

export function resolveFederatedRemoteRegistry(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): FederatedRemoteRegistry {
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

  return {
    ...DEFAULT_LOCAL_FEDERATION_REGISTRY,
    remotes: DEFAULT_LOCAL_FEDERATION_REGISTRY.remotes.map((entry) => ({
      ...entry,
      enabled: entry.remoteId === 'inventory' ? inventoryEnabled : entry.enabled,
    })),
  };
}
