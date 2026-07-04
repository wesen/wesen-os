/*
 * Generic chat window chrome for launcher chat windows on
 * @go-go-golems/chat-provider + chat-overlay. Must render inside a
 * <ChatProvider>.
 *
 * Feature-parity chrome with the old os-chat ChatConversationWindow: title,
 * connection badge, profile selector (bound at session creation), Events /
 * Timeline / Copy Conv ID / Debug header actions, message counter, empty
 * state, starter suggestions, composer, footer slot.
 *
 * Mirrors the inventory app's InventoryChatChrome; lives launcher-local
 * because the federation boundary forbids importing inventory internals
 * (ticket WESEN-OS-ASSISTANT-PARITY-2026-07 tasks.md architecture decision).
 * Phase 6 upstreams this into react-chat.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  useChatClient,
  useChatSelector,
  selectOverlay,
  selectTimelineEntities,
} from '@go-go-golems/chat-provider';
import { ChatMessages, ChatComposer, useStickyScrollFollow } from '@go-go-golems/chat-overlay';
import { chatDebugStore } from './chatDebugStore';
import { useChatDebugEvents } from './useChatDebugEvents';
import { useChatProfiles } from './useChatProfiles';
import './chat-chrome.css';

export interface ChatWindowChromeProps {
  convId: string;
  apiBasePrefix: string;
  /** Header title, e.g. "🤖 Assistant". */
  title: string;
  /** Empty-state subtitle under "How can I help?". */
  emptySubtitle?: string;
  starterSuggestions?: string[];
  /** Selected engine profile slug (bound at session creation by the parent). */
  profile: string | null;
  onProfileChange: (slug: string | null) => void;
  /** When set, renders the 🧭 Events header button. */
  onOpenEventViewer?: (convId: string) => void;
  /** When set, renders the 🧱 Timeline header button. */
  onOpenTimelineDebug?: (convId: string) => void;
  /** Footer content; defaults to the transport tagline. */
  footer?: ReactNode;
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('clipboard unavailable');
}

function ChatEmptyState({ subtitle }: { subtitle: string }) {
  return (
    <div className="oschat-empty" data-part="empty">
      <div className="oschat-empty-emoji" aria-hidden>💬</div>
      <div className="oschat-empty-title">How can I help?</div>
      <div className="oschat-empty-sub">{subtitle}</div>
    </div>
  );
}

function ChatDebugPanel({ convId }: { convId: string }) {
  const overlay = useChatSelector(selectOverlay);
  const entities = useChatSelector(selectTimelineEntities);
  const entries = useChatDebugEvents(convId);
  const recent = entries.slice(-25).reverse();

  return (
    <div className="oschat-debug-panel" data-part="debug-panel">
      <div className="oschat-debug-toolbar">
        <strong>Debug</strong>
        <span>ws: {overlay.wsStatus || '—'}</span>
        <span>run: {overlay.runStatus || '—'}</span>
        <span>entities: {entities.length}</span>
        <span>frames: {entries.length}</span>
        <button type="button" data-part="btn" onClick={() => chatDebugStore.clear(convId)}>
          Clear
        </button>
      </div>
      <div className="oschat-debug-section-title">Overlay</div>
      <pre className="oschat-debug-pre">{JSON.stringify(overlay, null, 2)}</pre>
      <div className="oschat-debug-section-title">Recent frames</div>
      {recent.length === 0 ? (
        <div className="oschat-debug-row">no frames yet</div>
      ) : (
        recent.map((entry) => (
          <div className="oschat-debug-row" key={entry.id}>
            <span className="oschat-debug-row-type">{entry.event.type}</span>
            <span>{entry.summary}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function ChatWindowChrome({
  convId,
  apiBasePrefix,
  title,
  emptySubtitle = 'Ask a question, request data, or try one of the suggestions below.',
  starterSuggestions = [],
  profile,
  onProfileChange,
  onOpenEventViewer,
  onOpenTimelineDebug,
  footer,
}: ChatWindowChromeProps) {
  const client = useChatClient();
  const overlay = useChatSelector(selectOverlay);
  const entities = useChatSelector(selectTimelineEntities);
  const [debugOpen, setDebugOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const { profiles, defaultSlug, loading: profilesLoading } = useChatProfiles(apiBasePrefix);

  const isStreaming = overlay.runStatus === 'streaming';
  const connected = overlay.wsStatus === 'connected';
  const isEmpty = entities.length === 0;

  const scroll = useStickyScrollFollow({
    enabled: true,
    contentVersion: `${overlay.runStatus}:${overlay.wsStatus}`,
    resetKey: overlay.sessionId,
  });

  useEffect(() => {
    client.connect().catch(() => {
      // surfaced via overlay.wsStatus / overlay.error
    });
  }, [client]);

  // Once the profile list arrives, adopt the default selection if the user has
  // not chosen one yet. Profile is bound at session creation.
  useEffect(() => {
    if (profile === null && defaultSlug) {
      onProfileChange(defaultSlug);
    }
  }, [defaultSlug, profile, onProfileChange]);

  const copyConvId = useCallback(() => {
    copyTextToClipboard(overlay.sessionId || convId)
      .then(() => setCopyStatus('copied'))
      .catch(() => setCopyStatus('error'))
      .finally(() => setTimeout(() => setCopyStatus('idle'), 1300));
  }, [convId, overlay.sessionId]);

  const sendSuggestion = useCallback(
    (text: string) => {
      client.send(text).catch(() => {
        // surfaced via overlay.error
      });
    },
    [client],
  );

  const profileLocked = entities.length > 0; // changing profile after first message needs a new session

  return (
    <div className="oschat-window" data-part="oschat-window">
      <div className="oschat-header" data-part="header">
        <span className="oschat-title">{title}</span>
        <span className="oschat-conn" data-connected={connected}>
          {connected ? 'connected' : overlay.wsStatus || 'connecting'}
        </span>
        <label className="oschat-profile">
          Profile
          <select
            value={profile ?? ''}
            disabled={profilesLoading || profiles.length === 0 || profileLocked}
            title={profileLocked ? 'Start a new chat to change profile' : undefined}
            onChange={(e) => onProfileChange(e.target.value || null)}
          >
            {profiles.length === 0 ? (
              <option value="">{profilesLoading ? 'Loading…' : 'Default (default)'}</option>
            ) : (
              profiles.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.displayName}
                  {p.isDefault ? ' (default)' : ''}
                </option>
              ))
            )}
          </select>
        </label>
        <div className="oschat-header-actions">
          {onOpenEventViewer ? (
            <button type="button" data-part="btn" onClick={() => onOpenEventViewer(convId)}>
              🧭 Events
            </button>
          ) : null}
          {onOpenTimelineDebug ? (
            <button type="button" data-part="btn" onClick={() => onOpenTimelineDebug(convId)}>
              🧱 Timeline
            </button>
          ) : null}
          <button type="button" data-part="btn" onClick={copyConvId} title={convId}>
            {copyStatus === 'copied' ? '✅ Copied' : copyStatus === 'error' ? '⚠ Copy failed' : '📋 Copy Conv ID'}
          </button>
          <button
            type="button"
            data-part="btn"
            data-state={debugOpen ? 'active' : undefined}
            onClick={() => setDebugOpen((v) => !v)}
          >
            {debugOpen ? '🔍 Debug ON' : '🔍 Debug'}
          </button>
        </div>
        <div className="oschat-counters">
          <span>{entities.length} messages</span>
        </div>
      </div>

      {overlay.error ? <div className="chat-overlay-error-bar">{String(overlay.error)}</div> : null}

      <div
        ref={scroll.containerRef}
        onScroll={scroll.onScroll}
        onWheel={scroll.onWheel}
        className="chat-overlay-messages-scroll"
      >
        {isEmpty ? <ChatEmptyState subtitle={emptySubtitle} /> : <ChatMessages bottomRef={scroll.tailRef} />}
      </div>

      {isEmpty && starterSuggestions.length > 0 ? (
        <div className="oschat-suggestions" data-part="suggestions">
          {starterSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="oschat-suggestion"
              disabled={isStreaming}
              onClick={() => sendSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {debugOpen ? <ChatDebugPanel convId={convId} /> : null}

      <ChatComposer disabled={isStreaming} />
      <div className="oschat-footer" data-part="footer">
        {footer ?? 'Streaming via sessionstream'}
      </div>
    </div>
  );
}
