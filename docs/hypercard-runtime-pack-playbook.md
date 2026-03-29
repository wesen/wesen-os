# HyperCard Runtime Package Playbook

This is the canonical developer playbook for building and registering a HyperCard runtime package in
the current `wesen-os` workspace.

Use this guide when you need to do one or more of these:

- create a new VM-visible runtime package that contributes a surface type like `kanban.v1`
- move an existing app from a monolithic `pluginBundle.vm.js` to split VM source files
- expose a new DSL in QuickJS
- register a host-side validator and renderer for a pack
- generate `vmmeta` source/docs metadata
- attach built-in card source metadata to stack definitions
- register pack/card docs in the apps-browser docs runtime

This guide is written from the current post-APP-15 / APP-18 / APP-21 architecture. It assumes:

- no compatibility wrappers by default
- pack IDs are explicit
- authored VM source is a first-class artifact
- docs and source metadata matter as much as rendering

## Related Playbooks

Read these alongside this guide:

- [widget-dsl-porting-playbook.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/docs/widget-dsl-porting-playbook.md)
  Why and how to split a widget family into host primitives plus a VM DSL.
- [docs-source-mount-playbook.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/docs/docs-source-mount-playbook.md)
  How generated pack/card docs are mounted into the docs browser.

This guide answers: “How do I build and register a runtime package end to end?”

## The Short Version

Every runtime pack in this workspace has seven moving parts:

1. host-side widget primitives
2. runtime pack validator + renderer
3. VM bootstrap helpers in QuickJS
4. authored VM card sources
5. generated `vmmeta` docs/source metadata
6. stack metadata carrying source/pack info
7. app startup registration for docs and demo surfaces

If one of those is missing, the pack is only half built.

## Reference Implementations

There are currently two useful reference shapes.

### `kanban.v1`

This is the full rich-package reference:

- pack-specific renderer/validator
- custom `widgets.kanban.*` DSL
- split VM sources
- `vmmeta`
- pack docs and card docs
- docs-browser registration

Key files:

- [packages/os-kanban/src/index.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-kanban/src/index.ts)
- [packages/os-kanban/src/runtimeRegistration.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-kanban/src/runtimeRegistration.tsx)
- [packages/os-kanban/src/packageApi.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-kanban/src/packageApi.vm.js)
- [pluginBundle.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/domain/pluginBundle.ts)
- [vmmeta.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/domain/vmmeta.ts)
- [registerAppsBrowserDocs.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/registerAppsBrowserDocs.ts)

### `ui.card.v1` in Inventory

This is the best reference for migrating an older inline stack to generated per-card source while
keeping the default UI-card pack.

Key files:

- [pluginBundle.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/domain/pluginBundle.ts)
- [vm/00-runtimePrelude.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/domain/vm/00-runtimePrelude.vm.js)
- [vm/cards/home.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/domain/vm/cards/home.vm.js)
- [vm/docs/inventory-pack.docs.vm.js](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/domain/vm/docs/inventory-pack.docs.vm.js)
- [vmmeta.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/domain/vmmeta.ts)
- [stack.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/domain/stack.ts)

## System Diagram

```text
host widget family
  -> package-owned renderer + validator
  -> runtime package registry
  -> runtime surface-type registry
  -> QuickJS bootstrap helpers
  -> authored VM surfaces
  -> vmmeta generate
  -> bundle metadata with surface/source
  -> docs mounts + runtime debug + editor
```

More explicitly:

```text
React widgets
  -> runtime package owns surface-type renderer
  -> registerRuntimePackage(packageId)
  -> registerRuntimeSurfaceType(surfaceTypeId)
  -> VM surface returns structured tree
  -> runtime validates tree for that surface type
  -> host renders tree
  -> vmmeta extracts docs/source from surface files
  -> bundle exposes source metadata
  -> docs browser mounts package/surface docs
```

## Concepts

### Runtime package

A runtime package is one coherent contract:

- package ID
- VM DSL surface
- tree schema
- validator
- renderer
- authoring docs
- prompt/docs metadata

Examples:

- `ui`
- `kanban`

Those packages may contribute one or more runtime surface types such as:

- `ui.card.v1`
- `kanban.v1`

### Runtime surface type

A runtime surface type is the render contract for a structured tree returned by a runtime surface.

Examples:

- `ui.card.v1`
- `kanban.v1`

This is the thing the host-side validator and renderer actually interpret.

### Runtime bundle

A runtime bundle is one authored VM program loaded into QuickJS through:

- `defineRuntimeBundle(...)`
- zero or more `defineRuntimeSurface(...)` calls

The runtime reads bundle metadata through `globalThis.__runtimeBundleHost.getMeta()`.

### `vmmeta`

`vmmeta` is the generated metadata layer extracted from authored VM files. It preserves:

- card IDs
- pack IDs
- titles/icons
- exact source strings
- handler names
- package docs
- symbol docs
- card docs

Without `vmmeta`, built-in cards are much harder to inspect, edit, and register into docs-browser.

## File Layout Pattern

The recommended app-side layout is:

```text
src/domain/
  pluginBundle.ts
  stack.ts
  vmmeta.ts
  generated/
    <pack>.vmmeta.json
    <pack>Vmmeta.generated.ts
  vm/
    00-runtimePrelude.vm.js
    cards/
      cardA.vm.js
      cardB.vm.js
    docs/
      <pack>-pack.docs.vm.js
```

Do not go back to one giant inline `pluginBundle.vm.js` unless the stack is truly trivial and you do
not need docs/source metadata.

## Phase 1: Decide What Kind Of Pack You Are Building

There are two broad cases.

### Case A: You are reusing `ui.card.v1`

Use this when:

- the classic UI DSL is enough
- you only need text/button/input/row/column/table/badge style cards
- you still want exact source/docs metadata

Inventory now uses this model.

### Case B: You are building a new pack

Use this when:

- the widget family needs richer semantics
- the UI needs new node kinds
- you need a pack-specific validator/renderer
- the VM DSL should not look like generic `ui.*`

Kanban uses this model.

## Phase 2: Build Or Extract Host Primitives

If you are creating a new pack, start on the host side first.

Checklist:

- extract reusable React primitives
- keep them semantic
- keep them serializable by props
- add Storybook coverage for each primitive

Examples:

- [KanbanBoardView.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-widgets/src/kanban/KanbanBoardView.tsx)
- [KanbanHighlights.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-widgets/src/kanban/KanbanHighlights.tsx)

If the widget family is already generic enough, this may already be done.

## Phase 3: Define The Package Contract

This is the real runtime boundary.

### 1. Add a validator + renderer

Create or update a file like:

- [packages/os-kanban/src/runtimeRegistration.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-kanban/src/runtimeRegistration.tsx)

Responsibilities:

- validate the VM node tree
- reject malformed structures
- map validated nodes to host widgets
- turn event refs into `onEvent(handler, args)` callbacks

Do not skip validation.

### 2. Export package and surface-type definitions

Use:

- `RUNTIME_PACKAGE`
- `RUNTIME_SURFACE_TYPE`

Pattern:

```ts
export const MY_RUNTIME_PACKAGE = {
  packageId: 'my-package',
  install(session) { ... },
  docsMetadata: ...,
};

export const MY_V1_RUNTIME_SURFACE_TYPE = {
  typeId: 'my-package.v1',
  validateTree(value) { ... },
  render({ tree, onEvent }) {
    return <MyRenderer tree={tree} onEvent={onEvent} />;
  },
};
```

Host apps then register those explicitly at startup.

### 3. Expose VM-side helpers in bootstrap

In the current architecture, this should live in the concrete package, not runtime core.

Pattern:

```js
registerRuntimePackageApi('my-package', {
  widgets: {
    myPackage: {
      page(props) { ... },
      board(props) { ... },
    },
  },
});
```

Do not put concrete package APIs back into generic runtime-core bootstrap files.

## Phase 4: Author VM Cards As Real Source Files

Do not author important built-in surfaces only as opaque strings.

Use per-card files with:

- `__card__(...)`
- `__doc__(...)`
- `doc\`...\``
- `defineRuntimeSurface(...)`

Pattern:

```js
// @ts-check
__card__({
  id: 'mySurface',
  packId: 'my-package.v1',
  title: 'My Surface',
  icon: '🧪',
});

__doc__({
  name: 'mySurface',
  summary: 'One-line summary for docs browser.',
  tags: ['demo', 'my-package'],
  related: ['widgets.myPackage.page'],
});

doc`
---
symbol: mySurface
---
Longer prose that becomes surface documentation.
`;

defineRuntimeSurface(
  'myCard',
  ({ widgets }) => ({
    render({ state }) {
      return widgets.myPack.page(...);
    },
    handlers: {
      doThing({ dispatch }) {
        dispatch({ type: 'notify.show', payload: { message: 'done' } });
      },
    },
  }),
  'myPack.v1',
);
```

If you are staying on `ui.card.v1`, the same pattern works with `({ ui }) => ...`.

## Phase 5: Build The Bundle From Raw Imports

Use a tiny `pluginBundle.ts`, not a handwritten giant source blob.

Pattern:

```ts
import runtimePrelude from './vm/00-runtimePrelude.vm.js?raw';
import packDocs from './vm/docs/my-pack.docs.vm.js?raw';
import cardA from './vm/cards/cardA.vm.js?raw';
import cardB from './vm/cards/cardB.vm.js?raw';

export const MY_PLUGIN_BUNDLE = [
  runtimePrelude,
  packDocs,
  cardA,
  cardB,
].join('\n\n');
```

Examples:

- [os-launcher pluginBundle.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/domain/pluginBundle.ts)
- [inventory pluginBundle.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/domain/pluginBundle.ts)

Why this is better:

- source files stay readable
- `vmmeta` can inspect them
- exact authored source survives for debug/editor/docs

## Phase 6: Generate `vmmeta`

This is the metadata generation step.

The CLI is in:

- `workspace-links/go-go-os-backend/cmd/go-go-os-backend`

Typical package script:

```json
{
  "scripts": {
    "vmmeta:generate": "go run ../../../go-go-os-backend/cmd/go-go-os-backend vmmeta generate --pack-id ui.card.v1 --cards-dir src/domain/vm/cards --docs-dir src/domain/vm/docs --output-json src/domain/generated/inventory.vmmeta.json --output-ts src/domain/generated/inventoryVmmeta.generated.ts"
  }
}
```

Typical lifecycle wiring:

```json
{
  "scripts": {
    "predev": "npm run vmmeta:generate",
    "prebuild": "npm run vmmeta:generate",
    "pretypecheck": "npm run vmmeta:generate",
    "pretest": "npm run vmmeta:generate"
  }
}
```

This ensures the generated metadata stays aligned with the authored VM source.

### What `vmmeta` requires

Right now the generator expects:

- `__card__(...)` sentinel in card files
- `defineCard(...)` call in card files
- `__package__` / `__doc__` / `doc\`` in docs files as needed

If you stay in a monolithic `defineStackBundle({ cards: { ... }})` style, `vmmeta` will not extract
per-card docs/source correctly. That is why Inventory had to be converted to split per-card files.

## Phase 7: Expose Generated Metadata To The App

Create a tiny adapter:

```ts
import VM_PACK_METADATA from './generated/myPackVmmeta.generated';

export const MY_VM_PACK_METADATA = VM_PACK_METADATA;

export const MY_VM_CARD_META = VM_PACK_METADATA.cards.map((card) => ({
  id: card.id,
  title: card.title,
  icon: card.icon,
  packId: card.packId,
  sourceFile: card.sourceFile,
  source: card.source,
  handlerNames: Array.isArray(card.handlerNames) ? [...card.handlerNames] : [],
}));
```

Examples:

- [os-launcher vmmeta.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/domain/vmmeta.ts)
- [inventory vmmeta.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/domain/vmmeta.ts)

## Phase 8: Attach Source Metadata To The Stack

If you want built-in cards to show source in `Stacks & Cards`, the stack definition must carry it.

Pattern:

```ts
meta: card.source
  ? {
      runtime: {
        packId: card.packId,
        sourceFile: card.sourceFile,
        source: card.source,
        handlerNames: card.handlerNames ?? [],
      },
    }
  : undefined,
```

Examples:

- [os-launcher stack.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/domain/stack.ts)
- [inventory stack.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/src/domain/stack.ts)

This is what lets the runtime debug/editor path inspect built-in cards the same way it can inspect
runtime-injected cards.

## Phase 9: Register Docs Mounts

Once `vmmeta` exists, register the pack and card docs into apps-browser.

Use:

- [registerAppsBrowserDocs.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/registerAppsBrowserDocs.ts)

Pattern:

```ts
docsRegistry.register(createVmmetaPackDocsMount(MY_VM_PACK_METADATA));
docsRegistry.register(createVmmetaCardDocsMount('my-owner', MY_VM_PACK_METADATA));
```

Notes:

- `owner` controls where the card docs appear in Module Browser detail panels
- if you use `owner = 'inventory'`, those card docs can surface when the Inventory app is selected
- pack docs use `packId` as owner in the docs tree

See also:

- [docs-source-mount-playbook.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/docs/docs-source-mount-playbook.md)

## Phase 10: Register Demo Surfaces Or Launcher Shortcuts

If the pack has built-in demo cards, add a launcher surface in the app layer.

Examples:

- [kanbanVmModule.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/kanbanVmModule.tsx)
- [modules.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/modules.tsx)

This is optional for a library pack, but it is the fastest way to validate the runtime path in a
live shell.

## Validation Checklist

Do not stop after “the widget renders.”

You want to validate the whole pack lifecycle:

### Runtime

- pack is registered in `runtimePackRegistry`
- QuickJS bootstrap exposes the right helpers
- VM cards load without unknown-pack errors
- the renderer validates and renders the tree

### Metadata

- `npm run vmmeta:generate` succeeds
- generated JSON/TS files are updated
- `vmmeta.ts` exports the right cards
- `stack.ts` includes source metadata

### Docs

- pack docs show up under `/docs/objects/pack/...`
- card docs show up under `/docs/objects/card/...`
- docs browser can open them
- Module Browser owner matching behaves as intended

### Debugging

- built-in cards show source in `Stacks & Cards`
- edit flow uses the correct source string

### Stories and tests

- host widget primitives have Storybook coverage
- runtime pack tests cover validation/rendering
- bundle tests confirm `QuickJSCardRuntimeService` can load the bundle

## Recommended Commands

For pack packages/apps:

```bash
npm run vmmeta:generate
npm test
npm run typecheck
```

For docs browser integration:

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser
npm test -- --run \
  src/domain/docsMountAdapters.test.ts \
  src/domain/docsRegistry.test.ts \
  src/domain/docsCatalogStore.test.ts \
  src/components/BrowserDetailPanel.test.tsx
```

For workspace-level Storybook taxonomy:

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend
npm run storybook:check
```

## Common Failure Modes

### 1. Unknown runtime pack

Symptom:

```text
Unknown runtime pack: myPack.v1
```

Cause:

- pack not registered in `runtimePackRegistry`
- or `stack-bootstrap.vm.js` does not expose helpers for that pack

### 2. `vmmeta` generation fails

Common causes:

- missing `__card__(...)`
- missing `defineCard(...)`
- mismatched `packId`
- wrong `cards-dir` / `docs-dir`

### 3. Built-in cards do not show source

Cause:

- stack metadata does not include `meta.runtime.source`
- generated metadata is not wired into `stack.ts`

### 4. Docs browser does not show the new docs

Cause:

- docs mounts were never registered
- wrong `owner`
- startup registration is in the wrong app layer

### 5. Pre-scripts cannot find the backend CLI

This already happened during Inventory migration.

Check your relative path to:

```text
workspace-links/go-go-os-backend/cmd/go-go-os-backend
```

### 6. Generated output directory does not exist

Create it first:

```bash
mkdir -p src/domain/generated
```

## Recommended Order Of Work

When building a new pack, use this order:

1. extract host primitives
2. implement validator + renderer
3. register the pack
4. expose VM helpers in bootstrap
5. split authored VM files
6. wire `pluginBundle.ts`
7. add `vmmeta` generation
8. expose metadata via `vmmeta.ts`
9. attach metadata to `stack.ts`
10. register docs mounts
11. add stories/tests/demo launcher

That order keeps the runtime boundary clear and avoids building docs/source machinery around an
unstable pack contract.

## Recommendation

Treat runtime-pack work as platform work, not just UI work.

A pack is only “done” when:

- the VM can author against it
- the host can validate and render it
- the source is preserved
- the docs are mounted
- the debugger can inspect it

If you only finish the renderer, you have built a demo. If you finish the full chain above, you
have built a reusable HyperCard runtime pack.
