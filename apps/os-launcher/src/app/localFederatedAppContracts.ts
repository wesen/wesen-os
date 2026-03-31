import type { RuntimeBundleDefinition } from '@go-go-golems/os-core';
import { inventoryHostContract } from '@go-go-golems/inventory/host';
import type { FederatedAppHostContract } from '@go-go-golems/os-shell';
import type { Reducer } from '@reduxjs/toolkit';
import { DEFAULT_LOCAL_FEDERATION_REGISTRY, type FederatedRemoteRegistry } from './federationRegistry';

export const inventoryLocalContract = inventoryHostContract;
const LOCAL_CONTRACTS_BY_REMOTE_ID = {
  inventory: inventoryLocalContract,
} as const;
let runtimeFederatedAppContracts: FederatedAppHostContract[] = [];

export interface LocalFederatedDocsMount {
  owner: string;
  metadata: NonNullable<FederatedAppHostContract['docsMetadata']>;
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

function ensureRuntimeFederatedContractsInitialized(): FederatedAppHostContract[] {
  if (runtimeFederatedAppContracts.length === 0) {
    runtimeFederatedAppContracts = [...listLocalFederatedAppContracts()];
  }
  return runtimeFederatedAppContracts;
}

export function setRuntimeFederatedAppContracts(contracts: readonly FederatedAppHostContract[]): void {
  runtimeFederatedAppContracts = [...contracts];
}

export function resetRuntimeFederatedAppContracts(): void {
  runtimeFederatedAppContracts = [...listLocalFederatedAppContracts()];
}

export function listRuntimeFederatedAppContracts(): readonly FederatedAppHostContract[] {
  return ensureRuntimeFederatedContractsInitialized();
}

export function getRuntimeFederatedAppContract(remoteId: string): FederatedAppHostContract | undefined {
  return listRuntimeFederatedAppContracts().find((contract) => contract.remoteId === remoteId);
}

export function listRuntimeFederatedLauncherModules() {
  return listRuntimeFederatedAppContracts().map((contract) => contract.launcherModule);
}

export function collectRuntimeFederatedSharedReducers(): Record<string, Reducer> {
  return Object.assign({}, ...listRuntimeFederatedAppContracts().map((contract) => contract.sharedReducers ?? {}));
}

export function listRuntimeFederatedDocsMounts(): LocalFederatedDocsMount[] {
  return listRuntimeFederatedAppContracts().flatMap((contract) =>
    contract.docsMetadata ? [{ owner: contract.remoteId, metadata: contract.docsMetadata }] : [],
  );
}

export function listRuntimeFederatedRuntimeBundles(): RuntimeBundleDefinition[] {
  return listRuntimeFederatedAppContracts().flatMap((contract) => [...(contract.runtimeBundles ?? [])]);
}
