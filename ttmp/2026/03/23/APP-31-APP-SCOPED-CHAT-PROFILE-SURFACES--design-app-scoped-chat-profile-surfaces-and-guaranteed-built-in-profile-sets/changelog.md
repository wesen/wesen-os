# Changelog

## 2026-03-23

- Initial workspace created

## 2026-03-23

- Investigated the current `wesen-os` chat/profile architecture and confirmed that app routes are namespaced but the injected profile registry is shared across apps.
- Confirmed that `inventory` and `analyst` currently exist as launcher test fixture data, not as guaranteed runtime profiles.
- Added a detailed design and implementation guide for app-scoped profile surfaces and guaranteed inventory built-in profiles.
- Added a detailed diary and prepared the ticket bundle for reMarkable upload.
- Uploaded the APP-31 bundle to reMarkable and verified the remote listing under `/ai/2026/03/23/APP-31-APP-SCOPED-CHAT-PROFILE-SURFACES`.
- Revised the design to the chosen architecture: per-app registry surfaces with app-owned built-ins on top of the shared launcher registry as generic fallback.
- Expanded the tasks into phased implementation work and recorded the transition from research to execution in the diary.
- Added real inventory built-in profile assets and loader helpers in `go-go-app-inventory` (commit `b588378`).
- Implemented launcher-owned app-scoped registry surfaces plus assistant built-in profile assets in `wesen-os` (commit `a38a1c4`).
- Added integration coverage proving inventory and assistant now expose different visible profile surfaces and that inventory rejects hidden foreign profile selections.
