import { useMemo, useRef, useState } from 'react';
import { formatAppKey, parseAppKey, type LaunchableAppModule, type LauncherHostContext, type LaunchReason } from '@go-go-golems/os-shell';
import { openWindow, type OpenWindowPayload } from '@go-go-golems/os-core/desktop-core';
import type { DesktopCommandHandler, DesktopContribution } from '@go-go-golems/os-core/desktop-react';
import { showToast } from '@go-go-golems/os-core';
import { ChatProvider, type ChatProviderConfig } from '@go-go-golems/chat-provider';
import { ChatWindowChrome } from '../chat/ChatWindowChrome';
import { ChatEventViewerWindow, ChatTimelineDebugWindow } from '../chat/ChatDebugWindows';
import { chatDebugStore } from '../chat/chatDebugStore';
import { chatStatsStore } from '../chat/chatStatsStore';

const APP_ID = 'assistant';
const API_BASE_PREFIX = '/api/apps/assistant';
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

type DebugWindowKind = 'event-viewer' | 'timeline-debug';

// buildDebugWindowPayload opens a detached debug window as another assistant
// app instance (`event-viewer~<convId>` / `timeline-debug~<convId>`), matching
// the pre-migration assistant's routing so debug windows survive reloads.
export function buildDebugWindowPayload(kind: DebugWindowKind, convId: string): OpenWindowPayload {
  const label = kind === 'event-viewer' ? 'Event Viewer' : 'Timeline Debug';
  const icon = kind === 'event-viewer' ? '🧭' : '🧱';
  const instanceId = `${kind}~${convId}`;
  return {
    id: `window:assistant:${instanceId}`,
    title: `${label} (${convId})`,
    icon,
    bounds: { x: kind === 'event-viewer' ? 240 : 300, y: 120, w: 680, h: 480 },
    content: {
      kind: 'app',
      appKey: formatAppKey(APP_ID, instanceId),
    },
    dedupeKey: `assistant:${instanceId}`,
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

function assistantSuggestions(state: AssistantWindowState): string[] {
  if (state.mode === 'app-chat' && state.subjectAppName) {
    return [
      `What does ${state.subjectAppName} do?`,
      `How do I get started with ${state.subjectAppName}?`,
      `Show me an example workflow in ${state.subjectAppName}`,
    ];
  }
  return [
    'What can you help me with?',
    'List the apps on this desktop',
    'Help me plan my day',
  ];
}

// AssistantChatWindow wires ChatProvider + the shared chrome: the profile is
// bound at session creation (createSessionBody reads the latest selection via
// a ref), and every debug event lands in chatDebugStore for the detached
// Event Viewer / Timeline Debug windows.
function AssistantChatWindow({
  state,
  dispatch,
}: {
  state: AssistantWindowState;
  dispatch: (action: unknown) => unknown;
}) {
  const { convId } = state;
  const [profile, setProfile] = useState<string | null>(null);
  const profileRef = useRef<string | null>(profile);
  profileRef.current = profile;

  const config = useMemo<ChatProviderConfig>(
    () => ({
      basePrefix: API_BASE_PREFIX,
      sessionStorageKey: `assistant.chat.session.${convId}`,
      createSessionBody: () => ({
        sessionId: convId,
        profile: profileRef.current ?? undefined,
      }),
      onDebugEvent: (event) => {
        chatDebugStore.push(convId, event);
        chatStatsStore.ingest(convId, event);
      },
    }),
    [convId],
  );

  const title = state.mode === 'app-chat' && state.subjectAppName
    ? `💬 Chat with ${state.subjectAppName}`
    : '🤖 Assistant';
  const emptySubtitle = state.mode === 'app-chat' && state.subjectAppName
    ? `Ask about ${state.subjectAppName} — or try one of the suggestions below.`
    : 'Ask a question, request data, or try one of the suggestions below.';

  return (
    <ChatProvider config={config}>
      <ChatWindowChrome
        convId={convId}
        apiBasePrefix={API_BASE_PREFIX}
        title={title}
        emptySubtitle={emptySubtitle}
        starterSuggestions={assistantSuggestions(state)}
        profile={profile}
        onProfileChange={setProfile}
        onOpenEventViewer={(id) => dispatch(openWindow(buildDebugWindowPayload('event-viewer', id)))}
        onOpenTimelineDebug={(id) => dispatch(openWindow(buildDebugWindowPayload('timeline-debug', id)))}
      />
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
  renderWindow: ({ appKey, instanceId, ctx }) => {
    const parsed = parseAppKey(appKey);
    const resolvedInstanceId = parsed.instanceId || instanceId;

    if (resolvedInstanceId.startsWith('event-viewer~')) {
      const convId = decodeURIComponent(resolvedInstanceId.slice('event-viewer~'.length));
      return <ChatEventViewerWindow convId={convId} />;
    }
    if (resolvedInstanceId.startsWith('timeline-debug~')) {
      const convId = decodeURIComponent(resolvedInstanceId.slice('timeline-debug~'.length));
      return <ChatTimelineDebugWindow convId={convId} apiBasePrefix={API_BASE_PREFIX} />;
    }

    const decoded = decodeInstance(resolvedInstanceId);
    if (!decoded) {
      return <div style={{ padding: 12, fontFamily: 'monospace' }}>Invalid assistant window instance.</div>;
    }

    return <AssistantChatWindow state={decoded} dispatch={ctx.dispatch} />;
  },
};
