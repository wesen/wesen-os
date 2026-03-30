import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as ReactRedux from 'react-redux';

export interface FederationSharedRuntime {
  react: typeof React;
  reactJsxRuntime: typeof ReactJsxRuntime;
  reactRedux: typeof ReactRedux;
}

const FEDERATION_SHARED_RUNTIME_KEY = '__WESEN_FEDERATION_SHARED__';

type FederationSharedRuntimeGlobal = typeof globalThis & {
  [FEDERATION_SHARED_RUNTIME_KEY]?: FederationSharedRuntime;
};

export function installFederationSharedRuntime(): FederationSharedRuntime {
  const runtime: FederationSharedRuntime = {
    react: React,
    reactJsxRuntime: ReactJsxRuntime,
    reactRedux: ReactRedux,
  };
  (globalThis as FederationSharedRuntimeGlobal)[FEDERATION_SHARED_RUNTIME_KEY] = runtime;
  return runtime;
}

export function readFederationSharedRuntime(): FederationSharedRuntime | undefined {
  return (globalThis as FederationSharedRuntimeGlobal)[FEDERATION_SHARED_RUNTIME_KEY];
}
