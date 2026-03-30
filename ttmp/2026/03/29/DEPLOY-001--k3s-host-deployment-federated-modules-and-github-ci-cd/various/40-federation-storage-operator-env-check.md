# 40 - Federation Storage Operator Env Check

Command:

```bash
ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/40-check-federation-storage-operator-env.sh
```

Output:

```text
TF_VAR_object_storage_server=fsn1.your-objectstorage.com
TF_VAR_object_storage_region=fsn1
TF_VAR_object_storage_access_key=set
TF_VAR_object_storage_secret_key=set
effective_bucket_acl=public-read
computed_public_base_url=https://scapegoat-federation-assets.fsn1.your-objectstorage.com
```
