// @vitest-environment jsdom
import { openWindow } from '@go-go-golems/os-core/desktop-core';
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

async function renderHostWithTwoWindows(): Promise<HTMLElement> {
  const store = createLauncherAppStore();
  const hostContext = createHostContext();
  const firstPayload = launcherModules[0].buildLaunchWindow(hostContext, 'icon');
  const secondPayload = launcherModules[1].buildLaunchWindow(hostContext, 'icon');
  store.dispatch(openWindow(firstPayload));
  store.dispatch(openWindow(secondPayload));

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

  return container;
}

async function renderHost(): Promise<{
  container: HTMLElement;
  store: ReturnType<typeof createLauncherAppStore>;
}> {
  const store = createLauncherAppStore();
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

  return { container, store };
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

function fireDoubleClick(target: Element): void {
  act(() => {
    target.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

async function flushAsyncUi(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('launcher context menu behavior', () => {
  it('opens icon context menu quick actions and routes Open command', async () => {
    const { container, store } = await renderHost();
    const icons = container.querySelectorAll('[data-part="windowing-icon"]');
    expect(icons.length).toBeGreaterThan(0);

    const windowCountBefore = Object.keys(store.getState().windowing.windows).length;

    fireContextMenu(icons[0]);
    const contextMenu = container.querySelector('[data-part="context-menu"]');
    expect(contextMenu).not.toBeNull();
    expect(contextMenu?.textContent).toContain('Open');
    expect(contextMenu?.textContent).toContain('Open New');
    expect(contextMenu?.textContent).toContain('Pin');
    expect(contextMenu?.textContent).toContain('Inspect');

    const openAction = Array.from(contextMenu?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.trim() === 'Open'
    );
    expect(openAction).not.toBeUndefined();

    await act(async () => {
      openAction?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flushAsyncUi();
    });

    const windowCountAfter = Object.keys(store.getState().windowing.windows).length;
    expect(windowCountAfter).toBeGreaterThan(windowCountBefore);
    await act(async () => {
      await flushAsyncUi();
    });
  });

  it('opens shell context menu from title-bar right click', async () => {
    const container = await renderHostWithTwoWindows();
    const titleBars = container.querySelectorAll('[data-part="windowing-window-title-bar"]');
    expect(titleBars.length).toBeGreaterThan(0);

    fireContextMenu(titleBars[0]);

    const contextMenu = container.querySelector('[data-part="context-menu"]');
    expect(contextMenu).not.toBeNull();
    expect(contextMenu?.textContent).toContain('Close Window');
  });

  it('focuses unfocused window before showing title-bar context menu', async () => {
    const container = await renderHostWithTwoWindows();
    const windows = Array.from(container.querySelectorAll('[data-part="windowing-window"]'));
    expect(windows.length).toBeGreaterThan(1);

    const initiallyUnfocused =
      windows.find((windowEl) => windowEl.getAttribute('data-state') !== 'focused') ?? windows[0];
    const titleBar = initiallyUnfocused.querySelector('[data-part="windowing-window-title-bar"]');
    expect(titleBar).not.toBeNull();

    fireContextMenu(titleBar as Element);

    expect(initiallyUnfocused.getAttribute('data-state')).toBe('focused');
    expect(container.querySelector('[data-part="context-menu"]')).not.toBeNull();
  });

  it('replaces the generic Applications folder with a Rich Widgets launcher icon', async () => {
    const { container, store } = await renderHost();
    expect(container.querySelector('[aria-label="Applications"]')).toBeNull();

    const richWidgetsIcon = container.querySelector('[aria-label="Rich Widgets"]');
    expect(richWidgetsIcon).not.toBeNull();
    const windowCountBefore = Object.keys(store.getState().windowing.windows).length;

    fireDoubleClick(richWidgetsIcon as Element);

    const windowCountAfter = Object.keys(store.getState().windowing.windows).length;
    expect(windowCountAfter).toBe(windowCountBefore + 1);
    expect(container.querySelector('[data-part="windowing-window"] [aria-label="Log Viewer"]')).not.toBeNull();
    expect(container.querySelector('[data-part="windowing-window"] [aria-label="MacWrite"]')).not.toBeNull();
  });

  it('opens rich widget windows from icons inside the Rich Widgets folder window', async () => {
    const { container, store } = await renderHost();
    const richWidgetsIcon = container.querySelector('[aria-label="Rich Widgets"]');
    expect(richWidgetsIcon).not.toBeNull();

    fireDoubleClick(richWidgetsIcon as Element);

    const windowCountBefore = Object.keys(store.getState().windowing.windows).length;
    const logViewerIcon = container.querySelector('[data-part="windowing-window"] [aria-label="Log Viewer"]');
    expect(logViewerIcon).not.toBeNull();

    fireDoubleClick(logViewerIcon as Element);

    const windowCountAfter = Object.keys(store.getState().windowing.windows).length;
    expect(windowCountAfter).toBe(windowCountBefore + 1);
    const windowTitles = Array.from(
      container.querySelectorAll('[data-part="windowing-window-title"]'),
    ).map((node) => node.textContent?.trim() ?? '');
    expect(windowTitles).toContain('Log Viewer');
  });

  it('opens context menu for inventory-folder window icons and routes Open', async () => {
    const { container, store } = await renderHost();
    const inventoryLaunchPayload = launcherModules[0].buildLaunchWindow(createHostContext(), 'icon');

    await act(async () => {
      store.dispatch(openWindow(inventoryLaunchPayload));
    });

    const inWindowNewChatIcon = container.querySelector('[data-part="windowing-window"] [aria-label="New Chat"]');
    expect(inWindowNewChatIcon).not.toBeNull();

    const windowCountBefore = Object.keys(store.getState().windowing.windows).length;

    fireContextMenu(inWindowNewChatIcon as Element);

    const contextMenu = container.querySelector('[data-part="context-menu"]');
    expect(contextMenu).not.toBeNull();
    expect(contextMenu?.textContent).toContain('Open');

    const openAction = Array.from(contextMenu?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.trim() === 'Open',
    );
    expect(openAction).not.toBeUndefined();

    act(() => {
      openAction?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    const windowCountAfter = Object.keys(store.getState().windowing.windows).length;
    expect(windowCountAfter).toBeGreaterThan(windowCountBefore);
  });

});
