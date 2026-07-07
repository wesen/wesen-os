/*
 * Launcher-specific ChatMessages adapter.
 *
 * react-chat now owns the generic timeline iteration, per-kind renderer map,
 * and unknown-kind fallback. This file only supplies launcher-specific message
 * rendering: markdown, thinking traces, and HyperCard artifact stripping.
 */
import { useMemo, useState, type RefObject } from 'react';
import {
  ChatMessages,
  type ChatMessageRenderMode,
  type TimelineEntityRenderer,
  type TimelineEntityRendererContext,
} from '@go-go-golems/chat-overlay';
import {
  resolveTimelineRenderers,
  useTimelineRendererRegistryVersion,
  type ChatRenderMode,
  type TimelineEntity,
  type TimelineRenderer,
  type TimelineRenderers,
} from './timelineRendererRegistry';
import { Markdown } from './markdown';
import { stripHypercardBlocks } from './hypercardBlocks';

function ThinkingBlock({ entity }: { entity: TimelineEntity }) {
  const streaming = Boolean(entity.props.streaming);
  const [open, setOpen] = useState(streaming);
  const content = String(entity.props.content ?? '');
  return (
    <div className="oschat-thinking" data-state={open ? 'open' : 'closed'}>
      <button type="button" className="oschat-thinking-summary" onClick={() => setOpen((v) => !v)}>
        {open ? '▼' : '▶'} 💭 Thinking{streaming ? '…' : ''}
      </button>
      {open ? (
        <div className="oschat-thinking-body">
          <Markdown text={content} />
          {streaming ? <span className="cursor-blink">▌</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function MessageBody({ entity }: { entity: TimelineEntity }) {
  const content = String(entity.props.content ?? '');
  const streaming = Boolean(entity.props.streaming);
  const { text, building, buildingTag } = useMemo(() => stripHypercardBlocks(content), [content]);
  return (
    <div className="mt-0.5">
      <Markdown text={text} />
      {building ? (
        <div className="oschat-card-buildup" data-part="card-buildup">
          <span className="oschat-card-buildup-spinner" aria-hidden>🃏</span>
          Building {buildingTag === 'card' ? 'card' : buildingTag ?? 'artifact'}…
        </div>
      ) : streaming ? (
        <span className="cursor-blink">▌</span>
      ) : null}
    </div>
  );
}

const MessageRenderer: TimelineRenderer = ({ entity }) => {
  const role = entity.props.role;
  const isUser = role === 'user';
  if (role === 'thinking') {
    return <ThinkingBlock entity={entity} />;
  }
  return (
    <div
      className={[
        'px-2 py-1.5 text-xs',
        isUser ? 'border-l-2 border-mac-black bg-mac-gray-5 text-mac-gray-1' : 'text-mac-black',
      ].join(' ')}
    >
      <span className="text-mac-gray-3 text-[10px] uppercase mr-1">{isUser ? 'you' : 'assistant'}</span>
      <MessageBody entity={entity} />
    </div>
  );
};

function DefaultEntityBody({ entity }: { entity: TimelineEntity }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="text-xs" style={{ padding: '2px 8px' }}>
      <span
        onClick={() => setExpanded((v) => !v)}
        style={{ cursor: 'pointer' }}
        className="text-mac-gray-3"
        title={entity.id}
      >
        {expanded ? '▼' : '▶'} [{entity.kind}]
      </span>
      {expanded ? (
        <pre className="whitespace-pre-wrap break-words" style={{ margin: '2px 0 0' }}>
          {JSON.stringify(entity.props, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

const DefaultRenderer: TimelineRenderer = ({ entity }) => <DefaultEntityBody entity={entity} />;
const BUILTIN_RENDERERS: Record<string, TimelineRenderer> = { message: MessageRenderer };

export interface ChatTimelineProps {
  bottomRef?: RefObject<HTMLDivElement | null>;
  renderMode?: ChatRenderMode;
  renderers?: Partial<TimelineRenderers>;
}

function toChatMessagesRenderer(renderer: TimelineRenderer, renderMode: ChatRenderMode): TimelineEntityRenderer {
  return ({ entity }: TimelineEntityRendererContext) => renderer({ entity: entity as TimelineEntity, ctx: { renderMode } });
}

export function ChatTimeline({ bottomRef, renderMode = 'normal', renderers }: ChatTimelineProps) {
  const registryVersion = useTimelineRendererRegistryVersion();
  const resolved = useMemo(
    () => resolveTimelineRenderers(BUILTIN_RENDERERS, DefaultRenderer, renderers),
    // registryVersion invalidates the memo when extensions register/unregister
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [renderers, registryVersion],
  );

  const messageRenderers = useMemo(() => {
    const { default: _defaultRenderer, ...byKind } = resolved;
    return Object.fromEntries(
      Object.entries(byKind).map(([kind, renderer]) => [kind, toChatMessagesRenderer(renderer, renderMode)]),
    );
  }, [renderMode, resolved]);

  return (
    <ChatMessages
      bottomRef={bottomRef}
      renderMode={renderMode as ChatMessageRenderMode}
      renderers={messageRenderers}
      fallbackRenderer={toChatMessagesRenderer(resolved.default, renderMode)}
    />
  );
}
