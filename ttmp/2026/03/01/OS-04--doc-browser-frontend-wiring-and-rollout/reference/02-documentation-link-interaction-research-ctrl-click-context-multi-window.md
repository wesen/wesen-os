---
Title: Documentation Link Interaction Research (Ctrl-Click, Context, Multi-Window)
Ticket: OS-04
Status: active
Topics:
    - documentation
    - frontend
    - apps-browser
    - wesen-os
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/BrowserDetailPanel.tsx
      Note: Bottom documentation section in Module Browser currently renders raw anchors
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Docs window payload builder and command handler where multi-window behavior is controlled
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/packages/engine/src/components/shell/windowing/desktopMenuRuntime.tsx
      Note: Desktop context menu hooks used for right-click actions on custom widgets
    - Path: workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/packages/engine/src/components/shell/windowing/useDesktopShellController.tsx
      Note: Context menu dispatch and payload routing semantics
ExternalSources: []
Summary: Research and implementation guidance for advanced docs interactions: open docs from module detail section, parallel docs windows, right-click open-in-new-window actions, and Ctrl/Cmd-click behavior.
LastUpdated: 2026-03-01T15:56:36.335205117-05:00
WhatFor: Use this as the implementation reference for Phase 6 interaction upgrades in OS-04.
WhenToUse: Read before implementing multi-window docs behavior, link context menus, or modifier-key doc opening.
---

## Goal

Define how documentation links should behave for power users:

- open docs directly from module-detail documentation section (bottom pane),
- open multiple docs windows in parallel,
- support right-click "Open in New Window",
- support Ctrl/Cmd-click style new-window opening semantics.

## Current State (Code Reality)

### 1) Module Browser bottom documentation section

File: `apps/apps-browser/src/components/BrowserDetailPanel.tsx`

- `ModuleDetail` renders `doc.docs` entries from reflection metadata.
- Entries currently use plain `<a href={entry.url}>` when URL exists.
- Behavior leaves launcher control flow and opens raw endpoint in browser context.
- No app-level command is routed for this interaction.

### 2) Docs windows dedupe behavior

File: `apps/apps-browser/src/launcher/module.tsx`

- `buildDocBrowserWindowPayload` sets `dedupeKey: 'apps-browser:docs'`.
- `openWindow` in engine focuses existing dedupe match instead of opening another window.
- Window `id` is deterministic by route suffix; without dedupe, repeated open would still collide on `id` unless a unique id strategy is added.

### 3) Right-click/context menu support in docs components

- Doc browser screens currently use direct `onClick` buttons for doc navigation.
- No `onContextMenu` handlers are registered for doc links/cards.
- Engine already supports widget-level context actions via:
  - `useRegisterContextActions`
  - `useOpenDesktopContextMenu`

## Requested Capability Mapping

### A) Open module docs from bottom documentation section

Target UX:
- From Module Browser detail panel, clicking a documentation item should open the in-app docs window/reader, not raw JSON URL.

Implementation notes:
- Add callback from launcher adapter into `ModuleBrowserWindow` and into `BrowserDetailPanel`:
  - `onOpenDoc(moduleId, slug, opts?)`
- Parse `entry.url` when it matches `/api/apps/{module}/docs/{slug}`:
  - route to docs reader command payload.
- If `entry.url` does not match module docs route:
  - fallback to current external link behavior or explicit "Open External Doc".

### B) Multiple docs windows in parallel

Target UX:
- Open several docs windows simultaneously (different modules and/or same module different pages).

Implementation constraints:
- Need both:
  - no dedupe conflict for new-window actions,
  - unique window `id` for each additional window.

Recommended model:
- Keep existing default (single shared docs window) for normal click.
- Add explicit `newWindow` path:
  - command payload flag `newWindow: true`,
  - unique window id suffix (e.g. include monotonically increasing counter or random token),
  - no dedupe key (or unique dedupe key per new window).

Why this model:
- Preserves current "navigate in current docs window" behavior.
- Adds parallel-window capability only when intentional.

### C) Right-click "open in new window" on docs links

Target UX:
- Right-click any in-app docs link/card and choose:
  - Open in Current Documentation Window
  - Open in New Documentation Window

Implementation notes:
- For each clickable doc row/card:
  - assign stable widget target id (e.g. `apps-browser-doc-link.<module>.<slug>.<surface>`),
  - register context actions with payload `{ moduleId, slug, newWindow: boolean }`,
  - invoke `openContextMenu` on `onContextMenu` with cursor position.

## Ctrl/Cmd-Click Research

### Observed web/React behavior to design around

- `metaKey` (Cmd on macOS) can be detected in click events and is suitable for "open in new window" shortcut behavior.
- `ctrlKey` can be detected on click on Windows/Linux.
- On macOS, Ctrl+Click often triggers the context menu gesture (right-click equivalent), so relying only on `onClick + ctrlKey` is not enough.
- Middle click is available through `onAuxClick` with `event.button === 1` in most desktop browsers.

### Recommended shortcut policy

- Primary click: open in current docs window.
- `Cmd+Click` (macOS) or `Ctrl+Click` (Windows/Linux): open in new docs window.
- Middle click: open in new docs window.
- Right click or Ctrl+Click that becomes context menu: show context menu with explicit actions.

This keeps behavior discoverable and consistent with desktop/browser conventions.

## Proposed Technical Design

### 1) Extend docs commands payload

In `apps-browser` command handler:
- support payload:
  - `moduleId`/`appId`
  - `slug`
  - `newWindow?: boolean`

### 2) Add explicit payload builder path for new-window intent

In `buildDocBrowserWindowPayload(opts)`:
- if `opts.newWindow`:
  - create unique `id` (do not reuse route-only id),
  - do not use shared dedupe key.
- else:
  - keep current deduped behavior.

### 3) Reuse one doc-link interaction helper

Create helper (new file suggested):
- `components/doc-browser/docLinkInteraction.ts`

Responsibilities:
- derive open intent from mouse event:
  - current window vs new window vs context menu.
- normalize module/slug payload for command dispatch.

### 4) Wire all doc surfaces to same helper

Surfaces:
- `BrowserDetailPanel` doc section (bottom pane),
- `DocCenterHome` doc links,
- `DocSearchScreen` result cards,
- `ModuleDocsScreen` cards,
- `TopicBrowserScreen` rows,
- `DocReaderScreen` see-also + prev/next (new-window only where user explicitly requests via modifier/context).

## Testing Additions

### Unit/behavior tests

- command routing with `newWindow` payload:
  - same route + newWindow opens additional window instance.
- window payload generation:
  - default path dedupes,
  - newWindow path generates unique id and bypasses dedupe.
- interaction helper:
  - plain click => current,
  - ctrl/cmd click => new,
  - middle click => new,
  - context menu path => menu.

### Runtime smoke

- open module docs from bottom module-detail docs section.
- open two docs from same module with `Cmd/Ctrl+Click` and verify two windows.
- right-click doc link -> "Open in New Documentation Window" works.

## Task Decomposition (for implementation phase)

1. Add command payload support for `newWindow` in launcher command handler.
2. Add unique-id/no-dedupe branch in docs window payload builder.
3. Add module-detail docs callback wiring (`ModuleBrowserWindow` -> `BrowserDetailPanel`).
4. Add link interaction helper and migrate at least two surfaces first:
   - bottom module-detail docs section,
   - docs center/module docs cards.
5. Add context-menu actions on doc links.
6. Add modifier-click behavior and tests.
7. Extend runtime smoke and update OS-04 diary/changelog.

## Risks

- Invalid nested interactive markup already exists in module docs cards; context-menu refactor should avoid adding more nested buttons.
- If unique id generation is not deterministic/testable, tests can be flaky.
- Platform differences for Ctrl+Click (especially macOS) require both click and context-menu path handling.

## Recommendation

Implement in two increments:

1. Bottom module-detail docs + `newWindow` payload plumbing + tests.
2. Context menu + modifier-click helper rollout across all docs surfaces.

This minimizes regressions and makes multi-window support available early.
