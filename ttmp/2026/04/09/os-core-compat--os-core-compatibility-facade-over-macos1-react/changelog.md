# Changelog

## 2026-04-09

- Initial workspace created


## 2026-04-09

Implemented first-pass os-core compatibility facade over macos1-react: rewired DesktopShellView, os-core theme exports, root widget exports, shell presentational exports, build order, and declaration path handling

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-core/src/components/shell/windowing/DesktopShellView.tsx — DesktopShellView now consumes extracted presentational components
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-core/src/desktop/react/index.ts — desktop-react presentational shell exports rewired
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/packages/os-core/src/theme/index.ts — os-core theme now delegates to macos1-react


## 2026-04-09

Closed remaining Phase 6 CSS facade gap by aliasing @go-go-golems/macos1-react in the shared Vite config so os-core/theme pulls extracted theme CSS into consumer app bundles

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/apps/crm/dist/assets/index-CnGCwTfh.css — validated emitted CSS now contains macos1/hypercard tokens and primitives
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-os-frontend/tooling/vite/createHypercardViteConfig.ts — added macos1-react source alias for Vite workspace apps

