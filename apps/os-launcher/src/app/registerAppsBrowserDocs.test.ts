import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KANBAN_RUNTIME_DOCS_METADATA } from '@hypercard/kanban-runtime';
import { INVENTORY_VM_PACK_METADATA } from '@hypercard/inventory';
import { OS_LAUNCHER_VM_PACK_METADATA } from '../domain/vmmeta';

const register = vi.fn();
const createVmmetaSurfaceTypeDocsMount = vi.fn((metadata) => ({ mountPath: () => `/docs/objects/surface-type/${metadata.packId}` }));
const createVmmetaSurfaceDocsMount = vi.fn((owner) => ({ mountPath: () => `/docs/objects/surface/${owner}` }));

vi.mock('@hypercard/apps-browser', () => ({
  docsRegistry: { register },
  createVmmetaSurfaceTypeDocsMount,
  createVmmetaSurfaceDocsMount,
}));

describe('registerAppsBrowserDocs', () => {
  beforeEach(() => {
    vi.resetModules();
    register.mockReset();
    createVmmetaSurfaceTypeDocsMount.mockClear();
    createVmmetaSurfaceDocsMount.mockClear();
  });

  it('registers package-owned kanban surface-type docs and app-owned surface docs', async () => {
    const { registerAppsBrowserDocs } = await import('./registerAppsBrowserDocs');

    registerAppsBrowserDocs();

    expect(createVmmetaSurfaceTypeDocsMount).toHaveBeenCalledWith(KANBAN_RUNTIME_DOCS_METADATA);
    expect(createVmmetaSurfaceTypeDocsMount).toHaveBeenCalledWith(INVENTORY_VM_PACK_METADATA);
    expect(createVmmetaSurfaceDocsMount).toHaveBeenCalledWith('os-launcher', OS_LAUNCHER_VM_PACK_METADATA);
    expect(createVmmetaSurfaceDocsMount).toHaveBeenCalledWith('inventory', INVENTORY_VM_PACK_METADATA);
    expect(register).toHaveBeenCalledTimes(4);
  });
});
