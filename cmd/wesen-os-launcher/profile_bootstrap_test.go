package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/go-go-golems/glazed/pkg/cmds/values"
	profilebootstrap "github.com/go-go-golems/pinocchio/pkg/cmds/profilebootstrap"
	"github.com/stretchr/testify/require"
)

func TestResolveLauncherProfileBootstrap_UsesCLIProfileSelectionAndRegistries(t *testing.T) {
	tmpDir := t.TempDir()
	profilesPath := writeIntegrationPinocchioProfiles(t, tmpDir)
	parsed, err := profilebootstrap.NewCLISelectionValues(profilebootstrap.CLISelectionInput{
		Profile:           "analyst",
		ProfileRegistries: []string{profilesPath},
	})
	require.NoError(t, err)

	bootstrap, err := resolveLauncherProfileBootstrap(context.Background(), parsed)
	require.NoError(t, err)
	t.Cleanup(func() {
		if bootstrap.Close != nil {
			bootstrap.Close()
		}
	})

	require.Equal(t, []string{profilesPath}, bootstrap.ProfileSelection.ProfileRegistries)
	require.Equal(t, "analyst", bootstrap.ProfileSelection.Profile)
	require.Equal(t, "analyst", bootstrap.SelectedProfileSlug.String())
	require.Equal(t, "default", bootstrap.DefaultRegistrySlug.String())
	require.NotNil(t, bootstrap.ProfileRegistry)
	require.NotNil(t, bootstrap.BaseInferenceSettings)
}

func TestResolveLauncherProfileBootstrap_UsesConfigFileProfileSettingsAndBaseInferenceSettings(t *testing.T) {
	tmpDir := t.TempDir()
	profilesPath := writeIntegrationPinocchioProfiles(t, tmpDir)
	configPath := filepath.Join(tmpDir, "pinocchio-config.yaml")
	require.NoError(t, os.WriteFile(configPath, []byte("profile-settings:\n  profile: analyst\n  profile-registries:\n    - "+profilesPath+"\nai-chat:\n  ai-engine: config-engine\nopenai-chat:\n  openai-api-key: config-key\n"), 0o644))

	parsed, err := profilebootstrap.NewCLISelectionValues(profilebootstrap.CLISelectionInput{
		ConfigFile: configPath,
	})
	require.NoError(t, err)

	bootstrap, err := resolveLauncherProfileBootstrap(context.Background(), parsed)
	require.NoError(t, err)
	t.Cleanup(func() {
		if bootstrap.Close != nil {
			bootstrap.Close()
		}
	})

	require.Equal(t, "analyst", bootstrap.ProfileSelection.Profile)
	require.Equal(t, []string{profilesPath}, bootstrap.ProfileSelection.ProfileRegistries)
	require.NotNil(t, bootstrap.BaseInferenceSettings.Chat.Engine)
	require.Equal(t, "config-engine", *bootstrap.BaseInferenceSettings.Chat.Engine)
	require.Equal(t, "config-key", bootstrap.BaseInferenceSettings.API.APIKeys["openai-api-key"])
	require.Contains(t, bootstrap.ConfigFiles, configPath)
}

func TestResolveLauncherProfileBootstrap_UsesPINOCCHIOEnvOverrides(t *testing.T) {
	tmpDir := t.TempDir()
	configProfilesPath := writeIntegrationPinocchioProfiles(t, filepath.Join(tmpDir, "config"))
	envProfilesPath := writeIntegrationPinocchioProfiles(t, filepath.Join(tmpDir, "env"))
	configPath := filepath.Join(tmpDir, "pinocchio-config.yaml")
	require.NoError(t, os.WriteFile(configPath, []byte("profile-settings:\n  profile: inventory\n  profile-registries:\n    - "+configProfilesPath+"\nai-chat:\n  ai-engine: config-engine\nopenai-chat:\n  openai-api-key: config-key\n"), 0o644))

	t.Setenv("PINOCCHIO_PROFILE", "analyst")
	t.Setenv("PINOCCHIO_PROFILE_REGISTRIES", envProfilesPath)
	t.Setenv("PINOCCHIO_AI_ENGINE", "env-engine")

	parsed, err := profilebootstrap.NewCLISelectionValues(profilebootstrap.CLISelectionInput{
		ConfigFile: configPath,
	})
	require.NoError(t, err)

	bootstrap, err := resolveLauncherProfileBootstrap(context.Background(), parsed)
	require.NoError(t, err)
	t.Cleanup(func() {
		if bootstrap.Close != nil {
			bootstrap.Close()
		}
	})

	require.Equal(t, "analyst", bootstrap.ProfileSelection.Profile)
	require.Equal(t, []string{envProfilesPath}, bootstrap.ProfileSelection.ProfileRegistries)
	require.NotNil(t, bootstrap.BaseInferenceSettings.Chat.Engine)
	require.Equal(t, "env-engine", *bootstrap.BaseInferenceSettings.Chat.Engine)
	require.Equal(t, "config-key", bootstrap.BaseInferenceSettings.API.APIKeys["openai-api-key"])
}

func TestResolveLauncherProfileBootstrap_FallsBackToDefaultPinocchioProfilesPath(t *testing.T) {
	tmpDir := t.TempDir()
	xdgConfigHome := filepath.Join(tmpDir, "xdg")
	profilesDir := filepath.Join(xdgConfigHome, "pinocchio")
	require.NoError(t, os.MkdirAll(profilesDir, 0o755))
	profilesPath := writeIntegrationPinocchioProfiles(t, profilesDir)
	t.Setenv("XDG_CONFIG_HOME", xdgConfigHome)
	t.Setenv("HOME", tmpDir)

	bootstrap, err := resolveLauncherProfileBootstrap(context.Background(), values.New())
	require.NoError(t, err)
	t.Cleanup(func() {
		if bootstrap.Close != nil {
			bootstrap.Close()
		}
	})

	require.Equal(t, []string{profilesPath}, bootstrap.ProfileSelection.ProfileRegistries)
	require.Equal(t, "default", bootstrap.DefaultRegistrySlug.String())
	require.True(t, bootstrap.SelectedProfileSlug.IsZero())
	require.NotNil(t, bootstrap.ProfileRegistry)
}
