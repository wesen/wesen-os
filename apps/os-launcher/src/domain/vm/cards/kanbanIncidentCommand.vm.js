// @ts-check
__card__({
  id: 'kanbanIncidentCommand',
  packId: 'kanban.v1',
  title: 'Incident Command',
  icon: '🚨',
});

__doc__({
  name: 'kanbanIncidentCommand',
  summary: 'Incident command board showing custom taxonomy and custom status metrics.',
  tags: ['demo', 'kanban', 'incident'],
  related: ['widgets.kanban.shell', 'widgets.kanban.taxonomy', 'widgets.kanban.status'],
});

doc`
---
symbol: kanbanIncidentCommand
---
This demo card shows why the taxonomy descriptor matters: the board is not using bug/feature
enums at all. It models outage, regression, and investigation work with SEV priorities.
`;

const incidentCommandBoard = boardById('kanbanIncidentCommand');

defineCard(
  incidentCommandBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      const draft = boardDraft(state);
      return renderKanbanShell(widgets, incidentCommandBoard, state, {
        emptyColumnMessage: 'No incidents here',
        dropHintMessage: 'Move incident',
        statusMetrics: [
          { label: 'open', value: draft.tasks.filter((task) => task.col !== 'resolved').length },
          { label: 'sev1', value: draft.tasks.filter((task) => task.priority === 'sev1').length },
          { label: 'customer', value: draft.tasks.filter((task) => task.labels.includes('customer')).length },
        ],
      });
    },
    handlers: kanbanCardHandlers(incidentCommandBoard),
  }),
  'kanban.v1',
);
