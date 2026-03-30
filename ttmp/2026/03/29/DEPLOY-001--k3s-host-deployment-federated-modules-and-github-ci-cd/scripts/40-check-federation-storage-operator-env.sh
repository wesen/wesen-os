#!/usr/bin/env bash
set -euo pipefail

TERRAFORM_ROOT="/home/manuel/code/wesen/terraform"

cd "$TERRAFORM_ROOT"

AWS_PROFILE="${AWS_PROFILE:-manuel}" direnv exec . bash -lc '
  required=(
    TF_VAR_object_storage_server
    TF_VAR_object_storage_region
    TF_VAR_object_storage_access_key
    TF_VAR_object_storage_secret_key
  )

  missing=0
  for name in "${required[@]}"; do
    if [ -z "${!name:-}" ]; then
      echo "missing: ${name}" >&2
      missing=1
    fi
  done
  if [ "$missing" -ne 0 ]; then
    exit 1
  fi

  server="${TF_VAR_object_storage_server}"
  region="${TF_VAR_object_storage_region}"
  public_base_url="https://scapegoat-federation-assets.${server}"
  bucket_acl="${TF_VAR_bucket_acl:-public-read}"

  echo "TF_VAR_object_storage_server=${server}"
  echo "TF_VAR_object_storage_region=${region}"
  echo "TF_VAR_object_storage_access_key=set"
  echo "TF_VAR_object_storage_secret_key=set"
  echo "effective_bucket_acl=${bucket_acl}"
  echo "computed_public_base_url=${public_base_url}"
'
