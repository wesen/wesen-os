---
Title: Developer Runbook
Ticket: OS-03-SQLITE-QUERY-APP
Status: active
Topics:
  - backend
  - frontend
  - sqlite
DocType: reference
Intent: how-to
Summary: Local development runbook for go-go-app-sqlite backend/frontend workflows.
---

# Developer Runbook

## Local prerequisites

- Go 1.25+
- TypeScript compiler available (`tsc`) for partial local checks
- Workspace checked out with sibling repositories as used by path aliases

## Start backend on a specific DB file

Run from `go-go-app-sqlite` repository root:

```bash
go run ./cmd/go-go-app-sqlite \
  --listen 127.0.0.1:8097 \
  --db-path ./data/dev-sqlite.db \
  --db-auto-create=true \
  --db-read-only=false
```

Equivalent env-based startup:

```bash
SQLITE_APP_LISTEN_ADDR=127.0.0.1:8097 \
SQLITE_APP_DB_PATH=./data/dev-sqlite.db \
SQLITE_APP_DB_AUTO_CREATE=true \
SQLITE_APP_DB_READ_ONLY=false \
go run ./cmd/go-go-app-sqlite
```

## Query API quick checks

```bash
curl -sS -X POST http://127.0.0.1:8097/api/apps/sqlite/query \
  -H 'content-type: application/json' \
  -d '{"sql":"SELECT 1 AS one"}' | jq
```

```bash
curl -sS http://127.0.0.1:8097/api/apps/sqlite/history?limit=10 | jq
curl -sS http://127.0.0.1:8097/api/apps/sqlite/saved-queries | jq
```

## Seed a simple dev table

```bash
curl -sS -X POST http://127.0.0.1:8097/api/apps/sqlite/query \
  -H 'content-type: application/json' \
  -d '{"sql":"CREATE TABLE IF NOT EXISTS people(id INTEGER PRIMARY KEY, name TEXT NOT NULL)"}' | jq

curl -sS -X POST http://127.0.0.1:8097/api/apps/sqlite/query \
  -H 'content-type: application/json' \
  -d '{"sql":"INSERT INTO people(id, name) VALUES (?, ?)","positional_params":[1,"Ada"]}' | jq
```

## HyperCard intent bridge check

The frontend package exports `runSqliteHypercardQueryIntent` and runtime handlers.
Use the workspace UI button "Execute via Intent Bridge" or invoke from code via:

- `apps/sqlite/src/domain/hypercard/intentBridge.ts`
- `apps/sqlite/src/domain/hypercard/runtimeHandlers.ts`

## Guardrail config knobs

- `--statement-allowlist`
- `--statement-denylist`
- `--redact-columns`
- `--rate-limit-requests`
- `--rate-limit-window`
- `--db-statement-timeout`

Example:

```bash
go run ./cmd/go-go-app-sqlite \
  --db-path ./data/dev-sqlite.db \
  --statement-denylist ATTACH,DETACH,DROP \
  --redact-columns ssn,email \
  --rate-limit-requests 30 \
  --rate-limit-window 10s
```

## Run via `wesen-os` launcher composition

Run from `wesen-os` repository root when validating composed backend routing:

```bash
go run ./cmd/wesen-os-launcher \
  --addr :8091 \
  --required-apps inventory,sqlite \
  --sqlite-db ./data/sqlite-app.db \
  --sqlite-db-auto-create=true \
  --sqlite-db-read-only=false
```

Verify discoverability and sqlite routes from the composed runtime:

```bash
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | select(.app_id=="sqlite")'
curl -sS http://127.0.0.1:8091/api/apps/sqlite/health | jq
curl -sS -X POST http://127.0.0.1:8091/api/apps/sqlite/query \
  -H 'content-type: application/json' \
  -d '{"sql":"SELECT 1 AS one"}' | jq
```

## Validation commands

```bash
go test ./...
```

Targeted intent-domain TS compile (works without full frontend workspace install):

```bash
tsc --noEmit apps/sqlite/src/domain/hypercard/intentContract.ts \
  apps/sqlite/src/domain/hypercard/intentBridge.ts \
  apps/sqlite/src/domain/hypercard/runtimeHandlers.ts \
  apps/sqlite/src/domain/hypercard/exampleCard.ts \
  --target ES2022 --module ESNext --moduleResolution Bundler
```
