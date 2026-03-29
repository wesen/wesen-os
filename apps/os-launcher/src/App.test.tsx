import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('App runtime registration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registers ui and kanban runtime packages before rendering the desktop shell', async () => {
    const runtime = await import('@go-go-golems/os-scripting');
    runtime.clearRuntimePackages();
    runtime.clearRuntimeSurfaceTypes();

    const { registerRuntimePackages } = await import('./app/registerRuntimePackages');
    registerRuntimePackages();

    expect(runtime.listRuntimePackages()).toEqual(['kanban', 'ui']);
    expect(runtime.listRuntimeSurfaceTypes()).toEqual(['kanban.v1', 'ui.card.v1']);
  }, 15000);
});
