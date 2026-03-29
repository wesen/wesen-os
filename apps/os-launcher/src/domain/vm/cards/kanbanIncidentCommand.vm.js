// @ts-check
__card__({
  id: 'kanbanIncidentCommand',
  packId: 'kanban.v1',
  title: 'Incident Command',
  icon: '🚨',
});

__doc__({
  name: 'kanbanIncidentCommand',
  summary: 'Three-lane incident command surface with telemetry highlights and custom status metrics.',
  tags: ['demo', 'kanban', 'incident'],
  related: ['widgets.kanban.page', 'widgets.kanban.highlights', 'widgets.kanban.status'],
});

doc`
---
symbol: kanbanIncidentCommand
---
This demo card shows the command-center end of the spectrum: telemetry highlights above a denser
three-lane board, still authored entirely with semantic Kanban primitives.
`;

const incidentCommandBoard = boardById('kanbanIncidentCommand');

defineRuntimeSurface(
  incidentCommandBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      const draft = boardDraft(state);
      return renderKanbanPage(widgets, incidentCommandBoard, state, {
        emptyColumnMessage: 'No incidents here',
        dropHintMessage: 'Move incident',
        highlightItems: [
          { id: 'sev1', label: 'SEV-1', value: draft.tasks.filter((task) => task.priority === 'sev1').length, caption: 'Customer-visible outage', tone: 'danger', trend: [0, 1, 1, 2, 1, 1] },
          { id: 'mitigation', label: 'Mitigation', value: '74%', caption: 'Rollback progressing', tone: 'warning', progress: 0.74 },
          { id: 'latency', label: 'Latency', value: '182ms', caption: 'API p95', tone: 'accent', trend: [120, 140, 160, 210, 190, 182] },
        ],
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
