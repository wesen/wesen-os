#!/usr/bin/env bash
set -euo pipefail

terraform_envrc="/home/manuel/code/wesen/terraform/.envrc"
bucket_name="${1:-scapegoat-federation-assets}"
endpoint_url="${2:-}"

if [ -z "${endpoint_url}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${terraform_envrc}"
  set +a
  endpoint_url="https://${TF_VAR_object_storage_server}"
fi

tmp_json="$(mktemp)"
trap 'rm -f "${tmp_json}"' EXIT

cat >"${tmp_json}" <<'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://wesen-os.yolo.scapegoat.dev",
        "http://localhost:4175",
        "http://127.0.0.1:4175"
      ],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type", "x-amz-version-id"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-${TF_VAR_object_storage_access_key}}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-${TF_VAR_object_storage_secret_key}}"

echo "bucket_name=${bucket_name}"
echo "endpoint_url=${endpoint_url}"
aws s3api put-bucket-cors \
  --bucket "${bucket_name}" \
  --endpoint-url "${endpoint_url}" \
  --cors-configuration "file://${tmp_json}"

aws s3api get-bucket-cors \
  --bucket "${bucket_name}" \
  --endpoint-url "${endpoint_url}"
