# First Live Inventory Remote Publish Playbook

This playbook covers the first real transition from local federation smoke tests
to a hosted `inventory` remote that `wesen-os` can load through
`/api/os/federation-registry`.

It assumes the code-side work is already complete:

- `inventory` can build `dist-federation/`
- the publish workflow exists
- `wesen-os` can serve a mounted `federation.registry.json`
- the host can load manifest-backed remotes

The remaining work is operational wiring.

## Goal

Reach this state:

1. Hetzner Object Storage bucket exists
2. `go-go-app-inventory` can publish `dist-federation/` into that bucket
3. we have one immutable manifest URL such as:
   - `https://scapegoat-federation-assets.<real-host>/remotes/inventory/versions/sha-abc1234/mf-manifest.json`
4. deployed `wesen-os` config points at that URL
5. the `inventory` remote is enabled in the deployed registry
6. deployed `wesen-os` loads the hosted remote

## Endpoint note

Important correction from the initial investigation:

- `fsn1.your-objectstorage.com` is the real Hetzner Object Storage regional
  service endpoint for Falkenstein

It is **not** a fake placeholder. The bucket-specific public URL is derived
from that regional host:

- `https://<bucket>.fsn1.your-objectstorage.com/<key>`

## Phase A: Fix the Terraform operator env

The Terraform repo already follows the standard object-storage operator pattern:

- `AWS_PROFILE=manuel`
- repo-local `direnv`
- `TF_VAR_object_storage_*` values outside git

What must be fixed before apply:

```bash
cd /home/manuel/code/wesen/terraform
direnv allow
```

Replay check:

```bash
/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/40-check-federation-storage-operator-env.sh
```

Exit criteria:

- endpoint is set
- access key is set
- secret key is set
- computed public base URL matches the chosen bucket host

## Phase B: Apply the federation bucket

Once the operator env is real:

```bash
cd /home/manuel/code/wesen/terraform
AWS_PROFILE=manuel direnv exec . bash -lc '
  export TF_VAR_public_base_url="https://scapegoat-federation-assets.${TF_VAR_object_storage_server}"
  terraform -chdir=storage/platform/federation-assets/envs/prod init -reconfigure
  terraform -chdir=storage/platform/federation-assets/envs/prod plan
  terraform -chdir=storage/platform/federation-assets/envs/prod apply
'
```

Expected resources:

- `minio_s3_bucket.federation_assets`
- `minio_s3_bucket_versioning.federation_assets`

Expected outputs:

- bucket name
- `scapegoat-federation-assets`
- endpoint URL
- region
- public base URL
- advisory public-read and CI read/write policy JSON

For the first live federation rollout, the bucket should be:

- `public-read`

because browser clients must fetch manifests and chunks directly.

## Phase C: Seed GitHub configuration for inventory

After the Terraform env is real, seed `go-go-app-inventory` with:

- secrets:
  - `HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID`
  - `HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY`
  - `HETZNER_OBJECT_STORAGE_BUCKET`
  - `HETZNER_OBJECT_STORAGE_ENDPOINT`
  - `HETZNER_OBJECT_STORAGE_REGION`
- variable:
  - `INVENTORY_FEDERATION_PUBLIC_BASE_URL`

Replay command:

```bash
/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/41-seed-inventory-federation-gh-config.sh
```

This helper fails fast if:

- the endpoint is still placeholder
- required env vars are missing

Manual equivalent:

```bash
gh secret set HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID --repo go-go-golems/go-go-app-inventory
gh secret set HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY --repo go-go-golems/go-go-app-inventory
gh secret set HETZNER_OBJECT_STORAGE_BUCKET --repo go-go-golems/go-go-app-inventory
gh secret set HETZNER_OBJECT_STORAGE_ENDPOINT --repo go-go-golems/go-go-app-inventory
gh secret set HETZNER_OBJECT_STORAGE_REGION --repo go-go-golems/go-go-app-inventory
gh variable set INVENTORY_FEDERATION_PUBLIC_BASE_URL --repo go-go-golems/go-go-app-inventory --body "<real-public-base-url>"
```

## Phase D: Run the first real inventory remote publish

Dispatch:

```bash
gh workflow run publish-federation-remote.yml \
  --repo go-go-golems/go-go-app-inventory \
  -f dry_run=false
```

Optional explicit version:

```bash
gh workflow run publish-federation-remote.yml \
  --repo go-go-golems/go-go-app-inventory \
  -f remote_version=sha-<short-sha> \
  -f dry_run=false
```

Expected result:

- workflow builds `apps/inventory/dist-federation`
- uploads objects to:
  - `remotes/inventory/versions/<version>/...`
- reports:
  - `manifest_url`

Canonical manifest URL shape:

```text
<public-base-url>/remotes/inventory/versions/<version>/mf-manifest.json
```

## Phase E: Turn on the hosted remote in deployed wesen-os

Once the first real manifest exists:

1. update the `wesen-os` registry config in the Hetzner GitOps repo
2. replace the placeholder manifest URL with the real immutable URL
3. change `enabled` from `false` to `true`
4. let GitOps roll out the config change

Important design rule:

- use the immutable versioned manifest URL for rollout and rollback
- do **not** point production GitOps config at a moving `latest` URL

## Phase F: Verify deployed host -> hosted remote

Checks:

1. deployed host returns the updated registry:

```bash
curl https://wesen-os.yolo.scapegoat.dev/api/os/federation-registry
```

2. hosted manifest is valid JSON:

```bash
/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/38-check-remote-manifest-json.sh "<real-manifest-url>"
```

3. launcher loads `inventory` from the hosted remote
4. inventory windows render
5. backend-dependent features still work

## Rollback

If the first remote is bad:

1. revert the GitOps config to:
   - `enabled: false`
   - or the previous known-good immutable manifest URL
2. merge the GitOps revert
3. let Argo sync it

Because the object-storage layout is immutable:

- old versions remain available
- rollback is a config flip, not an object overwrite
