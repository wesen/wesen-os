/*
 * React subscription to chatDebugStore for one conversation. Usable from the
 * chat window's inline debug panel and from detached debug windows.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { chatDebugStore, type ChatDebugEntry } from './chatDebugStore';

export function useChatDebugEvents(convId: string): ChatDebugEntry[] {
  const subscribe = useCallback(
    (listener: () => void) => chatDebugStore.subscribe(convId, listener),
    [convId],
  );
  const getSnapshot = useCallback(() => chatDebugStore.getSnapshot(convId), [convId]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
