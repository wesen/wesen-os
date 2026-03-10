// @ts-check
const FILTER_DEFAULTS = {
  filterType: null,
  filterPriority: null,
  searchQuery: '',
};

const DEFAULT_KANBAN_TAXONOMY = {
  issueTypes: [
    { id: 'bug', label: 'Bug', icon: '🐞' },
    { id: 'feature', label: 'Feature', icon: '✨' },
    { id: 'task', label: 'Task', icon: '🧩' },
  ],
  priorities: [
    { id: 'high', label: 'High', icon: '▲' },
    { id: 'medium', label: 'Medium', icon: '●' },
    { id: 'low', label: 'Low', icon: '▽' },
  ],
  labels: [
    { id: 'urgent', label: 'Urgent', icon: '🔥' },
    { id: 'design', label: 'Design', icon: '🎨' },
    { id: 'docs', label: 'Docs', icon: '📚' },
    { id: 'frontend', label: 'Frontend', icon: '🖼️' },
    { id: 'backend', label: 'Backend', icon: '🛠️' },
  ],
};

const INCIDENT_TAXONOMY = {
  issueTypes: [
    { id: 'outage', label: 'Outage', icon: '🚨' },
    { id: 'regression', label: 'Regression', icon: '↩️' },
    { id: 'investigation', label: 'Investigation', icon: '🔬' },
  ],
  priorities: [
    { id: 'sev1', label: 'SEV-1', icon: '🟥' },
    { id: 'sev2', label: 'SEV-2', icon: '🟧' },
    { id: 'sev3', label: 'SEV-3', icon: '🟨' },
  ],
  labels: [
    { id: 'api', label: 'API', icon: '🔌' },
    { id: 'db', label: 'DB', icon: '🗄️' },
    { id: 'auth', label: 'Auth', icon: '🔐' },
    { id: 'customer', label: 'Customer', icon: '☎️' },
  ],
};

const RELEASE_TAXONOMY = {
  issueTypes: [
    { id: 'launch', label: 'Launch', icon: '🚀' },
    { id: 'risk', label: 'Risk', icon: '⚠️' },
    { id: 'qa', label: 'QA', icon: '🧪' },
  ],
  priorities: [
    { id: 'blocker', label: 'Blocker', icon: '⛔' },
    { id: 'watch', label: 'Watch', icon: '👀' },
    { id: 'stable', label: 'Stable', icon: '✅' },
  ],
  labels: [
    { id: 'ios', label: 'iOS', icon: '📱' },
    { id: 'android', label: 'Android', icon: '🤖' },
    { id: 'web', label: 'Web', icon: '🌐' },
    { id: 'ops', label: 'Ops', icon: '🛰️' },
  ],
};

const KANBAN_BOARDS = [
  {
    id: 'kanbanSprintBoard',
    title: 'Sprint Radar',
    icon: '🏁',
    subtitle: 'Five-lane delivery board with an idea queue and visible review pressure.',
    primaryActionLabel: '+ Slice',
    taxonomy: DEFAULT_KANBAN_TAXONOMY,
    columns: [
      { id: 'ideas', title: 'Ideas', icon: '💡' },
      { id: 'backlog', title: 'Backlog', icon: '📝' },
      { id: 'ready', title: 'Ready', icon: '🟡' },
      { id: 'doing', title: 'Doing', icon: '⚙️' },
      { id: 'done', title: 'Done', icon: '✅' },
    ],
    tasks: [
      { id: 'sprint-0', col: 'ideas', title: 'Explore debugger source jumpbacks', desc: 'Could become the follow-up after moving Stacks & Cards.', type: 'feature', labels: ['frontend'], priority: 'low' },
      { id: 'sprint-1', col: 'backlog', title: 'Document runtime pack registration split', desc: 'Break the app-level registration work into reviewable phases.', type: 'task', labels: ['docs'], priority: 'medium' },
      { id: 'sprint-2', col: 'ready', title: 'Wire kanban authoring examples', desc: 'Add inventory prompt examples and artifact fixtures.', type: 'feature', labels: ['backend'], priority: 'high' },
      { id: 'sprint-3', col: 'doing', title: 'Validate VM session list behavior', desc: 'Open demo cards through PluginCardSessionHost and verify they appear as runtime sessions.', type: 'bug', labels: ['urgent'], priority: 'high' },
      { id: 'sprint-4', col: 'doing', title: 'Tighten pack validator around page children', desc: 'Reject invalid node mixes before render.', type: 'task', labels: ['backend'], priority: 'medium' },
      { id: 'sprint-5', col: 'done', title: 'Extract KanbanBoardView', desc: 'Reuse the host-rendered board view from the pack renderer.', type: 'task', labels: ['frontend'], priority: 'low' },
    ],
  },
  {
    id: 'kanbanBugTriage',
    title: 'Bug Triage Desk',
    icon: '🐞',
    subtitle: 'Hot-issue desk with visible regression pressure.',
    primaryActionLabel: '+ Intake',
    taxonomy: INCIDENT_TAXONOMY,
    columns: [
      { id: 'new', title: 'Inbox', icon: '📥' },
      { id: 'triage', title: 'Triage', icon: '🔎' },
      { id: 'fixing', title: 'Fixing', icon: '🛠️' },
      { id: 'verified', title: 'Verified', icon: '🧪' },
    ],
    tasks: [
      { id: 'bug-1', col: 'new', title: 'Unknown pack error lacks enough context', desc: 'Include the missing pack id in the runtime error surface.', type: 'outage', labels: ['customer'], priority: 'sev1' },
      { id: 'bug-2', col: 'triage', title: 'Shortcut should open real VM sessions', desc: 'Use the app layer instead of direct rich-widget windows.', type: 'regression', labels: ['auth'], priority: 'sev2' },
      { id: 'bug-3', col: 'fixing', title: 'Review runtime host adapter boundaries', desc: 'Confirm the os-launcher adapter only claims the demo card sessions.', type: 'investigation', labels: ['db'], priority: 'sev3' },
      { id: 'bug-4', col: 'verified', title: 'Inventory parser reads data.runtime.pack', desc: 'Frontend parser now matches backend payload nesting.', type: 'regression', labels: ['api'], priority: 'sev2' },
    ],
  },
  {
    id: 'kanbanPersonalPlanner',
    title: 'Focus Inbox',
    icon: '🎯',
    subtitle: 'Single-lane personal capture board for the next few hours.',
    primaryActionLabel: '+ Capture',
    taxonomy: DEFAULT_KANBAN_TAXONOMY,
    columns: [
      { id: 'focus', title: 'Today', icon: '🎯' },
    ],
    tasks: [
      { id: 'personal-1', col: 'focus', title: 'Smoke test Kanban VM demos', desc: 'Open each board and verify the actions mutate local runtime state.', type: 'task', labels: ['urgent'], priority: 'high' },
      { id: 'personal-2', col: 'focus', title: 'Prototype kanban card payload', desc: 'Try a real card in inventory chat and verify projection.', type: 'feature', labels: ['backend'], priority: 'high' },
      { id: 'personal-3', col: 'focus', title: 'Draft APP-16 implementation slices', desc: 'Capture the external pack registration end state for later.', type: 'task', labels: ['docs'], priority: 'medium' },
      { id: 'personal-4', col: 'focus', title: 'Decide final package naming', desc: 'Review whether kanban-pack is the right public package name.', type: 'task', labels: ['design'], priority: 'low' },
    ],
  },
  {
    id: 'kanbanIncidentCommand',
    title: 'Incident Command',
    icon: '🚨',
    subtitle: 'Command center layout for live production incidents.',
    primaryActionLabel: '+ Page Owner',
    taxonomy: INCIDENT_TAXONOMY,
    columns: [
      { id: 'detected', title: 'Detected', icon: '📟' },
      { id: 'mitigating', title: 'Mitigating', icon: '🧯' },
      { id: 'resolved', title: 'Resolved', icon: '✅' },
    ],
    tasks: [
      { id: 'incident-1', col: 'detected', title: 'Auth tokens failing refresh', desc: 'Users are being logged out every 30 minutes.', type: 'outage', labels: ['auth', 'customer'], priority: 'sev1' },
      { id: 'incident-2', col: 'mitigating', title: 'DB pool saturation', desc: 'Connection queue stays above the safe threshold.', type: 'investigation', labels: ['db'], priority: 'sev2' },
      { id: 'incident-3', col: 'resolved', title: 'Webhook retries duplicated', desc: 'Backlog is draining but needs monitoring.', type: 'regression', labels: ['api'], priority: 'sev2' },
    ],
  },
  {
    id: 'kanbanReleaseTrain',
    title: 'Release Cutline',
    icon: '🚀',
    subtitle: 'Two-lane release board: blocked or ready to ship.',
    primaryActionLabel: '+ Add Gate',
    taxonomy: RELEASE_TAXONOMY,
    columns: [
      { id: 'gated', title: 'Launch Gates', icon: '🚧' },
      { id: 'shipping', title: 'Shipping', icon: '📦' },
    ],
    tasks: [
      { id: 'release-1', col: 'gated', title: 'Finalize changelog copy', desc: 'Needs final pass from product marketing.', type: 'launch', labels: ['web'], priority: 'watch' },
      { id: 'release-2', col: 'gated', title: 'Android subscription fallback', desc: 'Must be verified before opening the rollout.', type: 'risk', labels: ['android'], priority: 'blocker' },
      { id: 'release-3', col: 'shipping', title: 'iOS testflight verification', desc: 'Smoke tests are running against the candidate.', type: 'qa', labels: ['ios'], priority: 'watch' },
      { id: 'release-4', col: 'shipping', title: 'Ops rollback checklist approved', desc: '', type: 'launch', labels: ['ops'], priority: 'stable' },
    ],
  },
];

function __package__() {}
function __doc__() {}
function __example__() {}
function __card__() {}
function doc() {
  return '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function cloneDescriptor(entry) {
  const row = asRecord(entry);
  return {
    id: toText(row.id),
    label: toText(row.label),
    icon: toText(row.icon),
    color: toText(row.color),
  };
}

function cloneTaxonomy(taxonomy) {
  const row = asRecord(taxonomy);
  return {
    issueTypes: asArray(row.issueTypes).map(cloneDescriptor),
    priorities: asArray(row.priorities).map(cloneDescriptor),
    labels: asArray(row.labels).map(cloneDescriptor),
  };
}

function cloneTask(task) {
  const row = asRecord(task);
  return {
    id: toText(row.id),
    col: toText(row.col, 'todo'),
    title: toText(row.title),
    desc: toText(row.desc),
    type: toText(row.type, 'task'),
    labels: asArray(row.labels).map((label) => toText(label)).filter(Boolean),
    priority: toText(row.priority, 'medium'),
  };
}

function cloneColumn(column) {
  const row = asRecord(column);
  return {
    id: toText(row.id),
    title: toText(row.title),
    icon: toText(row.icon),
  };
}

function cloneEditingTask(task) {
  if (!task) {
    return null;
  }
  const row = asRecord(task);
  return {
    id: row.id === undefined ? undefined : toText(row.id),
    col: row.col === undefined ? undefined : toText(row.col),
    title: row.title === undefined ? undefined : toText(row.title),
    desc: row.desc === undefined ? undefined : toText(row.desc),
    type: row.type === undefined ? undefined : toText(row.type),
    labels: row.labels === undefined ? undefined : asArray(row.labels).map((label) => toText(label)).filter(Boolean),
    priority: row.priority === undefined ? undefined : toText(row.priority),
  };
}

function initialBoardState(board) {
  return {
    tasks: board.tasks.map(cloneTask),
    columns: board.columns.map(cloneColumn),
    editingTask: null,
    collapsedCols: {},
  };
}

function boardDraft(state) {
  const draft = asRecord(asRecord(state).draft);
  return {
    tasks: asArray(draft.tasks).map(cloneTask),
    columns: asArray(draft.columns).map(cloneColumn),
    editingTask: cloneEditingTask(draft.editingTask),
    collapsedCols: asRecord(draft.collapsedCols),
  };
}

function filterState(state) {
  const filters = asRecord(asRecord(state).filters);
  return {
    filterType: filters.filterType === null ? null : toText(filters.filterType, ''),
    filterPriority: filters.filterPriority === null ? null : toText(filters.filterPriority, ''),
    searchQuery: toText(filters.searchQuery),
  };
}

function nextTaskId() {
  return 'task-' + String(Date.now()) + '-' + String(Math.floor(Math.random() * 1000));
}

function defaultIssueType(board) {
  return toText(asRecord(asArray(board.taxonomy.issueTypes)[0]).id, 'task');
}

function defaultPriority(board) {
  return toText(asRecord(asArray(board.taxonomy.priorities)[1] || asArray(board.taxonomy.priorities)[0]).id, 'medium');
}

function sanitizeTask(input, board) {
  const row = asRecord(input);
  const columns = asArray(board.columns);
  const fallbackColumnId = toText(asRecord(columns[0]).id, 'todo');
  return {
    id: toText(row.id, ''),
    col: toText(row.col, fallbackColumnId),
    title: toText(row.title, 'Untitled Task'),
    desc: toText(row.desc),
    type: toText(row.type, defaultIssueType(board)),
    labels: asArray(row.labels).map((label) => toText(label)).filter(Boolean),
    priority: toText(row.priority, defaultPriority(board)),
  };
}

function upsertTask(tasks, task) {
  const existingIndex = tasks.findIndex((entry) => entry.id === task.id);
  if (existingIndex >= 0) {
    const nextTasks = tasks.slice();
    nextTasks[existingIndex] = task;
    return nextTasks;
  }

  return tasks.concat([task]);
}

function updateBoardCard(context, updater) {
  const draft = boardDraft(context.state);
  const nextDraft = updater(draft);
  context.dispatch({ type: 'draft.patch', payload: nextDraft });
}

function patchFilters(context, payload) {
  context.dispatch({ type: 'filters.patch', payload });
}

function boardById(boardId) {
  const board = KANBAN_BOARDS.find((entry) => entry.id === boardId);
  if (!board) {
    throw new Error('Unknown Kanban board ' + boardId);
  }
  return board;
}

function filteredTasks(tasks, filters) {
  const query = toText(filters.searchQuery).toLowerCase();
  return tasks.filter((task) => {
    if (filters.filterType && task.type !== filters.filterType) {
      return false;
    }
    if (filters.filterPriority && task.priority !== filters.filterPriority) {
      return false;
    }
    if (query) {
      const haystack = [task.title, task.desc, task.type].concat(task.labels).join(' ').toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

function defaultStatusMetrics(board, draft, filters) {
  const visible = filteredTasks(draft.tasks, filters);
  return [
    { label: 'total', value: draft.tasks.length },
    { label: 'visible', value: visible.length },
    { label: 'done', value: draft.tasks.filter((task) => task.col === 'done' || task.col === 'resolved' || task.col === 'landed').length },
  ];
}

function renderKanbanPage(widgets, board, state, options = {}) {
  const draft = boardDraft(state);
  const filters = filterState(state);
  const defaultSeedTask = {
    col: toText(asRecord(draft.columns[0]).id, 'todo'),
    type: defaultIssueType(board),
    labels: [],
    priority: defaultPriority(board),
  };

  const children = [
    widgets.kanban.taxonomy(cloneTaxonomy(board.taxonomy)),
    widgets.kanban.header({
      title: toText(options.title, board.title),
      subtitle: toText(options.subtitle, board.subtitle || ''),
      primaryActionLabel: toText(options.primaryActionLabel, board.primaryActionLabel || '+ New'),
      searchQuery: filters.searchQuery,
      onPrimaryAction: { handler: 'openTaskEditor', args: { task: defaultSeedTask } },
      onSearchChange: { handler: 'search' },
    }),
  ];

  if (Array.isArray(options.highlightItems) && options.highlightItems.length > 0) {
    children.push(
      widgets.kanban.highlights({
        items: options.highlightItems,
      })
    );
  }

  if (options.showFilters !== false) {
    children.push(
      widgets.kanban.filters({
        filterType: filters.filterType || null,
        filterPriority: filters.filterPriority || null,
        onSetFilterType: { handler: 'setFilterType' },
        onSetFilterPriority: { handler: 'setFilterPriority' },
        onClearFilters: { handler: 'clearFilters' },
      })
    );
  }

  children.push(
    widgets.kanban.board({
      columns: draft.columns,
      tasks: draft.tasks,
      editingTask: draft.editingTask,
      collapsedCols: draft.collapsedCols,
      emptyColumnMessage: toText(options.emptyColumnMessage, 'No tasks'),
      dropHintMessage: toText(options.dropHintMessage, 'Drop here'),
      onOpenTaskEditor: { handler: 'openTaskEditor' },
      onCloseTaskEditor: { handler: 'closeTaskEditor' },
      onSaveTask: { handler: 'saveTask' },
      onDeleteTask: { handler: 'deleteTask' },
      onMoveTask: { handler: 'moveTask' },
      onToggleCollapsed: { handler: 'toggleCollapsed' },
    })
  );

  if (options.showStatus !== false) {
    children.push(
      widgets.kanban.status({
        metrics: Array.isArray(options.statusMetrics)
          ? options.statusMetrics
          : defaultStatusMetrics(board, draft, filters),
      })
    );
  }

  return widgets.kanban.page(children);
}

function kanbanCardHandlers(board) {
  return {
    openTaskEditor(context, args) {
      const current = cloneEditingTask(asRecord(args).task) || {};
      updateBoardCard(context, (draft) => ({
        ...draft,
        editingTask: {
          ...current,
          type: current.type || defaultIssueType(board),
          labels: Array.isArray(current.labels) ? current.labels : [],
          priority: current.priority || defaultPriority(board),
          col: current.col || toText(asRecord(draft.columns[0]).id, 'todo'),
        },
      }));
    },
    closeTaskEditor(context) {
      updateBoardCard(context, (draft) => ({
        ...draft,
        editingTask: null,
      }));
    },
    saveTask(context, args) {
      const nextTask = sanitizeTask(asRecord(args).task, board);
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
    setFilterType(context, args) {
      const nextType = asRecord(args).type;
      patchFilters(context, { filterType: nextType === null ? null : toText(nextType, '') || null });
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
  };
}
