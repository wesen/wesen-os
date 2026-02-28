import type { CardStackDefinition } from '@hypercard/engine';
import { OS_LAUNCHER_PLUGIN_BUNDLE } from './pluginBundle';

export const STACK: CardStackDefinition = {
  id: 'os-launcher',
  name: 'go-go-os Launcher',
  icon: '🖥️',
  homeCard: 'home',
  plugin: {
    bundleCode: OS_LAUNCHER_PLUGIN_BUNDLE,
  },
  cards: {
    home: {
      id: 'home',
      type: 'plugin',
      title: 'Launcher Home',
      icon: '🖥️',
      ui: {
        t: 'text',
        value: 'Launcher Home',
      },
    },
  },
};
