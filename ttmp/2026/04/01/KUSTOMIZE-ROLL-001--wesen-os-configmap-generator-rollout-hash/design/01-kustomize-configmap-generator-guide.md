# Kustomize ConfigMap Generator And Rollout Hash Guide For `wesen-os`

## What This Document Covers

This is a Kustomize tutorial applied directly to the live `wesen-os` deployment package in the Hetzner K3s GitOps repository.

The goal is not to give you abstract Kubernetes trivia. The goal is to teach a new intern enough Kustomize to understand:

- what the current package is doing
- why the current package produced stale runtime config
- how Kustomize generators work
- how generated names act as rollout hashes
- how to refactor this specific package safely

The main package we are talking about is:

- [/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os)

## System Map

Before talking about Kustomize, you need the system boundaries straight.

```text
wesen-os source repo
  -> produces host image
  -> does not define cluster desired state

hetzner-k3s repo
  -> defines desired Kubernetes state
  -> includes the Kustomize package for wesen-os

Argo CD
  -> watches the Kustomize package in Git
  -> renders and applies it to the cluster

Kubernetes Deployment
  -> creates the pod
  -> pod reads config files from a ConfigMap volume

wesen-os process
  -> reads /config/profiles.runtime.yaml
  -> reads /config/federation.registry.json
  -> serves /api/os/federation-registry
```

This boundary matters because Kustomize does not “run the app.” It only renders the manifests that tell Kubernetes what to run.

## The Current Package

The current Kustomize entry point is:

- [kustomization.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/kustomization.yaml)

Current contents:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: wesen-os

resources:
  - namespace.yaml
  - configmap.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

This means:

- Kustomize is currently just aggregating handwritten YAML files
- there is no generator yet
- the `ConfigMap` is a normal static resource file

The ConfigMap itself is:

- [configmap.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml)

It stores two embedded files:

- `profiles.runtime.yaml`
- `federation.registry.json`

The Deployment is:

- [deployment.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml)

It mounts those files individually via `subPath`.

## Why `subPath` Was The Operational Problem

The current Deployment uses:

```yaml
volumeMounts:
  - name: launcher-config
    mountPath: /config/profiles.runtime.yaml
    subPath: profiles.runtime.yaml
  - name: launcher-config
    mountPath: /config/federation.registry.json
    subPath: federation.registry.json
```

This has one nice property:

- the application sees file paths exactly where it expects them

But it has one important downside:

- when the ConfigMap changes, a running pod can continue using the old file until restart

That is why the live endpoint stayed stale after the ConfigMap changed.

## What Kustomize Actually Is

Kustomize is a manifest transformation engine.

Its job is to:

- take base resource declarations
- apply generators and patches
- output plain Kubernetes YAML

You can think of it as:

```text
input files + kustomization rules
  -> render
  -> plain YAML
  -> kubectl / Argo applies that YAML
```

Unlike Helm, it does not center the workflow around a templating language. It centers the workflow around structured manifest transformations.

## The Kustomize Features That Matter Here

For this ticket, the important Kustomize concepts are:

### 1. `resources`

These are just input manifests that Kustomize includes as-is.

Example from the current package:

```yaml
resources:
  - namespace.yaml
  - deployment.yaml
```

### 2. `configMapGenerator`

This tells Kustomize:

- build a `ConfigMap` from files or literals
- compute a generated name that changes when the content changes

Conceptually:

```yaml
configMapGenerator:
  - name: wesen-os-config
    files:
      - config/profiles.runtime.yaml
      - config/federation.registry.json
```

Kustomize will render something like:

```yaml
metadata:
  name: wesen-os-config-9m82k7m9d4
```

The exact suffix is derived from the generated content.

### 3. Name reference rewriting

This is the part many new users miss.

If another manifest refers to the generated ConfigMap by name, Kustomize can rewrite that reference.

So if your Deployment says:

```yaml
volumes:
  - name: launcher-config
    configMap:
      name: wesen-os-config
```

the rendered output becomes:

```yaml
volumes:
  - name: launcher-config
    configMap:
      name: wesen-os-config-9m82k7m9d4
```

That rewrite is the key to the rollout behavior.

## Why Generated Names Act Like Config Hashes

Here is the important mechanism:

```text
change config source file
  -> generated ConfigMap content changes
  -> generated ConfigMap name changes
  -> Deployment volume reference changes
  -> Pod template changes
  -> Kubernetes rolls the Deployment
```

That is why people often describe this pattern as a “config hash rollout,” even when the implementation detail is really a generated ConfigMap name rather than a literal pod-template checksum annotation.

## Why This Is Better For `wesen-os`

`wesen-os` behaves like a startup-config process:

- it reads config files from disk
- it does not appear to maintain a formal live-reload contract for them
- a clean pod restart is operationally acceptable

So the right design is not “make the process magically reload config in place.”

The right design is:

- when config changes, roll the pod automatically

That is exactly what generated ConfigMap names are good at.

## Proposed Refactor

The refactor has four main steps.

### Step 1: Move inline config into real source files

Instead of storing the config content inline in `configmap.yaml`, create files inside the Kustomize package, for example:

```text
gitops/kustomize/wesen-os/
  kustomization.yaml
  deployment.yaml
  service.yaml
  ingress.yaml
  namespace.yaml
  config/
    profiles.runtime.yaml
    federation.registry.json
```

Why:

- easier to edit and review
- easier to validate independently
- natural fit for `configMapGenerator`

### Step 2: Replace handwritten `configmap.yaml` with `configMapGenerator`

The new `kustomization.yaml` should conceptually look like:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: wesen-os

resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml

configMapGenerator:
  - name: wesen-os-config
    files:
      - config/profiles.runtime.yaml
      - config/federation.registry.json
```

You may also use `generatorOptions` if you want common labels or annotations on generated resources.

### Step 3: Keep the Deployment reference stable at the logical name

In the Deployment, keep:

```yaml
volumes:
  - name: launcher-config
    configMap:
      name: wesen-os-config
```

Do not try to manually guess the suffixed generated name.

Kustomize rewrites that for you at render time.

### Step 4: Stop using `subPath` for these generated config files

For this package, the cleanest mount shape is probably:

```yaml
volumeMounts:
  - name: launcher-config
    mountPath: /config
    readOnly: true
```

That preserves the same file paths inside the container:

- `/config/profiles.runtime.yaml`
- `/config/federation.registry.json`

but avoids the `subPath` live-update trap.

Even if the generated-name rollout already solves the main operational problem, mounting the directory is still a cleaner shape for ConfigMap-backed config.

## What The Render Will Look Like

Here is the mental model.

### Source files in Git

```text
config/profiles.runtime.yaml
config/federation.registry.json
deployment.yaml references configMap.name: wesen-os-config
```

### Kustomize render

```text
ConfigMap name becomes:
  wesen-os-config-<hash>

Deployment volume reference becomes:
  wesen-os-config-<hash>
```

### Kubernetes effect

```text
new pod template
  -> new ReplicaSet
  -> rollout
```

## Worked Example Against The Current Federation File

Suppose you change only:

- `config/federation.registry.json`

from:

```json
{
  "version": 1,
  "remotes": [
    {
      "remoteId": "inventory",
      "mode": "remote-manifest",
      "enabled": true,
      "manifestUrl": ".../sha-8bee502/mf-manifest.json"
    }
  ]
}
```

to:

```json
{
  "version": 1,
  "remotes": [
    {
      "remoteId": "inventory",
      "mode": "remote-manifest",
      "enabled": true,
      "manifestUrl": ".../sha-next/mf-manifest.json"
    }
  ]
}
```

Kustomize will generate a different ConfigMap name.

That means the rendered Deployment changes even if:

- image stays the same
- replicas stay the same
- probes stay the same

That is exactly what we want.

## API / File References You Should Study

Local files:

- [kustomization.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/kustomization.yaml)
- [configmap.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml)
- [deployment.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml)
- [argocd-app-setup.md](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/argocd-app-setup.md)
- [source-app-deployment-infrastructure-playbook.md](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md)

Official references:

- Kustomize overview and field references
- Kustomize generators / `configMapGenerator`
- Kubernetes ConfigMap volume behavior
- Kubernetes `subPath` behavior notes

See [reference-links.md](../sources/reference-links.md).

## Step-By-Step Implementation Plan

### 1. Freeze current behavior

Run:

```bash
cd /home/manuel/code/wesen/2026-03-27--hetzner-k3s
kubectl kustomize gitops/kustomize/wesen-os
```

Save that render or diff against future render changes.

### 2. Create config source files

Create:

```text
gitops/kustomize/wesen-os/config/profiles.runtime.yaml
gitops/kustomize/wesen-os/config/federation.registry.json
```

Populate them with the content currently embedded in `configmap.yaml`.

### 3. Update `kustomization.yaml`

Remove:

- `configmap.yaml` from `resources`

Add:

```yaml
configMapGenerator:
  - name: wesen-os-config
    files:
      - config/profiles.runtime.yaml
      - config/federation.registry.json
```

### 4. Update `deployment.yaml`

Keep the logical name:

```yaml
configMap:
  name: wesen-os-config
```

Change volume mounts to the directory form:

```yaml
volumeMounts:
  - name: launcher-config
    mountPath: /config
    readOnly: true
```

### 5. Validate render

Run:

```bash
kubectl kustomize gitops/kustomize/wesen-os
```

Check:

- generated ConfigMap name is hashed/suffixed
- Deployment references the generated name
- container args still point to:
  - `/config/profiles.runtime.yaml`
  - `/config/federation.registry.json`

### 6. Merge and watch Argo

After merge:

```bash
kubectl -n argocd get application wesen-os
kubectl -n wesen-os rollout status deploy/wesen-os
```

### 7. Prove the behavior

Make a config-only change, then verify:

```bash
kubectl -n wesen-os get pods
curl -sS https://wesen-os.yolo.scapegoat.dev/api/os/federation-registry | jq
```

You want to see:

- a new pod rollout
- new live config value
- no manual restart

## What The Live Validation Should Show

When this refactor is working correctly in the cluster, the observations should change in a very specific way.

### Before The Refactor

Typical old behavior:

1. a GitOps PR changes the ConfigMap content
2. Argo reports `Synced`
3. the public API still serves the old config
4. an operator has to run:
   - `kubectl rollout restart deploy/wesen-os`

The mismatch is:

- desired state changed
- running pod state did not

### After The Refactor

Expected new behavior:

1. a GitOps PR changes one of the generator input files
2. the rendered ConfigMap name changes
3. the rendered Deployment changes with it
4. Kubernetes rolls the Deployment automatically
5. the new pod starts with the new config files
6. both:
   - `/config/federation.registry.json` inside the pod
   - `/api/os/federation-registry` from the live host
   show the same new value

### The Concrete Signals To Check

The live validation pass should confirm all of these:

- Argo application:
  - `status.sync.status == Synced`
  - `status.health.status == Healthy`
- Deployment:
  - rollout completes without a manual restart
- Pod filesystem:
  - `/config/federation.registry.json` contains the expected new manifest URL
- Public API:
  - `https://wesen-os.yolo.scapegoat.dev/api/os/federation-registry` returns the same expected manifest URL

If the ConfigMap changed but the in-pod file and public API did not, the rollout trigger still is not working.

If the in-pod file changed but the public API did not, then the process is likely still reading stale state internally.

## What Could Go Wrong

### 1. Kustomize name rewriting does not hit the field you expect

This is uncommon for standard fields like `configMap.name`, but always validate the rendered YAML, not just the source files.

### 2. The app expects exact file paths and the mount change breaks them

This is why the recommended mount path is `/config`, not a different directory. The app flags already point there.

### 3. Generated annotations from the old handwritten ConfigMap are lost

The current handwritten ConfigMap includes:

```yaml
annotations:
  argocd.argoproj.io/sync-wave: "0"
```

You need to preserve important metadata when moving to generator-based output. That may require:

- generator options
- common annotations
- or a small patch layer

This is one of the implementation details to handle carefully.

### 4. Someone expects hot reload and does not realize this is rollout-on-change

This design does not promise zero-restart config updates. It promises automatic restart when config changes.

That distinction should be explicit in docs and review notes.

## Why Not Use A Manual Checksum Annotation Instead

You could manually maintain something like:

```yaml
spec:
  template:
    metadata:
      annotations:
        wesen.scapegoat.dev/config-rev: "2026-04-01-1"
```

and bump it whenever config changes.

That works, but it is weaker because:

- it is manual
- it is easier to forget
- it duplicates information already present in the config content itself

Kustomize-generated names are better because the rollout trigger is derived from the actual config.

## Why Not Prefer Live Hot Reload Instead

Live reload could work if you:

- mounted the whole ConfigMap directory
- removed `subPath`
- and made the app reread or watch files

But that is a larger runtime-behavior change.

For `wesen-os`, the simpler and safer operational contract is:

- config changes cause rollout
- new pod starts with new config

That is why this ticket prefers generated rollout triggering over hot reload.

## Final Recommendation

For `wesen-os`, the long-term Kustomize shape should be:

1. real config source files in the package
2. `configMapGenerator` instead of a handwritten inline ConfigMap
3. Deployment volume reference to the logical ConfigMap name
4. whole-directory mount at `/config`
5. automatic rollout when config changes

That is the cleanest Kustomize-native answer to the exact failure you just observed in production.
