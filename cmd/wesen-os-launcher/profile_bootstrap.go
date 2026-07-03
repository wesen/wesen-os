package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-go-golems/geppetto/pkg/cli/bootstrap"
	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	"github.com/go-go-golems/glazed/pkg/cmds/values"
	profilebootstrap "github.com/go-go-golems/pinocchio/pkg/cmds/profilebootstrap"
	"github.com/pkg/errors"
)

type launcherProfileBootstrap struct {
	BaseInferenceSettings *aisettings.InferenceSettings
	// ResolvedBaseSettings is the fully-resolved effective inference settings of
	// the launcher-selected profile (its stack flattened: engine, api_type, API
	// keys). App profile surfaces overlay their own profiles (system prompts,
	// tool policy) on top of this, so every app inherits the operator-selected
	// engine and credentials without re-declaring them per app.
	ResolvedBaseSettings *aisettings.InferenceSettings
	SelectedProfile      string
	SelectedProfileSlug  gepprofiles.EngineProfileSlug
	ProfileRegistries    []string
	ProfileRegistry      gepprofiles.Registry
	DefaultRegistrySlug  gepprofiles.RegistrySlug
	ConfigFiles          []string
	Close                func()
}

func resolveLauncherProfileBootstrap(ctx context.Context, parsed *values.Values) (*launcherProfileBootstrap, error) {
	baseInferenceSettings, configFiles, err := profilebootstrap.ResolveBaseInferenceSettings(parsed)
	if err != nil {
		return nil, err
	}
	profileRuntime, err := profilebootstrap.ResolveCLIProfileRuntime(ctx, parsed)
	if err != nil {
		return nil, err
	}
	closeFns := []func(){}
	if profileRuntime.Close != nil {
		closeFns = append(closeFns, profileRuntime.Close)
	}
	closeAll := func() {
		for _, fn := range closeFns {
			fn()
		}
	}

	selection := profileRuntime.ProfileSettings
	effectiveRegistries := append([]string(nil), selection.ProfileRegistries...)
	registryChain := profileRuntime.ProfileRegistryChain
	if registryChain == nil || registryChain.Registry == nil {
		if len(effectiveRegistries) == 0 {
			if defaultPath := defaultPinocchioProfilesPathIfPresent(); defaultPath != "" {
				effectiveRegistries = []string{defaultPath}
			}
		}
		if len(effectiveRegistries) == 0 {
			closeAll()
			return nil, &gepprofiles.ValidationError{
				Field:  "profile-settings.profile-registries",
				Reason: "must be configured",
			}
		}
		registryChain, err = bootstrap.ResolveProfileRegistryChain(ctx, bootstrap.ProfileSettings{
			Profile:           selection.Profile,
			ProfileRegistries: effectiveRegistries,
		})
		if err != nil {
			closeAll()
			return nil, errors.Wrap(err, "initialize profile registry")
		}
		if registryChain.Close != nil {
			closeFns = append(closeFns, registryChain.Close)
		}
	}

	selectedProfileSlug := gepprofiles.EngineProfileSlug("")
	if strings.TrimSpace(selection.Profile) != "" {
		selectedProfileSlug, err = gepprofiles.ParseEngineProfileSlug(selection.Profile)
		if err != nil {
			closeAll()
			return nil, err
		}
	}

	// Resolve the selected profile's full effective settings so app surfaces can
	// inherit its engine + credentials as their base. Fall back to the registry
	// default profile when no explicit profile was selected.
	resolveSlug := selectedProfileSlug
	if resolveSlug.IsZero() {
		resolveSlug = registryChain.DefaultProfileResolve.EngineProfileSlug
	}
	resolvedBase := cloneInferenceSettings(baseInferenceSettings)
	if !resolveSlug.IsZero() {
		resolved, resolveErr := registryChain.Registry.ResolveEngineProfile(ctx, gepprofiles.ResolveInput{
			RegistrySlug:      registryChain.DefaultRegistrySlug,
			EngineProfileSlug: resolveSlug,
		})
		if resolveErr == nil && resolved != nil {
			merged, mergeErr := gepprofiles.MergeInferenceSettings(baseInferenceSettings, resolved.InferenceSettings)
			if mergeErr == nil {
				resolvedBase = merged
			}
		}
	}

	return &launcherProfileBootstrap{
		BaseInferenceSettings: cloneInferenceSettings(baseInferenceSettings),
		ResolvedBaseSettings:  resolvedBase,
		SelectedProfile:       selection.Profile,
		SelectedProfileSlug:   selectedProfileSlug,
		ProfileRegistries:     effectiveRegistries,
		ProfileRegistry:       registryChain.Registry,
		DefaultRegistrySlug:   registryChain.DefaultRegistrySlug,
		ConfigFiles:           append([]string(nil), configFiles...),
		Close:                 closeAll,
	}, nil
}

func defaultPinocchioProfilesPathIfPresent() string {
	configDir, err := os.UserConfigDir()
	if err != nil || strings.TrimSpace(configDir) == "" {
		return ""
	}
	path := filepath.Join(configDir, "pinocchio", "profiles.yaml")
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return ""
	}
	return path
}

func cloneInferenceSettings(in *aisettings.InferenceSettings) *aisettings.InferenceSettings {
	if in == nil {
		return nil
	}
	return in.Clone()
}
