# Federation Bucket Terraform Stack Check

## Files
/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod/.terraform.lock.hcl
/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod/main.tf
/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod/outputs.tf
/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod/providers.tf
/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod/terraform.tfvars.example
/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod/variables.tf
/home/manuel/code/wesen/terraform/storage/platform/federation-assets/envs/prod/versions.tf

## Terraform validate
[32m[1mSuccess![0m The configuration is valid.
[0m

## Key outputs source
output "bucket_name" {
  value = minio_s3_bucket.federation_assets.bucket
}

output "bucket_arn" {
  value = minio_s3_bucket.federation_assets.arn
}

output "bucket_domain_name" {
  value = minio_s3_bucket.federation_assets.bucket_domain_name
}

output "storage_endpoint_url" {
  value = "https://${var.object_storage_server}"
}

output "storage_region" {
  value = var.object_storage_region
}

output "public_base_url" {
  value = var.public_base_url
}

output "remote_prefixes" {
  value = local.remote_prefixes
}

output "suggested_ci_bucket_policy_json" {
  value = local.ci_bucket_rw_policy
}

output "suggested_public_read_policy_json" {
  value = local.public_read_policy
}
