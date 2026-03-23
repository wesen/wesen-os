# Changelog

## 2026-03-22

- Initial workspace created
- Added APP-30 design-doc and diary documents.
- Added a detailed evidence-based migration guide covering Geppetto engine profiles, Pinocchio bootstrap, current wesen-os launcher wiring, shared OS-chat dependencies, and frontend profile API expectations.
- Recorded the investigation path and command-level findings in the diary, including the key migration risk around mutable profile CRUD versus the newer Pinocchio handler surface.
- Related the main evidence files to the design doc and diary.
- Added `geppetto` and `profiles` topic vocabulary entries required by this ticket.
- Attempted `docmgr doctor` twice after fixing vocabulary; both runs crashed with a nil-pointer panic inside `docmgr`, so validation fell back to per-document frontmatter checks.
- Uploaded the ticket bundle to reMarkable at `/ai/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP` and verified the remote listing.
- Revised the migration design after the product decision to kill profile CRUD for now, and expanded the ticket into a detailed step-by-step implementation plan plus phased engineering task list.
- Implemented the Phase A frontend transport cut in `go-go-os-frontend`: removed shared profile CRUD client exports, removed mutation-focused tests, updated the stale apps-browser fixture example, and committed the slice as `55f6845` (`refactor(chat-runtime): drop profile CRUD client paths`).
- Implemented the Phase A launcher contract cleanup in `wesen-os`: removed mutable profile and legacy compatibility expectations from `main_integration_test.go`, kept the read/select profile coverage, and committed the slice as `963912c` (`test(wesen-os): drop mutable profile integration contract`).
- Attempted focused launcher test validation after the contract cleanup, but `go test ./cmd/wesen-os-launcher ...` still fails at package setup because `cmd/wesen-os-launcher/main.go` imports unresolved legacy `github.com/go-go-golems/geppetto/pkg/profiles`.

## 2026-03-22

Completed the APP-30 research/design deliverable: mapped the current legacy profile wiring in wesen-os, traced the Pinocchio/Geppetto target architecture, and documented a phased migration plan including the mutable profile API compatibility risk.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/01-intern-guide-to-migrating-wesen-os-to-pinocchio-config-and-engine-profile-registries.md — Primary deliverable
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/reference/01-investigation-diary.md — Chronological evidence trail

## 2026-03-22

Simplified the shared profile API surface to read/select-only across go-go-os-chat, wesen-os, and inventory by removing write-option wiring and keeping only list/get/current-profile mounts (commits aec4c62, e24ab59, 293c0db).

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/chatservice/component.go — Shared chatservice contract is now read/select-only
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/assistantbackendmodule/module.go — Assistant backend no longer passes profile write handlers
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go — Inventory backend no longer passes profile write handlers


## 2026-03-22

Migrated go-go-os-chat profile resolution/composition from legacy mixed profiles to engineprofiles plus Pinocchio runtime extensions, and aligned inventory pinoweb wrappers/tests with the new contract (commits 18f9efc, 0718893). Validated with go test ./pkg/chatservice ./pkg/profilechat, go test ./pkg/backendcomponent ./pkg/backendmodule ./pkg/pinoweb, and go test ./pkg/assistantbackendmodule.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go — Request resolution now uses ResolveEngineProfile and MergeInferenceSettings
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/runtime_composer.go — Composer now consumes resolved inference settings plus Pinocchio runtime policy
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/runtime_composer.go — Inventory wrapper now matches the new middleware/runtime types


## 2026-03-22

Added a strict resolver capability for launcher-selected default profiles so a caller can configure the fallback engine-profile slug without reintroducing legacy runtime-key selectors (commit 6eae647).

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/go-go-os-chat/pkg/profilechat/request_resolver.go — StrictRequestResolver now supports an explicit default engine-profile selection


## 2026-03-22

Migrated the wesen-os launcher off builtin mixed profiles and onto Pinocchio bootstrap plus file-backed engine-profile registries, with focused precedence tests for CLI, PINOCCHIO_* env, config files, default ~/.config/pinocchio/profiles.yaml fallback, and read/select integration coverage (commit b75ffa2).

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go — Launcher now consumes Pinocchio config and profile files instead of builtin profiles
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main_integration_test.go — Read/select integration suite now uses file-backed Pinocchio profile fixtures
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap.go — Launcher-local Pinocchio bootstrap helper for base settings and registry loading
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test.go — Focused bootstrap precedence tests


## 2026-03-22

Replaced generated inline launcher test YAML with a checked-in Pinocchio engine-profile fixture used by the launcher bootstrap tests and integration helpers (commit 4b722e7).

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/profile_bootstrap_test_helpers_test.go — Launcher tests now copy the checked-in fixture instead of generating YAML inline
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/testdata/pinocchio/profiles.yaml — Concrete sample Pinocchio profile registry fixture with runtime extensions


## 2026-03-22

Documented the launcher's Pinocchio bootstrap and runtime-extension contract in the operator guide, including precedence rules, the authoritative pinocchio.webchat_runtime@v1 shape, and the remaining launcher-owned fallback defaults (commit b7c7f70).

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/cmd/wesen-os-launcher/main.go — Comments clarify fallback defaults vs authoritative profile runtime data
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/pkg/doc/topics/01-wesen-os-guide.md — Operator-facing launcher profile/bootstrap documentation


## 2026-03-22

Added a long-form implementation postmortem for new maintainers covering the system map, migration order, API boundaries, failures, validation, and remaining risks.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/02-implementation-postmortem.md — Detailed postmortem and intern handoff document


## 2026-03-22

Uploaded the updated APP-30 bundle to reMarkable as a separate postmortem package and verified the remote listing under the ticket folder.

### Related Files

- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/index.md — Ticket overview included in the uploaded bundle
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/01-intern-guide-to-migrating-wesen-os-to-pinocchio-config-and-engine-profile-registries.md — Primary migration guide included in the uploaded bundle
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/design-doc/02-implementation-postmortem.md — New postmortem included in the uploaded bundle
- /home/manuel/workspaces/2026-03-02/os-openai-app-server/openai-app-server/ttmp/2026/03/22/APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP--migrate-wesen-os-to-pinocchio-config-bootstrap-and-engine-profile-registries/reference/01-investigation-diary.md — Diary included in the uploaded bundle
