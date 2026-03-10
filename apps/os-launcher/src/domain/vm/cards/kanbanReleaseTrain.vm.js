// @ts-check
__card__({
  id: 'kanbanReleaseTrain',
  packId: 'kanban.v1',
  title: 'Release Cutline',
  icon: '🚀',
});

__doc__({
  name: 'kanbanReleaseTrain',
  summary: 'Two-lane release cutline board with launch highlights and custom release taxonomy.',
  tags: ['demo', 'kanban', 'release'],
  related: ['widgets.kanban.page', 'widgets.kanban.highlights', 'widgets.kanban.taxonomy'],
});

doc`
---
symbol: kanbanReleaseTrain
---
This demo card is intentionally narrow: just two lanes, no filters, and a small launch cutline
summary that makes the board feel very different from the sprint or incident examples.
`;

const releaseTrainBoard = boardById('kanbanReleaseTrain');

defineCard(
  releaseTrainBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      const draft = boardDraft(state);
      return renderKanbanPage(widgets, releaseTrainBoard, state, {
        showFilters: false,
        title: 'Release Cutline / Q2',
        subtitle: 'Launch gates, blockers, and rollout checks.',
        highlightItems: [
          { id: 'readiness', label: 'Readiness', value: '82%', caption: 'Across platform gates', tone: 'success', progress: 0.82 },
          { id: 'blockers', label: 'Blockers', value: draft.tasks.filter((task) => task.priority === 'blocker').length, caption: 'Holding the cut', tone: 'danger' },
        ],
        statusMetrics: [
          { label: 'gates', value: draft.tasks.filter((task) => task.col === 'gated').length },
          { label: 'shipping', value: draft.tasks.filter((task) => task.col === 'shipping').length },
          { label: 'blockers', value: draft.tasks.filter((task) => task.priority === 'blocker').length },
        ],
      });
    },
    handlers: kanbanCardHandlers(releaseTrainBoard),
  }),
  'kanban.v1',
);
