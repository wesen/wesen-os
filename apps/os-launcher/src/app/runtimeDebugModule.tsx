import type { LaunchableAppModule, LaunchReason } from '@hypercard/desktop-os';
import {
  buildRuntimeDebugWindowPayload,
  HYPERCARD_RUNTIME_DEBUG_APP_ID,
  registerRuntimeDebugStacks,
  RuntimeDebugAppWindow,
} from '@hypercard/hypercard-runtime';
import { inventoryStack } from '@hypercard/inventory/launcher';
import type { ReactNode } from 'react';
import { STACK } from '../domain/stack';

registerRuntimeDebugStacks([inventoryStack, STACK]);

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
    />
  ),
};
