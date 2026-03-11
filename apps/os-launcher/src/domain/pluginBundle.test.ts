import { afterEach, describe, expect, it } from 'vitest';
import { QuickJSRuntimeService, validateRuntimeSurfaceTree } from '@hypercard/hypercard-runtime';
import { OS_LAUNCHER_PLUGIN_BUNDLE } from './pluginBundle';
import { KANBAN_VM_CARD_META, OS_LAUNCHER_VM_PACK_METADATA } from './vmmeta';

describe('os-launcher kanban runtime cards', () => {
  const services: QuickJSRuntimeService[] = [];

  afterEach(() => {
    for (const service of services) {
      for (const sessionId of service.health().sessions) {
        service.disposeSession(sessionId);
      }
    }
    services.length = 0;
  });

  it('loads kanban demo cards and emits structured kanban.v1 page trees plus semantic actions', async () => {
    const service = new QuickJSRuntimeService();
    services.push(service);

    const bundle = await service.loadRuntimeBundle('os-launcher', 'os-launcher@kanban', OS_LAUNCHER_PLUGIN_BUNDLE);
    expect(OS_LAUNCHER_VM_PACK_METADATA.packId).toBe('kanban.v1');
    expect(bundle.surfaces).toEqual(expect.arrayContaining([
      'home',
      ...KANBAN_VM_CARD_META.map((card) => card.id),
    ]));
    expect(KANBAN_VM_CARD_META).toHaveLength(5);

    const rawTree = service.renderRuntimeSurface('os-launcher@kanban', 'kanbanSprintBoard', {
      draft: {
        columns: [{ id: 'todo', title: 'To Do', icon: '📋' }],
        tasks: [
          {
            id: 'task-1',
            col: 'todo',
            title: 'Ship os-launcher shortcut',
            desc: 'Open this through PluginCardSessionHost',
            type: 'feature',
            labels: ['backend'],
            priority: 'high',
          },
        ],
        editingTask: null,
        collapsedCols: {},
      },
      filters: {
        filterType: null,
        filterPriority: null,
        searchQuery: '',
      },
    });
    const tree = validateRuntimeSurfaceTree('kanban.v1', rawTree);
    expect(tree.kind).toBe('kanban.page');
    const boardNode = tree.children.find((child) => child.kind === 'kanban.board');
    const taxonomyNode = tree.children.find((child) => child.kind === 'kanban.taxonomy');
    expect(boardNode?.props.tasks).toHaveLength(1);
    expect(taxonomyNode?.props.issueTypes.length).toBeGreaterThan(0);

    const moveActions = service.eventRuntimeSurface(
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
              type: 'feature',
              labels: ['backend'],
              priority: 'high',
            },
          ],
          editingTask: null,
          collapsedCols: {},
        },
        filters: {
          filterType: null,
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
              type: 'feature',
              labels: ['backend'],
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
