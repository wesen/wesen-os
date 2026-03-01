# wesen-os

`wesen-os` is the composition runtime repository.

It owns:
- launcher shell frontend (`apps/os-launcher`)
- launcher dist embedding (`pkg/launcherui/dist`)
- composed runtime binary (`cmd/wesen-os-launcher`)
- backend module registration for composed apps (inventory + GEPA)

## Workspace Prerequisites

Launcher frontend source imports platform/app code from sibling repos.
Your workspace should contain these directories side-by-side:

```text
<workspace>/
  go-go-os-frontend/
  go-go-app-inventory/
  wesen-os/
```

## Frontend Commands

```bash
npm install
npm run build
npm run test
```

## Launcher Assembly Commands

```bash
npm run launcher:frontend:build   # build apps/os-launcher
npm run launcher:ui:sync          # copy dist -> pkg/launcherui/dist
npm run launcher:binary:build     # frontend build + sync + go build
npm run launcher:smoke            # runtime smoke checks
```

## Running the Launcher

```bash
npm run launcher:binary:build
./build/wesen-os-launcher wesen-os-launcher --addr 127.0.0.1:8091
```

Then open `http://127.0.0.1:8091/`.

## Backend Tests

```bash
GOWORK=off go test ./...
```

## Ownership Boundary

Use this repo when you are:
- composing modules into one launcher runtime
- changing launcher UI host behavior, dist embed flow, or smoke checks
- wiring inventory + GEPA backend module mounting into the final runtime

Use other repos when you are:
- changing shared platform frontend packages -> `go-go-os-frontend`
- changing inventory domain/frontend behavior -> `go-go-app-inventory`
