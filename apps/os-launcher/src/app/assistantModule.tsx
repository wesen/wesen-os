import { useEffect, useMemo } from 'react';
import { formatAppKey, parseAppKey, type LaunchableAppModule, type LauncherHostContext, type LaunchReason } from '@go-go-golems/os-shell';
import { type OpenWindowPayload } from '@go-go-golems/os-core/desktop-core';
import type { DesktopCommandHandler, DesktopContribution } from '@go-go-golems/os-core/desktop-react';
import { showToast } from '@go-go-golems/os-core';
import {
  ChatProvider,
  useChatClient,
  useChatSelector,
  selectOverlay,
  type ChatProviderConfig,
} from '@go-go-golems/chat-provider';
import { ChatMessages, ChatComposer, useStickyScrollFollow } from '@go-go-golems/chat-overlay';
import '../theme/assistant-chat-macos1.css';

const APP_ID = 'assistant';
const COMMAND_CHAT_WITH_APP = 'apps-browser.chat-with-app';

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

// AssistantWindowBody renders inside a ChatProvider: connect on mount, then a
// scrollable message list and composer laid out to fill the desktop window.
function AssistantWindowBody({ placeholder }: { placeholder: string }) {
  const client = useChatClient();
  const { runStatus, wsStatus, error, sessionId } = useChatSelector(selectOverlay);
  const isStreaming = runStatus === 'streaming';
  const scroll = useStickyScrollFollow({
    enabled: true,
    contentVersion: `${runStatus}:${wsStatus}`,
    resetKey: sessionId,
  });

  useEffect(() => {
    client.connect().catch(() => {
      // connection state is surfaced through wsStatus/error selectors
    });
  }, [client]);

  return (
    <div className="assistant-chat-window" data-part="assistant-chat-window">
      <div className="assistant-chat-status" data-part="assistant-chat-status">
        <span>{wsStatus === 'connected' ? '● connected' : `○ ${wsStatus || 'connecting'}`}</span>
        {isStreaming ? <span className="assistant-chat-streaming">streaming…</span> : null}
      </div>
      {error ? <div className="chat-overlay-error-bar">{String(error)}</div> : null}
      <div
        ref={scroll.containerRef}
        onScroll={scroll.onScroll}
        onWheel={scroll.onWheel}
        className="chat-overlay-messages-scroll"
      >
        <ChatMessages bottomRef={scroll.tailRef} />
      </div>
      <ChatComposer disabled={isStreaming} />
      <span className="assistant-chat-placeholder-hint" data-placeholder={placeholder} />
    </div>
  );
}

function AssistantChatWindow({ convId, placeholder }: { convId: string; placeholder: string }) {
  const config = useMemo<ChatProviderConfig>(() => ({
    basePrefix: '/api/apps/assistant',
    sessionStorageKey: `assistant.chat.session.${convId}`,
    createSessionBody: () => ({ sessionId: convId }),
  }), [convId]);

  return (
    <ChatProvider config={config}>
      <AssistantWindowBody placeholder={placeholder} />
    </ChatProvider>
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
  renderWindow: ({ appKey, instanceId }) => {
    const parsed = parseAppKey(appKey);
    const decoded = decodeInstance(parsed.instanceId || instanceId);
    if (!decoded) {
      return <div style={{ padding: 12, fontFamily: 'monospace' }}>Invalid assistant window instance.</div>;
    }
    const placeholder = decoded.mode === 'app-chat' && decoded.subjectAppName
      ? `Ask about ${decoded.subjectAppName}...`
      : 'Ask the assistant...';

    return (
      <AssistantChatWindow
        convId={decoded.convId}
        placeholder={placeholder}
      />
    );
  },
};
