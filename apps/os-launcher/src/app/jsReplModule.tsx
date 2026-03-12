import { formatAppKey, type LaunchableAppModule, type LaunchReason } from '@hypercard/desktop-os';
import {
  createJsReplDriver,
  createJsSessionBroker,
  registerJsSessionDebugSource,
} from '@hypercard/hypercard-runtime';
import { MacRepl, type TerminalLine } from '@hypercard/repl';
import { useMemo } from 'react';

const APP_ID = 'js-repl';
const CONSOLE_INSTANCE_ID = 'console';
const ATTACHED_INSTANCE_PREFIX = 'attached~';

export const JS_SESSION_BROKER = createJsSessionBroker();

registerJsSessionDebugSource({
  id: APP_ID,
  title: 'JavaScript REPL',
  broker: JS_SESSION_BROKER,
});

const INITIAL_LINES: TerminalLine[] = [
  { type: 'system', text: 'JavaScript REPL' },
  { type: 'system', text: 'Try: :spawn js-1' },
  { type: 'system', text: 'Then: const x = 41' },
  { type: 'system', text: 'And: x + 1' },
  { type: 'system', text: '' },
];

interface JsReplConsoleWindowOptions {
  attachSessionId?: string;
}

function encodeConsoleInstanceId(options?: JsReplConsoleWindowOptions): string {
  if (!options?.attachSessionId) {
    return CONSOLE_INSTANCE_ID;
  }
  return `${ATTACHED_INSTANCE_PREFIX}${encodeURIComponent(options.attachSessionId)}`;
}

function decodeConsoleInstanceId(instanceId: string): JsReplConsoleWindowOptions {
  if (!instanceId.startsWith(ATTACHED_INSTANCE_PREFIX)) {
    return {};
  }
  return {
    attachSessionId: decodeURIComponent(instanceId.slice(ATTACHED_INSTANCE_PREFIX.length)),
  };
}

function buildInitialLines(options?: JsReplConsoleWindowOptions): TerminalLine[] {
  if (!options?.attachSessionId) {
    return INITIAL_LINES;
  }
  return [
    { type: 'system', text: 'JavaScript REPL' },
    { type: 'system', text: `Attached console target: ${options.attachSessionId}` },
    { type: 'system', text: 'This window starts attached to a live runtime-backed JS session.' },
    { type: 'system', text: 'Try: :globals' },
    { type: 'system', text: '' },
  ];
}

export function buildJsReplConsoleWindowPayload(_reason?: LaunchReason, options?: JsReplConsoleWindowOptions) {
  const instanceId = encodeConsoleInstanceId(options);
  return {
    id: `window:${APP_ID}:${instanceId}`,
    title: options?.attachSessionId ? `JavaScript REPL · ${options.attachSessionId}` : 'JavaScript REPL',
    icon: 'λ',
    bounds: { x: 240, y: 100, w: 760, h: 520 },
    content: {
      kind: 'app' as const,
      appKey: formatAppKey(APP_ID, instanceId),
    },
    dedupeKey: options?.attachSessionId
      ? `${APP_ID}:attached:${options.attachSessionId}`
      : `${APP_ID}:${CONSOLE_INSTANCE_ID}`,
  };
}

function JsReplConsoleWindow({ attachSessionId }: JsReplConsoleWindowOptions) {
  const driver = useMemo(
    () =>
      createJsReplDriver({
        broker: JS_SESSION_BROKER,
        initialSessionId: attachSessionId ?? null,
        initialOrigin: attachSessionId ? 'attached-runtime' : null,
      }),
    [attachSessionId],
  );

  return (
    <MacRepl
      prompt={attachSessionId ? `js[runtime:${attachSessionId}]>` : 'js>'}
      initialLines={buildInitialLines({ attachSessionId })}
      driver={driver}
    />
  );
}

export const jsReplLauncherModule: LaunchableAppModule = {
  manifest: {
    id: APP_ID,
    name: 'JavaScript REPL',
    icon: 'λ',
    launch: { mode: 'window' },
    desktop: { order: 91 },
  },
  buildLaunchWindow: (_ctx, reason) => buildJsReplConsoleWindowPayload(reason),
  renderWindow: ({ instanceId }) => {
    const options = decodeConsoleInstanceId(instanceId);
    return <JsReplConsoleWindow attachSessionId={options.attachSessionId} />;
  },
};
