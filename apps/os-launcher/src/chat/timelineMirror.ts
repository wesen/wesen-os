/*
 * Detached-window timeline mirror.
 *
 * A detached Timeline Debug window has no ChatProvider, so it cannot read the
 * chat window's Redux timeline. Instead it reconstructs one: seed from the
 * chathost REST snapshot, then fold the `ui-event` debug entries (which carry
 * the provider's TimelineMutation verbatim) from chatDebugStore.
 *
 * Merge semantics are a faithful port of chat-provider's timelineSlice
 * (`mergeTimelineEntity` + `mergePropsWithPatches` + `applyStreamPatch` +
 * `mergeWidgetProps`) so the mirror matches what the chat window renders.
 */
import type { ChatDebugEntry } from './chatDebugStore';

export interface MirrorEntity {
  id: string;
  kind: string;
  createdAt: number;
  updatedAt?: number;
  version?: number;
  props: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TimelineMirror {
  byId: Record<string, MirrorEntity>;
  order: string[];
}

export function emptyMirror(): TimelineMirror {
  return { byId: {}, order: [] };
}

// --- provider merge semantics (ported from chat-provider store/timelineSlice.js) ---

function applyStreamPatch(previous: string, patch: string, mode: unknown): string {
  if (
    mode === 'CHAT_STREAM_PATCH_MODE_SNAPSHOT' ||
    mode === 'CHAT_STREAM_PATCH_MODE_REPLACE' ||
    mode === 'SNAPSHOT' ||
    mode === 'REPLACE'
  ) {
    return patch;
  }
  return `${previous}${patch}`;
}

function mergeWidgetProps(
  merged: Record<string, unknown>,
  patch: Record<string, unknown>,
  patchPaths: string[],
): Record<string, unknown> {
  const props = (merged.props ?? {}) as Record<string, unknown>;
  const patchProps = (patch.propsPatch ?? patch) as Record<string, unknown>;
  if (patchPaths.length > 0) {
    let nextProps = props;
    for (const path of patchPaths) {
      if (path in patchProps) {
        if (Array.isArray(props[path]) && Array.isArray(patchProps[path])) {
          nextProps = { ...nextProps, [path]: [...(props[path] as unknown[]), ...(patchProps[path] as unknown[])] };
        } else {
          nextProps = { ...nextProps, [path]: patchProps[path] };
        }
      }
    }
    return { ...merged, props: nextProps };
  }
  return { ...merged, props: { ...props, ...patchProps } };
}

function mergePropsWithPatches(
  existingProps: Record<string, unknown> | undefined,
  incomingProps: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(existingProps ?? {}), ...(incomingProps ?? {}) };
  const contentPatch = merged.contentPatch;
  const patchMode = merged.patchMode;
  delete merged.contentPatch;
  delete merged.patchMode;
  if (contentPatch !== undefined) {
    const previous = typeof existingProps?.content === 'string' ? (existingProps.content as string) : '';
    merged.content = applyStreamPatch(previous, String(contentPatch), patchMode);
  }
  const propsPatch = merged.propsPatch;
  const patchPaths = (merged.patchPaths as string[] | undefined) ?? [];
  delete merged.propsPatch;
  delete merged.patchPaths;
  if (propsPatch && typeof propsPatch === 'object') {
    return mergeWidgetProps(merged, propsPatch as Record<string, unknown>, patchPaths).props as Record<string, unknown>;
  }
  return merged;
}

function mergeEntity(mirror: TimelineMirror, e: MirrorEntity, createIfMissing: boolean): void {
  const existing = mirror.byId[e.id];
  const incomingProps = { ...(e.props ?? {}) };
  if (!existing) {
    if (!createIfMissing) return;
    mirror.byId[e.id] = { ...e, props: mergePropsWithPatches({}, incomingProps) };
    mirror.order.push(e.id);
    return;
  }
  mirror.byId[e.id] = {
    ...existing,
    ...e,
    createdAt: existing.createdAt,
    kind: e.kind || existing.kind,
    props: mergePropsWithPatches(existing.props, incomingProps),
  };
}

// --- mutation folding ---

interface TimelineMutationLike {
  upsert?: MirrorEntity;
  upsertIfExists?: MirrorEntity;
  deleteId?: string;
  status?: string;
}

function applyMutation(mirror: TimelineMirror, mutation: TimelineMutationLike): void {
  if (mutation.upsert) {
    mergeEntity(mirror, mutation.upsert, true);
  }
  if (mutation.upsertIfExists) {
    mergeEntity(mirror, mutation.upsertIfExists, false);
  }
  if (mutation.deleteId) {
    if (mirror.byId[mutation.deleteId]) {
      delete mirror.byId[mutation.deleteId];
      mirror.order = mirror.order.filter((id) => id !== mutation.deleteId);
    }
  }
}

/**
 * Fold `ui-event` debug entries with seq > fromSeqExclusive into a NEW mirror
 * (copy-on-write at the container level; untouched entities keep identity).
 * Returns the same mirror reference when nothing applied.
 */
export function foldMutations(
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
    if (!working) {
      working = { byId: { ...base.byId }, order: [...base.order] };
    }
    applyMutation(working, mutation as TimelineMutationLike);
  }
  return { mirror: working ?? base, lastSeq };
}

// --- REST snapshot seeding ---

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

/** Seed a mirror from the chathost REST snapshot's raw entities. */
export function seedMirrorFromSnapshot(entities: Array<Record<string, unknown>>): TimelineMirror {
  const mirror = emptyMirror();
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
