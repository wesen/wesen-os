import { formatAppKey } from '@hypercard/desktop-os';
import type { OpenWindowPayload } from '@hypercard/engine/desktop-core';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRuntimeSurfaceSessionHost, mockDispatch } = vi.hoisted(() => ({
  mockRuntimeSurfaceSessionHost: vi.fn(
    (props: { sessionId: string }) => ({ type: 'plugin-card-session-host', props }) as unknown as ReactElement,
  ),
  mockDispatch: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('@hypercard/hypercard-runtime', async () => {
  const actual = await vi.importActual<typeof import('@hypercard/hypercard-runtime')>('@hypercard/hypercard-runtime');
  return {
    ...actual,
    RuntimeSurfaceSessionHost: mockRuntimeSurfaceSessionHost,
  };
});

describe('kanbanVmLauncherModule', async () => {
  const { kanbanVmLauncherModule } = await import('./kanbanVmModule');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a launcher browser window payload', () => {
    const payload = kanbanVmLauncherModule.buildLaunchWindow(
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
    expect(payload.content.appKey).toBe(formatAppKey('kanban-vm', 'library'));
    expect(payload.title).toBe('Kanban VM Cards');
  });

  it('renders the launcher browser copy', () => {
    const rendered = kanbanVmLauncherModule.renderWindow({
      appId: 'kanban-vm',
      appKey: formatAppKey('kanban-vm', 'library'),
      instanceId: 'library',
      windowId: 'window:kanban-vm:library',
      ctx: {
        dispatch: () => undefined,
        getState: () => ({}),
        moduleId: 'kanban-vm',
      },
    });

    const markup = renderToStaticMarkup(rendered as never);
    expect(markup).toContain('Kanban VM Cards');
    expect(markup).toContain('Sprint Board');
    expect(markup).toContain('Bug Triage');
    expect(markup).toContain('Personal Planner');
  });

  it('claims os-launcher bundle card windows', () => {
    const contributions = kanbanVmLauncherModule.createContributions?.() ?? [];
    const adapter = contributions.flatMap((item) => item.windowContentAdapters ?? [])[0];
    expect(adapter).toBeDefined();

    const matchingWindow: OpenWindowPayload = {
      id: 'window:kanban-vm:kanbanSprintBoard:1',
      title: 'Sprint Board',
      bounds: { x: 0, y: 0, w: 100, h: 100 },
      content: {
        kind: 'surface',
        surface: {
          bundleId: 'os-launcher',
          surfaceId: 'kanbanSprintBoard',
          surfaceSessionId: 'os-launcher-kanban:kanbanSprintBoard:1',
        },
      },
    };
    const nonMatchingWindow: OpenWindowPayload = {
      id: 'window:other',
      title: 'Other',
      bounds: { x: 0, y: 0, w: 100, h: 100 },
      content: {
        kind: 'surface',
        surface: {
          bundleId: 'inventory',
          surfaceId: 'home',
          surfaceSessionId: 'different-session',
        },
      },
    };

    expect(adapter?.canRender(matchingWindow as never)).toBe(true);
    expect(adapter?.canRender(nonMatchingWindow as never)).toBe(false);

    const rendered = adapter?.render(matchingWindow as never) as ReactElement;
    expect(rendered).toEqual(expect.objectContaining({
      type: mockRuntimeSurfaceSessionHost,
      props: expect.objectContaining({
        sessionId: 'os-launcher-kanban:kanbanSprintBoard:1',
        windowId: 'window:kanban-vm:kanbanSprintBoard:1',
      }),
    }));
  });
});
