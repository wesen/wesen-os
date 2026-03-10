import { afterEach, describe, expect, it } from 'vitest';
import { QuickJSCardRuntimeService, validateRuntimeTree } from '@hypercard/hypercard-runtime';
import { OS_LAUNCHER_PLUGIN_BUNDLE } from './pluginBundle';

describe('os-launcher kanban runtime cards', () => {
  const services: QuickJSCardRuntimeService[] = [];

  afterEach(() => {
    for (const service of services) {
      for (const sessionId of service.health().sessions) {
        service.disposeSession(sessionId);
      }
    }
    services.length = 0;
  });

  it('loads kanban demo cards and emits kanban.v1 trees plus semantic actions', async () => {
    const service = new QuickJSCardRuntimeService();
    services.push(service);

    const bundle = await service.loadStackBundle('os-launcher', 'os-launcher@kanban', OS_LAUNCHER_PLUGIN_BUNDLE);
    expect(bundle.cards).toEqual(expect.arrayContaining([
      'home',
      'kanbanSprintBoard',
      'kanbanBugTriage',
      'kanbanPersonalPlanner',
    ]));

    const rawTree = service.renderCard('os-launcher@kanban', 'kanbanSprintBoard', {
      draft: {
        columns: [{ id: 'todo', title: 'To Do', icon: '📋' }],
        tasks: [
          {
            id: 'task-1',
            col: 'todo',
            title: 'Ship os-launcher shortcut',
            desc: 'Open this through PluginCardSessionHost',
            tags: ['feature'],
            priority: 'high',
          },
        ],
        editingTask: null,
        collapsedCols: {},
      },
      filters: {
        filterTag: null,
        filterPriority: null,
        searchQuery: '',
      },
    });
    const tree = validateRuntimeTree('kanban.v1', rawTree);
    expect(tree.kind).toBe('kanban.board');
    expect(tree.props.tasks).toHaveLength(1);

    const moveActions = service.eventCard(
      'os-launcher@kanban',
      'kanbanSprintBoard',
      'moveTask',
      { id: 'task-1', col: 'done' },
      {
        draft: {
          columns: [{ id: 'todo', title: 'To Do', icon: '📋' }],
          tasks: [
            {
              id: 'task-1',
              col: 'todo',
              title: 'Ship os-launcher shortcut',
              desc: 'Open this through PluginCardSessionHost',
              tags: ['feature'],
              priority: 'high',
            },
          ],
          editingTask: null,
          collapsedCols: {},
        },
        filters: {
          filterTag: null,
          filterPriority: null,
          searchQuery: '',
        },
      },
    );

    expect(moveActions).toEqual([
      {
        type: 'draft.patch',
        payload: {
          tasks: [
            {
              id: 'task-1',
              col: 'done',
              title: 'Ship os-launcher shortcut',
              desc: 'Open this through PluginCardSessionHost',
              tags: ['feature'],
              priority: 'high',
            },
          ],
          columns: [{ id: 'todo', title: 'To Do', icon: '📋' }],
          editingTask: null,
          collapsedCols: {},
        },
      },
    ]);
  });
});
