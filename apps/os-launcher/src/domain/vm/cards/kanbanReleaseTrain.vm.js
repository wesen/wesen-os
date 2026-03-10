// @ts-check
__card__({
  id: 'kanbanReleaseTrain',
  packId: 'kanban.v1',
  title: 'Release Train',
  icon: '🚆',
});

__doc__({
  name: 'kanbanReleaseTrain',
  summary: 'Release-readiness board with custom launch/risk taxonomy and a different shell tone.',
  tags: ['demo', 'kanban', 'release'],
  related: ['widgets.kanban.shell', 'widgets.kanban.header', 'widgets.kanban.taxonomy'],
});

doc`
---
symbol: kanbanReleaseTrain
---
This demo card uses the same host widgets but a different vocabulary: launch, risk, and QA
instead of the default task taxonomy. It also hides the filter bar to keep the release view terse.
`;

const releaseTrainBoard = boardById('kanbanReleaseTrain');

defineCard(
  releaseTrainBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      const draft = boardDraft(state);
      return renderKanbanShell(widgets, releaseTrainBoard, state, {
        showFilters: false,
        title: 'Release Train / Q2',
        subtitle: 'Launch gates, blockers, and rollout checks.',
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
