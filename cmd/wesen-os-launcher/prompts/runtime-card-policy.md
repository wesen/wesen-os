When the user's request clearly calls for a visual runtime surface (detail panel,
dashboard, form, chooser, drilldown, report, small tool, interactive widget,
etc.), emit exactly one `<hypercard:card:v2>` block containing a YAML payload.

Always fully close the block. After the YAML code fence, emit the exact closing
tag:

`</hypercard:card:v2>`

Do not stop after the closing ``` fence. The outer tag must also be closed.

Before the tag, output one short plain-language sentence that says what the
surface does.

## Required Envelope

````text
<hypercard:card:v2>
```yaml
name: Short Name
title: Longer Window Title
artifact:
  id: stable-kebab-case-id
  data: {}
runtime:
  pack: ui.card.v1
card:
  id: lowerCamelCardId
  code: |-
    ({ ui }) => ({
      render() {
        return ui.panel([
          ui.text("Hello")
        ]);
      }
    })
```
</hypercard:card:v2>
````

Field rules:

- `name`: 1-5 words. Shown while the card is streaming.
- `title`: sentence-length window title.
- `artifact.id`: stable kebab-case identifier.
- `artifact.data`: optional metadata object.
- `runtime.pack`: required for every card. Use `ui.card.v1` for normal UI cards and a pack-specific id such as `kanban.v1` for specialized cards.
- `card.id`: lowerCamelCase JS identifier.
- `card.code`: a single JavaScript expression.

## Pack Selection

There are currently two runtime-package authoring modes:

- Default UI surface:
  - include `runtime.pack: ui.card.v1`
  - use `({ ui }) => ({ ... })`
  - return the normal `ui.*` tree
- Kanban surface:
  - include `runtime.pack: kanban.v1`
  - use `({ widgets }) => ({ ... })`
  - the root MUST be `widgets.kanban.page(...)` containing BOTH a
    `widgets.kanban.taxonomy({...})` child and a `widgets.kanban.board({...})`
    child (a bare `widgets.kanban.board(...)` root is rejected with
    "root.kind must be 'kanban.page'")

If the user is asking for a Kanban board, sprint board, backlog board, or task
lane UI, you must use the Kanban pack. Do not fake a Kanban board with generic
`ui.row` / `ui.column` trees.

Kanban envelope example:

````text
<hypercard:card:v2>
```yaml
name: Sprint Board
title: Sprint board for open implementation tasks
artifact:
  id: sprint-board
  data:
    boardId: sprint-24
runtime:
  pack: kanban.v1
card:
  id: sprintBoard
  code: |-
    ({ widgets }) => ({
      render({ state }) {
        const board = state.app_kanban ?? {};
        const columns = Array.isArray(board.columns) && board.columns.length > 0
          ? board.columns
          : [
              { id: "todo", title: "Todo", icon: "📋" },
              { id: "doing", title: "Doing", icon: "🔨" },
              { id: "done", title: "Done", icon: "✅" }
            ];
        const tasks = Array.isArray(board.tasks) && board.tasks.length > 0
          ? board.tasks
          : [
              { id: "t1", col: "todo", title: "First task", type: "task", priority: "med", desc: "", labels: [] }
            ];
        return widgets.kanban.page(
          widgets.kanban.taxonomy({
            issueTypes: [{ id: "task", label: "Task", icon: "📌" }],
            priorities: [
              { id: "low", label: "Low" },
              { id: "med", label: "Medium" },
              { id: "high", label: "High" }
            ],
            labels: []
          }),
          widgets.kanban.board({
            columns,
            tasks,
            editingTask: board.editingTask ?? null,
            collapsedCols:
              board.collapsedCols && typeof board.collapsedCols === "object" && !Array.isArray(board.collapsedCols)
                ? board.collapsedCols
                : {},
            onOpenTaskEditor: { handler: "openTaskEditor" },
            onCloseTaskEditor: { handler: "closeTaskEditor" },
            onSaveTask: { handler: "saveTask" },
            onDeleteTask: { handler: "deleteTask" },
            onMoveTask: { handler: "moveTask" },
            onToggleCollapsed: { handler: "toggleCollapsed" }
          })
        );
      },
      handlers: {
        openTaskEditor({ dispatch }, args) {
          dispatch({ type: "kanban/editing-task.set", payload: args?.task ?? null });
        },
        closeTaskEditor({ dispatch }) {
          dispatch({ type: "kanban/editing-task.set", payload: null });
        },
        saveTask({ dispatch }, args) {
          dispatch({ type: "kanban/task.upsert", payload: args?.task ?? null });
        },
        deleteTask({ dispatch }, args) {
          dispatch({ type: "kanban/task.delete", payload: { id: String(args?.id ?? "") } });
        },
        moveTask({ dispatch }, args) {
          dispatch({ type: "kanban/task.move", payload: args });
        },
        toggleCollapsed({ dispatch }, args) {
          dispatch({ type: "kanban/column.toggle-collapsed", payload: { columnId: String(args?.columnId ?? "") } });
        }
      }
    })
```
</hypercard:card:v2>
````

Kanban tree rules (kanban.v1 pack contract):

- root: `widgets.kanban.page(...children)`; must include one
  `widgets.kanban.taxonomy(...)` and one `widgets.kanban.board(...)`.
- `taxonomy` props: `{ issueTypes: [{id,label,icon?,color?}], priorities:
  [{id,label,...}], labels: [{id,label,...}] }` — all three arrays required.
- `board` props: `columns: [{id,title,icon}]` (all required strings), `tasks:
  [{id,col,title,type,priority,desc,labels}]` (all required; `labels` is a
  string array, `desc` may be ""), optional `editingTask`, `collapsedCols`,
  and `{handler}` event refs as in the example.
- Optional extra children: `widgets.kanban.header({title,...})`,
  `widgets.kanban.filters({...})`, `widgets.kanban.highlights({items})`,
  `widgets.kanban.status({metrics})`.

## Strong Default For Small Models

Unless you have a very specific reason not to, always use this pattern:

```js
({ ui }) => ({
  render({ state }) {
    return ui.panel([
      ui.text("Title"),
      ui.button("Close", { onClick: { handler: "close" } })
    ]);
  },
  handlers: {
    close({ dispatch }) {
      dispatch({ type: "window.close" });
    }
  }
})
```

Preferred style:

- Always use the factory form `({ ui }) => ({ ... })`.
- Always return exactly one root node: `ui.panel([...])`.
- Keep `render()` pure. Read state, compute values, return UI.
- Keep handlers short. Read args, dispatch intents, stop.
- Prefer plain strings, arrays, numbers, booleans, and simple objects.
- Convert uncertain values with `String(...)` or `Number(...)`.
- If UI is conditional, build a `children` array and `push()` nodes into it.
- If a widget is not listed below, assume it does not exist.

## `card.code` Contract

`card.code` must evaluate to a card definition object.

Required:

- `render(ctx)` -> returns one UI node tree.

Optional:

- `handlers` -> object whose keys are handler names and values are functions.

Accepted forms:

1. Recommended factory form:

```js
({ ui }) => ({
  render() {
    return ui.panel([ui.text("Hello")]);
  }
})
```

2. Raw object form, not recommended:

```js
({
  render() {
    return {
      kind: "panel",
      children: [
        { kind: "text", text: "Hello" }
      ]
    };
  }
})
```

The outermost `card.code` value must be one expression. Inside `render()` and
handler bodies, normal JavaScript statements are fine.

## UI DSL Cheat Sheet

Every UI node must match one of these exact shapes.

Think about card UIs in layers:

- `panel` is the whole card body.
- `column` and `row` arrange content.
- `text` and `badge` explain what the user is seeing.
- `button` and `input` let the user act or type.
- `table`, `dropdown`, `selectableTable`, and `gridBoard` present structured data or choices.

Quick widget choice guide:

- Use `text` for readable copy, labels, headings, and empty states.
- Use `badge` for short status chips like `Open`, `3 selected`, or `Healthy`.
- Use `table` when data is read-only.
- Use `selectableTable` when the user should pick rows, search rows, or click rows.
- Use `dropdown` when the user must choose one option from a short list.
- Use `gridBoard` when the choice is spatial or cell-based rather than row-based.

### Layout

- `ui.panel(children)`
  - Root container.
  - Shape: `{ kind: "panel", children: [...] }`

`ui.panel` is the outer shell of the card. Most cards should have exactly one
panel at the root, with everything else nested inside it.

- `ui.column(children)`
  - Vertical container.
  - Shape: `{ kind: "column", children: [...] }`

`ui.column` stacks things from top to bottom. Use it for most cards: title,
description, filters, summary badges, then a table or other widget below.

- `ui.row(children)`
  - Horizontal container.
  - Shape: `{ kind: "row", children: [...] }`

`ui.row` places a small number of items side by side. Use it for button bars,
label-plus-input lines, or small control groups. If a row starts feeling crowded,
switch to a column.

Example:

```js
ui.panel([
  ui.row([
    ui.text("Left"),
    ui.badge("Right")
  ])
])
```

### Basic Display

- `ui.text(text)`
  - Shape: `{ kind: "text", text: "..." }`

`ui.text` is the default readable content widget. Use it for titles, labels,
descriptions, warnings, helper text, and empty-state messages.

- `ui.badge(text)`
  - Shape: `{ kind: "badge", text: "..." }`

`ui.badge` is for short, glanceable state. Good badge content is compact:
status, counts, selected item names, priority, or mode. If the content is a full
sentence, use `ui.text` instead.

Example:

```js
ui.panel([
  ui.text("Server status"),
  ui.badge("Healthy")
])
```

### Button

- `ui.button(label, props?)`
  - Required: `label`
  - Optional: `variant`, `onClick`
  - Shape:

`ui.button` represents an intentional user action: save, close, refresh,
navigate, submit, clear, choose, open details. If the user is not meant to click
it, it should not be a button.

```js
ui.button("Run", {
  variant: "primary",
  onClick: { handler: "runJob", args: { jobId: "daily-sync" } }
})
```

Safe `variant` values:

- `"default"`
- `"primary"`
- `"danger"`

If unsure, omit `variant`.

Use variants to hint importance:

- `default`: neutral action
- `primary`: main action on the card
- `danger`: destructive or clearing action

### Input

- `ui.input(value, props?)`
  - Required: `value` string
  - Optional: `placeholder`, `onChange`
  - Shape:

`ui.input` is a single-line text field. Use it for search, filter text,
editable names, quantities, ids, notes, or other short values. Keep its current
value in `state.draft` unless the task clearly calls for session-shared state in
`state.filters`.

```js
ui.input(query, {
  placeholder: "Search",
  onChange: { handler: "setQuery" }
})
```

### Table

- `ui.table(rows, { headers })`
  - `headers`: string array
  - `rows`: array of row arrays

`ui.table` is the simplest data widget. Use it when the user mainly needs to
read values. It does not support selection or search callbacks. If the user needs
to pick rows or interact with rows, use `ui.selectableTable` instead.

```js
ui.table(
  [
    ["A-100", "Widget", "12"],
    ["A-101", "Cable", "4"]
  ],
  { headers: ["SKU", "Name", "Qty"] }
)
```

### Dropdown

- `ui.dropdown(options, props)`
  - `options`: string array
  - `props.selected`: zero-based selected index
  - Optional: `onSelect`, `width`

`ui.dropdown` is a compact one-of-many chooser. Use it for things like status,
priority, theme, category, sort mode, or view mode, especially when the option
set is short and the user should choose exactly one value.

```js
ui.dropdown(["Low", "Medium", "High"], {
  selected: 1,
  onSelect: { handler: "setPriority" },
  width: 180
})
```

### Selectable Table

- `ui.selectableTable(rows, props)`
  - `headers`: string array
  - `rows`: array of row arrays
  - Optional:
    - `selectedRowKeys: string[]`
    - `mode: "single" | "multiple"`
    - `rowKeyIndex: number`
    - `searchable: boolean`
    - `searchText: string`
    - `searchPlaceholder: string`
    - `emptyMessage: string`
    - `onSelectionChange`
    - `onSearchChange`
    - `onRowClick`

`ui.selectableTable` is the richer data-grid widget. Use it when the user should
select records, inspect row sets, search within a list, or click through from a
row into a detail flow. This is the right choice for "pick items", "select tasks",
"choose contacts", or "browse matching rows".

```js
ui.selectableTable(
  [
    ["A-100", "Widget", "12"],
    ["A-101", "Cable", "4"]
  ],
  {
    headers: ["SKU", "Name", "Qty"],
    selectedRowKeys: ["A-100"],
    mode: "multiple",
    rowKeyIndex: 0,
    searchable: true,
    searchText: "",
    onSelectionChange: { handler: "setSelection" },
    onSearchChange: { handler: "setSearch" },
    onRowClick: { handler: "openRow" }
  }
)
```

### Grid Board

- `ui.gridBoard(props)`
  - Required: `rows`, `cols`
  - Optional:
    - `cells`
    - `selectedIndex` (`number` or `null`)
    - `cellSize: "small" | "medium" | "large"`
    - `disabled`
    - `onSelect`

`ui.gridBoard` is a spatial chooser made of cells. Use it when position matters:
seat maps, board coordinates, bin locations, slot pickers, calendar-like grids,
or small dashboards where the user clicks a cell rather than a row.

Cell shape:

```js
{
  value: "A1",
  label: "A1",
  color: "#d9f99d",
  disabled: false,
  style: "solid"
}
```

Grid example:

```js
ui.gridBoard({
  rows: 2,
  cols: 2,
  selectedIndex: 0,
  cellSize: "small",
  cells: [
    { label: "A1" },
    { label: "A2" },
    { label: "B1" },
    { label: "B2", disabled: true }
  ],
  onSelect: { handler: "pickCell" }
})
```

Treat `gridBoard` as a grid of interactive tiles. Each cell can carry short
visual metadata like a label, value, color, or disabled state.

## Common UI Patterns

Use simple compositions instead of trying to build a very dense card.

- Summary card
  - Usually `panel` -> `text` -> a few `badge`s -> `table`
  - Good for reports, health summaries, counts, and quick overviews.

- Filter/search card
  - Usually `panel` -> `row` or `column` containing `input`, `dropdown`, and maybe a `button`
  - Good for narrowing a list or setting one active filter.

- Record picker card
  - Usually `panel` -> explanation `text` -> `selectableTable` -> action `button`s
  - Good when the user needs to choose one or more rows.

- Spatial picker card
  - Usually `panel` -> explanation `text` -> `gridBoard` -> `badge`
  - Good when the user chooses by position rather than by record row.

For smaller models, prefer one main interactive widget per card instead of many
competing widgets on the same screen.

## Event Ref Shape

Every event hook uses this shape:

```js
{ handler: "handlerName", args: { optional: "static values" } }
```

The `handler` string must be non-empty.

## Event Payloads

Handlers receive any static `args` plus widget event payloads.

- `button.onClick`
  - No extra event payload. The handler receives only `args`.

- `input.onChange`
  - Adds `{ value }`

- `dropdown.onSelect`
  - Adds `{ index, value }`

- `selectableTable.onSelectionChange`
  - Adds `{ selectedRowKeys }`

- `selectableTable.onSearchChange`
  - Adds `{ value }`

- `selectableTable.onRowClick`
  - Adds `{ rowIndex, rowKey, rowValues }`

- `gridBoard.onSelect`
  - Adds `{ row, col, cellIndex }`

If both static `args` and event payload exist, they are merged into one object.

## Render Context

`render({ state })`

- `state`
  - The single VM-facing state object projected by the host.
  - Read the fields you need for the current UI: for example `state.draft`,
    `state.filters`, `state.inventory`, `state.sales`, `state.nav`, or
    `state.ui`.
  - Do not assume every card gets the same shape. Use only fields justified by
    the task context or examples already in play.

Do not assume specific domain names unless the user or conversation context
gives them to you.

## Handler Context

Each handler receives `(ctx, args)`.

Available APIs:

- `ctx.state`
- `ctx.dispatch({ type, payload, meta? })`

Conservative local state actions:

- `ctx.dispatch({ type: "draft.patch", payload: { query: "abc" } })`
- `ctx.dispatch({ type: "draft.set", payload: { path: "form.title", value: "Hello" } })`
- `ctx.dispatch({ type: "draft.reset" })`

- `ctx.dispatch({ type: "filters.patch", payload: { selectedView: "detail" } })`
- `ctx.dispatch({ type: "filters.set", payload: { path: "status", value: "open" } })`
- `ctx.dispatch({ type: "filters.reset" })`

Domain actions are app-defined. Use them only when the reducer action type is
clearly available from the task context.

System actions:

- `ctx.dispatch({ type: "nav.go", payload: { surfaceId: "someSurface", param: "optional" } })`
- `ctx.dispatch({ type: "nav.back" })`
- `ctx.dispatch({ type: "notify.show", payload: { message: "Done" } })`
- `ctx.dispatch({ type: "window.close" })`

## Tiny Examples

### 1. Minimal read-only surface

```js
({ ui }) => ({
  render() {
    return ui.panel([
      ui.text("Hello from a runtime surface")
    ]);
  }
})
```

### 2. Small local-state input surface

```js
({ ui }) => ({
  render({ state }) {
    const draft = String(state?.draft?.draft ?? "");
    return ui.panel([
      ui.text("Quick Note"),
      ui.input(draft, {
        placeholder: "Type here",
        onChange: { handler: "setDraft" }
      }),
      ui.badge(draft ? "Typing" : "Empty")
    ]);
  },
  handlers: {
    setDraft({ dispatch }, args) {
      dispatch({ type: "draft.patch", payload: { draft: String(args?.value ?? "") } });
    }
  }
})
```

### 3. Small dropdown chooser

```js
({ ui }) => ({
  render({ state }) {
    const selected = Number(state?.draft?.priorityIndex ?? 0);
    return ui.panel([
      ui.text("Priority"),
      ui.dropdown(["Low", "Medium", "High"], {
        selected,
        onSelect: { handler: "setPriority" }
      }),
      ui.badge("Selected index: " + String(selected))
    ]);
  },
  handlers: {
    setPriority({ dispatch }, args) {
      dispatch({
        type: "draft.patch",
        payload: {
          priorityIndex: Number(args?.index ?? 0),
          priorityLabel: String(args?.value ?? "")
        }
      });
    }
  }
})
```

### 4. Small selectable table

```js
({ ui }) => ({
  render({ state }) {
    const selectedRowKeys = Array.isArray(state?.draft?.selectedRowKeys)
      ? state.draft.selectedRowKeys
      : [];
    return ui.panel([
      ui.selectableTable(
        [
          ["A-100", "Widget", "12"],
          ["A-101", "Cable", "4"]
        ],
        {
          headers: ["SKU", "Name", "Qty"],
          selectedRowKeys,
          mode: "multiple",
          rowKeyIndex: 0,
          onSelectionChange: { handler: "setSelection" }
        }
      ),
      ui.badge("Selected: " + selectedRowKeys.join(", "))
    ]);
  },
  handlers: {
    setSelection({ dispatch }, args) {
      dispatch({
        type: "draft.patch",
        payload: {
          selectedRowKeys: Array.isArray(args?.selectedRowKeys) ? args.selectedRowKeys : []
        }
      });
    }
  }
})
```

### 5. Small grid board

```js
({ ui }) => ({
  render({ state }) {
    const selectedIndex = state?.draft?.selectedIndex ?? 0;
    return ui.panel([
      ui.gridBoard({
        rows: 2,
        cols: 2,
        selectedIndex,
        cellSize: "small",
        cells: [
          { label: "A1" },
          { label: "A2" },
          { label: "B1" },
          { label: "B2" }
        ],
        onSelect: { handler: "pickCell" }
      }),
      ui.badge("Cell: " + String(selectedIndex))
    ]);
  },
  handlers: {
    pickCell({ dispatch }, args) {
      dispatch({
        type: "draft.patch",
        payload: {
          selectedIndex: Number(args?.cellIndex ?? 0)
        }
      });
    }
  }
})
```

## Avoid These Mistakes

- Do not emit unsupported node kinds.
- Do not put `null`, `undefined`, or `false` directly inside `children`.
- Do not use `import`, `export`, `require`, `eval`, `Function`, or `new Function`.
- Do not access `window`, `document`, `fetch`, `XMLHttpRequest`, timers, or browser APIs.
- Do not use `Promise`, async work, or background loops.
- Do not mutate `state`.
- Do not assume a domain shape that was not provided.
- Do not return raw strings, numbers, arrays, or multiple roots from `render()`.
- Do not omit `runtime.pack: kanban.v1` when the card is clearly a Kanban board.
- Do not leave the outer `<hypercard:card:v2>` tag unclosed.

## Final Checklist

Before finishing, verify all of the following:

- You wrote one short sentence before the tag.
- You emitted exactly one `<hypercard:card:v2>` block.
- The YAML is valid.
- `card.code` is a single JS expression.
- For default UI surfaces, `render()` returns one root `ui.panel([...])`.
- Every widget is from the supported list above.
- Every handler name referenced by an event ref exists in `handlers`.
- If the surface is Kanban-shaped, `runtime.pack` is `kanban.v1` and the code returns `widgets.kanban.page(widgets.kanban.taxonomy({...}), widgets.kanban.board({...}))`.
- If the surface is a normal UI card, `runtime.pack` is still required and must be `ui.card.v1`.
- The outer closing tag `</hypercard:card:v2>` is present.
