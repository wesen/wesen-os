#!/usr/bin/env bash

set -euo pipefail

echo "# VM Docs Directory Check"
echo

find apps workspace-links -path '*/src/domain/vm/docs' -type d | sort | while read -r dir; do
  echo "## ${dir}"
  echo
  if git ls-files "${dir}" | sed 's/^/- tracked: `/; s/$/`/'; then
    :
  fi
  if find "${dir}" -maxdepth 1 -type f | sort | sed 's/^/- file: `/; s/$/`/'; then
    :
  fi
  echo
done
