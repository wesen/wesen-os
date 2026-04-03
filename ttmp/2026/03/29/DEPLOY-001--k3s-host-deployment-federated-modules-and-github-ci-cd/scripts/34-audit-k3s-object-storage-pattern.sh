#!/usr/bin/env bash
set -euo pipefail

REPO="/home/manuel/code/wesen/2026-03-27--hetzner-k3s"

echo "# K3s Object Storage Pattern Audit"
echo
echo "## cluster-data-services-backup-and-restore-playbook.md"
sed -n '1,120p' "$REPO/docs/cluster-data-services-backup-and-restore-playbook.md"
echo
echo "## source-app-deployment-infrastructure-playbook.md"
sed -n '1,160p' "$REPO/docs/source-app-deployment-infrastructure-playbook.md"
