---
Title: HyperCard Environment Guide
Slug: hypercard-environment-guide
Short: Deep guide to the HyperCard runtime environment — the sandboxed JavaScript card system that powers interactive UI in wesen-os, covering the QuickJS sandbox, UI DSL, intent routing, assistant-generated cards, and the rendering pipeline.
Topics:
- hypercard
- vm
- cards
- quickjs
- sandbox
- ui-dsl
- developer-guide
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

This guide explains the HyperCard runtime environment: how it works, why it exists, and how to build interactive cards that run safely inside a sandboxed JavaScript engine. It covers the full lifecycle from card definition through rendering and event handling, with particular attention to the security model, the UI description language, and the intent routing system that connects cards to your application's state and APIs.

For integrating HyperCard cards into a frontend module, see `frontend-developer-guide`. For building a complete app with optional HyperCard support, see `building-a-full-app`. For workspace setup, see `wesen-os-guide`.

## What HyperCard Is and Why It Exists

HyperCard is a system for building interactive UI cards that run inside a sandboxed JavaScript engine. The name pays homage to Apple's original HyperCard from 1987 — a tool that let non-programmers build interactive applications by combining cards, buttons, and scripts. The wesen-os HyperCard runtime carries forward that spirit in a modern context: cards are small, composable UI units whose logic runs in isolation from the host application.

The central insight behind HyperCard is that many interactive UI needs can be satisfied by a constrained programming model. Rather than giving card code full access to the browser DOM, the network, and the application state, HyperCard provides a narrow interface: cards receive state as input, return a UI description tree as output, and communicate with the outside world exclusively through structured intents. This constraint makes cards safe to run from untrusted sources — including cards generated dynamically by an AI assistant during a chat conversation.

Consider the architecture from a security perspective. When a user is chatting with an AI assistant about their inventory data, the assistant might want to present an interactive widget that lets the user adjust quantities, select items, or confirm an action. If this widget ran as arbitrary React code in the browser, it could access cookies, make network requests, or read other users' data. By running it inside QuickJS — a lightweight JavaScript engine compiled to WebAssembly — the widget code is as isolated as code running on a separate machine. It can only see the state the host explicitly provides, and it can only affect the outside world through validated intent messages.

This architecture enables three key capabilities:

- **AI-generated interactive UI.** The chat assistant can emit JavaScript card definitions as part of its response. These cards are injected into the runtime and rendered immediately, turning a text-based chat into a rich interactive experience — without any security risk from running AI-generated code.

- **Plugin isolation.** Third-party card bundles run in the same sandboxed environment. A card from an untrusted source cannot access the file system, the network, or any browser API. Its only interface to the world is the intent system, which is governed by a capability policy.

- **Portable card definitions.** Because cards are pure JavaScript functions that consume state and produce UI trees, they can be serialized, transmitted, stored, and replayed. The backend can generate cards as structured events, the frontend can render them, and the same card definition works in Storybook, in the desktop shell, and in automated tests.

## Architecture Overview

The HyperCard runtime consists of several layers that work together:

```
+------------------------------------------------------------------+
|                        Browser (React)                            |
|                                                                   |
|  +--------------------+    +----------------------------------+   |
|  | PluginCardSession  |    |  Redux Store                     |   |
|  | Host (React)       |    |                                  |   |
|  |                    |    |  pluginCardRuntime  (sessions,    |   |
|  |  - manages session |    |    card state, session state)     |   |
|  |  - calls render()  |    |                                  |   |
|  |  - calls event()   |    |  windowing  (nav, windows)       |   |
|  |  - routes intents  |    |                                  |   |
|  +--------+-----------+    |  <domain>  (app-specific state)  |   |
|           |                +----------------------------------+   |
|           |                         ^                             |
|           v                         | dispatch                    |
|  +--------------------+             |                             |
|  | QuickJS (WASM)     |    +--------+----------+                  |
|  |                    |    | Intent Router      |                  |
|  |  stack-bootstrap   |    |                    |                  |
|  |  card definitions  |    |  card → Redux      |                  |
|  |  render functions  |    |  session → Redux   |                  |
|  |  event handlers    |    |  domain → Redux    |                  |
|  |  ui helpers        |    |  system → shell    |                  |
|  +--------------------+    +-------------------+                  |
+------------------------------------------------------------------+
```

**QuickJS (WASM)** is a complete JavaScript engine compiled to WebAssembly. It runs card code in a deterministic, memory-limited sandbox with no access to browser APIs. Each card session gets its own QuickJS runtime with configurable memory limits (default: 32 MB), stack limits (1 MB), and execution timeouts (render: 100ms, events: 100ms, loading: 1000ms).

**PluginCardSessionHost** is the React component that bridges the sandboxed runtime and the browser. It manages the lifecycle of a card session: loading the stack bundle, rendering cards by calling into QuickJS, dispatching events when the user interacts with the UI, and routing the resulting intents to the appropriate Redux actions or shell commands.

**Intent Router** translates structured intents from card handlers into Redux actions or shell commands. It enforces capability policies that control which domains and system commands a card session is allowed to access.

**Redux Store** holds all application state. Card state and session state are managed by the `pluginCardRuntime` slice. Domain state (inventory items, tasks, etc.) is managed by domain-specific slices. The intent router dispatches domain intents as Redux actions with type `<domain>/<actionType>`.

## The QuickJS Sandbox

QuickJS is not a simplified JavaScript interpreter — it is a full ECMAScript 2023 implementation. It supports classes, async/await, generators, destructuring, template literals, and all modern JavaScript features. However, within the HyperCard sandbox, card code runs in a carefully controlled environment.

### What Is Available

Inside the sandbox, card code has access to:

- **Standard JavaScript.** All language features: variables, functions, classes, closures, promises, iterators, regular expressions, Math, JSON, Date, Map, Set, Array methods, String methods, and all other built-in objects.

- **`globalThis.ui`** — A helper object with factory functions for creating UI node trees. Functions include `ui.text()`, `ui.button()`, `ui.input()`, `ui.row()`, `ui.column()`, `ui.panel()`, `ui.badge()`, `ui.table()`, `ui.dropdown()`, `ui.selectableTable()`, and `ui.gridBoard()`.

- **`defineStackBundle(factory)`** — The top-level registration function. Call this once per bundle to register all cards.

- **`defineCard(cardId, definition)`** — Register a single card with a render function and event handlers.

- **`defineCardRender(cardId, renderFn)`** — Replace or set a card's render function.

- **`defineCardHandler(cardId, handlerName, handlerFn)`** — Replace or set a single event handler.

### What Is Not Available

The sandbox deliberately excludes:

- **DOM APIs.** No `document`, `window`, `navigator`, `localStorage`, `sessionStorage`, `indexedDB`.
- **Network APIs.** No `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`.
- **Timer APIs.** No `setTimeout`, `setInterval`, `requestAnimationFrame`.
- **File system.** No `fs`, no file reading or writing.
- **Node.js APIs.** No `require`, `process`, `Buffer`, `crypto` (the Node module).
- **Browser events.** No `addEventListener`, no direct event handling.
- **Console.** No `console.log` (though errors are surfaced through the host).

This means card code cannot make network requests, read cookies, access the DOM, or interact with the browser in any way except through the structured intent system. A card that tries to call `fetch()` or access `document` will get a runtime error — not a security vulnerability.

### Resource Limits

Each QuickJS runtime session is constrained by:

| Resource | Default Limit | Purpose |
|---|---|---|
| Memory | 32 MB | Prevents memory exhaustion from infinite data structures |
| Stack | 1 MB | Prevents stack overflow from deep recursion |
| Load timeout | 1000 ms | Maximum time to load and evaluate a stack bundle |
| Render timeout | 100 ms | Maximum time to produce a UI tree |
| Event timeout | 100 ms | Maximum time to process an event handler |

If any limit is exceeded, the runtime throws an error with code `RUNTIME_TIMEOUT` or `RUNTIME_ERROR`. The session host catches these errors and displays them to the user. The sandbox does not crash — it remains usable for subsequent operations.

### Session Isolation

Each card session runs in its own QuickJS runtime instance. Sessions cannot read or write each other's state, call each other's functions, or interfere with each other in any way. If one session's code enters an infinite loop, only that session is affected — other sessions and the host application continue normally.

## The Render-Event Cycle

HyperCard cards follow a unidirectional data flow pattern similar to React or Elm. Understanding this cycle is essential for writing correct card code.

```
  State                    UI Tree                   User Action
    |                        |                          |
    v                        v                          v
+--------+    render()    +------+    click/input    +-------+
| card   | ------------> | UI   | ----------------> | event |
| state  |               | tree |                   | name  |
| session|               | (JSON|                   | + args|
| state  |               |  DSL)|                   |       |
| global |               +------+                   +---+---+
| state  |                                              |
+---+----+                                              |
    ^                                                   |
    |                    handler()                      |
    +--- intent routing <-------------------------------+
         (dispatch to Redux                    handler returns
          or shell commands)                   intents array
```

**Step 1: Render.** The host calls the card's `render(state)` function, passing an object with three state slices: `cardState` (local to this card), `sessionState` (shared across cards in this session), and `globalState` (projected from the Redux store). The render function returns a UI node tree — a plain JavaScript object describing the desired UI.

**Step 2: Display.** The host validates the UI tree against the UI schema, then passes it to `PluginCardRenderer`, which converts each node into React components. Buttons get click handlers, inputs get change handlers, and layout nodes become flex containers.

**Step 3: User interaction.** When the user clicks a button or types in an input, the renderer looks up the event reference attached to that UI element. The event reference specifies a handler name and optional arguments.

**Step 4: Event dispatch.** The host calls the card's event handler function inside QuickJS. The handler receives a context object with dispatch functions and the current state. It calls dispatch functions to produce intents — structured messages describing what should happen.

**Step 5: Intent routing.** The host collects all intents returned by the handler and routes each one according to its scope: card intents update card-local state, session intents update session-wide state, domain intents become Redux actions, and system intents trigger shell commands (navigation, notifications, window management).

**Step 6: State update.** The Redux store processes the dispatched actions, state changes propagate through selectors, and the host calls render() again with the new state. The cycle repeats.

This cycle is synchronous from the card's perspective. The render function receives state and returns a tree. The event handler receives state and returns intents. There are no callbacks, no promises, no async operations within card code. Asynchronous operations (API calls, WebSocket messages) happen in the host layer, outside the sandbox.

## The UI Description Language

Card render functions return UI trees made of nodes. Each node has a `kind` field that determines its type, and additional fields for content, props, and children. The `ui` helper object provides factory functions that make building trees more convenient than constructing raw objects.

### Layout Nodes

Layout nodes arrange their children. They have a `children` array of child nodes.

**`panel`** — A vertical flex container with padding and gap. Use for top-level card layout.

```js
ui.panel([
  ui.text('Title'),
  ui.button('Action'),
])
// Equivalent to: { kind: 'panel', children: [...] }
```

**`column`** — A vertical flex container with gap but no padding. Use for grouping related elements.

```js
ui.column([
  ui.text('Item 1'),
  ui.text('Item 2'),
])
```

**`row`** — A horizontal flex container with gap. Use for side-by-side elements.

```js
ui.row([
  ui.badge('Status'),
  ui.text('Active'),
  ui.button('Edit'),
])
```

### Content Nodes

**`text`** — Displays a string. The primary way to show text content.

```js
ui.text('Hello, world')
ui.text('Count: ' + state.cardState.count)
```

**`badge`** — A small pill-shaped label. Good for status indicators, tags, and categories.

```js
ui.badge('Active')
ui.badge('v2.1')
```

### Interactive Nodes

**`button`** — A clickable button. The `onClick` event reference specifies which handler to call when clicked.

```js
ui.button('Save', {
  onClick: { handler: 'save', args: { id: item.id } },
  variant: 'primary',  // 'default' | 'primary' | 'danger'
})
```

**`input`** — A text input field. The `onChange` event fires on every keystroke with a `{ value }` payload merged into the event args.

```js
ui.input(state.cardState.searchText || '', {
  placeholder: 'Search...',
  onChange: { handler: 'updateSearch' },
})
```

When the user types "hello", the handler receives `{ value: 'hello' }` as its args. A typical pattern stores the value in card state:

```js
handlers: {
  updateSearch: function(ctx, args) {
    ctx.dispatchCardAction('patch', { searchText: args.value });
  },
}
```

**`dropdown`** — A select menu with string options. The `onSelect` event fires with `{ index, value }`.

```js
ui.dropdown(['All', 'Active', 'Completed'], {
  selected: state.cardState.filterIndex || 0,
  onSelect: { handler: 'setFilter' },
  width: 150,
})
```

### Data Display Nodes

**`table`** — A static read-only table. Headers are strings, rows are arrays of values.

```js
ui.table(
  [
    ['SKU-001', 'Widget A', 42],
    ['SKU-002', 'Widget B', 17],
  ],
  { headers: ['SKU', 'Name', 'Qty'] }
)
```

**`selectableTable`** — An interactive table with row selection, search, and click handlers.

```js
ui.selectableTable(
  [
    ['SKU-001', 'Widget A', 42],
    ['SKU-002', 'Widget B', 17],
  ],
  {
    headers: ['SKU', 'Name', 'Qty'],
    mode: 'single',           // 'single' or 'multiple'
    rowKeyIndex: 0,            // Which column provides the row key
    searchable: true,
    searchPlaceholder: 'Filter items...',
    emptyMessage: 'No items found',
    selectedRowKeys: state.cardState.selectedKeys || [],
    onSelectionChange: { handler: 'onSelect' },
    onRowClick: { handler: 'onRowClick' },
    onSearchChange: { handler: 'onSearch' },
  }
)
```

Selection change fires with `{ selectedRowKeys: string[] }`. Row click fires with `{ rowIndex, rowKey, rowValues }`. Search change fires with `{ value }`.

**`gridBoard`** — A grid of cells, used for board-game-like interfaces. Each cell can have a value, label, color, and disabled state.

```js
ui.gridBoard({
  rows: 3,
  cols: 3,
  cells: [
    { value: 'X', color: '#ff0000' },
    { value: '', label: '2' },
    { value: 'O', color: '#0000ff' },
    // ... 6 more cells
  ],
  selectedIndex: state.cardState.selected,
  cellSize: 'medium',  // 'small' | 'medium' | 'large'
  onSelect: { handler: 'cellClick' },
})
```

Cell selection fires with `{ row, col, index }`.

### Building Complex Layouts

Nodes compose naturally. A realistic card might look like this:

```js
render: function(state) {
  var items = state.sessionState.items || [];
  var filter = state.cardState.filter || 'all';

  var filtered = items;
  if (filter === 'active') {
    filtered = items.filter(function(i) { return i.status === 'active'; });
  }

  return ui.panel([
    ui.row([
      ui.text('Inventory Dashboard'),
      ui.badge(filtered.length + ' items'),
    ]),
    ui.dropdown(['All', 'Active', 'Completed'], {
      selected: filter === 'all' ? 0 : filter === 'active' ? 1 : 2,
      onSelect: { handler: 'setFilter' },
    }),
    ui.selectableTable(
      filtered.map(function(item) {
        return [item.sku, item.name, item.qty];
      }),
      {
        headers: ['SKU', 'Name', 'Qty'],
        mode: 'single',
        rowKeyIndex: 0,
        onRowClick: { handler: 'openItem' },
      }
    ),
    ui.row([
      ui.button('Refresh', { onClick: { handler: 'refresh' } }),
      ui.button('New Item', {
        onClick: { handler: 'newItem' },
        variant: 'primary',
      }),
    ]),
  ]);
}
```

### The `ui` Helper vs Raw Objects

The `ui` helper functions are convenience wrappers. You can always construct nodes as plain objects:

```js
// These are equivalent:
ui.button('Save', { onClick: { handler: 'save' }, variant: 'primary' })

{ kind: 'button', props: { label: 'Save', onClick: { handler: 'save' }, variant: 'primary' } }
```

The `ui` helper is injected into the QuickJS sandbox at bootstrap time and is always available. It provides validation and default values that raw objects do not.

## Stacks and Cards

### Stack Definition

A stack is a collection of cards bundled with metadata. On the TypeScript side, stacks are defined as `CardStackDefinition` objects:

```ts
import type { CardStackDefinition } from '@go-go-golems/os-core';
import bundleCode from './pluginBundle.vm.js?raw';

export const MY_STACK: CardStackDefinition = {
  id: 'my-app-stack',
  name: 'My App Cards',
  homeCard: 'dashboard',
  cards: {
    dashboard: { title: 'Dashboard' },
    detail: { title: 'Item Detail' },
    settings: { title: 'Settings' },
  },
  plugin: {
    bundleCode,
    capabilities: {
      domains: { 'my-app': 'readwrite' },
      system: { 'nav.*': true, 'notify': true },
    },
  },
};
```

The `plugin.bundleCode` field contains the JavaScript source code that will be evaluated inside QuickJS. The `?raw` Vite import suffix loads the file as a string rather than executing it in the browser.

The `plugin.capabilities` field defines the capability policy for this stack's sessions — which domains can be accessed and which system commands are allowed.

### Card Definition

Inside the bundle code, each card is defined with a render function and optional event handlers:

```js
defineStackBundle(function() {
  // Stack-level metadata (optional)
  return {
    id: 'my-stack',
    title: 'My Stack',
    initialSessionState: { selectedItemId: null },
    initialCardState: {
      dashboard: { filterText: '' },
    },
    cards: {
      dashboard: {
        render: function(state) { /* return UI tree */ },
        handlers: {
          onSearch: function(ctx, args) { /* handle event */ },
          onItemClick: function(ctx, args) { /* handle event */ },
        },
      },
      detail: {
        render: function(state) { /* return UI tree */ },
        handlers: {
          save: function(ctx, args) { /* handle event */ },
          back: function(ctx) { /* handle event */ },
        },
      },
    },
  };
});
```

The factory function passed to `defineStackBundle` receives a `{ ui }` object with the UI helper, but `ui` is also available as a global — both work.

### Navigation Between Cards

Cards navigate to each other using system commands:

```js
// Navigate forward to a card
ctx.dispatchSystemCommand('nav.go', { cardId: 'detail', param: itemId });

// Navigate back to the previous card
ctx.dispatchSystemCommand('nav.back', {});
```

Navigation is managed by the windowing system. The `sessionNavGo` and `sessionNavBack` actions maintain a navigation stack per session. The `param` field is available in `globalState.nav.param` on the target card, allowing data to be passed between cards.

The navigation stack enables back-button behavior. When a user navigates from dashboard to detail to settings, pressing back returns to detail, then back again returns to dashboard.

## The Four Intent Scopes

When an event handler runs, it receives a context object with four dispatch functions. Each function targets a different scope of the application, creating a clear hierarchy from local UI state to global application behavior.

### Card Scope

Card intents manage ephemeral state local to one card. This state resets when the user navigates away from the card and returns. Use card state for form values, loading indicators, toggle states, and other UI-specific data that doesn't need to persist across navigation.

```js
// Set a value at a specific path
ctx.dispatchCardAction('set', { path: 'form.name', value: 'New Widget' });

// Merge values into existing state
ctx.dispatchCardAction('patch', { loading: true, error: null });

// Reset all card state to initial values
ctx.dispatchCardAction('reset', {});
```

Card state appears in the render function as `state.cardState`. The `pluginCardRuntime` Redux slice manages card state per `(sessionId, cardId)` pair.

### Session Scope

Session intents manage state shared across all cards in a session. This state persists during card navigation within the same session but is lost when the session is destroyed (typically when the window closes). Use session state for multi-step wizard data, selected items that multiple cards need to see, and accumulated results.

```js
// Store a selected item ID that the detail card will read
ctx.dispatchSessionAction('patch', { selectedItemId: args.id });

// Accumulate selections across multiple interactions
ctx.dispatchSessionAction('patch', {
  selectedItems: Object.assign({}, ctx.sessionState.selectedItems, { [args.id]: true }),
});
```

Session state appears in the render function as `state.sessionState`. It is managed by the `pluginCardRuntime` Redux slice per `sessionId`.

### Domain Scope

Domain intents bridge the sandbox to the host application's business logic. They are the primary mechanism for cards to trigger meaningful state changes — updating inventory quantities, creating tasks, modifying contacts. Domain intents become Redux actions in the host store.

```js
ctx.dispatchDomainAction('inventory', 'updateQty', { sku: 'SKU-123', qty: 7 });
// Produces Redux action: { type: 'inventory/updateQty', payload: { sku: 'SKU-123', qty: 7 } }
```

The naming contract is critical: `dispatchDomainAction(domain, actionType, payload)` produces a Redux action with type `<domain>/<actionType>`. Your reducer or middleware must handle this exact string. A typo, case mismatch, or domain name difference causes the action to be silently ignored — no error, no state change, no UI update.

Domain intents are subject to capability policy authorization. If a card session's policy does not include the target domain, the intent is silently dropped. This is a security feature: it prevents untrusted cards from dispatching actions to domains they should not access.

### System Scope

System intents trigger shell-level operations: navigation, notifications, and window management.

| Command | Payload | Effect |
|---|---|---|
| `nav.go` | `{ cardId, param? }` | Navigate to a card in the current session |
| `nav.back` | `{}` | Navigate to the previous card |
| `notify` | `{ message }` | Show a toast notification |
| `window.close` | `{}` | Close the current window |

```js
ctx.dispatchSystemCommand('nav.go', { cardId: 'detail', param: itemId });
ctx.dispatchSystemCommand('notify', { message: 'Item saved successfully' });
ctx.dispatchSystemCommand('window.close', {});
```

System intents are also subject to capability policy authorization.

### Intent Flow Diagram

```
  Event Handler (QuickJS)
        |
        |  dispatchCardAction('patch', { loading: true })
        |  dispatchDomainAction('inventory', 'updateQty', { sku, qty })
        |  dispatchSystemCommand('notify', { message: 'Saved' })
        |
        v
  Intent Array (returned to host)
        |
        +-- [ { scope: 'card', actionType: 'patch', payload: {...} },
        |     { scope: 'domain', domain: 'inventory', actionType: 'updateQty', payload: {...} },
        |     { scope: 'system', command: 'notify', payload: {...} } ]
        |
        v
  Intent Router (pluginIntentRouting.ts)
        |
        +-- card intent -----> pluginCardRuntime slice (card state update)
        |
        +-- domain intent ---> capability check ---> Redux dispatch
        |                       (authorized?)        { type: 'inventory/updateQty', payload: {...} }
        |
        +-- system intent ---> capability check ---> shell action
                                (authorized?)        showToast('Saved')
```

## Capability Policies

Capability policies control what a card session is allowed to do. They are defined per stack and enforced by the intent router.

### Domain Capabilities

Domain capabilities specify which Redux domains a session can target with `dispatchDomainAction`:

```ts
capabilities: {
  domains: {
    'inventory': 'readwrite',   // Can dispatch actions to 'inventory/*'
    'sales': 'read',            // Read-only (future: restrict to selectors)
    'admin': 'none',            // Explicitly denied
  },
}
```

When a domain intent targets a domain not listed in the policy (or listed as `'none'`), the intent is silently dropped. No error is thrown in the sandbox — the handler completes normally, but the Redux action is never dispatched.

### System Capabilities

System capabilities control which system commands are available:

```ts
capabilities: {
  system: {
    'nav.*': true,        // All navigation commands
    'notify': true,       // Toast notifications
    'window.close': false, // Deny window closing
  },
}
```

Glob patterns are supported. `'nav.*'` matches `nav.go` and `nav.back`.

### Why Silent Denial

Capability violations are silently denied rather than throwing errors. This is a deliberate design choice. If violations threw errors, a malicious card could probe the capability boundary by catching errors and testing different domains. Silent denial reveals nothing about the host's configuration. From the card's perspective, the dispatch call succeeds — it just has no effect.

## State Projection: What Cards Can See

Cards do not have direct access to the Redux store. Instead, the host projects a subset of the store into the `globalState` parameter passed to render functions and event handlers.

### Global State Structure

```js
{
  self: {
    stackId: 'my-app-stack',
    sessionId: 'session-abc123',
    cardId: 'dashboard',
    windowId: 'window:my-app:card:session-abc123',
  },
  domains: {
    inventory: { items: [...], loading: false },
    sales: { totals: {...} },
  },
  nav: {
    current: 'dashboard',
    param: undefined,
    depth: 1,
    canBack: false,
  },
  system: {
    focusedWindowId: 'window:my-app:card:session-abc123',
    runtimeHealth: { status: 'ready' },
  },
}
```

**`self`** contains the current session's identity. Cards can use this to construct unique keys or identify themselves.

**`domains`** contains projected domain state from the Redux store. Only domains that have projections registered via `selectProjectedRuntimeDomains` appear here. This is how cards read application data without direct store access.

**`nav`** contains navigation state: the current card, any parameter passed during navigation, the navigation stack depth, and whether back navigation is available.

**`system`** contains shell-level state: which window is focused and the runtime's health status.

### Reading Domain Data in Cards

To make domain data available to cards, your app must register domain projections. This is typically done through Redux selectors that project relevant slices of the store:

```ts
// In your domain slice or selectors file:
export const selectProjectedRuntimeDomains = createSelector(
  [selectInventoryItems, selectSalesData],
  (items, sales) => ({
    inventory: { items },
    sales: { totals: sales },
  })
);
```

Cards then read this data in their render function:

```js
render: function(state) {
  var items = state.globalState.domains.inventory?.items || [];
  return ui.panel([
    ui.text('Items: ' + items.length),
    // ...
  ]);
}
```

## Assistant-Generated Runtime Cards

One of HyperCard's most powerful features is the ability for the AI assistant to generate cards dynamically during a chat conversation. This is how a text-based chat turns into a rich interactive experience.

### The Runtime Card Injection Pipeline

```
  Backend (Go)                           Frontend (TypeScript)
  +-----------------+                    +---------------------------+
  | Chat assistant   |                   |                           |
  | generates card   |   WebSocket       | Timeline Mapper           |
  | code as SEM     +-------------------->  (normalizes event)       |
  | event           |                    |         |                 |
  +-----------------+                    |         v                 |
                                         | Artifact Projection       |
                                         | Middleware                |
                                         |  (extracts runtimeCardId  |
                                         |   and runtimeCardCode)    |
                                         |         |                 |
                                         |         v                 |
                                         | Runtime Card Registry     |
                                         |  (stores card definition) |
                                         |         |                 |
                                         |         v                 |
                                         | PluginCardSessionHost     |
                                         |  (injects card into       |
                                         |   QuickJS session)        |
                                         +---------------------------+
```

**Step 1: Backend emits a SEM event.** During a chat conversation, the assistant generates JavaScript card code. The backend wraps this code in a Structured Event Mapping (SEM) event of type `hypercard.card.v2` or `hypercard.widget.v1`. The event includes two critical fields: `runtimeCardId` (a unique identifier for the card) and `runtimeCardCode` (the JavaScript source code).

**Step 2: WebSocket delivery.** The event is delivered to the frontend through the conversation's WebSocket connection as part of the timeline event stream.

**Step 3: Timeline normalization.** The `registerHypercardChatModules` timeline mapper normalizes the event into a `TimelineEntity` with the card metadata in its props.

**Step 4: Artifact projection.** The `artifactProjectionMiddleware` watches for timeline entities with `runtimeCardId` and `runtimeCardCode` fields. When it finds one, it calls `registerRuntimeCard(cardId, code)` to store the card definition in the global registry.

**Step 5: Session injection.** The `PluginCardSessionHost` subscribes to registry changes via `onRegistryChange`. When a new card is registered, it calls `injectPendingCardsWithReport(runtimeService, sessionId)`, which evaluates the card code inside the existing QuickJS session using `defineCard()`. The card becomes immediately available for navigation.

### What the Backend Generates

The backend wraps assistant-generated card code in a structured event:

```json
{
  "kind": "hypercard.card.v2",
  "props": {
    "runtimeCardId": "assistant-card-qty-editor-abc123",
    "runtimeCardCode": "function(ctx) { return { render: function(state) { return ui.panel([ ui.text('Qty Editor'), ui.input(String(state.cardState.qty || 0), { onChange: { handler: 'setQty' } }), ui.button('Save', { onClick: { handler: 'save' } }) ]); }, handlers: { setQty: function(ctx, args) { ctx.dispatchCardAction('patch', { qty: args.value }); }, save: function(ctx) { ctx.dispatchDomainAction('inventory', 'updateQty', { qty: Number(ctx.cardState.qty) }); } } }; }",
    "title": "Quantity Editor",
    "description": "Interactive widget for editing item quantities"
  }
}
```

The `runtimeCardCode` is a function expression that will be passed to `defineCard()`. It must return an object with `render` and `handlers` properties. The code runs inside the existing QuickJS session, so it has access to the `ui` helper and all other sandbox globals.

### Live Injection

Cards can be injected into an already-running session. This means a user can be looking at a card in a window, and a new card generated by the assistant appears as a navigable destination without reloading the session. The `PluginCardSessionHost` subscribes to registry changes and injects new cards automatically.

This live injection capability is what makes the assistant experience feel seamless: the assistant says "here's a widget to edit quantities," and a card appears that the user can navigate to and interact with immediately.

### Security of Runtime Cards

Runtime cards run inside the same QuickJS sandbox as statically-defined cards. They are subject to the same capability policies, resource limits, and intent routing rules. An assistant-generated card cannot:

- Access the network or file system.
- Read browser cookies or local storage.
- Execute arbitrary DOM operations.
- Dispatch intents to unauthorized domains.
- Exceed memory or timeout limits.

The card code is treated as untrusted input and validated at every boundary: the UI tree is validated against the schema before rendering, intents are validated against the intent schema before routing, and capability policies are checked before dispatching.

## The Rendering Pipeline in Detail

Understanding the full rendering pipeline helps when debugging card issues or building new UI node types.

### From QuickJS to React

```
  QuickJS Runtime                    Host (TypeScript)                     Browser (React)
  +--------------+                   +-------------------+                 +-----------------+
  | render()     |                   |                   |                 |                 |
  | returns JSON |  evalToNative()   | validateUINode()  |  renderNode()  | React DOM       |
  | UI tree      +------------------>| (schema check)    +--------------->| elements        |
  |              |                   |                   |                 |                 |
  +--------------+                   +-------------------+                 +-----------------+
```

1. **`renderCard()` in QuickJS** — The host constructs a JavaScript expression that calls `globalThis.__stackHost.render(cardId, cardState, sessionState, globalState)` and evaluates it inside QuickJS with a timeout. The result is marshaled from QuickJS values to a native JavaScript object via `context.dump()`.

2. **`validateUINode()`** — The returned object is validated against the `UINode` type discriminated union. Every node must have a valid `kind`. Buttons must have `props.label`. Tables must have `props.headers` as a string array. Invalid trees throw errors that are displayed to the user.

3. **`PluginCardRenderer.renderNode()`** — The validated tree is recursively converted to React elements. Each node kind maps to a specific rendering:
   - `panel`, `column`, `row` → `<div>` with appropriate flex direction
   - `text` → `<span>`
   - `badge` → `<span>` with pill styling
   - `button` → `<Btn>` (from engine widget library)
   - `input` → `<input>`
   - `table` → `<table>` with headers and rows
   - `dropdown` → `<DropdownMenu>` (from engine widget library)
   - `selectableTable` → `<SelectableDataTable>` (from engine widget library)
   - `gridBoard` → `<GridBoard>` (from engine widget library)

4. **Event binding** — Interactive nodes have their event references bound to `onEvent(handler, args)`. When a button is clicked, the renderer calls `onEvent('save', { id: '123' })`, which triggers the event dispatch cycle.

### Re-rendering

The host re-renders a card whenever any of its input state changes: card state, session state, or projected global state. The `PluginCardSessionHost` uses React's `useMemo` to memoize the render result. When inputs change, the entire render cycle runs again: QuickJS evaluation, validation, and React element creation.

Because render functions run in QuickJS with a 100ms timeout, they must be fast. Avoid expensive computations in render functions — pre-compute data in event handlers and store results in card or session state.

## Two Patterns for Backend Integration

When cards need to trigger backend API calls, there are two established patterns. Choose based on whether the domain action is a synchronous state transformation or an asynchronous API call.

### Pattern 1: Direct Reducer

The simpler pattern. Domain intents map directly to Redux slice cases. The reducer performs synchronous state updates. No middleware, no effect host, no additional components.

```
Card handler                    Redux Store
    |                              |
    | dispatchDomainAction(        |
    |   'inventory',               |
    |   'updateQty',               |
    |   { sku, qty }               |
    | )                            |
    |                              |
    +----> { type: 'inventory/updateQty', payload: { sku, qty } }
           |
           v
       inventorySlice.extraReducers:
         builder.addCase('inventory/updateQty', (state, action) => {
           const item = state.items.find(i => i.sku === action.payload.sku);
           if (item) item.qty = action.payload.qty;
         });
```

Use this pattern when:
- The state change is purely local (no API call needed).
- The data is already in the Redux store.
- The operation is synchronous.

The inventory app uses this pattern for many card interactions where the data is managed in the frontend store.

### Pattern 2: Bridge Middleware

The more complex pattern. A Redux middleware intercepts domain intents, makes async API calls, and dispatches result actions. An effect host component watches for pending intents and feeds results back into the card session.

```
Card handler                 Middleware              Backend API
    |                           |                       |
    | dispatchDomainAction(     |                       |
    |   'arc',                  |                       |
    |   'command.request',      |                       |
    |   { command, args }       |                       |
    | )                         |                       |
    |                           |                       |
    +----> { type: 'arc/command.request', payload }     |
           |                                            |
           v                                            |
       middleware intercepts                            |
       action type matches                              |
           |                                            |
           +----> fetch('/api/apps/arc-agi/...') ------>+
           |                                            |
           |<---- response <----------------------------+
           |
           +----> dispatch { type: 'arc/command.response', result }
           |
           v
       Effect Host component detects response
       Patches session state with result
       Card re-renders with new data
```

Use this pattern when:
- The domain action requires a backend API call.
- The result needs to flow back into the card session.
- You need request/response correlation.

The ARC-AGI app uses this pattern exclusively because every game action requires a backend API call.

The bridge pattern requires four pieces:
- `bridge/contracts.ts` — Action type constants and payload types.
- `bridge/slice.ts` — Redux slice tracking pending intents and responses.
- `bridge/middleware.ts` — Middleware that intercepts requests and makes API calls.
- `bridge/EffectHost.tsx` — React component that watches for responses and patches session state.

## Debugging Cards

### Common Development Issues

| Symptom | Cause | Solution |
|---|---|---|
| Card shows "No plugin output" | Card not defined in bundle, or cardId mismatch | Check `defineCard(cardId)` matches navigation target |
| "Runtime error" toast | JavaScript error in render or handler | Check QuickJS console output, simplify the failing function |
| Button click does nothing | Missing or misnamed handler | Verify `onClick.handler` matches a key in `handlers` |
| Domain action has no effect | Action type mismatch or capability denial | Check `<domain>/<actionType>` matches reducer, check capabilities |
| Card renders but never updates | State not changing, or wrong state scope | Verify dispatched scope (card vs session vs domain) |
| "Runtime timeout" error | Render or handler exceeds time limit | Optimize: avoid loops over large arrays in render |
| "Memory limit exceeded" | Card accumulates too much state | Clean up unused state, avoid storing large arrays |

### Using the Debug Panel

The launcher includes several debug tools accessible through the inventory module's contributions:

- **Runtime Card Debug** — Shows all registered runtime cards, their source code, and injection status.
- **Timeline Debugger** — Shows the timeline event stream, including hypercard SEM events.
- **Redux Perf** — Shows Redux action dispatch timing, useful for diagnosing slow domain intent handling.

### Testing Cards in Isolation

Cards can be tested without the full launcher by using the `QuickJSCardRuntimeService` directly:

```ts
import { QuickJSCardRuntimeService } from '@go-go-golems/os-scripting';

const service = new QuickJSCardRuntimeService();

// Load a bundle
const bundle = await service.loadStackBundle('test-stack', 'test-session', bundleCode);

// Render a card
const tree = service.renderCard('test-session', 'dashboard', {}, {}, {});
console.log(JSON.stringify(tree, null, 2));

// Fire an event
const intents = service.eventCard('test-session', 'dashboard', 'refresh', {}, {}, {}, {});
console.log(intents);

// Clean up
service.disposeSession('test-session');
```

### Storybook Integration

The `CardSessionHost.stories.tsx` file demonstrates running card sessions in Storybook. This is useful for developing cards with hot reloading and visual inspection without running the full launcher.

## Writing Effective Cards

### Keep Render Functions Pure

Render functions should be pure transformations from state to UI trees. They should not modify state, produce side effects, or depend on anything outside their arguments. This makes cards predictable and testable.

```js
// Good: pure transformation
render: function(state) {
  var items = state.sessionState.items || [];
  return ui.panel([
    ui.text('Items: ' + items.length),
  ]);
}

// Bad: side effects in render
render: function(state) {
  globalCounter++;  // Side effect!
  return ui.panel([
    ui.text('Rendered: ' + globalCounter),
  ]);
}
```

### Use the Right State Scope

Choose the narrowest scope that works:

- **Card state** for UI-only concerns (form values, toggles, expanded/collapsed). Resets on navigation.
- **Session state** for data shared between cards (selected item ID, wizard progress). Lives until window closes.
- **Domain intents** for business logic (save item, update quantity). Affects the whole application.
- **System commands** for shell operations (navigate, notify, close). Affects the desktop environment.

### Handle Missing Data Gracefully

Cards should render something useful even when domain data hasn't loaded yet:

```js
render: function(state) {
  var items = state.globalState.domains.inventory?.items;
  if (!items) {
    return ui.panel([
      ui.text('Loading...'),
      ui.button('Refresh', { onClick: { handler: 'refresh' } }),
    ]);
  }
  // ... render with data
}
```

### Keep Bundle Code Simple

QuickJS runs ES2023 JavaScript, but bundle code should stay simple:
- Use `var` and `function` declarations for clarity in the VM context.
- Avoid importing external modules (there is no module system in the sandbox).
- Keep data transformations straightforward — complex algorithms can live in the host, not the card.
- Remember that everything is synchronous. There are no promises or async operations in card code.

## See Also

- `frontend-developer-guide` — Integrating HyperCard into frontend modules
- `backend-developer-guide` — Building the backend that provides data to cards
- `building-a-full-app` — End-to-end tutorial including card development
- `wesen-os-guide` — Workspace setup and build pipeline
