import { formatAppKey, parseAppKey, type LauncherHostContext } from '@go-go-golems/os-shell';
import { openWindow } from '@go-go-golems/os-core/desktop-core';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockDispatch,
  mockChatConversationWindow,
  mockEventViewerWindow,
  mockTimelineDebugWindow,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockChatConversationWindow: vi.fn(
    (props: { headerActions?: ReactNode }) => ({ type: 'chat-window', props }) as unknown as ReactElement,
  ),
  mockEventViewerWindow: vi.fn(
    (props: { conversationId: string }) => ({ type: 'event-viewer', props }) as unknown as ReactElement,
  ),
  mockTimelineDebugWindow: vi.fn(
    (props: { conversationId: string }) => ({ type: 'timeline-debug', props }) as unknown as ReactElement,
  ),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('@go-go-golems/os-chat', async () => {
  const actual = await vi.importActual<typeof import('@go-go-golems/os-chat')>('@go-go-golems/os-chat');
  return {
    ...actual,
    ChatConversationWindow: mockChatConversationWindow,
    EventViewerWindow: mockEventViewerWindow,
    TimelineDebugWindow: mockTimelineDebugWindow,
  };
});

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

function flattenChildren(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) {
    return node.flatMap((child) => flattenChildren(child));
  }
  if (!node || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return [];
  }
  const element = node as ReactElement & { props?: { children?: ReactNode } };
  if (element.type === Symbol.for('react.fragment')) {
    return flattenChildren(element.props?.children);
  }
  return [element];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('assistantLauncherModule', async () => {
  const { assistantLauncherModule } = await import('./assistantModule');

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

  it('renders debug header actions for assistant app chat', () => {
    const rendered = assistantLauncherModule.renderWindow({
      appId: 'assistant',
      appKey: 'assistant:app-chat~conv-123~sqlite~SQLite',
      instanceId: 'app-chat~conv-123~sqlite~SQLite',
      windowId: 'window:assistant:test',
      ctx: createHostContext(),
    }) as ReactElement;

    const chatWindowElement = (rendered.type as (props: Record<string, unknown>) => ReactElement)(rendered.props);
    expect(chatWindowElement.type).toBe(mockChatConversationWindow);
    const headerActions = flattenChildren(chatWindowElement.props.headerActions);
    expect(headerActions).toHaveLength(2);

    const eventsButton = headerActions[0];
    const timelineButton = headerActions[1];
    expect(eventsButton.props.children).toBe('🧭 Events');
    expect(timelineButton.props.children).toBe('🧱 Timeline');

    eventsButton.props.onClick();
    timelineButton.props.onClick();

    expect(mockDispatch).toHaveBeenCalledTimes(2);
    const firstAction = mockDispatch.mock.calls[0][0];
    const secondAction = mockDispatch.mock.calls[1][0];
    expect(firstAction.type).toBe(openWindow({} as never).type);
    expect(secondAction.type).toBe(openWindow({} as never).type);

    const firstPayload = firstAction.payload;
    const secondPayload = secondAction.payload;
    expect(firstPayload.title).toBe('Event Viewer (conv-123)');
    expect(secondPayload.title).toBe('Timeline Debug (conv-123)');
    expect(parseAppKey(String(firstPayload.content.appKey))).toMatchObject({
      appId: 'assistant',
      instanceId: 'event-viewer~conv-123',
    });
    expect(parseAppKey(String(secondPayload.content.appKey))).toMatchObject({
      appId: 'assistant',
      instanceId: 'timeline-debug~conv-123',
    });
  });

  it('routes debug instance ids to debug windows', () => {
    const eventRendered = assistantLauncherModule.renderWindow({
      appId: 'assistant',
      appKey: formatAppKey('assistant', 'event-viewer~conv-123'),
      instanceId: 'event-viewer~conv-123',
      windowId: 'window:assistant:event',
      ctx: createHostContext(),
    });
    const timelineRendered = assistantLauncherModule.renderWindow({
      appId: 'assistant',
      appKey: formatAppKey('assistant', 'timeline-debug~conv-123'),
      instanceId: 'timeline-debug~conv-123',
      windowId: 'window:assistant:timeline',
      ctx: createHostContext(),
    });

    expect(eventRendered).toEqual(expect.objectContaining({
      type: mockEventViewerWindow,
      props: expect.objectContaining({ conversationId: 'conv-123' }),
    }));
    expect(timelineRendered).toEqual(expect.objectContaining({
      type: mockTimelineDebugWindow,
      props: expect.objectContaining({ conversationId: 'conv-123' }),
    }));
  });
});
