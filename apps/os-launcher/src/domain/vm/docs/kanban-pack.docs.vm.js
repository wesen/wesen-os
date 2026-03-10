// @ts-check
__package__({
  name: 'kanban.v1',
  title: 'Kanban Runtime Pack',
  category: 'runtime-pack',
  version: '1',
  description: 'Kanban board runtime pack for HyperCard VM-authored cards.',
});

doc`
---
package: kanban.v1
---
The Kanban runtime pack exposes a single structured root node, kanban.board, through the
widgets.kanban.board(...) helper. The VM remains responsible for semantic state, handlers, and
action dispatch. The host remains responsible for rendering, drag/drop behavior, and modal UI.
`;

__doc__('widgets.kanban.board', {
  summary: 'Create a Kanban runtime tree consumable by the kanban.v1 host renderer.',
  tags: ['dsl', 'kanban', 'runtime-pack'],
  concepts: ['runtime-pack', 'structured-ui'],
});

doc`
---
symbol: widgets.kanban.board
---
Use widgets.kanban.board({...}) from a VM card render function to describe the board state and
the event handler bindings. The payload must stay declarative: tasks, columns, filters,
collapsed-column state, and handler descriptors. Do not construct host components directly.
`;
