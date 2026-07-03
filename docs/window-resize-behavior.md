# Window Resize Behavior

This document describes the current resize behavior for the desktop shell windowing system in `workspace-links/go-go-os-frontend/packages/engine/src/components/shell/windowing`.

## Rules

1. Each window opens with authored bounds from the window payload.
2. Each window also has a base minimum size from the payload, or the default floor of `180x120`.
3. On first mount, the window body is measured once with `useContentMinSize`.
4. That one-shot content measurement can raise the window's minimum size.
5. If the current window bounds are smaller than that new minimum, the reducer clamps the window up once.
6. After mount, content changes do not keep updating window minimums.
7. After mount, user resize is the only normal way a top-level window changes size.

## Why

Continuous content-driven min-size updates caused resize feedback loops for layouts that use combinations such as:

- `height: 100%`
- flex children with `flex: 1`
- grid tracks like `1fr`
- scroll containers whose `scrollHeight` depends on the current box size

In those cases, a live content measurement can become dependent on the current window height. Feeding that result back into the window minimum height creates a ratcheting loop.

## Current Contract

- `useContentMinSize` is a one-shot mount measurement, not a live observer.
- `updateWindowMinSize` still enforces the minimum once it has been established.
- Resizing a window does not count as a content change.
- Dynamic content that appears later may require the user to resize the window manually.

## Tradeoff

The current system favors stable top-level window behavior over continuously "perfect" fit-to-content behavior.

If a future design needs stronger fit-to-content support, prefer one of these explicit models instead of live min-size feedback:

- a dedicated "Size to Fit" action
- window-specific sizing logic at open time
- app-authored default bounds that already reflect expected content
