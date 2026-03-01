package arcagi

import (
	"context"
	"net/http"

	arcbackend "github.com/go-go-golems/go-go-app-arc-agi/pkg/backendmodule"
	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
)

const AppID = arcbackend.AppID

type ModuleConfig = arcbackend.ModuleConfig
type ArcRuntimeDriver = arcbackend.ArcRuntimeDriver

type Module struct {
	inner *arcbackend.Module
}

func NewModule(config ModuleConfig) (*Module, error) {
	inner, err := arcbackend.NewModule(config)
	if err != nil {
		return nil, err
	}
	return &Module{inner: inner}, nil
}

func NewModuleWithRuntime(config ModuleConfig, runtime ArcRuntimeDriver) (*Module, error) {
	inner, err := arcbackend.NewModuleWithRuntime(config, runtime)
	if err != nil {
		return nil, err
	}
	return &Module{inner: inner}, nil
}

func (m *Module) Manifest() backendhost.AppBackendManifest {
	manifest := m.inner.Manifest()
	return backendhost.AppBackendManifest{
		AppID:        manifest.AppID,
		Name:         manifest.Name,
		Description:  manifest.Description,
		Required:     manifest.Required,
		Capabilities: append([]string(nil), manifest.Capabilities...),
	}
}

func (m *Module) MountRoutes(mux *http.ServeMux) error {
	return m.inner.MountRoutes(mux)
}

func (m *Module) Init(ctx context.Context) error {
	return m.inner.Init(ctx)
}

func (m *Module) Start(ctx context.Context) error {
	return m.inner.Start(ctx)
}

func (m *Module) Stop(ctx context.Context) error {
	return m.inner.Stop(ctx)
}

func (m *Module) Health(ctx context.Context) error {
	return m.inner.Health(ctx)
}

func (m *Module) Reflection(ctx context.Context) (*backendhost.ModuleReflectionDocument, error) {
	doc, err := m.inner.Reflection(ctx)
	if err != nil {
		return nil, err
	}
	return mapReflectionDocument(doc), nil
}

func mapReflectionDocument(src *arcbackend.ReflectionDocument) *backendhost.ModuleReflectionDocument {
	if src == nil {
		return nil
	}
	out := &backendhost.ModuleReflectionDocument{
		AppID:   src.AppID,
		Name:    src.Name,
		Version: src.Version,
		Summary: src.Summary,
	}
	for _, capability := range src.Capabilities {
		out.Capabilities = append(out.Capabilities, backendhost.ReflectionCapability{
			ID:          capability.ID,
			Stability:   capability.Stability,
			Description: capability.Description,
		})
	}
	for _, doc := range src.Docs {
		out.Docs = append(out.Docs, backendhost.ReflectionDocLink{
			ID:          doc.ID,
			Title:       doc.Title,
			URL:         doc.URL,
			Path:        doc.Path,
			Description: doc.Description,
		})
	}
	for _, api := range src.APIs {
		out.APIs = append(out.APIs, backendhost.ReflectionAPI{
			ID:             api.ID,
			Method:         api.Method,
			Path:           api.Path,
			Summary:        api.Summary,
			RequestSchema:  api.RequestSchema,
			ResponseSchema: api.ResponseSchema,
			ErrorSchema:    api.ErrorSchema,
			Tags:           append([]string(nil), api.Tags...),
		})
	}
	for _, schema := range src.Schemas {
		out.Schemas = append(out.Schemas, backendhost.ReflectionSchemaRef{
			ID:       schema.ID,
			Format:   schema.Format,
			URI:      schema.URI,
			Embedded: schema.Embedded,
		})
	}
	return out
}
