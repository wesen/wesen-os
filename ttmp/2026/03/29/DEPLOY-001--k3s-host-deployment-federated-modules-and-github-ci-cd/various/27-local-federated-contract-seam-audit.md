# Local Federated Contract Seam Audit

## Inventory imports inside launcher
apps/os-launcher/src/__tests__/launcherHost.test.tsx:172:    expect(contractsSource).toContain("@go-go-golems/inventory/host");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:173:    expect(moduleSource).not.toContain("@go-go-golems/inventory/");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:174:    expect(storeSource).not.toContain("@go-go-golems/inventory/");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:175:    expect(docsSource).not.toContain("@go-go-golems/inventory/");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:176:    expect(moduleSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/__tests__/launcherHost.test.tsx:177:    expect(storeSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/__tests__/launcherHost.test.tsx:178:    expect(docsSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/app/localFederatedAppContracts.ts:2:import { inventoryHostContract } from '@go-go-golems/inventory/host';
apps/os-launcher/src/app/runtimeDebugModule.test.tsx:8:vi.mock('@go-go-golems/inventory/host', () => ({
apps/os-launcher/src/app/registerAppsBrowserDocs.test.ts:3:import { INVENTORY_VM_PACK_METADATA } from '@go-go-golems/inventory';
apps/os-launcher/src/__tests__/launcherHost.test.tsx:172:    expect(contractsSource).toContain("@go-go-golems/inventory/host");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:173:    expect(moduleSource).not.toContain("@go-go-golems/inventory/");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:174:    expect(storeSource).not.toContain("@go-go-golems/inventory/");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:175:    expect(docsSource).not.toContain("@go-go-golems/inventory/");
apps/os-launcher/src/__tests__/launcherHost.test.tsx:176:    expect(moduleSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/__tests__/launcherHost.test.tsx:177:    expect(storeSource).not.toContain('@go-go-golems/inventory/src/');
apps/os-launcher/src/__tests__/launcherHost.test.tsx:178:    expect(docsSource).not.toContain('@go-go-golems/inventory/src/');

## Local seam source
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
