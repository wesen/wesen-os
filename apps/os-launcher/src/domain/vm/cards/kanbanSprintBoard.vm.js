// @ts-check
__card__({
  id: 'kanbanSprintBoard',
  packId: 'kanban.v1',
  title: 'Sprint Board',
  icon: '🏁',
});

__doc__({
  name: 'kanbanSprintBoard',
  summary: 'Sprint planning demo board for the structured kanban.v1 shell.',
  tags: ['demo', 'kanban', 'sprint'],
  related: ['widgets.kanban.shell', 'widgets.kanban.board'],
});

doc`
---
symbol: kanbanSprintBoard
---
This demo card uses the new kanban shell composition with the default taxonomy, filters, board,
and status sections all enabled.
`;

const sprintBoard = boardById('kanbanSprintBoard');

defineCard(
  sprintBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      return renderKanbanShell(widgets, sprintBoard, state);
    },
    handlers: kanbanCardHandlers(sprintBoard),
  }),
  'kanban.v1',
);
