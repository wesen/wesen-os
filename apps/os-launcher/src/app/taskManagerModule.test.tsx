// @vitest-environment jsdom
import {
  clearTaskManagerSources,
  HYPERCARD_TASK_MANAGER_APP_ID,
  listTaskManagerSources,
} from '@go-go-golems/os-scripting';
import { formatAppKey } from '@go-go-golems/os-shell';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { store } from './store';

const roots: Root[] = [];
const containers: HTMLElement[] = [];

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('taskManagerLauncherModule', () => {
  beforeEach(() => {
    clearTaskManagerSources();
  });

  afterEach(() => {
    for (const root of roots.splice(0)) {
      act(() => {
        root.unmount();
      });
    }
    for (const container of containers.splice(0)) {
      container.remove();
    }
    clearTaskManagerSources();
  });

  it('builds the shared task manager launcher window', async () => {
    const { taskManagerLauncherModule } = await import('./taskManagerModule');
    const payload = taskManagerLauncherModule.buildLaunchWindow(
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
    expect(payload.content.appKey).toBe(formatAppKey(HYPERCARD_TASK_MANAGER_APP_ID, 'tasks'));
    expect(payload.title).toBe('Task Manager');
  });

  it('renders the shared task manager window component', async () => {
    const { taskManagerLauncherModule } = await import('./taskManagerModule');

    const rendered = taskManagerLauncherModule.renderWindow({
      appId: HYPERCARD_TASK_MANAGER_APP_ID,
      appKey: formatAppKey(HYPERCARD_TASK_MANAGER_APP_ID, 'tasks'),
      instanceId: 'tasks',
      windowId: 'window:hypercard-task-manager:tasks',
      ctx: {
        dispatch: () => undefined,
        getState: () => ({}),
        moduleId: HYPERCARD_TASK_MANAGER_APP_ID,
      },
    });

    expect(rendered).toBeTruthy();
    expect((rendered as { type?: { name?: string } }).type?.name).toBe('TaskManagerProviders');
  });

  it('leaves task manager sources empty until the window is mounted', () => {
    expect(listTaskManagerSources()).toEqual([]);
  });

  it('registers runtime and js sources when the window is mounted', async () => {
    const { taskManagerLauncherModule } = await import('./taskManagerModule');
    const rendered = taskManagerLauncherModule.renderWindow({
      appId: HYPERCARD_TASK_MANAGER_APP_ID,
      appKey: formatAppKey(HYPERCARD_TASK_MANAGER_APP_ID, 'tasks'),
      instanceId: 'tasks',
      windowId: 'window:hypercard-task-manager:tasks',
      ctx: {
        dispatch: () => undefined,
        getState: () => ({}),
        moduleId: HYPERCARD_TASK_MANAGER_APP_ID,
      },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    containers.push(container);
    const root = createRoot(container);
    roots.push(root);

    await act(async () => {
      root.render(<Provider store={store}>{rendered}</Provider>);
    });

    await act(async () => {
      expect(listTaskManagerSources().map((source) => source.sourceId())).toEqual([
        'runtime-sessions@os-launcher',
        'js-sessions@os-launcher',
      ]);
    });
  });
});
