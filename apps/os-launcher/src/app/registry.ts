import { createAppRegistry } from '@go-go-golems/os-shell';
import { launcherModules } from './modules';

export const launcherRegistry = createAppRegistry(launcherModules);
