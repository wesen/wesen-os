// @ts-check
__card__({
  id: 'kanbanSprintBoard',
  packId: 'kanban.v1',
  title: 'Sprint Board',
  icon: '🏁',
});

__doc__({
  name: 'kanbanSprintBoard',
  summary: 'Five-lane sprint radar demo for the compositional kanban.v1 page DSL.',
  tags: ['demo', 'kanban', 'sprint'],
  related: ['widgets.kanban.page', 'widgets.kanban.highlights', 'widgets.kanban.board'],
});

doc`
---
symbol: kanbanSprintBoard
---
This demo card uses the page-style DSL to build a denser sprint radar with an idea lane and a
summary highlight strip above the board.
`;

const sprintBoard = boardById('kanbanSprintBoard');

defineCard(
  sprintBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      const draft = boardDraft(state);
      return renderKanbanPage(widgets, sprintBoard, state, {
        highlightItems: [
          { id: 'committed', label: 'Committed', value: '34 pts', caption: 'Sprint 12', tone: 'accent', trend: [22, 24, 26, 29, 31, 34] },
          { id: 'blocked', label: 'Blocked', value: draft.tasks.filter((task) => task.priority === 'high').length, caption: 'Need review attention', tone: 'warning', progress: 0.22 },
          { id: 'done', label: 'Done', value: draft.tasks.filter((task) => task.col === 'done').length, caption: 'Already shipped', tone: 'success', progress: 0.61 },
        ],
      });
    },
    handlers: kanbanCardHandlers(sprintBoard),
  }),
  'kanban.v1',
);
