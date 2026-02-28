package main

import (
	"context"
	"net/http"

	"github.com/go-go-golems/geppetto/pkg/inference/middlewarecfg"
	gepprofiles "github.com/go-go-golems/geppetto/pkg/profiles"
	"github.com/go-go-golems/pinocchio/pkg/webchat"
	webhttp "github.com/go-go-golems/pinocchio/pkg/webchat/http"

	inventorycomponent "github.com/go-go-golems/go-go-app-inventory/pkg/backendcomponent"
	"github.com/go-go-golems/go-go-os/pkg/backendhost"
)

const inventoryBackendAppID = inventorycomponent.AppID

type inventoryBackendModule struct {
	component inventorycomponent.Component
}

func newInventoryBackendModule(
	server *webchat.Server,
	requestResolver webhttp.ConversationRequestResolver,
	profileRegistry gepprofiles.Registry,
	middlewareDefinitions middlewarecfg.DefinitionRegistry,
	extensionSchemas []webhttp.ExtensionSchemaDocument,
) *inventoryBackendModule {
	return &inventoryBackendModule{
		component: inventorycomponent.NewInventoryBackendComponent(inventorycomponent.Options{
			Server:                server,
			RequestResolver:       requestResolver,
			ProfileRegistry:       profileRegistry,
			DefaultRegistrySlug:   gepprofiles.MustRegistrySlug(profileRegistrySlug),
			MiddlewareDefinitions: middlewareDefinitions,
			ExtensionSchemas:      append([]webhttp.ExtensionSchemaDocument(nil), extensionSchemas...),
			WriteActor:            "wesen-os-launcher",
			WriteSource:           "http-api",
			ConfirmMountPath:      "/confirm",
		}),
	}
}

func (m *inventoryBackendModule) Manifest() backendhost.AppBackendManifest {
	manifest := m.component.Manifest()
	return backendhost.AppBackendManifest{
		AppID:        manifest.AppID,
		Name:         manifest.Name,
		Description:  manifest.Description,
		Required:     manifest.Required,
		Capabilities: append([]string(nil), manifest.Capabilities...),
	}
}

func (m *inventoryBackendModule) MountRoutes(mux *http.ServeMux) error {
	return m.component.MountRoutes(mux)
}

func (m *inventoryBackendModule) Init(ctx context.Context) error {
	return m.component.Init(ctx)
}

func (m *inventoryBackendModule) Start(ctx context.Context) error {
	return m.component.Start(ctx)
}

func (m *inventoryBackendModule) Stop(ctx context.Context) error {
	return m.component.Stop(ctx)
}

func (m *inventoryBackendModule) Health(ctx context.Context) error {
	return m.component.Health(ctx)
}
