import type { RuntimeBundleDefinition } from '@go-go-golems/os-core';
import type { LaunchableAppModule, LaunchReason } from '@go-go-golems/os-shell';
import {
  buildRuntimeDebugWindowPayload,
  HYPERCARD_RUNTIME_DEBUG_APP_ID,
  registerRuntimeDebugStacks,
  RuntimeDebugAppWindow,
} from '@go-go-golems/os-scripting';
import type { ReactNode } from 'react';
import { STACK } from '../domain/stack';
import { listRuntimeFederatedRuntimeBundles } from './localFederatedAppContracts';

const RUNTIME_DEBUG_STACKS: RuntimeBundleDefinition[] = [...listRuntimeFederatedRuntimeBundles(), STACK];

registerRuntimeDebugStacks(RUNTIME_DEBUG_STACKS);

function buildLaunchWindow(_reason: LaunchReason) {
  return buildRuntimeDebugWindowPayload({
    appId: HYPERCARD_RUNTIME_DEBUG_APP_ID,
  });
}

export const runtimeDebugLauncherModule: LaunchableAppModule = {
  manifest: {
    id: HYPERCARD_RUNTIME_DEBUG_APP_ID,
    name: 'Stacks & Cards',
    icon: '🔧',
    launch: { mode: 'window' },
    desktop: {
      order: 89,
    },
  },
  buildLaunchWindow: (_ctx, reason) => buildLaunchWindow(reason),
  renderWindow: ({ instanceId }): ReactNode => (
    <RuntimeDebugAppWindow
      ownerAppId={HYPERCARD_RUNTIME_DEBUG_APP_ID}
      instanceId={instanceId}
      bundles={RUNTIME_DEBUG_STACKS}
    />
  ),
};
