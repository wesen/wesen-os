# Changelog

## 2026-04-06

- Initial workspace created
- Reproduced the launcher failure in-browser: double-clicking `HyperCard Tools` opens a window with `Runtime surface packId is required for surface: home`.
- Traced the failure to the HyperCard Tools QuickJS bundle returning surfaces without `packId`, which now violates the stricter runtime bundle metadata contract.
- Identified two supporting gaps: the HyperCard Tools authoring type definitions do not require `packId`, and the existing test coverage validates launcher payload wiring but not HyperCard Tools bundle loading.
- Fixed a blocking parse error in the shared `docmgr` vocabulary file so ticket validation and upload tooling could run.
- `docmgr doctor --ticket WOS-02-HYPERCARD-TOOLS-MOUNTING --stale-after 30` passed cleanly.
- Uploaded the ticket bundle to reMarkable as `WOS-02 HyperCard Tools packId Mounting Guide` under `/ai/2026/04/06/WOS-02-HYPERCARD-TOOLS-MOUNTING` and verified the remote listing.
- Implemented the fix inside `workspace-links/go-go-os-frontend`: HyperCard Tools surfaces now stamp `packId: 'ui.card.v1'`, the authoring contract requires `packId`, and a direct QuickJS regression test covers bundle loading and `home` rendering (`9be7b78`).
- Re-verified `http://localhost:5173/`: double-clicking `HyperCard Tools` now opens the catalog UI instead of the runtime error window.
- Recorded the parent repo submodule pointer update in `wesen-os` (`542a205`).
