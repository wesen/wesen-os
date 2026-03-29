import { describe, expect, it } from 'vitest';
import { docsRegistry } from '@go-go-golems/apps-browser';
import { registerAppsBrowserDocs } from './registerAppsBrowserDocs';

describe('registerAppsBrowserDocs integration', () => {
  it('mounts external surface-type docs and runtime surface docs from their owning metadata sources', async () => {
    registerAppsBrowserDocs();

    const uiSurfaceTypeResolved = docsRegistry.resolve('/docs/objects/surface-type/ui.card.v1/overview');
    expect(uiSurfaceTypeResolved).not.toBeNull();

    const uiSurfaceTypeDoc = await uiSurfaceTypeResolved?.mount.read(uiSurfaceTypeResolved?.subpath ?? []);
    expect(uiSurfaceTypeDoc?.title).toBe('UI Runtime Surface Type');
    expect(uiSurfaceTypeDoc?.content).toContain('structured UI DSL');

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
