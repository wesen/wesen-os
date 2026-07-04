/**
 * Lightweight JSON-to-YAML display formatter.
 * Dependency-free — intended for read-only rendering, not round-trip serialization.
 */

export function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);

  if (value === null || value === undefined) {
    return `${pad}null`;
  }

  if (typeof value === 'boolean') {
    return `${pad}${value}`;
  }

  if (typeof value === 'number') {
    return `${pad}${value}`;
  }

  if (typeof value === 'string') {
    // Multi-line strings use block scalar
    if (value.includes('\n')) {
      const lines = value.split('\n');
      return `${pad}|\n${lines.map((line) => `${pad}  ${line}`).join('\n')}`;
    }
    // Strings that could be misinterpreted get quoted
    if (needsQuoting(value)) {
      return `${pad}${JSON.stringify(value)}`;
    }
    return `${pad}${value}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${pad}[]`;
    }
    return value
      .map((item) => {
        if (isScalar(item)) {
          return `${pad}- ${toYaml(item, 0).trim()}`;
        }
        // Complex items get indented under the dash
        const inner = toYaml(item, indent + 2).trimStart();
        return `${pad}- ${inner}`;
      })
      .join('\n');
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return `${pad}{}`;
    }
    return entries
      .map(([key, val]) => {
        if (isScalar(val)) {
          return `${pad}${key}: ${toYaml(val, 0).trim()}`;
        }
        return `${pad}${key}:\n${toYaml(val, indent + 1)}`;
      })
      .join('\n');
  }

  return `${pad}${String(value)}`;
}

function isScalar(value: unknown): boolean {
  return value === null || value === undefined || typeof value !== 'object';
}

function needsQuoting(value: string): boolean {
  if (value.length === 0) return true;
  // Values that look like booleans, numbers, null, or contain special YAML chars
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === 'false' || lower === 'null' || lower === 'yes' || lower === 'no') {
    return true;
  }
  if (/^[\d.+-]/.test(value) && !Number.isNaN(Number(value))) {
    return true;
  }
  if (/[:{}\[\],&*?|>!%@`'"]/.test(value)) {
    return true;
  }
  return false;
}
