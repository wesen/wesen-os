/*
 * Detached Event Viewer and Timeline Debug windows for launcher chat
 * conversations (assistant). Fed by chatDebugStore (the chat window's
 * onDebugEvent stream) plus the chathost REST snapshot endpoint — a detached
 * window has no ChatProvider, so it cannot read the chat window's Redux store.
 *
 * Phase 1 ships these as simple bounded views; Phase 4 replaces the internals
 * with the old os-chat performance techniques (pause gating, memoized filter
 * projection, lazy expansion, virtualization, structured tree). See ticket
 * WESEN-OS-ASSISTANT-PARITY-2026-07 tasks.md.
 */
import { useCallback, useMemo, useState } from 'react';
import { chatDebugStore } from './chatDebugStore';
import { useChatDebugEvents } from './useChatDebugEvents';
import './chat-chrome.css';

type FrameFilter = 'all' | 'raw-ws' | 'parsed-frame' | 'ws-lifecycle' | 'snapshot' | 'ui-event';

export function ChatEventViewerWindow({ convId }: { convId: string }) {
  const entries = useChatDebugEvents(convId);
  const [filter, setFilter] = useState<FrameFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === 'all' ? entries : entries.filter((entry) => entry.event.type === filter)).slice().reverse(),
    [entries, filter],
  );

  return (
    <div className="oschat-debug-window" data-part="event-viewer">
      <div className="oschat-debug-toolbar">
        <strong>🧭 Event Viewer</strong>
        <span title={convId}>conv {convId.slice(0, 8)}</span>
        <label>
          Filter{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value as FrameFilter)}>
            <option value="all">all</option>
            <option value="raw-ws">raw-ws</option>
            <option value="parsed-frame">parsed-frame</option>
            <option value="ws-lifecycle">ws-lifecycle</option>
            <option value="snapshot">snapshot</option>
            <option value="ui-event">ui-event</option>
          </select>
        </label>
        <span>{visible.length} frames</span>
        <button type="button" data-part="btn" onClick={() => chatDebugStore.clear(convId)}>
          Clear
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {visible.length === 0 ? (
          <div className="oschat-debug-row">no frames captured for this conversation yet</div>
        ) : (
          visible.map((entry) => (
            <div className="oschat-debug-row" key={entry.id}>
              <span className="oschat-debug-row-type">{entry.event.type}</span>
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                {entry.summary}
              </span>
              {expandedId === entry.id ? (
                <pre className="oschat-debug-pre">{JSON.stringify(entry.event, null, 2)}</pre>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface SnapshotEntity {
  id?: string;
  kind?: string;
  [key: string]: unknown;
}

export function ChatTimelineDebugWindow({ convId, apiBasePrefix }: { convId: string; apiBasePrefix: string }) {
  const entries = useChatDebugEvents(convId);
  const [entities, setEntities] = useState<SnapshotEntity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSnapshot = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${apiBasePrefix}/api/chat/sessions/${encodeURIComponent(convId)}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`snapshot returned ${res.status}`);
        }
        return res.json();
      })
      .then((body: { entities?: SnapshotEntity[] }) => {
        setEntities(Array.isArray(body.entities) ? body.entities : []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [apiBasePrefix, convId]);

  // Latest projected snapshot as seen live over the websocket, from the store.
  const lastSnapshotEvent = useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const event = entries[i].event;
      if (event.type === 'snapshot') {
        return event;
      }
    }
    return null;
  }, [entries]);

  return (
    <div className="oschat-debug-window" data-part="timeline-debug">
      <div className="oschat-debug-toolbar">
        <strong>🧱 Timeline Debug</strong>
        <span title={convId}>conv {convId.slice(0, 8)}</span>
        <button type="button" data-part="btn" onClick={fetchSnapshot} disabled={loading}>
          {loading ? 'Loading…' : 'Fetch snapshot'}
        </button>
      </div>
      {error ? <div className="chat-overlay-error-bar">{error}</div> : null}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div className="oschat-debug-section-title">Live snapshot (last observed over ws)</div>
        {lastSnapshotEvent ? (
          <pre className="oschat-debug-pre">{JSON.stringify(lastSnapshotEvent.entities, null, 2)}</pre>
        ) : (
          <div className="oschat-debug-row">no live snapshot observed yet</div>
        )}
        <div className="oschat-debug-section-title">Fetched snapshot (REST)</div>
        {entities === null ? (
          <div className="oschat-debug-row">click “Fetch snapshot” to load entities from the server</div>
        ) : entities.length === 0 ? (
          <div className="oschat-debug-row">snapshot has no entities</div>
        ) : (
          entities.map((entity, idx) => (
            <div className="oschat-debug-row" key={entity.id ?? idx}>
              <span className="oschat-debug-row-type">{entity.kind ?? 'entity'}</span>
              <pre className="oschat-debug-pre">{JSON.stringify(entity, null, 2)}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
