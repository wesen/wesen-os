package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	"github.com/go-go-golems/glazed/pkg/cmds/values"
	profilebootstrap "github.com/go-go-golems/pinocchio/pkg/cmds/profilebootstrap"
	"github.com/pkg/errors"
)

type launcherProfileBootstrap struct {
	BaseInferenceSettings *aisettings.InferenceSettings
	ProfileSelection      *profilebootstrap.ResolvedCLIProfileSelection
	SelectedProfileSlug   gepprofiles.EngineProfileSlug
	ProfileRegistry       gepprofiles.Registry
	DefaultRegistrySlug   gepprofiles.RegistrySlug
	ConfigFiles           []string
	Close                 func()
}

func resolveLauncherProfileBootstrap(ctx context.Context, parsed *values.Values) (*launcherProfileBootstrap, error) {
	baseInferenceSettings, configFiles, err := profilebootstrap.ResolveBaseInferenceSettings(parsed)
	if err != nil {
		return nil, err
	}
	profileSelection, err := profilebootstrap.ResolveCLIProfileSelection(parsed)
	if err != nil {
		return nil, err
	}
	if len(profileSelection.ProfileRegistries) == 0 {
		if defaultPath := defaultPinocchioProfilesPathIfPresent(); defaultPath != "" {
			profileSelection.ProfileRegistries = []string{defaultPath}
		}
	}
	if len(profileSelection.ProfileRegistries) == 0 {
		return nil, &gepprofiles.ValidationError{
			Field:  "profile-settings.profile-registries",
			Reason: "must be configured",
		}
	}

	specs, err := gepprofiles.ParseRegistrySourceSpecs(profileSelection.ProfileRegistries)
	if err != nil {
		return nil, errors.Wrap(err, "parse profile registry source specs")
	}
	registryChain, err := gepprofiles.NewChainedRegistryFromSourceSpecs(ctx, specs)
	if err != nil {
		return nil, errors.Wrap(err, "initialize profile registry")
	}

	selectedProfileSlug := gepprofiles.EngineProfileSlug("")
	if strings.TrimSpace(profileSelection.Profile) != "" {
		selectedProfileSlug, err = gepprofiles.ParseEngineProfileSlug(profileSelection.Profile)
		if err != nil {
			_ = registryChain.Close()
			return nil, err
		}
	}

	selectionCopy := *profileSelection
	selectionCopy.ProfileRegistries = append([]string(nil), profileSelection.ProfileRegistries...)
	configFilesCopy := append([]string(nil), configFiles...)

	return &launcherProfileBootstrap{
		BaseInferenceSettings: cloneInferenceSettings(baseInferenceSettings),
		ProfileSelection:      &selectionCopy,
		SelectedProfileSlug:   selectedProfileSlug,
		ProfileRegistry:       registryChain,
		DefaultRegistrySlug:   registryChain.DefaultRegistrySlug(),
		ConfigFiles:           configFilesCopy,
		Close: func() {
			_ = registryChain.Close()
		},
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
