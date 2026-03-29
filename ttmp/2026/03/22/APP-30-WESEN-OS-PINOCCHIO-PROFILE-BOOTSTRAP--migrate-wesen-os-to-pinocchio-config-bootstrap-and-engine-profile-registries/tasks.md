# Tasks

## Research And Planning

- [x] Read the current Geppetto docs/examples for engine-only profiles, profile registries, and JS/runtime boundaries.
- [x] Inspect Pinocchio bootstrap, webchat profile-registry docs, and runtime extension APIs.
- [x] Inspect `wesen-os`, `go-go-os-chat`, inventory backend, and frontend profile API assumptions.
- [x] Create the APP-30 ticket workspace, design doc, and diary.
- [x] Write a detailed intern-facing analysis/design/implementation guide with prose, bullets, pseudocode, diagrams, API references, and file references.
- [x] Record the investigation chronology in the diary.
- [x] Revise the plan after the product decision to hard-cut profile CRUD and keep the migration simple.

## Phase A: Hard-Cut Profile CRUD

- [x] Remove `createProfile`, `updateProfile`, `deleteProfile`, and `setDefaultProfile` from `go-go-os-frontend/packages/chat-runtime/src/chat/runtime/profileApi.ts`.
- [x] Update frontend callers so profile UX is read/select only.
- [x] Rewrite frontend mocks/tests that still expect CRUD endpoints.
- [x] Remove or rewrite launcher integration tests that assert create/patch/delete/default profile flows.

## Phase B: Pinocchio Bootstrap In The Launcher

- [x] Add launcher-local helper(s) in `wesen-os/cmd/wesen-os-launcher` to resolve Pinocchio base inference settings, selected profile, and profile registry sources.
- [x] Make `wesen-os` use Pinocchio config/env/profile precedence for AI/profile settings.
- [x] Add focused tests for `--profile`, `--profile-registries`, `PINOCCHIO_*`, config file, and default Pinocchio path precedence.

## Phase C: Migrate `go-go-os-chat` To `engineprofiles`

- [x] Replace `geppetto/pkg/profiles` imports with `geppetto/pkg/engineprofiles` in `go-go-os-chat/pkg/profilechat/request_resolver.go`.
- [x] Introduce a local resolved conversation plan type in `go-go-os-chat` that separates engine settings from runtime policy.
- [x] Rework request resolution to call `ResolveEngineProfile(...)` and `MergeInferenceSettings(...)`.
- [x] Decode runtime policy from engine-profile extensions instead of legacy mixed runtime fields.
- [x] Replace `geppetto/pkg/profiles` imports with `geppetto/pkg/engineprofiles` in `go-go-os-chat/pkg/profilechat/runtime_composer.go`.
- [x] Remove `step_settings_patch`-style mixed profile handling from the composer.
- [x] Update `go-go-os-chat/pkg/chatservice/component.go` to the simplified read/select profile API contract.

## Phase D: Migrate `wesen-os` Wrappers And Modules

- [x] Migrate `wesen-os/cmd/wesen-os-launcher/main.go` to use the new bootstrap and engine-profile registry path.
- [x] Remove built-in in-memory mixed profile definitions from launcher startup.
- [x] Update `wesen-os/pkg/assistantbackendmodule/module.go` to the simplified read/select profile API contract.
- [x] Update `wesen-os/workspace-links/go-go-app-inventory/pkg/backendcomponent/component.go` to the simplified read/select profile API contract.
- [x] Update `wesen-os/workspace-links/go-go-app-inventory/pkg/pinoweb/runtime_composer.go` and request resolver wrappers to the migrated `go-go-os-chat` types.

## Phase E: Runtime Policy Migration

- [x] Define the runtime extension contract to be used by `wesen-os` profile-driven runtime policy.
- [x] Move inventory prompt/tools/middlewares to the new runtime extension path.
- [x] Move assistant prompt/tools/middlewares to the new runtime extension path or document any intentional code-owned defaults.
- [x] Add/update profile fixtures and sample Pinocchio profile files used by tests.

## Phase F: Validation And Documentation

- [x] Add/adjust `go-go-os-chat` resolver/composer unit tests for the new split model.
- [x] Add/adjust launcher integration tests for read/select profile behavior only.
- [x] Update launcher/operator docs to state that Pinocchio config/profile files are authoritative.
- [x] Relate the key files to the ticket documents and update changelog bookkeeping as implementation progresses.
- [ ] Run `docmgr doctor --ticket APP-30-WESEN-OS-PINOCCHIO-PROFILE-BOOTSTRAP --stale-after 30` successfully.
- [x] Upload the initial research/design bundle to reMarkable and verify the remote listing.

## Notes

- `docmgr doctor` was attempted twice after fixing the vocabulary warning, but the command crashed inside `docmgr` with a nil-pointer panic. Frontmatter validation for the main docs passed, and the ticket bundle was uploaded anyway so delivery was not blocked by the tooling bug.
