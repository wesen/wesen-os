import { parseAppKey, type LauncherHostContext } from '@hypercard/desktop-os';
import { describe, expect, it, vi } from 'vitest';
import { assistantLauncherModule } from './assistantModule';

function createHostContext(): LauncherHostContext {
  return {
    dispatch: vi.fn(() => undefined),
    getState: () => ({}),
    openWindow: vi.fn(),
    closeWindow: () => undefined,
    resolveApiBase: (appId: string) => `/api/apps/${appId}`,
    resolveWsBase: (appId: string) => `/api/apps/${appId}/ws`,
  };
}

describe('assistantLauncherModule', () => {
  it('builds a generic assistant window payload', () => {
    const payload = assistantLauncherModule.buildLaunchWindow(createHostContext(), 'icon');
    expect(payload.content.kind).toBe('app');
    expect(String(payload.content.appKey)).toContain('assistant:');
    expect(payload.title).toBe('Assistant');
  });

  it('bootstraps app chat and opens a dedicated assistant window', async () => {
    const hostContext = createHostContext();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        conv_id: 'conv-app-123',
        assistant_app_id: 'assistant',
        base_prefix: '/api/apps/assistant',
        subject_app: {
          app_id: 'sqlite',
          name: 'SQLite',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const contributions = assistantLauncherModule.createContributions?.(hostContext) ?? [];
    const handler = contributions.flatMap((contribution) => contribution.commands ?? [])[0];
    expect(handler).toBeDefined();

    const result = handler?.run(
      'apps-browser.chat-with-app',
      {
        dispatch: hostContext.dispatch,
        getState: hostContext.getState,
        focusedWindowId: null,
        openCardWindow: () => undefined,
        closeWindow: hostContext.closeWindow,
      },
      {
        commandId: 'apps-browser.chat-with-app',
        payload: { appId: 'sqlite', appName: 'SQLite' },
        contextTarget: null,
      },
    );

    expect(result).toBe('handled');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/apps/assistant/api/bootstrap/app-chat',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(hostContext.openWindow).toHaveBeenCalledTimes(1);
    const payload = (hostContext.openWindow as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const parsed = parseAppKey(String(payload.content.appKey));
    expect(parsed.appId).toBe('assistant');
    expect(payload.title).toBe('Chat with SQLite');
  });
});
