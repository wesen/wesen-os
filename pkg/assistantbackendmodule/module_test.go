package assistantbackendmodule

import (
	"context"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestManifestContract(t *testing.T) {
	module := NewModule(Options{})
	manifest := module.Manifest()

	require.Equal(t, AppID, manifest.AppID)
	require.Equal(t, "Assistant", manifest.Name)
	require.False(t, manifest.Required)
	require.ElementsMatch(t, []string{"chat", "ws", "timeline", "profiles"}, manifest.Capabilities)
}

func TestLifecycleRequiresServer(t *testing.T) {
	module := NewModule(Options{})

	require.Error(t, module.Init(context.Background()))
	require.Error(t, module.Start(context.Background()))
	require.Error(t, module.Health(context.Background()))
	require.NoError(t, module.Stop(context.Background()))
}

func TestMountRoutesRequiresService(t *testing.T) {
	module := NewModule(Options{})

	require.Error(t, module.MountRoutes(nil))
	require.Error(t, module.MountRoutes(http.NewServeMux()))
}
