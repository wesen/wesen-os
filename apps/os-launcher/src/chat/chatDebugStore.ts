/*
 * Per-conversation chat debug event store for launcher chat windows.
 *
 * The store implementation now lives in @go-go-golems/chat-provider/debug so
 * detached debug windows and downstream apps share one event-entry model.
 */
import {
  createChatDebugEventStore,
  type ChatDebugEntry,
  type ChatDebugEvent,
  type ChatDebugFamily,
} from '@go-go-golems/chat-provider';

export const chatDebugStore = createChatDebugEventStore({ maxEntriesPerConversation: 1000 });

export type { ChatDebugEntry, ChatDebugEvent, ChatDebugFamily };
