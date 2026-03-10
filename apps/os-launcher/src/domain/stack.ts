import type { CardDefinition, CardStackDefinition } from '@hypercard/engine';
import { OS_LAUNCHER_PLUGIN_BUNDLE } from './pluginBundle';
import { KANBAN_VM_CARD_META } from './vmmeta';

interface PluginCardMeta {
  id: string;
  title: string;
  icon: string;
  packId?: string;
  sourceFile?: string;
  source?: string;
  handlerNames?: string[];
}

const OS_LAUNCHER_CARD_META: PluginCardMeta[] = [
  { id: 'home', title: 'Launcher Home', icon: '🖥️' },
  ...KANBAN_VM_CARD_META.map((card) => ({
    id: card.id,
    title: card.title,
    icon: card.icon,
    packId: card.packId,
    sourceFile: card.sourceFile,
    source: card.source,
    handlerNames: card.handlerNames,
  })),
];

function toPluginCard(card: PluginCardMeta): CardDefinition {
  return {
    id: card.id,
    type: 'plugin',
    title: card.title,
    icon: card.icon,
    ui: {
      t: 'text',
      value: `Plugin card placeholder: ${card.id}`,
    },
    meta: card.source
      ? {
          runtime: {
            packId: card.packId,
            sourceFile: card.sourceFile,
            source: card.source,
            handlerNames: card.handlerNames ?? [],
          },
        }
      : undefined,
  };
}

export const STACK: CardStackDefinition = {
  id: 'os-launcher',
  name: 'go-go-os Launcher',
  icon: '🖥️',
  homeCard: 'home',
  plugin: {
    bundleCode: OS_LAUNCHER_PLUGIN_BUNDLE,
    capabilities: {
      system: ['nav.go', 'nav.back', 'notify.show'],
    },
  },
  cards: Object.fromEntries(OS_LAUNCHER_CARD_META.map((card) => [card.id, toPluginCard(card)])),
};
