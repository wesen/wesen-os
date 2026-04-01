# Analysis

This ticket is about turning the current inventory-specific remote-release flow into a reusable template for future apps.

It follows directly from the first working remote release path:

- source repo builds a remote artifact
- publishes to Hetzner object storage
- yields an immutable manifest URL
- host config points at that manifest URL

Right now, that path works, but it is still encoded too specifically around `inventory`.

## What Exists Today

Current app-specific implementation lives mainly in:

- [publish-federation-remote.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml)
- [publish_federation_remote.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/scripts/publish_federation_remote.py)
- [configmap.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml)
- [federationRegistry.ts](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/apps/os-launcher/src/app/federationRegistry.ts)

Today’s practical flow is:

```text
go-go-app-inventory
  -> build dist-federation
  -> upload to object storage
  -> manifest URL exists
  -> wesen-os host registry points at that URL
  -> deployed host fetches the remote
```

That is enough for one app, but it is not yet a reusable operating model.

## What Needs To Become Generic

The reusable pattern should parameterize:

- `remote_id`
- source build output dir
- object storage prefix
- public base URL
- GitOps target file
- target host app id / registry entry id

So the logic stops being:

```text
inventory publishes inventory and patches inventory in wesen-os
```

and becomes:

```text
<app> publishes <remote_id> and updates one host registry entry in GitOps
```

## Recommended Split Of Responsibilities

### Source repo

Each app repo should own:

- remote build
- object storage upload
- immutable manifest URL creation
- GitOps PR opening
- app-local declaration of where its host registry target lives

### K3s repo

The K3s repo should own:

- the canonical host config layout
- docs for how host registry entries are shaped
- maybe example/template files
- not the app-specific CI workflow logic itself

### Shared helper

The patching/open-PR mechanics should ideally be shared, not rewritten in every repo.

That could be:

1. a reusable workflow
2. a small shared script package
3. a copied reference template with strong docs

My recommendation is:

- reusable workflow or shared helper for CI mechanics
- K3s repo for documentation and target layout examples

That keeps deployment state in GitOps, but does not force source repos to vendor cluster-specific scripts ad hoc.

## Suggested Template Shape

### Source repo metadata

Something like:

```json
{
  "targets": [
    {
      "kind": "federation-manifest",
      "remoteId": "inventory",
      "gitopsRepo": "wesen/2026-03-27--hetzner-k3s",
      "gitopsBranch": "main",
      "targetFile": "gitops/kustomize/wesen-os/configmap.yaml",
      "hostAppId": "wesen-os"
    }
  ]
}
```

The key point is that this should describe *what to update*, not embed app-specific patch code.

### Shared patch helper

The helper should accept:

- remote id
- new manifest URL
- target file path

and perform:

1. parse YAML
2. locate `federation.registry.json`
3. parse embedded JSON
4. replace the matching remote entry
5. serialize back

Pseudocode:

```python
config = load_yaml(path)
registry = json.loads(config["data"]["federation.registry.json"])

for entry in registry["remotes"]:
    if entry["remoteId"] == remote_id:
        entry["manifestUrl"] = manifest_url
        entry["enabled"] = True

write_yaml(path, config)
```

## Where The Template Should Live

The user asked whether this should maybe live in the K3s repo.

The right answer is: partially.

Good things to place in the K3s repo:

- documentation
- example host registry layout
- canonical GitOps target paths
- onboarding guide for adding a new federated app

Less good things to place there:

- source-repo CI scripts that need to run in app repos
- per-app publish logic

So the reusable mechanics should probably live in a shared helper or reusable workflow, while the K3s repo acts as the canonical documentation and target-layout reference.

## Where To Look When Resuming

Start with:

1. [publish-federation-remote.yml](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/.github/workflows/publish-federation-remote.yml)
2. [publish_federation_remote.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/scripts/publish_federation_remote.py)
3. [deploy/gitops-targets.json](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/deploy/gitops-targets.json)
4. [open_gitops_pr.py](/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/scripts/open_gitops_pr.py)
5. [configmap.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml)

## Short Recommendation

Do not keep this inventory-specific.

Package it as:

- a generic source-repo metadata file
- a generic patch/open-PR helper
- a reusable workflow or shared script layer
- K3s docs and example targets that explain how new remotes plug into the host registry
