import { formatAppKey, parseAppKey, type LaunchableAppModule, type LauncherHostContext, type LaunchReason } from '@hypercard/desktop-os';
import { openWindow, type OpenWindowPayload } from '@hypercard/engine/desktop-core';
import type { DesktopCommandHandler, DesktopContribution } from '@hypercard/engine/desktop-react';
import { showToast } from '@hypercard/engine';
import { ChatConversationWindow, EventViewerWindow, TimelineDebugWindow } from '@hypercard/chat-runtime';
import { useDispatch } from 'react-redux';

const APP_ID = 'assistant';
const COMMAND_CHAT_WITH_APP = 'apps-browser.chat-with-app';
const EVENT_VIEW_INSTANCE_PREFIX = 'event-viewer~';
const TIMELINE_DEBUG_INSTANCE_PREFIX = 'timeline-debug~';

interface AssistantAppChatBootstrapResponse {
  conv_id: string;
  assistant_app_id: string;
  base_prefix: string;
  subject_app: {
    app_id: string;
    name: string;
    description?: string;
  };
}

interface AssistantWindowState {
  mode: 'generic' | 'app-chat';
  convId: string;
  subjectAppId?: string;
  subjectAppName?: string;
}

function nextConvID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `assistant-${Date.now()}`;
}

function encodeInstance(input: AssistantWindowState): string {
  const parts = [
    input.mode,
    encodeURIComponent(input.convId),
    encodeURIComponent(input.subjectAppId ?? ''),
    encodeURIComponent(input.subjectAppName ?? ''),
  ];
  return parts.join('~');
}

function decodeInstance(instanceId: string): AssistantWindowState | null {
  const [modeRaw, convIDRaw, subjectAppIDRaw, subjectAppNameRaw] = instanceId.split('~');
  const mode = modeRaw === 'app-chat' ? 'app-chat' : modeRaw === 'generic' ? 'generic' : null;
  if (!mode || !convIDRaw) {
    return null;
  }
  const convId = decodeURIComponent(convIDRaw);
  return {
    mode,
    convId,
    subjectAppId: subjectAppIDRaw ? decodeURIComponent(subjectAppIDRaw) : undefined,
    subjectAppName: subjectAppNameRaw ? decodeURIComponent(subjectAppNameRaw) : undefined,
  };
}

function buildAssistantWindowPayload(input?: Partial<AssistantWindowState>): OpenWindowPayload {
  const mode = input?.mode ?? 'generic';
  const convId = input?.convId?.trim() || nextConvID();
  const subjectAppId = input?.subjectAppId?.trim() || undefined;
  const subjectAppName = input?.subjectAppName?.trim() || undefined;
  const title = mode === 'app-chat' && subjectAppName ? `Chat with ${subjectAppName}` : 'Assistant';
  const instanceId = encodeInstance({ mode, convId, subjectAppId, subjectAppName });
  return {
    id: `window:assistant:${instanceId}`,
    title,
    icon: '🤖',
    bounds: { x: 180, y: 60, w: 760, h: 560 },
    content: {
      kind: 'app',
      appKey: formatAppKey(APP_ID, instanceId),
    },
    dedupeKey: mode === 'app-chat' && subjectAppId ? `assistant:app-chat:${subjectAppId}:${convId}` : `assistant:${convId}`,
  };
}

function buildEventViewerWindowPayload(convId: string): OpenWindowPayload {
  const shortId = convId.slice(0, 8) || 'chat';
  return {
    id: `window:assistant:event-viewer:${convId}`,
    title: `Event Viewer (${shortId})`,
    icon: '🧭',
    bounds: { x: 220, y: 90, w: 720, h: 520 },
    content: {
      kind: 'app',
      appKey: formatAppKey(APP_ID, `${EVENT_VIEW_INSTANCE_PREFIX}${convId}`),
    },
  };
}

function buildTimelineDebugWindowPayload(convId: string): OpenWindowPayload {
  const shortId = convId.slice(0, 8) || 'chat';
  return {
    id: `window:assistant:timeline-debug:${convId}`,
    title: `Timeline Debug (${shortId})`,
    icon: '🧱',
    bounds: { x: 260, y: 110, w: 760, h: 560 },
    content: {
      kind: 'app',
      appKey: formatAppKey(APP_ID, `${TIMELINE_DEBUG_INSTANCE_PREFIX}${convId}`),
    },
  };
}

async function bootstrapAppChat(hostContext: LauncherHostContext, appId: string): Promise<AssistantAppChatBootstrapResponse> {
  const response = await fetch(`${hostContext.resolveApiBase(APP_ID)}/api/bootstrap/app-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId }),
  });
  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(detail || `assistant bootstrap failed (${response.status})`);
  }
  return response.json() as Promise<AssistantAppChatBootstrapResponse>;
}

function createAssistantCommandHandler(hostContext: LauncherHostContext): DesktopCommandHandler {
  return {
    id: 'assistant.commands',
    priority: 260,
    matches: (commandId) => commandId === COMMAND_CHAT_WITH_APP,
    run: (_commandId, _ctx, invocation) => {
      const appId = String(invocation.payload?.appId ?? invocation.contextTarget?.appId ?? '').trim();
      if (!appId) {
        hostContext.dispatch(showToast('Chat With App requires an app id'));
        return 'handled';
      }

      void bootstrapAppChat(hostContext, appId)
        .then((result) => {
          hostContext.openWindow(buildAssistantWindowPayload({
            mode: 'app-chat',
            convId: result.conv_id,
            subjectAppId: result.subject_app.app_id,
            subjectAppName: result.subject_app.name,
          }));
        })
        .catch((error) => {
          hostContext.dispatch(showToast(error instanceof Error ? error.message : String(error)));
        });
      return 'handled';
    },
  };
}

function AssistantChatWindow({
  convId,
  title,
  placeholder,
  windowId,
}: {
  convId: string;
  title: string;
  placeholder: string;
  windowId: string;
}) {
  const dispatch = useDispatch();

  return (
    <ChatConversationWindow
      convId={convId}
      basePrefix="/api/apps/assistant"
      title={title}
      placeholder={placeholder}
      windowId={windowId}
      profilePolicy={{ kind: 'none' }}
      starterSuggestions={[]}
      headerActions={
        <>
          <button
            type="button"
            data-part="btn"
            onClick={() => dispatch(openWindow(buildEventViewerWindowPayload(convId)))}
            style={{ fontSize: 10, padding: '1px 6px' }}
          >
            🧭 Events
          </button>
          <button
            type="button"
            data-part="btn"
            onClick={() => dispatch(openWindow(buildTimelineDebugWindowPayload(convId)))}
            style={{ fontSize: 10, padding: '1px 6px' }}
          >
            🧱 Timeline
          </button>
        </>
      }
    />
  );
}

export const assistantLauncherModule: LaunchableAppModule = {
  manifest: {
    id: APP_ID,
    name: 'Assistant',
    icon: '🤖',
    launch: { mode: 'window' },
    desktop: { order: 95 },
  },
  buildLaunchWindow: (_ctx, _reason: LaunchReason) => buildAssistantWindowPayload({ mode: 'generic' }),
  createContributions: (hostContext): DesktopContribution[] => [
    {
      id: 'assistant.contributions',
      commands: [createAssistantCommandHandler(hostContext)],
    },
  ],
  renderWindow: ({ appKey, instanceId, windowId }) => {
    const parsed = parseAppKey(appKey);
    const decoded = decodeInstance(parsed.instanceId || instanceId);
    const fallbackInstanceId = parsed.instanceId || instanceId;
    if (fallbackInstanceId.startsWith(EVENT_VIEW_INSTANCE_PREFIX)) {
      const convId = fallbackInstanceId.slice(EVENT_VIEW_INSTANCE_PREFIX.length);
      return <EventViewerWindow conversationId={convId} />;
    }
    if (fallbackInstanceId.startsWith(TIMELINE_DEBUG_INSTANCE_PREFIX)) {
      const convId = fallbackInstanceId.slice(TIMELINE_DEBUG_INSTANCE_PREFIX.length);
      return <TimelineDebugWindow conversationId={convId} />;
    }
    if (!decoded) {
      return <div style={{ padding: 12, fontFamily: 'monospace' }}>Invalid assistant window instance.</div>;
    }
    const title = decoded.mode === 'app-chat' && decoded.subjectAppName
      ? `Chat with ${decoded.subjectAppName}`
      : 'Assistant';
    const placeholder = decoded.mode === 'app-chat' && decoded.subjectAppName
      ? `Ask about ${decoded.subjectAppName}...`
      : 'Ask the assistant...';

    return (
      <AssistantChatWindow
        convId={decoded.convId}
        title={title}
        placeholder={placeholder}
        windowId={windowId}
      />
    );
  },
};
