import { formatAppKey, type LaunchableAppModule, type LaunchReason } from '@hypercard/desktop-os';
import { openWindow, type OpenWindowPayload } from '@hypercard/engine/desktop-core';
import type { DesktopContribution, WindowContentAdapter } from '@hypercard/engine/desktop-react';
import { PluginCardSessionHost } from '@hypercard/hypercard-runtime';
import type { ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { STACK } from '../domain/stack';

const APP_ID = 'kanban-vm';
const BROWSER_INSTANCE_ID = 'library';
const CARD_SESSION_PREFIX = 'os-launcher-kanban:';

interface KanbanDemoCardMeta {
  cardId: string;
  title: string;
  icon: string;
  description: string;
}

const KANBAN_DEMO_CARDS: KanbanDemoCardMeta[] = [
  {
    cardId: 'kanbanSprintBoard',
    title: 'Sprint Board',
    icon: '🏁',
    description: 'Focused on implementation slices and pack migration tasks.',
  },
  {
    cardId: 'kanbanBugTriage',
    title: 'Bug Triage',
    icon: '🐞',
    description: 'Focused on defects, unknown-pack failures, and runtime host review.',
  },
  {
    cardId: 'kanbanPersonalPlanner',
    title: 'Personal Planner',
    icon: '🗓️',
    description: 'Focused on personal planning and smoke-testing the VM card path.',
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
    id: `window:${APP_ID}:${card.cardId}:${instanceId}`,
    title: card.title,
    icon: card.icon,
    bounds: { x: 214, y: 92, w: 1020, h: 720 },
    content: {
      kind: 'card',
      card: {
        stackId: STACK.id,
        cardId: card.cardId,
        cardSessionId: `${CARD_SESSION_PREFIX}${card.cardId}:${instanceId}`,
      },
    },
  };
}

function createKanbanVmCardAdapter(): WindowContentAdapter {
  return {
    id: 'kanban-vm.card-window',
    canRender: (window) =>
      window.content.kind === 'card'
      && window.content.card?.stackId === STACK.id
      && String(window.content.card?.cardSessionId ?? '').startsWith(CARD_SESSION_PREFIX),
    render: (window) => {
      const cardRef = window.content.card;
      if (
        window.content.kind !== 'card'
        || !cardRef
        || cardRef.stackId !== STACK.id
        || !String(cardRef.cardSessionId ?? '').startsWith(CARD_SESSION_PREFIX)
      ) {
        return null;
      }
      return <PluginCardSessionHost windowId={window.id} sessionId={cardRef.cardSessionId} stack={STACK} />;
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
            key={card.cardId}
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
