# GitOps PR Helper Check

- repo_root: `/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os`
- gitops_repo: `/home/manuel/code/wesen/2026-03-27--hetzner-k3s`
- image_ref: `ghcr.io/wesen/wesen-os:sha-4a14ccc`

## Command

python3 /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/scripts/open_gitops_pr.py --config /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/deploy/gitops-targets.json --all-targets --image ghcr.io/wesen/wesen-os:sha-4a14ccc --gitops-repo-dir /home/manuel/code/wesen/2026-03-27--hetzner-k3s --dry-run

## Output

--- /home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml (before)
+++ /home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml (after)
@@ -23,7 +23,7 @@
       enableServiceLinks: false
       containers:
         - name: wesen-os
-          image: ghcr.io/wesen/wesen-os:main
+          image: ghcr.io/wesen/wesen-os:sha-4a14ccc
           imagePullPolicy: IfNotPresent
           args:
             - --addr=:8091
[dry-run] would create branch 'automation/wesen-os-wesen-os-prod-sha-4a14ccc' in /home/manuel/code/wesen/2026-03-27--hetzner-k3s
