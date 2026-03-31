# Generalized Federated Remote Release Guide

This document turns the currently working `inventory` release path into a reusable design for future federated apps.

The goal is not to describe federation in the abstract. The goal is to define a repeatable delivery pattern that can be used by:

- `inventory`
- `sqlite`
- `gepa`
- future app repos that expose a federated host contract

without rewriting one-off GitHub workflows and GitOps patch logic each time.

## Problem Statement

The current system works, but it is still too specific to `inventory`.

Today, the working path is:

```text
go-go-app-inventory
  -> build dist-federation
  -> upload immutable files to object storage
  -> produce manifest URL
  -> manually or semi-manually update wesen-os federation.registry.json
  -> deployed host loads that remote
```

That is enough to prove the system, but not enough to operate multiple apps safely.

The main reuse problems are:

1. workflow inputs are app-specific
2. object-storage publishing logic is app-specific
3. GitOps patching logic is still mostly implied rather than standardized
4. docs do not yet define a single “onboard a new remote” recipe

## Design Goals

The generalized pattern should satisfy the following:

- each app repo owns its own remote build and publish
- host-facing deployment state stays in GitOps
- every remote release is immutable
- no environment should depend on moving `latest`-style remote URLs
- GitOps PR creation should be standardized
- adding a new remote should mostly require data/config, not custom release code

## Delivery Model

There are three separate delivery planes:

1. npm package plane
   - shared `@go-go-golems/os-*` libraries
   - consumed at build time
2. host image plane
   - `wesen-os` container image
   - deployed via GHCR + GitOps + Argo
3. remote asset plane
   - `mf-manifest.json`
   - remote JS entry/chunks
   - published to object storage

This ticket is only about the third plane and the handoff from the app repo into GitOps.

## Generic Release Flow

The desired generic flow is:

```text
source repo
  -> build remote artifact
  -> upload immutable remote files
  -> compute manifest URL
  -> update host GitOps target
  -> open/update PR in GitOps repo
  -> merge PR
  -> Argo sync
  -> deployed host loads remote
```

More concretely:

```text
go-go-app-<app>
  -> dist-federation/
  -> s3://bucket/remotes/<remote-id>/versions/<version>/
  -> https://bucket.../remotes/<remote-id>/versions/<version>/mf-manifest.json
  -> patch wesen-os federation.registry.json entry for <remote-id>
  -> GitOps PR
```

## Split Of Responsibilities

### Source repo responsibilities

Each app repo should own:

- remote build configuration
- remote upload workflow
- version selection logic
- metadata describing which GitOps file and registry entry to update
- opening or updating the GitOps PR

### GitOps repo responsibilities

The K3s repo should own:

- canonical host config layout
- canonical location of `federation.registry.json`
- example host entries
- documentation for how source repos target host config

### Shared reusable layer

The release mechanics that should be reusable are:

- metadata schema for remote GitOps targets
- YAML/JSON patch helper
- open/update GitOps PR helper
- optional reusable GitHub workflow

## Recommendation

The reusable mechanics should *not* primarily live in the K3s repo as executable app CI logic.

The better split is:

- K3s repo:
  - documentation
  - examples
  - canonical target locations
- source repos:
  - actual publish workflow
  - repo-specific build steps
- shared helper:
  - patching/open-PR mechanics

That gives us one standard operating model without forcing app repos to import cluster internals ad hoc.

## Recommended Reusable Metadata Shape

The current image path in `wesen-os` already uses `deploy/gitops-targets.json` for image deployment. The remote-manifest path should use the same idea, but with a different `kind`.

Recommended shape:

```json
{
  "targets": [
    {
      "name": "wesen-os-inventory-staging",
      "kind": "federation-manifest",
      "remoteId": "inventory",
      "gitopsRepo": "wesen/2026-03-27--hetzner-k3s",
      "gitopsBranch": "main",
      "targetFile": "gitops/kustomize/wesen-os/configmap.yaml",
      "configMapKey": "federation.registry.json",
      "hostAppId": "wesen-os",
      "match": {
        "remoteId": "inventory"
      }
    }
  ]
}
```

### Why this shape

It captures:

- which GitOps repo to patch
- which file to patch
- which embedded config payload to modify
- which registry entry to replace

without embedding inventory-specific patch code.

## Generic Patch Operation

The patch operation should be data-driven and look like this:

```text
load YAML file
  -> locate data["federation.registry.json"]
  -> parse embedded JSON
  -> find remotes[i] where remoteId == target.remoteId
  -> replace manifestUrl
  -> set enabled=true
  -> write JSON back into YAML
```

Pseudocode:

```python
doc = yaml_load(target_file)
registry = json.loads(doc["data"][config_map_key])

matched = False
for remote in registry["remotes"]:
    if remote["remoteId"] == target["remoteId"]:
        remote["manifestUrl"] = manifest_url
        remote["enabled"] = True
        matched = True

if not matched:
    raise RuntimeError(f"remoteId {target['remoteId']} not found")

doc["data"][config_map_key] = json.dumps(registry, indent=2)
yaml_dump(doc, target_file)
```

## Reusable Workflow Contract

The reusable workflow should accept parameters like:

- `remote_id`
- `source_dir`
- `platform_package_version`
- `remote_version`
- `bucket`
- `endpoint`
- `region`
- `public_base_url`
- `gitops_target_config`

And then perform:

1. install dependencies
2. build remote artifact
3. upload immutable files
4. compute manifest URL
5. patch GitOps target
6. open/update PR

### Important split

Do not try to genericize the app build step completely.

Each app repo may still need its own:

- `npm run build:federation -w apps/<app>`
- generated metadata steps
- package install quirks

So the recommended reusable shape is:

- shared helper(s) for publish + patch + PR
- repo-local workflow that wires in the app-specific build step

That is better than forcing every repo through one giant reusable workflow that must understand every app.

## Suggested Files To Standardize

Each source repo that wants to publish a federated remote should eventually have:

```text
deploy/
  gitops-targets.json
scripts/
  publish_federation_remote.py
  update_federation_gitops_target.py
  open_gitops_pr.py   # or shared equivalent
.github/workflows/
  publish-federation-remote.yml
```

Not every file must be unique per repo. The main question is whether the shared helpers are:

- copied from a template
- installed from a shared repo
- or invoked as a reusable GitHub workflow

## Template Options

### Option 1: Reusable GitHub workflow

Pros:

- centralizes CI mechanics
- fewer copy/paste workflows

Cons:

- harder to customize app build/install quirks
- versioning/updating reusable workflows across repos can become opaque

### Option 2: Shared helper scripts + thin local workflow

Pros:

- keeps app workflow readable
- easier per-repo customization
- helpers can still be standardized

Cons:

- each repo still has a small workflow file

### Option 3: K3s repo owns template files only

Pros:

- good documentation/discoverability

Cons:

- not enough by itself
- does not solve source-repo execution mechanics

## Recommendation

Use Option 2.

That means:

- K3s repo documents the target layout
- source repos keep thin local publish workflows
- shared helper scripts or a small shared toolkit handle the generic patching and PR logic

## What Should Live In The K3s Repo

Good K3s-repo reusable assets:

- docs describing the remote-release flow
- example `federation.registry.json` entries
- example `configmap.yaml` layout
- naming conventions for host app targets
- canonical target file paths

Possible template files:

- `docs/federated-remote-release-standard.md`
- `templates/federation-registry-entry.json`
- `examples/wesen-os-federation-target.md`

What should not live there:

- app-specific GitHub workflows
- app-specific object-storage upload scripts
- repo-specific install/build logic

## Onboarding A New Remote

The future desired onboarding checklist for a new app should be:

1. Add `build:federation` output in the source repo.
2. Add `deploy/gitops-targets.json` entry for the remote.
3. Add the thin local publish workflow.
4. Configure object-storage and `GITOPS_PR_TOKEN` secrets.
5. Add a disabled host registry entry in GitOps.
6. Run first dry-run publish.
7. Run first live publish.
8. Merge the resulting GitOps PR.
9. Verify deployed host loads the remote.

If those steps require writing new patch logic for every app, the template is not good enough.

## Phase 0 Decisions

This ticket should explicitly freeze the following:

- immutable manifest URLs are the deployment unit
- source repos own publish + GitOps handoff
- GitOps repo owns canonical host registry layout
- shared helper layer is preferred over inventory-specific scripts
- K3s repo is the canonical documentation/reference home, not the execution home

## Phase 1 Decisions

This ticket should next implement:

1. a reusable `deploy/gitops-targets.json` shape for `federation-manifest`
2. a generic patch helper for `federation.registry.json` entries
3. a source-repo template path that can be used by a second app without inventory-specific edits
