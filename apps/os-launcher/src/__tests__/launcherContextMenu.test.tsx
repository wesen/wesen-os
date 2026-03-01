// @vitest-environment jsdom
import { openWindow } from '@hypercard/engine/desktop-core';
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

function getIconLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-part="windowing-icon-label"]'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter((label): label is string => label.length > 0);
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

    act(() => {
      openAction?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    const windowCountAfter = Object.keys(store.getState().windowing.windows).length;
    expect(windowCountAfter).toBeGreaterThan(windowCountBefore);
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

  it('opens folder context menu actions and launches all member apps', async () => {
    const { container, store } = await renderHost();
    const folderIcon = container.querySelector('[aria-label="Applications"]');
    expect(folderIcon).not.toBeNull();

    const windowCountBefore = Object.keys(store.getState().windowing.windows).length;

    fireContextMenu(folderIcon as Element);

    const contextMenu = container.querySelector('[data-part="context-menu"]');
    expect(contextMenu).not.toBeNull();
    expect(contextMenu?.textContent).toContain('Open');
    expect(contextMenu?.textContent).toContain('Open in New Window');
    expect(contextMenu?.textContent).toContain('Launch All');
    expect(contextMenu?.textContent).toContain('Sort Icons');

    const launchAllAction = Array.from(contextMenu?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.trim() === 'Launch All'
    );
    expect(launchAllAction).not.toBeUndefined();

    act(() => {
      launchAllAction?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    const windowCountAfter = Object.keys(store.getState().windowing.windows).length;
    expect(windowCountAfter).toBeGreaterThanOrEqual(windowCountBefore + launcherModules.length);
  });

  it('sorts launcher icons after folder Sort Icons action', async () => {
    const { container } = await renderHost();
    const folderIcon = container.querySelector('[aria-label="Applications"]');
    expect(folderIcon).not.toBeNull();

    fireContextMenu(folderIcon as Element);

    const contextMenu = container.querySelector('[data-part="context-menu"]');
    expect(contextMenu).not.toBeNull();
    const sortIconsAction = Array.from(contextMenu?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.trim() === 'Sort Icons'
    );
    expect(sortIconsAction).not.toBeUndefined();

    act(() => {
      sortIconsAction?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    const iconLabels = getIconLabels(container);
    expect(iconLabels.at(-1)).toBe('Applications');
    const appLabels = iconLabels.slice(0, -1);
    const sortedAppLabels = [...appLabels].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    expect(appLabels).toEqual(sortedAppLabels);
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
