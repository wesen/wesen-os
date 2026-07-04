/*
 * Per-conversation run/usage stats for launcher chat windows, derived from the
 * chat-provider debug event stream.
 *
 * Token usage is ALREADY on the wire (verified, ticket
 * WESEN-OS-ASSISTANT-PARITY-2026-07 guide §5): chatapp publishes transient
 * `ChatProviderCallMetadataUpdated` / `ChatProviderCallFinished` UI events
 * carrying `UsageInfo`, but chat-provider's store ignores them. This store
 * scrapes them from `parsed-frame` debug events (which carry the full decoded
 * frame incl. payload) — the same strategy the old os-chat semRegistry used on
 * the `llm.*` SEM envelopes' metadata.
 *
 * Live streaming token counts use the old estimate: accumulated ChatTextPatch
 * delta length / 4, overridden by real usage.outputTokens whenever a metadata
 * event arrives.
 */
import type { ChatDebugEvent } from '@go-go-golems/chat-provider';

export interface ChatUsageTotals {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export interface ChatRunStats {
  isStreaming: boolean;
  /** ms epoch when the current run started streaming. */
  streamStartTime: number | null;
  /** Live output-token count: real usage when known, else chars/4 estimate. */
  streamOutputTokens: number;
  /** Usage of the last completed run (accumulated across provider calls). */
  lastRun: ChatUsageTotals | null;
  lastRunDurationMs: number | null;
  lastRunStopReason: string | null;
  /** Conversation totals across all completed provider calls. */
  totals: ChatUsageTotals;
  completedRuns: number;
}

const EMPTY_TOTALS: ChatUsageTotals = {
  inputTokens: 0,
  outputTokens: 0,
  cachedTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
};

const INITIAL_STATS: ChatRunStats = {
  isStreaming: false,
  streamStartTime: null,
  streamOutputTokens: 0,
  lastRun: null,
  lastRunDurationMs: null,
  lastRunStopReason: null,
  totals: EMPTY_TOTALS,
  completedRuns: 0,
};

type Entry = {
  stats: ChatRunStats;
  listeners: Set<() => void>;
  // mutable per-run scratch, not part of the snapshot
  streamChars: number;
  usageOutputSoFar: number;
  runUsage: ChatUsageTotals;
  runDurationMs: number;
  runStopReason: string | null;
  runHadCalls: boolean;
};

const entries = new Map<string, Entry>();

function getEntry(convId: string): Entry {
  let entry = entries.get(convId);
  if (!entry) {
    entry = {
      stats: INITIAL_STATS,
      listeners: new Set(),
      streamChars: 0,
      usageOutputSoFar: 0,
      runUsage: { ...EMPTY_TOTALS },
      runDurationMs: 0,
      runStopReason: null,
      runHadCalls: false,
    };
    entries.set(convId, entry);
  }
  return entry;
}

function emit(entry: Entry): void {
  for (const listener of entry.listeners) {
    listener();
  }
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function usageFromPayload(payload: Record<string, unknown>): ChatUsageTotals | null {
  const usage = payload.usage;
  if (!usage || typeof usage !== 'object') {
    return null;
  }
  const u = usage as Record<string, unknown>;
  return {
    inputTokens: toNumber(u.inputTokens),
    outputTokens: toNumber(u.outputTokens),
    cachedTokens: toNumber(u.cachedTokens),
    cacheCreationInputTokens: toNumber(u.cacheCreationInputTokens),
    cacheReadInputTokens: toNumber(u.cacheReadInputTokens),
  };
}

function addTotals(a: ChatUsageTotals, b: ChatUsageTotals): ChatUsageTotals {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
    cacheCreationInputTokens: a.cacheCreationInputTokens + b.cacheCreationInputTokens,
    cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
  };
}

function estimateTokens(chars: number): number {
  return Math.max(0, Math.ceil(chars / 4));
}

export const chatStatsStore = {
  /** Feed one debug event; call from the chat window's onDebugEvent handler. */
  ingest(convId: string, event: ChatDebugEvent): void {
    if (event.type !== 'parsed-frame') {
      return;
    }
    const frame = event.frame as Record<string, unknown>;
    if (frame.type !== 'ui-event') {
      return;
    }
    const name = String(frame.name ?? '');
    const payload = (frame.payload && typeof frame.payload === 'object' ? frame.payload : {}) as Record<string, unknown>;
    const entry = getEntry(convId);
    const prev = entry.stats;

    switch (name) {
      case 'ChatRunStarted': {
        entry.streamChars = 0;
        entry.usageOutputSoFar = 0;
        entry.runUsage = { ...EMPTY_TOTALS };
        entry.runDurationMs = 0;
        entry.runStopReason = null;
        entry.runHadCalls = false;
        entry.stats = {
          ...prev,
          isStreaming: true,
          streamStartTime: Date.now(),
          streamOutputTokens: 0,
        };
        break;
      }
      case 'ChatTextPatch': {
        if (!prev.isStreaming) {
          return;
        }
        const text = typeof payload.text === 'string' ? payload.text : '';
        entry.streamChars += text.length;
        const nextTokens = entry.usageOutputSoFar > 0 ? entry.usageOutputSoFar : estimateTokens(entry.streamChars);
        if (nextTokens === prev.streamOutputTokens) {
          return;
        }
        entry.stats = { ...prev, streamOutputTokens: nextTokens };
        break;
      }
      case 'ChatProviderCallMetadataUpdated': {
        const usage = usageFromPayload(payload);
        if (!usage || usage.outputTokens <= 0) {
          return;
        }
        entry.usageOutputSoFar = usage.outputTokens;
        if (!prev.isStreaming || usage.outputTokens === prev.streamOutputTokens) {
          return;
        }
        entry.stats = { ...prev, streamOutputTokens: usage.outputTokens };
        break;
      }
      case 'ChatProviderCallFinished': {
        const usage = usageFromPayload(payload);
        if (usage) {
          entry.runUsage = addTotals(entry.runUsage, usage);
          entry.runHadCalls = true;
          entry.usageOutputSoFar = 0;
        }
        entry.runDurationMs += toNumber(payload.durationMs);
        const stop = typeof payload.stopReason === 'string' ? payload.stopReason : '';
        if (stop) {
          entry.runStopReason = stop;
        }
        return; // snapshot updates on run end
      }
      case 'ChatRunFinished':
      case 'ChatRunStopped':
      case 'ChatRunFailed': {
        const finishedRun = entry.runHadCalls ? entry.runUsage : null;
        entry.stats = {
          isStreaming: false,
          streamStartTime: null,
          streamOutputTokens: 0,
          lastRun: finishedRun ?? prev.lastRun,
          lastRunDurationMs: entry.runHadCalls ? entry.runDurationMs : prev.lastRunDurationMs,
          lastRunStopReason: entry.runStopReason ?? prev.lastRunStopReason,
          totals: finishedRun ? addTotals(prev.totals, finishedRun) : prev.totals,
          completedRuns: prev.completedRuns + (finishedRun ? 1 : 0),
        };
        break;
      }
      default:
        return;
    }
    emit(entry);
  },

  getSnapshot(convId: string): ChatRunStats {
    return getEntry(convId).stats;
  },

  subscribe(convId: string, listener: () => void): () => void {
    const entry = getEntry(convId);
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
    };
  },
};
