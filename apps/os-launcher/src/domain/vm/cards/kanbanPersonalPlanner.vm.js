// @ts-check
__card__({
  id: 'kanbanPersonalPlanner',
  packId: 'kanban.v1',
  title: 'Personal Planner',
  icon: '🗓️',
});

__doc__({
  name: 'kanbanPersonalPlanner',
  summary: 'Personal planning demo board for kanban.v1.',
  tags: ['demo', 'kanban', 'personal'],
  related: ['widgets.kanban.board'],
});

doc`
---
symbol: kanbanPersonalPlanner
---
This demo card models a smaller personal planning workflow and is useful for checking that the
Kanban host renderer handles low-cardinality boards cleanly.
`;

const personalPlannerBoard = boardById('kanbanPersonalPlanner');

defineCard(
  personalPlannerBoard.id,
  ({ widgets }) => ({
    render({ state }) {
      const draft = boardDraft(state);
      const filters = filterState(state);

      return widgets.kanban.board({
        columns: draft.columns,
        tasks: draft.tasks,
        editingTask: draft.editingTask,
        filterTag: filters.filterTag || null,
        filterPriority: filters.filterPriority || null,
        searchQuery: filters.searchQuery,
        collapsedCols: draft.collapsedCols,
        onOpenTaskEditor: { handler: 'openTaskEditor' },
        onCloseTaskEditor: { handler: 'closeTaskEditor' },
        onSaveTask: { handler: 'saveTask' },
        onDeleteTask: { handler: 'deleteTask' },
        onMoveTask: { handler: 'moveTask' },
        onSearchChange: { handler: 'search' },
        onSetFilterTag: { handler: 'setFilterTag' },
        onSetFilterPriority: { handler: 'setFilterPriority' },
        onClearFilters: { handler: 'clearFilters' },
        onToggleCollapsed: { handler: 'toggleCollapsed' },
      });
    },
    handlers: {
      openTaskEditor(context, args) {
        const current = cloneEditingTask(asRecord(args).task) || {};
        updateBoardCard(context, (draft) => ({
          ...draft,
          editingTask: current,
        }));
      },
      closeTaskEditor(context) {
        updateBoardCard(context, (draft) => ({
          ...draft,
          editingTask: null,
        }));
      },
      saveTask(context, args) {
        const draft = boardDraft(context.state);
        const nextTask = sanitizeTask(asRecord(args).task, draft.columns);
        const materializedTask = {
          ...nextTask,
          id: nextTask.id || nextTaskId(),
        };
        updateBoardCard(context, (current) => ({
          ...current,
          tasks: upsertTask(current.tasks, materializedTask),
          editingTask: null,
        }));
        context.dispatch({ type: 'notify.show', payload: { message: 'Saved ' + materializedTask.title } });
      },
      deleteTask(context, args) {
        const targetId = toText(asRecord(args).id);
        updateBoardCard(context, (draft) => ({
          ...draft,
          tasks: draft.tasks.filter((task) => task.id !== targetId),
          editingTask: draft.editingTask && draft.editingTask.id === targetId ? null : draft.editingTask,
        }));
        context.dispatch({ type: 'notify.show', payload: { message: 'Deleted task ' + targetId } });
      },
      moveTask(context, args) {
        const payload = asRecord(args);
        const targetId = toText(payload.id);
        const nextColumnId = toText(payload.col);
        updateBoardCard(context, (draft) => ({
          ...draft,
          tasks: draft.tasks.map((task) => (
            task.id === targetId
              ? { ...task, col: nextColumnId }
              : task
          )),
        }));
      },
      search(context, args) {
        patchFilters(context, { searchQuery: toText(asRecord(args).value) });
      },
      setFilterTag(context, args) {
        const tag = asRecord(args).tag;
        patchFilters(context, { filterTag: tag === null ? null : toText(tag, '') || null });
      },
      setFilterPriority(context, args) {
        const priority = asRecord(args).priority;
        patchFilters(context, { filterPriority: priority === null ? null : toText(priority, '') || null });
      },
      clearFilters(context) {
        patchFilters(context, FILTER_DEFAULTS);
      },
      toggleCollapsed(context, args) {
        const columnId = toText(asRecord(args).columnId);
        updateBoardCard(context, (draft) => ({
          ...draft,
          collapsedCols: {
            ...draft.collapsedCols,
            [columnId]: !draft.collapsedCols[columnId],
          },
        }));
      },
    },
  }),
  'kanban.v1',
);
