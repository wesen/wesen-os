/*
 * Chat window stats footer backed by chat-provider's upstream run stats slice.
 *
 * Idle/complete:  <label> · In:<n> Out:<n> [Cache:<n>] [CacheW:<n>] [CacheR:<n>]
 *                 · <d>s · <tps> tok/s  (+ conversation totals after >1 run)
 * Streaming:      <label> · streaming: <n> tok · <tps> tok/s
 * No stats yet:   Streaming via sessionstream
 */
import { useEffect, useState } from 'react';
import { selectRunStats, useChatSelector } from '@go-go-golems/chat-provider';

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function StatsFooter({ label }: { convId?: string; label?: string | null }) {
  const stats = useChatSelector(selectRunStats);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!stats.isStreaming) return undefined;
    const timer = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [stats.isStreaming]);

  const parts: string[] = [];

  if (label) {
    parts.push(label);
  }

  if (stats.isStreaming && stats.streamStartTime) {
    const elapsed = Math.max(0.001, (Date.now() - stats.streamStartTime) / 1000);
    const liveTps = Math.round((stats.streamOutputTokens / elapsed) * 10) / 10;
    parts.push(`streaming: ${formatNumber(stats.streamOutputTokens)} tok · ${liveTps} tok/s`);
  } else if (stats.lastRun) {
    const u = stats.lastRun;
    const usageBits = [`In:${formatNumber(u.inputTokens)}`, `Out:${formatNumber(u.outputTokens)}`];
    if (u.cachedTokens > 0) {
      usageBits.push(`Cache:${formatNumber(u.cachedTokens)}`);
    }
    if (u.cacheCreationInputTokens > 0) {
      usageBits.push(`CacheW:${formatNumber(u.cacheCreationInputTokens)}`);
    }
    if (u.cacheReadInputTokens > 0) {
      usageBits.push(`CacheR:${formatNumber(u.cacheReadInputTokens)}`);
    }
    parts.push(usageBits.join(' '));
    if (stats.lastRunDurationMs && stats.lastRunDurationMs > 0) {
      parts.push(`${Math.round(stats.lastRunDurationMs / 100) / 10}s`);
      const tps = Math.round((u.outputTokens / (stats.lastRunDurationMs / 1000)) * 10) / 10;
      if (Number.isFinite(tps) && tps > 0) {
        parts.push(`${tps} tok/s`);
      }
    }
    if (stats.completedRuns > 1) {
      parts.push(`Σ In:${formatNumber(stats.totals.inputTokens)} Out:${formatNumber(stats.totals.outputTokens)}`);
    }
  }

  if (parts.length === 0 || (parts.length === 1 && Boolean(label))) {
    return <>{'Streaming via sessionstream'}</>;
  }
  return <>{parts.join(' · ')}</>;
}
