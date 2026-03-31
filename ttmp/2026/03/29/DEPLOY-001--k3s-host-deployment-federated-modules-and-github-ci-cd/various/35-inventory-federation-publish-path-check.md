# Inventory Federation Publish Path Check

## Workflow
name: publish-federation-remote
on:
  workflow_dispatch:
    inputs:
      remote_version:
        description: Immutable remote version or tag. Defaults to sha-<short-sha>.
        required: false
        type: string
      dry_run:
        description: Validate build and publish plan without uploading.
        required: true
        default: true
        type: boolean
  push:
    branches:
      - main
    paths:
      - apps/inventory/**
      - tooling/vite/**
      - scripts/publish_federation_remote.py
      - .github/workflows/publish-federation-remote.yml
      - package.json
      - package-lock.json
permissions:
  contents: read
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Setup Go
        uses: actions/setup-go@v6
        with:
          go-version-file: go.mod
          cache: true
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install dependencies
        run: npm ci
      - name: Build inventory federation artifact
        run: npm run build:federation -w apps/inventory
      - name: Upload built federation artifact
        uses: actions/upload-artifact@v4
        with:
          name: inventory-dist-federation
          path: apps/inventory/dist-federation
      - name: Ensure AWS CLI is available
        run: |
          if ! command -v aws >/dev/null 2>&1; then
            sudo apt-get update
            sudo apt-get install -y awscli
          fi
          aws --version
      - name: Resolve remote version
        id: version
        run: |
          remote_version="${{ inputs.remote_version }}"
          if [ -z "${remote_version}" ]; then
            remote_version="sha-${GITHUB_SHA::7}"
          fi
          echo "remote_version=${remote_version}" >> "$GITHUB_OUTPUT"
      - name: Fail if object storage publish configuration is missing
        if: ${{ github.event_name != 'workflow_dispatch' || !inputs.dry_run }}
        run: |
          missing=0
          for name in \
            HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID \
            HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY \
            HETZNER_OBJECT_STORAGE_BUCKET \
            HETZNER_OBJECT_STORAGE_ENDPOINT \
            HETZNER_OBJECT_STORAGE_REGION \
            INVENTORY_FEDERATION_PUBLIC_BASE_URL
          do
            if [ -z "${!name}" ]; then
              echo "Missing required publish configuration: ${name}" >&2
              missing=1
            fi
          done
          if [ "${missing}" -ne 0 ]; then
            exit 1
          fi
        env:
          HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID: ${{ secrets.HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID }}
          HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY: ${{ secrets.HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY }}
          HETZNER_OBJECT_STORAGE_BUCKET: ${{ secrets.HETZNER_OBJECT_STORAGE_BUCKET }}
          HETZNER_OBJECT_STORAGE_ENDPOINT: ${{ secrets.HETZNER_OBJECT_STORAGE_ENDPOINT }}
          HETZNER_OBJECT_STORAGE_REGION: ${{ secrets.HETZNER_OBJECT_STORAGE_REGION }}
          INVENTORY_FEDERATION_PUBLIC_BASE_URL: ${{ vars.INVENTORY_FEDERATION_PUBLIC_BASE_URL }}
      - name: Publish federation artifact to object storage
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY }}
          HETZNER_OBJECT_STORAGE_BUCKET: ${{ secrets.HETZNER_OBJECT_STORAGE_BUCKET }}
          HETZNER_OBJECT_STORAGE_ENDPOINT: ${{ secrets.HETZNER_OBJECT_STORAGE_ENDPOINT }}
          HETZNER_OBJECT_STORAGE_REGION: ${{ secrets.HETZNER_OBJECT_STORAGE_REGION }}
          INVENTORY_FEDERATION_PUBLIC_BASE_URL: ${{ vars.INVENTORY_FEDERATION_PUBLIC_BASE_URL }}
        run: |
          args=()
          if [ "${{ github.event_name }}" = "workflow_dispatch" ] && [ "${{ inputs.dry_run }}" = "true" ]; then
            args+=("--dry-run")
          fi

          python3 scripts/publish_federation_remote.py \
            --source-dir apps/inventory/dist-federation \
            --remote-id inventory \
            --version "${{ steps.version.outputs.remote_version }}" \
            --bucket "${HETZNER_OBJECT_STORAGE_BUCKET:-example-bucket}" \
            --endpoint "${HETZNER_OBJECT_STORAGE_ENDPOINT:-https://example.invalid}" \
            --region "${HETZNER_OBJECT_STORAGE_REGION:-eu-central}" \
            --public-base-url "${INVENTORY_FEDERATION_PUBLIC_BASE_URL:-https://assets.example.invalid}" \
            "${args[@]}"
      - name: Publish summary
        run: |
          remote_version="${{ steps.version.outputs.remote_version }}"
          manifest_url="${INVENTORY_FEDERATION_PUBLIC_BASE_URL}/remotes/inventory/versions/${remote_version}/mf-manifest.json"
          {
            echo "## Inventory Federation Publish"
            echo
            echo "- remote_version: \`${remote_version}\`"
            echo "- manifest_url: \`${manifest_url}\`"
            echo "- dry_run: \`${{ github.event_name == 'workflow_dispatch' && inputs.dry_run || 'false' }}\`"
          } >> "$GITHUB_STEP_SUMMARY"
        env:
          INVENTORY_FEDERATION_PUBLIC_BASE_URL: ${{ vars.INVENTORY_FEDERATION_PUBLIC_BASE_URL || 'https://assets.example.invalid' }}

## Python Syntax

## Dry Run Plan
Federation publish plan
- source_dir: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory/apps/inventory/dist-federation
- remote_id: inventory
- version: sha-localproof
- bucket: demo-bucket
- endpoint: https://example.invalid
- region: eu-central
- destination: s3://demo-bucket/remotes/inventory/versions/sha-localproof/
- manifest_url: https://assets.example.invalid/remotes/inventory/versions/sha-localproof/mf-manifest.json
- dry_run: true
