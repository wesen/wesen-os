# Draft Review Workflow Comparison

- repo_root: `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os`
- reference_root: `/home/manuel/code/wesen/2026-03-24--draft-review`

## Unified Diff

--- /home/manuel/code/wesen/2026-03-24--draft-review/.github/workflows/publish-image.yaml	2026-03-29 10:45:41.792191068 -0400
+++ /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/.github/workflows/publish-host-image.yml	2026-03-29 17:28:25.834890986 -0400
@@ -1,11 +1,40 @@
-name: publish-image
+name: publish-host-image
 
 on:
   pull_request:
   push:
     branches:
       - main
+    paths:
+      - '.github/workflows/publish-host-image.yml'
+      - 'Dockerfile'
+      - '.dockerignore'
+      - 'package.json'
+      - 'pnpm-lock.yaml'
+      - 'go.mod'
+      - 'go.sum'
+      - 'go.work'
+      - 'go.work.sum'
+      - '.gitmodules'
+      - 'cmd/wesen-os-launcher/**'
+      - 'pkg/launcherui/**'
+      - 'pkg/assistantbackendmodule/**'
+      - 'pkg/arcagi/**'
+      - 'pkg/gepa/**'
+      - 'pkg/sqlite/**'
+      - 'apps/os-launcher/**'
+      - 'deploy/gitops-targets.json'
+      - 'scripts/build-wesen-os-launcher.sh'
+      - 'scripts/launcher-ui-sync.sh'
+      - 'scripts/open_gitops_pr.py'
+      - 'workspace-links/**'
   workflow_dispatch:
+    inputs:
+      push_image:
+        description: Push the built image to GHCR
+        required: true
+        default: false
+        type: boolean
 
 permissions:
   contents: read
@@ -13,7 +42,7 @@
   pull-requests: write
 
 concurrency:
-  group: publish-image-${{ github.ref }}
+  group: publish-host-image-${{ github.ref }}
   cancel-in-progress: true
 
 jobs:
@@ -23,28 +52,25 @@
     steps:
       - name: Check out repository
         uses: actions/checkout@v5
+        with:
+          submodules: recursive
 
-      - name: Set up Go
-        uses: actions/setup-go@v6
+      - name: Setup pnpm
+        uses: pnpm/action-setup@v4
         with:
-          go-version-file: go.mod
-          cache: true
+          version: 10
 
-      - name: Set up Node
+      - name: Setup Node
         uses: actions/setup-node@v5
         with:
           node-version: '22'
-          cache: 'npm'
-          cache-dependency-path: frontend/package-lock.json
+          cache: 'pnpm'
 
-      - name: Install frontend dependencies
-        run: npm ci
-        working-directory: frontend
+      - name: Install dependencies
+        run: pnpm install --frozen-lockfile
 
-      - name: Run repository tests
-        shell: bash
-        run: |
-          go test ./cmd/... ./pkg/... -count=1
+      - name: Build launcher binary
+        run: npm run launcher:binary:build
 
       - name: Set up Docker Buildx
         uses: docker/setup-buildx-action@v4
@@ -59,12 +85,13 @@
             type=raw,value=main,enable={{is_default_branch}}
             type=raw,value=latest,enable={{is_default_branch}}
           labels: |
-            org.opencontainers.image.title=draft-review
-            org.opencontainers.image.description=Draft Review web application
+            org.opencontainers.image.title=wesen-os
+            org.opencontainers.image.description=wesen-os launcher host
             org.opencontainers.image.source=${{ github.server_url }}/${{ github.repository }}
+            org.opencontainers.image.revision=${{ github.sha }}
 
       - name: Log in to GHCR
-        if: github.event_name != 'pull_request'
+        if: github.event_name != 'pull_request' && (github.event_name == 'push' || inputs.push_image == true)
         uses: docker/login-action@v4
         with:
           registry: ghcr.io
@@ -72,17 +99,33 @@
           password: ${{ secrets.GITHUB_TOKEN }}
 
       - name: Build and push image
+        id: build
         uses: docker/build-push-action@v7
         with:
           context: .
           file: ./Dockerfile
           platforms: linux/amd64
-          push: ${{ github.event_name != 'pull_request' }}
+          push: ${{ github.event_name != 'pull_request' && (github.event_name == 'push' || inputs.push_image == true) }}
           tags: ${{ steps.meta.outputs.tags }}
           labels: ${{ steps.meta.outputs.labels }}
           cache-from: type=gha
           cache-to: type=gha,mode=max
 
+      - name: Summarize published image refs
+        run: |
+          if [ "${{ github.event_name }}" = "pull_request" ]; then
+            echo "push_enabled=false"
+          elif [ "${{ github.event_name }}" = "workflow_dispatch" ] && [ "${{ inputs.push_image }}" != "true" ]; then
+            echo "push_enabled=false"
+          else
+            echo "push_enabled=true"
+          fi
+          echo "tags<<EOF" >> "$GITHUB_STEP_SUMMARY"
+          printf '%s\n' "${{ steps.meta.outputs.tags }}" >> "$GITHUB_STEP_SUMMARY"
+          echo "EOF" >> "$GITHUB_STEP_SUMMARY"
+          echo "" >> "$GITHUB_STEP_SUMMARY"
+          echo "digest: \`${{ steps.build.outputs.digest }}\`" >> "$GITHUB_STEP_SUMMARY"
+
   gitops-pr:
     name: Open GitOps PR
     needs: docker
