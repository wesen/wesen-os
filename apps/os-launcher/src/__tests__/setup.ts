import { afterAll, beforeAll, vi } from 'vitest';

const DEFAULT_PROFILE = {
  slug: 'default',
  profile: 'default',
  display_name: 'Default',
  is_default: true,
};

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    queueMicrotask(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    });
  }

  send(_data: string): void {}

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  addEventListener(): void {}

  removeEventListener(): void {}
}

function toUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') {
    return new URL(input, 'http://127.0.0.1/');
  }
  if (input instanceof URL) {
    return input;
  }
  return new URL(input.url, 'http://127.0.0.1/');
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = toUrl(input);
  const pathname = url.pathname;
  const method = (init?.method ?? 'GET').toUpperCase();

  if (pathname === '/api/os/apps') {
    return jsonResponse({ apps: [] });
  }
  if (pathname.startsWith('/api/os/apps/')) {
    return jsonResponse({});
  }
  if (pathname === '/api/chat/profiles') {
    return jsonResponse([DEFAULT_PROFILE]);
  }
  if (pathname === '/api/chat/profile') {
    return jsonResponse({ slug: DEFAULT_PROFILE.slug, profile: DEFAULT_PROFILE.profile });
  }
  if (pathname === '/api/timeline') {
    return jsonResponse({ version: '1', entities: [] });
  }
  if (pathname === '/chat' && method === 'POST') {
    return new Response('', { status: 200 });
  }
  return jsonResponse({});
});

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.scrollIntoView !== 'function') {
    HTMLElement.prototype.scrollIntoView = () => undefined;
  }
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterAll(() => {
  vi.unstubAllGlobals();
});
