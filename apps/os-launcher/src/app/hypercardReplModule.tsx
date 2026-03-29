import { formatAppKey, parseAppKey, type LaunchableAppModule, type LaunchReason } from '@go-go-golems/os-shell';
import {
  showToast,
  type RuntimeBundleDefinition,
} from '@go-go-golems/os-core';
import {
  closeWindow,
  openWindow,
  selectFocusedWindowId,
  type OpenWindowPayload,
} from '@go-go-golems/os-core/desktop-core';
import {
  createHypercardReplDriver,
  createRuntimeBroker,
  dispatchRuntimeAction,
  getAttachedRuntimeSession,
  registerRuntimeSession,
  renderRuntimeSurfaceTree,
  resolveCapabilityPolicy,
  selectProjectedRuntimeDomains,
  selectRuntimeSession,
  selectRuntimeSessionState,
  selectRuntimeSurfaceState,
} from '@go-go-golems/os-scripting';
import { inventoryHostContract } from '@go-go-golems/inventory/host';
import { MacRepl, type ReplEffect, type TerminalLine } from '@go-go-golems/os-repl';
import { useCallback, useEffect, useMemo } from 'react';
import { shallowEqual, useDispatch, useSelector, useStore } from 'react-redux';
import { STACK } from '../domain/stack';
import { OS_LAUNCHER_VM_PACK_METADATA } from '../domain/vmmeta';

const APP_ID = 'hypercard-repl';
const CONSOLE_INSTANCE_ID = 'console';
const SURFACE_INSTANCE_PREFIX = 'surface~';

interface ReplSurfaceWindowPayload {
  kind: 'runtime-surface';
  sessionId: string;
  stackId: string;
  surfaceId: string;
  title?: string;
}

interface BundleLibraryEntry {
  key: string;
  title: string;
  stack: RuntimeBundleDefinition;
}

const RUNTIME_BROKER = createRuntimeBroker();
const INVENTORY_STACK = inventoryHostContract.runtimeBundles[0];
const INVENTORY_VM_PACK_METADATA = inventoryHostContract.docsMetadata;

const BUNDLE_LIBRARY: Record<string, BundleLibraryEntry> = {
  inventory: {
    key: 'inventory',
    title: 'Inventory',
    stack: INVENTORY_STACK,
  },
  'os-launcher': {
    key: 'os-launcher',
    title: 'go-go-os Launcher',
    stack: STACK,
  },
};

const STACKS_BY_ID = new Map(
  Object.values(BUNDLE_LIBRARY).map((entry) => [entry.stack.id, entry.stack] as const),
);

const HYPERCARD_REPL_DRIVER = createHypercardReplDriver({
  broker: RUNTIME_BROKER,
  bundleLibrary: Object.fromEntries(
    Object.values(BUNDLE_LIBRARY).map((entry) => [
      entry.key,
      {
        key: entry.key,
        title: entry.title,
        stackId: entry.stack.id,
        packageIds: entry.stack.plugin?.packageIds ?? [],
        bundleCode: entry.stack.plugin?.bundleCode ?? '',
        docsMetadata:
          entry.key === 'inventory'
            ? INVENTORY_VM_PACK_METADATA
            : entry.key === 'os-launcher'
              ? OS_LAUNCHER_VM_PACK_METADATA
              : undefined,
      },
    ]),
  ),
});

const REPL_INITIAL_LINES: TerminalLine[] = [
  { type: 'system', text: 'HyperCard Runtime REPL' },
  { type: 'system', text: 'Try: packages, surface-types, bundles, spawn inventory demo-1, sessions, surfaces demo-1' },
  { type: 'system', text: 'Then: render lowStock {"filters":{"filter":"all"},"draft":{"limit":2}}' },
  { type: 'system', text: 'Or: open-surface lowStock demo-1' },
  { type: 'system', text: '' },
];

function resolveRuntimeSessionHandle(sessionId: string) {
  return RUNTIME_BROKER.getSession(sessionId) ?? getAttachedRuntimeSession(sessionId)?.handle ?? null;
}

function encodeSurfaceInstanceId(payload: ReplSurfaceWindowPayload): string {
  return [
    SURFACE_INSTANCE_PREFIX.replace(/~$/, ''),
    encodeURIComponent(payload.sessionId),
    encodeURIComponent(payload.stackId),
    encodeURIComponent(payload.surfaceId),
    encodeURIComponent(payload.title ?? ''),
  ].join('~');
}

function decodeSurfaceInstanceId(instanceId: string): ReplSurfaceWindowPayload | null {
  if (!instanceId.startsWith(SURFACE_INSTANCE_PREFIX)) {
    return null;
  }

  const [, sessionIdRaw, stackIdRaw, surfaceIdRaw, titleRaw] = instanceId.split('~');
  if (!sessionIdRaw || !stackIdRaw || !surfaceIdRaw) {
    return null;
  }

  return {
    kind: 'runtime-surface',
    sessionId: decodeURIComponent(sessionIdRaw),
    stackId: decodeURIComponent(stackIdRaw),
    surfaceId: decodeURIComponent(surfaceIdRaw),
    title: titleRaw ? decodeURIComponent(titleRaw) : undefined,
  };
}

function buildConsoleWindowPayload(_reason: LaunchReason): OpenWindowPayload {
  return {
    id: `window:${APP_ID}:${CONSOLE_INSTANCE_ID}`,
    title: 'HyperCard REPL',
    icon: '⌨️',
    bounds: { x: 210, y: 80, w: 760, h: 520 },
    content: {
      kind: 'app',
      appKey: formatAppKey(APP_ID, CONSOLE_INSTANCE_ID),
    },
    dedupeKey: `${APP_ID}:${CONSOLE_INSTANCE_ID}`,
  };
}

function buildSurfaceWindowPayload(payload: ReplSurfaceWindowPayload): OpenWindowPayload {
  const instanceId = encodeSurfaceInstanceId(payload);
  return {
    id: `window:${APP_ID}:${instanceId}`,
    title: payload.title ?? `${payload.stackId}:${payload.surfaceId}`,
    icon: '🧩',
    bounds: { x: 260, y: 110, w: 960, h: 680 },
    content: {
      kind: 'app',
      appKey: formatAppKey(APP_ID, instanceId),
    },
    dedupeKey: `${APP_ID}:${payload.sessionId}:${payload.surfaceId}`,
  };
}

function projectRuntimeState(domains: Record<string, unknown>, opts: {
  bundleId: string;
  sessionId: string;
  surfaceId: string;
  windowId: string;
  focusedWindowId: string | null;
  runtimeStatus: string;
  sessionState: Record<string, unknown>;
  surfaceState: Record<string, unknown>;
}) {
  return {
    self: {
      bundleId: opts.bundleId,
      sessionId: opts.sessionId,
      surfaceId: opts.surfaceId,
      windowId: opts.windowId,
    },
    nav: {
      current: opts.surfaceId,
      depth: 1,
      canBack: false,
    },
    ui: {
      focusedWindowId: opts.focusedWindowId,
      runtimeStatus: opts.runtimeStatus,
    },
    filters: opts.sessionState,
    draft: opts.surfaceState,
    ...domains,
  };
}

function HypercardReplSurfaceWindow({
  windowId,
  payload,
}: {
  windowId: string;
  payload: ReplSurfaceWindowPayload;
}) {
  const dispatch = useDispatch();
  const store = useStore();
  const stack = STACKS_BY_ID.get(payload.stackId);
  const session = resolveRuntimeSessionHandle(payload.sessionId);
  const runtimeSession = useSelector((state) => selectRuntimeSession(state as never, payload.sessionId));
  const sessionState = useSelector((state) => selectRuntimeSessionState(state as never, payload.sessionId));
  const surfaceState = useSelector((state) => selectRuntimeSurfaceState(state as never, payload.sessionId, payload.surfaceId));
  const focusedWindowId = useSelector((state) => selectFocusedWindowId(state as never));
  const projectedDomainAccess = useMemo(
    () => resolveCapabilityPolicy(stack?.plugin?.capabilities).domain,
    [stack?.plugin?.capabilities],
  );
  const projectedDomains = useSelector(
    (state) => selectProjectedRuntimeDomains(state as never, projectedDomainAccess),
    shallowEqual,
  );

  useEffect(() => {
    if (!stack || !session || runtimeSession) {
      return;
    }

    const meta = session.getBundleMeta();
    dispatch(
      registerRuntimeSession({
        sessionId: payload.sessionId,
        bundleId: stack.id,
        initialSessionState: (meta.initialSessionState ?? {}) as Record<string, unknown>,
        initialSurfaceState: (meta.initialSurfaceState ?? {}) as Record<string, Record<string, unknown>>,
        capabilities: stack.plugin?.capabilities,
        status: 'ready',
      }) as never,
    );
  }, [dispatch, payload.sessionId, runtimeSession, session, stack]);

  const projectedState = useMemo(
    () =>
      stack
        ? projectRuntimeState(projectedDomains, {
            bundleId: stack.id,
            sessionId: payload.sessionId,
            surfaceId: payload.surfaceId,
            windowId,
            focusedWindowId,
            runtimeStatus: runtimeSession?.status ?? (session ? 'ready' : 'error'),
            sessionState,
            surfaceState,
          })
        : null,
    [
      focusedWindowId,
      payload.sessionId,
      payload.surfaceId,
      projectedDomains,
      runtimeSession?.status,
      session,
      sessionState,
      stack,
      surfaceState,
      windowId,
    ],
  );

  const tree = useMemo(() => {
    if (!session || !stack || !projectedState) {
      return null;
    }
    const rawTree = session.renderSurface(payload.surfaceId, projectedState);
    const packId = session.getBundleMeta().surfaceTypes?.[payload.surfaceId];
    return renderRuntimeSurfaceTree(packId, rawTree, (handler, args) => {
      const latestState = projectRuntimeState(
        selectProjectedRuntimeDomains(store.getState() as never, projectedDomainAccess),
        {
          bundleId: stack.id,
          sessionId: payload.sessionId,
          surfaceId: payload.surfaceId,
          windowId,
          focusedWindowId: selectFocusedWindowId(store.getState() as never),
          runtimeStatus: selectRuntimeSession(store.getState() as never, payload.sessionId)?.status ?? 'ready',
          sessionState: selectRuntimeSessionState(store.getState() as never, payload.sessionId),
          surfaceState: selectRuntimeSurfaceState(store.getState() as never, payload.sessionId, payload.surfaceId),
        },
      );
      if (!session.writable) {
        dispatch(showToast(`Runtime session ${payload.sessionId} is attached read-only`));
        return;
      }
      const actions = session.eventSurface(payload.surfaceId, handler, args, latestState);
      actions.forEach((action) =>
        dispatchRuntimeAction(action, {
          dispatch: (nextAction) => dispatch(nextAction as never),
          getState: () => store.getState(),
          sessionId: payload.sessionId,
          surfaceId: payload.surfaceId,
          windowId,
        }),
      );
    });
  }, [
    dispatch,
    payload.sessionId,
    payload.surfaceId,
    projectedDomainAccess,
    projectedState,
    session,
    stack,
    store,
    windowId,
  ]);

  if (!stack) {
    return <section style={{ padding: 12 }}>Unknown runtime bundle: {payload.stackId}</section>;
  }
  if (!session) {
    return <section style={{ padding: 12 }}>Unknown runtime session: {payload.sessionId}</section>;
  }
  if (!tree) {
    return <section style={{ padding: 12 }}>Unable to render runtime surface: {payload.surfaceId}</section>;
  }

  return <>{tree}</>;
}

function HypercardReplConsoleWindow() {
  const dispatch = useDispatch();

  const handleEffects = useCallback(
    (effects: ReplEffect[]) => {
      for (const effect of effects) {
        if (effect.type === 'open-window' && effect.payload && typeof effect.payload === 'object') {
          const payload = effect.payload as Partial<ReplSurfaceWindowPayload>;
          if (payload.kind === 'runtime-surface' && payload.sessionId && payload.stackId && payload.surfaceId) {
            dispatch(
              openWindow(
                buildSurfaceWindowPayload({
                  kind: 'runtime-surface',
                  sessionId: payload.sessionId,
                  stackId: payload.stackId,
                  surfaceId: payload.surfaceId,
                  title: payload.title,
                }),
              ),
            );
            continue;
          }
        }

        if (effect.type === 'window.close') {
          dispatch(closeWindow(`window:${APP_ID}:${CONSOLE_INSTANCE_ID}`));
          continue;
        }

        dispatch(showToast(`Unhandled REPL effect: ${effect.type}`));
      }
    },
    [dispatch],
  );

  return (
    <MacRepl
      prompt="hc>"
      initialLines={REPL_INITIAL_LINES}
      driver={HYPERCARD_REPL_DRIVER}
      onEffects={handleEffects}
    />
  );
}

export const hypercardReplLauncherModule: LaunchableAppModule = {
  manifest: {
    id: APP_ID,
    name: 'HyperCard REPL',
    icon: '⌨️',
    launch: { mode: 'window' },
    desktop: { order: 90 },
  },
  buildLaunchWindow: (_ctx, reason) => buildConsoleWindowPayload(reason),
  renderWindow: ({ appKey, instanceId, windowId }) => {
    const parsed = parseAppKey(appKey);
    const decodedSurface = decodeSurfaceInstanceId(parsed.instanceId || instanceId);
    if (decodedSurface) {
      return <HypercardReplSurfaceWindow windowId={windowId} payload={decodedSurface} />;
    }
    return <HypercardReplConsoleWindow />;
  },
};
