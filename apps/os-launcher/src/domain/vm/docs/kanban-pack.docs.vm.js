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
The Kanban runtime pack exposes a compositional page contract. A VM card composes
widgets.kanban.page(...) from smaller semantic widgets such as taxonomy, header, optional
highlights, optional filters, board, and optional status nodes. The VM remains responsible for
semantic state and handler wiring. The host remains responsible for rendering, drag/drop behavior,
and modal UI.
`;

__doc__('widgets.kanban.page', {
  summary: 'Compose the root page for a Kanban runtime tree.',
  tags: ['dsl', 'kanban', 'runtime-pack'],
});

doc`
---
symbol: widgets.kanban.page
---
Use widgets.kanban.page(...) as the root return value from a kanban.v1 runtime surface render function.
Pass child nodes in a component-like style: taxonomy, header, optional highlights, optional
filters, board, and optional status nodes.
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
Use widgets.kanban.header({...}) to configure page title text, search query, and the primary
action button. Typical cards wire the primary action back to openTaskEditor.
`;

__doc__('widgets.kanban.highlights', {
  summary: 'Describe a row of summary cards with metrics, captions, progress, or sparklines.',
  tags: ['dsl', 'kanban', 'summary'],
});

doc`
---
symbol: widgets.kanban.highlights
---
Use widgets.kanban.highlights({...}) to render summary cards above the board. This is the main
mechanism for making Kanban pages feel different without escaping the semantic DSL.
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
the card omits this node, the host page will not render the filter bar.
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
Use widgets.kanban.status({...}) when the page should render explicit footer metrics. Cards may
omit this node entirely, or provide custom metrics that match their own domain vocabulary.
`;
