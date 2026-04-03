import {
  clearRegisteredRuntimeDebugStacks,
  HYPERCARD_RUNTIME_DEBUG_APP_ID,
} from '@go-go-golems/os-scripting';
import { formatAppKey } from '@go-go-golems/os-shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@go-go-golems/inventory/host', () => ({
  inventoryHostContract: {
    runtimeBundles: [
      {
        id: 'inventory',
        title: 'Shop Inventory',
        homeSurface: 'home',
        surfaces: {
          home: {
            id: 'home',
            title: 'Home',
            icon: '📦',
            type: 'surface',
          },
        },
      },
    ],
  },
}));

describe('runtimeDebugLauncherModule', () => {
  beforeEach(() => {
    vi.resetModules();
    clearRegisteredRuntimeDebugStacks();
  });

  it('builds the shared Stacks & Cards launcher window', async () => {
    const { runtimeDebugLauncherModule } = await import('./runtimeDebugModule');
    const payload = runtimeDebugLauncherModule.buildLaunchWindow(
      {
        dispatch: () => undefined,
        getState: () => ({}),
        openWindow: () => undefined,
        closeWindow: () => undefined,
        resolveApiBase: (appId) => `/api/apps/${appId}`,
        resolveWsBase: (appId) => `/api/apps/${appId}/ws`,
      },
      'icon',
    );

    expect(payload.content.kind).toBe('app');
    expect(payload.content.appKey).toBe(formatAppKey(HYPERCARD_RUNTIME_DEBUG_APP_ID, 'stacks'));
    expect(payload.title).toBe('Stacks & Cards');
  });

  it('registers inventory and os-launcher stacks on import and renders the shared window', async () => {
    const { runtimeDebugLauncherModule } = await import('./runtimeDebugModule');

    const rendered = runtimeDebugLauncherModule.renderWindow({
      appId: HYPERCARD_RUNTIME_DEBUG_APP_ID,
      appKey: formatAppKey(HYPERCARD_RUNTIME_DEBUG_APP_ID, 'stacks'),
      instanceId: 'stacks',
      windowId: 'window:hypercard-runtime-debug:stacks',
      ctx: {
        dispatch: () => undefined,
        getState: () => ({}),
        moduleId: HYPERCARD_RUNTIME_DEBUG_APP_ID,
      },
    });

    expect(rendered).toBeTruthy();
    expect((rendered as { props: { ownerAppId: string } }).props.ownerAppId).toBe(HYPERCARD_RUNTIME_DEBUG_APP_ID);
    expect((rendered as { props: { instanceId: string } }).props.instanceId).toBe('stacks');
    expect((rendered as { props: { bundles: Array<{ id: string }> } }).props.bundles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'inventory' }),
        expect.objectContaining({ id: 'os-launcher' }),
      ]),
    );
  });
});
