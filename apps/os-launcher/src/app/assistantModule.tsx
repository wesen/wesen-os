import { formatAppKey, parseAppKey, type LaunchableAppModule, type LauncherHostContext, type LaunchReason } from '@hypercard/desktop-os';
import type { OpenWindowPayload } from '@hypercard/engine/desktop-core';
import type { DesktopCommandHandler, DesktopContribution } from '@hypercard/engine/desktop-react';
import { showToast } from '@hypercard/engine';
import { ChatConversationWindow } from '@hypercard/chat-runtime';

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
      <ChatConversationWindow
        convId={decoded.convId}
        basePrefix="/api/apps/assistant"
        title={title}
        placeholder={placeholder}
        windowId={windowId}
      />
    );
  },
};
