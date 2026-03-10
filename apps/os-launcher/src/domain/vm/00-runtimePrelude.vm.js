// @ts-check
const FILTER_DEFAULTS = {
  filterTag: null,
  filterPriority: null,
  searchQuery: '',
};

const KANBAN_BOARDS = [
  {
    id: 'kanbanSprintBoard',
    title: 'Sprint Board',
    icon: '🏁',
    columns: [
      { id: 'backlog', title: 'Backlog', icon: '📝' },
      { id: 'ready', title: 'Ready', icon: '🟡' },
      { id: 'doing', title: 'Doing', icon: '⚙️' },
      { id: 'done', title: 'Done', icon: '✅' },
    ],
    tasks: [
      { id: 'sprint-1', col: 'backlog', title: 'Document runtime pack registration split', desc: 'Break the app-level registration work into reviewable phases.', tags: ['docs'], priority: 'medium' },
      { id: 'sprint-2', col: 'ready', title: 'Wire kanban.v1 authoring examples', desc: 'Add inventory prompt examples and artifact fixtures.', tags: ['feature'], priority: 'high' },
      { id: 'sprint-3', col: 'doing', title: 'Validate VM session list behavior', desc: 'Open demo cards through PluginCardSessionHost and verify they appear as runtime sessions.', tags: ['urgent'], priority: 'high' },
      { id: 'sprint-4', col: 'done', title: 'Extract KanbanBoardView', desc: 'Reuse the host-rendered board view from the pack renderer.', tags: ['design'], priority: 'low' },
    ],
  },
  {
    id: 'kanbanBugTriage',
    title: 'Bug Triage',
    icon: '🐞',
    columns: [
      { id: 'new', title: 'New', icon: '📥' },
      { id: 'triage', title: 'Triage', icon: '🔎' },
      { id: 'fixing', title: 'Fixing', icon: '🛠️' },
      { id: 'verified', title: 'Verified', icon: '🧪' },
    ],
    tasks: [
      { id: 'bug-1', col: 'new', title: 'Unknown pack error lacks enough context', desc: 'Include the missing pack id in the runtime error surface.', tags: ['bug'], priority: 'high' },
      { id: 'bug-2', col: 'triage', title: 'Shortcut should open real VM sessions', desc: 'Use the app layer instead of direct rich-widget windows.', tags: ['urgent'], priority: 'high' },
      { id: 'bug-3', col: 'fixing', title: 'Review runtime host adapter boundaries', desc: 'Confirm the os-launcher adapter only claims the demo card sessions.', tags: ['design'], priority: 'medium' },
      { id: 'bug-4', col: 'verified', title: 'Inventory parser reads data.runtime.pack', desc: 'Frontend parser now matches backend payload nesting.', tags: ['feature'], priority: 'low' },
    ],
  },
  {
    id: 'kanbanPersonalPlanner',
    title: 'Personal Planner',
    icon: '🗓️',
    columns: [
      { id: 'today', title: 'Today', icon: '☀️' },
      { id: 'next', title: 'Next', icon: '➡️' },
      { id: 'waiting', title: 'Waiting', icon: '⏳' },
      { id: 'done', title: 'Done', icon: '🌙' },
    ],
    tasks: [
      { id: 'personal-1', col: 'today', title: 'Smoke test Kanban VM demos', desc: 'Open each board and verify the actions mutate local runtime state.', tags: ['urgent'], priority: 'high' },
      { id: 'personal-2', col: 'today', title: 'Prototype kanban.v1 card payload', desc: 'Try a real card in inventory chat and verify projection.', tags: ['feature'], priority: 'high' },
      { id: 'personal-3', col: 'next', title: 'Draft APP-16 implementation slices', desc: 'Capture the external pack registration end state for later.', tags: ['docs'], priority: 'medium' },
      { id: 'personal-4', col: 'waiting', title: 'Decide final package naming', desc: 'Review whether kanban-pack is the right public package name.', tags: ['design'], priority: 'low' },
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

function cloneTask(task) {
  const row = asRecord(task);
  return {
    id: toText(row.id),
    col: toText(row.col, 'todo'),
    title: toText(row.title),
    desc: toText(row.desc),
    tags: asArray(row.tags).map((tag) => toText(tag)).filter(Boolean),
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
    tags: row.tags === undefined ? undefined : asArray(row.tags).map((tag) => toText(tag)).filter(Boolean),
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
    filterTag: filters.filterTag === null ? null : toText(filters.filterTag, ''),
    filterPriority: filters.filterPriority === null ? null : toText(filters.filterPriority, ''),
    searchQuery: toText(filters.searchQuery),
  };
}

function nextTaskId() {
  return 'task-' + String(Date.now()) + '-' + String(Math.floor(Math.random() * 1000));
}

function sanitizeTask(input, columns) {
  const row = asRecord(input);
  const fallbackColumnId = toText(asRecord(columns[0]).id, 'todo');
  return {
    id: toText(row.id, ''),
    col: toText(row.col, fallbackColumnId),
    title: toText(row.title, 'Untitled Task'),
    desc: toText(row.desc),
    tags: asArray(row.tags).map((tag) => toText(tag)).filter(Boolean),
    priority: toText(row.priority, 'medium'),
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
