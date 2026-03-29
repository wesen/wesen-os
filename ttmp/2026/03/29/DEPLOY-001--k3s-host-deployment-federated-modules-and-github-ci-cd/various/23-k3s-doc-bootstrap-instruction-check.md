# K3s Doc Bootstrap Instruction Check

- gitops_root: `/home/manuel/code/wesen/2026-03-27--hetzner-k3s`

## Matches

/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/public-repo-ghcr-argocd-deployment-playbook.md:346:For a brand-new app, there is a one-time bootstrap step first:
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/public-repo-ghcr-argocd-deployment-playbook.md:352:kubectl apply -f gitops/applications/<app>.yaml
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md:71:2. A brand-new file under `gitops/applications/<name>.yaml` does not become live just because it was merged into Git.
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md:73:This repo does not currently use an app-of-apps or `ApplicationSet` layer that auto-creates every new `Application` object from the `gitops/applications/` directory. That means the first rollout of a new app has a one-time bootstrap step:
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md:85:kubectl apply -f gitops/applications/<app>.yaml
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md:115:There is one more boundary that matters during the first rollout of a brand-new app:
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md:106:- a new file under `gitops/applications/<name>.yaml` is only a Git declaration
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md:109:This repo does not currently have an app-of-apps or `ApplicationSet` layer that auto-materializes every new Argo `Application`. So the first deployment of a new app always includes a one-time bootstrap step:
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md:115:kubectl apply -f gitops/applications/<name>.yaml
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md:221:The existence of this script does not remove the one-time Argo bootstrap step for a brand-new app. CI can update manifests that an existing `Application` watches, but CI cannot rely on Argo to sync an `Application` object that does not yet exist in the cluster.
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md:240:- `gitops/applications/<name>.yaml`
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md:259:- `gitops/applications/<name>.yaml`
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md:275:- `gitops/applications/<name>.yaml`
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/app-packaging-and-gitops-pr-standard.md:296:- `gitops/applications/<name>.yaml`
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/README.md:152:   kubectl apply -f gitops/applications/argocd-public.yaml
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/README.md:156:   This is the same pattern you use for any brand-new app `Application` in this repo. A merged file under `gitops/applications/` is only Git state until that `Application` object exists in the cluster once.
/home/manuel/code/wesen/2026-03-27--hetzner-k3s/README.md:243:kubectl apply -f gitops/applications/vault.yaml
