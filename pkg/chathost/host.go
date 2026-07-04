// Package chathost wires a pinocchio chatapp + sessionstream chat backend for
// one launcher app module. It is the wesen-os replacement for the deleted
// pinocchio pkg/webchat server: each app (assistant, inventory, ...) gets its
// own Host with its own engine-profile surface, tool registry, and stores,
// mounted under the app's namespaced routes (/api/apps/<id>/api/chat/...).
//
// The wiring follows the react-chat reference host (chat-overlay
// internal/webchat) so that the published @go-go-golems/chat-provider frontend
// speaks to it unchanged.
package chathost

import (
	"context"
	"net/http"
	"sync"
	"time"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
	gepengine "github.com/go-go-golems/geppetto/pkg/inference/engine"
	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	chatapp "github.com/go-go-golems/pinocchio/pkg/chatapp"
	"github.com/go-go-golems/pinocchio/pkg/chatapp/frontendtools"
	"github.com/go-go-golems/pinocchio/pkg/chatapp/serverkit"
	"github.com/go-go-golems/pinocchio/pkg/chatapp/widgets"
	"github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	wstransport "github.com/go-go-golems/sessionstream/pkg/sessionstream/transport/ws"
	"github.com/pkg/errors"

	geptools "github.com/go-go-golems/geppetto/pkg/inference/tools"
)

// ProfileDescriptor is one user-selectable engine profile as surfaced to the
// chat window's profile selector (GET /api/chat/profiles).
type ProfileDescriptor struct {
	Slug        gepprofiles.EngineProfileSlug
	DisplayName string
}

// ProfileSurface describes the engine-profile universe one app exposes: which
// registry to resolve slugs against, which profile is the default, and the
// launcher-wide base inference settings every profile is overlaid onto.
type ProfileSurface struct {
	Registry           gepprofiles.Registry
	RegistrySlug       gepprofiles.RegistrySlug
	DefaultProfileSlug gepprofiles.EngineProfileSlug
	BaseSettings       *aisettings.InferenceSettings
	// VisibleProfiles curates which profiles the frontend selector should show.
	// When empty, GET /api/chat/profiles falls back to enumerating the registry.
	VisibleProfiles []ProfileDescriptor
}

// BackendToolsFunc lets an app contribute backend-executed tools to each
// prompt's tool registry (for example inventory CRUD tools).
type BackendToolsFunc func(sid sessionstream.SessionId, registry *geptools.InMemoryToolRegistry) error

// SystemPromptFunc resolves the system prompt used to seed a session's first
// turn. It receives the session id so app-context stores can attach per-app
// addenda (assistant app-chat bootstrap).
type SystemPromptFunc func(sid sessionstream.SessionId) string

// EngineFactory builds a geppetto engine from merged inference settings. The
// default is factory.NewEngineFromSettings; tests inject fakes here.
type EngineFactory func(settings *aisettings.InferenceSettings) (gepengine.Engine, error)

// Options configures one chat host.
type Options struct {
	AppID string
	// SystemPrompt seeds the first turn of every session. Ignored when
	// SystemPromptFunc is set.
	SystemPrompt     string
	SystemPromptFunc SystemPromptFunc
	Profiles         ProfileSurface
	BackendTools     BackendToolsFunc
	EngineFactory    EngineFactory
	ChunkDelay       time.Duration
	// TimelineDB is an optional sqlite path for durable timeline hydration.
	TimelineDB string
	// TurnsDSN/TurnsDB configure the durable conversation accumulator store.
	TurnsDSN string
	TurnsDB  string
}

// Host is a fully wired chatapp/sessionstream backend for one app.
type Host struct {
	opts          Options
	hub           *sessionstream.Hub
	service       *chatapp.Service
	engine        *chatapp.Engine
	frontendTools *frontendtools.Manager
	ws            *wstransport.Server
	turnStore     chatstore.TurnStore
	closeFn       func() error

	mu       sync.Mutex
	profiles map[sessionstream.SessionId]gepprofiles.EngineProfileSlug
}

// New wires schema registry, stores, websocket transport, chatapp engine, hub,
// and service for one app.
func New(opts Options) (*Host, error) {
	if opts.AppID == "" {
		return nil, errors.New("chathost: AppID is required")
	}
	if opts.Profiles.Registry == nil {
		return nil, errors.New("chathost: Profiles.Registry is required")
	}

	widgetPlugin := widgets.NewWidgetPlugin()
	frontendToolPlugin := frontendtools.NewPlugin()
	frontendToolManager := frontendtools.NewManager()
	reg := sessionstream.NewSchemaRegistry()
	if err := chatapp.RegisterSchemas(reg, widgetPlugin, frontendToolPlugin); err != nil {
		return nil, errors.Wrap(err, "register chat schemas")
	}

	store, closeHydrationStore, err := serverkit.OpenHydrationStore("", opts.TimelineDB, reg)
	if err != nil {
		return nil, errors.Wrap(err, "open timeline hydration store")
	}
	rawTurnStore, closeTurnStore, err := serverkit.OpenTurnStore(serverkit.StoreOptions{
		TurnsDSN:       opts.TurnsDSN,
		TurnsDB:        opts.TurnsDB,
		EmptyTurnStore: serverkit.EmptyTurnStoreMemory,
	})
	if err != nil {
		_ = closeHydrationStore()
		return nil, errors.Wrap(err, "open turn store")
	}
	cleanup := func() error { return serverkit.CloseAll(closeTurnStore, closeHydrationStore) }

	ws, err := wstransport.NewServer(snapshotProvider{store: store})
	if err != nil {
		_ = cleanup()
		return nil, errors.Wrap(err, "create websocket transport")
	}

	chunkDelay := opts.ChunkDelay
	if chunkDelay <= 0 {
		chunkDelay = 20 * time.Millisecond
	}
	chatEngine := chatapp.NewEngine(
		chatapp.WithChunkDelay(chunkDelay),
		chatapp.WithPlugins(widgetPlugin, frontendToolPlugin),
		chatapp.WithTurnStore(rawTurnStore),
	)

	hub, err := sessionstream.NewHub(
		sessionstream.WithSchemaRegistry(reg),
		sessionstream.WithHydrationStore(store),
		sessionstream.WithUIFanout(ws),
	)
	if err != nil {
		_ = cleanup()
		return nil, errors.Wrap(err, "create sessionstream hub")
	}
	if err := frontendToolManager.Install(hub); err != nil {
		_ = cleanup()
		return nil, errors.Wrap(err, "install frontend tools")
	}
	if err := chatapp.Install(hub, chatEngine); err != nil {
		_ = cleanup()
		return nil, errors.Wrap(err, "install chatapp projections")
	}
	service, err := chatapp.NewService(hub, chatEngine)
	if err != nil {
		_ = cleanup()
		return nil, errors.Wrap(err, "create chat service")
	}

	return &Host{
		opts:          opts,
		hub:           hub,
		service:       service,
		engine:        chatEngine,
		frontendTools: frontendToolManager,
		ws:            ws,
		turnStore:     rawTurnStore,
		closeFn:       cleanup,
		profiles:      map[sessionstream.SessionId]gepprofiles.EngineProfileSlug{},
	}, nil
}

// MountRoutes registers the chat-provider wire contract on mux. Paths are
// relative to the app namespace: backendhost mounts the module mux under
// /api/apps/<id>/, so the frontend reaches these as
// /api/apps/<id>/api/chat/sessions etc. (chat-provider basePrefix
// "/api/apps/<id>").
func (h *Host) MountRoutes(mux *http.ServeMux) error {
	if h == nil {
		return errors.New("chathost: host is nil")
	}
	mux.HandleFunc("GET /api/chat/health", h.handleHealth)
	mux.HandleFunc("GET /api/chat/profiles", h.handleProfiles)
	mux.HandleFunc("POST /api/chat/sessions", h.handleCreateSession)
	mux.HandleFunc("POST /api/chat/sessions/{id}/messages", h.handleSubmitMessage)
	mux.HandleFunc("GET /api/chat/sessions/{id}", h.handleSessionSnapshot)
	mux.HandleFunc("POST /api/chat/sessions/{id}/stop", h.handleStopSession)
	mux.HandleFunc("POST /api/chat/sessions/{id}/tools/manifest", h.handleToolManifest)
	mux.HandleFunc("POST /api/chat/sessions/{id}/tools/results", h.handleToolResult)
	mux.HandleFunc("GET /api/chat/ws", h.handleWS)
	return nil
}

// Close releases stores and transports.
func (h *Host) Close() error {
	if h == nil || h.closeFn == nil {
		return nil
	}
	return h.closeFn()
}

// Service exposes the chatapp service (tests, module health).
func (h *Host) Service() *chatapp.Service {
	if h == nil {
		return nil
	}
	return h.service
}

func (h *Host) sessionProfile(sid sessionstream.SessionId) gepprofiles.EngineProfileSlug {
	h.mu.Lock()
	defer h.mu.Unlock()
	if slug, ok := h.profiles[sid]; ok && !slug.IsZero() {
		return slug
	}
	return h.opts.Profiles.DefaultProfileSlug
}

func (h *Host) setSessionProfile(sid sessionstream.SessionId, slug gepprofiles.EngineProfileSlug) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.profiles[sid] = slug
}

// snapshotProvider adapts the hydration store to the websocket transport.
type snapshotProvider struct {
	store sessionstream.HydrationStore
}

func (p snapshotProvider) Snapshot(ctx context.Context, sid sessionstream.SessionId) (sessionstream.Snapshot, error) {
	return p.store.Snapshot(ctx, sid, 0)
}
