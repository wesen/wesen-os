package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
	"github.com/go-go-golems/geppetto/pkg/events"
	"github.com/go-go-golems/geppetto/pkg/inference/middlewarecfg"
	"github.com/go-go-golems/geppetto/pkg/turns"
	"github.com/go-go-golems/glazed/pkg/cmds/values"
	profilechat "github.com/go-go-golems/go-go-os-chat/pkg/profilechat"
	infruntime "github.com/go-go-golems/pinocchio/pkg/inference/runtime"
	chatstore "github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
	webchat "github.com/go-go-golems/pinocchio/pkg/webchat"
	v1 "github.com/go-go-golems/plz-confirm/proto/generated/go/plz_confirm/v1"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protojson"

	inventorybackendmodule "github.com/go-go-golems/go-go-app-inventory/pkg/backendmodule"
	"github.com/go-go-golems/go-go-app-inventory/pkg/pinoweb"
	"github.com/go-go-golems/go-go-app-sqlite/pkg/sqliteapp"
	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
	arcagibackend "github.com/go-go-golems/wesen-os/pkg/arcagi"
	assistantbackendmodule "github.com/go-go-golems/wesen-os/pkg/assistantbackendmodule"
	gepabackend "github.com/go-go-golems/wesen-os/pkg/gepa"
	"github.com/go-go-golems/wesen-os/pkg/launcherui"
	sqlitebackend "github.com/go-go-golems/wesen-os/pkg/sqlite"
)

type integrationNoopEngine struct{}

func (integrationNoopEngine) RunInference(_ context.Context, t *turns.Turn) (*turns.Turn, error) {
	return t, nil
}

type integrationStructuredEngine struct{}

func (integrationStructuredEngine) RunInference(ctx context.Context, t *turns.Turn) (*turns.Turn, error) {
	meta := events.EventMetadata{ID: uuid.New()}
	events.PublishEventToContext(ctx, events.NewStartEvent(meta))

	part1 := "Inventory snapshot generated.\n<hypercard:widget:v1>\n```yaml\ntype: report\n"
	cumulative := part1
	events.PublishEventToContext(ctx, events.NewPartialCompletionEvent(meta, part1, cumulative))

	part2 := "" +
		"title: Integration Widget\n" +
		"artifact:\n" +
		"  id: integration-widget\n" +
		"  data:\n" +
		"    totalItems: 10\n" +
		"```\n" +
		"</hypercard:widget:v1>"
	cumulative += part2
	events.PublishEventToContext(ctx, events.NewPartialCompletionEvent(meta, part2, cumulative))
	events.PublishEventToContext(ctx, events.NewFinalEvent(meta, cumulative))

	out := t.Clone()
	if out == nil {
		out = &turns.Turn{}
	}
	turns.AppendBlock(out, turns.NewAssistantTextBlock(cumulative))
	return out, nil
}

type integrationNoopSink struct{}

func (integrationNoopSink) PublishEvent(events.Event) error { return nil }

const integrationAppBasePath = "/api/apps/inventory"
const integrationAssistantAppBasePath = "/api/apps/assistant"
const integrationGepaAppBasePath = "/api/apps/gepa"
const integrationArcAppBasePath = "/api/apps/arc-agi"
const integrationSQLiteAppBasePath = "/api/apps/sqlite"
const integrationOSDocsPath = "/api/os/docs"
const integrationOSHelpPath = "/api/os/help"

func integrationChatPath() string { return integrationAppBasePath + "/chat" }
func integrationAssistantChatPath() string {
	return integrationAssistantAppBasePath + "/chat"
}
func integrationAssistantProfilesPath() string {
	return integrationAssistantAppBasePath + "/api/chat/profiles"
}
func integrationAssistantWSPath() string   { return integrationAssistantAppBasePath + "/ws" }
func integrationWSPath() string            { return integrationAppBasePath + "/ws" }
func integrationTimelinePath() string      { return integrationAppBasePath + "/api/timeline" }
func integrationProfilesPath() string      { return integrationAppBasePath + "/api/chat/profiles" }
func integrationConfirmPath() string       { return integrationAppBasePath + "/confirm" }
func integrationInventoryDocsPath() string { return integrationAppBasePath + "/docs" }
func integrationGEPAScriptsPath() string   { return integrationGepaAppBasePath + "/scripts" }
func integrationGEPARunsPath() string      { return integrationGepaAppBasePath + "/runs" }
func integrationGEPADocsPath() string      { return integrationGepaAppBasePath + "/docs" }
func integrationARCHealthPath() string     { return integrationArcAppBasePath + "/health" }
func integrationSQLiteHealthPath() string  { return integrationSQLiteAppBasePath + "/health" }
func integrationSQLiteQueryPath() string   { return integrationSQLiteAppBasePath + "/query" }
func integrationARCDocsPath() string       { return integrationArcAppBasePath + "/docs" }
func integrationARCSchemaPath() string {
	return integrationArcAppBasePath + "/schemas/arc.health.response.v1"
}
func integrationOSHelpDocPath(slug string) string {
	return integrationOSHelpPath + "/" + strings.TrimSpace(slug)
}
func integrationDebugConversationsPath() string {
	return integrationAppBasePath + "/api/debug/conversations"
}

func integrationProfilePath(slug string) string {
	return integrationProfilesPath() + "/" + strings.TrimSpace(slug)
}

func newIntegrationGEPAModule(t *testing.T) *gepabackend.Module {
	t.Helper()
	module, err := gepabackend.NewModule(gepabackend.ModuleConfig{
		EnableReflection:   true,
		RunCompletionDelay: 500 * time.Millisecond,
		RunTimeout:         30 * time.Second,
		MaxConcurrentRuns:  4,
	})
	require.NoError(t, err)
	return module
}

type integrationNoopArcDriver struct{}

func (d integrationNoopArcDriver) Init(context.Context) error  { return nil }
func (d integrationNoopArcDriver) Start(context.Context) error { return nil }
func (d integrationNoopArcDriver) Stop(context.Context) error  { return nil }
func (d integrationNoopArcDriver) Health(context.Context) error {
	return nil
}
func (d integrationNoopArcDriver) BaseURL() string { return "http://127.0.0.1:65535" }

func newIntegrationARCModule(t *testing.T) *arcagibackend.Module {
	t.Helper()
	module, err := arcagibackend.NewModuleWithRuntime(arcagibackend.ModuleConfig{
		EnableReflection: true,
		Driver:           "raw",
		RawListenAddr:    "127.0.0.1:18081",
	}, integrationNoopArcDriver{})
	require.NoError(t, err)
	return module
}

func newIntegrationSQLiteModule(t *testing.T) *sqlitebackend.Module {
	t.Helper()
	cfg := sqlitebackend.DefaultModuleConfig()
	cfg.RuntimeConfig = sqliteapp.Config{
		DBPath:               filepath.Join(t.TempDir(), "integration-sqlite-app.db"),
		ReadOnly:             false,
		AutoCreate:           true,
		DefaultRowLimit:      200,
		StatementTimeout:     5 * time.Second,
		OpenBusyTimeoutMS:    5000,
		EnableMultiStatement: false,
		StatementAllowlist:   nil,
		StatementDenylist:    []string{"ATTACH", "DETACH"},
		RedactedColumns:      nil,
		RateLimitRequests:    60,
		RateLimitWindow:      10 * time.Second,
	}
	module, err := sqlitebackend.NewModule(cfg)
	require.NoError(t, err)
	return module
}

func newIntegrationServer(t *testing.T) *httptest.Server {
	t.Helper()
	return newIntegrationServerWithRouterOptions(t)
}

func newIntegrationInventoryProfileSurface(t *testing.T, bootstrap *launcherProfileBootstrap) (gepprofiles.Registry, gepprofiles.RegistrySlug, gepprofiles.EngineProfileSlug) {
	t.Helper()
	builtinRegistry, err := inventorybackendmodule.LoadBuiltinProfileRegistry()
	require.NoError(t, err)
	defaultProfileSlug := inventorybackendmodule.DefaultProfileSlug()
	if bootstrap != nil && !bootstrap.SelectedProfileSlug.IsZero() && bootstrap.SelectedProfileSlug != gepprofiles.MustEngineProfileSlug("assistant") {
		for _, visibleSlug := range inventorybackendmodule.VisibleProfileSlugs() {
			if visibleSlug == bootstrap.SelectedProfileSlug {
				defaultProfileSlug = bootstrap.SelectedProfileSlug
				break
			}
		}
	}
	registry, registrySlug, err := newAppProfileSurface(context.Background(), appProfileSurfaceConfig{
		AppID:              inventorybackendmodule.AppID,
		VisibleRegistry:    builtinRegistry,
		DefaultProfileSlug: defaultProfileSlug,
		VisibleProfiles:    inventorybackendmodule.VisibleProfileSlugs(),
		FallbackRegistry:   bootstrap.ProfileRegistry,
	})
	require.NoError(t, err)
	return registry, registrySlug, defaultProfileSlug
}

func newIntegrationAssistantProfileSurface(t *testing.T, bootstrap *launcherProfileBootstrap) (gepprofiles.Registry, gepprofiles.RegistrySlug, gepprofiles.EngineProfileSlug) {
	t.Helper()
	builtinRegistry, err := assistantbackendmodule.LoadBuiltinProfileRegistry()
	require.NoError(t, err)
	defaultProfileSlug := assistantbackendmodule.DefaultProfileSlug()
	registry, registrySlug, err := newAppProfileSurface(context.Background(), appProfileSurfaceConfig{
		AppID:              assistantbackendmodule.AppID,
		VisibleRegistry:    builtinRegistry,
		DefaultProfileSlug: defaultProfileSlug,
		VisibleProfiles:    assistantbackendmodule.VisibleProfileSlugs(),
		FallbackRegistry:   bootstrap.ProfileRegistry,
	})
	require.NoError(t, err)
	return registry, registrySlug, defaultProfileSlug
}

func newIntegrationServerWithRouterOptions(t *testing.T, extraOptions ...webchat.RouterOption) *httptest.Server {
	t.Helper()

	parsed, launcherBootstrap := newIntegrationLauncherBootstrap(t)
	inventoryProfileRegistry, inventoryDefaultRegistrySlug, inventoryDefaultProfileSlug := newIntegrationInventoryProfileSurface(t, launcherBootstrap)
	assistantProfileRegistry, assistantDefaultRegistrySlug, assistantDefaultProfileSlug := newIntegrationAssistantProfileSurface(t, launcherBootstrap)
	staticFS := fstest.MapFS{
		"static/index.html": {Data: []byte("<html><body>inventory</body></html>")},
	}
	runtimeComposer := infruntime.RuntimeBuilderFunc(func(_ context.Context, req infruntime.ConversationRuntimeRequest) (infruntime.ComposedRuntime, error) {
		runtimeKey := strings.TrimSpace(req.ProfileKey)
		if runtimeKey == "" {
			runtimeKey = "inventory"
		}
		systemPrompt := "seed"
		if req.ResolvedProfileRuntime != nil && strings.TrimSpace(req.ResolvedProfileRuntime.SystemPrompt) != "" {
			systemPrompt = strings.TrimSpace(req.ResolvedProfileRuntime.SystemPrompt)
		}
		versionedRuntimeKey := fmt.Sprintf("%s@v%d", runtimeKey, req.ProfileVersion)
		return infruntime.ComposedRuntime{
			Engine:             integrationNoopEngine{},
			Sink:               integrationNoopSink{},
			RuntimeKey:         versionedRuntimeKey,
			RuntimeFingerprint: "fp-" + versionedRuntimeKey + "-" + systemPrompt,
			SeedSystemPrompt:   systemPrompt,
		}, nil
	})

	pinoweb.RegisterInventoryHypercardExtensions()
	options := []webchat.RouterOption{
		webchat.WithRuntimeComposer(runtimeComposer),
		webchat.WithEventSinkWrapper(pinoweb.NewInventoryEventSinkWrapper(context.Background())),
	}
	options = append(options, extraOptions...)

	webchatSrv, err := webchat.NewServer(
		context.Background(),
		parsed,
		staticFS,
		options...,
	)
	require.NoError(t, err)

	assistantComposer := profilechat.NewRuntimeComposer(parsed, profilechat.RuntimeComposerOptions{
		RuntimeKey:   "assistant",
		SystemPrompt: "You are a helpful OS assistant. Be concise, clear, and direct.",
	}, nil, middlewarecfg.BuildDeps{}, nil)
	assistantResolver := profilechat.NewStrictRequestResolver("assistant").WithProfileRegistry(
		assistantProfileRegistry,
		assistantDefaultRegistrySlug,
	).WithBaseInferenceSettings(launcherBootstrap.BaseInferenceSettings).WithDefaultProfileSelection(assistantDefaultProfileSlug)
	assistantSrv, err := webchat.NewServer(
		context.Background(),
		parsed,
		nil,
		webchat.WithRuntimeComposer(assistantComposer),
	)
	require.NoError(t, err)

	resolver := pinoweb.NewStrictRequestResolver("inventory").WithProfileRegistry(
		inventoryProfileRegistry,
		inventoryDefaultRegistrySlug,
	).WithBaseInferenceSettings(launcherBootstrap.BaseInferenceSettings).WithDefaultProfileSelection(inventoryDefaultProfileSlug)

	moduleRegistry, err := backendhost.NewModuleRegistry(
		assistantbackendmodule.NewModule(assistantbackendmodule.Options{
			Server:              assistantSrv,
			RequestResolver:     assistantResolver,
			ProfileRegistry:     assistantProfileRegistry,
			DefaultRegistrySlug: assistantDefaultRegistrySlug,
		}),
		inventorybackendmodule.NewModule(inventorybackendmodule.Options{
			Server:              webchatSrv,
			RequestResolver:     resolver,
			ProfileRegistry:     inventoryProfileRegistry,
			DefaultRegistrySlug: inventoryDefaultRegistrySlug,
			ConfirmMountPath:    "/confirm",
		}),
		newIntegrationSQLiteModule(t),
		newIntegrationGEPAModule(t),
		newIntegrationARCModule(t),
	)
	require.NoError(t, err)

	lifecycle := backendhost.NewLifecycleManager(moduleRegistry)
	require.NoError(t, lifecycle.Startup(context.Background(), backendhost.StartupOptions{
		RequiredAppIDs: []string{inventorybackendmodule.AppID},
	}))
	t.Cleanup(func() { _ = lifecycle.Stop(context.Background()) })

	appMux := http.NewServeMux()
	backendhost.RegisterAppsManifestEndpoint(appMux, moduleRegistry)
	launcherHelpStore := loadLauncherHelpDocStore()
	registerOSHelpEndpoint(appMux, launcherHelpStore)
	registerOSDocsEndpoint(appMux, moduleRegistry, launcherHelpStore, "/")
	for _, module := range moduleRegistry.Modules() {
		manifest := module.Manifest()
		require.NoError(t, backendhost.MountNamespacedRoutes(appMux, manifest.AppID, module.MountRoutes))
	}
	registerLegacyAliasNotFoundHandlers(appMux)
	appMux.Handle("/", launcherui.Handler())

	return httptest.NewServer(appMux)
}

func TestWSHandler_EmitsHypercardLifecycleEvents(t *testing.T) {
	parsed := values.New()
	staticFS := fstest.MapFS{
		"static/index.html": {Data: []byte("<html><body>inventory</body></html>")},
	}
	runtimeComposer := infruntime.RuntimeBuilderFunc(func(_ context.Context, req infruntime.ConversationRuntimeRequest) (infruntime.ComposedRuntime, error) {
		runtimeKey := strings.TrimSpace(req.ProfileKey)
		if runtimeKey == "" {
			runtimeKey = "inventory"
		}
		return infruntime.ComposedRuntime{
			Engine:             integrationStructuredEngine{},
			Sink:               nil,
			RuntimeKey:         runtimeKey,
			RuntimeFingerprint: "fp-" + runtimeKey,
			SeedSystemPrompt:   "seed",
		}, nil
	})

	pinoweb.RegisterInventoryHypercardExtensions()
	webchatSrv, err := webchat.NewServer(
		context.Background(),
		parsed,
		staticFS,
		webchat.WithRuntimeComposer(runtimeComposer),
		webchat.WithEventSinkWrapper(pinoweb.NewInventoryEventSinkWrapper(context.Background())),
	)
	require.NoError(t, err)

	_, launcherBootstrap := newIntegrationLauncherBootstrap(t)
	inventoryProfileRegistry, inventoryDefaultRegistrySlug, inventoryDefaultProfileSlug := newIntegrationInventoryProfileSurface(t, launcherBootstrap)
	resolver := pinoweb.NewStrictRequestResolver("inventory").WithProfileRegistry(
		inventoryProfileRegistry,
		inventoryDefaultRegistrySlug,
	).WithBaseInferenceSettings(launcherBootstrap.BaseInferenceSettings).WithDefaultProfileSelection(inventoryDefaultProfileSlug)

	moduleRegistry, err := backendhost.NewModuleRegistry(
		inventorybackendmodule.NewModule(inventorybackendmodule.Options{
			Server:              webchatSrv,
			RequestResolver:     resolver,
			ProfileRegistry:     inventoryProfileRegistry,
			DefaultRegistrySlug: inventoryDefaultRegistrySlug,
			ConfirmMountPath:    "/confirm",
		}),
		newIntegrationSQLiteModule(t),
		newIntegrationGEPAModule(t),
		newIntegrationARCModule(t),
	)
	require.NoError(t, err)

	lifecycle := backendhost.NewLifecycleManager(moduleRegistry)
	require.NoError(t, lifecycle.Startup(context.Background(), backendhost.StartupOptions{
		RequiredAppIDs: []string{inventorybackendmodule.AppID},
	}))
	defer func() { _ = lifecycle.Stop(context.Background()) }()

	appMux := http.NewServeMux()
	backendhost.RegisterAppsManifestEndpoint(appMux, moduleRegistry)
	launcherHelpStore := loadLauncherHelpDocStore()
	registerOSHelpEndpoint(appMux, launcherHelpStore)
	registerOSDocsEndpoint(appMux, moduleRegistry, launcherHelpStore, "/")
	for _, module := range moduleRegistry.Modules() {
		manifest := module.Manifest()
		require.NoError(t, backendhost.MountNamespacedRoutes(appMux, manifest.AppID, module.MountRoutes))
	}

	srv := httptest.NewServer(appMux)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + integrationWSPath() + "?conv_id=conv-progress-1"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	defer func() { _ = conn.Close() }()

	require.NoError(t, conn.SetReadDeadline(time.Now().Add(2*time.Second)))
	_, helloFrame, err := conn.ReadMessage()
	require.NoError(t, err)
	require.Equal(t, "ws.hello", integrationSemEventType(helloFrame))

	reqBody := []byte(`{"prompt":"run integration structured flow","conv_id":"conv-progress-1"}`)
	resp, err := http.Post(srv.URL+integrationChatPath(), "application/json", bytes.NewReader(reqBody))
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	seenWidgetStart := false
	seenWidgetReady := false
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		require.NoError(t, conn.SetReadDeadline(time.Now().Add(500*time.Millisecond)))
		_, frame, readErr := conn.ReadMessage()
		if readErr != nil {
			if ne, ok := readErr.(net.Error); ok && ne.Timeout() {
				continue
			}
			break
		}
		switch integrationSemEventType(frame) {
		case "hypercard.widget.start":
			seenWidgetStart = true
		case "hypercard.widget.v1":
			seenWidgetReady = true
		}
		if seenWidgetStart && seenWidgetReady {
			break
		}
	}

	require.True(t, seenWidgetStart, "expected hypercard.widget.start over websocket")
	require.True(t, seenWidgetReady, "expected hypercard.widget.v1 over websocket")
}

func TestChatHandler_StartedResponse(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	reqBody := []byte(`{"prompt":"hello from integration","conv_id":"conv-int-1"}`)
	resp, err := http.Post(srv.URL+integrationChatPath(), "application/json", bytes.NewReader(reqBody))
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.Equal(t, "started", payload["status"])
	require.Equal(t, "conv-int-1", payload["conv_id"])
	require.NotEmpty(t, payload["session_id"])
}

func TestWSHandler_RequiresConvID(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + integrationWSPath())
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestWSHandler_HelloAndPong(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + integrationWSPath() + "?conv_id=conv-ws-1"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	defer func() { _ = conn.Close() }()

	require.NoError(t, conn.SetReadDeadline(time.Now().Add(2*time.Second)))
	_, helloFrame, err := conn.ReadMessage()
	require.NoError(t, err)
	require.Equal(t, "ws.hello", integrationSemEventType(helloFrame))

	require.NoError(t, conn.WriteMessage(websocket.TextMessage, []byte("ping")))

	seenPong := false
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) && !seenPong {
		require.NoError(t, conn.SetReadDeadline(time.Now().Add(500*time.Millisecond)))
		_, frame, readErr := conn.ReadMessage()
		if readErr != nil {
			if ne, ok := readErr.(net.Error); ok && ne.Timeout() {
				continue
			}
			require.NoError(t, readErr)
		}
		if integrationSemEventType(frame) == "ws.pong" {
			seenPong = true
		}
	}
	require.True(t, seenPong, "expected ws.pong response to ping")
}

func TestTimelineEndpoint_ReturnsSnapshot(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + integrationTimelinePath() + "?conv_id=conv-timeline-1")
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	_, ok := payload["convId"]
	require.True(t, ok, "expected timeline snapshot with convId")
}

func TestOSAppsEndpoint_ListsInventoryModuleCapabilities(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/os/apps")
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload struct {
		Apps []map[string]any `json:"apps"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.NotEmpty(t, payload.Apps)

	inventoryFound := false
	for _, app := range payload.Apps {
		if appID, _ := app["app_id"].(string); appID == inventorybackendmodule.AppID {
			inventoryFound = true
			require.Equal(t, "Inventory", app["name"])
			require.Equal(t, true, app["required"])
			require.Equal(t, true, app["healthy"])
			caps, ok := app["capabilities"].([]any)
			require.True(t, ok)
			require.Contains(t, caps, any("chat"))
			require.Contains(t, caps, any("profiles"))
			reflection, ok := app["reflection"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, reflection["available"])
			require.Equal(t, "/api/os/apps/inventory/reflection", reflection["url"])
			docs, ok := app["docs"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, docs["available"])
			require.Equal(t, "/api/apps/inventory/docs", docs["url"])
		}
	}
	require.True(t, inventoryFound, "expected inventory backend module in /api/os/apps payload")
}

func TestOSAppsEndpoint_ListsAssistantModuleCapabilities(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/os/apps")
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload struct {
		Apps []map[string]any `json:"apps"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))

	assistantFound := false
	for _, app := range payload.Apps {
		if appID, _ := app["app_id"].(string); appID == assistantbackendmodule.AppID {
			assistantFound = true
			require.Equal(t, "Assistant", app["name"])
			require.Equal(t, false, app["required"])
			require.Equal(t, true, app["healthy"])
			caps, ok := app["capabilities"].([]any)
			require.True(t, ok)
			require.Contains(t, caps, any("chat"))
			require.Contains(t, caps, any("profiles"))
		}
	}
	require.True(t, assistantFound, "expected assistant backend module in /api/os/apps payload")
}

func TestAssistantProfilesEndpoint_ListsAssistantProfile(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + integrationAssistantProfilesPath())
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var items []map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&items))
	require.Len(t, items, 1)
	require.True(t, hasProfileSlug(items, "assistant"), "expected assistant profile in list")
	require.False(t, hasProfileSlug(items, "inventory"), "did not expect inventory profile in assistant list")
}

func TestInventoryModule_ReflectionEndpoint(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/os/apps/inventory/reflection")
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.Equal(t, "inventory", payload["app_id"])
	apis, ok := payload["apis"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, apis)
}

func TestModuleDocsEndpoints_InventoryArcAndGepa(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	tests := []struct {
		path     string
		moduleID string
	}{
		{path: integrationInventoryDocsPath(), moduleID: "inventory"},
		{path: integrationARCDocsPath(), moduleID: "arc-agi"},
		{path: integrationGEPADocsPath(), moduleID: "gepa"},
	}
	for _, tc := range tests {
		resp, err := http.Get(srv.URL + tc.path)
		require.NoError(t, err)
		defer resp.Body.Close()
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var payload map[string]any
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
		require.Equal(t, tc.moduleID, payload["module_id"])
		docs, ok := payload["docs"].([]any)
		require.True(t, ok)
		require.NotEmpty(t, docs)
	}

	detailResp, err := http.Get(srv.URL + integrationInventoryDocsPath() + "/overview")
	require.NoError(t, err)
	defer detailResp.Body.Close()
	require.Equal(t, http.StatusOK, detailResp.StatusCode)
	require.Contains(t, mustReadAll(t, detailResp.Body), `"slug":"overview"`)
}

func TestOSHelpEndpoint_ListsAndReturnsLauncherDocs(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + integrationOSHelpPath)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.Equal(t, launcherHelpModuleID, payload["module_id"])
	docs, ok := payload["docs"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, docs)

	detailResp, err := http.Get(srv.URL + integrationOSHelpDocPath("wesen-os-guide"))
	require.NoError(t, err)
	defer detailResp.Body.Close()
	require.Equal(t, http.StatusOK, detailResp.StatusCode)

	var detail map[string]any
	require.NoError(t, json.NewDecoder(detailResp.Body).Decode(&detail))
	require.Equal(t, launcherHelpModuleID, detail["module_id"])
	require.Equal(t, "wesen-os-guide", detail["slug"])
	content, ok := detail["content"].(string)
	require.True(t, ok)
	require.NotEmpty(t, content)
}

func TestOSDocsEndpoint_AggregatesAndFiltersModuleDocs(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + integrationOSDocsPath)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload struct {
		Total   int              `json:"total"`
		Results []map[string]any `json:"results"`
		Facets  map[string]any   `json:"facets"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.GreaterOrEqual(t, payload.Total, 10)
	require.NotEmpty(t, payload.Results)

	foundModules := map[string]bool{}
	for _, result := range payload.Results {
		moduleID, _ := result["module_id"].(string)
		foundModules[moduleID] = true
	}
	require.True(t, foundModules["inventory"])
	require.True(t, foundModules["arc-agi"])
	require.True(t, foundModules["gepa"])
	require.True(t, foundModules[launcherHelpModuleID])

	filteredResp, err := http.Get(srv.URL + integrationOSDocsPath + "?module=gepa")
	require.NoError(t, err)
	defer filteredResp.Body.Close()
	require.Equal(t, http.StatusOK, filteredResp.StatusCode)

	var filtered struct {
		Total   int              `json:"total"`
		Results []map[string]any `json:"results"`
	}
	require.NoError(t, json.NewDecoder(filteredResp.Body).Decode(&filtered))
	require.GreaterOrEqual(t, filtered.Total, 3)
	for _, result := range filtered.Results {
		require.Equal(t, "gepa", result["module_id"])
	}

	launcherResp, err := http.Get(srv.URL + integrationOSDocsPath + "?module=" + launcherHelpModuleID)
	require.NoError(t, err)
	defer launcherResp.Body.Close()
	require.Equal(t, http.StatusOK, launcherResp.StatusCode)

	var launcherPayload struct {
		Total   int              `json:"total"`
		Results []map[string]any `json:"results"`
	}
	require.NoError(t, json.NewDecoder(launcherResp.Body).Decode(&launcherPayload))
	require.Greater(t, launcherPayload.Total, 0)
	for _, result := range launcherPayload.Results {
		require.Equal(t, launcherHelpModuleID, result["module_id"])
		url, _ := result["url"].(string)
		require.Contains(t, url, "/api/os/help/")
	}

	queryResp, err := http.Get(srv.URL + integrationOSDocsPath + "?query=session")
	require.NoError(t, err)
	defer queryResp.Body.Close()
	require.Equal(t, http.StatusOK, queryResp.StatusCode)

	var queryPayload struct {
		Total int `json:"total"`
	}
	require.NoError(t, json.NewDecoder(queryResp.Body).Decode(&queryPayload))
	require.Greater(t, queryPayload.Total, 0)
}

func TestOSAppsEndpoint_ListsGEPAModuleReflectionMetadata(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/os/apps")
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload struct {
		Apps []map[string]any `json:"apps"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))

	gepaFound := false
	for _, app := range payload.Apps {
		if appID, _ := app["app_id"].(string); appID == "gepa" {
			gepaFound = true
			require.Equal(t, "GEPA", app["name"])
			require.Equal(t, true, app["healthy"])
			reflection, ok := app["reflection"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, reflection["available"])
			require.Equal(t, "/api/os/apps/gepa/reflection", reflection["url"])
			docs, ok := app["docs"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, docs["available"])
			require.Equal(t, "/api/apps/gepa/docs", docs["url"])
		}
	}
	require.True(t, gepaFound, "expected gepa backend module in /api/os/apps payload")
}

func TestOSAppsEndpoint_ListsARCModuleReflectionMetadata(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/os/apps")
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload struct {
		Apps []map[string]any `json:"apps"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))

	arcFound := false
	for _, app := range payload.Apps {
		if appID, _ := app["app_id"].(string); appID == "arc-agi" {
			arcFound = true
			require.Equal(t, "ARC-AGI", app["name"])
			require.Equal(t, true, app["healthy"])
			reflection, ok := app["reflection"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, reflection["available"])
			require.Equal(t, "/api/os/apps/arc-agi/reflection", reflection["url"])
			docs, ok := app["docs"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, docs["available"])
			require.Equal(t, "/api/apps/arc-agi/docs", docs["url"])
		}
	}
	require.True(t, arcFound, "expected arc-agi backend module in /api/os/apps payload")
}

func TestOSAppsEndpoint_ListsSQLiteModuleReflectionMetadata(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/os/apps")
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var payload struct {
		Apps []map[string]any `json:"apps"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))

	sqliteFound := false
	for _, app := range payload.Apps {
		if appID, _ := app["app_id"].(string); appID == "sqlite" {
			sqliteFound = true
			require.Equal(t, "SQLite", app["name"])
			require.Equal(t, true, app["healthy"])
			reflection, ok := app["reflection"].(map[string]any)
			require.True(t, ok)
			require.Equal(t, true, reflection["available"])
			require.Equal(t, "/api/os/apps/sqlite/reflection", reflection["url"])
		}
	}
	require.True(t, sqliteFound, "expected sqlite backend module in /api/os/apps payload")
}

func TestSQLiteModule_HealthQueryAndReflectionEndpoints(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	healthResp, err := http.Get(srv.URL + integrationSQLiteHealthPath())
	require.NoError(t, err)
	defer healthResp.Body.Close()
	require.Equal(t, http.StatusOK, healthResp.StatusCode)

	queryResp, err := http.Post(srv.URL+integrationSQLiteQueryPath(), "application/json", strings.NewReader(`{"sql":"SELECT 1 AS one"}`))
	require.NoError(t, err)
	defer queryResp.Body.Close()
	require.Equal(t, http.StatusOK, queryResp.StatusCode)

	var queryPayload map[string]any
	require.NoError(t, json.NewDecoder(queryResp.Body).Decode(&queryPayload))
	rows, ok := queryPayload["rows"].([]any)
	require.True(t, ok)
	require.Len(t, rows, 1)

	reflectionResp, err := http.Get(srv.URL + "/api/os/apps/sqlite/reflection")
	require.NoError(t, err)
	defer reflectionResp.Body.Close()
	require.Equal(t, http.StatusOK, reflectionResp.StatusCode)

	var reflection map[string]any
	require.NoError(t, json.NewDecoder(reflectionResp.Body).Decode(&reflection))
	require.Equal(t, "sqlite", reflection["app_id"])
	apis, ok := reflection["apis"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, apis)
}

func TestGEPAModule_ReflectionAndScriptsEndpoints(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	reflectionResp, err := http.Get(srv.URL + "/api/os/apps/gepa/reflection")
	require.NoError(t, err)
	defer reflectionResp.Body.Close()
	require.Equal(t, http.StatusOK, reflectionResp.StatusCode)

	var reflection map[string]any
	require.NoError(t, json.NewDecoder(reflectionResp.Body).Decode(&reflection))
	require.Equal(t, "gepa", reflection["app_id"])
	apis, ok := reflection["apis"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, apis)

	scriptsResp, err := http.Get(srv.URL + integrationGEPAScriptsPath())
	require.NoError(t, err)
	defer scriptsResp.Body.Close()
	require.Equal(t, http.StatusOK, scriptsResp.StatusCode)

	var scriptsPayload map[string]any
	require.NoError(t, json.NewDecoder(scriptsResp.Body).Decode(&scriptsPayload))
	_, ok = scriptsPayload["scripts"].([]any)
	require.True(t, ok)
}

func TestARCModule_HealthAndSchemaEndpoints(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	healthResp, err := http.Get(srv.URL + integrationARCHealthPath())
	require.NoError(t, err)
	defer healthResp.Body.Close()
	require.Equal(t, http.StatusOK, healthResp.StatusCode)

	var health map[string]any
	require.NoError(t, json.NewDecoder(healthResp.Body).Decode(&health))
	require.Equal(t, "ok", health["status"])

	schemaResp, err := http.Get(srv.URL + integrationARCSchemaPath())
	require.NoError(t, err)
	defer schemaResp.Body.Close()
	require.Equal(t, http.StatusOK, schemaResp.StatusCode)

	var schema map[string]any
	require.NoError(t, json.NewDecoder(schemaResp.Body).Decode(&schema))
	require.Equal(t, "object", schema["type"])
}

func TestGEPAModule_RunTimelineAndEventsEndpoints(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	scriptsResp, err := http.Get(srv.URL + integrationGEPAScriptsPath())
	require.NoError(t, err)
	defer scriptsResp.Body.Close()
	require.Equal(t, http.StatusOK, scriptsResp.StatusCode)

	var scriptsPayload struct {
		Scripts []map[string]any `json:"scripts"`
	}
	require.NoError(t, json.NewDecoder(scriptsResp.Body).Decode(&scriptsPayload))
	if len(scriptsPayload.Scripts) == 0 {
		t.Skip("no local scripts discovered in integration environment")
	}
	scriptID, _ := scriptsPayload.Scripts[0]["id"].(string)
	require.NotEmpty(t, scriptID)

	startBody := fmt.Sprintf(`{"script_id":"%s"}`, scriptID)
	startResp, err := http.Post(srv.URL+integrationGEPARunsPath(), "application/json", strings.NewReader(startBody))
	require.NoError(t, err)
	defer startResp.Body.Close()
	require.Equal(t, http.StatusCreated, startResp.StatusCode)

	var startPayload struct {
		Run map[string]any `json:"run"`
	}
	require.NoError(t, json.NewDecoder(startResp.Body).Decode(&startPayload))
	runID, _ := startPayload.Run["run_id"].(string)
	require.NotEmpty(t, runID)

	eventsResp, err := http.Get(srv.URL + integrationGEPARunsPath() + "/" + runID + "/events")
	require.NoError(t, err)
	defer eventsResp.Body.Close()
	require.Equal(t, http.StatusOK, eventsResp.StatusCode)
	eventsRaw, err := io.ReadAll(eventsResp.Body)
	require.NoError(t, err)
	eventsBody := string(eventsRaw)
	require.Contains(t, eventsBody, "event: run.started")

	timelineResp, err := http.Get(srv.URL + integrationGEPARunsPath() + "/" + runID + "/timeline")
	require.NoError(t, err)
	defer timelineResp.Body.Close()
	require.Equal(t, http.StatusOK, timelineResp.StatusCode)

	var timeline map[string]any
	require.NoError(t, json.NewDecoder(timelineResp.Body).Decode(&timeline))
	require.Equal(t, runID, timeline["run_id"])
	require.NotEmpty(t, timeline["status"])
}

func TestGEPAModule_CancelEndpointRunningAndTerminalRun(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	scriptsResp, err := http.Get(srv.URL + integrationGEPAScriptsPath())
	require.NoError(t, err)
	defer scriptsResp.Body.Close()
	require.Equal(t, http.StatusOK, scriptsResp.StatusCode)

	var scriptsPayload struct {
		Scripts []map[string]any `json:"scripts"`
	}
	require.NoError(t, json.NewDecoder(scriptsResp.Body).Decode(&scriptsPayload))
	if len(scriptsPayload.Scripts) == 0 {
		t.Skip("no local scripts discovered in integration environment")
	}
	scriptID, _ := scriptsPayload.Scripts[0]["id"].(string)
	require.NotEmpty(t, scriptID)

	startBody := fmt.Sprintf(`{"script_id":"%s"}`, scriptID)
	startResp, err := http.Post(srv.URL+integrationGEPARunsPath(), "application/json", strings.NewReader(startBody))
	require.NoError(t, err)
	defer startResp.Body.Close()
	require.Equal(t, http.StatusCreated, startResp.StatusCode)

	var startPayload struct {
		Run map[string]any `json:"run"`
	}
	require.NoError(t, json.NewDecoder(startResp.Body).Decode(&startPayload))
	runID, _ := startPayload.Run["run_id"].(string)
	require.NotEmpty(t, runID)

	cancelURL := srv.URL + integrationGEPARunsPath() + "/" + runID + "/cancel"
	cancelResp, err := http.Post(cancelURL, "application/json", nil)
	require.NoError(t, err)
	defer cancelResp.Body.Close()
	require.Equal(t, http.StatusOK, cancelResp.StatusCode)

	var cancelPayload struct {
		Run map[string]any `json:"run"`
	}
	require.NoError(t, json.NewDecoder(cancelResp.Body).Decode(&cancelPayload))
	require.Equal(t, "canceled", cancelPayload.Run["status"])

	// Canceling again should stay terminal and still return 200.
	cancelAgainResp, err := http.Post(cancelURL, "application/json", nil)
	require.NoError(t, err)
	defer cancelAgainResp.Body.Close()
	require.Equal(t, http.StatusOK, cancelAgainResp.StatusCode)

	var cancelAgainPayload struct {
		Run map[string]any `json:"run"`
	}
	require.NoError(t, json.NewDecoder(cancelAgainResp.Body).Decode(&cancelAgainPayload))
	require.Equal(t, "canceled", cancelAgainPayload.Run["status"])
}

func TestLegacyAliasRoutes_AreNotMounted(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	legacyRoutes := []string{
		"/chat",
		"/ws?conv_id=legacy-1",
		"/api/timeline?conv_id=legacy-1",
	}
	for _, route := range legacyRoutes {
		resp, err := http.Get(srv.URL + route)
		require.NoError(t, err)
		_ = resp.Body.Close()
		require.Equalf(t, http.StatusNotFound, resp.StatusCode, "legacy route should not be mounted: %s", route)
	}
}

func TestChatHandler_PassesProfileDefaultMiddlewaresToRuntimeComposer(t *testing.T) {
	captured := make(chan infruntime.ConversationRuntimeRequest, 4)
	runtimeComposer := infruntime.RuntimeBuilderFunc(func(_ context.Context, req infruntime.ConversationRuntimeRequest) (infruntime.ComposedRuntime, error) {
		select {
		case captured <- req:
		default:
		}
		return infruntime.ComposedRuntime{
			Engine:             integrationNoopEngine{},
			Sink:               integrationNoopSink{},
			RuntimeKey:         "inventory",
			RuntimeFingerprint: "fp-inventory",
			SeedSystemPrompt:   "seed",
		}, nil
	})

	srv := newIntegrationServerWithRouterOptions(t, webchat.WithRuntimeComposer(runtimeComposer))
	defer srv.Close()

	reqBody := []byte(`{"prompt":"hello from integration","conv_id":"conv-int-profile-1","profile":"inventory"}`)
	resp, err := http.Post(srv.URL+integrationChatPath(), "application/json", bytes.NewReader(reqBody))
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	select {
	case req := <-captured:
		require.NotNil(t, req.ResolvedProfileRuntime)
		require.GreaterOrEqual(t, len(req.ResolvedProfileRuntime.Middlewares), 2)
		require.Equal(t, "inventory_artifact_policy", req.ResolvedProfileRuntime.Middlewares[0].Name)
		require.Equal(t, "inventory_suggestions_policy", req.ResolvedProfileRuntime.Middlewares[1].Name)
	case <-time.After(2 * time.Second):
		t.Fatalf("did not capture runtime composer request")
	}
}

func TestProfileAPI_ReadRoutesAreMounted(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	listResp, err := http.Get(srv.URL + integrationProfilesPath())
	require.NoError(t, err)
	defer listResp.Body.Close()
	require.Equal(t, http.StatusOK, listResp.StatusCode)

	var listed []map[string]any
	require.NoError(t, json.NewDecoder(listResp.Body).Decode(&listed))
	require.Len(t, listed, 4)
	assertProfileListItemContract(t, listed[0])
	assertProfileListItemContract(t, listed[1])
	require.True(t, hasProfileSlug(listed, "default"), "expected default profile in list")
	require.True(t, hasProfileSlug(listed, "analyst"), "expected analyst profile in list")
	require.True(t, hasProfileSlug(listed, "inventory"), "expected inventory profile in list")
	require.True(t, hasProfileSlug(listed, "assistant"), "expected assistant profile in list")
	require.False(t, hasProfileSlug(listed, "planner"), "did not expect planner profile in inventory list")

	getResp, err := http.Get(srv.URL + integrationProfilePath("analyst"))
	require.NoError(t, err)
	defer getResp.Body.Close()
	require.Equal(t, http.StatusOK, getResp.StatusCode)
	var got map[string]any
	require.NoError(t, json.NewDecoder(getResp.Body).Decode(&got))
	assertProfileDocumentContract(t, got)
	require.Equal(t, "analyst", got["slug"])
	extensions, ok := got["extensions"].(map[string]any)
	require.True(t, ok)
	require.NotEmpty(t, extensions)
}

func TestProfileAPI_InvalidRegistryReturnsBadRequest(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	invalidRegistryResp, err := http.Get(srv.URL + integrationProfilesPath() + "?registry=invalid registry!")
	require.NoError(t, err)
	defer invalidRegistryResp.Body.Close()
	require.Equal(t, http.StatusBadRequest, invalidRegistryResp.StatusCode)
}

func TestChatAPI_UnknownRegistrySelector_ReturnsNotFound(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	reqBody := strings.NewReader(`{"prompt":"hello from unknown registry","conv_id":"conv-unknown-registry-1"}`)
	req, err := http.NewRequest(http.MethodPost, srv.URL+integrationChatPath()+"?registry=missing", reqBody)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestConfirmRoutes_CoexistWithChatAndTimelineRoutes(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	chatResp, err := http.Post(srv.URL+integrationChatPath(), "application/json", bytes.NewReader([]byte(`{"prompt":"hello","conv_id":"conv-confirm-coexist"}`)))
	require.NoError(t, err)
	defer chatResp.Body.Close()
	require.Equal(t, http.StatusOK, chatResp.StatusCode)

	confirmPayload := &v1.UIRequest{
		Type:      v1.WidgetType_confirm,
		SessionId: "global",
		Input: &v1.UIRequest_ConfirmInput{
			ConfirmInput: &v1.ConfirmInput{
				Title: "Deploy now?",
			},
		},
	}
	confirmBody, err := protojson.Marshal(confirmPayload)
	require.NoError(t, err)
	confirmResp, err := http.Post(srv.URL+integrationConfirmPath()+"/api/requests", "application/json", bytes.NewReader(confirmBody))
	require.NoError(t, err)
	defer confirmResp.Body.Close()
	require.Equal(t, http.StatusCreated, confirmResp.StatusCode)

	timelineResp, err := http.Get(srv.URL + integrationTimelinePath() + "?conv_id=conv-confirm-coexist")
	require.NoError(t, err)
	defer timelineResp.Body.Close()
	require.Equal(t, http.StatusOK, timelineResp.StatusCode)
}

func TestConfirmWS_PrefixedEndpointStreamsPendingRequests(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	created := integrationCreateConfirmRequest(t, srv.URL)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + integrationConfirmPath() + "/ws?sessionId=global"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	defer func() { _ = conn.Close() }()

	eventType, eventReq := integrationReadConfirmWSEvent(t, conn)
	require.Equal(t, "new_request", eventType)
	require.Equal(t, created.GetId(), eventReq.GetId())
	require.Equal(t, v1.RequestStatus_pending, eventReq.GetStatus())
}

func TestProfileE2E_ExplicitProfileSelection_RuntimeKeyReflectsSelection(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	listResp, err := http.Get(srv.URL + integrationProfilesPath())
	require.NoError(t, err)
	defer listResp.Body.Close()
	require.Equal(t, http.StatusOK, listResp.StatusCode)

	var listed []map[string]any
	require.NoError(t, json.NewDecoder(listResp.Body).Decode(&listed))
	require.True(t, hasProfileSlug(listed, "analyst"), "expected analyst profile in list")

	const convID = "conv-profile-select-1"
	reqBody := strings.NewReader(`{"prompt":"hello analyst","conv_id":"` + convID + `","profile":"analyst"}`)
	chatReq, err := http.NewRequest(http.MethodPost, srv.URL+integrationChatPath(), reqBody)
	require.NoError(t, err)
	chatReq.Header.Set("Content-Type", "application/json")
	chatResp, err := http.DefaultClient.Do(chatReq)
	require.NoError(t, err)
	defer chatResp.Body.Close()
	require.Equal(t, http.StatusOK, chatResp.StatusCode)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + integrationWSPath() + "?conv_id=" + convID + "&profile=analyst"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	defer func() { _ = conn.Close() }()

	require.NoError(t, conn.SetReadDeadline(time.Now().Add(2*time.Second)))
	_, helloFrame, err := conn.ReadMessage()
	require.NoError(t, err)
	require.Equal(t, "ws.hello", integrationSemEventType(helloFrame))
	require.Equal(t, "analyst@v0", integrationSemRuntimeKey(helloFrame))
}

func TestProfileE2E_DefaultProfileSelection_IsAppSpecific(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	const inventoryConvID = "conv-profile-default-inventory"
	inventoryResp, err := http.Post(
		srv.URL+integrationChatPath(),
		"application/json",
		strings.NewReader(`{"prompt":"inventory default","conv_id":"`+inventoryConvID+`"}`),
	)
	require.NoError(t, err)
	defer inventoryResp.Body.Close()
	require.Equal(t, http.StatusOK, inventoryResp.StatusCode)

	inventoryWSURL := "ws" + strings.TrimPrefix(srv.URL, "http") + integrationWSPath() + "?conv_id=" + inventoryConvID
	inventoryConn, _, err := websocket.DefaultDialer.Dial(inventoryWSURL, nil)
	require.NoError(t, err)
	require.NoError(t, inventoryConn.SetReadDeadline(time.Now().Add(2*time.Second)))
	_, inventoryHelloFrame, err := inventoryConn.ReadMessage()
	require.NoError(t, err)
	require.Equal(t, "ws.hello", integrationSemEventType(inventoryHelloFrame))
	require.Equal(t, "inventory@v0", integrationSemRuntimeKey(inventoryHelloFrame))
	_ = inventoryConn.Close()

	assistantResp, err := http.Get(srv.URL + integrationAssistantProfilesPath())
	require.NoError(t, err)
	defer assistantResp.Body.Close()
	require.Equal(t, http.StatusOK, assistantResp.StatusCode)

	var assistantProfiles []map[string]any
	require.NoError(t, json.NewDecoder(assistantResp.Body).Decode(&assistantProfiles))
	assistantItem := findProfileListItem(assistantProfiles, "assistant")
	require.NotNil(t, assistantItem)
	require.Equal(t, true, assistantItem["is_default"])
}

func TestInventoryChat_RejectsForeignProfileSelection(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	resp, err := http.Post(
		srv.URL+integrationChatPath(),
		"application/json",
		strings.NewReader(`{"prompt":"planner should be hidden","conv_id":"conv-foreign-profile-1","profile":"planner"}`),
	)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestProfileE2E_ExplicitProfileChange_RebuildsInFlightConversationRuntime(t *testing.T) {
	srv := newIntegrationServer(t)
	defer srv.Close()

	const convID = "conv-profile-inflight-switch-1"
	chatReqInventory, err := http.NewRequest(
		http.MethodPost,
		srv.URL+integrationChatPath(),
		strings.NewReader(`{"prompt":"inventory baseline","conv_id":"`+convID+`","profile":"inventory"}`),
	)
	require.NoError(t, err)
	chatReqInventory.Header.Set("Content-Type", "application/json")
	chatRespInventory, err := http.DefaultClient.Do(chatReqInventory)
	require.NoError(t, err)
	defer chatRespInventory.Body.Close()
	require.Equal(t, http.StatusOK, chatRespInventory.StatusCode)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + integrationWSPath() + "?conv_id=" + convID
	inventoryConn, _, err := websocket.DefaultDialer.Dial(wsURL+"&profile=inventory", nil)
	require.NoError(t, err)
	require.NoError(t, inventoryConn.SetReadDeadline(time.Now().Add(2*time.Second)))
	_, inventoryHelloFrame, err := inventoryConn.ReadMessage()
	require.NoError(t, err)
	require.Equal(t, "ws.hello", integrationSemEventType(inventoryHelloFrame))
	require.Equal(t, "inventory@v0", integrationSemRuntimeKey(inventoryHelloFrame))
	_ = inventoryConn.Close()

	chatReqAnalyst, err := http.NewRequest(
		http.MethodPost,
		srv.URL+integrationChatPath(),
		strings.NewReader(`{"prompt":"switch to analyst","conv_id":"`+convID+`","profile":"analyst"}`),
	)
	require.NoError(t, err)
	chatReqAnalyst.Header.Set("Content-Type", "application/json")
	chatRespAnalyst, err := http.DefaultClient.Do(chatReqAnalyst)
	require.NoError(t, err)
	defer chatRespAnalyst.Body.Close()
	require.Equal(t, http.StatusOK, chatRespAnalyst.StatusCode)

	analystConn, _, err := websocket.DefaultDialer.Dial(wsURL+"&profile=analyst", nil)
	require.NoError(t, err)
	require.NoError(t, analystConn.SetReadDeadline(time.Now().Add(2*time.Second)))
	_, analystHelloFrame, err := analystConn.ReadMessage()
	require.NoError(t, err)
	require.Equal(t, "ws.hello", integrationSemEventType(analystHelloFrame))
	require.Equal(t, "analyst@v0", integrationSemRuntimeKey(analystHelloFrame))
	_ = analystConn.Close()
}

func TestChatHandler_PersistsTurnSnapshotsWhenTurnStoreConfigured(t *testing.T) {
	tmpDir := t.TempDir()
	turnsPath := filepath.Join(tmpDir, "turns.db")
	turnsDSN, err := chatstore.SQLiteTurnDSNForFile(turnsPath)
	require.NoError(t, err)

	turnStore, err := chatstore.NewSQLiteTurnStore(turnsDSN)
	require.NoError(t, err)
	t.Cleanup(func() { _ = turnStore.Close() })

	srv := newIntegrationServerWithRouterOptions(t, webchat.WithTurnStore(turnStore))
	defer srv.Close()

	const convID = "conv-turn-persist-1"
	reqBody := []byte(`{"prompt":"persist turn snapshot test","conv_id":"` + convID + `"}`)
	resp, err := http.Post(srv.URL+integrationChatPath(), "application/json", bytes.NewReader(reqBody))
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	require.Eventually(t, func() bool {
		snapshots, listErr := turnStore.List(context.Background(), chatstore.TurnQuery{
			ConvID: convID,
			Limit:  20,
		})
		if listErr != nil {
			return false
		}
		if len(snapshots) == 0 {
			return false
		}
		for _, snapshot := range snapshots {
			if snapshot.Phase == "final" && strings.TrimSpace(snapshot.Payload) != "" {
				return true
			}
		}
		return false
	}, 6*time.Second, 100*time.Millisecond, "expected persisted final turn snapshot")

	snapshots, err := turnStore.List(context.Background(), chatstore.TurnQuery{
		ConvID: convID,
		Limit:  20,
	})
	require.NoError(t, err)
	require.NotEmpty(t, snapshots)
	require.FileExists(t, turnsPath)

	seenFinalPhase := false
	for _, snapshot := range snapshots {
		if snapshot.Phase == "final" {
			seenFinalPhase = true
		}
		require.NotEmpty(t, strings.TrimSpace(snapshot.Payload))
	}
	require.True(t, seenFinalPhase, "expected at least one final turn snapshot")

	_, err = os.Stat(turnsPath)
	require.NoError(t, err)
}

func integrationSemEventType(frame []byte) string {
	var env struct {
		Event struct {
			Type string `json:"type"`
		} `json:"event"`
	}
	if err := json.Unmarshal(frame, &env); err != nil {
		return ""
	}
	return env.Event.Type
}

func integrationSemRuntimeKey(frame []byte) string {
	var env struct {
		Event struct {
			Data struct {
				RuntimeKey      string `json:"runtimeKey"`
				RuntimeKeySnake string `json:"runtime_key"`
			} `json:"data"`
		} `json:"event"`
	}
	if err := json.Unmarshal(frame, &env); err != nil {
		return ""
	}
	if env.Event.Data.RuntimeKey != "" {
		return env.Event.Data.RuntimeKey
	}
	return env.Event.Data.RuntimeKeySnake
}

func hasProfileSlug(items []map[string]any, slug string) bool {
	want := strings.TrimSpace(slug)
	for _, item := range items {
		got, _ := item["slug"].(string)
		if strings.TrimSpace(got) == want {
			return true
		}
	}
	return false
}

func findProfileListItem(items []map[string]any, slug string) map[string]any {
	want := strings.TrimSpace(slug)
	for _, item := range items {
		got, _ := item["slug"].(string)
		if strings.TrimSpace(got) == want {
			return item
		}
	}
	return nil
}

func assertProfileListItemContract(t *testing.T, item map[string]any) {
	t.Helper()
	require.NotEmpty(t, item["slug"])
	assertAllowedContractKeys(
		t,
		item,
		"registry",
		"slug",
		"display_name",
		"description",
		"default_prompt",
		"extensions",
		"is_default",
		"version",
	)
}

func assertProfileDocumentContract(t *testing.T, doc map[string]any) {
	t.Helper()
	require.NotEmpty(t, doc["registry"])
	require.NotEmpty(t, doc["slug"])
	_, hasDefault := doc["is_default"]
	require.True(t, hasDefault)
	assertAllowedContractKeys(
		t,
		doc,
		"registry",
		"slug",
		"display_name",
		"description",
		"runtime",
		"policy",
		"metadata",
		"extensions",
		"is_default",
	)
}

func assertAllowedContractKeys(t *testing.T, payload map[string]any, allowed ...string) {
	t.Helper()
	allowedSet := map[string]struct{}{}
	for _, key := range allowed {
		allowedSet[key] = struct{}{}
	}
	for key := range payload {
		if _, ok := allowedSet[key]; !ok {
			t.Fatalf("unexpected profile API contract key: %s", key)
		}
	}
}

func mustProfileCookie(t *testing.T, resp *http.Response) *http.Cookie {
	t.Helper()
	require.NotNil(t, resp)
	for _, ck := range resp.Cookies() {
		if strings.TrimSpace(ck.Name) == "chat_profile" && strings.TrimSpace(ck.Value) != "" {
			return ck
		}
	}
	t.Fatalf("expected chat_profile cookie")
	return nil
}

func integrationCreateConfirmRequest(t *testing.T, baseURL string) *v1.UIRequest {
	t.Helper()

	payload := &v1.UIRequest{
		Type:      v1.WidgetType_confirm,
		SessionId: "global",
		Input: &v1.UIRequest_ConfirmInput{
			ConfirmInput: &v1.ConfirmInput{
				Title: "Approve release?",
			},
		},
	}
	body, err := protojson.Marshal(payload)
	require.NoError(t, err)

	resp, err := http.Post(baseURL+integrationConfirmPath()+"/api/requests", "application/json", bytes.NewReader(body))
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	raw, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	req := &v1.UIRequest{}
	require.NoError(t, protojson.Unmarshal(raw, req))
	return req
}

func integrationReadConfirmWSEvent(t *testing.T, conn *websocket.Conn) (string, *v1.UIRequest) {
	t.Helper()

	require.NoError(t, conn.SetReadDeadline(time.Now().Add(2*time.Second)))
	_, frame, err := conn.ReadMessage()
	require.NoError(t, err)

	var env struct {
		Type    string          `json:"type"`
		Request json.RawMessage `json:"request"`
	}
	require.NoError(t, json.Unmarshal(frame, &env))

	req := &v1.UIRequest{}
	require.NoError(t, protojson.Unmarshal(env.Request, req))
	return env.Type, req
}

func mustReadAll(t *testing.T, reader io.Reader) string {
	t.Helper()
	raw, err := io.ReadAll(reader)
	require.NoError(t, err)
	return string(raw)
}
