import { formatAppKey, type LaunchableAppModule, type LaunchReason } from '@go-go-golems/os-shell';
import { openWindow, type OpenWindowPayload } from '@go-go-golems/os-core/desktop-core';
import type { DesktopContribution, WindowContentAdapter } from '@go-go-golems/os-core/desktop-react';
import { RuntimeSurfaceSessionHost } from '@go-go-golems/os-scripting';
import type { ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { STACK } from '../domain/stack';

const APP_ID = 'kanban-vm';
const BROWSER_INSTANCE_ID = 'library';
const CARD_SESSION_PREFIX = 'os-launcher-kanban:';

interface KanbanDemoCardMeta {
  surfaceId: string;
  title: string;
  icon: string;
  description: string;
}

const KANBAN_DEMO_CARDS: KanbanDemoCardMeta[] = [
  {
    surfaceId: 'kanbanSprintBoard',
    title: 'Sprint Board',
    icon: '🏁',
    description: 'Focused on implementation slices and pack migration tasks.',
  },
  {
    surfaceId: 'kanbanBugTriage',
    title: 'Bug Triage',
    icon: '🐞',
    description: 'Focused on defects, unknown-pack failures, and runtime host review.',
  },
  {
    surfaceId: 'kanbanPersonalPlanner',
    title: 'Personal Planner',
    icon: '🗓️',
    description: 'Focused on personal planning and smoke-testing the VM card path.',
  },
  {
    surfaceId: 'kanbanIncidentCommand',
    title: 'Incident Command',
    icon: '🚨',
    description: 'Focused on custom incident taxonomy and command-center status metrics.',
  },
  {
    surfaceId: 'kanbanReleaseTrain',
    title: 'Release Train',
    icon: '🚆',
    description: 'Focused on release gates, blocker tracking, and a filter-free shell layout.',
  },
];

function nextInstanceId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `kanban-vm-${Date.now()}`;
}

function buildBrowserWindowPayload(_reason: LaunchReason): OpenWindowPayload {
  return {
    id: `window:${APP_ID}:${BROWSER_INSTANCE_ID}`,
    title: 'Kanban VM Cards',
    icon: '📋',
    bounds: { x: 164, y: 82, w: 520, h: 420 },
    content: {
      kind: 'app',
      appKey: formatAppKey(APP_ID, BROWSER_INSTANCE_ID),
    },
    dedupeKey: `${APP_ID}:${BROWSER_INSTANCE_ID}`,
  };
}

function buildKanbanCardWindowPayload(card: KanbanDemoCardMeta): OpenWindowPayload {
  const instanceId = nextInstanceId();
  return {
    id: `window:${APP_ID}:${card.surfaceId}:${instanceId}`,
    title: card.title,
    icon: card.icon,
    bounds: { x: 214, y: 92, w: 1020, h: 720 },
    content: {
      kind: 'surface',
      surface: {
        bundleId: STACK.id,
        surfaceId: card.surfaceId,
        surfaceSessionId: `${CARD_SESSION_PREFIX}${card.surfaceId}:${instanceId}`,
      },
    },
  };
}

function createKanbanVmCardAdapter(): WindowContentAdapter {
  return {
    id: 'kanban-vm.card-window',
    canRender: (window) =>
      window.content.kind === 'surface'
      && window.content.surface?.bundleId === STACK.id,
    render: (window) => {
      const cardRef = window.content.surface;
      if (
        window.content.kind !== 'surface'
        || !cardRef
        || cardRef.bundleId !== STACK.id
      ) {
        return null;
      }
      return <RuntimeSurfaceSessionHost windowId={window.id} sessionId={cardRef.surfaceSessionId} bundle={STACK} />;
    },
  };
}

function KanbanVmBrowserWindow() {
  const dispatch = useDispatch();

  return (
    <section style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'grid', gap: 4 }}>
        <strong>Kanban VM Cards</strong>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45 }}>
          These buttons open real <code>kanban.v1</code> cards through the HyperCard runtime session host.
        </p>
      </header>
      <div style={{ display: 'grid', gap: 10 }}>
        {KANBAN_DEMO_CARDS.map((card) => (
          <button
            key={card.surfaceId}
            type="button"
            data-part="btn"
            onClick={() => dispatch(openWindow(buildKanbanCardWindowPayload(card)))}
            style={{
              display: 'grid',
              gap: 2,
              justifyItems: 'start',
              padding: '10px 12px',
              textAlign: 'left',
              border: '1px solid #222',
              background: '#f4f0da',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontWeight: 700 }}>{card.icon} {card.title}</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>{card.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export const kanbanVmLauncherModule: LaunchableAppModule = {
  manifest: {
    id: APP_ID,
    name: 'Kanban VM',
    icon: '📋',
    launch: { mode: 'window' },
    desktop: { order: 88 },
  },
  buildLaunchWindow: (_ctx, reason) => buildBrowserWindowPayload(reason),
  createContributions: (): DesktopContribution[] => [
    {
      id: 'kanban-vm.contributions',
      windowContentAdapters: [createKanbanVmCardAdapter()],
    },
  ],
  renderWindow: (): ReactNode => <KanbanVmBrowserWindow />,
};
