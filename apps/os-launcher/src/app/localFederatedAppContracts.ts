import type { RuntimeBundleDefinition } from '@go-go-golems/os-core';
import { inventoryHostContract } from '@go-go-golems/inventory/host';
import type { FederatedAppHostContract } from '@go-go-golems/os-shell';
import type { Reducer } from '@reduxjs/toolkit';

export const inventoryLocalContract = inventoryHostContract;

export const localFederatedAppContracts = [inventoryLocalContract] as const satisfies readonly FederatedAppHostContract[];

export interface LocalFederatedDocsMount {
  owner: string;
  metadata: typeof inventoryLocalContract.docsMetadata;
}

export function listLocalFederatedLauncherModules() {
  return localFederatedAppContracts.map((contract) => contract.launcherModule);
}

export function collectLocalFederatedSharedReducers(): Record<string, Reducer> {
  return Object.assign({}, ...localFederatedAppContracts.map((contract) => contract.sharedReducers ?? {}));
}

export function listLocalFederatedDocsMounts(): LocalFederatedDocsMount[] {
  return localFederatedAppContracts.flatMap((contract) =>
    contract.docsMetadata ? [{ owner: contract.remoteId, metadata: contract.docsMetadata }] : [],
  );
}

export function listLocalFederatedRuntimeBundles(): RuntimeBundleDefinition[] {
  return localFederatedAppContracts.flatMap((contract) => [...(contract.runtimeBundles ?? [])]);
}
