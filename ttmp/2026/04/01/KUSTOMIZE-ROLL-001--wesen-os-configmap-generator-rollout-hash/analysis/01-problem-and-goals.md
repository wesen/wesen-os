# Problem And Goals

## The Concrete Production Problem

The current `wesen-os` Kustomize package lives at:

- [/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/kustomization.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/kustomization.yaml)
- [/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml)
- [/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml)

The package currently does all of the following:

- declares a handwritten `ConfigMap`
- stores `profiles.runtime.yaml` inline inside that `ConfigMap`
- stores `federation.registry.json` inline inside that `ConfigMap`
- mounts those two files into the container using `subPath`

The relevant mount shape in the Deployment is:

```yaml
volumeMounts:
  - name: launcher-config
    mountPath: /config/profiles.runtime.yaml
    subPath: profiles.runtime.yaml
    readOnly: true
  - name: launcher-config
    mountPath: /config/federation.registry.json
    subPath: federation.registry.json
    readOnly: true
```

That shape looks tidy, but it creates a specific operational failure mode:

- editing the ConfigMap in Git updates desired state
- Argo syncs the new manifest
- but the running pod can keep the old mounted file content
- the user then sees stale behavior until a manual restart happens

That is exactly what happened with the inventory federation manifest URL.

## Why This Happened

The Kubernetes concept to understand is:

- ConfigMap volumes can update in a running pod
- but `subPath` mounts are not the same as mounting the whole projected directory

When a single file from a ConfigMap is mounted via `subPath`, the container sees a bind-mounted file, not the normal projected directory that Kubernetes can replace underneath it in the same way.

So this deployment shape combines:

- declarative desired state in Git
- but imperative operator rollout behavior in production

That is a bad boundary for app config.

## Why This Ticket Exists

This ticket is not trying to teach “all of Kubernetes.” It has a narrower purpose:

1. explain the current `wesen-os` deployment shape
2. explain the Kustomize mechanisms that are relevant here
3. choose a sane long-term pattern
4. make the future implementation work mechanically obvious

## Long-Term Goal

The desired end state is:

- a config change in the GitOps repo changes the rendered Deployment
- Kubernetes sees a new pod template
- the Deployment rolls automatically
- the new pod reads the new config on startup
- no manual `kubectl rollout restart` is needed

That is the “config hash” or “generated name” rollout model.

## Non-Goals

This ticket is not primarily about:

- adding live hot reload to the app process
- redesigning the `wesen-os` runtime configuration schema
- changing Argo CD itself
- replacing Kustomize with Helm

Those are separate concerns.

## Decision The Ticket Will Teach

There are three realistic strategies:

1. keep the current setup and manually restart
2. use Kustomize-generated ConfigMap names / config hashes so config edits trigger rollouts
3. mount config without `subPath` and make the app hot-reload files

For this deployment, the recommended strategy is:

- strategy 2

because `wesen-os` behaves like a startup-config application, not a dynamic live-reload service.
