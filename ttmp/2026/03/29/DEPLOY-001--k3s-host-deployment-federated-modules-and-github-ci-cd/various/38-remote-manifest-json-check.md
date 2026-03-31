# 38 - Remote Manifest JSON Check

Command:

```bash
ttmp/2026/03/29/DEPLOY-001--k3s-host-deployment-federated-modules-and-github-ci-cd/scripts/38-check-remote-manifest-json.sh http://127.0.0.1:<ephemeral-port>/mf-manifest.json
```

Captured output from a synthetic local manifest server:

```text
URL: http://127.0.0.1:55961/mf-manifest.json

Status/Headers:
HTTP/1.0 200 OK
Server: SimpleHTTP/0.6 Python/3.13.2
Date: Mon, 30 Mar 2026 22:01:27 GMT
Content-type: application/json
Content-Length: 94
Last-Modified: Mon, 30 Mar 2026 22:01:27 GMT


Body preview:
{"version": 1, "remoteId": "inventory", "contract": {"entry": "./inventory-host-contract.js"}}

JSON parse: OK
remoteId: inventory
contract.entry: ./inventory-host-contract.js
```
