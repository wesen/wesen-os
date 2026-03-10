// @ts-check
__card__({
  id: 'kanbanPersonalPlanner',
  packId: 'kanban.v1',
  title: 'Personal Planner',
  icon: '🗓️',
});

__doc__({
  name: 'kanbanPersonalPlanner',
  summary: 'Compact personal planning board using the same structured Kanban shell.',
  tags: ['demo', 'kanban', 'personal'],
  related: ['widgets.kanban.shell', 'widgets.kanban.header', 'widgets.kanban.status'],
});

doc`
---
symbol: kanbanPersonalPlanner
---
This demo card turns the filter bar off and uses a tighter status summary, which makes it a good
example of changing shell composition without changing the underlying board renderer.
`;

const personalPlannerBoard = boardById('kanbanPersonalPlanner');

defineCard(
  personalPlannerBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      const draft = boardDraft(state);
      return renderKanbanShell(widgets, personalPlannerBoard, state, {
        showFilters: false,
        statusMetrics: [
          { label: 'today', value: draft.tasks.filter((task) => task.col === 'today').length },
          { label: 'waiting', value: draft.tasks.filter((task) => task.col === 'waiting').length },
          { label: 'done', value: draft.tasks.filter((task) => task.col === 'done').length },
        ],
      });
    },
    handlers: kanbanCardHandlers(personalPlannerBoard),
  }),
  'kanban.v1',
);
