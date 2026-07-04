#!/usr/bin/env python3
"""devctl plugin for wesen-os: Go launcher backend + Vite desktop frontend.

Speaks the devctl NDJSON stdio protocol (v2). Backend is the wesen-os-launcher
serve subcommand; frontend is the os-launcher Vite dev server, which proxies
/api (including the /api/chat/ws websocket) to the backend.

Env overrides (all optional):
  WESEN_OS_BACKEND_PORT        backend HTTP port (default 8091)
  WESEN_OS_VITE_PORT           vite dev port (default 5273)
  WESEN_OS_DYNAMIC_PORTS       "true" to auto-pick free ports if preferred taken
  WESEN_OS_ARC_ENABLED         pass through --arc-enabled (default false)
  WESEN_OS_PROFILE             engine profile slug (default: launcher builtin)
  WESEN_OS_PROFILE_REGISTRIES  profile registry YAML (default:
                               ~/.config/pinocchio/profiles.yaml if it exists)
"""

import json
import os
import shlex
import shutil
import socket
import subprocess
import sys


def emit(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def log(msg):
    sys.stderr.write(msg + "\n")
    sys.stderr.flush()


def env_bool(name, default=False):
    raw = os.environ.get(name, "").strip()
    if raw == "":
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def env_int(name, default):
    raw = os.environ.get(name, "").strip()
    if raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def env_str(name, default=""):
    return os.environ.get(name, default).strip()


def is_port_free(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(0.2)
    try:
        sock.bind(("127.0.0.1", int(port)))
        return True
    except OSError:
        return False
    finally:
        sock.close()


def pick_free_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def find_free_port(preferred):
    return preferred if is_port_free(preferred) else pick_free_port()


def shell_join(parts):
    return " ".join(shlex.quote(str(p)) for p in parts if str(p) != "")


def default_profile_registries():
    """Default to the user's pinocchio profiles.yaml if present so real
    inference (API keys) works out of the box; empty otherwise."""
    candidate = os.path.expanduser("~/.config/pinocchio/profiles.yaml")
    return candidate if os.path.isfile(candidate) else ""


def run_step(rid, name, argv, cwd, timeout=180):
    log(f"running {name}: {' '.join(argv)}")
    result = subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        emit({
            "type": "response", "request_id": rid, "ok": False,
            "error": {
                "code": "E_STEP_FAILED",
                "message": f"{name} failed with exit code {result.returncode}: {(result.stderr or result.stdout)[:1000]}",
            },
        })
        return False
    return True


emit({
    "type": "handshake",
    "protocol_version": "v2",
    "plugin_name": "wesen-os",
    "capabilities": {
        "ops": ["config.mutate", "validate.run", "prepare.run", "build.run", "launch.plan", "command.run"],
        "commands": [
            {"name": "print-inference", "help": "Resolve and print each app's effective inference settings (API keys redacted)", "args_spec": []},
        ],
    },
})

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    req = json.loads(line)
    rid = req.get("request_id", "")
    op = req.get("op", "")
    ctx = req.get("ctx", {}) or {}
    inp = req.get("input", {}) or {}
    repo_root = os.path.abspath(ctx.get("repo_root") or os.getcwd())

    try:
        if op == "config.mutate":
            if env_bool("WESEN_OS_DYNAMIC_PORTS", False):
                backend_port = find_free_port(env_int("WESEN_OS_BACKEND_PORT", 8091))
                vite_port = find_free_port(env_int("WESEN_OS_VITE_PORT", 5273))
            else:
                backend_port = env_int("WESEN_OS_BACKEND_PORT", 8091)
                vite_port = env_int("WESEN_OS_VITE_PORT", 5273)
            backend_origin = f"http://127.0.0.1:{backend_port}"
            vite_origin = f"http://127.0.0.1:{vite_port}"
            profile = env_str("WESEN_OS_PROFILE")
            profile_registries = env_str("WESEN_OS_PROFILE_REGISTRIES") or default_profile_registries()
            arc_enabled = env_bool("WESEN_OS_ARC_ENABLED", False)

            log(f"config: backend={backend_origin} vite={vite_origin} "
                f"profile={profile or '(builtin default)'} "
                f"registries={profile_registries or '(none)'} arc={arc_enabled}")

            emit({
                "type": "response", "request_id": rid, "ok": True,
                "output": {"config_patch": {"set": {
                    "services.backend.port": backend_port,
                    "services.backend.url": backend_origin,
                    "services.vite.port": vite_port,
                    "services.vite.url": vite_origin,
                    "wesen_os.profile": profile,
                    "wesen_os.profile_registries": profile_registries,
                    "wesen_os.arc_enabled": arc_enabled,
                    "env.INVENTORY_CHAT_BACKEND": backend_origin,
                    "env.WESEN_OS_URL": vite_origin,
                }, "unset": []}},
            })

        elif op == "validate.run":
            errors, warnings = [], []
            launcher_app = os.path.join(repo_root, "apps", "os-launcher")
            node_modules = os.path.join(repo_root, "node_modules")
            for tool in ["go", "node", "pnpm"]:
                if shutil.which(tool) is None:
                    errors.append({"key": f"tool.{tool}", "message": f"required tool not found on PATH: {tool}"})
            if not os.path.isfile(os.path.join(repo_root, "go.mod")):
                errors.append({"key": "go.mod", "message": "go.mod not found at repo root"})
            if not os.path.isdir(launcher_app):
                errors.append({"key": "app.os-launcher", "message": "apps/os-launcher directory not found"})
            if not os.path.isdir(node_modules):
                warnings.append({"key": "node_modules", "message": "node_modules missing; devctl prepare will run pnpm install"})
            registries = env_str("WESEN_OS_PROFILE_REGISTRIES") or default_profile_registries()
            if not registries:
                warnings.append({"key": "profile.registries", "message": "no profile registry found (~/.config/pinocchio/profiles.yaml absent); backend will use builtin defaults and inference may fail with 'no API key'. Set WESEN_OS_PROFILE_REGISTRIES."})
            emit({"type": "response", "request_id": rid, "ok": True,
                  "output": {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}})

        elif op == "prepare.run":
            dry_run = bool(ctx.get("dry_run", False))
            node_modules = os.path.join(repo_root, "node_modules")
            steps = []
            if os.path.isdir(node_modules):
                steps.append({"name": "pnpm-install", "ok": True, "output": {"reason": "node_modules exists"}})
            elif dry_run:
                steps.append({"name": "pnpm-install", "ok": True, "output": {"reason": "dry-run; pnpm install would run"}})
            else:
                if not run_step(rid, "pnpm install", ["pnpm", "install"], repo_root, timeout=600):
                    continue
                steps.append({"name": "pnpm-install", "ok": True})
            emit({"type": "response", "request_id": rid, "ok": True, "output": {"steps": steps}})

        elif op == "build.run":
            dry_run = bool(ctx.get("dry_run", False))
            steps = []
            if not dry_run:
                if not run_step(rid, "go build launcher", ["go", "build", "./cmd/wesen-os-launcher/..."], repo_root, timeout=300):
                    continue
            steps.append({"name": "go-build-launcher", "ok": True, "output": {"dry_run": dry_run}})
            emit({"type": "response", "request_id": rid, "ok": True, "output": {"steps": steps}})

        elif op == "launch.plan":
            config = inp.get("config", {}) or {}
            services = config.get("services", {}) or {}
            backend_port = ((services.get("backend") or {}).get("port")) or 8091
            vite_port = ((services.get("vite") or {}).get("port")) or 5273
            wcfg = config.get("wesen_os", {}) or {}
            env_config = config.get("env", {}) or {}
            backend_origin = env_config.get("INVENTORY_CHAT_BACKEND", f"http://127.0.0.1:{backend_port}")

            data_dir = os.path.join(repo_root, "var", "devctl")
            backend_args = [
                "go", "run", "./cmd/wesen-os-launcher", "wesen-os-launcher",
                "--addr", f"127.0.0.1:{backend_port}",
                f"--arc-enabled={'true' if bool(wcfg.get('arc_enabled', False)) else 'false'}",
                "--inventory-db", os.path.join(data_dir, "inventory.db"),
                "--timeline-db", os.path.join(data_dir, "timeline.db"),
                "--turns-db", os.path.join(data_dir, "turns.db"),
            ]
            registries = str(wcfg.get("profile_registries") or "").strip()
            if registries:
                backend_args.extend(["--profile-registries", registries])
            profile = str(wcfg.get("profile") or "").strip()
            if profile:
                backend_args.extend(["--profile", profile])

            backend_cmd = f"mkdir -p {shlex.quote(data_dir)} && exec {shell_join(backend_args)}"
            vite_cmd = f"exec pnpm exec vite --host 127.0.0.1 --port {int(vite_port)} --clearScreen false"

            emit({
                "type": "response", "request_id": rid, "ok": True,
                "output": {"services": [
                    {
                        "name": "backend",
                        "cwd": ".",
                        "command": ["bash", "--noprofile", "--norc", "-lc", backend_cmd],
                        "health": {"type": "http", "url": f"http://127.0.0.1:{backend_port}/api/os/apps", "timeout_ms": 60000},
                    },
                    {
                        "name": "vite",
                        "cwd": "apps/os-launcher",
                        "command": ["bash", "--noprofile", "--norc", "-lc", vite_cmd],
                        "env": {"INVENTORY_CHAT_BACKEND": backend_origin},
                        "health": {"type": "http", "url": f"http://127.0.0.1:{vite_port}/", "timeout_ms": 60000},
                    },
                ]},
            })

        elif op == "command.run":
            cmd_name = inp.get("name") or inp.get("command") or ""
            if cmd_name != "print-inference":
                emit({"type": "response", "request_id": rid, "ok": False,
                      "error": {"code": "E_UNSUPPORTED", "message": f"unknown command: {cmd_name}"}})
                continue
            config = inp.get("config", {}) or {}
            wcfg = config.get("wesen_os", {}) or {}
            argv = ["go", "run", "./cmd/wesen-os-launcher", "wesen-os-launcher", "--print-inference-settings",
                    "--inventory-db", os.path.join(repo_root, "var", "devctl", "inventory.db"),
                    "--timeline-db", os.path.join(repo_root, "var", "devctl", "timeline.db"),
                    "--turns-db", os.path.join(repo_root, "var", "devctl", "turns.db")]
            registries = str(wcfg.get("profile_registries") or "").strip() or default_profile_registries()
            if registries:
                argv.extend(["--profile-registries", registries])
            profile = str(wcfg.get("profile") or "").strip()
            if profile:
                argv.extend(["--profile", profile])
            os.makedirs(os.path.join(repo_root, "var", "devctl"), exist_ok=True)
            result = subprocess.run(argv, cwd=repo_root, capture_output=True, text=True, timeout=120)
            if result.stdout.strip():
                log(result.stdout.strip())
            if result.stderr.strip():
                log(result.stderr.strip())
            emit({"type": "response", "request_id": rid, "ok": True, "output": {"exit_code": result.returncode}})

        else:
            emit({"type": "response", "request_id": rid, "ok": False,
                  "error": {"code": "E_UNSUPPORTED", "message": f"unsupported op: {op}"}})

    except Exception as e:  # noqa: BLE001 - surface any plugin error as protocol error
        log(f"error handling {op}: {e}")
        emit({"type": "response", "request_id": rid, "ok": False,
              "error": {"code": "E_PLUGIN", "message": str(e)}})
