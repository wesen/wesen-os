#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SESSION="${LAUNCHER_DEV_SESSION:-wesen-os-dev}"
SOCKET="${TMUX_SOCKET:-}"
HOST="${LAUNCHER_DEV_HOST:-127.0.0.1}"
BACKEND_PORT="${LAUNCHER_DEV_BACKEND_PORT:-8091}"
FRONTEND_PORT="${LAUNCHER_DEV_FRONTEND_PORT:-5273}"
ARC_ENABLED="${LAUNCHER_DEV_ARC_ENABLED:-false}"
DETACHED=0
HOST_SET=0
BACKEND_PORT_SET=0
FRONTEND_PORT_SET=0
ARC_ENABLED_SET=0

STATE_DIR="${TMPDIR:-/tmp}/wesen-os-launcher-dev"
STATE_FILE=""

usage() {
  cat <<'EOF'
Usage:
  scripts/launcher-dev-tmux.sh <command> [options]

Commands:
  start      Create tmux session, auto-pick free ports, start backend + frontend
  stop       Stop tmux session
  restart    Restart backend + frontend commands inside existing session (or start if missing)
  attach     Attach to tmux session
  status     Show session/ports/status

Options:
  --session <name>         tmux session name (default: wesen-os-dev)
  --socket <path>          tmux socket path
  --host <host>            bind host (default: 127.0.0.1)
  --backend-port <port>    preferred backend port (default: 8091)
  --frontend-port <port>   preferred frontend Vite port (default: 5273)
  --arc-enabled <bool>     pass through to backend launcher (default: false)
  --detached               do not auto-attach after start/restart

Examples:
  scripts/launcher-dev-tmux.sh start
  scripts/launcher-dev-tmux.sh restart --backend-port 18091 --frontend-port 5274
  scripts/launcher-dev-tmux.sh stop
EOF
}

tmux_cmd() {
  if [[ -n "${SOCKET}" ]]; then
    tmux -S "${SOCKET}" "$@"
  else
    tmux "$@"
  fi
}

session_exists() {
  tmux_cmd has-session -t "${SESSION}" 2>/dev/null
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "( sport = :${port} )" 2>/dev/null | grep -q ":${port}"
    return
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z "${HOST}" "${port}" >/dev/null 2>&1
    return
  fi
  return 1
}

next_free_port() {
  local candidate="$1"
  local avoid="${2:-}"
  local attempts=0
  while [[ "${attempts}" -lt 200 ]]; do
    if [[ -n "${avoid}" && "${candidate}" == "${avoid}" ]]; then
      candidate=$((candidate + 1))
      attempts=$((attempts + 1))
      continue
    fi
    if ! port_in_use "${candidate}"; then
      echo "${candidate}"
      return 0
    fi
    candidate=$((candidate + 1))
    attempts=$((attempts + 1))
  done
  echo "could not find free port after 200 attempts from ${1}" >&2
  return 1
}

load_state() {
  local cli_host="${HOST}"
  local cli_backend="${BACKEND_PORT}"
  local cli_frontend="${FRONTEND_PORT}"
  local cli_arc_enabled="${ARC_ENABLED}"
  if [[ -f "${STATE_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${STATE_FILE}"
    if [[ "${HOST_SET}" -eq 1 ]]; then
      HOST="${cli_host}"
    fi
    if [[ "${BACKEND_PORT_SET}" -eq 1 ]]; then
      BACKEND_PORT="${cli_backend}"
    fi
    if [[ "${FRONTEND_PORT_SET}" -eq 1 ]]; then
      FRONTEND_PORT="${cli_frontend}"
    fi
    if [[ "${ARC_ENABLED_SET}" -eq 1 ]]; then
      ARC_ENABLED="${cli_arc_enabled}"
    fi
  fi
}

save_state() {
  mkdir -p "${STATE_DIR}"
  cat >"${STATE_FILE}" <<EOF
HOST=${HOST}
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
ARC_ENABLED=${ARC_ENABLED}
SESSION=${SESSION}
SOCKET=${SOCKET}
EOF
}

print_ports() {
  echo "session: ${SESSION}"
  echo "backend: http://${HOST}:${BACKEND_PORT}"
  echo "frontend: http://${HOST}:${FRONTEND_PORT}"
  echo "arc-enabled: ${ARC_ENABLED}"
}

ensure_tmux() {
  if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux is required but not installed" >&2
    exit 1
  fi
}

run_backend_cmd() {
  local cmd
  cmd="cd \"${ROOT_DIR}\" && go run ./cmd/wesen-os-launcher wesen-os-launcher --addr ${HOST}:${BACKEND_PORT} --arc-enabled=${ARC_ENABLED}"
  tmux_cmd send-keys -t "${SESSION}:0.0" C-c
  tmux_cmd send-keys -t "${SESSION}:0.0" "${cmd}" C-m
}

run_frontend_cmd() {
  local cmd
  cmd="cd \"${ROOT_DIR}/apps/os-launcher\" && INVENTORY_CHAT_BACKEND=http://${HOST}:${BACKEND_PORT} pnpm exec vite --host ${HOST} --port ${FRONTEND_PORT}"
  tmux_cmd send-keys -t "${SESSION}:0.1" C-c
  tmux_cmd send-keys -t "${SESSION}:0.1" "${cmd}" C-m
}

pick_ports() {
  BACKEND_PORT="$(next_free_port "${BACKEND_PORT}")"
  FRONTEND_PORT="$(next_free_port "${FRONTEND_PORT}" "${BACKEND_PORT}")"
}

start_session() {
  if session_exists; then
    echo "session ${SESSION} already exists; use restart/status/attach/stop" >&2
    exit 1
  fi
  pick_ports
  tmux_cmd new-session -d -s "${SESSION}" -c "${ROOT_DIR}"
  tmux_cmd split-window -h -t "${SESSION}:0" -c "${ROOT_DIR}"
  tmux_cmd select-layout -t "${SESSION}:0" even-horizontal >/dev/null
  run_backend_cmd
  run_frontend_cmd
  save_state
  print_ports
  if [[ "${DETACHED}" -eq 0 ]]; then
    tmux_cmd attach -t "${SESSION}"
  fi
}

restart_session() {
  if ! session_exists; then
    start_session
    return 0
  fi
  tmux_cmd send-keys -t "${SESSION}:0.0" C-c
  tmux_cmd send-keys -t "${SESSION}:0.1" C-c
  sleep 0.3
  pick_ports
  run_backend_cmd
  run_frontend_cmd
  save_state
  print_ports
  if [[ "${DETACHED}" -eq 0 ]]; then
    tmux_cmd attach -t "${SESSION}"
  fi
}

stop_session() {
  if session_exists; then
    tmux_cmd kill-session -t "${SESSION}"
    echo "stopped session ${SESSION}"
  else
    echo "session ${SESSION} is not running"
  fi
  if [[ -n "${STATE_FILE}" && -f "${STATE_FILE}" ]]; then
    rm -f "${STATE_FILE}"
  fi
}

attach_session() {
  if ! session_exists; then
    echo "session ${SESSION} is not running" >&2
    exit 1
  fi
  tmux_cmd attach -t "${SESSION}"
}

status_session() {
  if session_exists; then
    if [[ -n "${BACKEND_PORT}" && -n "${FRONTEND_PORT}" ]]; then
      print_ports
    else
      echo "session: ${SESSION}"
    fi
    echo "tmux panes:"
    tmux_cmd list-panes -t "${SESSION}:0" -F '  pane #{pane_index}: #{pane_current_command}'
    return 0
  fi
  echo "session ${SESSION} is not running"
}

COMMAND="${1:-}"
if [[ -z "${COMMAND}" ]]; then
  usage
  exit 1
fi
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --session)
      SESSION="$2"
      shift 2
      ;;
    --socket)
      SOCKET="$2"
      shift 2
      ;;
    --host)
      HOST="$2"
      HOST_SET=1
      shift 2
      ;;
    --backend-port)
      BACKEND_PORT="$2"
      BACKEND_PORT_SET=1
      shift 2
      ;;
    --frontend-port)
      FRONTEND_PORT="$2"
      FRONTEND_PORT_SET=1
      shift 2
      ;;
    --detached)
      DETACHED=1
      shift
      ;;
    --arc-enabled)
      ARC_ENABLED="$2"
      ARC_ENABLED_SET=1
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

STATE_FILE="${STATE_DIR}/${SESSION}.env"
load_state
ensure_tmux

case "${COMMAND}" in
  start)
    start_session
    ;;
  restart)
    restart_session
    ;;
  stop)
    stop_session
    ;;
  attach)
    attach_session
    ;;
  status)
    status_session
    ;;
  *)
    echo "unknown command: ${COMMAND}" >&2
    usage
    exit 1
    ;;
esac
