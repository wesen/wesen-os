import { formatAppKey } from '@hypercard/desktop-os';
import { describe, expect, it } from 'vitest';

describe('hypercardReplLauncherModule', async () => {
  const { hypercardReplLauncherModule } = await import('./hypercardReplModule');

  it('builds the console launcher window payload', () => {
    const payload = hypercardReplLauncherModule.buildLaunchWindow(
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
    expect(payload.content.appKey).toBe(formatAppKey('hypercard-repl', 'console'));
    expect(payload.title).toBe('HyperCard REPL');
  });

  it('renders the console window for the default instance', () => {
    const rendered = hypercardReplLauncherModule.renderWindow({
      appId: 'hypercard-repl',
      appKey: formatAppKey('hypercard-repl', 'console'),
      instanceId: 'console',
      windowId: 'window:hypercard-repl:console',
      ctx: {
        dispatch: () => undefined,
        getState: () => ({}),
        moduleId: 'hypercard-repl',
      },
    });

    expect(rendered).toBeTruthy();
    expect((rendered as { type?: { name?: string } }).type?.name).toBe('HypercardReplConsoleWindow');
  });

  it('routes encoded surface instances to the surface window component', () => {
    const instanceId = 'surface~demo-1~inventory~lowStock~Low%20Stock';
    const rendered = hypercardReplLauncherModule.renderWindow({
      appId: 'hypercard-repl',
      appKey: formatAppKey('hypercard-repl', instanceId),
      instanceId,
      windowId: 'window:hypercard-repl:surface~demo-1~inventory~lowStock~Low%20Stock',
      ctx: {
        dispatch: () => undefined,
        getState: () => ({}),
        moduleId: 'hypercard-repl',
      },
    });

    expect(rendered).toBeTruthy();
    expect((rendered as { type?: { name?: string } }).type?.name).toBe('HypercardReplSurfaceWindow');
    expect((rendered as { props?: { payload?: { sessionId?: string; stackId?: string; surfaceId?: string; title?: string } } }).props?.payload)
      .toEqual({
        kind: 'runtime-surface',
        sessionId: 'demo-1',
        stackId: 'inventory',
        surfaceId: 'lowStock',
        title: 'Low Stock',
      });
  });
});
