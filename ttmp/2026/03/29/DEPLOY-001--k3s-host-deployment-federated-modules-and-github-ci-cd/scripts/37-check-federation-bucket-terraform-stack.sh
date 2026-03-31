#!/usr/bin/env bash
set -euo pipefail

STACK="/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod"

echo "# Federation Bucket Terraform Stack Check"
echo
echo "## Files"
find "$STACK" -maxdepth 1 -type f | sort
echo
echo "## Terraform validate"
terraform -chdir="$STACK" validate
echo
echo "## Key outputs source"
sed -n '1,240p' "$STACK/outputs.tf"
