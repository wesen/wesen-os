import type { LaunchableAppModule, LaunchReason } from '@go-go-golems/os-shell';
import { openWindow } from '@go-go-golems/os-core/desktop-core';
import {
  buildTaskManagerWindowPayload,
  createJsSessionTaskManagerSource,
  createRuntimeSessionTaskManagerSource,
  HYPERCARD_RUNTIME_DEBUG_APP_ID,
  HYPERCARD_TASK_MANAGER_APP_ID,
  registerTaskManagerSource,
  TaskManagerAppWindow,
  unregisterTaskManagerSource,
} from '@go-go-golems/os-scripting';
import { useEffect, useMemo } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { STACK } from '../domain/stack';
import { listRuntimeFederatedRuntimeBundles } from './localFederatedAppContracts';
import { buildJsReplConsoleWindowPayload, JS_SESSION_BROKER } from './jsReplModule';

const TASK_MANAGER_INSTANCE_ID = 'tasks';
const RUNTIME_TASK_SOURCE_ID = 'runtime-sessions@os-launcher';
const JS_TASK_SOURCE_ID = 'js-sessions@os-launcher';
const TASK_MANAGER_BUNDLES = [...listRuntimeFederatedRuntimeBundles(), STACK];

function TaskManagerProviders({ instanceId }: { instanceId: string }) {
  const dispatch = useDispatch();
  const store = useStore();

  const runtimeSource = useMemo(
    () =>
      createRuntimeSessionTaskManagerSource({
        sourceId: RUNTIME_TASK_SOURCE_ID,
        sourceTitle: 'Runtime Sessions',
        getState: () => store.getState() as never,
        dispatch: (action) => dispatch(action as never),
        bundles: TASK_MANAGER_BUNDLES,
        ownerAppId: HYPERCARD_RUNTIME_DEBUG_APP_ID,
        focusJsConsole: (sessionId) => {
          dispatch(openWindow(buildJsReplConsoleWindowPayload(undefined, { attachSessionId: sessionId })) as never);
        },
        subscribe: store.subscribe,
      }),
    [dispatch, store],
  );

  const jsSource = useMemo(
    () =>
      createJsSessionTaskManagerSource({
        sourceId: JS_TASK_SOURCE_ID,
        sourceTitle: 'JavaScript Sessions',
        broker: JS_SESSION_BROKER,
        focusSession: () => {
          dispatch(openWindow(buildJsReplConsoleWindowPayload()) as never);
        },
      }),
    [dispatch],
  );

  useEffect(() => {
    registerTaskManagerSource(runtimeSource);
    registerTaskManagerSource(jsSource);
    return () => {
      unregisterTaskManagerSource(runtimeSource.sourceId());
      unregisterTaskManagerSource(jsSource.sourceId());
    };
  }, [runtimeSource, jsSource]);

  return <TaskManagerAppWindow instanceId={instanceId} />;
}

function buildLaunchWindow(_reason: LaunchReason) {
  return buildTaskManagerWindowPayload({
    appId: HYPERCARD_TASK_MANAGER_APP_ID,
    instanceId: TASK_MANAGER_INSTANCE_ID,
  });
}

export const taskManagerLauncherModule: LaunchableAppModule = {
  manifest: {
    id: HYPERCARD_TASK_MANAGER_APP_ID,
    name: 'Task Manager',
    icon: '🗂️',
    launch: { mode: 'window' },
    desktop: {
      order: 90,
    },
  },
  buildLaunchWindow: (_ctx, reason) => buildLaunchWindow(reason),
  renderWindow: ({ instanceId }) => (
    <TaskManagerProviders key={instanceId} instanceId={instanceId} />
  ),
};
