package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRegisterOSFederationRegistryEndpoint_Returns404WhenConfigIsUnset(t *testing.T) {
	mux := http.NewServeMux()
	registerOSFederationRegistryEndpoint(mux, "")

	req := httptest.NewRequest(http.MethodGet, "/api/os/federation-registry", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	require.Equal(t, http.StatusNotFound, rr.Code)
}

func TestRegisterOSFederationRegistryEndpoint_ServesConfigFile(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "federation.registry.json")
	require.NoError(t, os.WriteFile(configPath, []byte(`{"version":1,"remotes":[]}`), 0o644))

	mux := http.NewServeMux()
	registerOSFederationRegistryEndpoint(mux, configPath)

	req := httptest.NewRequest(http.MethodGet, "/api/os/federation-registry", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	require.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	require.JSONEq(t, `{"version":1,"remotes":[]}`, rr.Body.String())
}

func TestRegisterOSFederationRegistryEndpoint_RejectsInvalidJSON(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "federation.registry.json")
	require.NoError(t, os.WriteFile(configPath, []byte(`not-json`), 0o644))

	mux := http.NewServeMux()
	registerOSFederationRegistryEndpoint(mux, configPath)

	req := httptest.NewRequest(http.MethodGet, "/api/os/federation-registry", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
}
