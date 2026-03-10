import VM_PACK_METADATA from './generated/kanbanVmmeta.generated';

export const OS_LAUNCHER_VM_PACK_METADATA = VM_PACK_METADATA;

export const KANBAN_VM_CARD_META = VM_PACK_METADATA.cards.map((card) => ({
  id: card.id,
  title: card.title,
  icon: card.icon,
  packId: card.packId,
  sourceFile: card.sourceFile,
  handlerNames: [...card.handlerNames],
}));
