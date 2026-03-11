import { describe, expect, it } from 'vitest';
import { docsRegistry } from '@hypercard/apps-browser';
import { registerAppsBrowserDocs } from './registerAppsBrowserDocs';

describe('registerAppsBrowserDocs integration', () => {
  it('mounts kanban surface-type docs from the external package metadata and os-launcher surface docs from vmmeta', async () => {
    registerAppsBrowserDocs();

    const surfaceTypeResolved = docsRegistry.resolve('/docs/objects/surface-type/kanban.v1/overview');
    expect(surfaceTypeResolved).not.toBeNull();

    const surfaceTypeDoc = await surfaceTypeResolved?.mount.read(surfaceTypeResolved?.subpath ?? []);
    expect(surfaceTypeDoc?.title).toBe('Kanban Runtime Surface Type');
    expect(surfaceTypeDoc?.content).toContain('compositional page contract');

    const surfaceResolved = docsRegistry.resolve('/docs/objects/surface/os-launcher/kanbanSprintBoard');
    expect(surfaceResolved).not.toBeNull();

    const surfaceDoc = await surfaceResolved?.mount.read(surfaceResolved?.subpath ?? []);
    expect(surfaceDoc?.title).toBe('Sprint Board');
    expect(surfaceDoc?.content).toContain('denser sprint radar');
  });
});
