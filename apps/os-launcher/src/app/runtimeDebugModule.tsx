import type { RuntimeBundleDefinition } from '@go-go-golems/os-core';
import type { LaunchableAppModule, LaunchReason } from '@go-go-golems/os-shell';
import {
  buildRuntimeDebugWindowPayload,
  HYPERCARD_RUNTIME_DEBUG_APP_ID,
  registerRuntimeDebugStacks,
  RuntimeDebugAppWindow,
} from '@go-go-golems/os-scripting';
import { inventoryHostContract } from '@go-go-golems/inventory/host';
import type { ReactNode } from 'react';
import { STACK } from '../domain/stack';

const RUNTIME_DEBUG_STACKS: RuntimeBundleDefinition[] = [inventoryHostContract.runtimeBundles[0], STACK];

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
