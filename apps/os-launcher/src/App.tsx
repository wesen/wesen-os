import { buildLauncherContributions, createRenderAppWindow, type LauncherHostContext } from '@go-go-golems/os-shell';
import { closeWindow as closeWindowAction, openWindow as openWindowAction } from '@go-go-golems/os-core/desktop-core';
import { DesktopShell } from '@go-go-golems/os-core/desktop-react';
import { useMemo } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { registerRuntimePackages } from './app/registerRuntimePackages';
import { launcherRegistry } from './app/registry';
import { STACK } from './domain/stack';

registerRuntimePackages();

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

  const contributions = useMemo(
    () => buildLauncherContributions(launcherRegistry, { hostContext, folderIcon: false }),
    [hostContext],
  );

  const renderAppWindow = useMemo(
    () =>
      createRenderAppWindow({
        registry: launcherRegistry,
        hostContext,
        onUnknownAppKey: (appKey) => <UnknownAppWindow appKey={appKey} />,
      }),
    [hostContext],
  );

  return <DesktopShell bundle={STACK} contributions={contributions} renderAppWindow={renderAppWindow} />;
}
