/*
 * Timeline debug snapshot model and export helpers — adapted port of the old
 * os-chat debug/timelineDebugModel.ts onto the timelineMirror shape.
 *
 * Deliberate change vs the old model (guide §4.2 gap fix): the snapshot keeps
 * RAW props references; `sanitizeForExport` runs lazily — per selected entity
 * and at copy/export time — instead of eagerly cloning every entity on any
 * timeline change.
 */
import type { TimelineMirror } from './timelineMirror';
import { toYaml } from './yamlFormat';

export interface TimelineDebugEntitySnapshot {
  id: string;
  orderIndex: number;
  kind: string;
  createdAt: number;
  updatedAt: number | null;
  version: number | null;
  /** RAW props reference — sanitize lazily before display/export. */
  props: unknown;
}

export interface TimelineDebugSummary {
  entityCount: number;
  orderCount: number;
  kinds: Record<string, number>;
}

export interface TimelineDebugSnapshot {
  conversationId: string;
  summary: TimelineDebugSummary;
  timeline: {
    order: string[];
    entities: TimelineDebugEntitySnapshot[];
  };
}

// ---------------------------------------------------------------------------
// Sanitization (verbatim port)
// ---------------------------------------------------------------------------

const MAX_DEPTH = 24;

/**
 * Deep-clone a value into a plain JSON-safe structure.
 * Handles cycles, Date, BigInt, functions, and other non-JSON types.
 */
export function sanitizeForExport(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[max depth]';

  if (value === null || value === undefined) return value;

  switch (typeof value) {
    case 'boolean':
    case 'number':
    case 'string':
      return value;
    case 'bigint':
      return `[BigInt: ${value.toString()}]`;
    case 'function':
      return `[Function: ${value.name || 'anonymous'}]`;
    case 'symbol':
      return `[Symbol: ${value.toString()}]`;
    default:
      break;
  }

  if (typeof value !== 'object') return String(value);

  if (value instanceof Date) return value.toISOString();
  if (value instanceof RegExp) return value.toString();
  if (value instanceof Error) return `[Error: ${value.message}]`;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForExport(item, seen, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = sanitizeForExport(val, seen, depth + 1);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Snapshot building (props kept raw — see header)
// ---------------------------------------------------------------------------

export function buildTimelineDebugSnapshot(conversationId: string, mirror: TimelineMirror): TimelineDebugSnapshot {
  const kinds: Record<string, number> = {};
  const entities: TimelineDebugEntitySnapshot[] = mirror.order.map((id, index) => {
    const entity = mirror.byId[id];
    if (!entity) {
      return { id, orderIndex: index, kind: '<missing>', createdAt: 0, updatedAt: null, version: null, props: null };
    }
    kinds[entity.kind] = (kinds[entity.kind] ?? 0) + 1;
    return {
      id: entity.id,
      orderIndex: index,
      kind: entity.kind,
      createdAt: entity.createdAt,
      updatedAt: typeof entity.updatedAt === 'number' ? entity.updatedAt : null,
      version: typeof entity.version === 'number' ? entity.version : null,
      props: entity.props,
    };
  });

  return {
    conversationId,
    summary: {
      entityCount: Object.keys(mirror.byId).length,
      orderCount: mirror.order.length,
      kinds,
    },
    timeline: {
      order: [...mirror.order],
      entities,
    },
  };
}

// ---------------------------------------------------------------------------
// Clipboard / export helpers (sanitize at the boundary)
// ---------------------------------------------------------------------------

export function buildEntityYamlForCopy(entity: TimelineDebugEntitySnapshot, conversationId?: string): string {
  const doc: Record<string, unknown> = {
    ...(conversationId ? { conversationId } : {}),
    id: entity.id,
    orderIndex: entity.orderIndex,
    kind: entity.kind,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    version: entity.version,
    props: sanitizeForExport(entity.props),
  };
  return toYaml(doc);
}

export function buildConversationYamlForCopy(snapshot: TimelineDebugSnapshot, exportedAtMs = Date.now()): string {
  return toYaml({
    conversationId: snapshot.conversationId,
    exportedAt: new Date(exportedAtMs).toISOString(),
    summary: snapshot.summary,
    timeline: {
      order: snapshot.timeline.order,
      entities: snapshot.timeline.entities.map((entity) => ({
        ...entity,
        props: sanitizeForExport(entity.props),
      })),
    },
  } as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// File export
// ---------------------------------------------------------------------------

function toFileSafeSegment(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'conversation';
}

export interface TimelineYamlExport {
  fileName: string;
  yaml: string;
}

export function buildTimelineYamlExport(snapshot: TimelineDebugSnapshot, exportedAtMs = Date.now()): TimelineYamlExport {
  const timestamp = new Date(exportedAtMs).toISOString().replace(/[:.]/g, '-');
  const fileName = `timeline-${toFileSafeSegment(snapshot.conversationId)}-${timestamp}.yaml`;
  const yaml = buildConversationYamlForCopy(snapshot, exportedAtMs);
  return { fileName, yaml };
}
