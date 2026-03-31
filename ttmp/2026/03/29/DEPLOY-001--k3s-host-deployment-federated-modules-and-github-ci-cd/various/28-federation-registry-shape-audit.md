# Federation Registry Shape Audit

## Registry source
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

## Local contract resolver
import type { RuntimeBundleDefinition } from '@go-go-golems/os-core';
import { inventoryHostContract } from '@go-go-golems/inventory/host';
import type { FederatedAppHostContract } from '@go-go-golems/os-shell';
import type { Reducer } from '@reduxjs/toolkit';
import { DEFAULT_LOCAL_FEDERATION_REGISTRY, type FederatedRemoteRegistry } from './federationRegistry';

export const inventoryLocalContract = inventoryHostContract;
const LOCAL_CONTRACTS_BY_REMOTE_ID = {
  inventory: inventoryLocalContract,
} as const;

export interface LocalFederatedDocsMount {
  owner: string;
  metadata: typeof inventoryLocalContract.docsMetadata;
}

function assertLocalPackageMode(mode: string, remoteId: string): asserts mode is 'local-package' {
  if (mode !== 'local-package') {
    throw new Error(`Remote "${remoteId}" is configured as "${mode}", but only local-package mode is supported here.`);
  }
}

export function listLocalFederatedAppContracts(
  registry: FederatedRemoteRegistry = DEFAULT_LOCAL_FEDERATION_REGISTRY,
) {
  return registry.remotes.flatMap((entry) => {
    if (!entry.enabled) {
      return [];
    }

    assertLocalPackageMode(entry.mode, entry.remoteId);

    const contract = LOCAL_CONTRACTS_BY_REMOTE_ID[entry.remoteId as keyof typeof LOCAL_CONTRACTS_BY_REMOTE_ID];
    if (!contract) {
      throw new Error(`No local federated contract is registered for remote "${entry.remoteId}".`);
    }

    return [contract];
  });
}

export function listLocalFederatedLauncherModules() {
  return listLocalFederatedAppContracts().map((contract) => contract.launcherModule);
}

export function collectLocalFederatedSharedReducers(): Record<string, Reducer> {
  return Object.assign({}, ...listLocalFederatedAppContracts().map((contract) => contract.sharedReducers ?? {}));
}

export function listLocalFederatedDocsMounts(): LocalFederatedDocsMount[] {
  return listLocalFederatedAppContracts().flatMap((contract) =>
    contract.docsMetadata ? [{ owner: contract.remoteId, metadata: contract.docsMetadata }] : [],
  );
}

export function listLocalFederatedRuntimeBundles(): RuntimeBundleDefinition[] {
  return listLocalFederatedAppContracts().flatMap((contract) => [...(contract.runtimeBundles ?? [])]);
}
