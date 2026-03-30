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
