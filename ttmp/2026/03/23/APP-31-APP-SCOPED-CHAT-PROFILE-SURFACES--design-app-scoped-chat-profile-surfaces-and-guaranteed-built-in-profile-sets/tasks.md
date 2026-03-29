# Tasks

## Phase A: Current-State Mapping

- [x] Confirm whether inventory and assistant routes are already namespaced per app.
- [x] Confirm whether the profile registry injected into those app endpoints is shared.
- [x] Confirm where `inventory` and `analyst` currently exist as profile data.
- [x] Confirm how the frontend selector fetches and displays profile lists.

## Phase B: Design Deliverables

- [x] Create a new ticket workspace for the app-scoped chat/profile surface problem.
- [x] Write a detailed intern-facing design and implementation guide.
- [x] Keep a detailed investigation diary with concrete findings and file references.
- [x] Relate the key evidence files to the design doc and diary.

## Phase C: Design Refresh For The Chosen Architecture

- [x] Update the design doc to reflect the clarified target architecture: one app-scoped registry surface per chat app, with the shared launcher registry only as the generic fallback layer.
- [x] Expand the ticket task list into implementation phases with concrete code and validation steps.
- [x] Record the revised architecture and work plan in the implementation diary.

## Phase D: Ship Real App-Owned Built-In Registries

- [x] Add an embedded inventory built-in profile registry file in the inventory package, outside launcher testdata.
- [x] Add an embedded assistant built-in profile registry file in the assistant package.
- [x] Add loader helpers that decode those built-in YAML files into `EngineProfileRegistry` values.
- [x] Set explicit app defaults in code so inventory defaults to `inventory` and assistant defaults to `assistant`.

## Phase E: Build Separate Registry Surfaces Per App

- [x] Build a launcher-owned helper that creates an app-specific aggregate registry surface from:
  - the app built-in registry
  - the shared launcher registry
- [x] Ensure the app-built-in registry is the visible/default registry for that app surface.
- [x] Inject the inventory app surface into the inventory resolver and inventory profile API.
- [x] Inject the assistant app surface into the assistant resolver and assistant profile API.

## Phase F: Enforce App-Owned Visibility Rules

- [x] Restrict the inventory profile list surface to `default`, `inventory`, `analyst`, and `assistant`.
- [x] Make inventory `/chat` reject profile selections outside that inventory-visible set.
- [x] Restrict the assistant profile surface to assistant-owned profiles only.
- [x] Make assistant `/chat` reject explicit selections outside its assistant-visible set.

## Phase G: Test The New App Surfaces

- [x] Add launcher integration coverage proving the inventory profile API lists exactly the inventory-visible set.
- [x] Add launcher integration coverage proving the assistant profile API does not leak inventory profiles.
- [x] Add launcher integration coverage proving inventory chat accepts `analyst` and rejects foreign profile selections.
- [x] Add launcher integration coverage proving default profile resolution is app-specific (`inventory` for inventory, `assistant` for assistant).
- [x] Run focused package tests for launcher, inventory backend, assistant backend, and shared profilechat behavior.

## Phase H: Ticket Bookkeeping And Delivery

- [x] Update the implementation diary after each completed implementation slice, including commits and validation notes.
- [x] Update the changelog as each phase lands.
- [ ] Re-validate APP-31 frontmatter after the design and diary updates.

## Phase I: Initial Ticket Delivery

- [x] Validate ticket doc frontmatter.
- [x] Upload the ticket bundle to reMarkable and verify the remote listing.
