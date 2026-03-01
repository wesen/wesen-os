---
Title: Intent Routing and State Contract Reference
Slug: intent-routing-reference
Short: Reference for the four VM intent scopes (card, session, domain, system), dispatch semantics, capability gating, and the naming contract between VM handlers and Redux reducers.
Topics:
- intents
- vm
- state
- redux
- hypercard
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: GeneralTopic
---

When a HyperCard VM card handler runs inside QuickJS, it communicates with the host application by emitting runtime intents. These intents are the only mechanism for VM code to affect application state, trigger navigation, or invoke domain logic. Understanding the four intent scopes and the naming contract between VM handlers and Redux reducers is essential for building apps that use interactive cards.

## The Four Intent Scopes

Each dispatch function inside a VM handler targets a specific scope. The scope determines where the intent is routed and what it can affect.

| Scope | Dispatch Function | Target | Persistence |
|---|---|---|---|
| `card` | `dispatchCardAction(actionType, payload)` | Card-local ephemeral state | Lost when card unmounts |
| `session` | `dispatchSessionAction(actionType, payload)` | Stack session state shared across cards | Lost when session ends |
| `domain` | `dispatchDomainAction(domain, actionType, payload)` | Redux store via app reducer/middleware | Persisted in app state |
| `system` | `dispatchSystemCommand(command, payload)` | Shell commands (navigation, notifications) | Side effects only |

**Why four scopes exist:** Card and session scopes handle UI-local state that doesn't belong in the app's domain model. Domain scope bridges VM behavior into the application's Redux store, where it can trigger API calls, update persistent state, or feed other components. System scope handles shell-level concerns that cross app boundaries.

## Card Scope

Card scope manages ephemeral state for one card instance. Use it for form field values, toggle states, loading indicators, and other UI concerns that should reset when the user navigates away.

```js
handlers: {
  toggleExpanded({ dispatchCardAction }, args) {
    dispatchCardAction('set', { path: 'expanded', value: !args.currentValue });
  },
  updateField({ dispatchCardAction }, args) {
    dispatchCardAction('patch', { form: { [args.field]: args.value } });
  }
}
```

Supported action types for card scope:

| Action Type | Behavior |
|---|---|
| `set` | Set a value at a specific path in card state |
| `patch` | Merge an object into card state |
| `reset` | Reset card state to initial values |

## Session Scope

Session scope manages state shared across all cards in a stack session. Use it for multi-step wizard state, accumulated selections, or context that should survive card navigation within the same session.

```js
handlers: {
  addToSelection({ dispatchSessionAction }, args) {
    dispatchSessionAction('patch', { selected: { [args.id]: true } });
  }
}
```

Session state uses the same action types as card scope (`set`, `patch`, `reset`) but operates on the session-level state object.

## Domain Scope

Domain scope is the bridge between VM code and the application's business logic. When a handler calls `dispatchDomainAction(domain, actionType, payload)`, the runtime creates an intent that is routed through capability authorization and then dispatched as a Redux action.

**The naming contract:** The resulting Redux action type is `<domain>/<actionType>`. Your reducer or middleware must handle this exact string.

```js
// In VM handler:
dispatchDomainAction('inventory', 'saveItem', { sku: 'SKU-123', qty: 7 });

// Produces Redux action:
// { type: 'inventory/saveItem', payload: { sku: 'SKU-123', qty: 7 } }
```

The reducer must match:

```ts
// In inventorySlice.ts:
builder.addCase('inventory/saveItem', (state, action) => {
  const { sku, qty } = action.payload;
  // update state...
});
```

**What happens if the names don't match:** The action dispatches into Redux but no reducer handles it. The state doesn't change, the UI doesn't update, and there is no error message. This is the most common bug class when wiring VM cards to domain logic.

### Capability Authorization

Domain intents are gated by the runtime session's capability policy. The `authorizeDomainIntent` function checks whether the session is allowed to dispatch to the target domain.

If authorization fails, the intent is rejected and logged but does not reach the Redux store. Check the runtime timeline for rejected intent entries when debugging silent failures.

## System Scope

System scope dispatches shell-level commands that affect the launcher environment rather than app state.

```js
handlers: {
  openDetail({ dispatchSystemCommand }, args) {
    dispatchSystemCommand('navigate', { app: 'inventory', card: 'detail', param: args.id });
  },
  notifyUser({ dispatchSystemCommand }, args) {
    dispatchSystemCommand('notify', { message: 'Item saved successfully' });
  },
  done({ dispatchSystemCommand }) {
    dispatchSystemCommand('close', {});
  }
}
```

Available system commands:

| Command | Payload | Behavior |
|---|---|---|
| `navigate` | `{ app?, card, param? }` | Open a window or navigate to a card |
| `notify` | `{ message, level? }` | Show a toast notification |
| `close` | `{}` | Close the current card/window |

System intents are also capability-gated via `authorizeSystemIntent`.

## Intent Lifecycle

When a VM handler returns, the runtime collects all emitted intents and processes them through `dispatchRuntimeIntent`:

1. All intents are recorded in the runtime timeline via `ingestRuntimeIntent` (for debugging and replay).
2. Card and session intents are applied immediately to the runtime state slice via `applyStateAction`.
3. Domain intents are authorized, then dispatched as Redux actions with type `<domain>/<actionType>`.
4. System intents are authorized, then mapped to shell actions (navigation, notifications, window management).

This means card/session state changes are synchronous and immediate, while domain and system effects may be asynchronous.

## Two Patterns for Domain Intent Handling

### Pattern 1: Direct Reducer (Inventory Style)

The simplest approach. Domain intent action types map directly to reducer cases. The reducer performs synchronous state updates.

```
VM handler → dispatchDomainAction('inventory', 'updateQty', payload)
  → Redux action { type: 'inventory/updateQty', payload }
  → inventorySlice reducer handles 'inventory/updateQty'
  → State updates synchronously
```

Use this when domain actions are pure state transformations that don't require API calls.

### Pattern 2: Bridge Middleware (ARC Style)

For domain actions that require asynchronous API calls, use a bridge pattern. The domain intent triggers a middleware that makes the API call, then dispatches result actions back into the store.

```
VM handler → dispatchDomainAction('arc', 'command.request', payload)
  → Redux action { type: 'arc/command.request', payload }
  → Bridge middleware intercepts, calls /api/apps/arc-agi/sessions/...
  → On success: dispatch { type: 'arc/command.response', payload: result }
  → Bridge state slice updates with API result
  → Effect host patches runtime session state with outcome
```

Use this when domain actions trigger API requests, need error handling, or produce results that should feed back into the VM session state.

## Adding a New Domain Action End-to-End

To add a new domain action for an existing app:

1. **VM handler:** Add or modify a handler to call `dispatchDomainAction('myapp', 'myAction', payload)`.
2. **Reducer/middleware:** Add a case for `'myapp/myAction'` in the app's Redux slice or middleware.
3. **Capability policy:** Ensure the runtime session's capability policy includes the `myapp` domain.
4. **Test:** Verify the handler emits the intent, the intent reaches the reducer, and the state updates as expected.

## Debugging Intent Flow

The runtime timeline records all emitted intents with metadata including session ID, card ID, scope, action type, and payload. Use the hypercard-tools debug panel in the launcher to inspect the timeline.

Common debugging steps:

1. Check the runtime timeline for emitted intents — verify the handler actually dispatched.
2. Check for authorization rejections — look for rejected intent entries.
3. Check the Redux devtools for dispatched actions — verify the action type matches.
4. Check the reducer — verify it handles the exact action type string.

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| Handler runs but no state change | Domain action type doesn't match reducer case | Verify `<domain>/<actionType>` string matches exactly |
| Intent silently rejected | Capability policy doesn't include the domain | Add domain to session capability allowlist |
| Card state resets unexpectedly | Using session scope for card-local state | Switch to `dispatchCardAction` for UI-local state |
| Domain action fires twice | Handler called on re-render, not just on interaction | Ensure handler is bound to user event, not render cycle |
| System command does nothing | System intent not authorized | Check capability policy for system command support |

## See Also

- `architecture-overview` — System topology and data flow
- `glossary` — Definitions for intent, capability policy, runtime session, and related terms
- `backend-module-guide` — How backend modules expose the APIs that domain intents call
