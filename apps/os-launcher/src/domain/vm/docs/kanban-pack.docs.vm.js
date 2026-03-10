// @ts-check
__package__({
  name: 'kanban.v1',
  title: 'Kanban Runtime Pack',
  category: 'runtime-pack',
  version: '1',
  description: 'Structured Kanban shell runtime pack for HyperCard VM-authored cards.',
});

doc`
---
package: kanban.v1
---
The Kanban runtime pack exposes a structured shell contract instead of a single board root. A VM
card composes widgets.kanban.shell({...}) from taxonomy, header, optional filters, board, and
optional status nodes. The VM remains responsible for semantic state and handler wiring. The host
remains responsible for rendering, drag/drop behavior, and modal UI.
`;

__doc__('widgets.kanban.shell', {
  summary: 'Compose the root shell for a Kanban runtime tree.',
  tags: ['dsl', 'kanban', 'runtime-pack'],
});

doc`
---
symbol: widgets.kanban.shell
---
Use widgets.kanban.shell({...}) as the root return value from a kanban.v1 card render function.
The shell accepts nested taxonomy, header, optional filters, board, and optional status nodes.
`;

__doc__('widgets.kanban.taxonomy', {
  summary: 'Describe the available issue types, priorities, and labels for a Kanban shell.',
  tags: ['dsl', 'kanban', 'taxonomy'],
});

doc`
---
symbol: widgets.kanban.taxonomy
---
Use widgets.kanban.taxonomy({...}) to register descriptor-driven issue systems. This is the main
replacement for hardcoded bug/feature/tag enums.
`;

__doc__('widgets.kanban.header', {
  summary: 'Describe the shell header with title, subtitle, search state, and primary action wiring.',
  tags: ['dsl', 'kanban', 'shell'],
});

doc`
---
symbol: widgets.kanban.header
---
Use widgets.kanban.header({...}) to configure shell title text, search query, and the primary
action button. Typical cards wire the primary action back to openTaskEditor.
`;

__doc__('widgets.kanban.filters', {
  summary: 'Describe the optional filter bar for issue-type and priority filtering.',
  tags: ['dsl', 'kanban', 'filters'],
});

doc`
---
symbol: widgets.kanban.filters
---
Use widgets.kanban.filters({...}) when the board should expose issue-type and priority filters. If
the card omits this node, the host shell will not render the filter bar.
`;

__doc__('widgets.kanban.board', {
  summary: 'Describe the core board state, task list, lane list, editing state, and event bindings.',
  tags: ['dsl', 'kanban', 'board'],
});

doc`
---
symbol: widgets.kanban.board
---
Use widgets.kanban.board({...}) to provide columns, tasks, collapsed state, editing state, and
board interaction handlers. This node is still semantic data, not a host component escape hatch.
`;

__doc__('widgets.kanban.status', {
  summary: 'Describe optional footer metrics for the shell.',
  tags: ['dsl', 'kanban', 'status'],
});

doc`
---
symbol: widgets.kanban.status
---
Use widgets.kanban.status({...}) when the shell should render explicit footer metrics. Cards may
omit this node entirely, or provide custom metrics that match their own domain vocabulary.
`;
