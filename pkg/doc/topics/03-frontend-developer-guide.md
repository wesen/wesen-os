---
Title: Frontend Developer Guide
Slug: frontend-developer-guide
Short: Comprehensive guide for building TypeScript/React frontend app modules in wesen-os, from the LaunchableAppModule contract through manifest, state, contributions, window rendering, and HyperCard VM integration.
Topics:
- frontend
- typescript
- react
- modules
- developer-guide
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

This guide covers everything a TypeScript/React developer needs to build, test, and integrate a frontend app module into the wesen-os launcher shell. It starts with getting started basics and builds to the full contract reference, with concrete examples drawn from the inventory, ARC-AGI, todo, and CRM modules.

For backend module development, see `backend-developer-guide`. For building a complete app with both backend and frontend, see `building-a-full-app`. For workspace setup and operations, see `wesen-os-guide`.

## Getting Started

### Prerequisites

- A running workspace with backend and Vite dev server (see `wesen-os-guide`).
- Node.js 20+ and npm 10+.
- Familiarity with React, Redux Toolkit, and TypeScript.

### Your First Module in 10 Minutes

Create a minimal launcher module. This example creates a "hello-world" app that appears on the desktop and opens a window.

**Step 1:** Create the module file at `apps/<your-app>/src/launcher/module.tsx`:

```tsx
import type { LaunchableAppModule } from '@hypercard/desktop-os';
import type { ReactNode } from 'react';

function HelloWindow({ instanceId }: { instanceId: string }) {
  return (
    <div style={{ padding: 16 }}>
      <h2>Hello World</h2>
      <p>Instance: {instanceId}</p>
    </div>
  );
}

export const helloLauncherModule: LaunchableAppModule = {
  manifest: {
    id: 'hello-world',
    name: 'Hello World',
    icon: '👋',
    launch: { mode: 'window' },
    desktop: { order: 90 },
  },

  buildLaunchWindow: (_ctx, _reason) => ({
    id: 'window:hello-world:main',
    title: 'Hello World',
    icon: '👋',
    bounds: { x: 100, y: 80, w: 400, h: 300 },
    content: { kind: 'app', appKey: 'hello-world:main' },
    dedupeKey: 'hello-world:main',
  }),

  renderWindow: ({ instanceId }): ReactNode => (
    <HelloWindow instanceId={instanceId} />
  ),
};
```

**Step 2:** Create the public export at `apps/<your-app>/src/launcher/public.ts`:

```ts
export { helloLauncherModule } from './module';
```

**Step 3:** Register in `wesen-os/apps/os-launcher/src/app/modules.tsx`:

```tsx
import { helloLauncherModule } from '@hypercard/hello-world/launcher';

export const launcherModules: LaunchableAppModule[] = [
  // ... existing modules
  helloLauncherModule,
];
```

**Step 4:** Add Vite alias in `wesen-os/apps/os-launcher/vite.config.ts`:

```ts
'@hypercard/hello-world/launcher': path.resolve(
  workspaceRoot,
  'my-app-repo/apps/hello-world/src/launcher/public.ts',
),
'@hypercard/hello-world': path.resolve(
  workspaceRoot,
  'my-app-repo/apps/hello-world/src',
),
```

Start the Vite dev server. Your app icon appears on the desktop. Click it to open the window.

### Package and File Conventions

| Location | Purpose |
|---|---|
| `apps/<app>/src/launcher/module.tsx` | `LaunchableAppModule` definition and export |
| `apps/<app>/src/launcher/render<App>.tsx` | Complex window rendering, contributions, adapters |
| `apps/<app>/src/launcher/public.ts` | Public exports consumed by launcher via Vite alias |
| `apps/<app>/src/domain/stack.ts` | HyperCard stack definitions (if using VM cards) |
| `apps/<app>/src/domain/pluginBundle.vm.js` | VM card bundle code (if using VM cards) |
| `apps/<app>/src/features/<domain>/<slice>.ts` | Redux domain slices |
| `apps/<app>/src/reducers.ts` | Public reducer exports for shared state |
| `apps/<app>/src/app/store.ts` | Local Redux store (if app needs its own store, like ARC) |

## The LaunchableAppModule Contract

Every frontend app module implements this interface from `@hypercard/desktop-os`:

```ts
interface LaunchableAppModule {
  manifest: AppManifest;
  state?: LaunchableAppStateConfig;
  buildLaunchWindow: (ctx: LauncherHostContext, reason: LaunchReason) => OpenWindowPayload;
  createContributions?: (ctx: LauncherHostContext) => DesktopContribution[];
  renderWindow: (params: LaunchableAppRenderParams) => ReactNode | null;
  onRegister?: (ctx: LauncherHostContext) => void;
}
```

### AppManifest

The manifest declares your module's identity and presentation:

```ts
interface AppManifest {
  id: string;                    // Must match backend Manifest().AppID
  name: string;                  // Human-readable display name
  icon: string;                  // Emoji or icon identifier
  version?: string;              // Semantic version
  launch: AppManifestLaunchConfig;
  backend?: AppManifestBackendConfig;
  desktop?: AppManifestDesktopIconConfig;
}
```

**id** — Validated by `assertValidAppId` against regex `/^[a-z][a-z0-9-]*$/`. Must be unique across all registered modules. Must match the backend's `Manifest().AppID` exactly — a mismatch causes API resolution failures and "unknown module" errors.

**launch.mode** — `'window'` for standard desktop windows. `'workspace'` for full-workspace apps that take over the screen. Most apps use `'window'`.

**launch.singleton** — When true, only one window of this app can exist. The launcher reuses the existing window instead of opening a new one.

**desktop.order** — Controls icon ordering on the desktop. Lower numbers appear first. Current apps use: inventory (10), todo/crm/books (20-40), arc (80), debug tools (90+).

### State Configuration

Optional. If your app needs persistent Redux state in the launcher store:

```ts
interface LaunchableAppStateConfig {
  stateKey: AppStateKey;  // Format: 'app_<name>'
  reducer: Reducer;
}
```

**stateKey** — Must match regex `/^app_[a-z0-9_]+$/`. The `app_` prefix prevents collisions with engine core reducers. Reserved keys that will be rejected: `pluginCardRuntime`, `windowing`, `notifications`, `debug`, `hypercardArtifacts`.

**When to use module state vs shared reducers:** Module state is for the module's private concerns (launch count, UI preferences, module-specific settings). Domain data that other modules or chat runtime features need to read goes into shared reducers registered in `store.ts`.

Example from inventory:

```ts
state: {
  stateKey: 'app_inventory',
  reducer: launcherStateSlice.reducer,  // Tracks launch count, last reason
},
```

The inventory domain data (items, sales) is registered separately as shared reducers in `store.ts` because the chat runtime needs to read it.

### buildLaunchWindow

Called when the user clicks the app icon, selects a menu command, or the app launches at startup. Returns an `OpenWindowPayload` describing the window to open.

```ts
interface OpenWindowPayload {
  id: string;              // Unique window ID (convention: 'window:<appId>:<instanceId>')
  title: string;           // Window title bar text
  icon?: string;           // Window icon
  bounds: { x: number; y: number; w: number; h: number };
  content: {
    kind: 'app' | 'card';
    appKey?: string;       // For 'app': '<appId>:<instanceId>'
    card?: {               // For 'card': HyperCard session info
      stackId: string;
      cardId: string;
      cardSessionId: string;
    };
  };
  dedupeKey?: string;      // Prevent duplicate windows with same key
}
```

The `reason` parameter indicates how the launch was triggered:

| Reason | When |
|---|---|
| `'icon'` | User clicked the desktop icon |
| `'menu'` | User selected from a menu |
| `'command'` | Programmatic launch via command handler |
| `'startup'` | Automatic launch during app initialization |

Use `dedupeKey` to prevent multiple windows. When a window with the same `dedupeKey` already exists, the shell focuses it instead of creating a new one.

### createContributions

Optional. Returns an array of `DesktopContribution` objects that add behavior to the launcher shell:

```ts
interface DesktopContribution {
  id: string;
  icons?: DesktopIconDef[];
  commands?: DesktopCommandHandler[];
  windowContentAdapters?: WindowContentAdapter[];
  contextActions?: DesktopActionSection[];
  menuSections?: DesktopActionSection[];
}
```

The launcher automatically creates icon-click and app-launch command handlers for every module. Custom contributions are for additional behavior: debug windows, profile selectors, context menu actions, chat commands, and window content adapters for non-standard window types.

### renderWindow

Called for each window whose `content.appKey` resolves to this module. The `appKey` is parsed into `appId` and `instanceId` by `parseAppKey`.

```ts
interface LaunchableAppRenderParams {
  appId: string;          // From parsed appKey
  instanceId: string;     // From parsed appKey
  appKey: string;         // Full app key string
  windowId: string;       // The window's unique ID
  ctx: LauncherRenderContext;
}
```

The returned React tree becomes the window's content. Use `ctx.resolveApiBase(appId)` for HTTP calls and `ctx.resolveWsBase(appId)` for WebSocket connections — never hardcode API paths.

### onRegister

Optional. Called once when the module is registered in the app registry. Use for one-time setup:

```ts
onRegister: (ctx) => {
  // Register chat runtime modules for timeline event handling
  registerChatRuntimeModule({
    id: 'chat.my-app-timeline',
    register: registerMyAppTimelineModule,
  });
  ensureChatModulesRegistered();
},
```

## Host Context and Render Context

### LauncherHostContext

Available during `buildLaunchWindow`, `createContributions`, and `onRegister`:

```ts
interface LauncherHostContext {
  dispatch: (action: unknown) => unknown;
  getState: () => unknown;
  openWindow: (payload: OpenWindowPayload) => void;
  closeWindow: (windowId: string) => void;
  resolveApiBase: (appId: string) => string;   // Returns '/api/apps/<appId>'
  resolveWsBase: (appId: string) => string;    // Returns '/api/apps/<appId>/ws'
}
```

**Why `resolveApiBase` instead of hardcoded paths:** The launcher supports a `--root` flag that mounts everything under a URL prefix. Hardcoded paths break when this flag is used. Always resolve through the context.

### LauncherRenderContext

Available during `renderWindow`:

```ts
interface LauncherRenderContext {
  dispatch: (action: unknown) => unknown;
  getState: () => unknown;
  moduleId: string;                             // Your manifest.id
  stateKey?: AppStateKey;                       // Your state key, if configured
  resolveApiBase?: (appId: string) => string;
  resolveWsBase?: (appId: string) => string;
}
```

The render context adds `moduleId` and `stateKey` so window components know which module they belong to, but removes window management (`openWindow`/`closeWindow`) which is only relevant during launch and contribution setup.

## Window Strategies

### Singleton Window

The simplest strategy. One window per app, reopening focuses the existing window.

```ts
buildLaunchWindow: (_ctx, reason) => ({
  id: 'window:my-app:main',
  title: 'My App',
  bounds: { x: 80, y: 40, w: 600, h: 400 },
  content: { kind: 'app', appKey: 'my-app:main' },
  dedupeKey: 'my-app:main',  // Prevents duplicate windows
}),
```

Used by: todo, CRM, book-tracker.

### Multi-Instance Windows

Each action opens a new window with a unique instance ID.

```ts
buildLaunchWindow: (_ctx, _reason) => {
  const instanceId = crypto.randomUUID();
  return {
    id: `window:my-app:${instanceId}`,
    title: 'My App',
    bounds: { x: 80 + Math.random() * 40, y: 40 + Math.random() * 40, w: 600, h: 400 },
    content: { kind: 'app', appKey: `my-app:${instanceId}` },
    // No dedupeKey — each click opens a new window
  };
},
```

Used by: inventory chat windows (each conversation gets its own window).

### Folder + Child Windows

A folder window lists options; clicking opens child windows. The folder uses `dedupeKey` for singleton behavior.

```ts
buildLaunchWindow: (_ctx, reason) => ({
  id: 'window:my-app:folder',
  title: 'My App',
  bounds: { x: 92, y: 44, w: 420, h: 320 },
  content: { kind: 'app', appKey: 'my-app:folder' },
  dedupeKey: 'my-app:folder',
}),

renderWindow: ({ appKey, ctx }) => {
  const instanceId = parseAppKey(appKey).instanceId;
  if (instanceId === 'folder') {
    return <FolderWindow onOpenChild={(id) => ctx.openWindow(buildChildWindow(id))} />;
  }
  return <ChildWindow itemId={instanceId} />;
},
```

Used by: inventory (folder lists conversations/tools), ARC-AGI (folder lists workspace options).

### Card Windows

Windows whose content is a HyperCard stack session. Content kind is `'card'`.

```ts
buildLaunchWindow: (_ctx, _reason) => {
  const sessionId = `session-${crypto.randomUUID()}`;
  return {
    id: `window:my-app:card:${sessionId}`,
    title: 'My App Cards',
    bounds: { x: 120, y: 44, w: 760, h: 560 },
    content: {
      kind: 'card',
      card: {
        stackId: MY_STACK.id,
        cardId: MY_STACK.homeCard,
        cardSessionId: sessionId,
      },
    },
  };
},
```

Card windows require a window content adapter (see Contributions section) to render the `PluginCardSessionHost`.

### Mixed Strategies

ARC-AGI combines all approaches: a folder window, React windows (game player), and card windows (demo stack). The module's `createContributions` registers window content adapters for each type.

## Contributions: Commands, Menus, Adapters

### Automatic Contributions

The launcher automatically creates for every module:

- A desktop icon (from `manifest.icon` and `manifest.name`).
- An `icon.open.<iconId>` command handler (triggered by icon click).
- An `app.launch.<appId>` command handler (triggered by programmatic launch).

These are generated by `buildLauncherContributions` and don't need to be in `createContributions`.

### Command Handlers

Custom command handlers respond to named commands:

```ts
createContributions: (ctx): DesktopContribution[] => [{
  id: 'my-app.commands',
  commands: [{
    id: 'my-app.open-settings',
    priority: 100,
    matches: (commandId) => commandId === 'my-app.settings',
    run: (commandId, _cmdCtx) => {
      ctx.openWindow(buildSettingsWindow());
      return 'handled';
    },
  }],
}],
```

Return `'handled'` to stop command propagation, or `'pass'` to let other handlers try. Lower priority numbers run first.

### Window Content Adapters

Adapters render windows with non-standard content. They're essential for card windows and multi-type modules:

```ts
createContributions: (ctx): DesktopContribution[] => [{
  id: 'my-app.adapters',
  windowContentAdapters: [{
    id: 'my-app.card-adapter',
    canRender: (window) =>
      window.content.kind === 'card' &&
      window.content.card?.stackId === MY_STACK.id,
    render: (window) => (
      <PluginCardSessionHost
        windowId={window.id}
        sessionId={window.content.card!.cardSessionId}
        stack={MY_STACK}
      />
    ),
  }],
}],
```

The launcher checks all registered adapters via `canRender` and uses the first match. If no adapter matches and the content is `kind: 'app'`, the default `renderWindow` path handles it.

### Context Actions and Menus

Register context menu sections and action entries from within window components:

```tsx
function MyAppWindow({ windowId }: { windowId: string }) {
  useRegisterWindowContextActions(windowId, [
    { id: 'refresh', label: 'Refresh', icon: '🔄', action: () => fetchData() },
    { id: 'export', label: 'Export', icon: '📤', action: () => exportData() },
  ]);

  useRegisterWindowMenuSections(windowId, [
    { id: 'my-app-menu', label: 'My App', items: [
      { id: 'settings', label: 'Settings...', action: () => openSettings() },
    ]},
  ]);

  return <div>...</div>;
}
```

## Registering in the Launcher

### Module List

Add your import to `wesen-os/apps/os-launcher/src/app/modules.tsx`:

```tsx
import { myAppLauncherModule } from '@hypercard/my-app/launcher';

export const launcherModules: LaunchableAppModule[] = [
  inventoryLauncherModule,
  todoLauncherModule,
  // ...
  myAppLauncherModule,
];
```

Module ordering in this array affects icon ordering only if modules share the same `desktop.order` value. Prefer setting `desktop.order` explicitly.

### Vite Aliases

Add aliases in `wesen-os/apps/os-launcher/vite.config.ts` for all import paths your module exposes:

```ts
// Subpath exports (launcher must use these specific paths)
'@hypercard/my-app/launcher': path.resolve(
  workspaceRoot, 'my-app-repo/apps/my-app/src/launcher/public.ts'),
'@hypercard/my-app/reducers': path.resolve(
  workspaceRoot, 'my-app-repo/apps/my-app/src/reducers.ts'),

// Full package (for internal imports within the launcher)
'@hypercard/my-app': path.resolve(
  workspaceRoot, 'my-app-repo/apps/my-app/src'),
```

**Why Vite aliases instead of npm package resolution:** The app repositories are not published npm packages. Vite aliases resolve imports directly to source files in sibling repositories, enabling hot module replacement during development.

### Shared Reducers

If your app has domain reducers that other modules or chat runtime features need, add them to `sharedReducers` in `wesen-os/apps/os-launcher/src/app/store.ts`:

```ts
import { myDomainReducer } from '@hypercard/my-app/reducers';

export const { store } = createLauncherStore(launcherModules, {
  sharedReducers: {
    // ... existing shared reducers
    myDomain: myDomainReducer,
  },
});
```

Shared reducer keys must not collide with module state keys or engine core keys.

### Vite Proxy Rules

For dev-mode API access, add proxy rules in `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api/apps/my-app': {
      target: inventoryBackendTarget,  // or your backend's address
      changeOrigin: true,
    },
  },
},
```

## Redux State Management

### Module State vs Shared State

**Module state** (`stateKey: 'app_<name>'`) is private to the module. Only the module's own components should read it. Good for: launch counters, UI preferences, module-level settings.

**Shared state** (registered in `store.ts` `sharedReducers`) is accessible to all modules and chat runtime features. Good for: domain entities (items, contacts, tasks), timeline state, chat session state.

### createLauncherStore

`createLauncherStore` from `@hypercard/desktop-os` merges three categories of reducers:

1. **Engine core reducers** (always present): `windowing`, `notifications`, `debug`, `pluginCardRuntime`, `hypercardArtifacts`.
2. **Shared reducers** (from `store.ts`): domain data like `inventory`, `sales`, `contacts`, `tasks`.
3. **Module reducers** (from each module's `state.reducer`): private module state like `app_inventory`, `app_arc_agi`.

Key collision detection ensures no two sources register the same key.

### Accessing Module State

From within your module's components, use the standard Redux hooks:

```ts
import { useSelector } from 'react-redux';

function MyComponent() {
  // Read module-private state
  const myState = useSelector((state: any) => state.app_my_app);

  // Read shared domain state
  const items = useSelector((state: any) => state.myDomain.items);
}
```

For type-safe access, `@hypercard/desktop-os` provides helper selectors:

```ts
import { selectModuleState, createModuleSelector } from '@hypercard/desktop-os';

// Read raw module state
const state = selectModuleState(rootState, 'app_my_app');

// Create a reusable selector
const selectLaunchCount = createModuleSelector('app_my_app', (slice) => slice?.launchCount ?? 0);
```

## HyperCard VM Integration

This section covers how frontend modules interact with the HyperCard runtime for interactive cards. If your app doesn't use VM cards, skip to Case Studies.

### Stack Definitions

A stack is a TypeScript object that defines the cards available in a HyperCard session:

```ts
import type { StackDefinition } from '@hypercard/hypercard-runtime';
import bundleCode from './pluginBundle.vm.js?raw';

export const MY_STACK: StackDefinition = {
  id: 'my-app-stack',
  name: 'My App Cards',
  homeCard: 'dashboard',
  bundleCode,
  cards: ['dashboard', 'detail', 'settings'],
};
```

The `?raw` import suffix loads the VM bundle as a string — it runs inside QuickJS, not in the browser.

### Plugin Bundle Code

VM bundles define cards using the `defineStackBundle` API available in the QuickJS sandbox:

```js
defineStackBundle(function() {
  defineCard('dashboard', {
    render: function(state) {
      return {
        type: 'column',
        children: [
          { type: 'text', value: 'Dashboard' },
          { type: 'button', label: 'View Details', event: 'openDetail' },
        ]
      };
    },
    handlers: {
      openDetail: function({ dispatchCardAction, dispatchSystemCommand }, args) {
        dispatchSystemCommand('navigate', { card: 'detail' });
      },
      save: function({ dispatchDomainAction }, args) {
        dispatchDomainAction('my-app', 'saveItem', { id: args.id, data: args.data });
      },
    },
  });
});
```

### Intent Dispatch Scopes

VM handlers receive dispatch functions for four scopes:

**`dispatchCardAction(actionType, payload)`** — Card-local ephemeral state. Resets when the card unmounts. Use for form values, toggles, loading indicators.

```js
dispatchCardAction('set', { path: 'form.name', value: 'New Item' });
dispatchCardAction('patch', { loading: true });
dispatchCardAction('reset', {});
```

**`dispatchSessionAction(actionType, payload)`** — Session-wide state shared across cards. Persists during card navigation within the same session. Use for multi-step wizard state.

```js
dispatchSessionAction('patch', { selectedItems: { [id]: true } });
```

**`dispatchDomainAction(domain, actionType, payload)`** — Bridges to the Redux store. The resulting action type is `<domain>/<actionType>`. This is the primary mechanism for VM cards to trigger business logic.

```js
dispatchDomainAction('inventory', 'saveItem', { sku: 'SKU-123', qty: 7 });
// Produces Redux action: { type: 'inventory/saveItem', payload: { sku: 'SKU-123', qty: 7 } }
```

**`dispatchSystemCommand(command, payload)`** — Shell-level commands: navigate to a card, show a notification, close the window.

```js
dispatchSystemCommand('navigate', { card: 'detail', param: itemId });
dispatchSystemCommand('notify', { message: 'Saved successfully' });
dispatchSystemCommand('close', {});
```

### The Naming Contract

The most important rule in intent routing: `dispatchDomainAction(domain, actionType, payload)` produces a Redux action with type `<domain>/<actionType>`. Your reducer or middleware must handle this exact string.

```js
// VM handler:
dispatchDomainAction('inventory', 'updateQty', { sku: 'SKU-123', qty: 7 });

// Must match this reducer case:
builder.addCase('inventory/updateQty', (state, action) => {
  // handle it
});
```

A mismatch (typo, wrong casing, different domain name) causes the action to be silently ignored — no error, no state change, no UI update. This is the most common bug class when wiring VM cards.

### Two Patterns for Domain Intent Handling

**Pattern 1: Direct Reducer (Inventory Style)** — Domain action types map directly to reducer cases. The reducer performs synchronous state updates. Use when domain actions are pure state transformations.

```
VM handler → dispatchDomainAction('inventory', 'updateQty', payload)
  → Redux action { type: 'inventory/updateQty', payload }
  → inventorySlice reducer handles it
  → State updates synchronously
```

**Pattern 2: Bridge Middleware (ARC Style)** — Middleware intercepts domain actions, makes async API calls, dispatches results. Use when domain actions require external I/O.

```
VM handler → dispatchDomainAction('arc', 'command.request', payload)
  → Redux action { type: 'arc/command.request', payload }
  → Bridge middleware intercepts, calls /api/apps/arc-agi/...
  → On response: dispatch { type: 'arc/command.response', result }
  → Effect host patches runtime session state
```

The ARC bridge implementation consists of:
- `bridge/contracts.ts` — action type definitions
- `bridge/slice.ts` — Redux slice for bridge state
- `bridge/middleware.ts` — API call middleware
- `bridge/ArcPendingIntentEffectHost.tsx` — React component that feeds results back into the VM session

### PluginCardSessionHost

The React component that manages a card session lifecycle:

```tsx
<PluginCardSessionHost
  windowId={window.id}
  sessionId={sessionId}
  stack={MY_STACK}
/>
```

It handles: loading the bundle code into QuickJS, injecting runtime cards from the artifact registry, rendering cards via `PluginCardRenderer`, dispatching events through the intent routing pipeline, and managing session state.

### Runtime Card Injection Pipeline

Backend-generated cards flow through this pipeline:

1. **Backend** emits SEM events (`hypercard.card.v2`, `hypercard.widget.v1`) with `runtimeCardId` and `runtimeCardCode` fields.
2. **WebSocket** delivers the event envelope to the frontend.
3. **Timeline mapper** normalizes the event into a timeline entity.
4. **Artifact projection middleware** extracts the card registration.
5. **`registerRuntimeCard`** stores the card definition in the runtime registry.
6. **`PluginCardSessionHost`** calls `injectPendingCardsWithReport` to load pending cards into the active QuickJS session.

To use this pipeline, register a chat runtime module in your frontend setup:

```ts
registerChatRuntimeModule({
  id: 'chat.my-app-timeline',
  register: registerHypercardTimelineModule,
});
ensureChatModulesRegistered();
```

## Case Studies

### Inventory Frontend

The most full-featured module. Key file: `go-go-app-inventory/apps/inventory/src/launcher/module.tsx` and `renderInventoryApp.tsx`.

**Patterns demonstrated:**
- State: private `app_inventory` (launch tracking) + shared `inventory`/`sales` reducers.
- Windows: folder window → chat windows, event viewer, timeline debugger, redux perf, runtime card debug.
- Contributions: 700+ lines of command handlers for chat operations, profile selection, conversation management, debug tools.
- Chat integration: `registerChatRuntimeModule` for hypercard timeline events, `ensureChatModulesRegistered`.
- Card support: `PluginCardSessionHost` adapter for card-type windows.
- Context menus: per-window context actions and menu sections.

### ARC-AGI Frontend

Multi-window module with bridge middleware. Key file: `go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/module.tsx`.

**Patterns demonstrated:**
- No module state (no `state` config) — uses local Redux store per window instance.
- Windows: folder → React game player or HyperCard demo stack.
- Two window content adapters: one for card windows (demo stack), one for app windows (folder, player).
- Bridge middleware for async API calls (`bridge/middleware.ts`).
- Effect host component (`ArcPendingIntentEffectHost`) that watches for pending domain intents and makes API calls.
- Local store per window: `ArcPlayerHost` creates a `Provider` with its own store, isolating state.

### Todo / CRM / Book Tracker

Simpler modules using the HyperCard engine DSL. These use `createDSLApp` from `@hypercard/engine` for stack-based card apps with shared selectors and actions.

**Patterns demonstrated:**
- Singleton window with `dedupeKey`.
- DSL-based card definitions (no VM bundle needed — cards defined in TypeScript).
- Shared selectors and actions resolved through the engine's scoped state system.
- Storybook integration via `createStoryHelpers`.

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| Manifest ID doesn't match backend `AppID` | API resolution fails, "unknown module" | Use identical string |
| State key collision | Store creation throws | Use `app_<unique_name>` convention |
| Missing Vite alias | Frontend build fails | Add alias for every import path |
| Hardcoded API paths (`/api/apps/my-app/items`) | Breaks with `--root` flag | Use `ctx.resolveApiBase(appId)` |
| Intent action type mismatch | Silent no-op — no error, no state change | Match `<domain>/<actionType>` exactly |
| Missing chat module registration | Hypercard timeline events invisible | Call `registerChatRuntimeModule` + `ensureChatModulesRegistered` |
| Using engine core reducer key | Store creation throws | Avoid `windowing`, `notifications`, `debug`, `pluginCardRuntime`, `hypercardArtifacts` |

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| App icon missing from desktop | Module not in `launcherModules` | Add to `modules.tsx` |
| "Unknown app module" window | Module not registered or ID mismatch | Check `modules.tsx` and manifest `id` |
| Window opens but content is blank | `renderWindow` returns null | Check appKey parsing and conditional render logic |
| Redux state undefined for module | Missing state config or shared reducer | Add `state` to module or reducer to `store.ts` |
| Vite build fails with resolution error | Missing alias | Add all required aliases in `vite.config.ts` |
| API calls return 404 in dev | Missing Vite proxy rule | Add proxy rule for `/api/apps/<id>` |
| VM handler runs but no state change | Domain action type mismatch | Verify `<domain>/<actionType>` matches reducer exactly |
| Runtime card not rendered | Missing chat module registration or broken injection pipeline | Register timeline module, check each pipeline step |

## See Also

- `wesen-os-guide` — Workspace setup and build pipeline
- `backend-developer-guide` — Building the backend side of your app
- `building-a-full-app` — Complete backend+frontend integration walkthrough
