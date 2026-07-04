/**
 * Recursive structured data tree for inspecting nested objects/arrays.
 * Used by TimelineDebugWindow to render entity props and full snapshots.
 */

import { useCallback, useState } from 'react';

const MAX_DEPTH = 20;

export interface StructuredDataTreeProps {
  data: unknown;
  label?: string;
  /** Start fully collapsed (default true) */
  defaultCollapsed?: boolean;
  /** Maximum nesting depth before truncation */
  maxDepth?: number;
}

export function StructuredDataTree({
  data,
  label,
  defaultCollapsed = true,
  maxDepth = MAX_DEPTH,
}: StructuredDataTreeProps) {
  return (
    <div data-part="structured-tree" style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}>
      <TreeNode value={data} path={label ?? 'root'} depth={0} maxDepth={maxDepth} defaultCollapsed={defaultCollapsed} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal tree node
// ---------------------------------------------------------------------------

interface TreeNodeProps {
  value: unknown;
  path: string;
  depth: number;
  maxDepth: number;
  defaultCollapsed: boolean;
}

function TreeNode({ value, path, depth, maxDepth, defaultCollapsed }: TreeNodeProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed && depth > 0);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  if (depth > maxDepth) {
    return <span style={scalarStyle}>[max depth]</span>;
  }

  // null / undefined
  if (value === null) return <ScalarLine label={path} value="null" color="#cf222e" />;
  if (value === undefined) return <ScalarLine label={path} value="undefined" color="#cf222e" />;

  // primitives
  if (typeof value === 'string') {
    return <StringLine label={path} rawValue={value} />;
  }
  if (typeof value === 'number') return <ScalarLine label={path} value={String(value)} color="#0969da" />;
  if (typeof value === 'boolean') return <ScalarLine label={path} value={String(value)} color="#cf222e" />;

  // non-object fallback
  if (typeof value !== 'object') {
    return <ScalarLine label={path} value={String(value)} color="#7c3aed" />;
  }

  // array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <ScalarLine label={path} value="[]" color="#6b7280" />;
    }
    return (
      <CollapsibleNode
        label={path}
        summary={`Array(${value.length})`}
        collapsed={collapsed}
        onToggle={toggle}
        depth={depth}
      >
        {value.map((item, i) => (
          <TreeNode
            key={i}
            value={item}
            path={`[${i}]`}
            depth={depth + 1}
            maxDepth={maxDepth}
            defaultCollapsed={defaultCollapsed}
          />
        ))}
      </CollapsibleNode>
    );
  }

  // object
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return <ScalarLine label={path} value="{}" color="#6b7280" />;
  }
  return (
    <CollapsibleNode
      label={path}
      summary={`{${entries.length} keys}`}
      collapsed={collapsed}
      onToggle={toggle}
      depth={depth}
    >
      {entries.map(([key, val]) => (
        <TreeNode
          key={key}
          value={val}
          path={key}
          depth={depth + 1}
          maxDepth={maxDepth}
          defaultCollapsed={defaultCollapsed}
        />
      ))}
    </CollapsibleNode>
  );
}

// ---------------------------------------------------------------------------
// Leaf scalar line
// ---------------------------------------------------------------------------

function ScalarLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ paddingLeft: 4 }}>
      <span style={keyStyle}>{label}: </span>
      <span style={{ ...scalarStyle, color }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expandable long string line
// ---------------------------------------------------------------------------

const STRING_TRUNCATE_THRESHOLD = 200;

function StringLine({ label, rawValue }: { label: string; rawValue: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = rawValue.length > STRING_TRUNCATE_THRESHOLD;
  const display = isLong && !expanded ? `"${rawValue.slice(0, STRING_TRUNCATE_THRESHOLD)}…"` : `"${rawValue}"`;

  return (
    <div style={{ paddingLeft: 4 }}>
      <span style={keyStyle}>{label}: </span>
      <span style={{ ...scalarStyle, color: '#0550ae' }}>{display}</span>
      {isLong && (
        <button type="button" onClick={() => setExpanded((e) => !e)} style={expandBtnStyle}>
          {expanded ? '▲ less' : `▼ ${rawValue.length} chars`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible branch
// ---------------------------------------------------------------------------

function CollapsibleNode({
  label,
  summary,
  collapsed,
  onToggle,
  depth,
  children,
}: {
  label: string;
  summary: string;
  collapsed: boolean;
  onToggle: () => void;
  depth: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      <div
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          padding: '1px 4px',
          borderRadius: 2,
          userSelect: 'none',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#0000000a';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <span style={{ color: '#999', fontSize: 10, marginRight: 4 }}>{collapsed ? '▶' : '▼'}</span>
        <span style={keyStyle}>{label}</span>
        {collapsed && <span style={{ color: '#888', marginLeft: 6, fontSize: 10 }}>{summary}</span>}
      </div>
      {!collapsed && <div style={{ paddingLeft: 8, borderLeft: '1px solid #ddd' }}>{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared inline styles
// ---------------------------------------------------------------------------

const keyStyle: React.CSSProperties = {
  color: '#7c3aed',
  fontWeight: 600,
};

const scalarStyle: React.CSSProperties = {
  wordBreak: 'break-all',
};

const expandBtnStyle: React.CSSProperties = {
  marginLeft: 6,
  padding: '0 4px',
  fontSize: 9,
  border: 'none',
  background: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  verticalAlign: 'baseline',
};
