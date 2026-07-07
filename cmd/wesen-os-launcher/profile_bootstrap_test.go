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

	require.Equal(t, []string{profilesPath}, bootstrap.ProfileRegistries)
	require.Equal(t, "analyst", bootstrap.SelectedProfile)
	require.Equal(t, "analyst", bootstrap.SelectedProfileSlug.String())
	require.Equal(t, "default", bootstrap.DefaultRegistrySlug.String())
	require.NotNil(t, bootstrap.ProfileRegistry)
	require.NotNil(t, bootstrap.BaseInferenceSettings)
}

func TestResolveLauncherProfileBootstrap_UsesConfigFileProfileSettingsAndBaseInferenceSettings(t *testing.T) {
	tmpDir := t.TempDir()
	profilesPath := writeIntegrationPinocchioProfiles(t, tmpDir)
	configPath := filepath.Join(tmpDir, "pinocchio-config.yaml")
	require.NoError(t, os.WriteFile(configPath, []byte("profile:\n  active: analyst\n  registries:\n    - "+profilesPath+"\n"), 0o644))

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

	require.Equal(t, "analyst", bootstrap.SelectedProfile)
	require.Equal(t, []string{profilesPath}, bootstrap.ProfileRegistries)
	require.NotNil(t, bootstrap.ProfileRegistry)
	require.Contains(t, bootstrap.ConfigFiles, configPath)
}

// Note: PINOCCHIO_* env overrides are applied by the pinocchio cobra middleware
// chain (GetPinocchioCommandMiddlewares → sources.FromEnv), which these unit
// tests bypass via NewCLISelectionValues. Env-override resolution is covered by
// pinocchio's own profilebootstrap tests since the profile-first config change.

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

	require.Equal(t, []string{profilesPath}, bootstrap.ProfileRegistries)
	require.Equal(t, "default", bootstrap.DefaultRegistrySlug.String())
	require.True(t, bootstrap.SelectedProfileSlug.IsZero())
	require.NotNil(t, bootstrap.ProfileRegistry)
}
