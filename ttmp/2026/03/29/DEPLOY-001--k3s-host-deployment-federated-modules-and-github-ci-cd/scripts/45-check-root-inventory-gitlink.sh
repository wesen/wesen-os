#!/usr/bin/env bash
set -euo pipefail

root_dir="/home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os"

echo "root_gitlink:"
git -C "${root_dir}" ls-tree HEAD workspace-links/go-go-app-inventory
echo
echo "submodule_head:"
git -C "${root_dir}/workspace-links/go-go-app-inventory" rev-parse HEAD
echo
echo "origin_main:"
git -C "${root_dir}/workspace-links/go-go-app-inventory" rev-parse origin/main
