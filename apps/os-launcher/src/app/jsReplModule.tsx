import { formatAppKey, type LaunchableAppModule, type LaunchReason } from '@hypercard/desktop-os';
import { createJsReplDriver, createJsSessionBroker } from '@hypercard/hypercard-runtime';
import { MacRepl, type TerminalLine } from '@hypercard/repl';

const APP_ID = 'js-repl';
const CONSOLE_INSTANCE_ID = 'console';

const JS_SESSION_BROKER = createJsSessionBroker();

const JS_REPL_DRIVER = createJsReplDriver({
  broker: JS_SESSION_BROKER,
});

const INITIAL_LINES: TerminalLine[] = [
  { type: 'system', text: 'JavaScript REPL' },
  { type: 'system', text: 'Try: :spawn js-1' },
  { type: 'system', text: 'Then: const x = 41' },
  { type: 'system', text: 'And: x + 1' },
  { type: 'system', text: '' },
];

function buildConsoleWindowPayload(_reason: LaunchReason) {
  return {
    id: `window:${APP_ID}:${CONSOLE_INSTANCE_ID}`,
    title: 'JavaScript REPL',
    icon: 'λ',
    bounds: { x: 240, y: 100, w: 760, h: 520 },
    content: {
      kind: 'app' as const,
      appKey: formatAppKey(APP_ID, CONSOLE_INSTANCE_ID),
    },
    dedupeKey: `${APP_ID}:${CONSOLE_INSTANCE_ID}`,
  };
}

function JsReplConsoleWindow() {
  return (
    <MacRepl
      prompt="js>"
      initialLines={INITIAL_LINES}
      driver={JS_REPL_DRIVER}
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
  buildLaunchWindow: (_ctx, reason) => buildConsoleWindowPayload(reason),
  renderWindow: () => <JsReplConsoleWindow />,
};
