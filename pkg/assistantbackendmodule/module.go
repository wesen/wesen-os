package assistantbackendmodule

import (
	"context"
	"fmt"
	"net/http"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/profiles"
	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
	chatservice "github.com/go-go-golems/go-go-os-chat/pkg/chatservice"
	webchat "github.com/go-go-golems/pinocchio/pkg/webchat"
	webhttp "github.com/go-go-golems/pinocchio/pkg/webchat/http"
)

const AppID = "assistant"

type Options struct {
	Server              *webchat.Server
	RequestResolver     webhttp.ConversationRequestResolver
	ProfileRegistry     gepprofiles.Registry
	DefaultRegistrySlug gepprofiles.RegistrySlug
	WriteActor          string
	WriteSource         string
}

type Module struct {
	service *chatservice.Component
}

var _ backendhost.AppBackendModule = (*Module)(nil)

func NewModule(opts Options) *Module {
	return &Module{
		service: chatservice.New(chatservice.Options{
			Server:          opts.Server,
			RequestResolver: opts.RequestResolver,
			ProfileAPI: &chatservice.ProfileAPIOptions{
				Registry:                        opts.ProfileRegistry,
				DefaultRegistrySlug:             opts.DefaultRegistrySlug,
				WriteActor:                      opts.WriteActor,
				WriteSource:                     opts.WriteSource,
				EnableCurrentProfileCookieRoute: true,
			},
		}),
	}
}

func (m *Module) Manifest() backendhost.AppBackendManifest {
	return backendhost.AppBackendManifest{
		AppID:       AppID,
		Name:        "Assistant",
		Description: "Shared OS assistant chat service",
		Required:    false,
		Capabilities: []string{
			"chat",
			"ws",
			"timeline",
			"profiles",
		},
	}
}

func (m *Module) MountRoutes(mux *http.ServeMux) error {
	if m == nil || m.service == nil {
		return fmt.Errorf("assistant backend module is not initialized")
	}
	return m.service.MountRoutes(mux)
}

func (m *Module) Init(ctx context.Context) error {
	if m == nil || m.service == nil {
		return fmt.Errorf("assistant backend module is not initialized")
	}
	return m.service.Init(ctx)
}

func (m *Module) Start(ctx context.Context) error {
	if m == nil || m.service == nil {
		return fmt.Errorf("assistant backend module is not initialized")
	}
	return m.service.Start(ctx)
}

func (m *Module) Stop(ctx context.Context) error {
	if m == nil || m.service == nil {
		return nil
	}
	return m.service.Stop(ctx)
}

func (m *Module) Health(ctx context.Context) error {
	if m == nil || m.service == nil {
		return fmt.Errorf("assistant backend module is not initialized")
	}
	return m.service.Health(ctx)
}
