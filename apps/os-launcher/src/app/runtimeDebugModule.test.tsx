import {
  clearRegisteredRuntimeDebugStacks,
  HYPERCARD_RUNTIME_DEBUG_APP_ID,
} from '@hypercard/hypercard-runtime';
import { formatAppKey } from '@hypercard/desktop-os';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    expect((rendered as { props: { stacks: Array<{ id: string }> } }).props.stacks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'inventory' }),
        expect.objectContaining({ id: 'os-launcher' }),
      ]),
    );
  });
});
