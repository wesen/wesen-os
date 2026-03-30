# Launcher Remote-Manifest Browser Smoke

Date: 2026-03-30

## Goal

Verify that `apps/os-launcher` can boot in a real browser using the manifest-backed inventory remote instead of the local-package fallback.

## Operator steps

1. Build the inventory federation artifact:

```bash
cd /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os
npm run build:federation -w workspace-links/go-go-app-inventory/apps/inventory
```

2. Sync the generated artifact into a same-origin launcher static path:

```bash
rm -rf apps/os-launcher/public/__federation-smoke
mkdir -p apps/os-launcher/public/__federation-smoke/inventory
rsync -a workspace-links/go-go-app-inventory/apps/inventory/dist-federation/ \
  apps/os-launcher/public/__federation-smoke/inventory/
```

3. Start the launcher with the remote-manifest env override:

```bash
VITE_INVENTORY_REMOTE_MANIFEST_URL=/__federation-smoke/inventory/mf-manifest.json \
  npm run dev-public -w apps/os-launcher -- --port 4175
```

4. Open `http://127.0.0.1:4175/` in a browser.

## Observed results

### First failure

The launcher initially failed with:

```text
TypeError: Failed to construct 'URL': Invalid base URL
```

Cause:

- the loader tried to resolve `contract.entry` against a relative manifest URL without first normalizing it to an absolute browser URL

Fix:

- normalize relative manifest URLs against `window.location.href`/`document.baseURI` before resolving the contract entry

### Second failure

After fixing manifest URL normalization, the launcher failed with:

```text
ReferenceError: process is not defined
```

Cause:

- the built inventory remote still emitted `process.env.NODE_ENV` checks into the browser bundle

Fix:

- define `process.env.NODE_ENV = "production"` in `vite.federation.config.ts`

### Current browser proof

After both fixes:

- the launcher boots successfully
- the `Inventory` desktop icon appears
- the launcher home window renders normally

When the `Inventory` icon is opened, the remote window crashes with:

```text
Cannot read properties of null (reading 'useContext')
```

Interpretation:

- bootstrap and remote contract loading now work
- the next blocker is the remote shared-singleton/runtime boundary
- React/react-redux are still duplicated between host and remote

## Conclusion

The remote-manifest bootstrap path is real and browser-proven. The next task is not manifest loading anymore; it is defining and implementing the shared-singleton policy required for browser-rendered remotes.
