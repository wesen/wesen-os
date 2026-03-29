import { formatAppKey } from '@go-go-golems/os-shell';
import { describe, expect, it } from 'vitest';

describe('jsReplLauncherModule', async () => {
  const {
    buildJsReplConsoleWindowPayload,
    jsReplLauncherModule,
  } = await import('./jsReplModule');

  it('builds the console launcher window payload', () => {
    const payload = jsReplLauncherModule.buildLaunchWindow(
      {
        dispatch: () => undefined,
        getState: () => ({}),
        openWindow: () => undefined,
        closeWindow: () => undefined,
        resolveApiBase: (appId) => `/api/apps/${appId}`,
        resolveWsBase: (appId) => `/api/apps/${appId}/ws`,
      },
      'icon',
    );

    expect(payload.content.kind).toBe('app');
    expect(payload.content.appKey).toBe(formatAppKey('js-repl', 'console'));
    expect(payload.title).toBe('JavaScript REPL');
  });

  it('renders the console window for the default instance', () => {
    const rendered = jsReplLauncherModule.renderWindow({
      appId: 'js-repl',
      appKey: formatAppKey('js-repl', 'console'),
      instanceId: 'console',
      windowId: 'window:js-repl:console',
      ctx: {
        dispatch: () => undefined,
        getState: () => ({}),
        moduleId: 'js-repl',
      },
    });

    expect(rendered).toBeTruthy();
    expect((rendered as { type?: { name?: string } }).type?.name).toBe('JsReplConsoleWindow');
  });

  it('builds an attached-console payload for a runtime session', () => {
    const payload = buildJsReplConsoleWindowPayload('icon', {
      attachSessionId: 'inventory@live',
    });

    expect(payload.content.kind).toBe('app');
    expect(payload.content.appKey).toBe(formatAppKey('js-repl', 'attached~inventory%40live'));
    expect(payload.title).toBe('JavaScript REPL · inventory@live');
    expect(payload.dedupeKey).toBe('js-repl:attached:inventory@live');
  });
});
