# 39 - Host Federation Registry Config Check

Command:

```bash
ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/39-check-host-federation-registry-config.sh
```

Output:

```text
== Local deploy package ==
3:  federation.registry.json: |
10:          "enabled": false,
11:          "manifestUrl": "https://assets.example.invalid/remotes/inventory/versions/latest/mf-manifest.json"
64:        - --federation-registry=/config/federation.registry.json
101:        - mountPath: /config/federation.registry.json
104:          subPath: federation.registry.json

== Hetzner GitOps package ==
10:  federation.registry.json: |
17:          "enabled": false,
18:          "manifestUrl": "https://assets.example.invalid/remotes/inventory/versions/latest/mf-manifest.json"
86:        - --federation-registry=/config/federation.registry.json
123:        - mountPath: /config/federation.registry.json
126:          subPath: federation.registry.json
```
