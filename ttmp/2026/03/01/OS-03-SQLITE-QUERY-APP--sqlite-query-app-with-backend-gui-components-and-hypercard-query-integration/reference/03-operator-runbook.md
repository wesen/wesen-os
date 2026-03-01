---
Title: Operator Runbook
Ticket: OS-03-SQLITE-QUERY-APP
Status: active
Topics:
  - backend
  - sqlite
  - operations
DocType: reference
Intent: operations
Summary: Production-like deployment and troubleshooting guide for go-go-app-sqlite runtime.
---

# Operator Runbook

## Runtime profile

`go-go-app-sqlite` exposes namespaced APIs under `/api/apps/sqlite/*`:

- `POST /api/apps/sqlite/query`
- `GET /api/apps/sqlite/history`
- `GET|POST /api/apps/sqlite/saved-queries`
- `PUT|DELETE /api/apps/sqlite/saved-queries/{id}`

## Deployment config baseline

Use explicit filesystem paths and policy settings:

```bash
SQLITE_APP_DB_PATH=/var/lib/go-go/sqlite/app.db
SQLITE_APP_DB_AUTO_CREATE=false
SQLITE_APP_DB_READ_ONLY=false
SQLITE_APP_STATEMENT_TIMEOUT=5s
SQLITE_APP_STATEMENT_DENYLIST=ATTACH,DETACH
SQLITE_APP_RATE_LIMIT_REQUESTS=120
SQLITE_APP_RATE_LIMIT_WINDOW=10s
SQLITE_APP_REDACT_COLUMNS=ssn,email
```

## DB file management

- Place DB on persistent volume.
- Back up DB file and WAL files together (`*.db`, `*.db-wal`, `*.db-shm`) if WAL mode active.
- For read-only replicas, set `SQLITE_APP_DB_READ_ONLY=true` and disable auto-create.

## Failure recovery

1. Stop write traffic.
2. Snapshot current DB files.
3. Restore last known good DB if corruption suspected.
4. Restart runtime and verify:
   - `/health`
   - `POST /api/apps/sqlite/query` with `SELECT 1`
   - history/saved-queries list endpoints

## Troubleshooting

### DB open failures

Symptoms:

- startup fails with path/permission errors
- health endpoint degraded

Checks:

```bash
ls -lah /var/lib/go-go/sqlite
stat /var/lib/go-go/sqlite/app.db
```

Actions:

- ensure parent directory exists and process user can read/write.
- if read-only mode is enabled, ensure DB file already exists.
- if auto-create is disabled, pre-create DB file or enable auto-create.

### Migration failures

Symptoms:

- startup logs contain migration errors
- app starts without metadata tables

Checks:

```bash
sqlite3 /var/lib/go-go/sqlite/app.db '.schema query_history'
sqlite3 /var/lib/go-go/sqlite/app.db '.schema saved_queries'
```

Actions:

- restore from backup if schema is unexpectedly broken.
- verify no external tool concurrently mutates schema at startup.
- restart after schema repair and recheck `/health`.

### Query timeout errors

Symptoms:

- query responses with category `timeout`
- prolonged heavy queries failing consistently

Actions:

- tune `SQLITE_APP_STATEMENT_TIMEOUT` conservatively upward if query shape is legitimate.
- optimize SQL and indexes instead of only increasing timeout.
- use `row_limit` and policy controls to cap expensive result sets.

### Malformed intent payloads

Symptoms:

- HyperCard bridge returns normalized `validation` errors
- intent results `ok:false` with payload-shape messages

Checks:

- ensure payload includes `sql` string.
- do not send both `positionalParams` and `namedParams`.
- keep `rowLimit` within guardrail bounds.

Actions:

- fix card/action payload shape to match exported intent contract:
  - `apps/sqlite/src/domain/hypercard/intentContract.ts`

## Audit and compliance notes

- Audit logging intentionally records metadata only (correlation ID, statement type, timing, row count, truncation) and avoids parameter values by default.
- Use `redact-columns` for response-level masking where needed.
