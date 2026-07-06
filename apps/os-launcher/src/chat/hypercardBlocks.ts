/*
 * Strips <hypercard:*:*> artifact blocks out of assistant message text before
 * rendering. Completed blocks are removed entirely (the backend extractor
 * turns them into widgets, which render separately in the timeline); a
 * trailing UNCLOSED block means a card is still streaming, so the caller
 * shows a "building card" placeholder instead of raw code.
 */

const COMPLETE_BLOCK = /<hypercard:([a-z-]+):(v\d+)>[\s\S]*?<\/hypercard:\1:\2>\s*/g;
const OPEN_BLOCK = /<hypercard:([a-z-]+):(v\d+)>[\s\S]*$/;
// A partially typed opening tag at the very end of the text (streaming), e.g.
// "<hyperca" — hide it so the tag never flashes into view.
const PARTIAL_TAG_TAIL = /<(?:h(?:y(?:p(?:e(?:r(?:c(?:a(?:r(?:d(?::[a-z-]*(?::v\d*)?)?)?)?)?)?)?)?)?)?)?$/;

export interface StrippedMessage {
  /** Message text with artifact blocks removed. */
  text: string;
  /** True when an unclosed block is still streaming in. */
  building: boolean;
  /** Tag of the block being built, e.g. "card" (from hypercard:card:v2). */
  buildingTag: string | null;
}

export function stripHypercardBlocks(content: string): StrippedMessage {
  let text = content.replace(COMPLETE_BLOCK, '');
  let building = false;
  let buildingTag: string | null = null;

  const open = OPEN_BLOCK.exec(text);
  if (open) {
    building = true;
    buildingTag = open[1];
    text = text.slice(0, open.index);
  } else {
    text = text.replace(PARTIAL_TAG_TAIL, '');
  }

  return { text: text.trimEnd(), building, buildingTag };
}
