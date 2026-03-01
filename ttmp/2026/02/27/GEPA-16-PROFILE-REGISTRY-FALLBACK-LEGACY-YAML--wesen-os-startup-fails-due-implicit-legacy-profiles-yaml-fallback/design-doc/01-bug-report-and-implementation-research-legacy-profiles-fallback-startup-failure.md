---
Title: 'Bug report and implementation research: legacy profiles fallback startup failure'
Ticket: GEPA-16-PROFILE-REGISTRY-FALLBACK-LEGACY-YAML
Status: active
Topics:
    - bug
    - geppetto
    - pinocchio
    - profile-registry
    - config
    - wesen-os
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../geppetto/pkg/profiles/codec_yaml_runtime.go
      Note: Strict runtime YAML decoder rejecting legacy profile-map format
    - Path: ../../../../../../../geppetto/pkg/profiles/source_chain.go
      Note: YAML source loader where file-path error context should be improved
    - Path: ../../../../../../../geppetto/pkg/sections/sections.go
      Note: Contains implicit pinocchio fallback and bootstrap parsing precedence
    - Path: ../../../../../../../pinocchio/cmd/pinocchio/cmds/profiles_migrate_legacy.go
      Note: Migration command used in diagnostics and remediation
    - Path: ../../../../../../../wesen-os/cmd/wesen-os-launcher/main.go
      Note: Launcher wires geppetto middlewares and reproduces host-coupled fallback behavior
    - Path: ../../../../../../../wesen-os/scripts/smoke-wesen-os-launcher.sh
      Note: Shows stable explicit profile-registry startup pattern used in smoke
ExternalSources: []
Summary: Root-cause report and source-level remediation plan for implicit legacy profile fallback startup failures.
LastUpdated: 2026-02-28T09:10:00-05:00
WhatFor: Provide a bug report and implementation-grade source remediation plan for implicit legacy profile fallback failures affecting wesen-os and other geppetto consumers.
WhenToUse: Use when launcher/startup commands fail with runtime YAML legacy-format errors and the team needs a source fix in geppetto/pinocchio middleware bootstrap.
---


# Bug report and implementation research: legacy profiles fallback startup failure

## Executive Summary

`wesen-os-launcher` can fail at startup before any app modules are mounted because geppetto middleware bootstrap implicitly loads `${XDG_CONFIG_HOME:-~/.config}/pinocchio/profiles.yaml` when `profile-registries` is unset. On this workstation, that file is in legacy map format, so strict runtime YAML decode fails with:

`validation error (registry): runtime YAML must be a single registry document (legacy profile-map format is not supported)`

This behavior is currently source-driven, not `wesen-os`-specific:

1. `wesen-os` wires `geppettosections.GetCobraCommandGeppettoMiddlewares`.
2. geppetto middleware bootstrap falls back to a hardcoded pinocchio config path.
3. runtime YAML loader intentionally rejects legacy map format.

The immediate operator workaround is to pass an explicit runtime-registry source via `--profile-registries` (or set `PINOCCHIO_PROFILE_REGISTRIES`) to a valid single-registry YAML/SQLite source.

The source-level fix should be implemented in `geppetto` and adopted in `pinocchio`/`wesen-os`:

1. Make fallback behavior configurable per host app instead of hardcoding `pinocchio`.
2. Improve decode/source errors to include source path and migration command hint.
3. Keep strict runtime format enforcement, but provide deterministic diagnostics and host-specific defaults.

## Problem Statement

### Symptom

Running:

```bash
cd wesen-os
go run ./cmd/wesen-os-launcher wesen-os-launcher --addr :8091
```

fails with:

```text
validation error (registry): runtime YAML must be a single registry document (legacy profile-map format is not supported)
```

### Expected behavior

For a new `wesen-os` run with no explicit profile registry flags:

1. startup should either succeed with explicit defaults owned by the launcher, or
2. fail with a direct actionable error that names the exact file/source and next step.

### Actual behavior

Startup fails with a generic validation error that does not identify the failing file/source, even though the failing source is implicitly selected by middleware bootstrap.

### Business and engineering impact

1. Non-obvious startup failures for `wesen-os` users.
2. Cross-app coupling: `wesen-os` behavior depends on `pinocchio` config files.
3. Onboarding friction: operators cannot quickly diagnose whether issue is env/config/default fallback.
4. Hidden policy mismatch: hard-cutover messaging says no profile-file fallback, but code still auto-loads default file if present.

## Current-State Analysis (Evidence)

### A. `wesen-os` pulls geppetto middleware bootstrap directly

- `wesen-os/cmd/wesen-os-launcher/main.go:441` wires:
  - `cli.WithCobraMiddlewaresFunc(geppettosections.GetCobraCommandGeppettoMiddlewares)`

This means `wesen-os` inherits geppetto profile bootstrap behavior exactly as-is.

### B. geppetto middleware bootstrap has implicit `pinocchio/profiles.yaml` fallback

- `geppetto/pkg/sections/sections.go:139-149`:
  - `defaultPinocchioProfileRegistriesIfPresent()` computes `${UserConfigDir}/pinocchio/profiles.yaml`.
- `geppetto/pkg/sections/sections.go:286-289`:
  - If `profile-settings.profile-registries` is empty, it auto-loads that default path.
- `geppetto/pkg/sections/sections.go:245`:
  - config path resolution is hardcoded to app key `"pinocchio"`.

This creates host-app coupling even when caller is `wesen-os`.

### C. Runtime YAML decode intentionally rejects legacy map format

- `geppetto/pkg/profiles/codec_yaml_runtime.go:33-35` rejects non-single-registry shape with:
  - `legacy profile-map format is not supported`
- `geppetto/pkg/profiles/codec_yaml_test.go:8-23` asserts rejection of legacy map.

Strictness is intentional and correct for hard cutover.

### D. Source error context is currently weak

- `geppetto/pkg/profiles/source_chain.go:498-506` reads file and decodes runtime YAML.
- decode error is returned without wrapping file path context.
- top-level startup error only exposes field-level validation message.

### E. Docs and tests confirm fallback exists today

- `pinocchio/README.md:88-91` documents automatic fallback to default `profiles.yaml` if present.
- `geppetto/pkg/doc/topics/01-profiles.md:258-260` documents precedence including default path fallback.
- `geppetto/pkg/sections/profile_registry_source_test.go:260-319` has dedicated test asserting fallback to XDG default profiles file.

### F. `wesen-os` smoke already bypasses this by supplying explicit runtime registry

- `wesen-os/scripts/smoke-wesen-os-launcher.sh:39-48` writes temp runtime single-registry YAML.
- `wesen-os/scripts/smoke-wesen-os-launcher.sh:85-87` launches with explicit `--profile-registries`.

This is a strong signal that explicit source declaration is the stable path.

## Root Cause

The failure is deterministic:

```text
wesen-os launcher
  -> geppetto middleware bootstrap
      -> profile-registries empty?
          -> yes -> auto-load ~/.config/pinocchio/profiles.yaml
              -> file is legacy profile-map
                  -> runtime YAML decoder rejects
                      -> startup aborts with generic validation error
```

The bug has two dimensions:

1. Product behavior bug: host app (`wesen-os`) unintentionally consumes `pinocchio` default files.
2. Diagnostics bug: failure message omits source path and migration guidance.

## Proposed Solution

### Solution goals

1. Keep strict runtime format checks (do not reintroduce legacy runtime compatibility).
2. Remove unintended cross-app coupling.
3. Make failure diagnostics operator-grade (path plus next command).
4. Preserve predictable precedence rules.

### Architecture direction

Introduce a configurable geppetto middleware bootstrap API and keep current function as pinocchio-compatible wrapper.

#### Proposed API surface (geppetto)

```go
type ProfileRegistryBootstrapOptions struct {
    // AppName scopes ResolveAppConfigPath and default config folder.
    AppName string // e.g. "pinocchio", "wesen-os", "gepa-runner"

    // EnableImplicitDefaultRegistryPath controls fallback when profile-registries is unset.
    EnableImplicitDefaultRegistryPath bool

    // Optional override for default registry source path.
    // If nil, derive from AppName + UserConfigDir.
    ResolveImplicitRegistryPath func(appName string) (string, error)
}

func GetCobraCommandGeppettoMiddlewaresWithOptions(
    parsed *values.Values,
    cmd *cobra.Command,
    args []string,
    opts ProfileRegistryBootstrapOptions,
) ([]sources.Middleware, error)
```

Keep existing function:

```go
func GetCobraCommandGeppettoMiddlewares(...) ([]sources.Middleware, error)
```

as:

```go
// pinocchio-compatible default wrapper
return GetCobraCommandGeppettoMiddlewaresWithOptions(..., ProfileRegistryBootstrapOptions{
    AppName: "pinocchio",
    EnableImplicitDefaultRegistryPath: true,
})
```

### Error UX improvements

When decode fails for YAML source:

1. Include source path in wrapped error.
2. If error indicates legacy map format, include migration hint:
   - `pinocchio profiles migrate-legacy --input <path> --output <path>.runtime.yaml`
3. Include explicit note about setting `--profile-registries` for non-pinocchio hosts.

#### Example target error

```text
initialize profile registry: load YAML source "/home/user/.config/pinocchio/profiles.yaml":
validation error (registry): runtime YAML must be a single registry document (legacy profile-map format is not supported)
hint: migrate file with `pinocchio profiles migrate-legacy --input ...`
```

## Design Decisions

1. Preserve strict decode rules in `DecodeRuntimeYAMLSingleRegistry`.
2. Move host policy into options rather than hidden hardcoded behavior.
3. Keep pinocchio operator ergonomics by preserving current wrapper behavior.
4. Make source path and migration guidance first-class in errors.

## Alternatives Considered

### 1. Accept legacy map at runtime again

Rejected.

Reason: conflicts with hard cutover and reintroduces dual runtime semantics.

### 2. Keep fallback as-is; only improve docs

Rejected.

Reason: does not solve cross-app coupling or startup surprise for non-pinocchio hosts.

### 3. Disable implicit fallback globally for all hosts immediately

Partially rejected (too disruptive as one-shot change).

Reason: pinocchio workflows explicitly rely on fallback and docs/tests assert it.

Preferred approach: make fallback explicit and host-configurable, then migrate hosts deliberately.

### 4. Fix only `wesen-os` locally by always passing temp `--profile-registries`

Useful tactical workaround, but insufficient as source fix.

Reason: other geppetto consumers (`go-go-gepa`, examples, other binaries) remain exposed to same coupling and diagnostics issues.

## Implementation Plan

### Phase 0: Tactical operator mitigation (already available)

1. Use explicit runtime registry source in launch commands.
2. Keep smoke script pattern as canonical local workaround.

### Phase 1: geppetto middleware bootstrap options

1. Add `GetCobraCommandGeppettoMiddlewaresWithOptions`.
2. Route app config resolution through `opts.AppName` instead of hardcoded `"pinocchio"`.
3. Gate implicit fallback by `opts.EnableImplicitDefaultRegistryPath`.
4. Keep old function as wrapper for compatibility.

### Phase 2: Source error context and migration hints

1. Wrap YAML load/decode failures with source path in `source_chain.go`.
2. Detect legacy-format error and append migration hint.
3. Add tests asserting error contains source path and hint.

### Phase 3: Host adoption

1. `pinocchio` remains on wrapper defaults (`EnableImplicit... = true`).
2. `wesen-os` switches to explicit options:
   - `AppName: "wesen-os"`
   - `EnableImplicitDefaultRegistryPath: false`
3. `go-go-gepa` runner decides policy explicitly (likely false for deterministic CI/runtime).

### Phase 4: Documentation alignment

1. Update geppetto profile docs to explain host-specific fallback policy.
2. Update pinocchio docs to state fallback is pinocchio policy, not universal geppetto behavior.
3. Add wesen-os runbook requiring explicit `--profile-registries` or provisioned runtime registry.

## Pseudocode (Target Flow)

```go
func resolveProfileRegistries(raw string, opts ProfileRegistryBootstrapOptions) (string, error) {
    if strings.TrimSpace(raw) != "" {
        return raw, nil
    }
    if !opts.EnableImplicitDefaultRegistryPath {
        return "", nil
    }
    resolver := opts.ResolveImplicitRegistryPath
    if resolver == nil {
        resolver = defaultRegistryPathResolver
    }
    path, err := resolver(opts.AppName)
    if err != nil {
        return "", err
    }
    return path, nil
}
```

```go
func loadRuntimeYAMLSource(path string) ([]*ProfileRegistry, error) {
    b, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read profile registry YAML %q: %w", path, err)
    }
    reg, err := DecodeRuntimeYAMLSingleRegistry(b)
    if err != nil {
        if isLegacyMapError(err) {
            return nil, fmt.Errorf(
                "decode profile registry YAML %q: %w; hint: run `pinocchio profiles migrate-legacy --input %s --output %s.runtime.yaml`",
                path, err, path, path,
            )
        }
        return nil, fmt.Errorf("decode profile registry YAML %q: %w", path, err)
    }
    if reg == nil {
        return nil, nil
    }
    return []*ProfileRegistry{reg}, nil
}
```

## Testing and Validation Strategy

### Unit tests (geppetto)

1. fallback disabled + empty `profile-registries` => required-setting error.
2. fallback enabled + valid runtime YAML at default path => success.
3. fallback enabled + legacy map at default path => error includes file path + migration hint.
4. app-name-scoped config lookup uses provided app name.

### Integration tests

1. `wesen-os` command bootstrap with options:
   - no implicit fallback
   - deterministic failure when sources missing
2. `pinocchio` still resolves default path when present.

### Manual validation matrix

1. user HOME with legacy `~/.config/pinocchio/profiles.yaml`:
   - `wesen-os` should no longer silently consume it once fallback is disabled for wesen.
2. explicit `--profile-registries` valid file:
   - both hosts start.
3. explicit legacy source:
   - both hosts fail with path-specific migration hint.

## Risks and Tradeoffs

1. API expansion in geppetto sections may require touch points in several binaries.
2. If wrapper/default behavior changes accidentally, pinocchio operator workflows can regress.
3. Error-message assertions in tests may be brittle; match stable substrings.

Mitigations:

1. Keep legacy function wrapper for pinocchio defaults.
2. Add host-specific regression tests before changing callers.
3. Ship docs and code changes atomically.

## Open Questions

1. Should `go-go-gepa` runner also disable implicit fallback by default?
2. Should we add a dedicated `profiles doctor` command to detect legacy-map files proactively?
3. Should migration hints reference a generic geppetto command as well for non-pinocchio hosts?

## References

### Reproduction and host wiring

1. `wesen-os/cmd/wesen-os-launcher/main.go:441`
2. `wesen-os/scripts/smoke-wesen-os-launcher.sh:39-48`
3. `wesen-os/scripts/smoke-wesen-os-launcher.sh:83-87`

### geppetto fallback and decode behavior

1. `geppetto/pkg/sections/sections.go:139-149`
2. `geppetto/pkg/sections/sections.go:245`
3. `geppetto/pkg/sections/sections.go:286-289`
4. `geppetto/pkg/profiles/codec_yaml_runtime.go:33-35`
5. `geppetto/pkg/profiles/source_chain.go:498-506`

### Validation/tests/docs

1. `geppetto/pkg/sections/profile_registry_source_test.go:260-319`
2. `geppetto/pkg/profiles/codec_yaml_test.go:8-23`
3. `pinocchio/README.md:88-91`
4. `geppetto/pkg/doc/topics/01-profiles.md:258-260`
5. `pinocchio/cmd/pinocchio/cmds/profiles_migrate_legacy.go:121-169`
