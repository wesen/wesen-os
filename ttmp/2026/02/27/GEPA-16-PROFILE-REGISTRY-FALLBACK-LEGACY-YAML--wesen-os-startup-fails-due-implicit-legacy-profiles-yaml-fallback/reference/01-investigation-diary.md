---
Title: Investigation diary
Ticket: GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML
Status: active
Topics:
    - bug
    - geppetto
    - pinocchio
    - profile-registry
    - config
    - wesen-os
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../geppetto/pkg/sections/profile_registry_source_test.go
      Note: Confirms expected fallback behavior to XDG profiles.yaml
    - Path: ../../../../../../../go-go-os/apps/apps-browser/src/components/AppIcon.tsx
      Note: App icon context handler behavior under right-click
    - Path: ../../../../../../../go-go-os/apps/apps-browser/src/components/BrowserColumns.tsx
      Note: Module row context menu handler behavior
    - Path: ../../../../../../../go-go-os/packages/engine/src/components/shell/windowing/WindowSurface.tsx
      Note: Window-level context menu bubbling path
    - Path: ../../../../../../../pinocchio/README.md
      Note: Documents fallback and migration commands used in root-cause narrative
ExternalSources: []
Summary: Chronological evidence log for reproducing and tracing legacy profile fallback startup failures.
LastUpdated: 2026-02-28T09:10:00-05:00
WhatFor: Record exact commands, outcomes, and findings used to build the GEPA-16 bug report.
WhenToUse: Use when reproducing or continuing investigation of profile-registry bootstrap/fallback failures.
---



# Investigation diary

## Goal

Document the reproducible startup failure in `wesen-os`, identify the code path responsible, and produce a source-level remediation proposal in `geppetto`/`pinocchio`.

## Context

User report:

```text
go run ./cmd/wesen-os-launcher wesen-os-launcher --addr :8091
validation error (registry): runtime YAML must be a single registry document (legacy profile-map format is not supported)
```

Hypothesis at start: some implicit profile-registry source is being loaded in legacy format.

## Chronological Log

### Step 1: Confirm launcher command surface

Command:

```bash
cd wesen-os
./build/wesen-os-launcher wesen-os-launcher --help | sed -n '1,220p'
```

Findings:

1. launcher exposes `--profile-registries` and `--profile`.
2. no launcher-specific default registry file argument is visible.

### Step 2: Reproduce failure in normal user environment

Command:

```bash
cd wesen-os
timeout 4s ./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:18097 > /tmp/wesen-home.log 2>&1
sed -n '1,80p' /tmp/wesen-home.log
```

Result:

1. startup fails with exact legacy profile-map validation error.
2. confirms user report is reproducible.

### Step 3: Control run with isolated HOME/XDG

Command:

```bash
cd wesen-os
TMPHOME=$(mktemp -d)
HOME=$TMPHOME XDG_CONFIG_HOME=$TMPHOME timeout 6s ./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:18092
```

Result:

1. failure changes to:
   - `validation error (profile-settings.profile-registries): must be configured (hard cutover: no profile-file fallback)`
2. this proves normal-environment failure is caused by discovered config files, not binary corruption.

### Step 4: Verify explicit runtime registry source works

Command:

```bash
cd wesen-os
cat >/tmp/wesen-profiles.runtime.yaml <<'YAML'
slug: local
profiles:
  default:
    slug: default
    runtime:
      step_settings_patch:
        ai-chat:
          ai-engine: gpt-4.1-mini
YAML

HOME=$(mktemp -d) XDG_CONFIG_HOME=$HOME ./build/wesen-os-launcher wesen-os-launcher \
  --addr 127.0.0.1:18093 \
  --profile default \
  --profile-registries /tmp/wesen-profiles.runtime.yaml \
  --inventory-db /tmp/wesen-inv.db \
  --timeline-dsn 'file:/tmp/wesen-timeline.db?_foreign_keys=on' \
  --turns-dsn 'file:/tmp/wesen-turns.db?_foreign_keys=on'
```

Result:

1. launcher starts and `/api/os/apps` returns healthy app manifest.
2. confirms runtime system is fine when profile source is explicit and valid.

### Step 5: Inspect local default profile file

Command:

```bash
ls -la /home/manuel/.config/pinocchio
sed -n '1,140p' /home/manuel/.config/pinocchio/profiles.yaml
```

Finding:

1. file exists and is in legacy profile-map shape (top-level profile keys).
2. file contains sensitive secrets; investigation only used structural shape, not credential values.

### Step 6: Trace source path in geppetto middleware bootstrap

Commands:

```bash
nl -ba geppetto/pkg/sections/sections.go | sed -n '120,340p'
nl -ba geppetto/pkg/profiles/codec_yaml_runtime.go | sed -n '1,120p'
nl -ba geppetto/pkg/profiles/source_chain.go | sed -n '423,510p'
```

Findings:

1. `defaultPinocchioProfileRegistriesIfPresent()` computes `${UserConfigDir}/pinocchio/profiles.yaml`.
2. if `profile-registries` is empty, code injects that fallback path.
3. runtime decode rejects legacy map shape by design.
4. source load path does not wrap decode error with filename context.

### Step 7: Confirm `wesen-os` inherits this middleware

Command:

```bash
nl -ba wesen-os/cmd/wesen-os-launcher/main.go | sed -n '432,446p'
```

Finding:

1. launcher builds command with `geppettosections.GetCobraCommandGeppettoMiddlewares`.
2. therefore it inherits pinocchio-specific fallback behavior.

### Step 8: Compare with smoke script behavior

Command:

```bash
nl -ba wesen-os/scripts/smoke-wesen-os-launcher.sh | sed -n '34,92p'
```

Finding:

1. smoke script writes a runtime YAML file and passes `--profile-registries` explicitly.
2. this avoids implicit fallback and prevents the startup crash.

### Step 9: Confirm documented fallback behavior

Commands:

```bash
nl -ba pinocchio/README.md | sed -n '78,132p'
nl -ba geppetto/pkg/doc/topics/01-profiles.md | sed -n '155,261p'
nl -ba geppetto/pkg/sections/profile_registry_source_test.go | sed -n '260,319p'
```

Findings:

1. docs explicitly describe default fallback to `~/.config/pinocchio/profiles.yaml`.
2. tests assert this fallback behavior.
3. behavior is intentional, but causes cross-app coupling for non-pinocchio hosts.

## Quick Reference

### Reproduction matrix

1. Normal user env:
   - command: `./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:18097`
   - result: legacy runtime YAML validation error.
2. Clean HOME/XDG:
   - same command with temporary HOME/XDG.
   - result: missing `profile-registries` validation error.
3. Explicit runtime registry:
   - pass `--profile-registries /tmp/wesen-profiles.runtime.yaml`.
   - result: successful startup.

### Immediate operator workaround

```bash
cd wesen-os
cat >/tmp/wesen-profiles.runtime.yaml <<'YAML'
slug: local
profiles:
  default:
    slug: default
    runtime:
      step_settings_patch:
        ai-chat:
          ai-engine: gpt-4.1-mini
YAML

./build/wesen-os-launcher wesen-os-launcher \
  --addr 127.0.0.1:8091 \
  --profile default \
  --profile-registries /tmp/wesen-profiles.runtime.yaml
```

### Migration command for legacy file

```bash
pinocchio profiles migrate-legacy \
  --input ~/.config/pinocchio/profiles.yaml \
  --output ~/.config/pinocchio/profiles.runtime.yaml
```

## Usage Examples

### Example: validate that startup is not reading implicit fallback

```bash
cd wesen-os
TMPHOME=$(mktemp -d)
HOME=$TMPHOME XDG_CONFIG_HOME=$TMPHOME \
  ./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091
```

Expected: deterministic missing-profile-registries failure unless explicit source is provided.

### Example: validate successful startup with explicit registry

```bash
cd wesen-os
./build/wesen-os-launcher wesen-os-launcher \
  --addr 127.0.0.1:8091 \
  --profile default \
  --profile-registries /tmp/wesen-profiles.runtime.yaml
curl -s http://127.0.0.1:8091/api/os/apps | jq
```

Expected: apps list includes healthy modules.

## Related

1. `../design-doc/01-bug-report-and-implementation-research-legacy-profiles-fallback-startup-failure.md`
2. `../../../../../../wesen-os/scripts/smoke-wesen-os-launcher.sh`
3. `../../../../../../geppetto/pkg/sections/sections.go`
4. `../../../../../../geppetto/pkg/profiles/codec_yaml_runtime.go`

## Playwright Debug Session: Icon and Context-Menu Behavior (2026-02-28)

### Goal

Investigate user-reported “iffy icons” behavior in launcher desktop while running `pnpm dev`, with focus on App Browser icon interactions and “Get Info” context menu access.

### Runtime setup

1. Used user-provided running frontend at `http://127.0.0.1:5173`.
2. Navigated with Playwright MCP tooling.
3. Collected snapshots + console diagnostics.

### Evidence runbook and findings

#### 1) Initial desktop snapshot

Command (Playwright navigate + snapshot):

```text
browser_navigate http://127.0.0.1:5173
browser_snapshot
```

Findings:

1. Desktop shows both `Apps Browser` and `Applications` icons.
2. `Launcher Home` dialog was on top initially and intercepted pointer events.
3. Console had no blocking runtime errors (only missing favicon and selector warnings).

#### 2) Click-path confusion: `Applications` icon does not open Apps Browser

Action:

1. Closed `Launcher Home`.
2. Double-clicked `Applications` icon.

Result:

1. Opened `Inventory Folder` window, not app/module browser.
2. Confirms that “Applications” and “Apps Browser” are distinct icons and can be easily confused visually.

#### 3) Correct entry point for app info tooling

Action:

1. Double-clicked `Apps Browser` icon.

Result:

1. Opened `Mounted Apps` window.
2. Window showed app icon buttons (for example `Inventory`, `GEPA`) with health/reflection badges.

#### 4) Core bug reproduction: right-click on app icon shows window menu instead of app menu

Action:

1. Right-clicked `GEPA` icon inside `Mounted Apps`.

Expected:

1. `Open in Browser`
2. `Get Info`
3. `Open Health Dashboard`
4. `Launch App`

Actual:

1. `Close Window`
2. `Tile Windows`
3. `Cascade Windows`

Conclusion:

App/widget-specific context actions were not taking effect; window-surface context menu won.

### Source-level trace of likely root cause

#### A) Window surface always opens `window-context` on bubbled contextmenu events

File: `go-go-os/packages/engine/src/components/shell/windowing/WindowSurface.tsx`

Observed behavior:

1. `<section data-part=windowing-window ... onContextMenu={...}>` calls:
   - `event.preventDefault()`
   - `onWindowContextMenu(window.id, event, 'surface')`
2. This handler is attached at window surface level and receives bubbled right-clicks from children.

#### B) App Browser components prevent default but do not stop propagation

Files:

1. `go-go-os/apps/apps-browser/src/components/AppIcon.tsx`
2. `go-go-os/apps/apps-browser/src/components/BrowserColumns.tsx`

Observed behavior:

1. Child handlers call `event.preventDefault()` before invoking local context-menu callbacks.
2. They do **not** call `event.stopPropagation()`.

Effect:

1. Child context flow runs, but event bubbles to `WindowSurface`.
2. `WindowSurface` opens `window-context`, replacing/overriding intended widget menu.

### Inference quality and confidence

Confidence: high.

Reason:

1. Repro is deterministic in Playwright.
2. Event flow in source aligns exactly with observed menu override.
3. The mismatch is specific to right-click in app-window body, not desktop icon layer.

### Suggested fix direction (not implemented in this diary step)

1. In app-level context handlers (`AppIcon`, `ModuleListPane`), add `event.stopPropagation()` alongside `preventDefault()`.
2. Optionally harden `WindowSurface` context handler to no-op when `event.defaultPrevented` is already true.

### Adjacent UX finding

Two visually similar desktop icons (`Applications` and `Apps Browser`) lead to navigation confusion:

1. `Applications` opens inventory folder.
2. `Apps Browser` opens module/app inspection tools.

Potential UX follow-up: make iconography and labels more distinct.

## Implementation Session: Context-Menu Fix (2026-02-28)

### Goal

Apply and verify the fix so right-click on app/module entries in Apps Browser opens app-specific actions instead of the generic window menu.

### Code changes applied

#### 1) Stop bubbling in app icon context handler

File:

`go-go-os/apps/apps-browser/src/components/AppIcon.tsx`

Change:

```ts
onContextMenu={(event) => {
  event.preventDefault();
  event.stopPropagation();
  onContextMenu?.(event);
}}
```

#### 2) Stop bubbling in module list row context handler

File:

`go-go-os/apps/apps-browser/src/components/BrowserColumns.tsx`

Change:

```ts
onContextMenu={(event) => {
  event.preventDefault();
  event.stopPropagation();
  onContextMenuApp?.(app.app_id, event);
}}
```

#### 3) Defensive guard in window surface handler

File:

`go-go-os/packages/engine/src/components/shell/windowing/WindowSurface.tsx`

Change:

```ts
onContextMenu={(event) => {
  if (event.defaultPrevented) return;
  event.preventDefault();
  onFocusWindow?.(window.id);
  onWindowContextMenu?.(window.id, event, 'surface');
}}
```

Rationale:

1. Child widgets can explicitly “own” context menu handling.
2. Window surface no longer force-opens `window-context` when a descendant already handled right-click intent.

### Validation executed

#### A) Test run (engine package)

Command:

```bash
cd go-go-os/packages/engine
npx vitest run
```

Result:

1. Passed: 46 test files, 320 tests.

Note:

`npm run test -w packages/engine` still fails on pre-existing Storybook taxonomy checks unrelated to this fix; direct vitest run passed for runtime behavior.

#### B) Playwright regression check on running `pnpm dev`

Flow:

1. Opened `http://127.0.0.1:5173`.
2. Closed `Launcher Home`.
3. Opened `Apps Browser` icon.
4. Right-clicked `GEPA` icon in `Mounted Apps`.
5. Opened `Module Browser`.
6. Right-clicked `GEPA` row in module list.

Observed result after fix:

1. Menu now shows:
   - `Open in Browser`
   - `Get Info`
   - `Open Health Dashboard`
   - `Launch App`
2. Generic window menu (`Close Window`, `Tile Windows`, `Cascade Windows`) no longer hijacks those targets.

### Answer to “other locations”

Sweep result across active code paths:

1. Chat message and conversation context handlers already call `stopPropagation()`.
2. Inventory folder icon handler already calls `stopPropagation()`.
3. Apps Browser icon/row handlers were the missing spots.
4. Added window-surface defensive guard to reduce similar regressions for future widgets.
