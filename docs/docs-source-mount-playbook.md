# Docs Source Mount Playbook

This playbook explains how to add a new documentation source to the mounted docs runtime in `wesen-os`.

The target audience is a developer who needs to make a new docs producer show up in:

- the apps-browser Doc Center
- the collection view
- the reader view
- search
- the Module Browser detail panel when owner matching applies

This is the post-APP-21 model. There is no Redux docs slice. The docs system now behaves like a small mounted-object runtime.

## Mental Model

Treat documentation as mounted readable objects under a canonical tree:

```text
/docs/objects/{kind}/{owner}/{slug}
```

Examples:

```text
/docs/objects/module/inventory/overview
/docs/objects/help/wesen-os/backend-documentation-system
/docs/objects/pack/kanban.v1/widgets.kanban.page
/docs/objects/card/os-launcher/kanbanIncidentCommand
```

The important rule is simple:

- every docs provider mounts a subtree
- every mounted subtree exposes the same object format
- the UI never consumes provider-specific DTOs directly

## Core Files

Start here:

- [docsObjects.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/domain/docsObjects.ts)
- [docsRegistry.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/domain/docsRegistry.ts)
- [docsCatalogStore.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/domain/docsCatalogStore.ts)
- [docsHooks.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/domain/docsHooks.ts)
- [docsMountAdapters.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/domain/docsMountAdapters.ts)
- [module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx)

Useful UI readers:

- [DocCenterHome.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocCenterHome.tsx)
- [ModuleDocsScreen.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/ModuleDocsScreen.tsx)
- [DocReaderScreen.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocReaderScreen.tsx)
- [DocSearchScreen.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocSearchScreen.tsx)
- [BrowserDetailPanel.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx)

## Runtime Architecture

There are three layers.

### 1. `DocsMount`

This is the behaviorful provider object.

```ts
interface DocsMount {
  mountPath(): DocsMountPath;
  list(subpath?: string[]): Promise<DocObjectSummary[]>;
  read(subpath: string[]): Promise<DocObject | null>;
  search?(query: DocsSearchQuery): Promise<DocObjectSummary[]>;
}
```

Rules:

- `mountPath()` is synchronous
- `mountPath()` must stay stable for the lifetime of the mounted object
- mounts stay outside Redux
- mounts may fetch over HTTP, read generated metadata, or adapt in-memory data

### 2. `DocsRegistry`

The registry stores the mounted provider objects.

Responsibilities:

- register and unregister mounts
- list mounted subtrees
- resolve a path to the best mount using longest-prefix matching
- fan out search across mounts
- notify subscribers when mounts change

The registry is the source of truth for mounted providers.

### 3. `DocsCatalogStore`

This is the serializable external cache the UI reads.

Responsibilities:

- keep loaded mount summaries
- cache loaded objects by canonical path
- cache search results by query
- expose a stable snapshot through `useSyncExternalStore`

The catalog store is still outside Redux. It is a cache/runtime helper for the docs UI.

## Canonical Object Contracts

The UI reads these shapes only:

```ts
interface DocObjectSummary {
  path: DocObjectPath;
  mountPath: DocsMountPath;
  kind: string;
  owner: string;
  slug: string;
  title: string;
  summary?: string;
  docType?: string;
  order?: number;
  topics?: string[];
  tags?: string[];
}

interface DocObject extends DocObjectSummary {
  content?: string;
  seeAlso?: string[];
}
```

If your source has richer metadata, project it into these fields before leaving the mount.

Do not teach the UI about your source-specific DTOs.

## Step-By-Step: Add A New Docs Source

Assume we want to mount a new source called `calendar`.

### Step 1: choose `kind`, `owner`, and `slug`

You need one stable identity scheme.

Questions:

- `kind`: what broad class is this source?
- `owner`: what stable namespace owns it?
- `slug`: how do users address one object inside that owner?

Example:

```text
kind  = module
owner = calendar
slug  = overview
```

or:

```text
kind  = card
owner = os-launcher
slug  = calendarSprintBoard
```

Do not overload `owner` casually. `BrowserDetailPanel` currently matches mounted docs by `owner === selectedApp.app_id`, so owner semantics affect discoverability in Module Browser.

### Step 2: project the source into `DocObject`

Write a mount adapter or helper that converts your native source shape.

Pattern:

```ts
function sourceDocToObject(owner: string, item: SourceDoc): DocObject {
  return {
    path: buildDocObjectPath('module', owner, item.slug),
    mountPath: buildDocsMountPath('module', owner),
    kind: 'module',
    owner,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    docType: item.docType,
    order: item.order,
    topics: item.topics ?? [],
    content: item.content,
    seeAlso: item.related ?? [],
  };
}
```

Common source patterns already implemented:

- backend module docs
- launcher help docs
- `vmmeta` pack docs
- `vmmeta` card docs

Use [docsMountAdapters.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/domain/docsMountAdapters.ts) as the template.

### Step 3: implement a `DocsMount`

Example:

```ts
export function createCalendarDocsMount(fetcher: FetchLike): DocsMount {
  const owner = 'calendar';
  const mountPath = buildDocsMountPath('module', owner);

  return {
    mountPath: () => mountPath,
    async list() {
      const response = await fetchJson<CalendarDocsResponse>(fetcher, '/api/apps/calendar/docs');
      return response.docs.map((doc) => sourceDocToObject(owner, doc));
    },
    async read(subpath) {
      const slug = subpath[0];
      if (!slug) {
        return null;
      }
      const doc = await fetchJson<CalendarDoc>(fetcher, `/api/apps/calendar/docs/${encodeURIComponent(slug)}`);
      return sourceDocToObject(owner, doc);
    },
  };
}
```

Guidelines:

- if the source already has a native search API, implement `search()`
- if not, `DocsRegistry.search()` can fall back to `list()` + local filtering
- `list()` should return summaries for the mounted subtree root
- `read()` should resolve one object from `subpath`

### Step 4: register the mount at the correct startup layer

There are two common cases.

#### Shared apps-browser mounts

Use this for default mounts like backend module docs and help docs.

Relevant file:

- [module.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx)

Current pattern:

```ts
useEffect(() => {
  void ensureDefaultDocsBootstrapped();
}, []);
```

Important:

- bootstrap async registration from an effect
- do not do fire-and-forget async registration in render
- keep retry/error behavior explicit

#### App-specific mounts

Use this for pack/card sources owned by a specific app or stack.

Example:

- [registerAppsBrowserDocs.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/registerAppsBrowserDocs.ts)

Pattern:

```ts
docsRegistry.register(createVmmetaPackDocsMount(OS_LAUNCHER_VM_PACK_METADATA));
docsRegistry.register(createVmmetaCardDocsMount('os-launcher', OS_LAUNCHER_VM_PACK_METADATA));
```

If your source lives in `wesen-os` app code, register it from that app’s startup/bootstrap module, not from `apps-browser`.

## How The UI Reads Mounted Docs

The UI should use hooks, not source-specific fetchers.

### Home / aggregated index

Use:

```ts
const index = useDocsIndex();
```

This drives the mounted collections on the Doc Center home screen.

### One collection

Use:

```ts
const collection = useDocsMount('/docs/objects/module/inventory');
```

This drives a collection/owner screen.

### One object

Use:

```ts
const doc = useDocObject('/docs/objects/module/inventory/overview');
```

This drives the reader.

### Search

Use:

```ts
const results = useDocsSearch({
  query: 'kanban',
  kinds: ['card'],
  owners: ['os-launcher'],
});
```

This drives the cross-provider search UI.

## Module Browser Impact

The Module Browser still browses backend apps, APIs, and schemas. It is not a generic docs browser.

Current behavior:

- [BrowserDetailPanel.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx) reads the mounted docs index
- it filters mounted docs where `summary.owner === selectedApp.app_id`
- it groups them by mount path and renders them under `Mounted Docs`

Implications:

- sources that should appear for a selected app need an `owner` that matches that app id
- pack docs currently use pack ids like `kanban.v1`, so they do not automatically appear when selecting `os-launcher`
- if you need app-to-pack linkage, add that mapping deliberately instead of smuggling it through fake owners

## Search Impact

Search is now cross-provider.

Your source should think about:

- `kind`
- `owner`
- `docType`
- `topics`
- `tags`
- `summary`

These fields are what the search UI can use for filtering and display.

If your docs source does not provide topics or tags, search will still work, but it will be less useful.

## Common Failure Modes

### 1. Wrong bootstrap response shape

This already happened once during APP-21.

`/api/os/apps` returns:

```ts
interface AppsManifestResponse {
  apps: AppManifestDocument[];
}
```

It does not return a bare array.

If you parse it as `AppManifestDocument[]`, no mounts will register and the UI will show errors like:

```text
No docs mount registered for /docs/objects/module/inventory
```

### 2. Unstable `mountPath()`

Do not compute a different mount path every render or every read.

Bad:

```ts
mountPath: () => `/docs/objects/module/${Date.now()}`
```

Good:

```ts
const mountPath = buildDocsMountPath('module', owner);
mountPath: () => mountPath
```

### 3. Provider-specific DTO leakage

Do not pass backend DTOs or `vmmeta` docs structures into UI components.

Always project to `DocObject` first.

### 4. Render-time async registration

Do not do:

```ts
if (!registered) {
  void registerMounts();
}
```

inside render.

Use a guarded effect or a startup bootstrap helper with explicit retry behavior.

## Testing Checklist

Minimum:

1. adapter test
2. registry/catalog-store test if behavior is custom
3. route/browser test if you added a new path shape
4. story if you changed visible UI behavior

Existing examples:

- [docsMountAdapters.test.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/domain/docsMountAdapters.test.ts)
- [docsRegistry.test.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/domain/docsRegistry.test.ts)
- [docsCatalogStore.test.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/domain/docsCatalogStore.test.ts)
- [BrowserDetailPanel.test.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.test.tsx)
- [BrowserDetailPanel.stories.tsx](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.stories.tsx)

Validation commands:

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/apps-browser
npm test -- --run \
  src/domain/docsMountAdapters.test.ts \
  src/domain/docsRegistry.test.ts \
  src/domain/docsCatalogStore.test.ts \
  src/components/BrowserDetailPanel.test.tsx \
  src/components/doc-browser/DocBrowserContext.test.ts \
  src/components/doc-browser/DocBrowserWindow.test.ts \
  src/launcher/module.test.tsx

cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os
node node_modules/typescript/bin/tsc --noEmit -p workspace-links/go-go-os-frontend/apps/apps-browser/tsconfig.json
npm run storybook:check -w workspace-links/go-go-os-frontend
```

## Review Checklist

Before merging a new docs source, verify:

- mount paths are canonical and stable
- `list()` and `read()` both work
- objects are projected into canonical `DocObject` shapes
- the source is registered from the correct startup layer
- the source appears in Doc Center home
- the source is searchable
- reader paths open correctly
- Module Browser behavior is sensible for the chosen `owner`

## Recommendation

Keep the docs system boring.

That means:

- mounted providers are plain objects with methods
- the registry owns provider identity and path resolution
- the catalog store owns cached serializable snapshots
- the UI uses hooks over canonical object paths
- new sources adapt themselves to the contract instead of forcing the UI to learn new shapes

If a new docs source cannot be expressed as a mounted `DocObject` provider, the problem is usually in the source contract, not in the docs browser.
