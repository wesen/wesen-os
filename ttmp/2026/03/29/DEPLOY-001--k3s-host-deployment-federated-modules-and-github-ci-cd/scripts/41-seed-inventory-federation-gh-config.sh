#!/usr/bin/env bash
set -euo pipefail

TERRAFORM_ROOT="/home/manuel/code/wesen/terraform"
TARGET_REPO="${1:-go-go-golems/go-go-app-inventory}"
BUCKET_NAME="${FEDERATION_BUCKET_NAME:-scapegoat-federation-assets}"

cd "$TERRAFORM_ROOT"

AWS_PROFILE="${AWS_PROFILE:-manuel}" direnv exec . bash -lc '
  : "${TF_VAR_object_storage_server:?missing TF_VAR_object_storage_server}"
  : "${TF_VAR_object_storage_region:?missing TF_VAR_object_storage_region}"
  : "${TF_VAR_object_storage_access_key:?missing TF_VAR_object_storage_access_key}"
  : "${TF_VAR_object_storage_secret_key:?missing TF_VAR_object_storage_secret_key}"

  if [[ "${TF_VAR_object_storage_server}" == *your-objectstorage.com* ]]; then
    echo "Refusing to seed GitHub config from placeholder object storage settings." >&2
    exit 2
  fi

  repo="'"$TARGET_REPO"'"
  bucket_name="'"$BUCKET_NAME"'"
  endpoint="https://${TF_VAR_object_storage_server}"
  region="${TF_VAR_object_storage_region}"
  public_base_url="https://${bucket_name}.${TF_VAR_object_storage_server}"

  printf "%s" "${TF_VAR_object_storage_access_key}" | gh secret set HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID --repo "${repo}"
  printf "%s" "${TF_VAR_object_storage_secret_key}" | gh secret set HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY --repo "${repo}"
  printf "%s" "${bucket_name}" | gh secret set HETZNER_OBJECT_STORAGE_BUCKET --repo "${repo}"
  printf "%s" "${endpoint}" | gh secret set HETZNER_OBJECT_STORAGE_ENDPOINT --repo "${repo}"
  printf "%s" "${region}" | gh secret set HETZNER_OBJECT_STORAGE_REGION --repo "${repo}"
  gh variable set INVENTORY_FEDERATION_PUBLIC_BASE_URL --repo "${repo}" --body "${public_base_url}"

  echo "repo=${repo}"
  echo "bucket_name=${bucket_name}"
  echo "endpoint=${endpoint}"
  echo "region=${region}"
  echo "public_base_url=${public_base_url}"
'
