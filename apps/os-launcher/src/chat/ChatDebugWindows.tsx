/*
 * Detached Event Viewer and Timeline Debug windows for launcher chat
 * conversations — faithful rebuild of the old os-chat EventViewerWindow /
 * TimelineDebugWindow (look: family filter pills, timestamped rows with
 * per-family colored event types, expandable YAML payloads; controls: Pause /
 * Clear / Hold / Follow Stream / Export YAML) on the chat-provider debug
 * stream.
 *
 * Performance techniques ported from the originals (guide §4), plus two
 * deliberate fixes the old code lacked:
 * - LAZY payload YAML: serialized only for expanded rows (old: every visible
 *   row, every render).
 * - LAZY sanitize: entity props sanitized per selected entity / at export
 *   (old: full eager clone of all entities on any change).
 *
 * A detached window has no ChatProvider; the timeline is reconstructed with
 * react-chat's upstream timeline mirror helpers (REST snapshot seed + folded
 * ui-event mutations).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { applyTimelineMutationToMirror, createEmptyTimelineMirror, type TimelineMirrorState } from '@go-go-golems/chat-provider';
import {
  chatDebugStore,
  type ChatDebugEntry,
  type ChatDebugFamily,
} from './chatDebugStore';
import { useChatDebugEvents } from './useChatDebugEvents';
import { copyTextToClipboard } from './clipboard';
import { toYaml } from './yamlFormat';
import { SyntaxHighlight } from './SyntaxHighlight';
import { StructuredDataTree } from './StructuredDataTree';
import {
  buildConversationYamlForCopy,
  buildEntityYamlForCopy,
  buildTimelineDebugSnapshot,
  buildTimelineYamlExport,
  sanitizeForExport,
  type TimelineDebugEntitySnapshot,
} from './timelineDebugModel';
import './chat-chrome.css';

// ---------------------------------------------------------------------------
// Event Viewer
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 500;
const AUTO_SCROLL_THRESHOLD_PX = 32;
const ALL_FAMILIES: ChatDebugFamily[] = ['llm', 'tool', 'widget', 'timeline', 'ws', 'raw', 'other'];

const FAMILY_COLORS: Record<ChatDebugFamily, string> = {
  llm: '#3b82f6',
  tool: '#f59e0b',
  widget: '#8b5cf6',
  timeline: '#10b981',
  ws: '#ef4444',
  raw: '#64748b',
  other: '#6b7280',
};

const FAMILY_LABELS: Record<ChatDebugFamily, string> = {
  llm: 'LLM',
  tool: 'Tool',
  widget: 'WID',
  timeline: 'TL',
  ws: 'WS',
  raw: 'Raw',
  other: '…',
};

export interface AutoScrollMetrics {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  thresholdPx?: number;
}

export function isNearBottom({
  scrollTop,
  clientHeight,
  scrollHeight,
  thresholdPx = AUTO_SCROLL_THRESHOLD_PX,
}: AutoScrollMetrics): boolean {
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
  return distanceFromBottom <= thresholdPx;
}

export interface EventTypeVisibilityOptions {
  hideTextPatch: boolean;
}

export function isEntryHiddenByEventType(eventType: string, options: EventTypeVisibilityOptions): boolean {
  return options.hideTextPatch && eventType === 'ChatTextPatch';
}

export function filterVisibleEntries(
  entries: ChatDebugEntry[],
  filters: Record<string, boolean>,
  options: EventTypeVisibilityOptions,
): ChatDebugEntry[] {
  return entries.filter((entry) => {
    if (filters[entry.family] === false) return false;
    return !isEntryHiddenByEventType(entry.eventType, options);
  });
}

function toFileSafeSegment(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'conversation';
}

export function buildVisibleEventsYamlExport(
  conversationId: string,
  visibleEntries: ChatDebugEntry[],
  exportedAtMs = Date.now(),
): { fileName: string; yaml: string } {
  const exportedAt = new Date(exportedAtMs).toISOString();
  const timestamp = exportedAt.replace(/[:.]/g, '-');
  const fileName = `events-${toFileSafeSegment(conversationId)}-${timestamp}.yaml`;
  const yaml = toYaml({
    conversationId,
    exportedAt,
    eventCount: visibleEntries.length,
    events: visibleEntries.map((entry) => ({
      timestamp: new Date(entry.at).toISOString(),
      eventType: entry.eventType,
      eventId: entry.eventId,
      family: entry.family,
      summary: entry.summary,
      payload: sanitizeForExport(entry.event),
    })),
  } as Record<string, unknown>);
  return { fileName, yaml };
}

function downloadYaml(fileName: string, yaml: string): void {
  const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function ChatEventViewerWindow({ convId }: { convId: string }) {
  // Old EventViewerWindow pattern: component-level buffer fed by a
  // subscription whose callback reads pause state via a ref, so pausing drops
  // events BEFORE setState (no render churn during bursts) and the
  // subscription only re-runs on convId.
  const [entries, setEntries] = useState<ChatDebugEntry[]>(() => chatDebugStore.getSnapshot(convId));
  const [filters, setFilters] = useState<Record<string, boolean>>(() => {
    const f: Record<string, boolean> = {};
    for (const family of ALL_FAMILIES) f[family] = family !== 'raw'; // raw duplicates every frame
    return f;
  });
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hideTextPatch, setHideTextPatch] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copyFeedbackById, setCopyFeedbackById] = useState<Record<string, 'copied' | 'error'>>({});
  const [exportFeedback, setExportFeedback] = useState<'ok' | 'error' | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    setEntries(chatDebugStore.getSnapshot(convId));
    setExpandedIds(new Set());
    setCopyFeedbackById({});
    setExportFeedback(null);
  }, [convId]);

  useEffect(() => {
    return chatDebugStore.subscribe(convId, () => {
      if (pausedRef.current) return;
      setEntries(chatDebugStore.getSnapshot(convId));
    });
  }, [convId]);

  const visibilityOptions = useMemo<EventTypeVisibilityOptions>(() => ({ hideTextPatch }), [hideTextPatch]);

  const visible = useMemo(() => {
    const filtered = filterVisibleEntries(entries, filters, visibilityOptions);
    return filtered.length > MAX_ENTRIES ? filtered.slice(filtered.length - MAX_ENTRIES) : filtered;
  }, [entries, filters, visibilityOptions]);

  // Auto-scroll keyed on count, not array identity, so focus re-renders don't
  // thrash scroll (old technique).
  const entryCount = visible.length;
  useLayoutEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [entryCount, autoScroll]);

  const toggleFilter = useCallback((family: string) => {
    setFilters((f) => ({ ...f, [family]: !f[family] }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearLog = useCallback(() => {
    setEntries([]);
    setExpandedIds(new Set());
    setCopyFeedbackById({});
    chatDebugStore.clear(convId);
  }, [convId]);

  const handleLogScroll = useCallback(() => {
    if (!autoScroll || !logRef.current) {
      return;
    }
    if (!isNearBottom(logRef.current)) {
      setAutoScroll(false);
    }
  }, [autoScroll]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      if (!next) {
        // resuming: catch up on everything dropped while paused
        setEntries(chatDebugStore.getSnapshot(convId));
      }
      return next;
    });
  }, [convId]);

  const followStream = useCallback(() => {
    setAutoScroll(true);
    endRef.current?.scrollIntoView({ behavior: 'instant' });
  }, []);
  const holdPosition = useCallback(() => setAutoScroll(false), []);

  const copyPayload = useCallback((entryId: string, payloadText: string) => {
    copyTextToClipboard(payloadText)
      .then(() => setCopyFeedbackById((prev) => ({ ...prev, [entryId]: 'copied' })))
      .catch(() => setCopyFeedbackById((prev) => ({ ...prev, [entryId]: 'error' })))
      .finally(() => {
        setTimeout(() => {
          setCopyFeedbackById((prev) => {
            if (!prev[entryId]) return prev;
            const next = { ...prev };
            delete next[entryId];
            return next;
          });
        }, 1400);
      });
  }, []);

  const exportVisibleToYaml = useCallback(() => {
    try {
      const { fileName, yaml } = buildVisibleEventsYamlExport(convId, visible);
      downloadYaml(fileName, yaml);
      setExportFeedback('ok');
    } catch {
      setExportFeedback('error');
    } finally {
      setTimeout(() => setExportFeedback(null), 1400);
    }
  }, [convId, visible]);

  return (
    <div data-part="event-viewer" style={rootStyle}>
      {/* Filter bar */}
      <div data-part="event-viewer-toolbar" style={toolbarStyle}>
        {ALL_FAMILIES.map((family) => (
          <button
            key={family}
            data-state={filters[family] ? 'active' : 'inactive'}
            onClick={() => toggleFilter(family)}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              borderRadius: '3px',
              border: `1px solid ${FAMILY_COLORS[family]}`,
              background: filters[family] ? FAMILY_COLORS[family] + '18' : 'transparent',
              color: filters[family] ? FAMILY_COLORS[family] : '#999',
              cursor: 'pointer',
            }}
          >
            {FAMILY_LABELS[family]}
          </button>
        ))}
        <label style={toggleLabelStyle} title="Hide ChatTextPatch streaming delta events">
          <input type="checkbox" checked={hideTextPatch} onChange={(event) => setHideTextPatch(event.target.checked)} />
          hide text deltas
        </label>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={exportVisibleToYaml} style={controlBtnStyle} title="Download currently visible events as YAML">
          ⬇ Export YAML
        </button>
        {exportFeedback === 'ok' && <span style={feedbackOkStyle}>Exported</span>}
        {exportFeedback === 'error' && <span style={feedbackErrorStyle}>Export failed</span>}
        <button type="button" onClick={togglePause} style={controlBtnStyle}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button type="button" onClick={clearLog} style={controlBtnStyle}>
          🗑 Clear
        </button>
        {autoScroll ? (
          <button type="button" onClick={holdPosition} style={controlBtnStyle} title="Stop auto-scrolling and hold current position">
            ⏸ Hold
          </button>
        ) : (
          <button type="button" onClick={followStream} style={controlBtnStyle} title="Resume live tailing (auto-scroll to newest event)">
            ▶ Follow Stream
          </button>
        )}
        <span style={{ color: '#888', fontSize: '10px' }}>
          {visible.length}/{entries.length}
        </span>
      </div>

      {/* Event log */}
      <div ref={logRef} data-part="event-viewer-log" onScroll={handleLogScroll} style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {visible.length === 0 && (
          <div style={{ color: '#999', textAlign: 'center', padding: '24px', fontSize: '13px' }}>
            {entries.length === 0 ? '📡 Waiting for events…' : `All ${entries.length} events are filtered out`}
          </div>
        )}
        {visible.map((entry) => (
          <EventRow
            key={entry.id}
            entry={entry}
            expanded={expandedIds.has(entry.id)}
            copyFeedback={copyFeedbackById[entry.id] ?? null}
            onToggle={toggleExpand}
            onCopy={copyPayload}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function EventRow({
  entry,
  expanded,
  copyFeedback,
  onToggle,
  onCopy,
}: {
  entry: ChatDebugEntry;
  expanded: boolean;
  copyFeedback: 'copied' | 'error' | null;
  onToggle: (id: string) => void;
  onCopy: (id: string, payloadText: string) => void;
}) {
  return (
    <div data-part="event-viewer-entry" data-family={entry.family} style={{ borderBottom: '1px solid #e5e5e5' }}>
      <div
        data-part="event-viewer-entry-header"
        onClick={() => onToggle(entry.id)}
        style={{ display: 'flex', gap: '8px', padding: '3px 8px', cursor: 'pointer', alignItems: 'baseline' }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#0000000a';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <span style={{ color: '#999', fontSize: '10px', minWidth: '70px' }}>{formatTimestamp(entry.at)}</span>
        <span style={{ color: FAMILY_COLORS[entry.family] ?? '#6b7280', minWidth: '130px', fontWeight: 600 }}>
          {entry.eventType}
        </span>
        {entry.eventId && (
          <span style={{ color: '#999', fontSize: '10px' }}>
            {entry.eventId.length > 12 ? entry.eventId.slice(0, 12) + '…' : entry.eventId}
          </span>
        )}
        <span style={{ color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.summary}
        </span>
        <span style={{ color: '#bbb', fontSize: '10px' }}>{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && <EventRowPayload entry={entry} copyFeedback={copyFeedback} onCopy={onCopy} />}
    </div>
  );
}

// Payload YAML is computed HERE — only for expanded rows (fixes the old
// eager-toYaml-per-visible-row gap).
function EventRowPayload({
  entry,
  copyFeedback,
  onCopy,
}: {
  entry: ChatDebugEntry;
  copyFeedback: 'copied' | 'error' | null;
  onCopy: (id: string, payloadText: string) => void;
}) {
  const payloadYaml = useMemo(() => toYaml(sanitizeForExport(entry.event) as Record<string, unknown>), [entry]);
  return (
    <div style={{ margin: '0 8px 4px 86px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 6px' }}>
        <button type="button" onClick={() => onCopy(entry.id, payloadYaml)} style={copyBtnStyle}>
          Copy Payload
        </button>
        {copyFeedback === 'copied' && <span style={feedbackOkStyle}>Copied</span>}
        {copyFeedback === 'error' && <span style={feedbackErrorStyle}>Copy failed</span>}
      </div>
      <SyntaxHighlight code={payloadYaml} language="yaml" variant="light" style={{ fontSize: 11, maxHeight: 300, userSelect: 'text' }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Debug
// ---------------------------------------------------------------------------

type TimelineMirror = TimelineMirrorState;

interface TimelineMutationLike {
  upsert?: TimelineMirror['byId'][string];
  upsertIfExists?: TimelineMirror['byId'][string];
  deleteId?: string;
  status?: string;
}

function toMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function unwrapAny(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const payload = value as Record<string, unknown>;
  const nested = payload.value;
  if (nested && typeof nested === 'object' && !Array.isArray(nested) && Object.keys(nested).length > 0) {
    return nested as Record<string, unknown>;
  }
  return payload;
}

function seedMirrorFromSnapshot(entities: Array<Record<string, unknown>>): TimelineMirror {
  const mirror = createEmptyTimelineMirror();
  for (const raw of entities) {
    const id = String(raw.id ?? '');
    if (!id) continue;
    mirror.byId[id] = {
      id,
      kind: String(raw.kind ?? 'unknown'),
      createdAt: toMillis(raw.createdAt),
      version: typeof raw.version === 'number' ? raw.version : undefined,
      props: unwrapAny(raw.props),
    };
    mirror.order.push(id);
  }
  return mirror;
}

function foldMutations(
  base: TimelineMirror,
  entries: ChatDebugEntry[],
  fromSeqExclusive: number,
): { mirror: TimelineMirror; lastSeq: number } {
  let working: TimelineMirror | null = null;
  let lastSeq = fromSeqExclusive;
  for (const entry of entries) {
    if (entry.seq <= fromSeqExclusive) continue;
    lastSeq = Math.max(lastSeq, entry.seq);
    if (entry.event.type !== 'ui-event') continue;
    const mutation = (entry.event as { mutation?: unknown }).mutation;
    if (!mutation || typeof mutation !== 'object') continue;
    working = applyTimelineMutationToMirror(working ?? base, mutation as TimelineMutationLike, { immutable: true });
  }
  return { mirror: working ?? base, lastSeq };
}

export function ChatTimelineDebugWindow({ convId, apiBasePrefix }: { convId: string; apiBasePrefix: string }) {
  const entries = useChatDebugEvents(convId);
  const [base, setBase] = useState<{ mirror: TimelineMirror; seq: number }>(() => ({ mirror: createEmptyTimelineMirror(), seq: 0 }));
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Seed from the authoritative REST snapshot; live mutations observed after
  // the response fold on top. (Mutations in flight during the fetch are
  // assumed to be included in the server snapshot — acceptable for a debug
  // view.)
  const fetchSnapshot = useCallback(() => {
    setFetchState('loading');
    setFetchError(null);
    fetch(`${apiBasePrefix}/api/chat/sessions/${encodeURIComponent(convId)}`, { headers: { Accept: 'application/json' } })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`snapshot returned ${res.status}`);
        }
        return res.json();
      })
      .then((body: { entities?: Array<Record<string, unknown>> }) => {
        const snapshotEntries = chatDebugStore.getSnapshot(convId);
        const seq = snapshotEntries.length > 0 ? snapshotEntries[snapshotEntries.length - 1].seq : 0;
        setBase({ mirror: seedMirrorFromSnapshot(Array.isArray(body.entities) ? body.entities : []), seq });
        setFetchState('idle');
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : String(err));
        setFetchState('error');
      });
  }, [apiBasePrefix, convId]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  // foldMutations returns the SAME mirror reference when no new mutations
  // applied, so the snapshot memo below only recomputes on real change (the
  // old memoized-snapshot-projection technique, now backed by react-chat's
  // upstream merge semantics).
  const folded = useMemo(() => foldMutations(base.mirror, entries, base.seq), [base, entries]);
  const snapshot = useMemo(() => buildTimelineDebugSnapshot(convId, folded.mirror), [convId, folded.mirror]);

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'yaml'>('tree');
  const [copyConvFeedback, setCopyConvFeedback] = useState<'ok' | 'error' | null>(null);
  const [exportFeedback, setExportFeedback] = useState<'ok' | 'error' | null>(null);
  const [entityCopyFeedback, setEntityCopyFeedback] = useState<Record<string, 'ok' | 'error'>>({});

  const selectedEntity = useMemo(() => {
    if (!selectedEntityId) return null;
    return snapshot.timeline.entities.find((e) => e.id === selectedEntityId) ?? null;
  }, [selectedEntityId, snapshot]);

  const copyConversation = useCallback(() => {
    const yaml = buildConversationYamlForCopy(snapshot);
    copyTextToClipboard(yaml)
      .then(() => setCopyConvFeedback('ok'))
      .catch(() => setCopyConvFeedback('error'))
      .finally(() => {
        setTimeout(() => setCopyConvFeedback(null), 1400);
      });
  }, [snapshot]);

  const exportYaml = useCallback(() => {
    try {
      const { fileName, yaml } = buildTimelineYamlExport(snapshot);
      downloadYaml(fileName, yaml);
      setExportFeedback('ok');
    } catch {
      setExportFeedback('error');
    } finally {
      setTimeout(() => setExportFeedback(null), 1400);
    }
  }, [snapshot]);

  const copyEntity = useCallback(
    (entity: TimelineDebugEntitySnapshot) => {
      const yaml = buildEntityYamlForCopy(entity, convId);
      copyTextToClipboard(yaml)
        .then(() => setEntityCopyFeedback((p) => ({ ...p, [entity.id]: 'ok' })))
        .catch(() => setEntityCopyFeedback((p) => ({ ...p, [entity.id]: 'error' })))
        .finally(() => {
          setTimeout(() => {
            setEntityCopyFeedback((p) => {
              const next = { ...p };
              delete next[entity.id];
              return next;
            });
          }, 1400);
        });
    },
    [convId],
  );

  return (
    <div data-part="timeline-debug" style={rootStyle}>
      {/* Toolbar */}
      <div data-part="timeline-debug-toolbar" style={toolbarStyle}>
        <button type="button" onClick={copyConversation} style={controlBtnStyle}>
          📋 Copy Conversation
        </button>
        {copyConvFeedback === 'ok' && <span style={feedbackOkStyle}>Copied</span>}
        {copyConvFeedback === 'error' && <span style={feedbackErrorStyle}>Copy failed</span>}
        <button type="button" onClick={exportYaml} style={controlBtnStyle}>
          ⬇ Export YAML
        </button>
        {exportFeedback === 'ok' && <span style={feedbackOkStyle}>Exported</span>}
        {exportFeedback === 'error' && <span style={feedbackErrorStyle}>Export failed</span>}
        <button type="button" onClick={fetchSnapshot} style={controlBtnStyle} disabled={fetchState === 'loading'} title="Re-seed from the server snapshot">
          {fetchState === 'loading' ? '⏳' : '🔄'} Refresh
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => setViewMode((m) => (m === 'tree' ? 'yaml' : 'tree'))} style={controlBtnStyle}>
          {viewMode === 'tree' ? '📄 YAML' : '🌳 Tree'}
        </button>
        <span style={summaryStyle}>
          {snapshot.summary.entityCount} entities
          {snapshot.summary.entityCount > 0 && ' · '}
          {Object.entries(snapshot.summary.kinds)
            .map(([k, n]) => `${k}: ${n}`)
            .join(', ')}
        </span>
      </div>

      {fetchState === 'error' && fetchError ? (
        <div style={{ padding: '4px 8px', fontSize: 11, color: '#dc2626' }}>snapshot fetch failed: {fetchError}</div>
      ) : null}

      {/* Body */}
      <div style={bodyStyle}>
        {/* Entity list (left) */}
        <div data-part="timeline-debug-list" style={listPaneStyle}>
          {snapshot.timeline.entities.length === 0 && (
            <div style={{ color: '#999', textAlign: 'center', padding: 24, fontSize: 12 }}>Empty timeline</div>
          )}
          {snapshot.timeline.entities.map((entity) => (
            <EntityRow
              key={entity.id}
              entity={entity}
              selected={entity.id === selectedEntityId}
              copyFeedback={entityCopyFeedback[entity.id] ?? null}
              onSelect={() => setSelectedEntityId(entity.id === selectedEntityId ? null : entity.id)}
              onCopy={() => copyEntity(entity)}
            />
          ))}
        </div>

        {/* Detail pane (right) */}
        <div data-part="timeline-debug-detail" style={detailPaneStyle}>
          {selectedEntity ? (
            <EntityDetail
              entity={selectedEntity}
              viewMode={viewMode}
              conversationId={convId}
              copyFeedback={entityCopyFeedback[selectedEntity.id] ?? null}
              onCopy={() => copyEntity(selectedEntity)}
            />
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: 24, fontSize: 12 }}>Select an entity to inspect</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntityRow({
  entity,
  selected,
  copyFeedback,
  onSelect,
  onCopy,
}: {
  entity: TimelineDebugEntitySnapshot;
  selected: boolean;
  copyFeedback: 'ok' | 'error' | null;
  onSelect: () => void;
  onCopy: () => void;
}) {
  return (
    <div
      data-part="timeline-debug-entity-row"
      data-state={selected ? 'selected' : undefined}
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        cursor: 'pointer',
        borderBottom: '1px solid #e5e5e5',
        background: selected ? '#0000000a' : 'transparent',
      }}
      onMouseOver={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = '#00000006';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.background = selected ? '#0000000a' : 'transparent';
      }}
    >
      <span style={{ color: '#999', fontSize: 10, minWidth: 24, textAlign: 'right' }}>{entity.orderIndex}</span>
      <span style={{ color: kindColor(entity.kind), fontWeight: 600, minWidth: 100, fontSize: 11 }}>{entity.kind}</span>
      <span style={{ color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>
        {entity.id}
      </span>
      <span style={{ color: '#999', fontSize: 9, minWidth: 70 }}>{entity.createdAt ? formatTimestamp(entity.createdAt) : '—'}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCopy();
        }}
        style={copyBtnStyle}
      >
        {copyFeedback === 'ok' ? '✅' : copyFeedback === 'error' ? '⚠' : '📋'}
      </button>
    </div>
  );
}

function EntityDetail({
  entity,
  viewMode,
  conversationId,
  copyFeedback,
  onCopy,
}: {
  entity: TimelineDebugEntitySnapshot;
  viewMode: 'tree' | 'yaml';
  conversationId: string;
  copyFeedback: 'ok' | 'error' | null;
  onCopy: () => void;
}) {
  // Sanitize LAZILY, per selected entity (fixes the old eager-clone-all gap).
  const sanitizedProps = useMemo(() => sanitizeForExport(entity.props), [entity]);
  const yaml = useMemo(
    () => (viewMode === 'yaml' ? buildEntityYamlForCopy(entity, conversationId) : ''),
    [viewMode, entity, conversationId],
  );

  return (
    <div style={{ padding: '4px 8px', overflow: 'auto', height: '100%' }}>
      <div style={detailToolbarStyle}>
        <button type="button" onClick={onCopy} style={controlBtnStyle}>
          📋 Copy Payload
        </button>
        {copyFeedback === 'ok' && <span style={feedbackOkStyle}>Copied</span>}
        {copyFeedback === 'error' && <span style={feedbackErrorStyle}>Copy failed</span>}
      </div>
      {viewMode === 'yaml' ? (
        <SyntaxHighlight code={yaml} language="yaml" variant="light" style={{ fontSize: 11, maxHeight: 'none', userSelect: 'text' }} />
      ) : (
        <>
          <div style={{ marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
            <span>
              <b style={{ color: '#7c3aed' }}>id:</b> <span style={{ color: '#0550ae' }}>{entity.id}</span>
            </span>
            <span>
              <b style={{ color: '#7c3aed' }}>kind:</b> <span style={{ color: kindColor(entity.kind) }}>{entity.kind}</span>
            </span>
            <span>
              <b style={{ color: '#7c3aed' }}>index:</b> <span style={{ color: '#0969da' }}>{entity.orderIndex}</span>
            </span>
            {entity.version !== null && (
              <span>
                <b style={{ color: '#7c3aed' }}>v:</b> <span style={{ color: '#0969da' }}>{entity.version}</span>
              </span>
            )}
          </div>
          <StructuredDataTree data={sanitizedProps} label="props" defaultCollapsed={false} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers + shared inline styles (old palette)
// ---------------------------------------------------------------------------

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().slice(11, 23);
}

const KIND_COLORS: Record<string, string> = {
  message: '#3b82f6',
  widget: '#8b5cf6',
  tool_call: '#f59e0b',
  suggestions: '#6366f1',
};

function kindColor(kind: string): string {
  return KIND_COLORS[kind] ?? '#6b7280';
}

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#333',
  background: '#fff',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '4px 8px',
  borderBottom: '1px solid #ddd',
  background: '#f8f9fa',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
};

const listPaneStyle: React.CSSProperties = {
  width: '40%',
  minWidth: 200,
  maxWidth: 400,
  overflow: 'auto',
  borderRight: '1px solid #ddd',
};

const detailPaneStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
};

const detailToolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 8,
};

const controlBtnStyle: React.CSSProperties = {
  padding: '2px 8px',
  fontSize: 11,
  borderRadius: 3,
  border: '1px solid #ccc',
  background: '#f0f0f0',
  color: '#555',
  cursor: 'pointer',
};

const toggleLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  color: '#6b7280',
  fontSize: '10px',
};

const copyBtnStyle: React.CSSProperties = {
  padding: '1px 7px',
  fontSize: 10,
  borderRadius: 3,
  border: '1px solid #ccc',
  background: '#f0f0f0',
  color: '#333',
  cursor: 'pointer',
  lineHeight: 1,
};

const feedbackOkStyle: React.CSSProperties = { color: '#10b981', fontSize: 10 };
const feedbackErrorStyle: React.CSSProperties = { color: '#ef4444', fontSize: 10 };
const summaryStyle: React.CSSProperties = { color: '#888', fontSize: 10 };
