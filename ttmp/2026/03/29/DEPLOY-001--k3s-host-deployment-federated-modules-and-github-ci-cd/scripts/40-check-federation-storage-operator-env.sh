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

  echo "TF_VAR_object_storage_server=${server}"
  echo "TF_VAR_object_storage_region=${region}"
  echo "TF_VAR_object_storage_access_key=set"
  echo "TF_VAR_object_storage_secret_key=set"
  echo "computed_public_base_url=${public_base_url}"

  if [[ "${server}" == *your-objectstorage.com* ]]; then
    echo
    echo "operator_blocker=placeholder_object_storage_server" >&2
    echo "The Terraform env still uses the placeholder endpoint. Replace TF_VAR_object_storage_server with the real Hetzner Object Storage host before apply." >&2
    exit 2
  fi
'
