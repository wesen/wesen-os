#!/usr/bin/env bash
set -euo pipefail

echo "== root repo =="
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os status --short

echo
echo "== infra-tooling =="
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling branch --show-current
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling log --oneline -3
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/infra-tooling status --short

echo
echo "== go-go-app-sqlite =="
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite branch --show-current
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite log --oneline -5
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-sqlite status --short

echo
echo "== go-go-app-inventory =="
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory branch --show-current
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory log --oneline -5
git -C /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory status --short
