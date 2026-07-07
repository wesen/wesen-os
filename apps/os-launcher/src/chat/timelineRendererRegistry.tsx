/*
 * Timeline renderer registry — mirror of the old os-chat
 * renderers/rendererRegistry.ts on chat-provider TimelineEntity.
 *
 * Components are keyed by entity `kind` with a `default` fallback; extensions
 * register at module scope and windows subscribe to the registry version via
 * useSyncExternalStore (same shape the old ChatConversationWindow used).
 */
import { useSyncExternalStore, type ReactNode } from 'react';

/**
 * Structural mirror of chat-provider's TimelineEntity (the type is not
 * re-exported from the package index; selectTimelineEntities returns these).
 */
export interface TimelineEntity {
  id: string;
  kind: string;
  createdAt: number;
  updatedAt?: number;
  version?: number;
  props: Record<string, unknown>;
}

export type ChatRenderMode = 'normal' | 'debug';

export interface TimelineRenderContext {
  renderMode: ChatRenderMode;
}

export type TimelineRenderer = (props: { entity: TimelineEntity; ctx: TimelineRenderContext }) => ReactNode;

export type TimelineRenderers = Record<string, TimelineRenderer> & { default: TimelineRenderer };

const extensionRenderers = new Map<string, TimelineRenderer>();
const registryListeners = new Set<() => void>();
let registryVersion = 0;

function notifyRegistryChanged() {
  registryVersion += 1;
  for (const listener of registryListeners) {
    listener();
  }
}

export function registerTimelineRenderer(kind: string, renderer: TimelineRenderer) {
  const key = String(kind || '').trim();
  if (!key) return;
  if (extensionRenderers.get(key) === renderer) {
    return;
  }
  extensionRenderers.set(key, renderer);
  notifyRegistryChanged();
}

export function unregisterTimelineRenderer(kind: string) {
  const key = String(kind || '').trim();
  if (!key) return;
  if (!extensionRenderers.delete(key)) {
    return;
  }
  notifyRegistryChanged();
}

export function subscribeTimelineRenderers(listener: () => void): () => void {
  registryListeners.add(listener);
  return () => {
    registryListeners.delete(listener);
  };
}

export function getTimelineRendererRegistryVersion(): number {
  return registryVersion;
}

/** Subscribe a component to registry changes; returns the current version. */
export function useTimelineRendererRegistryVersion(): number {
  return useSyncExternalStore(
    subscribeTimelineRenderers,
    getTimelineRendererRegistryVersion,
    getTimelineRendererRegistryVersion,
  );
}

/**
 * Resolve the effective renderer map: builtins (provided by the caller,
 * e.g. ChatTimeline's message/widget/tool_call) < registered extensions <
 * per-window overrides; `default` always present.
 */
export function resolveTimelineRenderers(
  builtins: Record<string, TimelineRenderer>,
  defaultRenderer: TimelineRenderer,
  overrides?: Partial<TimelineRenderers>,
): TimelineRenderers {
  const resolved = {
    ...builtins,
    ...Object.fromEntries(extensionRenderers.entries()),
    ...(overrides ?? {}),
    default: defaultRenderer,
  } as TimelineRenderers;

  if (overrides?.default) {
    resolved.default = overrides.default;
  }

  return resolved;
}
