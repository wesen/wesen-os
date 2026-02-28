import { createAppRegistry } from '@hypercard/desktop-os';
import { launcherModules } from './modules';

export const launcherRegistry = createAppRegistry(launcherModules);
