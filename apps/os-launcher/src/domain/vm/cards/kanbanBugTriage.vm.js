// @ts-check
__card__({
  id: 'kanbanBugTriage',
  packId: 'kanban.v1',
  title: 'Bug Triage',
  icon: '🐞',
});

__doc__({
  name: 'kanbanBugTriage',
  summary: 'Incident-flavored bug triage board with a custom issue taxonomy.',
  tags: ['demo', 'kanban', 'bugs'],
  related: ['widgets.kanban.shell', 'widgets.kanban.taxonomy', 'widgets.kanban.filters'],
});

doc`
---
symbol: kanbanBugTriage
---
This demo card keeps the default shell layout but swaps in a custom incident taxonomy with issue
types such as outage and regression.
`;

const bugTriageBoard = boardById('kanbanBugTriage');

defineCard(
  bugTriageBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      return renderKanbanShell(widgets, bugTriageBoard, state);
    },
    handlers: kanbanCardHandlers(bugTriageBoard),
  }),
  'kanban.v1',
);
