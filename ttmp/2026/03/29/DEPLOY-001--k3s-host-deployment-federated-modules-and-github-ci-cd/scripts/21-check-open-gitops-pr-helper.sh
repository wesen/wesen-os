#!/usr/bin/env bash

set -euo pipefail

repo_root="${1:-/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os}"
gitops_repo="${2:-/home/manuel/code/wesen/2026-03-27--hetzner-k3s}"
image_ref="${3:-ghcr.io/wesen/wesen-os:sha-4a14ccc}"

echo "# GitOps PR Helper Check"
echo
echo "- repo_root: \`${repo_root}\`"
echo "- gitops_repo: \`${gitops_repo}\`"
echo "- image_ref: \`${image_ref}\`"
echo
echo "## Command"
echo
printf '%s\n' \
  "python3 ${repo_root}/scripts/open_gitops_pr.py --config ${repo_root}/deploy/gitops-targets.json --all-targets --image ${image_ref} --gitops-repo-dir ${gitops_repo} --dry-run"
echo
echo "## Output"
echo
python3 "${repo_root}/scripts/open_gitops_pr.py" \
  --config "${repo_root}/deploy/gitops-targets.json" \
  --all-targets \
  --image "${image_ref}" \
  --gitops-repo-dir "${gitops_repo}" \
  --dry-run
