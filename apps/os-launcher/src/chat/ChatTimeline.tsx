/*
 * ChatTimeline — registry-driven replacement for chat-overlay's ChatMessages.
 *
 * ChatMessages hardcodes `message | widget | tool_call` and silently DROPS
 * every other entity kind (verified, guide §7 Phase 3). This component routes
 * every timeline entity through the timelineRendererRegistry: built-ins
 * reproduce ChatMessages' output (same class names so the chrome CSS applies;
 * widget/tool_call reuse chat-provider's outlets), registered extensions
 * override by kind, and unknown kinds fall back to a collapsed raw renderer
 * instead of disappearing.
 */
import { useMemo, useState, type ReactNode, type RefObject } from 'react';
import { useChatSelector, selectTimelineEntities, WidgetOutlet, ToolCallOutlet } from '@go-go-golems/chat-provider';
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

// --- built-in renderers ------------------------------------------------------

// ThinkingBlock renders reasoning traces (message entities with role
// "thinking") as a collapsible block: collapsed while done, auto-open while
// still streaming, content rendered as markdown.
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

// MessageBody strips <hypercard:*> artifact blocks (widgets render them
// separately), shows a "building card" placeholder while a block streams in,
// and renders the remaining text as markdown.
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

const WidgetRenderer: TimelineRenderer = ({ entity }) => (
  <WidgetOutlet
    instanceId={String(entity.props.instanceId || entity.id)}
    widgetName={String(entity.props.widgetName || 'unknown')}
    status={String(entity.props.status || 'READY')}
    props={(entity.props.props as Record<string, unknown>) || {}}
  />
);

const ToolCallRenderer: TimelineRenderer = ({ entity }) => (
  <ToolCallOutlet
    toolCallId={String(entity.props.toolCallId || entity.id)}
    toolName={String(entity.props.toolName || 'unknown')}
    status={String(entity.props.status || 'requested')}
    input={entity.props.input}
    result={entity.props.result}
    error={entity.props.error as string | undefined}
  />
);

// Unknown kinds render as a collapsed raw line instead of being dropped.
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

const BUILTIN_RENDERERS: Record<string, TimelineRenderer> = {
  message: MessageRenderer,
  widget: WidgetRenderer,
  tool_call: ToolCallRenderer,
};

// --- component ---------------------------------------------------------------

export interface ChatTimelineProps {
  bottomRef?: RefObject<HTMLDivElement | null>;
  renderMode?: ChatRenderMode;
  /** Per-window renderer overrides (analog of the old timelineRenderers prop). */
  renderers?: Partial<TimelineRenderers>;
}

export function ChatTimeline({ bottomRef, renderMode = 'normal', renderers }: ChatTimelineProps) {
  const entities = useChatSelector(selectTimelineEntities) as TimelineEntity[];
  const registryVersion = useTimelineRendererRegistryVersion();

  const resolved = useMemo(
    () => resolveTimelineRenderers(BUILTIN_RENDERERS, DefaultRenderer, renderers),
    // registryVersion invalidates the memo when extensions register/unregister
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [renderers, registryVersion],
  );

  const ctx = useMemo(() => ({ renderMode }), [renderMode]);

  if (entities.length === 0) {
    return (
      <div className="text-mac-gray-3 text-xs italic">
        No messages yet. Type something below.
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entities.map((entity) => {
        const renderer = resolved[entity.kind] ?? resolved.default;
        let body: ReactNode;
        try {
          body = renderer({ entity, ctx });
        } catch {
          body = resolved.default({ entity, ctx });
        }
        return (
          <div key={entity.id} data-timeline-kind={entity.kind}>
            {renderMode === 'debug' ? (
              <div className="text-mac-gray-3 text-[10px]" title={entity.id}>
                {entity.kind} · {entity.id}
                {entity.version !== undefined ? ` · v${entity.version}` : ''}
              </div>
            ) : null}
            {body}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
