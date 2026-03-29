import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  QuickJSRuntimeService,
  validateRuntimeSurfaceTree,
  clearRuntimePackages,
  clearRuntimeSurfaceTypes,
  registerRuntimePackage,
  registerRuntimeSurfaceType,
} from '@go-go-golems/os-scripting';
import { KANBAN_RUNTIME_PACKAGE, KANBAN_V1_RUNTIME_SURFACE_TYPE } from '@go-go-golems/os-kanban';
import { UI_CARD_V1_RUNTIME_SURFACE_TYPE, UI_RUNTIME_PACKAGE } from '@go-go-golems/os-ui-cards';
import { OS_LAUNCHER_PLUGIN_BUNDLE } from './pluginBundle';
import { KANBAN_VM_CARD_META, OS_LAUNCHER_VM_PACK_METADATA } from './vmmeta';

describe('os-launcher kanban runtime surfaces', () => {
  const services: QuickJSRuntimeService[] = [];

  beforeEach(() => {
    clearRuntimePackages();
    clearRuntimeSurfaceTypes();
    registerRuntimePackage(UI_RUNTIME_PACKAGE);
    registerRuntimeSurfaceType(UI_CARD_V1_RUNTIME_SURFACE_TYPE);
    registerRuntimePackage(KANBAN_RUNTIME_PACKAGE);
    registerRuntimeSurfaceType(KANBAN_V1_RUNTIME_SURFACE_TYPE);
  });

  afterEach(() => {
    for (const service of services) {
      for (const sessionId of service.health().sessions) {
        service.disposeSession(sessionId);
      }
    }
    services.length = 0;
  });

  it('loads kanban demo surfaces and emits structured kanban.v1 page trees plus semantic actions', async () => {
    const service = new QuickJSRuntimeService();
    services.push(service);

    const bundle = await service.loadRuntimeBundle('os-launcher', 'os-launcher@kanban', ['ui', 'kanban'], OS_LAUNCHER_PLUGIN_BUNDLE);
    expect(OS_LAUNCHER_VM_PACK_METADATA.packId).toBe('kanban.v1');
    expect(bundle.packageIds).toEqual(['ui', 'kanban']);
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
            desc: 'Open this through RuntimeSurfaceSessionHost',
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
              desc: 'Open this through RuntimeSurfaceSessionHost',
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
              desc: 'Open this through RuntimeSurfaceSessionHost',
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
