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
  // Required by React 19 to avoid act() environment warnings in jsdom.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.scrollIntoView !== 'function') {
    HTMLElement.prototype.scrollIntoView = () => undefined;
  }
});

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

async function renderHostAtViewport(width: number): Promise<HTMLElement> {
  setViewportWidth(width);

  const store = createLauncherAppStore();
  const payload = launcherModules[0].buildLaunchWindow(
    {
      dispatch: (action) => action,
      getState: () => ({}),
      openWindow: () => undefined,
      closeWindow: () => undefined,
      resolveApiBase: (appId) => `/api/apps/${appId}`,
      resolveWsBase: (appId) => `/api/apps/${appId}/ws`,
    },
    'icon',
  );
  store.dispatch(openWindow(payload));

  const container = document.createElement('div');
  containers.push(container);
  document.body.appendChild(container);

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

describe('launcher layout behavior', () => {
  it('renders shell + window surface at desktop width', async () => {
    const container = await renderHostAtViewport(1366);

    expect(container.querySelector('[data-part="windowing-desktop-shell"]')).not.toBeNull();
    expect(container.querySelector('[data-part="windowing-window"]')).not.toBeNull();
  });

  it('renders shell + window surface at mobile width', async () => {
    const container = await renderHostAtViewport(390);

    expect(container.querySelector('[data-part="windowing-desktop-shell"]')).not.toBeNull();
    expect(container.querySelector('[data-part="windowing-window"]')).not.toBeNull();
  });
});
