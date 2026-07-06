/* React subscription to chatDebugStore for one launcher conversation. */
import { useChatDebugEntries } from '@go-go-golems/chat-provider';
import { chatDebugStore, type ChatDebugEntry } from './chatDebugStore';

export function useChatDebugEvents(convId: string): ChatDebugEntry[] {
  return useChatDebugEntries(chatDebugStore, convId);
}
