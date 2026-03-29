// @ts-check
__card__({
  id: 'kanbanPersonalPlanner',
  packId: 'kanban.v1',
  title: 'Focus Inbox',
  icon: '🎯',
});

__doc__({
  name: 'kanbanPersonalPlanner',
  summary: 'Single-lane focus inbox demo using the compositional kanban.v1 page DSL.',
  tags: ['demo', 'kanban', 'personal'],
  related: ['widgets.kanban.page', 'widgets.kanban.header', 'widgets.kanban.highlights'],
});

doc`
---
symbol: kanbanPersonalPlanner
---
This demo card is intentionally minimal: one lane, no filter bar, and only a small focus-oriented
highlight strip above the board.
`;

const personalPlannerBoard = boardById('kanbanPersonalPlanner');

defineRuntimeSurface(
  personalPlannerBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      return renderKanbanPage(widgets, personalPlannerBoard, state, {
        showFilters: false,
        highlightItems: [
          { id: 'energy', label: 'Energy', value: 'High', caption: 'Good time for deep work', tone: 'success' },
          { id: 'streak', label: 'Streak', value: '3 days', caption: 'Inbox under five cards', tone: 'accent', trend: [2, 3, 4, 4, 3, 5] },
        ],
        statusMetrics: [
          { label: 'captured', value: boardDraft(state).tasks.length },
          { label: 'mode', value: 'single-lane' },
        ],
      });
    },
    handlers: kanbanCardHandlers(personalPlannerBoard),
  }),
  'kanban.v1',
);
