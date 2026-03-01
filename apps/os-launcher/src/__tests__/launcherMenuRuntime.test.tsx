// @vitest-environment jsdom
import { focusWindow, openWindow, type OpenWindowPayload } from '@hypercard/engine/desktop-core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { App } from '../App';
import { launcherModules } from '../app/modules';
import { createLauncherAppStore } from '../app/store';

const roots: Root[] = [];
const containers: HTMLElement[] = [];

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.scrollIntoView !== 'function') {
    HTMLElement.prototype.scrollIntoView = () => undefined;
  }
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
});

function createHostContext() {
  return {
    dispatch: (action: unknown) => action,
    getState: () => ({}),
    openWindow: () => undefined,
    closeWindow: () => undefined,
    resolveApiBase: (appId: string) => `/api/apps/${appId}`,
    resolveWsBase: (appId: string) => `/api/apps/${appId}/ws`,
  };
}

function buildModuleWindowPayload(moduleId: string): OpenWindowPayload {
  const module = launcherModules.find((entry) => entry.manifest.id === moduleId);
  if (!module) {
    throw new Error(`launcher module not found: ${moduleId}`);
  }
  return module.buildLaunchWindow(createHostContext(), 'icon');
}

function findWindowByTitle(container: HTMLElement, title: string): Element | null {
  const windows = Array.from(container.querySelectorAll('[data-part="windowing-window"]'));
  return (
    windows.find((windowEl) => {
      const titleEl = windowEl.querySelector('[data-part="windowing-window-title"]');
      return titleEl?.textContent?.includes(title);
    }) ?? null
  );
}

function fireContextMenu(target: Element): void {
  act(() => {
    target.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: 240,
        clientY: 180,
      }),
    );
  });
}

function menuLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-part="windowing-menu-button"]'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter((label): label is string => label.length > 0);
}

async function renderHostWithWorkspaceApps() {
  const store = createLauncherAppStore();
  const todoPayload = buildModuleWindowPayload('todo');
  const crmPayload = buildModuleWindowPayload('crm');
  const bookPayload = buildModuleWindowPayload('book-tracker-debug');

  store.dispatch(openWindow(todoPayload));
  store.dispatch(openWindow(crmPayload));
  store.dispatch(openWindow(bookPayload));

  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);

  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
  });

  return {
    container,
    store,
    todoWindowId: todoPayload.id,
    crmWindowId: crmPayload.id,
    bookWindowId: bookPayload.id,
  };
}

describe('launcher menu runtime behavior', () => {
  it('keeps non-chat workspace apps on default menu sections across focus changes', async () => {
    const { container, store, todoWindowId, crmWindowId, bookWindowId } = await renderHostWithWorkspaceApps();

    const assertNoChatSections = () => {
      expect(menuLabels(container)).not.toContain('Chat');
      expect(menuLabels(container)).not.toContain('Profile');
    };

    assertNoChatSections();

    await act(async () => {
      store.dispatch(focusWindow(todoWindowId));
    });
    assertNoChatSections();

    await act(async () => {
      store.dispatch(focusWindow(crmWindowId));
    });
    assertNoChatSections();

    await act(async () => {
      store.dispatch(focusWindow(bookWindowId));
    });
    assertNoChatSections();
  });

  it('keeps title-bar context menu on default entries for todo windows', async () => {
    const { container, store, todoWindowId } = await renderHostWithWorkspaceApps();

    await act(async () => {
      store.dispatch(focusWindow(todoWindowId));
    });

    const todoWindow = findWindowByTitle(container, 'Todo');
    expect(todoWindow).not.toBeNull();
    const titleBar = todoWindow?.querySelector('[data-part="windowing-window-title-bar"]');
    expect(titleBar).not.toBeNull();

    fireContextMenu(titleBar as Element);

    const contextMenu = container.querySelector('[data-part="context-menu"]');
    expect(contextMenu).not.toBeNull();
    expect(contextMenu?.textContent).toContain('Close Window');
    expect(contextMenu?.textContent).toContain('Tile Windows');
    expect(contextMenu?.textContent).toContain('Cascade Windows');
    expect(contextMenu?.textContent).not.toContain('Open Event Viewer');
    expect(contextMenu?.textContent).not.toContain('Open Timeline Debug');
  });
});
