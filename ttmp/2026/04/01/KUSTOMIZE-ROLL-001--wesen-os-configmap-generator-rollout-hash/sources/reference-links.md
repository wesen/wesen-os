# Reference Links

These are the main references for this ticket.

## Local Repository References

- `wesen-os` Kustomize package:
  - [/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/kustomization.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/kustomization.yaml)
  - [/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/configmap.yaml)
  - [/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/gitops/kustomize/wesen-os/deployment.yaml)
- Argo/K3s platform docs:
  - [/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/argocd-app-setup.md](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/argocd-app-setup.md)
  - [/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md](/home/manuel/code/wesen/2026-03-27--hetzner-k3s/docs/source-app-deployment-infrastructure-playbook.md)

## Official References

- Kubernetes ConfigMap concept:
  - https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes task guide for ConfigMaps and Kustomize:
  - https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kustomize site / docs index:
  - https://kubectl.docs.kubernetes.io/
- Kustomize task basics in Kubernetes docs:
  - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize configMapGenerator reference examples:
  - https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/configmapgenerator/

## Concepts To Look Up While Working This Ticket

- `configMapGenerator`
- generated resource names
- name reference rewriting
- `generatorOptions`
- ConfigMap volume projection
- `subPath` caveats for ConfigMap-backed files
