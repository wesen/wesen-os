import type { AppRegistry } from '@go-go-golems/os-shell';
import type { Store } from '@reduxjs/toolkit';
import type { ComponentType } from 'react';
import type { FederatedAppHostContract } from '@go-go-golems/os-shell';
import {
  resolveFederatedRemoteRegistry,
  type FederatedRemoteRegistry,
} from './federationRegistry';
import {
  resetRuntimeFederatedAppContracts,
  setRuntimeFederatedAppContracts,
} from './localFederatedAppContracts';
import {
  loadFederatedAppContracts,
  type FederatedFetchLike,
} from './loadFederatedAppContracts';
import { installFederationSharedRuntime } from './federationSharedRuntime';

export interface BootstrappedLauncherApp {
  App: ComponentType;
  store: Store;
  launcherRegistry: AppRegistry;
  registry: FederatedRemoteRegistry;
  federatedContracts: FederatedAppHostContract[];
}

export interface LauncherBootstrapModuleLoaders {
  loadApp(): Promise<{ App: ComponentType }>;
  loadStore(): Promise<{ store: Store }>;
  loadRegistry(): Promise<{ launcherRegistry: AppRegistry }>;
}

const DEFAULT_LAUNCHER_BOOTSTRAP_MODULE_LOADERS: LauncherBootstrapModuleLoaders = {
  loadApp: () => import('../App'),
  loadStore: () => import('./store'),
  loadRegistry: () => import('./registry'),
};

export async function bootstrapLauncherApp(options: {
  registry?: FederatedRemoteRegistry;
  fetcher?: FederatedFetchLike;
  moduleLoaders?: LauncherBootstrapModuleLoaders;
} = {}): Promise<BootstrappedLauncherApp> {
  resetRuntimeFederatedAppContracts();
  installFederationSharedRuntime();
  const registry = options.registry ?? resolveFederatedRemoteRegistry();
  const federatedContracts = await loadFederatedAppContracts(registry, options.fetcher);
  setRuntimeFederatedAppContracts(federatedContracts);
  const moduleLoaders = options.moduleLoaders ?? DEFAULT_LAUNCHER_BOOTSTRAP_MODULE_LOADERS;

  const { store } = await moduleLoaders.loadStore();
  const { launcherRegistry } = await moduleLoaders.loadRegistry();
  const { App } = await moduleLoaders.loadApp();

  return {
    App,
    store,
    launcherRegistry,
    registry,
    federatedContracts,
  };
}
