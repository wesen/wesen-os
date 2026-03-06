package assistantbackendmodule

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	profilechat "github.com/go-go-golems/go-go-os-chat/pkg/profilechat"
	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
	"github.com/go-go-golems/go-go-os-backend/pkg/docmw"
)

type testAppModule struct {
	manifest   backendhost.AppBackendManifest
	docStore   *docmw.DocStore
	reflection *backendhost.ModuleReflectionDocument
}

func (m *testAppModule) Manifest() backendhost.AppBackendManifest { return m.manifest }
func (m *testAppModule) MountRoutes(*http.ServeMux) error         { return nil }
func (m *testAppModule) Init(context.Context) error               { return nil }
func (m *testAppModule) Start(context.Context) error              { return nil }
func (m *testAppModule) Stop(context.Context) error               { return nil }
func (m *testAppModule) Health(context.Context) error             { return nil }
func (m *testAppModule) DocStore() *docmw.DocStore                { return m.docStore }
func (m *testAppModule) Reflection(context.Context) (*backendhost.ModuleReflectionDocument, error) {
	return m.reflection, nil
}

func TestResolveAppChatContextIncludesDocsAndReflection(t *testing.T) {
	store, err := docmw.NewDocStore("sqlite", []docmw.ModuleDoc{
		{
			Slug:    "overview",
			Title:   "SQLite Overview",
			DocType: "guide",
			Summary: "How to use the sqlite app.",
			Content: "Use this module to query SQLite data.",
		},
	})
	if err != nil {
		t.Fatalf("new doc store: %v", err)
	}
	registry, err := backendhost.NewModuleRegistry(&testAppModule{
		manifest: backendhost.AppBackendManifest{
			AppID:       "sqlite",
			Name:        "SQLite",
			Description: "SQLite query backend",
		},
		docStore: store,
		reflection: &backendhost.ModuleReflectionDocument{
			AppID:   "sqlite",
			Name:    "SQLite",
			Summary: "reflection summary",
			APIs: []backendhost.ReflectionAPI{
				{ID: "query", Method: "POST", Path: "/query", Summary: "Run a query"},
			},
		},
	})
	if err != nil {
		t.Fatalf("new module registry: %v", err)
	}

	appContext, err := ResolveAppChatContext(context.Background(), registry, "sqlite")
	if err != nil {
		t.Fatalf("resolve app chat context: %v", err)
	}

	if appContext.AppID != "sqlite" {
		t.Fatalf("unexpected app id: %q", appContext.AppID)
	}
	if appContext.DocsCount != 1 {
		t.Fatalf("unexpected docs count: %d", appContext.DocsCount)
	}
	if !appContext.HasReflection {
		t.Fatalf("expected reflection to be attached")
	}
	if !strings.Contains(appContext.SystemPromptAddendum, "SQLite Overview") {
		t.Fatalf("expected docs in prompt addendum: %q", appContext.SystemPromptAddendum)
	}
	if !strings.Contains(appContext.SystemPromptAddendum, "\"path\": \"/query\"") {
		t.Fatalf("expected reflection in prompt addendum: %q", appContext.SystemPromptAddendum)
	}
}

func TestHandleBootstrapAppChatStoresConversationContext(t *testing.T) {
	store, err := docmw.NewDocStore("sqlite", []docmw.ModuleDoc{
		{
			Slug:    "overview",
			Title:   "SQLite Overview",
			DocType: "guide",
			Content: "Use this module to query SQLite data.",
		},
	})
	if err != nil {
		t.Fatalf("new doc store: %v", err)
	}
	registry, err := backendhost.NewModuleRegistry(&testAppModule{
		manifest: backendhost.AppBackendManifest{
			AppID:       "sqlite",
			Name:        "SQLite",
			Description: "SQLite query backend",
		},
		docStore: store,
		reflection: &backendhost.ModuleReflectionDocument{
			AppID: "sqlite",
			Name:  "SQLite",
		},
	})
	if err != nil {
		t.Fatalf("new module registry: %v", err)
	}

	contextStore := NewAppChatContextStore()
	module := &Module{
		contextStore: contextStore,
		registry:     registry,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/bootstrap/app-chat", strings.NewReader(`{"app_id":"sqlite"}`))
	rec := httptest.NewRecorder()
	module.handleBootstrapAppChat(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d body=%s", rec.Code, rec.Body.String())
	}
	var resp bootstrapAppChatResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if strings.TrimSpace(resp.ConvID) == "" {
		t.Fatalf("expected conv_id in response")
	}
	if resp.SubjectApp.AppID != "sqlite" {
		t.Fatalf("unexpected subject app: %#v", resp.SubjectApp)
	}
	convContext, err := contextStore.Lookup(context.Background(), resp.ConvID)
	if err != nil {
		t.Fatalf("lookup stored context: %v", err)
	}
	if convContext == nil {
		t.Fatalf("expected stored conversation context")
	}
	if !strings.Contains(convContext.SystemPromptAddendum, "SQLite query backend") {
		t.Fatalf("expected app description in stored context: %q", convContext.SystemPromptAddendum)
	}
	if got := convContext.Metadata["subject_app_id"]; got != "sqlite" {
		t.Fatalf("unexpected metadata subject_app_id: %#v", convContext.Metadata)
	}
}

func TestAppChatContextStoreImplementsConversationContextProvider(t *testing.T) {
	var provider profilechat.ConversationContextProvider = NewAppChatContextStore()
	if provider == nil {
		t.Fatalf("expected non-nil conversation context provider")
	}
}
