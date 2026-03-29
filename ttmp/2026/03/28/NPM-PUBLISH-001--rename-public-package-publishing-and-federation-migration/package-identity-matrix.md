# Package Identity Matrix

## Decisions

- The first-class public platform contracts for v1 are the nine `@go-go-golems/os-*` packages:
  - `@go-go-golems/os-core`
  - `@go-go-golems/os-shell`
  - `@go-go-golems/os-scripting`
  - `@go-go-golems/os-ui-cards`
  - `@go-go-golems/os-chat`
  - `@go-go-golems/os-repl`
  - `@go-go-golems/os-widgets`
  - `@go-go-golems/os-kanban`
  - `@go-go-golems/os-confirm`
- App packages publish later, after the platform publish path is proven:
  - `@go-go-golems/inventory`
  - `@go-go-golems/apps-browser`
  - `@go-go-golems/todo`
  - `@go-go-golems/crm`
  - `@go-go-golems/book-tracker-debug`
  - `@go-go-golems/hypercard-tools`
- Internal implementation details are everything below the package public entrypoints:
  - story/test-only files
  - fixture `.vm.js` files that are not runtime-shipped entrypoints
  - source-path aliases used only for local linked development
  - private helper modules that are reachable only through `src/**`, not `exports`
- npm package registry delivery and federation/browser asset delivery stay separate concerns. GitHub Packages is for versioned npm artifacts; remote manifests/chunks should be hosted separately.

## v1 Platform Publish Set

| Package | Repo | Source Path | Kind | Public Entrypoints | Runtime Assets That Must Ship | Current Publish Blockers |
|---|---|---|---|---|---|---|
| `@go-go-golems/os-core` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/packages/engine` | core package | `.`, `./desktop-core`, `./desktop-react`, `./desktop-theme-macos1`, `./theme`, `./theme/classic.css`, `./theme/modern.css` | desktop theme CSS files under `src/theme/**` | `private: true`; `main/types/exports` point to `src/*`; no package metadata; no `files` allowlist; dist build must copy CSS; any `workspace:*` references in downstream publish graph still need release-time rewriting |
| `@go-go-golems/os-shell` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/packages/desktop-os` | core package | `.` | none identified beyond built JS/types | `private: true`; `main/types/exports` point to `src/*`; depends on `@go-go-golems/os-core` and `@go-go-golems/os-scripting` via `workspace:*`; no package metadata/files policy |
| `@go-go-golems/os-scripting` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/packages/hypercard-runtime` | runtime package | `.` | `src/plugin-runtime/stack-bootstrap.vm.js`; runtime-pack `.vm.js` prelude files used by `?raw` imports | `private: true`; `main/types/exports` point to `src/*`; depends on `os-core`, `os-chat`, `os-repl` via `workspace:*`; dist build must copy runtime `.vm.js` files; no package metadata/files policy |
| `@go-go-golems/os-ui-cards` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/packages/ui-runtime` | runtime package | `.` | `src/runtime-packages/ui.package.vm.js` | `private: true`; `main/types/exports` point to `src/*`; depends on `os-core` and `os-scripting` via `workspace:*`; dist build must copy `.vm.js`; no package metadata/files policy |
| `@go-go-golems/os-chat` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/packages/chat-runtime` | core package | `.`, `./theme` | `src/chat/theme/chat.css` | `private: true`; `main/types/exports` point to `src/*`; depends on `os-core` via `workspace:*`; dist build must copy CSS; no package metadata/files policy |
| `@go-go-golems/os-repl` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/packages/repl` | core package | `.`, `./theme` | `src/theme.css` | `private: true`; `main/types/exports` point to `src/*`; dist build must copy CSS; no package metadata/files policy |
| `@go-go-golems/os-widgets` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/packages/rich-widgets` | runtime package | `.`, `./theme`, `./launcher` | CSS bundle under `src/theme/*.css` | `private: true`; `main/types/exports` point to `src/*`; depends on `os-repl` via `workspace:*`; dist build must copy CSS; no package metadata/files policy |
| `@go-go-golems/os-kanban` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/packages/kanban-runtime` | runtime package | `.`, `./theme` | `src/theme/kanban.css`; `src/runtime-packages/kanban.package.vm.js` | `private: true`; `main/types/exports` point to `src/*`; depends on `os-core`, `os-scripting`, `os-widgets`, `os-ui-cards` via `workspace:*`; dist build must copy CSS and `.vm.js`; no package metadata/files policy |
| `@go-go-golems/os-confirm` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/packages/confirm-runtime` | runtime package | `.` | none identified beyond built JS/types | `private: true`; `main/types/exports` point to `src/*`; depends on `os-core` via `workspace:*`; no package metadata/files policy |

## Later App Publish Candidates

| Package | Repo | Source Path | Kind | Public Entrypoints | Ship In First Wave? | Reason |
|---|---|---|---|---|---|---|
| `@go-go-golems/inventory` | `go-go-app-inventory` | `workspace-links/go-go-app-inventory/apps/inventory` | app package | `.`, `./launcher`, `./reducers` | no | Best external-consumer test case, but depends on the platform packages and generated VM metadata; publish after platform packages are stable |
| `@go-go-golems/apps-browser` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/apps/apps-browser` | app package | `.`, `./launcher` | no | Launcher-hosted app, not needed to prove the platform publish path |
| `@go-go-golems/todo` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/apps/todo` | app package | `.`, `./launcher`, `./reducers` | no | Good demo app, but lower value than stabilizing the platform contracts first |
| `@go-go-golems/crm` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/apps/crm` | app package | `.`, `./launcher`, `./reducers` | no | Same reason as `todo`; depends on platform packaging being finished first |
| `@go-go-golems/book-tracker-debug` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/apps/book-tracker-debug` | app package | `.`, `./launcher`, `./reducers` | no | Debug/demo app; should not drive the first public contract cut |
| `@go-go-golems/hypercard-tools` | `go-go-os-frontend` | `workspace-links/go-go-os-frontend/apps/hypercard-tools` | app package | `.`, `./launcher` | no | Tooling app; useful later, but not part of the minimal platform publish wave |

## Common Publishability Gaps

- All current publish candidates are still `private`.
- All current publish candidates still export `src/*` instead of `dist/*`.
- Internal package dependencies still use `workspace:*`.
- Publish metadata is incomplete or missing:
  - `repository`
  - `license`
  - `homepage`
  - `bugs`
  - ownership/maintainer policy
- No package currently declares a strict `files` allowlist for npm packaging.
- A shared `build:dist` helper now exists in `go-go-os-frontend`, but the publish set still is not package-locally green end-to-end because some package builds continue to resolve sibling source trees instead of a publish-style boundary.

## Immediate Follow-Up

- Add missing publish metadata to the nine v1 platform packages.
- Decide the release/version rewrite mechanism for `workspace:*` internal package dependencies.
- Extend the new shared dist-build helper so the full v1 publish set builds cleanly package-by-package.
- Only after that, switch package `exports`, `main`, and `types` to `dist/*`.
