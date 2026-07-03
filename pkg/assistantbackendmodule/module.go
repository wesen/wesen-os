package assistantbackendmodule

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
	"github.com/go-go-golems/wesen-os/pkg/chathost"
)

const AppID = "assistant"

type Options struct {
	Host         *chathost.Host
	ContextStore *AppChatContextStore
}

type Module struct {
	host         *chathost.Host
	contextStore *AppChatContextStore
	registry     *backendhost.ModuleRegistry
}

var _ backendhost.AppBackendModule = (*Module)(nil)

func NewModule(opts Options) *Module {
	contextStore := opts.ContextStore
	if contextStore == nil {
		contextStore = NewAppChatContextStore()
	}
	return &Module{
		host:         opts.Host,
		contextStore: contextStore,
	}
}

func (m *Module) SetModuleRegistry(registry *backendhost.ModuleRegistry) {
	if m == nil {
		return
	}
	m.registry = registry
}

func (m *Module) ContextStore() *AppChatContextStore {
	if m == nil {
		return nil
	}
	return m.contextStore
}

func (m *Module) Manifest() backendhost.AppBackendManifest {
	return backendhost.AppBackendManifest{
		AppID:       AppID,
		Name:        "Assistant",
		Description: "Shared OS assistant chat service",
		Required:    false,
		Capabilities: []string{
			"chat",
			"chat-sessions",
			"ws",
			"frontend-tools",
			"profiles",
		},
	}
}

func (m *Module) MountRoutes(mux *http.ServeMux) error {
	if m == nil || m.host == nil {
		return fmt.Errorf("assistant backend module is not initialized")
	}
	if err := m.host.MountRoutes(mux); err != nil {
		return err
	}
	mux.HandleFunc("/api/bootstrap/app-chat", m.handleBootstrapAppChat)
	return nil
}

func (m *Module) Init(ctx context.Context) error {
	if m == nil || m.host == nil {
		return fmt.Errorf("assistant backend module is not initialized")
	}
	return nil
}

func (m *Module) Start(ctx context.Context) error {
	if m == nil || m.host == nil {
		return fmt.Errorf("assistant backend module is not initialized")
	}
	return nil
}

func (m *Module) Stop(ctx context.Context) error {
	if m == nil || m.host == nil {
		return nil
	}
	return m.host.Close()
}

func (m *Module) Health(ctx context.Context) error {
	if m == nil || m.host == nil || m.host.Service() == nil {
		return fmt.Errorf("assistant backend module is not initialized")
	}
	return nil
}

type bootstrapAppChatRequest struct {
	AppID string `json:"app_id"`
}

type bootstrapAppChatResponse struct {
	ConvID          string                   `json:"conv_id"`
	AssistantAppID  string                   `json:"assistant_app_id"`
	BasePrefix      string                   `json:"base_prefix"`
	SubjectApp      bootstrapSubjectApp      `json:"subject_app"`
	AttachedContext bootstrapAttachedContext `json:"attached_context"`
}

type bootstrapSubjectApp struct {
	AppID       string `json:"app_id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

type bootstrapAttachedContext struct {
	DocsCount     int  `json:"docs_count"`
	HasReflection bool `json:"has_reflection"`
	PromptChars   int  `json:"prompt_chars"`
}

func (m *Module) handleBootstrapAppChat(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if m == nil || m.contextStore == nil {
		http.Error(w, "assistant bootstrap store is not initialized", http.StatusInternalServerError)
		return
	}

	var body bootstrapAppChatRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	appID := strings.TrimSpace(body.AppID)
	if appID == "" {
		http.Error(w, "missing app_id", http.StatusBadRequest)
		return
	}

	appContext, err := ResolveAppChatContext(req.Context(), m.registry, appID)
	if err != nil {
		status := http.StatusInternalServerError
		if err == errAppChatContextAppNotFound {
			status = http.StatusNotFound
		}
		http.Error(w, err.Error(), status)
		return
	}

	convID := m.contextStore.Create(appContext.ConversationContext)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(bootstrapAppChatResponse{
		ConvID:         convID,
		AssistantAppID: AppID,
		BasePrefix:     "/api/apps/" + AppID,
		SubjectApp: bootstrapSubjectApp{
			AppID:       appContext.AppID,
			Name:        appContext.Name,
			Description: appContext.Description,
		},
		AttachedContext: bootstrapAttachedContext{
			DocsCount:     appContext.DocsCount,
			HasReflection: appContext.HasReflection,
			PromptChars:   len(appContext.SystemPromptAddendum),
		},
	})
}
