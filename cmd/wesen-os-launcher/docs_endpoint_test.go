package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
	"github.com/go-go-golems/go-go-os-backend/pkg/docmw"
	"github.com/stretchr/testify/require"
)

type stubDocumentableModule struct {
	manifest backendhost.AppBackendManifest
	store    *docmw.DocStore
}

func (m stubDocumentableModule) Manifest() backendhost.AppBackendManifest { return m.manifest }
func (m stubDocumentableModule) MountRoutes(_ *http.ServeMux) error       { return nil }
func (m stubDocumentableModule) Init(context.Context) error               { return nil }
func (m stubDocumentableModule) Start(context.Context) error              { return nil }
func (m stubDocumentableModule) Stop(context.Context) error               { return nil }
func (m stubDocumentableModule) Health(context.Context) error             { return nil }
func (m stubDocumentableModule) DocStore() *docmw.DocStore                { return m.store }

func TestRegisterOSDocsEndpoint_UsesRootPrefixInResultURLs(t *testing.T) {
	moduleStore, err := docmw.NewDocStore("inventory", []docmw.ModuleDoc{
		{
			ModuleID: "inventory",
			Slug:     "intro",
			Title:    "Inventory Intro",
			DocType:  "guide",
		},
	})
	require.NoError(t, err)

	launcherStore, err := docmw.NewDocStore(launcherHelpModuleID, []docmw.ModuleDoc{
		{
			ModuleID: launcherHelpModuleID,
			Slug:     "overview",
			Title:    "Launcher Overview",
			DocType:  "guide",
		},
	})
	require.NoError(t, err)

	registry, err := backendhost.NewModuleRegistry(stubDocumentableModule{
		manifest: backendhost.AppBackendManifest{AppID: "inventory", Name: "Inventory"},
		store:    moduleStore,
	})
	require.NoError(t, err)

	mux := http.NewServeMux()
	registerOSDocsEndpoint(mux, registry, launcherStore, "/launcher")

	req := httptest.NewRequest(http.MethodGet, "/api/os/docs", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var payload osDocsResponse
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&payload))
	require.Len(t, payload.Results, 2)

	urls := map[string]string{}
	for _, result := range payload.Results {
		urls[result.ModuleID+":"+result.Slug] = result.URL
	}

	require.Equal(t, "/launcher/api/apps/inventory/docs/intro", urls["inventory:intro"])
	require.Equal(t, "/launcher/api/os/help/overview", urls[launcherHelpModuleID+":overview"])
}
