/*
 * Per-conversation chat debug event store for launcher chat windows.
 *
 * chat-provider's ChatProvider is mounted per window, so its Redux store is not
 * reachable from a *detached* Event Viewer / Timeline Debug window. Those
 * windows still need the raw/parsed sessionstream frames for a conversation.
 * This module is a tiny external store, keyed by convId, fed by the chat
 * window's `onDebugEvent` handler and read via useSyncExternalStore from any
 * window.
 *
 * Performance techniques ported from the old os-chat debug eventBus
 * (ticket WESEN-OS-ASSISTANT-PARITY-2026-07 guide §4.1):
 * - bounded ring buffer per conversation (MAX_EVENTS_PER_CONV, front-trimmed)
 * - summary/family/eventType/eventId precomputed at ingest so render never
 *   re-derives them
 * - monotonically increasing ids (`evt-<n>`) usable directly as React keys
 */
import type { ChatDebugEvent } from '@go-go-golems/chat-provider';

const MAX_EVENTS_PER_CONV = 1000;

/** Event families for the Event Viewer filter pills (old os-chat palette). */
export type ChatDebugFamily = 'llm' | 'tool' | 'widget' | 'timeline' | 'ws' | 'raw' | 'other';

export interface ChatDebugEntry {
  /** Monotonic id, stable React key. Numeric part is `seq`. */
  id: string;
  /** Monotonic sequence number (mirror folding uses it as a cursor). */
  seq: number;
  /** Ingest timestamp (ms epoch). */
  at: number;
  /** One-line summary computed at ingest time. */
  summary: string;
  /** Filter-pill family computed at ingest time. */
  family: ChatDebugFamily;
  /** Display event type (frame/event name) computed at ingest time. */
  eventType: string;
  /** Correlating id (ordinal / messageId) when available. */
  eventId: string;
  event: ChatDebugEvent;
}

let seqCounter = 0;

function familyForUIEventName(name: string): ChatDebugFamily {
  if (name.startsWith('ChatWidgetInstance')) return 'widget';
  if (name.startsWith('ChatToolCall') || name.startsWith('FrontendTool') || name.includes('Tool')) return 'tool';
  if (name.startsWith('ChatRun') || name.startsWith('ChatText') || name.startsWith('ChatProviderCall') || name.startsWith('ChatUserMessage') || name.startsWith('ChatThinking')) return 'llm';
  return 'other';
}

function classify(event: ChatDebugEvent): { family: ChatDebugFamily; eventType: string; eventId: string } {
  switch (event.type) {
    case 'ws-lifecycle':
      return { family: 'ws', eventType: `ws.${event.event}`, eventId: '' };
    case 'raw-ws':
      return { family: 'raw', eventType: 'raw', eventId: '' };
    case 'parsed-frame': {
      const frameType = String(event.frameType ?? 'frame');
      const name = String(event.name ?? '');
      if (frameType === 'ui-event' && name) {
        return {
          family: familyForUIEventName(name),
          eventType: name,
          eventId: event.ordinal !== undefined && event.ordinal !== null ? `#${event.ordinal}` : '',
        };
      }
      if (frameType === 'snapshot') {
        return { family: 'timeline', eventType: 'snapshot', eventId: '' };
      }
      return { family: 'other', eventType: frameType, eventId: '' };
    }
    case 'snapshot':
      return { family: 'timeline', eventType: 'snapshot.applied', eventId: '' };
    case 'ui-event': {
      const name = String(event.name ?? '');
      return {
        family: 'timeline',
        eventType: `→ ${name || 'mutation'}`,
        eventId: String(event.messageId ?? (event.ordinal !== undefined && event.ordinal !== null ? `#${event.ordinal}` : '')),
      };
    }
    default:
      return { family: 'other', eventType: String((event as { type?: unknown }).type ?? 'event'), eventId: '' };
  }
}

function summarize(event: ChatDebugEvent): string {
  switch (event.type) {
    case 'ws-lifecycle':
      return `ws ${event.event}`;
    case 'raw-ws':
      return `raw ${event.size}B ${event.preview.slice(0, 100)}`;
    case 'parsed-frame': {
      const name = event.name ? ` ${event.name}` : '';
      const ord = event.ordinal !== undefined && event.ordinal !== null ? ` #${event.ordinal}` : '';
      return `${String(event.frameType ?? 'frame')}${name}${ord}`;
    }
    case 'snapshot':
      return `snapshot entities=${event.entityCount} dropped=${event.droppedCount}`;
    case 'ui-event': {
      const adapter = event.adapterName ? ` via ${event.adapterName}` : '';
      return `ui ${String(event.name ?? '')}${adapter}`;
    }
    default:
      return String((event as { type?: unknown }).type ?? 'event');
  }
}

type Buffer = {
  entries: ChatDebugEntry[];
  listeners: Set<() => void>;
};

const buffers = new Map<string, Buffer>();

function getBuffer(convId: string): Buffer {
  let buf = buffers.get(convId);
  if (!buf) {
    buf = { entries: [], listeners: new Set() };
    buffers.set(convId, buf);
  }
  return buf;
}

function emit(buf: Buffer): void {
  for (const listener of buf.listeners) {
    listener();
  }
}

export const chatDebugStore = {
  push(convId: string, event: ChatDebugEvent): void {
    const buf = getBuffer(convId);
    seqCounter += 1;
    const { family, eventType, eventId } = classify(event);
    const entry: ChatDebugEntry = {
      id: `evt-${seqCounter}`,
      seq: seqCounter,
      at: Date.now(),
      summary: summarize(event),
      family,
      eventType,
      eventId,
      event,
    };
    // Replace the array reference so getSnapshot returns a new identity.
    const next = buf.entries.concat(entry);
    buf.entries = next.length > MAX_EVENTS_PER_CONV ? next.slice(next.length - MAX_EVENTS_PER_CONV) : next;
    emit(buf);
  },

  clear(convId: string): void {
    const buf = buffers.get(convId);
    if (!buf) {
      return;
    }
    buf.entries = [];
    emit(buf);
  },

  getSnapshot(convId: string): ChatDebugEntry[] {
    return getBuffer(convId).entries;
  },

  subscribe(convId: string, listener: () => void): () => void {
    const buf = getBuffer(convId);
    buf.listeners.add(listener);
    return () => {
      buf.listeners.delete(listener);
    };
  },
};

export type { ChatDebugEvent };
