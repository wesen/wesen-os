// @ts-check
__card__({
  id: 'kanbanBugTriage',
  packId: 'kanban.v1',
  title: 'Bug Triage',
  icon: '🐞',
});

__doc__({
  name: 'kanbanBugTriage',
  summary: 'Four-lane bug triage desk with hot-issue highlights and a custom incident taxonomy.',
  tags: ['demo', 'kanban', 'bugs'],
  related: ['widgets.kanban.page', 'widgets.kanban.highlights', 'widgets.kanban.filters'],
});

doc`
---
symbol: kanbanBugTriage
---
This demo card uses the same board primitive but a different top section: a triage-oriented
highlight strip that calls out hot issues before the board itself.
`;

const bugTriageBoard = boardById('kanbanBugTriage');

defineRuntimeSurface(
  bugTriageBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      const draft = boardDraft(state);
      return renderKanbanPage(widgets, bugTriageBoard, state, {
        highlightItems: [
          { id: 'hot', label: 'Hot', value: draft.tasks.filter((task) => task.priority === 'sev1').length, caption: 'Needs triage now', tone: 'danger', trend: [1, 1, 2, 4, 3, 3] },
          { id: 'queue', label: 'Queue', value: draft.tasks.length, caption: 'Across all lanes', tone: 'accent' },
          { id: 'verified', label: 'Verified', value: draft.tasks.filter((task) => task.col === 'verified').length, caption: 'Ready to close', tone: 'success', progress: 0.33 },
        ],
      });
    },
    handlers: kanbanCardHandlers(bugTriageBoard),
  }),
  'kanban.v1',
);
