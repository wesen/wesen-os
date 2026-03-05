import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildLauncherContributions,
  createAppRegistry,
  createRenderAppWindow,
  formatAppKey,
  type LaunchableAppModule,
  parseAppKey,
} from '@hypercard/desktop-os';
import { type DesktopCommandContext, routeContributionCommand } from '@hypercard/engine/desktop-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { launcherModules } from '../app/modules';
import { launcherRegistry } from '../app/registry';

function commandContext(): DesktopCommandContext {
  return {
    dispatch: () => undefined,
    getState: () => ({}),
    focusedWindowId: null,
    openCardWindow: () => undefined,
    closeWindow: () => undefined,
  };
}

function createHostContext() {
  return {
    dispatch: vi.fn(() => undefined),
    getState: () => ({}),
    openWindow: vi.fn(),
    closeWindow: () => undefined,
    resolveApiBase: (appId: string) => `/api/apps/${appId}`,
    resolveWsBase: (appId: string) => `/api/apps/${appId}/ws`,
  };
}

describe('launcher host wiring', () => {
  it('routes icon open command to module launch window creation for every app', () => {
    const hostContext = createHostContext();

    const contributions = buildLauncherContributions(launcherRegistry, { hostContext });
    const handlers = contributions.flatMap((contribution) => contribution.commands ?? []);
    const appIds = launcherModules.map((module) => module.manifest.id);

    for (const appId of appIds) {
      const handled = routeContributionCommand(`icon.open.${appId}`, handlers, commandContext());
      expect(handled).toBe(true);
    }

    expect(hostContext.openWindow).toHaveBeenCalledTimes(appIds.length);
    for (const [index, appId] of appIds.entries()) {
      const [payload] = hostContext.openWindow.mock.calls[index] as [
        { content: { kind: string; appKey?: string; card?: { stackId?: string } } },
      ];
      if (appId === 'inventory' || appId === 'sqlite' || appId === 'apps-browser' || appId === 'arc-agi-player') {
        expect(payload.content.kind).toBe('app');
        expect(payload.content.appKey).toMatch(new RegExp(`^${appId}:`));
      } else {
        expect(payload.content.kind).toBe('card');
        expect(payload.content.card?.stackId).toBeTruthy();
        if (appId === 'hypercard-tools') {
          expect(payload.content.card?.stackId).toBe('hypercardToolsUiDslDemo');
        }
      }
    }
  });

  it('renders unknown-app fallback when registry lookup fails', () => {
    const render = createRenderAppWindow({
      registry: launcherRegistry,
      hostContext: {
        dispatch: () => undefined,
        getState: () => ({}),
        resolveApiBase: (appId: string) => `/api/apps/${appId}`,
        resolveWsBase: (appId: string) => `/api/apps/${appId}/ws`,
      },
      onUnknownAppKey: (appKey) => `unknown:${appKey}`,
    });

    expect(render('bad-key', 'window:1')).toBe('unknown:bad-key');
    expect(render('missing-app:instance', 'window:2')).toBe('unknown:missing-app:instance');
  });

  it('renders module window content for a valid app key', () => {
    const render = createRenderAppWindow({
      registry: launcherRegistry,
      hostContext: {
        dispatch: () => undefined,
        getState: () => ({}),
        resolveApiBase: (appId: string) => `/api/apps/${appId}`,
        resolveWsBase: (appId: string) => `/api/apps/${appId}/ws`,
      },
    });

    const content = render(formatAppKey('inventory', 'test-instance'), 'window:test');
    expect(content).not.toBeNull();
  });

  it('renders hypercard-tools editor window for encoded runtime card refs', () => {
    const render = createRenderAppWindow({
      registry: launcherRegistry,
      hostContext: {
        dispatch: () => undefined,
        getState: () => ({}),
        resolveApiBase: (appId: string) => `/api/apps/${appId}`,
        resolveWsBase: (appId: string) => `/api/apps/${appId}/ws`,
      },
    });

    const content = render('hypercard-tools:editor~inventory~helloWorldCard', 'window:tools:test');
    expect(content).not.toBeNull();
    expect(renderToStaticMarkup(content as never)).toContain('helloWorldCard');
  });

  it('renders hypercard-tools unknown-instance fallback for malformed ids', () => {
    const render = createRenderAppWindow({
      registry: launcherRegistry,
      hostContext: {
        dispatch: () => undefined,
        getState: () => ({}),
        resolveApiBase: (appId: string) => `/api/apps/${appId}`,
        resolveWsBase: (appId: string) => `/api/apps/${appId}/ws`,
      },
    });

    const content = render('hypercard-tools:editor~inventory', 'window:tools:bad');
    expect(content).not.toBeNull();
    expect(renderToStaticMarkup(content as never)).toContain('Unknown hypercard-tools window instance');
  });

  it('fails registry creation when module ids collide', () => {
    const duplicateA: LaunchableAppModule = {
      manifest: {
        id: 'duplicate',
        name: 'Duplicate A',
        icon: '📦',
        launch: { mode: 'window' },
      },
      buildLaunchWindow: () => ({
        id: 'window:dup:a',
        title: 'Duplicate A',
        bounds: { x: 0, y: 0, w: 300, h: 240 },
        content: { kind: 'app', appKey: 'duplicate:a' },
      }),
      renderWindow: () => null,
    };
    const duplicateB: LaunchableAppModule = {
      ...duplicateA,
      manifest: {
        ...duplicateA.manifest,
        name: 'Duplicate B',
      },
    };

    expect(() => createAppRegistry([duplicateA, duplicateB])).toThrow(/Duplicate app manifest id/);
  });

  it('keeps module list on app-owned launcher modules only', () => {
    const source = readFileSync(new URL('../app/modules.tsx', import.meta.url), 'utf8');
    expect(source).not.toContain('createPlaceholderModule');
    expect(source).not.toContain('/main');
    expect(source).not.toContain('/App');
  });

  it('imports inventory module/reducers from public package exports only', () => {
    const moduleSource = readFileSync(new URL('../app/modules.tsx', import.meta.url), 'utf8');
    const storeSource = readFileSync(new URL('../app/store.ts', import.meta.url), 'utf8');

    expect(moduleSource).toContain("@hypercard/inventory/launcher");
    expect(storeSource).toContain("@hypercard/inventory/reducers");
    expect(moduleSource).not.toContain('@hypercard/inventory/src/');
    expect(storeSource).not.toContain('@hypercard/inventory/src/');
  });

  it('prevents placeholder module labels from being reintroduced', () => {
    const moduleUrls = [
      new URL('../../../../../go-go-app-inventory/apps/inventory/src/launcher/module.tsx', import.meta.url),
      new URL('../../../../../go-go-os-frontend/apps/todo/src/launcher/module.tsx', import.meta.url),
      new URL('../../../../../go-go-os-frontend/apps/crm/src/launcher/module.tsx', import.meta.url),
      new URL('../../../../../go-go-os-frontend/apps/book-tracker-debug/src/launcher/module.tsx', import.meta.url),
      new URL('../../../../../go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/module.tsx', import.meta.url),
      new URL('../../../../../go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx', import.meta.url),
      new URL('../../../../../go-go-os-frontend/apps/hypercard-tools/src/launcher/module.tsx', import.meta.url),
      new URL('../../../../../go-go-app-sqlite/apps/sqlite/src/launcher/module.tsx', import.meta.url),
    ];
    const moduleSources = moduleUrls
      .map((url) => fileURLToPath(url))
      .filter((filePath) => existsSync(filePath))
      .map((filePath) => readFileSync(filePath, 'utf8'));

    const placeholderLabels = [
      'Inventory Module',
      'Todo Module',
      'CRM Module',
      'Book Tracker Module',
      'ARC-AGI Module',
      'Apps Browser Module',
      'HyperCard Tools Module',
      'SQLite Module',
    ];
    for (const source of moduleSources) {
      for (const label of placeholderLabels) {
        expect(source).not.toContain(label);
      }
    }
  });

  it('builds valid launch window payloads and render content for every module', () => {
    for (const module of launcherModules) {
      const ctx = createHostContext();
      const payload = module.buildLaunchWindow(ctx, 'icon');
      expect(payload.id).toContain(module.manifest.id);
      if (
        module.manifest.id === 'inventory' ||
        module.manifest.id === 'sqlite' ||
        module.manifest.id === 'apps-browser' ||
        module.manifest.id === 'arc-agi-player'
      ) {
        expect(payload.content.kind).toBe('app');
        const parsed = parseAppKey(payload.content.appKey ?? '');
        expect(parsed).not.toBeNull();
        expect(parsed?.appId).toBe(module.manifest.id);
      } else {
        expect(payload.content.kind).toBe('card');
        expect(payload.content.card?.stackId).toBeTruthy();
        if (module.manifest.id === 'hypercard-tools') {
          expect(payload.content.card?.stackId).toBe('hypercardToolsUiDslDemo');
        }
      }

      const renderInstanceId = module.manifest.id === 'inventory' ? 'chat-test-instance' : 'test-instance';
      const renderAppKey = formatAppKey(module.manifest.id, renderInstanceId);
      const parsed = parseAppKey(renderAppKey);

      const rendered = module.renderWindow({
        appId: module.manifest.id,
        appKey: renderAppKey,
        instanceId: parsed.instanceId,
        windowId: payload.id,
        ctx: {
          dispatch: () => undefined,
          getState: () => ({}),
          moduleId: module.manifest.id,
          stateKey: module.state?.stateKey,
        },
      });
      expect(rendered).not.toBeNull();
    }
  });

  it('derives inventory chat API base prefix from launcher host context', () => {
    const module = launcherModules.find((entry) => entry.manifest.id === 'inventory');
    expect(module).toBeTruthy();
    if (!module) {
      return;
    }

    const rendered = module.renderWindow({
      appId: 'inventory',
      appKey: formatAppKey('inventory', 'chat-test-instance'),
      instanceId: 'chat-test-instance',
      windowId: 'window:inventory:test',
      ctx: {
        dispatch: () => undefined,
        getState: () => ({}),
        moduleId: 'inventory',
        stateKey: module.state?.stateKey,
        resolveApiBase: () => '/launcher/api/apps/inventory',
        resolveWsBase: () => '/launcher/api/apps/inventory/ws',
      },
    }) as { props?: Record<string, unknown> } | null;

    expect(rendered).not.toBeNull();
    expect(rendered?.props?.apiBasePrefix).toBe('/launcher/api/apps/inventory');
  });

  it('routes inventory chat-scoped debug and profile commands deterministically', () => {
    const hostContext = createHostContext();
    const contributions = buildLauncherContributions(launcherRegistry, { hostContext });
    const handlers = contributions.flatMap((contribution) => contribution.commands ?? []);

    const debugHandled = routeContributionCommand(
      'inventory.chat.conv-42.debug.event-viewer',
      handlers,
      commandContext(),
    );
    expect(debugHandled).toBe(true);
    expect(hostContext.openWindow).toHaveBeenCalledTimes(1);
    const [eventPayload] = hostContext.openWindow.mock.calls[0] as [{ id: string; content: { appKey?: string } }];
    expect(eventPayload.id).toContain('event-viewer-conv-42');
    expect(eventPayload.content.appKey).toContain('event-viewer-conv-42');

    const profileDispatch = vi.fn();
    const profileHandled = routeContributionCommand(
      'inventory.chat.conv-42.profile.select.agent',
      handlers,
      {
        ...commandContext(),
        dispatch: profileDispatch,
        getState: () => ({ chatProfiles: { selectedRegistry: 'default' } }),
      },
    );
    expect(profileHandled).toBe(true);
    expect(profileDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'chatProfiles/setSelectedProfile',
        payload: { profile: 'agent', registry: 'default', scopeKey: 'conv:conv-42' },
      }),
    );
  });

  it('routes message context actions using conversation/message payload metadata', () => {
    const hostContext = createHostContext();
    const contributions = buildLauncherContributions(launcherRegistry, { hostContext });
    const handlers = contributions.flatMap((contribution) => contribution.commands ?? []);

    const invocation = {
      source: 'context-menu' as const,
      contextTarget: {
        kind: 'message' as const,
        conversationId: 'conv-42',
        messageId: 'msg-9',
      },
      payload: {
        conversationId: 'conv-42',
        messageId: 'msg-9',
        content: 'Need stock adjustments',
      },
    };

    const debugHandled = routeContributionCommand('chat.message.debug-event', handlers, commandContext(), invocation);
    expect(debugHandled).toBe(true);
    expect(hostContext.openWindow).toHaveBeenCalledTimes(1);
    const [eventPayload] = hostContext.openWindow.mock.calls[0] as [{ id: string; title: string }];
    expect(eventPayload.id).toContain('event-viewer-conv-42');
    expect(eventPayload.title).toContain('Event Viewer');

    const replyHandled = routeContributionCommand('chat.message.reply', handlers, commandContext(), invocation);
    expect(replyHandled).toBe(true);
    expect(hostContext.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'notifications/showToast',
      }),
    );

    const taskHandled = routeContributionCommand('chat.message.create-task', handlers, commandContext(), invocation);
    expect(taskHandled).toBe(true);
    expect(hostContext.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'notifications/showToast',
      }),
    );
  });

  it('routes apps-browser context commands to module windows', () => {
    const hostContext = createHostContext();
    const contributions = buildLauncherContributions(launcherRegistry, { hostContext });
    const handlers = contributions.flatMap((contribution) => contribution.commands ?? []);

    const openBrowserHandled = routeContributionCommand('apps-browser.open-browser', handlers, commandContext(), {
      source: 'context-menu',
      contextTarget: {
        kind: 'widget',
        widgetId: 'apps-browser-folder-icon.gepa',
        appId: 'gepa',
      },
      payload: {
        appId: 'gepa',
        appName: 'GEPA',
      },
    });
    expect(openBrowserHandled).toBe(true);
    expect(hostContext.openWindow).toHaveBeenCalledTimes(1);
    const [browserPayload] = hostContext.openWindow.mock.calls[0] as [{ content: { appKey: string } }];
    expect(browserPayload.content.appKey).toBe('apps-browser:browser:gepa');

    const getInfoHandled = routeContributionCommand('apps-browser.get-info', handlers, commandContext(), {
      source: 'context-menu',
      contextTarget: {
        kind: 'widget',
        widgetId: 'apps-browser-folder-icon.gepa',
        appId: 'gepa',
      },
      payload: {
        appId: 'gepa',
        appName: 'GEPA',
      },
    });
    expect(getInfoHandled).toBe(true);
    expect(hostContext.openWindow).toHaveBeenCalledTimes(2);
    const [getInfoPayload] = hostContext.openWindow.mock.calls[1] as [{ title: string; content: { appKey: string } }];
    expect(getInfoPayload.content.appKey).toBe('apps-browser:get-info:gepa');
    expect(getInfoPayload.title).toContain('Get Info');

    const healthHandled = routeContributionCommand('apps-browser.open-health', handlers, commandContext());
    expect(healthHandled).toBe(true);
    expect(hostContext.openWindow).toHaveBeenCalledTimes(3);
    const [healthPayload] = hostContext.openWindow.mock.calls[2] as [{ content: { appKey: string } }];
    expect(healthPayload.content.appKey).toBe('apps-browser:health');
  });

  it('routes conversation-level actions through inventory chat command namespace', () => {
    const hostContext = createHostContext();
    const contributions = buildLauncherContributions(launcherRegistry, { hostContext });
    const handlers = contributions.flatMap((contribution) => contribution.commands ?? []);

    const openTimelineHandled = routeContributionCommand(
      'inventory.chat.conv-42.conversation.open-timeline',
      handlers,
      {
        ...commandContext(),
        getState: () => ({ chatProfiles: { availableProfiles: [] } }),
      },
    );
    expect(openTimelineHandled).toBe(true);
    expect(hostContext.openWindow).toHaveBeenCalledTimes(1);
    const [timelinePayload] = hostContext.openWindow.mock.calls[0] as [{ id: string; title: string }];
    expect(timelinePayload.id).toContain('timeline-debug-conv-42');
    expect(timelinePayload.title).toContain('Timeline Debug');

    const replayHandled = routeContributionCommand(
      'inventory.chat.conv-42.conversation.replay-last-turn',
      handlers,
      commandContext(),
    );
    expect(replayHandled).toBe(true);
    expect(hostContext.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'notifications/showToast',
      }),
    );

    const exportHandled = routeContributionCommand(
      'inventory.chat.conv-42.conversation.export-transcript',
      handlers,
      commandContext(),
    );
    expect(exportHandled).toBe(true);
    expect(hostContext.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'notifications/showToast',
      }),
    );

    const profileDispatch = vi.fn();
    const profileHandled = routeContributionCommand(
      'inventory.chat.conv-42.conversation.change-profile',
      handlers,
      {
        ...commandContext(),
        dispatch: profileDispatch,
        getState: () => ({
          chatProfiles: {
            availableProfiles: [{ slug: 'default' }, { slug: 'agent' }],
            selectedProfile: 'default',
            selectedRegistry: 'default',
            selectedByScope: {},
          },
        }),
      },
    );
    expect(profileHandled).toBe(true);
    expect(profileDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'chatProfiles/setSelectedProfile',
        payload: { profile: 'agent', registry: 'default', scopeKey: 'conv:conv-42' },
      }),
    );
  });

  it('keeps host app orchestration-only (no app-specific business imports)', () => {
    const source = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    const forbiddenImports = [
      'apps/inventory',
      'apps/todo',
      'apps/crm',
      'apps/book-tracker-debug',
      'apps/apps-browser',
      'ChatConversationWindow',
      'ConfirmRequestWindowHost',
    ];

    for (const forbiddenImport of forbiddenImports) {
      expect(source).not.toContain(forbiddenImport);
    }
  });

  it('removes legacy standalone desktop shell boot wiring from app roots', () => {
    const appRootSources = [
      readFileSync(new URL('../../../../../go-go-app-inventory/apps/inventory/src/App.tsx', import.meta.url), 'utf8'),
      readFileSync(new URL('../../../../../go-go-os-frontend/apps/todo/src/App.tsx', import.meta.url), 'utf8'),
      readFileSync(new URL('../../../../../go-go-os-frontend/apps/crm/src/App.tsx', import.meta.url), 'utf8'),
      readFileSync(new URL('../../../../../go-go-os-frontend/apps/book-tracker-debug/src/App.tsx', import.meta.url), 'utf8'),
    ];

    for (const source of appRootSources) {
      expect(source).not.toContain('DesktopShell');
      expect(source).toContain("from './launcher/module'");
      expect(source).toContain('renderWindow');
    }
  });
});
