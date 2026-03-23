package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/go-go-golems/glazed/pkg/cmds/values"
	profilebootstrap "github.com/go-go-golems/pinocchio/pkg/cmds/profilebootstrap"
	"github.com/stretchr/testify/require"
)

func writeIntegrationPinocchioProfiles(t *testing.T, dir string) string {
	t.Helper()

	require.NoError(t, os.MkdirAll(dir, 0o755))
	fixturePath := filepath.Join("testdata", "pinocchio", "profiles.yaml")
	fixtureBytes, err := os.ReadFile(fixturePath)
	require.NoError(t, err)
	profilesPath := filepath.Join(dir, "profiles.yaml")
	require.NoError(t, os.WriteFile(profilesPath, fixtureBytes, 0o644))
	return profilesPath
}

func newIntegrationLauncherBootstrap(t *testing.T) (*values.Values, *launcherProfileBootstrap) {
	t.Helper()
	return newIntegrationLauncherBootstrapWithSelection(t, "")
}

func newIntegrationLauncherBootstrapWithSelection(t *testing.T, profile string) (*values.Values, *launcherProfileBootstrap) {
	t.Helper()

	tmpDir := t.TempDir()
	profilesPath := writeIntegrationPinocchioProfiles(t, tmpDir)
	parsed, err := profilebootstrap.NewCLISelectionValues(profilebootstrap.CLISelectionInput{
		Profile:           strings.TrimSpace(profile),
		ProfileRegistries: []string{profilesPath},
	})
	require.NoError(t, err)

	bootstrap, err := resolveLauncherProfileBootstrap(context.Background(), parsed)
	require.NoError(t, err)
	t.Cleanup(func() {
		if bootstrap != nil && bootstrap.Close != nil {
			bootstrap.Close()
		}
	})
	return parsed, bootstrap
}
