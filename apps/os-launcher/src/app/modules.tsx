import { bookTrackerLauncherModule } from '@hypercard/book-tracker-debug/src/launcher/module';
import { crmLauncherModule } from '@hypercard/crm/src/launcher/module';
import type { LaunchableAppModule } from '@hypercard/desktop-os';
import { arcPlayerLauncherModule } from '@hypercard/arc-agi-player/launcher';
import { appsBrowserLauncherModule } from '@hypercard/apps-browser/launcher';
import { hypercardToolsLauncherModule } from '@hypercard/hypercard-tools/launcher';
import { inventoryLauncherModule } from '@hypercard/inventory/launcher';
import { todoLauncherModule } from '@hypercard/todo/src/launcher/module';

export const launcherModules: LaunchableAppModule[] = [
  inventoryLauncherModule,
  todoLauncherModule,
  crmLauncherModule,
  bookTrackerLauncherModule,
  arcPlayerLauncherModule,
  appsBrowserLauncherModule,
  hypercardToolsLauncherModule,
];
