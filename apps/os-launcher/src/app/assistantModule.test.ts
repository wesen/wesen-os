import { formatAppKey, parseAppKey, type LauncherHostContext } from '@go-go-golems/os-shell';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('assistantLauncherModule', async () => {
  const { assistantLauncherModule, buildDebugWindowPayload } = await import('./assistantModule');
  const { ChatEventViewerWindow, ChatTimelineDebugWindow } = await import('../chat/ChatDebugWindows');

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
        openSurfaceWindow: () => undefined,
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

  it('builds debug window payloads routed back into the assistant app', () => {
    const events = buildDebugWindowPayload('event-viewer', 'conv-123');
    const timeline = buildDebugWindowPayload('timeline-debug', 'conv-123');

    expect(events.title).toBe('Event Viewer (conv-123)');
    expect(timeline.title).toBe('Timeline Debug (conv-123)');
    expect(parseAppKey(String(events.content.appKey))).toMatchObject({
      appId: 'assistant',
      instanceId: 'event-viewer~conv-123',
    });
    expect(parseAppKey(String(timeline.content.appKey))).toMatchObject({
      appId: 'assistant',
      instanceId: 'timeline-debug~conv-123',
    });
    expect(events.dedupeKey).toBe('assistant:event-viewer~conv-123');
    expect(timeline.dedupeKey).toBe('assistant:timeline-debug~conv-123');
  });

  it('routes debug instance ids to debug windows', () => {
    const eventRendered = assistantLauncherModule.renderWindow({
      appId: 'assistant',
      appKey: formatAppKey('assistant', 'event-viewer~conv-123'),
      instanceId: 'event-viewer~conv-123',
      windowId: 'window:assistant:event',
      ctx: createHostContext(),
    }) as ReactElement<{ convId: string }>;
    const timelineRendered = assistantLauncherModule.renderWindow({
      appId: 'assistant',
      appKey: formatAppKey('assistant', 'timeline-debug~conv-123'),
      instanceId: 'timeline-debug~conv-123',
      windowId: 'window:assistant:timeline',
      ctx: createHostContext(),
    }) as ReactElement<{ convId: string; apiBasePrefix: string }>;

    expect(eventRendered.type).toBe(ChatEventViewerWindow);
    expect(eventRendered.props.convId).toBe('conv-123');
    expect(timelineRendered.type).toBe(ChatTimelineDebugWindow);
    expect(timelineRendered.props.convId).toBe('conv-123');
    expect(timelineRendered.props.apiBasePrefix).toBe('/api/apps/assistant');
  });

  it('renders a chat window for chat instance ids', () => {
    const rendered = assistantLauncherModule.renderWindow({
      appId: 'assistant',
      appKey: formatAppKey('assistant', 'generic~conv-xyz~~'),
      instanceId: 'generic~conv-xyz~~',
      windowId: 'window:assistant:chat',
      ctx: createHostContext(),
    }) as ReactElement;

    expect(rendered).toBeTruthy();
    expect(typeof rendered.type).toBe('function');
    expect(rendered.type).not.toBe(ChatEventViewerWindow);
    expect(rendered.type).not.toBe(ChatTimelineDebugWindow);
  });
});
