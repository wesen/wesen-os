import type { CardDefinition, CardStackDefinition } from '@hypercard/engine';
import { OS_LAUNCHER_PLUGIN_BUNDLE } from './pluginBundle';

interface PluginCardMeta {
  id: string;
  title: string;
  icon: string;
}

const OS_LAUNCHER_CARD_META: PluginCardMeta[] = [
  { id: 'home', title: 'Launcher Home', icon: '🖥️' },
  { id: 'kanbanSprintBoard', title: 'Sprint Board', icon: '🏁' },
  { id: 'kanbanBugTriage', title: 'Bug Triage', icon: '🐞' },
  { id: 'kanbanPersonalPlanner', title: 'Personal Planner', icon: '🗓️' },
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
