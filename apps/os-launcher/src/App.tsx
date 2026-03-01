import { buildLauncherContributions, createRenderAppWindow, type LauncherHostContext } from '@hypercard/desktop-os';
import { closeWindow as closeWindowAction, openWindow as openWindowAction } from '@hypercard/engine/desktop-core';
import { DesktopShell } from '@hypercard/engine/desktop-react';
import { useMemo } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { launcherRegistry } from './app/registry';
import { STACK } from './domain/stack';

function UnknownAppWindow({ appKey }: { appKey: string }) {
  return (
    <section style={{ padding: 12, display: 'grid', gap: 8 }}>
      <strong>Unknown app module</strong>
      <span>Unable to resolve app key: {appKey}</span>
    </section>
  );
}

export function App() {
  const dispatch = useDispatch();
  const store = useStore();

  const hostContext = useMemo((): LauncherHostContext => {
    const getState = () => store.getState();
    return {
      dispatch: (action) => dispatch(action as never),
      getState,
      openWindow: (payload) => {
        dispatch(openWindowAction(payload));
      },
      closeWindow: (windowId) => {
        dispatch(closeWindowAction(windowId));
      },
      resolveApiBase: (appId) => `/api/apps/${appId}`,
      resolveWsBase: (appId) => `/api/apps/${appId}/ws`,
    };
  }, [dispatch, store]);

  const contributions = useMemo(() => buildLauncherContributions(launcherRegistry, { hostContext }), [hostContext]);

  const renderAppWindow = useMemo(
    () =>
      createRenderAppWindow({
        registry: launcherRegistry,
        hostContext,
        onUnknownAppKey: (appKey) => <UnknownAppWindow appKey={appKey} />,
      }),
    [hostContext],
  );

  return <DesktopShell stack={STACK} contributions={contributions} renderAppWindow={renderAppWindow} />;
}
