# K3s Object Storage Pattern Audit

## cluster-data-services-backup-and-restore-playbook.md
---
Title: "Back Up and Restore Shared PostgreSQL, MySQL, and Redis on This K3s Platform"
Slug: "cluster-data-services-backup-and-restore-playbook"
Short: "Operate the shared PostgreSQL, MySQL, and Redis backup pipeline on this K3s cluster, including object storage, Vault/VSO secret delivery, manual backup triggers, scratch restore drills, and failure handling."
Topics:
- backup
- restore
- postgres
- mysql
- redis
- vault
- argocd
- kubernetes
- object-storage
- disaster-recovery
Commands:
- terraform
- vault
- kubectl
- aws
- bash
Flags: []
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: Tutorial
---

## What This Page Covers

This page is the operator playbook for the shared data-service backup pipeline on this K3s platform.

It explains:

- how backups are wired for shared PostgreSQL, MySQL, and Redis
- where the off-cluster artifacts go
- how the runtime credentials are delivered
- how to trigger backups manually
- how to restore each service safely into a scratch target
- what validation to run before calling a backup usable
- what known sharp edges already showed up during the first restore drills

This page is meant to be the practical companion to the HK3S-0009 ticket history. A new intern should be able to read this page and understand the normal operator path without reading the whole ticket diary first.

## The System You Are Operating

The backup system is split across four layers:

```text
Terraform
  -> creates the Hetzner Object Storage bucket

Vault
  -> stores object-storage runtime credentials

Vault Secrets Operator
  -> syncs those credentials into service namespaces

Argo CD + Kustomize
  -> runs the backup CronJobs for postgres, mysql, and redis
```

The live storage target is one private Hetzner Object Storage bucket with service-specific prefixes:

- `postgres/`
- `mysql/`
- `redis/`

The live runtime secret path in Vault is:

- `kv/infra/backups/object-storage`

## Why the System Is Split This Way

The split is deliberate.

Terraform should own the object-storage bucket because that bucket is infrastructure, not workload state.

Vault should own the runtime credential material because those keys should not live in Git.

VSO should carry those credentials into Kubernetes because this repo already uses Vault-backed secret delivery elsewhere, and the backup pipeline should not introduce a second secret-management model.

Argo CD should own the CronJobs because backup execution is now part of the declared platform state, not an ad hoc operator habit.

If you collapse those responsibilities into one layer, the system becomes harder to reason about and harder to secure.

## The Important Files

### Terraform layer

- [main.tf](/home/manuel/code/wesen/terraform/storage/platform/k3s-backups/envs/prod/main.tf)
- [variables.tf](/home/manuel/code/wesen/terraform/storage/platform/k3s-backups/envs/prod/variables.tf)
- [outputs.tf](/home/manuel/code/wesen/terraform/storage/platform/k3s-backups/envs/prod/outputs.tf)

### GitOps backup jobs

- [backup-cronjob.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/postgres/backup-cronjob.yaml)
- [backup-cronjob.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/mysql/backup-cronjob.yaml)
- [backup-cronjob.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/redis/backup-cronjob.yaml)

### VSO delivery

- [backup-storage-vault-static-secret.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/postgres/backup-storage-vault-static-secret.yaml)
- [backup-storage-vault-static-secret.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/mysql/backup-storage-vault-static-secret.yaml)
- [backup-storage-vault-static-secret.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/redis/backup-storage-vault-static-secret.yaml)

### Ticket-local replay scripts

- [00-common.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/00-common.sh)
- [01-seed-backup-object-storage-secret.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/01-seed-backup-object-storage-secret.sh)
- [02-trigger-postgres-backup-job.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/02-trigger-postgres-backup-job.sh)
- [03-trigger-mysql-backup-job.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/03-trigger-mysql-backup-job.sh)
- [04-trigger-redis-backup-job.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/04-trigger-redis-backup-job.sh)
- [05-list-backup-objects.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/05-list-backup-objects.sh)
- [06-prune-backup-object.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/06-prune-backup-object.sh)
- [07-restore-postgres-backup-to-scratch.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/07-restore-postgres-backup-to-scratch.sh)
- [08-restore-mysql-backup-to-scratch.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/08-restore-mysql-backup-to-scratch.sh)
- [09-restore-redis-backup-to-scratch.sh](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/ttmp/2026/03/27/HK3S-0009--add-cluster-level-postgres-mysql-and-redis-under-argo-cd/scripts/09-restore-redis-backup-to-scratch.sh)

## Before You Touch Anything

## source-app-deployment-infrastructure-playbook.md
---
Title: "Build Deployment Infrastructure Around a Source App Repository"
Slug: "source-app-deployment-infrastructure-playbook"
Short: "Turn a source repository into a clean GitHub Actions -> GHCR -> GitOps PR -> Argo CD deployment path."
Topics:
- ci-cd
- github
- ghcr
- argocd
- gitops
- kubernetes
- packaging
- deployment
Commands:
- git
- gh
- docker
- kubectl
- python3
Flags: []
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: Tutorial
---

## What This Page Covers

This page is the full operator playbook for building deployment infrastructure around a normal source repository.

This should now be the canonical document to hand to someone who owns an application repository and wants to get it onto this K3s platform. The other deployment docs are now supporting references:

- use this page first for the full system model
- use the public-repo GHCR page when the repository and image are intentionally public
- use the HK3S-0014 ticket bundle when the source repository is private and needs a Vault-backed GHCR pull secret

The concrete example is `mysql-ide`, but the point of the page is broader. A new intern should be able to read this once and understand:

- what belongs in the app repository
- what belongs in the GitOps repository
- what GitHub Actions should do
- what Argo CD should do
- how secrets and credentials should be separated
- how to support one deployment target now and multiple deployment targets later

This page exists because just knowing how to build a Docker image is not enough. A production-ish deployment path is a small system, not a single file.

## If You Own a Repo and Want It Deployed Here

Use this as the short operator path:

1. Make the source repo buildable on a clean GitHub runner.
2. Add a production `Dockerfile`.
3. Add a GitHub Actions workflow that tests and publishes immutable GHCR tags.
4. Add `deploy/gitops-targets.json` plus a PR updater script.
5. Decide whether the image will be public or private.
6. Add or update the matching GitOps package in this repo.
7. Let CI open GitOps PRs and let Argo CD deploy from this repo, not from the source repo directly.

If the repo is private, stop and wire the private-image pull path before you assume the rollout is done. Publishing successfully to GHCR is not enough for the cluster to pull the image.

There is one more operator rule worth stating explicitly: if GitHub CI cannot publish the GHCR image, stop and ask for guidance instead of trying to solve the publish failure yourself with a local workaround. A broken GHCR publish usually means one of the control-plane assumptions is wrong:

- the workflow permissions are wrong
- the package visibility or package linkage is wrong
- the credential scopes are wrong
- the intended image path is wrong

Local pushes, alternate registries, and node-local image imports are all possible emergency bridges, but they change the release contract. Treat them as explicit exceptions, not as the default response to a broken GitHub CI publish.

## The Most Common Misunderstanding

Publishing an image to GHCR is not deployment by itself.

Merging a GitOps PR is also not always sufficient by itself.

There are two separate facts a new operator needs to keep in mind:

1. Argo CD only reconciles desired state it can already see through an `Application` object.
2. A brand-new file under `gitops/applications/<name>.yaml` does not become live just because it was merged into Git.

This repo does not currently use an app-of-apps or `ApplicationSet` layer that auto-creates every new `Application` object from the `gitops/applications/` directory. That means the first rollout of a new app has a one-time bootstrap step:

- apply the `Application` object to the cluster once
- optionally force a hard refresh
- then let Argo continuously reconcile the Kustomize package it points at

The first-time bootstrap commands are:

```bash
cd /home/manuel/code/wesen/2026-03-27--hetzner-k3s
export KUBECONFIG=$PWD/kubeconfig-<server-ip>.yaml

kubectl apply -f gitops/applications/<app>.yaml
kubectl -n argocd annotate application <app> argocd.argoproj.io/refresh=hard --overwrite
```

After that, the application behaves the way most people expect:

- future GitOps PR merges change the manifests or image pin
- Argo sees those changes through the already-existing `Application`
- the cluster reconciles without another manual `kubectl apply`

That distinction matters because otherwise an operator can merge the right GitOps PR, wait for Argo, and still see nothing happen simply because the `Application` object itself was never created in the cluster.

## The System You Are Building

You are not “deploying from GitHub.” You are building a chain of responsibility:

```text
source repo
  -> test and build in CI
  -> publish immutable image to registry
  -> open GitOps PR against infra repo
  -> reviewer merges desired-state change
  -> Argo CD reconciles cluster
  -> Kubernetes rolls the workload
```

Each arrow is a contract boundary.

If you skip those boundaries mentally, the system becomes confusing. If you preserve them, debugging stays tractable.

There is one more boundary that matters during the first rollout of a brand-new app:

```text
Git repo contains gitops/applications/<app>.yaml
  !=
cluster already has Application/<app>
```

The first time an app is introduced, you must create the `Application` custom resource in the cluster once. After that bootstrap step, Argo can do the continuous reconciliation work you actually want.

## Decision Tree

Use this decision tree before you write manifests:

```text
Does the app already build cleanly in CI?
  no -> fix source repo first
  yes
    -> Will the published GHCR package be public?
      yes
        -> use the normal public-package path
      no
        -> add the Vault-backed image pull secret path in GitOps
    -> Does the app need runtime secrets?
      yes
        -> add Vault/VSO resources
      no
        -> keep the GitOps package stateless
```

## The Three Control Planes

There are three separate control planes in this model.

### 1. Source application repository

This repo owns:
