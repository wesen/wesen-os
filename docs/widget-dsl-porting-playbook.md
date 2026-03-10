# Widget DSL Porting Playbook

This playbook explains how to take a rich React widget, split it into reusable host-side widgets, and expose it through a VM-safe DSL and runtime pack in the HyperCard system. It is written for future engineers who need to do for other widgets what we already did for Kanban.

The current Kanban work is the reference implementation, not just an example. This guide points at the shipped seams in `go-go-os-frontend` and `wesen-os`, explains why they are shaped this way, and gives a repeatable process for porting the next widget family.

If you specifically need the end-to-end runtime registration path, read
[hypercard-runtime-pack-playbook.md](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/docs/hypercard-runtime-pack-playbook.md)
alongside this guide. This widget playbook focuses on splitting widgets and designing the DSL; the
runtime-pack playbook covers pack registration, VM authoring layout, `vmmeta`, stack metadata, and
docs registration.

## Who This Is For

Use this guide if you need to:

- port a rich widget into the HyperCard runtime system;
- split a large React screen into reusable host primitives;
- define a VM-safe DSL instead of exposing React directly;
- add runtime-pack docs, metadata, Storybook coverage, and demo cards;
- review whether a proposed widget belongs in the runtime at all.

If you only need to tweak an existing widget visually, this is probably too much process. If you are trying to make a complex widget VM-authorable, this is the right playbook.

## The Core Idea

Do not expose React components to the VM.

Do not let the VM manipulate DOM details, browser objects, or ad hoc host callbacks.

Instead:

1. Keep real UI implementation in host-side React widgets.
2. Split those widgets into small reusable semantic parts.
3. Expose a structured DSL in QuickJS that describes those parts.
4. Validate that DSL on the host.
5. Render the validated tree through the host widgets.
6. Route user interaction back to VM handlers as semantic events.

Kanban is the current proof that this works.

## System Map

The current implementation spans two repos inside the `wesen-os` workspace:

- Host widgets, runtime packs, validators, and renderers live in `workspace-links/go-go-os-frontend/`.
- Authored VM demo cards and generated metadata live in `apps/os-launcher/`.

The relevant paths are:

- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanBoardView.tsx`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanHeaderBar.tsx`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanFilterBar.tsx`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanLaneView.tsx`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanStatusBar.tsx`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanHighlights.tsx`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/types.ts`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/kanbanState.ts`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/runtime.ts`
- `workspace-links/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js`
- `workspace-links/go-go-os-frontend/packages/hypercard-runtime/src/runtime-packs/kanbanV1Pack.tsx`
- `apps/os-launcher/src/domain/vm/00-runtimePrelude.vm.js`
- `apps/os-launcher/src/domain/vm/docs/kanban-pack.docs.vm.js`
- `apps/os-launcher/src/domain/vm/cards/kanbanIncidentCommand.vm.js`
- `apps/os-launcher/src/domain/vm/cards/kanbanReleaseTrain.vm.js`
- `apps/os-launcher/src/domain/vm/cards/kanbanPersonalPlanner.vm.js`
- `apps/os-launcher/src/domain/generated/kanbanVmmeta.generated.ts`
- `apps/os-launcher/src/domain/vmmeta.ts`

## Architecture In One Diagram

```text
authored VM card source
  -> uses widgets.<pack>.* DSL helpers
  -> returns structured node tree
  -> runtime service executes in QuickJS
  -> host pack validator checks node shape
  -> host pack renderer maps nodes to React widgets
  -> user interactions call VM handlers
  -> handlers dispatch semantic runtime actions
  -> projected semantic state rerenders the card
```

The important boundary is this:

```text
VM owns:
  - semantic state usage
  - page composition
  - handler wiring
  - domain intent

Host owns:
  - React
  - DOM
  - drag/drop
  - modals
  - accessibility
  - rendering details
  - validation
  - timers, intervals, and streaming
  - scroll behavior
  - data polling and refresh cycles
```

## Why We Did Not Expose React

This is the most important design rule in the whole system.

If the VM could call host React components directly, we would immediately pick up problems we already worked to remove:

- the DSL would become whatever props a component currently happens to take;
- the VM would start depending on host implementation details;
- refactoring host widgets would become a breaking DSL change;
- DOM-heavy behaviors like drag and drop, focus, overlays, and accessibility would leak across the boundary;
- prompt policy would become much harder to teach reliably because the surface would be too large and too unstable.

The current runtime deliberately only exposes structured helpers from `stack-bootstrap.vm.js`. For the Kanban pack, the VM sees a `widgets.kanban.*` helper surface, not React components.

## Terms

### Runtime pack

A runtime pack is one coherent contract bundle:

- DSL helpers exposed in the VM;
- node types emitted by VM cards;
- host-side validator;
- host-side renderer;
- docs and metadata for authors;
- prompt policy, when AI generation is involved.

For Kanban, the current pack is `kanban.v1`.

**Pack ID naming convention.** Use camelCase for pack IDs: `kanban.v1`, `logViewer.v1`, `incidentTimeline.v1`. The pack ID's base name should match the `widgets.*` accessor: `widgets.logViewer.*` maps to pack ID `logViewer.v1`. Start with `.v1`. Increment the version only for breaking schema changes. Minor additions like new optional props do not need a version bump.

### Semantic state

Semantic state is the APP-11 rule that VM cards see domain concepts rather than storage topology.

Good examples:

- `state.filters`
- `state.draft`
- `state.app_sales`
- `state.app_hypercard_tools`

Bad examples:

- `state.sessionState`
- `state.cardState`
- `state.domains.rawSlice`

The widget DSL should consume semantic state, not Redux topology.

### Host primitive

A host primitive is a reusable React widget used by the pack renderer. It is not directly exposed to the VM. It sits underneath the DSL.

Examples in Kanban:

- `KanbanHeaderBar`
- `KanbanFilterBar`
- `KanbanHighlights`
- `KanbanLaneView`
- `KanbanStatusBar`
- `KanbanTaskModal`

### VM node

A VM node is a serializable structured object emitted by the VM DSL.

Examples in Kanban:

- `kanban.page`
- `kanban.taxonomy`
- `kanban.header`
- `kanban.filters`
- `kanban.highlights`
- `kanban.board`
- `kanban.status`

## What Kanban Teaches

Kanban is useful because it has enough complexity to force the right architecture:

- it has rich visual structure;
- it has reusable subareas like headers, filters, lanes, cards, highlights, and status rows;
- it has domain-specific state and taxonomy;
- it has host-only behaviors like drag and drop and modals;
- it needs examples that feel different without becoming separate apps.

Before the split, Kanban was too monolithic. It was mostly one board component with too many responsibilities. That was fine for a launcher demo, but not fine for a DSL boundary.

The port succeeded because we split it into layers.

## The Layer Model

Every future widget port should try to reach the same four-layer shape.

### Layer 1: Domain model and state

This layer owns types, serializable state, reducers, selectors, and helper functions.

Kanban examples:

- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/types.ts`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/kanbanState.ts`

What belongs here:

- descriptor types;
- serializable widget state;
- state transitions;
- validation helpers;
- derived state helpers that are independent of React.

What does not belong here:

- JSX;
- DOM events;
- `useState`;
- `useEffect`;
- browser APIs.

**If the widget already has a Redux slice,** the pack renderer typically uses it as the storage backend. The relationship is: VM semantic state flows through the pack renderer, which dispatches Redux actions and reads Redux selectors to feed host primitives. If the existing slice's action names do not match the VM handler names, add a mapping layer in the renderer rather than renaming the slice actions. The slice is internal; the VM handler names are the public contract. If the widget has a standalone (no-Redux) path, that path may still be useful for Storybook but is typically bypassed by the pack renderer.

### Layer 2: Host widget primitives

This layer owns reusable React building blocks.

Kanban examples:

- `KanbanHeaderBar.tsx`
- `KanbanFilterBar.tsx`
- `KanbanLaneView.tsx`
- `KanbanHighlights.tsx`
- `KanbanStatusBar.tsx`

Each primitive should:

- accept plain props;
- avoid hidden data fetching;
- avoid hard wiring itself to Redux when possible;
- be easy to story in isolation;
- map to one semantic concept.

**Shared vs pack-specific primitives.** Some primitives (toolbars, status bars, charts) are generic enough to be shared across multiple packs. These should live in a shared primitives directory (e.g. `rich-widgets/src/primitives/`), not inside the pack-specific widget folder. When extracting primitives, ask: "Would another pack need this exact component?" If yes, keep it shared. If no, put it in the pack-specific directory. Pack-specific primitives typically compose around shared ones. For example, a pack's toolbar component wraps the shared `WidgetToolbar` container with pack-specific search and activity content.

### Layer 3: Pack renderer and validator

This layer defines the VM-visible node schema and maps it to host widgets.

Kanban example:

- `workspace-links/go-go-os-frontend/packages/hypercard-runtime/src/runtime-packs/kanbanV1Pack.tsx`

Responsibilities:

- validate node trees;
- reject malformed or ambiguous nodes;
- build host widget props from node props;
- connect widget callbacks back to runtime event refs.

This layer is the real contract.

### Layer 4: Authored VM cards and docs

This layer proves that the pack is actually usable.

Kanban examples:

- `apps/os-launcher/src/domain/vm/cards/kanbanIncidentCommand.vm.js`
- `apps/os-launcher/src/domain/vm/cards/kanbanReleaseTrain.vm.js`
- `apps/os-launcher/src/domain/vm/cards/kanbanPersonalPlanner.vm.js`
- `apps/os-launcher/src/domain/vm/docs/kanban-pack.docs.vm.js`

Responsibilities:

- show the authoring surface;
- demonstrate varied examples;
- supply pack docs and per-card docs;
- feed generated metadata and debugger tooling later on.

If you do not have authored examples, you do not yet know if the DSL is actually good.

## End-To-End Flow

This is the current flow for Kanban and should be the template for future ports.

```text
VM card source
  -> defineCard(..., 'kanban.v1')
  -> render() returns widgets.kanban.page(...)
  -> QuickJS runtime executes card
  -> runtime pack validator checks node tree
  -> renderer builds KanbanBoardView props
  -> host widgets render page
  -> user clicks / types / drags
  -> host turns event into handler ref call
  -> VM handler runs
  -> handler dispatches semantic runtime action
  -> projected state updates
  -> render() runs again
```

## The Current Authoring Style

The current shipped Kanban pack uses a React-like composition style rather than one giant config object.

This is the right direction for future ports too.

Example:

```js
defineCard(
  'kanbanIncidentCommand',
  ({ widgets }) => ({
    render({ state }) {
      const draft = boardDraft(state);
      return widgets.kanban.page(
        widgets.kanban.taxonomy({
          issueTypes: draft.taxonomy.issueTypes,
          priorities: draft.taxonomy.priorities,
          labels: draft.taxonomy.labels,
        }),
        widgets.kanban.header({
          title: 'Incident Command',
          subtitle: 'Production incident board',
          primaryActionLabel: '+ Incident',
          searchQuery: state.filters.searchQuery,
          onPrimaryAction: { handler: 'openTaskEditor' },
          onSearchChange: { handler: 'search' },
        }),
        widgets.kanban.highlights({
          items: [
            { id: 'sev1', label: 'SEV-1', value: 1, tone: 'danger' },
            { id: 'latency', label: 'Latency', value: '182ms', tone: 'accent' },
          ],
        }),
        widgets.kanban.filters({
          filterType: state.filters.filterType,
          filterPriority: state.filters.filterPriority,
          onSetFilterType: { handler: 'setFilterType' },
          onSetFilterPriority: { handler: 'setFilterPriority' },
          onClearFilters: { handler: 'clearFilters' },
        }),
        widgets.kanban.board({
          columns: draft.columns,
          tasks: draft.tasks,
          editingTask: draft.editingTask,
          collapsedCols: draft.collapsedCols,
          onOpenTaskEditor: { handler: 'openTaskEditor' },
          onCloseTaskEditor: { handler: 'closeTaskEditor' },
          onSaveTask: { handler: 'saveTask' },
          onDeleteTask: { handler: 'deleteTask' },
          onMoveTask: { handler: 'moveTask' },
          onToggleCollapsed: { handler: 'toggleCollapsed' },
        }),
        widgets.kanban.status({
          metrics: [
            { label: 'open', value: 7 },
            { label: 'customer', value: 4 },
          ],
        }),
      );
    },
    handlers: kanbanCardHandlers(boardById('kanbanIncidentCommand')),
  }),
  'kanban.v1',
);
```

Why this style is better than `kanban.board({ everything })`:

- it lets cards differ structurally;
- it reads like composition instead of a prop dump;
- it makes optional areas explicit;
- it encourages extraction of host primitives;
- it gives the validator clearer node boundaries.

## Porting Checklist

Use this as the default sequence for the next widget family.

### Phase 1: Decide whether the widget deserves a pack

Ask:

- Is the widget domain-specific enough that generic `ui.*` nodes are too weak?
- Is there a stable semantic model?
- Are there reusable host subareas?
- Can we keep browser/DOM mechanics on the host?
- Will authored examples benefit from structure rather than arbitrary React?

If the answer is mostly no, do not make a runtime pack.

### Phase 2: Audit the existing widget

Inventory:

- major visual regions;
- state model;
- domain types;
- derived selectors;
- event flows;
- DOM-specific concerns;
- current Storybook coverage;
- fake chrome or demo-only code that should not cross into the pack.

Create a table like this:

```text
feature               belongs where
-------------------   ------------------------------------------
domain state          layer 1
task taxonomy         layer 1
search/filter logic   layer 1 or renderer glue
toolbar UI            layer 2
lane rendering        layer 2
drag/drop             layer 2 host only
modal editor          layer 2 host only
DSL nodes             layer 3
VM demo cards         layer 4
```

### Phase 3: Extract domain state from UI

You want serializable state and stable descriptors before you design the DSL.

For Kanban, that meant:

- moving away from hardcoded unions;
- using descriptor arrays for issue types, priorities, and labels;
- keeping editing state serializable;
- keeping helper functions like board mutations and sanitization independent of React.

Pseudocode:

```ts
type WidgetState = {
  items: Item[];
  taxonomy: DescriptorSet;
  filters: FilterState;
  editingItem: Partial<Item> | null;
};

function updateItem(state: WidgetState, patch: Patch): WidgetState {
  ...
}
```

### Phase 3b: Decide where derived data is computed

Not all derived state belongs in the VM. Some widgets require expensive computations over large data sets -- filtering thousands of log entries, computing aggregations, bucketing time-series data. Decide early which computations live in the VM and which live in the host.

Rules of thumb:

- **Default:** If the computation is cheap and the VM needs the result for composition decisions (e.g. choosing which nodes to include), compute in the VM.
- **Performance:** If the computation involves iterating large collections (hundreds or more items), prefer host-side computation with memoization.
- **Boundary:** When the host computes derived data, the VM should still pass the *configuration* (filter parameters, sort order) through DSL props. The host applies that configuration internally.
- **Transparency:** Document which computations are host-owned in the pack docs so authors do not try to replicate them in card code.

For Kanban, most computation is VM-side because the data sets are small (tens of tasks). For a widget like a log viewer with thousands of entries, filtering and aggregation should be host-side.

**Time-driven behaviors.** If the widget has streaming, polling, animation timers, or any form of host-driven data generation, these are host-only mechanics. The VM can set configuration (e.g. "streaming is on" or "poll interval is 5s") but the host owns the timer lifecycle, cleanup, and side effects. Do not expose timer details in the DSL.

### Phase 4: Split host primitives

**If the widget is already partially decomposed,** audit the existing decomposition before starting fresh. Look for existing model/callback separations (these may map directly to pack renderer inputs), shared primitives already in use (these stay as-is; new primitives compose around them), and standalone/connected dual paths (the standalone path may be less relevant for pack rendering, which uses its own state management). The goal is not to throw away existing structure but to complete it to the four-layer shape.

Do not jump directly from one monolithic widget to a VM DSL. You need a reusable host layer first.

Good extraction targets are:

- header bars;
- toolbars;
- metric rows;
- lane widgets;
- list views;
- status bars;
- modal editors.

Good rule:

- one semantic idea per primitive;
- props should be boring and explicit;
- avoid hidden coupling to one specific page shell.

Kanban examples:

- `KanbanHeaderBar.tsx`
- `KanbanFilterBar.tsx`
- `KanbanHighlights.tsx`
- `KanbanLaneView.tsx`
- `KanbanStatusBar.tsx`

### Phase 5: Add Storybook for each extracted primitive

This is mandatory.

Every new primitive needs direct host-side stories before or alongside the pack work.

Why:

- you can review the host widget without the runtime involved;
- layout bugs become much easier to diagnose;
- you can demonstrate narrow cases like one lane, two lanes, dense metrics, empty states, or collapsed states;
- later widget ports will copy the pattern from stories.

Kanban examples:

- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanHighlights.stories.tsx`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanBoardView.stories.tsx`
- `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanTaskModal.stories.tsx`

For future ports, require stories that prove:

- empty state;
- minimal state;
- dense state;
- unusual but valid layout;
- domain-specific example.

### Phase 6: Design the DSL from semantic building blocks

Do not start by mirroring React props.

Do start by asking:

- what concepts does the author need?
- what should be optional?
- what should be host-owned?
- what should remain stable if the host widget internals change?

For Kanban, the right node set was:

- `page`
- `taxonomy`
- `header`
- `filters`
- `highlights`
- `board`
- `status`

That is much better than exposing:

- `WidgetToolbar`
- `SearchBar`
- `ButtonGroup`
- `Sparkline`
- `ProgressBar`

Those host widgets still exist, but the DSL should speak domain concepts first.

**Optional children and layout adaptation.** Not all children need to be present. The pack renderer should handle absent children gracefully. If a child is absent, the host adapts its layout (e.g. two columns instead of three when a detail panel is omitted). The validator should not require all children -- only the page root and the minimum content needed for a useful view. Do not make the VM pass `showDetail: false` or `hideFilters: true` flags -- let omission be the opt-out mechanism. Document which children are optional and what the layout looks like without them.

### Phase 7: Add helpers in `stack-bootstrap.vm.js`

The VM authoring surface comes from `workspace-links/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js`.

For a new pack, you need:

- a pack ID;
- helper constructors that emit serializable nodes;
- helper injection selected by `packId`.

Simplified pattern:

```js
const __widgets = {
  myPack: {
    page(...children) {
      return { kind: 'myPack.page', children: children.flat().filter(Boolean) };
    },
    header(props = {}) {
      return { kind: 'myPack.header', props: safeObject(props) };
    },
    board(props = {}) {
      return { kind: 'myPack.board', props: safeObject(props) };
    },
  },
};

function createPackHelpers(packId) {
  if (packId === 'my-pack.v1') {
    return { widgets: __widgets };
  }
  ...
}
```

### Phase 8: Implement validator and renderer

The pack validator/renderer is the contract enforcement point.

For each node:

- assert shape;
- assert required props;
- assert event refs where applicable;
- normalize optional props;
- map to host widget props.

Pattern:

```ts
function assertMyPackHeader(value: unknown, path: string): asserts value is MyPackHeaderNode {
  ...
}

function renderMyPackTree(tree: MyPackPageNode, runtime: RuntimeContext) {
  const header = ...
  return (
    <MyPackPageView
      header={...}
      board={...}
      onAction={(handler, args) => runtime.onEvent(handler, args)}
    />
  );
}
```

Treat this as product API code, not just glue code.

**Large collections.** If the semantic state includes large collections (hundreds or more items), avoid passing them through DSL node props on every render cycle. The JSON serialization overhead can be significant. Instead, let the host read the collection directly from semantic state via its own selectors. Pass only identifiers, counts, configuration, or small derived summaries through DSL props. Document which data the host reads directly versus what comes through props.

### Phase 9: Author real demo cards

Do not stop at one example.

You want demos that prove the surface is flexible:

- one-lane view;
- two-lane view;
- dense operational view;
- quieter personal planner;
- a board with highlights;
- a board without filters;
- a board with custom taxonomy.

Kanban examples now cover this intentionally:

- `kanbanPersonalPlanner.vm.js`
- `kanbanReleaseTrain.vm.js`
- `kanbanIncidentCommand.vm.js`

The demos should be self-contained enough to teach the DSL. They should not be over-factored into abstract framework code that hides the authoring surface.

### Phase 10: Write pack docs and metadata

The pack is not finished until its DSL is documented.

Current pattern:

- docs authored in VM-facing files under `apps/os-launcher/src/domain/vm/docs/`
- metadata generated into `apps/os-launcher/src/domain/generated/`
- exported through `apps/os-launcher/src/domain/vmmeta.ts`

The docs should explain:

- what the pack is for;
- each DSL symbol;
- what the host owns versus what the VM owns;
- example usage patterns;
- limitations.

### Phase 11: Validate the whole path

**What to test per layer:**

1. **Host primitives (Storybook).** Visual regression across empty, minimal, dense, and edge-case states. Verify callback invocation. Prove that each primitive renders correctly in isolation without the runtime.
2. **Pack validator.** Reject malformed nodes (missing required props, wrong types, unexpected children). Accept all valid node shapes including minimal variants with optional children omitted and maximal variants with everything present.
3. **Pack renderer.** Given a valid node tree and a mock runtime context, produce the expected component tree. Verify that handler refs are correctly wired to runtime event calls.
4. **VM demo cards.** Card source evaluates without errors in QuickJS. Render function returns a valid node tree that passes the validator. Handlers dispatch correct semantic actions.
5. **Integration.** End-to-end smoke in the running system. Verify that user interactions (click, type, toggle) correctly round-trip through handler, action, state update, and re-render.

Kanban-related validation commands commonly used:

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend
npm run storybook:check
npm run typecheck -w packages/hypercard-runtime
npx vitest run packages/hypercard-runtime/src/runtime-packs/runtimePackRegistry.test.tsx
npx vitest run packages/hypercard-runtime/src/plugin-runtime/runtimeService.integration.test.ts
```

### Phase 12: Migrate existing consumers

If the widget is already used somewhere (stories, launcher modules, direct imports), the port does not delete the old widget. It adds a new consumption path through the pack. Existing direct-use consumers can migrate at their own pace.

The typical progression is:

1. Extract primitives, keep the original component working.
2. Add pack renderer that uses the same primitives.
3. Author VM demo cards that prove the pack works.
4. Migrate existing consumers from direct component import to pack-rendered cards.
5. Deprecate direct component import when all consumers have migrated.

## A Good Node Set Versus A Bad Node Set

Good:

```text
incident.page
incident.header
incident.timeline
incident.metrics
incident.status
incident.editor
```

Bad:

```text
row
column
box
buttonGroup
searchBar
progressBar
sparkline
```

Why:

- the good set is domain-stable;
- the bad set is host-implementation-shaped.

The host can still render the good set using generic lower-level primitives. The VM should not have to know that.

## Domain Structure With Flexible Sub-Elements

The rule "speak domain concepts, not host widgets" is correct at the top level. A log viewer page should be composed of log-viewer-shaped nodes. A kanban board should be composed of kanban-shaped nodes. The top-level structure and page composition provide a consistent design language per domain.

But within those domain containers, cards need flexibility. Not every detail panel shows the same metadata fields. Not every toolbar has the same action buttons. Not every status bar shows the same metrics.

The design principle is two layers:

```text
Outer layer: domain-shaped containers
  - logViewer.sidebar, logViewer.detail, kanban.board
  - these define the consistent look and organization
  - they are what make a log viewer look like a log viewer

Inner layer: flexible sub-elements
  - field lists, action buttons, metric badges, sparklines
  - these are authorable and vary between cards
  - they are not domain-specific in shape, even though they live inside domain containers
```

This means the DSL will naturally develop some nodes that are closer to generic building blocks. A `detailFields` node that takes `{ fields: [{ label, value }] }` is not really log-viewer-specific -- it is a generic field list pattern that happens to live inside a log-viewer detail panel. A `detailActions` node that takes `{ actions: [{ label, handler }] }` is a generic action button pattern.

This is fine. The key constraint is that the **containers** stay domain-shaped. The card author writes `logViewer.detail(...)`, not `ui.panel(...)`. The domain container provides the structural guarantee and the visual consistency. The sub-elements provide the per-card flexibility.

Over time, as more packs reveal shared inner patterns (field lists, metric displays, action groups), those patterns may graduate into a shared `ui.*` namespace that any pack can compose with. But do not force this prematurely. Let the patterns emerge from real pack work first. When three different packs all define their own `fields: [{ label, value }]` sub-element, that is the signal to extract a shared `ui.fieldList`.

The progression is:

1. First pack: define the sub-element inline as a pack-specific node (`logViewer.detailFields`).
2. Second pack: notice the pattern repeats, but keep it pack-specific (`incident.metadataFields`).
3. Third pack: extract the shared pattern into `ui.fieldList` and let all three packs compose with it.

Do not start at step 3.

## Anti-Patterns

Avoid these. Kanban forced us to learn them the hard way.

### Anti-pattern 1: One mega root node with every prop

Symptom:

- `widgets.somePack.board({ 45 props })`

Why it is bad:

- optional combinations become hard to reason about;
- examples all look the same;
- the validator becomes mushy;
- the renderer becomes a giant prop mapper.

### Anti-pattern 2: Exposing host widgets directly

Symptom:

- VM authors call host widget names or host component-like prop bags.

Why it is bad:

- DSL stability collapses;
- host refactors become authored-card breakage;
- prompt policy becomes harder to control.

### Anti-pattern 3: Putting host-only mechanics into the DSL

Symptom:

- drag preview shape;
- keyboard focus management;
- modal stacking;
- pointer event implementation details.

These belong in the host.

### Anti-pattern 4: Over-factoring demo cards

Symptom:

- examples become tiny wrappers around a large shared helper layer;
- readers cannot tell what the DSL actually looks like.

Keep examples fairly self-contained. Share only the parts that genuinely reduce noise.

### Anti-pattern 5: No Storybook until the end

This usually means the widget split is not actually reusable yet.

## How To Decide Granularity

A useful rule of thumb:

- split when authors should be able to include, omit, or reorder a concept;
- do not split when the result would just expose host layout trivia.

Examples:

- `header`, `filters`, `highlights`, `status`: good splits
- `searchInputLeftPadding`, `statusBarFlexGrow`: bad splits

## How To Handle Taxonomy And Custom Types

Kanban needed this because fixed unions like `high | medium | low` and `bug | feature` were too rigid.

Future widget packs should assume that domain vocabularies vary.

Prefer descriptor-driven shapes:

```ts
type OptionDescriptor = {
  id: string;
  label: string;
  icon?: string;
  color?: string;
};

type Taxonomy = {
  issueTypes: OptionDescriptor[];
  priorities: OptionDescriptor[];
  labels: OptionDescriptor[];
};
```

This makes both the host and VM more flexible without widening the DSL in the wrong direction.

## How To Think About Prompt Policy

If cards are AI-authored, the prompt policy must teach the same contract the runtime validates.

That means:

- pack ID must be explicit;
- DSL symbols must be documented clearly;
- examples should model the preferred composition style;
- the policy should forbid host escape hatches.

Even if the current work is hand-authored, write the pack docs as if a model will later need them. That discipline helps humans too.

## How Generated Metadata Fits In

Generated metadata is not the DSL itself. It is support infrastructure around the DSL.

Current uses:

- preserve exact card source strings;
- register per-card docs;
- register pack docs;
- support debugger and future doc-browser integrations.

Relevant files:

- `apps/os-launcher/src/domain/generated/kanbanVmmeta.generated.ts`
- `apps/os-launcher/src/domain/vmmeta.ts`

Treat this as a parallel track:

- authored card and docs files are the source of truth;
- generated metadata is the consumable index.

## Review Checklist

When reviewing a widget-to-pack port, ask:

- Does the widget have a stable semantic model?
- Are host primitives split cleanly and story-backed?
- Does the DSL use domain concepts instead of host widget names?
- Does the validator reject malformed trees early?
- Are host-only mechanics still host-owned?
- Do the demo cards prove different shapes, not just different data?
- Is the documentation good enough for a new intern to author a card?
- Is the pack small enough to reason about but broad enough to be useful?

If several answers are no, the port is probably not ready.

## Suggested Workflow For The Next Widget

Use this sequence:

1. Audit the existing widget (including any existing decomposition).
2. Write down domain concepts and host-only mechanics.
3. Decide where derived data is computed (VM vs host).
4. Extract host primitives (reuse shared primitives where they exist).
5. Add Storybook for every extracted primitive.
6. Design a semantic node set with domain containers and flexible sub-elements.
7. Add VM helper constructors.
8. Add validator and renderer (handle optional children gracefully).
9. Author 3-5 varied demo cards (prove structural variation, not just data variation).
10. Write pack docs (document host-owned computation and optional children).
11. Add metadata generation if needed.
12. Validate per layer (primitives, validator, renderer, cards, integration).
13. Migrate existing consumers if applicable.

Do not reverse the order by starting with prompt text or by exposing host internals early.

## Kanban Case Study Summary

What changed from the earlier Kanban shape:

- The old single `kanban.board({...})` shape was replaced by page-style composition.
- Header, filters, highlights, lanes, and status became clearer host concepts.
- Taxonomy became descriptor-driven instead of fixed unions.
- Demo cards became more varied and more instructive.
- Storybook became part of the extraction requirement, not an afterthought.

That is the pattern to copy.

## Appendix: Quick File Map

If you need to re-open the main seams quickly:

- VM helper surface:
  - `workspace-links/go-go-os-frontend/packages/hypercard-runtime/src/plugin-runtime/stack-bootstrap.vm.js`
- Pack validator and renderer:
  - `workspace-links/go-go-os-frontend/packages/hypercard-runtime/src/runtime-packs/kanbanV1Pack.tsx`
- Host view assembly:
  - `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/KanbanBoardView.tsx`
- Host subwidgets:
  - `workspace-links/go-go-os-frontend/packages/rich-widgets/src/kanban/`
- VM docs:
  - `apps/os-launcher/src/domain/vm/docs/kanban-pack.docs.vm.js`
- VM examples:
  - `apps/os-launcher/src/domain/vm/cards/`
- Generated metadata:
  - `apps/os-launcher/src/domain/generated/kanbanVmmeta.generated.ts`
  - `apps/os-launcher/src/domain/vmmeta.ts`

## Final Rule

If a future port feels like “just expose the component,” stop and redesign the seam.

The goal is not to make the VM more powerful by leaking implementation details.

The goal is to make the VM more expressive by giving it the right building blocks: domain-shaped containers for consistent structure, and flexible sub-elements for per-card variation.
