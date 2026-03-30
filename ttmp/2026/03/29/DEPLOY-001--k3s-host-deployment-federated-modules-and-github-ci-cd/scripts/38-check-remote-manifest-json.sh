#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <manifest-url>" >&2
  exit 2
fi

manifest_url="$1"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

headers_file="$tmp_dir/headers.txt"
body_file="$tmp_dir/body.txt"

curl -sS -D "$headers_file" -o "$body_file" "$manifest_url"

echo "URL: $manifest_url"
echo
echo "Status/Headers:"
sed -n '1,20p' "$headers_file"
echo
echo "Body preview:"
python3 - "$body_file" <<'PY'
from pathlib import Path
import json
import sys

body_path = Path(sys.argv[1])
raw = body_path.read_text(encoding="utf-8", errors="replace")
preview = " ".join(raw.split())[:240]
print(preview)
print()
try:
    parsed = json.loads(raw)
except Exception as exc:
    print(f"JSON parse: FAIL - {exc}")
    raise SystemExit(1)

if not isinstance(parsed, dict):
    print(f"JSON parse: OK, but top-level type is {type(parsed).__name__}")
    raise SystemExit(1)

missing = [
    key for key in ("version", "remoteId", "contract")
    if key not in parsed
]
if missing:
    print(f"JSON parse: OK, but missing keys: {', '.join(missing)}")
    raise SystemExit(1)

contract = parsed.get("contract")
entry = contract.get("entry") if isinstance(contract, dict) else None
print("JSON parse: OK")
print(f"remoteId: {parsed.get('remoteId')}")
print(f"contract.entry: {entry}")
PY
