package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/go-go-golems/glazed/pkg/cmds/values"
	"github.com/go-go-golems/go-go-app-inventory/pkg/inventorytools"
	profilebootstrap "github.com/go-go-golems/pinocchio/pkg/cmds/profilebootstrap"
	"github.com/stretchr/testify/require"
)

func writeIntegrationPinocchioProfiles(t *testing.T, dir string) string {
	t.Helper()

	require.NoError(t, os.MkdirAll(dir, 0o755))
	profilesPath := filepath.Join(dir, "profiles.yaml")
	profilesYAML := fmt.Sprintf(`slug: default
profiles:
  default:
    slug: default
    display_name: Default
    description: Baseline assistant profile with no app-specific middleware configuration.
    extensions:
      pinocchio.webchat_runtime@v1:
        system_prompt: You are a helpful inventory assistant.
  inventory:
    slug: inventory
    display_name: Inventory
    description: Tool-first inventory assistant profile.
    extensions:
      pinocchio.webchat_runtime@v1:
        system_prompt: You are an inventory assistant. Be concise, accurate, and tool-first.
        middlewares:
          - name: inventory_artifact_policy
            id: artifact-policy
          - name: inventory_suggestions_policy
            id: suggestions-policy
        tools:
%s
  analyst:
    slug: analyst
    display_name: Analyst
    description: Analysis-oriented profile for inventory reporting tasks.
    extensions:
      pinocchio.webchat_runtime@v1:
        system_prompt: You are an inventory analyst. Explain results with concise evidence.
        middlewares:
          - name: inventory_artifact_policy
            id: artifact-policy
          - name: inventory_suggestions_policy
            id: suggestions-policy
        tools:
%s
  planner:
    slug: planner
    display_name: Planner
    description: Planning-focused profile for restock and operations scenarios.
    extensions:
      pinocchio.webchat_runtime@v1:
        system_prompt: You are an inventory operations planner. Prioritize actionable next steps.
        middlewares:
          - name: inventory_artifact_policy
            id: artifact-policy
          - name: inventory_suggestions_policy
            id: suggestions-policy
        tools:
%s
  assistant:
    slug: assistant
    display_name: Assistant
    description: General-purpose OS assistant profile.
    extensions:
      pinocchio.webchat_runtime@v1:
        system_prompt: You are a helpful OS assistant. Be concise, clear, and direct.
`, yamlListItems(inventorytools.InventoryToolNames), yamlListItems(inventorytools.InventoryToolNames), yamlListItems(inventorytools.InventoryToolNames))
	require.NoError(t, os.WriteFile(profilesPath, []byte(profilesYAML), 0o644))
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

func yamlListItems(items []string) string {
	if len(items) == 0 {
		return "          []"
	}
	lines := make([]string, 0, len(items))
	for _, item := range items {
		lines = append(lines, "          - "+item)
	}
	return strings.Join(lines, "\n")
}
