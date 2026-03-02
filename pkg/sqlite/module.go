package sqlite

import (
	"context"
	"log"
	"net/http"

	sqlitecomponent "github.com/go-go-golems/go-go-app-sqlite/pkg/backendcomponent"
	"github.com/go-go-golems/go-go-app-sqlite/pkg/sqliteapp"
	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
)

const AppID = sqlitecomponent.AppID

var _ backendhost.AppBackendModule = (*Module)(nil)
var _ backendhost.ReflectiveAppBackendModule = (*Module)(nil)

type ModuleConfig struct {
	RuntimeConfig        sqliteapp.Config
	MaxPayloadBytes      int
	EnableAuditLogEvents bool
	Logger               *log.Logger
}

func DefaultModuleConfig() ModuleConfig {
	return ModuleConfig{
		RuntimeConfig:        sqliteapp.DefaultConfig(),
		MaxPayloadBytes:      1_048_576,
		EnableAuditLogEvents: true,
	}
}

type Module struct {
	component sqlitecomponent.Component
}

func NewModule(config ModuleConfig) (*Module, error) {
	normalized := config
	normalized.RuntimeConfig = normalized.RuntimeConfig.Normalize()
	if err := normalized.RuntimeConfig.Validate(); err != nil {
		return nil, err
	}
	if normalized.MaxPayloadBytes <= 0 {
		normalized.MaxPayloadBytes = DefaultModuleConfig().MaxPayloadBytes
	}

	runtime, err := sqliteapp.NewRuntime(normalized.RuntimeConfig)
	if err != nil {
		return nil, err
	}

	component, err := sqlitecomponent.NewSQLiteBackendComponent(sqlitecomponent.Options{
		Runtime:              runtime,
		Logger:               normalized.Logger,
		MaxPayloadBytes:      normalized.MaxPayloadBytes,
		StatementAllowlist:   normalized.RuntimeConfig.StatementAllowlist,
		StatementDenylist:    normalized.RuntimeConfig.StatementDenylist,
		RedactedColumns:      normalized.RuntimeConfig.RedactedColumns,
		RateLimitRequests:    normalized.RuntimeConfig.RateLimitRequests,
		RateLimitWindow:      normalized.RuntimeConfig.RateLimitWindow,
		EnableAuditLogEvents: normalized.EnableAuditLogEvents,
	})
	if err != nil {
		return nil, err
	}

	return &Module{component: component}, nil
}

func (m *Module) Manifest() backendhost.AppBackendManifest {
	manifest := m.component.Manifest()
	return backendhost.AppBackendManifest{
		AppID:        manifest.AppID,
		Name:         manifest.Name,
		Description:  manifest.Description,
		Required:     manifest.Required,
		Capabilities: append([]string(nil), manifest.Capabilities...),
	}
}

func (m *Module) MountRoutes(mux *http.ServeMux) error {
	return m.component.MountRoutes(mux)
}

func (m *Module) Init(ctx context.Context) error {
	return m.component.Init(ctx)
}

func (m *Module) Start(ctx context.Context) error {
	return m.component.Start(ctx)
}

func (m *Module) Stop(ctx context.Context) error {
	return m.component.Stop(ctx)
}

func (m *Module) Health(ctx context.Context) error {
	return m.component.Health(ctx)
}

func (m *Module) Reflection(context.Context) (*backendhost.ModuleReflectionDocument, error) {
	manifest := m.component.Manifest()
	return &backendhost.ModuleReflectionDocument{
		AppID:   manifest.AppID,
		Name:    manifest.Name,
		Version: "v1",
		Summary: "SQLite query backend with namespaced query/history/saved-query APIs.",
		Capabilities: []backendhost.ReflectionCapability{
			{ID: "query", Stability: "stable", Description: "Execute policy-constrained SQL queries."},
			{ID: "history", Stability: "stable", Description: "Expose persisted query execution history."},
			{ID: "saved-queries", Stability: "stable", Description: "Expose saved-query CRUD endpoints."},
		},
		Docs: []backendhost.ReflectionDocLink{
			{ID: "sqlite-app-runbook", Title: "SQLite App Runbook", Path: "ttmp/2026/03/01/OS-03-SQLITE-QUERY-APP--sqlite-query-app-with-backend-gui-components-and-hypercard-query-integration/reference/02-developer-runbook.md"},
		},
		APIs: []backendhost.ReflectionAPI{
			{ID: "sqlite.health", Method: http.MethodGet, Path: "/api/apps/sqlite/health", Summary: "Module health check."},
			{ID: "sqlite.query", Method: http.MethodPost, Path: "/api/apps/sqlite/query", Summary: "Execute an SQL query with optional parameters and policy guardrails."},
			{ID: "sqlite.history", Method: http.MethodGet, Path: "/api/apps/sqlite/history", Summary: "List query execution history records."},
			{ID: "sqlite.saved_queries", Method: http.MethodGet, Path: "/api/apps/sqlite/saved-queries", Summary: "List saved queries."},
			{ID: "sqlite.saved_queries_create", Method: http.MethodPost, Path: "/api/apps/sqlite/saved-queries", Summary: "Create a saved query."},
			{ID: "sqlite.saved_queries_update", Method: http.MethodPut, Path: "/api/apps/sqlite/saved-queries/{id}", Summary: "Update a saved query by id."},
			{ID: "sqlite.saved_queries_delete", Method: http.MethodDelete, Path: "/api/apps/sqlite/saved-queries/{id}", Summary: "Delete a saved query by id."},
		},
	}, nil
}
