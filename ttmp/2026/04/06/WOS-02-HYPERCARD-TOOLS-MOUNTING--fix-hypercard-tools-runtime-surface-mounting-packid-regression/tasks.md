# Tasks

## TODO

- [x] Reproduce the HyperCard Tools failure from the real launcher UI and capture the observed error path.
- [x] Trace the end-to-end runtime mounting flow from desktop icon routing through QuickJS bundle loading.
- [x] Identify the concrete root cause and the secondary process/testing gaps that let it ship.
- [x] Write an intern-facing design and implementation guide in the ticket.
- [x] Write an investigation diary with commands, failures, and review instructions.
- [x] Upload the finished ticket bundle to reMarkable.
- [x] Update `workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.vm.js` so every declared surface carries `packId: 'ui.card.v1'`.
- [x] Update `workspace-links/go-go-os-frontend/apps/hypercard-tools/src/domain/pluginBundle.authoring.d.ts` so the authoring contract requires `packId`.
- [x] Add a direct regression test that loads the HyperCard Tools runtime bundle with `QuickJSRuntimeService` and asserts that the `home` surface mounts successfully.
- [x] Re-run browser verification after the code fix and confirm the HyperCard Tools home surface renders instead of erroring.
